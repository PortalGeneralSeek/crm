package handler

import (
	"crm-backend/config"
	"crm-backend/internal/database"
	"crm-backend/internal/model"
	"crm-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	authService *service.AuthService
	permService *service.PermissionService
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		authService: service.NewAuthService(cfg),
		permService: service.NewPermissionService(),
	}
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "请求参数解析失败",
		})
	}

	if req.Username == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "账号与密码不能为空",
		})
	}

	result, err := h.authService.Login(req.Username, req.Password)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"code":    401,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "登录成功",
		"data":    result,
	})
}

func (h *AuthHandler) GetCurrentUser(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	var user model.SysUser
	if err := database.DB.Preload("Role").First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"code":    404,
			"message": "用户不存在",
		})
	}

	perms := h.permService.GetUserPermissions(user.RoleID, user.Role.Code)
	menus := h.permService.GetUserMenuTree(user.RoleID, user.Role.Code)

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data": fiber.Map{
			"user":        user,
			"role":        user.Role,
			"permissions": perms,
			"menus":       menus,
		},
	})
}

func (h *AuthHandler) GetDynamicMenus(c *fiber.Ctx) error {
	roleID, _ := c.Locals("roleId").(uint)
	roleCode, _ := c.Locals("roleCode").(string)

	tree := h.permService.GetUserMenuTree(roleID, roleCode)
	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    tree,
	})
}

type SwitchRoleRequest struct {
	RoleID uint `json:"roleId"`
}

func (h *AuthHandler) SwitchRole(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"code":    401,
			"message": "请先登录认证",
		})
	}

	var req SwitchRoleRequest
	if err := c.BodyParser(&req); err != nil || req.RoleID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "请指定要切换的目标角色 ID",
		})
	}

	result, err := h.authService.SwitchRole(userID, req.RoleID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"code":    403,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "角色身份已成功切换",
		"data":    result,
	})
}
