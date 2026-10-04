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
	Role        *model.SysRole        `json:"role"`
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

	// Generate JWT
	expirationTime := time.Now().Add(s.cfg.JWTExpire)
	claims := &middleware.JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		RoleID:   user.RoleID,
		RoleCode: user.Role.Code,
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

	// Load Permissions
	permService := NewPermissionService()
	perms := permService.GetUserPermissions(user.RoleID, user.Role.Code)
	menus := permService.GetUserMenuTree(user.RoleID, user.Role.Code)

	// Save to Redis cache
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = cache.Rdb.SetUserPermissions(ctx, user.ID, perms)

	return &LoginResult{
		Token:       tokenString,
		User:        &user,
		Role:        &user.Role,
		Permissions: perms,
		Menus:       menus,
	}, nil
}
