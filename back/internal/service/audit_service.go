package service

import (
	"crm-backend/internal/database"
	"crm-backend/internal/model"
	"time"
)

type AuditService struct{}

func NewAuditService() *AuditService {
	return &AuditService{}
}

func (s *AuditService) Record(userID uint, username, roleName, module, action, method, path, ip, details string) {
	log := model.SysOperationLog{
		UserID:    userID,
		Username:  username,
		RoleName:  roleName,
		Module:    module,
		Action:    action,
		Method:    method,
		Path:      path,
		IP:        ip,
		Details:   details,
		CreatedAt: time.Now(),
	}

	// Asynchronous write to prevent blocking HTTP handler latency
	go func() {
		defer func() {
			if r := recover(); r != nil {
				// avoid panic crash in background goroutine
			}
		}()
		_ = database.DB.Create(&log)
	}()
}

func (s *AuditService) List(page, pageSize int, keyword, module string) ([]model.SysOperationLog, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var logs []model.SysOperationLog
	var total int64

	query := database.DB.Model(&model.SysOperationLog{})
	if keyword != "" {
		query = query.Where("username LIKE ? OR module LIKE ? OR action LIKE ? OR details LIKE ?",
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if module != "" {
		query = query.Where("module = ?", module)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&logs).Error
	return logs, total, err
}
