package model

import (
	"time"
)

type SysMenu struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	ParentID       uint      `gorm:"default:0;index" json:"parentId"`
	Title          string    `gorm:"size:64;not null" json:"title"`
	Name           string    `gorm:"size:64;not null" json:"name"`
	Path           string    `gorm:"size:128" json:"path"`
	Icon           string    `gorm:"size:64" json:"icon"`
	Component      string    `gorm:"size:128" json:"component"`
	Sort           int       `gorm:"default:0" json:"sort"`
	Type           string    `gorm:"size:8;not null" json:"type"` // "M" = Menu, "B" = Button, "F" = Field (Price/Sensitive)
	PermissionCode string    `gorm:"size:128;index" json:"permissionCode"`
	Status         int       `gorm:"default:1" json:"status"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// MenuTreeNode represents the hierarchical tree node for frontend dynamic menu loading
type MenuTreeNode struct {
	ID             uint            `json:"id"`
	ParentID       uint            `json:"parentId"`
	Title          string          `json:"title"`
	Name           string          `json:"name"`
	Path           string          `json:"path"`
	Icon           string          `json:"icon"`
	Component      string          `json:"component"`
	Sort           int             `json:"sort"`
	Children       []*MenuTreeNode `json:"children,omitempty"`
	BtnPermissions []string        `json:"btnPermissions,omitempty"`
	FieldPerms     []string        `json:"fieldPerms,omitempty"`
}
