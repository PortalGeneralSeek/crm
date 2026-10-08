package handler

import (
	"context"
	"strconv"
	"strings"
	"time"

	"crm-backend/internal/cache"
	"crm-backend/internal/database"
	"crm-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct{}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

// ListUsers returns user accounts with roles and filter support
func (h *UserHandler) ListUsers(c *fiber.Ctx) error {
	keyword := strings.TrimSpace(c.Query("keyword"))
	roleIDStr := strings.TrimSpace(c.Query("roleId"))
	statusStr := strings.TrimSpace(c.Query("status"))

	query := database.DB.Model(&model.SysUser{}).Preload("Role")

	if keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("username LIKE ? OR real_name LIKE ? OR phone LIKE ? OR email LIKE ?", like, like, like, like)
	}

	if roleIDStr != "" {
		if roleID, err := strconv.ParseUint(roleIDStr, 10, 32); err == nil {
			query = query.Where("role_id = ?", roleID)
		}
	}

	if statusStr != "" {
		if status, err := strconv.Atoi(statusStr); err == nil {
			query = query.Where("status = ?", status)
		}
	}

	var users []model.SysUser
	if err := query.Order("id ASC").Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "查询用户列表失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    users,
	})
}

type CreateUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	RealName string `json:"realName"`
	RoleID   uint   `json:"roleId"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar"`
}

// CreateUser handles admin adding a new user account
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "请求体参数格式不合法",
		})
	}

	req.Username = strings.TrimSpace(req.Username)
	req.RealName = strings.TrimSpace(req.RealName)
	req.Password = strings.TrimSpace(req.Password)

	if req.Username == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "登录用户名不能为空",
		})
	}

	if len(req.Password) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "初始登录密码长度至少为 6 位",
		})
	}

	if req.RealName == "" {
		req.RealName = req.Username
	}

	if req.RoleID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "请为该用户指定所属权限角色",
		})
	}

	// Verify role exists
	var role model.SysRole
	if err := database.DB.First(&role, req.RoleID).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "所选角色不存在，请核对后重试",
		})
	}

	// Check username uniqueness
	var count int64
	database.DB.Model(&model.SysUser{}).Where("username = ?", req.Username).Count(&count)
	if count > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "该登录用户名已被占用，请使用其他用户名",
		})
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "密码加密安全处理失败",
		})
	}

	avatar := req.Avatar
	if avatar == "" {
		avatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
	}

	newUser := model.SysUser{
		Username:     req.Username,
		PasswordHash: string(hash),
		RealName:     req.RealName,
		Avatar:       avatar,
		Email:        req.Email,
		Phone:        req.Phone,
		RoleID:       req.RoleID,
		Status:       1,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := database.DB.Create(&newUser).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "新增用户失败: " + err.Error(),
		})
	}

	database.DB.Preload("Role").First(&newUser, newUser.ID)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"code":    201,
		"message": "用户创建成功，已分配指定角色与对应权限",
		"data":    newUser,
	})
}

type UpdateUserRequest struct {
	RealName string `json:"realName"`
	RoleID   uint   `json:"roleId"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar"`
	Status   *int   `json:"status"`
	Password string `json:"password,omitempty"`
}

// UpdateUser handles updating user profile and assigning new role
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	idParam := c.Params("id")
	userID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的用户 ID",
		})
	}

	var user model.SysUser
	if err := database.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"code":    404,
			"message": "目标用户不存在",
		})
	}

	var req UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "参数格式错误",
		})
	}

	oldRoleID := user.RoleID

	if strings.TrimSpace(req.RealName) != "" {
		user.RealName = strings.TrimSpace(req.RealName)
	}
	if req.Phone != "" {
		user.Phone = req.Phone
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Avatar != "" {
		user.Avatar = req.Avatar
	}
	if req.Status != nil {
		// Prevent disabling default super admin
		if user.ID == 1 && *req.Status == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"code":    400,
				"message": "系统内置超级管理员账号禁止停用",
			})
		}
		user.Status = *req.Status
	}
	if req.RoleID > 0 {
		var role model.SysRole
		if err := database.DB.First(&role, req.RoleID).Error; err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"code":    400,
				"message": "指定分配的角色不存在",
			})
		}
		user.RoleID = req.RoleID
	}
	if req.Password != "" && len(req.Password) >= 6 {
		hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		user.PasswordHash = string(hash)
	}

	user.UpdatedAt = time.Now()
	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "更新用户信息失败: " + err.Error(),
		})
	}

	// Invalidate Redis permissions cache if role or status changed
	if oldRoleID != user.RoleID || req.Status != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		cache.Rdb.InvalidateUserCache(ctx, user.ID)
	}

	database.DB.Preload("Role").First(&user, user.ID)

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "用户信息与角色权限已更新成功",
		"data":    user,
	})
}

// UpdateUserStatus toggles user active/disabled status
func (h *UserHandler) UpdateUserStatus(c *fiber.Ctx) error {
	idParam := c.Params("id")
	userID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的用户 ID",
		})
	}

	if userID == 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "系统内置超级管理员禁止更改状态",
		})
	}

	var req struct {
		Status int `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "参数格式错误",
		})
	}

	if err := database.DB.Model(&model.SysUser{}).Where("id = ?", userID).Update("status", req.Status).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "状态切换失败",
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	cache.Rdb.InvalidateUserCache(ctx, uint(userID))

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "用户账号状态已变更",
	})
}

// ResetPassword resets user password
func (h *UserHandler) ResetPassword(c *fiber.Ctx) error {
	idParam := c.Params("id")
	userID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的用户 ID",
		})
	}

	var req struct {
		NewPassword string `json:"newPassword"`
	}
	if err := c.BodyParser(&req); err != nil || len(strings.TrimSpace(req.NewPassword)) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "新密码长度不得少于 6 位",
		})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(strings.TrimSpace(req.NewPassword)), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "密码加密失败",
		})
	}

	if err := database.DB.Model(&model.SysUser{}).Where("id = ?", userID).Update("password_hash", string(hash)).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "重置密码写入数据库失败",
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "用户密码已成功重置",
	})
}

// DeleteUser deletes a user account
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	idParam := c.Params("id")
	userID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的用户 ID",
		})
	}

	if userID == 1 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "系统内置超级管理员账号禁止删除",
		})
	}

	if err := database.DB.Delete(&model.SysUser{}, userID).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "删除用户失败: " + err.Error(),
		})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	cache.Rdb.InvalidateUserCache(ctx, uint(userID))

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "用户账号已成功删除",
	})
}
