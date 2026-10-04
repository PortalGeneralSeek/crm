package handler

import (
	"context"
	"strconv"
	"time"

	"crm-backend/internal/cache"
	"crm-backend/internal/database"
	"crm-backend/internal/model"

	"github.com/gofiber/fiber/v2"
)

type RoleHandler struct{}

func NewRoleHandler() *RoleHandler {
	return &RoleHandler{}
}

func (h *RoleHandler) ListRoles(c *fiber.Ctx) error {
	var roles []model.SysRole
	if err := database.DB.Find(&roles).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "获取角色列表失败",
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    roles,
	})
}

func (h *RoleHandler) GetRolePermissions(c *fiber.Ctx) error {
	idParam := c.Params("id")
	roleID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的角色 ID",
		})
	}

	var menuIDs []uint
	database.DB.Model(&model.SysRolePermission{}).Where("role_id = ?", roleID).Pluck("menu_id", &menuIDs)

	var menus []model.SysMenu
	database.DB.Where("status = 1").Order("sort ASC").Find(&menus)

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data": fiber.Map{
			"roleId":          roleID,
			"assignedMenuIds": menuIDs,
			"allMenus":        menus,
		},
	})
}

type UpdateRolePermissionsRequest struct {
	MenuIDs []uint `json:"menuIds"`
}

func (h *RoleHandler) UpdateRolePermissions(c *fiber.Ctx) error {
	idParam := c.Params("id")
	roleID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的角色 ID",
		})
	}

	var req UpdateRolePermissionsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "请求体参数格式错误",
		})
	}

	tx := database.DB.Begin()
	// Clear existing permissions
	if err := tx.Where("role_id = ?", roleID).Delete(&model.SysRolePermission{}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"code": 500, "message": "更新失败"})
	}

	// Insert new permissions
	for _, mID := range req.MenuIDs {
		if err := tx.Create(&model.SysRolePermission{RoleID: uint(roleID), MenuID: mID, CreatedAt: time.Now()}).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"code": 500, "message": "写入权限失败"})
		}
	}
	tx.Commit()

	// Invalidate related user cache in Redis
	var userIDs []uint
	database.DB.Model(&model.SysUser{}).Where("role_id = ?", roleID).Pluck("id", &userIDs)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	for _, uid := range userIDs {
		cache.Rdb.InvalidateUserCache(ctx, uid)
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "角色权限矩阵已更新，Redis 缓存已自动刷新生效",
	})
}
