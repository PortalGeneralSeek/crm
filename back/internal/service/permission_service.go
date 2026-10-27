package service

import (
	"crm-backend/internal/database"
	"crm-backend/internal/model"
)

type PermissionService struct{}

func NewPermissionService() *PermissionService {
	return &PermissionService{}
}

// GetUserPermissions returns all permission codes authorized for the given role
func (s *PermissionService) GetUserPermissions(roleID uint, roleCode string) []string {
	if roleCode == "super_admin" {
		var allPerms []string
		database.DB.Model(&model.SysMenu{}).Where("status = 1 AND permission_code != ''").Pluck("permission_code", &allPerms)
		return append(allPerms, "*")
	}

	var perms []string
	database.DB.Table("sys_menus").
		Select("sys_menus.permission_code").
		Joins("JOIN sys_role_permissions ON sys_role_permissions.menu_id = sys_menus.id").
		Where("sys_role_permissions.role_id = ? AND sys_menus.status = 1 AND sys_menus.permission_code != ''", roleID).
		Pluck("sys_menus.permission_code", &perms)

	return perms
}

// GetUserMenuTree builds the dynamic hierarchical menu tree for frontend navigation
func (s *PermissionService) GetUserMenuTree(roleID uint, roleCode string) []*model.MenuTreeNode {
	var menus []model.SysMenu

	if roleCode == "super_admin" {
		database.DB.Where("status = 1").Order("sort ASC").Find(&menus)
	} else {
		database.DB.Table("sys_menus").
			Joins("JOIN sys_role_permissions ON sys_role_permissions.menu_id = sys_menus.id").
			Where("sys_role_permissions.role_id = ? AND sys_menus.status = 1", roleID).
			Order("sys_menus.sort ASC").
			Find(&menus)
	}

	// Group buttons & field permissions by parent menu ID
	btnPermMap := make(map[uint][]string)
	fieldPermMap := make(map[uint][]string)
	var menuItems []model.SysMenu

	for _, item := range menus {
		if item.Type == "B" {
			btnPermMap[item.ParentID] = append(btnPermMap[item.ParentID], item.PermissionCode)
		} else if item.Type == "F" {
			fieldPermMap[item.ParentID] = append(fieldPermMap[item.ParentID], item.PermissionCode)
		} else if item.Type == "M" {
			menuItems = append(menuItems, item)
		}
	}

	// Build menu tree
	var tree []*model.MenuTreeNode
	for _, m := range menuItems {
		node := &model.MenuTreeNode{
			ID:             m.ID,
			ParentID:       m.ParentID,
			Title:          m.Title,
			Name:           m.Name,
			Path:           m.Path,
			Icon:           m.Icon,
			Component:      m.Component,
			Sort:           m.Sort,
			BtnPermissions: btnPermMap[m.ID],
			FieldPerms:     fieldPermMap[m.ID],
		}
		tree = append(tree, node)
	}

	return tree
}

func HasFieldPermission(perms []string, fieldCode string) bool {
	for _, p := range perms {
		if p == fieldCode || p == "*" {
			return true
		}
	}
	return false
}
