package model

import (
	"time"
)

type SysRole struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:64;not null" json:"name"`
	Code        string    `gorm:"size:64;uniqueIndex;not null" json:"code"` // super_admin, sales_director, sales_rep, finance_auditor
	Description string    `gorm:"size:255" json:"description"`
	Status      int       `gorm:"default:1" json:"status"` // 1=active, 0=disabled
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type SysUser struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Username     string    `gorm:"size:64;uniqueIndex;not null" json:"username"`
	PasswordHash string    `gorm:"size:255;not null" json:"-"`
	RealName     string    `gorm:"size:64;not null" json:"realName"`
	Avatar       string    `gorm:"size:255" json:"avatar"`
	Email        string    `gorm:"size:128" json:"email"`
	Phone        string    `gorm:"size:32" json:"phone"`
	RoleID       uint      `gorm:"not null" json:"roleId"`
	Role         SysRole   `gorm:"foreignKey:RoleID" json:"role"`
	Status       int       `gorm:"default:1" json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type SysRolePermission struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	RoleID    uint      `gorm:"index;not null" json:"roleId"`
	MenuID    uint      `gorm:"index;not null" json:"menuId"`
	CreatedAt time.Time `json:"createdAt"`
}
