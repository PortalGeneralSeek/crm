package service

import (
	"errors"
	"time"

	"crm-backend/internal/database"
	"crm-backend/internal/model"
)

type LeadService struct{}

func NewLeadService() *LeadService {
	return &LeadService{}
}

func (s *LeadService) ListLeads() ([]model.CrmLead, error) {
	var leads []model.CrmLead
	err := database.DB.Order("id DESC").Find(&leads).Error
	return leads, err
}

func (s *LeadService) CreateLead(lead *model.CrmLead) error {
	if lead.Name == "" || lead.Company == "" {
		return errors.New("线索名称与企业全称不能为空")
	}
	if lead.Status == "" {
		lead.Status = "new"
	}
	return database.DB.Create(lead).Error
}

func (s *LeadService) ConvertLeadToDeal(leadID uint, dealName string, amount float64, ownerID uint) (*model.CrmDeal, error) {
	var lead model.CrmLead
	if err := database.DB.First(&lead, leadID).Error; err != nil {
		return nil, errors.New("线索不存在")
	}

	if lead.Status == "converted" {
		return nil, errors.New("该线索已经成功转化为商机，无需重复转化")
	}

	// Update lead status
	if err := database.DB.Model(&lead).Update("status", "converted").Error; err != nil {
		return nil, err
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

	deal := &model.CrmDeal{
		Name:         dealName,
		CustomerName: lead.Company,
		Stage:        "discovery",
		Amount:       amount,
		CostPrice:    costPrice,
		MarginRate:   marginRate,
		Probability:  30,
		CloseDate:    time.Now().AddDate(0, 1, 0).Format("2006-01-02"),
		OwnerID:      ownerID,
		OwnerName:    lead.OwnerName,
	}

	if err := database.DB.Create(deal).Error; err != nil {
		return nil, err
	}

	return deal, nil
}
