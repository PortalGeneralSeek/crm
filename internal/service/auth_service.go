package service

import (
	"context"
	"errors"
	"time"

	"crm-backend/config"
	"crm-backend/internal/cache"
	"crm-backend/internal/database"
	"crm-backend/internal/middleware"
	"crm-backend/internal/model"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	cfg *config.Config
}

func NewAuthService(cfg *config.Config) *AuthService {
	return &AuthService{cfg: cfg}
}

type LoginResult struct {
	Token       string                `json:"token"`
	User        *model.SysUser        `json:"user"`
	Role        *model.SysRole        `json:"role"`  // Currently active role (default first role)
	Roles       []model.SysRole       `json:"roles"` // All available switchable roles for this user
	Permissions []string              `json:"permissions"`
	Menus       []*model.MenuTreeNode `json:"menus"`
}

func (s *AuthService) Login(username, password string) (*LoginResult, error) {
	var user model.SysUser
	err := database.DB.Preload("Role").Where("username = ? AND status = 1", username).First(&user).Error
	if err != nil {
		return nil, errors.New("账号不存在或已被停用")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("登录密码错误，请核对后重试")
	}

	// Fetch all available roles assigned to this user from sys_user_roles
	var availableRoles []model.SysRole
	database.DB.Table("sys_roles").
		Joins("JOIN sys_user_roles ON sys_user_roles.role_id = sys_roles.id").
		Where("sys_user_roles.user_id = ? AND sys_roles.status = 1", user.ID).
		Order("sys_user_roles.id ASC").
		Find(&availableRoles)

	if len(availableRoles) == 0 {
		availableRoles = []model.SysRole{user.Role}
	}

	// Always default to the FIRST role upon login!
	activeRole := availableRoles[0]
	user.RoleID = activeRole.ID
	user.Role = activeRole

	// Generate JWT for the active first role
	expirationTime := time.Now().Add(s.cfg.JWTExpire)
	claims := &middleware.JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		RoleID:   activeRole.ID,
		RoleCode: activeRole.Code,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "acme-crm-fiber-backend",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, errors.New("令牌签发失败: " + err.Error())
	}

	// Load Permissions for the active first role
	permService := NewPermissionService()
	perms := permService.GetUserPermissions(activeRole.ID, activeRole.Code)
	menus := permService.GetUserMenuTree(activeRole.ID, activeRole.Code)

	// Save to Redis cache
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = cache.Rdb.SetUserPermissions(ctx, user.ID, perms)

	return &LoginResult{
		Token:       tokenString,
		User:        &user,
		Role:        &activeRole,
		Roles:       availableRoles,
		Permissions: perms,
		Menus:       menus,
	}, nil
}

// SwitchRole switches active role for user among their assigned roles
func (s *AuthService) SwitchRole(userID uint, targetRoleID uint) (*LoginResult, error) {
	var user model.SysUser
	if err := database.DB.Preload("Role").First(&user, userID).Error; err != nil {
		return nil, errors.New("用户不存在")
	}

	// Query user available roles
	var availableRoles []model.SysRole
	database.DB.Table("sys_roles").
		Joins("JOIN sys_user_roles ON sys_user_roles.role_id = sys_roles.id").
		Where("sys_user_roles.user_id = ? AND sys_roles.status = 1", user.ID).
		Order("sys_user_roles.id ASC").
		Find(&availableRoles)

	if len(availableRoles) == 0 {
		availableRoles = []model.SysRole{user.Role}
	}

	// Verify target role is allowed for this user (or super_admin can inspect any role)
	var targetRole *model.SysRole
	for _, r := range availableRoles {
		if r.ID == targetRoleID {
			targetRole = &r
			break
		}
	}

	// If super_admin, allow switching to any active role for auditing
	if targetRole == nil && user.Role.Code == "super_admin" {
		var r model.SysRole
		if err := database.DB.First(&r, targetRoleID).Error; err == nil {
			targetRole = &r
		}
	}

	if targetRole == nil {
		return nil, errors.New("无权切换至未授权的角色")
	}

	user.RoleID = targetRole.ID
	user.Role = *targetRole

	// Generate new JWT
	expirationTime := time.Now().Add(s.cfg.JWTExpire)
	claims := &middleware.JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		RoleID:   targetRole.ID,
		RoleCode: targetRole.Code,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "acme-crm-fiber-backend",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, errors.New("签发角色令牌失败: " + err.Error())
	}

	permService := NewPermissionService()
	perms := permService.GetUserPermissions(targetRole.ID, targetRole.Code)
	menus := permService.GetUserMenuTree(targetRole.ID, targetRole.Code)

	// Update Redis cache
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = cache.Rdb.SetUserPermissions(ctx, user.ID, perms)

	return &LoginResult{
		Token:       tokenString,
		User:        &user,
		Role:        targetRole,
		Roles:       availableRoles,
		Permissions: perms,
		Menus:       menus,
	}, nil
}
