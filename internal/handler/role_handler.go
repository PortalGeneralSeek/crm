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
)

type RoleHandler struct{}

func NewRoleHandler() *RoleHandler {
	return &RoleHandler{}
}

// ListRoles returns all roles
func (h *RoleHandler) ListRoles(c *fiber.Ctx) error {
	var roles []model.SysRole
	if err := database.DB.Order("id ASC").Find(&roles).Error; err != nil {
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

type CreateRoleRequest struct {
	Name        string `json:"name"`
	Code        string `json:"code"`
	Description string `json:"description"`
}

// CreateRole adds a new role
func (h *RoleHandler) CreateRole(c *fiber.Ctx) error {
	var req CreateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "参数格式错误",
		})
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Code = strings.TrimSpace(req.Code)
	if req.Name == "" || req.Code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "角色名称和角色标识编码不能为空",
		})
	}

	var count int64
	database.DB.Model(&model.SysRole{}).Where("code = ?", req.Code).Count(&count)
	if count > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "角色标识编码已存在，请使用其他编码",
		})
	}

	role := model.SysRole{
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		Status:      1,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := database.DB.Create(&role).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "创建角色失败: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"code":    201,
		"message": "角色创建成功",
		"data":    role,
	})
}

// UpdateRole updates role name & description
func (h *RoleHandler) UpdateRole(c *fiber.Ctx) error {
	idParam := c.Params("id")
	roleID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的角色 ID",
		})
	}

	var role model.SysRole
	if err := database.DB.First(&role, roleID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"code":    404,
			"message": "角色不存在",
		})
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Status      *int   `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "参数格式错误",
		})
	}

	if strings.TrimSpace(req.Name) != "" {
		role.Name = strings.TrimSpace(req.Name)
	}
	role.Description = req.Description
	if req.Status != nil && role.ID > 1 {
		role.Status = *req.Status
	}
	role.UpdatedAt = time.Now()

	if err := database.DB.Save(&role).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "更新角色失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "角色信息已更新",
		"data":    role,
	})
}

// DeleteRole deletes custom role
func (h *RoleHandler) DeleteRole(c *fiber.Ctx) error {
	idParam := c.Params("id")
	roleID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的角色 ID",
		})
	}

	if roleID <= 4 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "系统预置核心角色禁止删除",
		})
	}

	var userCount int64
	database.DB.Model(&model.SysUser{}).Where("role_id = ?", roleID).Count(&userCount)
	if userCount > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "该角色下仍有关联用户，请先将用户转移至其他角色后再删除",
		})
	}

	tx := database.DB.Begin()
	tx.Where("role_id = ?", roleID).Delete(&model.SysRolePermission{})
	tx.Delete(&model.SysRole{}, roleID)
	tx.Commit()

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "角色已成功删除",
	})
}

// GetRolePermissions returns assigned permissions and all menus
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
	database.DB.Where("status = 1").Order("sort ASC, id ASC").Find(&menus)

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

// UpdateRolePermissions updates role permissions matrix
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

type PermTreeNode struct {
	ID             uint            `json:"id"`
	ParentID       uint            `json:"parentId"`
	Title          string          `json:"title"`
	Name           string          `json:"name"`
	Type           string          `json:"type"` // "M", "B", "F"
	PermissionCode string          `json:"permissionCode"`
	Sort           int             `json:"sort"`
	Children       []*PermTreeNode `json:"children,omitempty"`
}

// GetPermissionsTree returns hierarchical permission tree for UI matrix selector
func (h *RoleHandler) GetPermissionsTree(c *fiber.Ctx) error {
	var all []model.SysMenu
	if err := database.DB.Where("status = 1").Order("sort ASC, id ASC").Find(&all).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "查询权限树失败",
		})
	}

	moduleMap := make(map[uint]*PermTreeNode)
	var roots []*PermTreeNode

	// First pass: collect type M (Modules)
	for _, item := range all {
		if item.Type == "M" {
			node := &PermTreeNode{
				ID:             item.ID,
				ParentID:       item.ParentID,
				Title:          item.Title,
				Name:           item.Name,
				Type:           item.Type,
				PermissionCode: item.PermissionCode,
				Sort:           item.Sort,
				Children:       make([]*PermTreeNode, 0),
			}
			moduleMap[item.ID] = node
			roots = append(roots, node)
		}
	}

	// Second pass: attach buttons & fields to their parent module
	for _, item := range all {
		if item.Type == "B" || item.Type == "F" {
			node := &PermTreeNode{
				ID:             item.ID,
				ParentID:       item.ParentID,
				Title:          item.Title,
				Name:           item.Name,
				Type:           item.Type,
				PermissionCode: item.PermissionCode,
				Sort:           item.Sort,
			}
			if parent, exists := moduleMap[item.ParentID]; exists {
				parent.Children = append(parent.Children, node)
			}
		}
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    roots,
	})
}
