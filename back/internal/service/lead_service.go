package service

import (
	"errors"
	"fmt"
	"time"

	"crm-backend/internal/database"
	"crm-backend/internal/model"

	"gorm.io/gorm"
)

type LeadService struct {
	audit *AuditService
}

func NewLeadService() *LeadService {
	return &LeadService{
		audit: NewAuditService(),
	}
}

func (s *LeadService) ListLeads(page, pageSize int, keyword, status, roleCode string, userID uint) ([]model.CrmLead, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := database.DB.Model(&model.CrmLead{})

	// Data Scope: sales_rep only views own leads
	if roleCode == "sales_rep" && userID > 0 {
		query = query.Where("owner_id = ?", userID)
	}

	if keyword != "" {
		query = query.Where("name LIKE ? OR company LIKE ? OR phone LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var leads []model.CrmLead
	offset := (page - 1) * pageSize
	err := query.Order("id DESC").Offset(offset).Limit(pageSize).Find(&leads).Error
	return leads, total, err
}

func (s *LeadService) CreateLead(lead *model.CrmLead, userID uint, username, roleName, ip string) error {
	if lead.Name == "" || lead.Company == "" {
		return errors.New("线索名称与企业全称不能为空")
	}
	if lead.Status == "" {
		lead.Status = "new"
	}
	lead.CreatedAt = time.Now()
	lead.UpdatedAt = time.Now()
	if lead.OwnerID == 0 {
		lead.OwnerID = userID
		lead.OwnerName = username
	}

	if err := database.DB.Create(lead).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "线索管理", "新建线索", "POST", "/api/v1/leads", ip, fmt.Sprintf("录入线索 [%s] 客户: %s", lead.Name, lead.Company))
	return nil
}

func (s *LeadService) ConvertLeadToDeal(leadID uint, dealName string, amount float64, userID uint, username, roleName, ip string) (*model.CrmDeal, error) {
	var lead model.CrmLead
	if err := database.DB.First(&lead, leadID).Error; err != nil {
		return nil, errors.New("线索不存在")
	}

	// IDOR Protection: Sales reps can only convert leads they own
	if roleName == "sales_rep" && lead.OwnerID > 0 && lead.OwnerID != userID {
		return nil, errors.New("权限不足：无权转化非本人负责的线索")
	}

	if lead.Status == "converted" {
		return nil, errors.New("该线索已经成功转化为商机，无需重复转化")
	}

	if dealName == "" {
		dealName = lead.Company + " · 商业意向转化"
	}
	if amount <= 0 {
		amount = lead.Budget
		if amount <= 0 {
			amount = 100000.00
		}
	}

	costPrice := amount * 0.6 // default cost estimate 60%
	marginRate := 40.0

	var createdDeal *model.CrmDeal
	var customerName string

	// Wrap lead update, customer verification/creation, and deal creation in an atomic transaction
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Update lead status
		if err := tx.Model(&lead).Updates(map[string]interface{}{
			"status":     "converted",
			"updated_at": time.Now(),
		}).Error; err != nil {
			return err
		}

		// 2. Ensure Customer exists or auto-create Customer
		var customer model.CrmCustomer
		if err := tx.Where("name = ?", lead.Company).First(&customer).Error; err != nil {
			customer = model.CrmCustomer{
				Name:         lead.Company,
				Industry:     "数字化智能产业",
				Tier:         "KA",
				ContactName:  lead.Name,
				ContactPhone: lead.Phone,
				OwnerID:      userID,
				OwnerName:    username,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}
			if err := tx.Create(&customer).Error; err != nil {
				return err
			}
		}
		customerName = customer.Name

		// 3. Create deal
		deal := &model.CrmDeal{
			Name:         dealName,
			CustomerID:   customer.ID,
			CustomerName: lead.Company,
			Stage:        "discovery",
			Amount:       amount,
			CostPrice:    costPrice,
			MarginRate:   marginRate,
			Probability:  30,
			CloseDate:    time.Now().AddDate(0, 1, 0).Format("2006-01-02"),
			OwnerID:      userID,
			OwnerName:    username,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := tx.Create(deal).Error; err != nil {
			return err
		}
		createdDeal = deal
		return nil
	})

	if err != nil {
		return nil, err
	}

	s.audit.Record(userID, username, roleName, "线索管理", "线索转化为商机", "POST", fmt.Sprintf("/api/v1/leads/%d/convert", leadID), ip, fmt.Sprintf("线索 [%s] 成功转为商机 [%s], 金额 ¥%.2f, 自动关联客户 [%s]", lead.Company, createdDeal.Name, createdDeal.Amount, customerName))
	return createdDeal, nil
}
