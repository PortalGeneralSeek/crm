package service

import (
	"errors"
	"fmt"
	"time"

	"crm-backend/internal/database"
	"crm-backend/internal/model"
)

type DealService struct {
	audit *AuditService
}

func NewDealService() *DealService {
	return &DealService{
		audit: NewAuditService(),
	}
}

func (s *DealService) ListDeals(perms []string, page, pageSize int, keyword, stage, roleCode string, userID uint) ([]model.DealDTO, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := database.DB.Model(&model.CrmDeal{})

	// Data Scope: sales_rep only views own deals
	if roleCode == "sales_rep" && userID > 0 {
		query = query.Where("owner_id = ?", userID)
	}

	if keyword != "" {
		query = query.Where("name LIKE ? OR customer_name LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}
	if stage != "" {
		query = query.Where("stage = ?", stage)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var deals []model.CrmDeal
	offset := (page - 1) * pageSize
	if err := query.Order("id DESC").Offset(offset).Limit(pageSize).Find(&deals).Error; err != nil {
		return nil, 0, err
	}

	canViewCost := HasFieldPermission(perms, "field:deal:cost_price")
	canEditPrice := HasFieldPermission(perms, "field:deal:edit_price")

	var dtos []model.DealDTO
	for _, d := range deals {
		dto := model.DealDTO{
			ID:               d.ID,
			Name:             d.Name,
			CustomerID:       d.CustomerID,
			CustomerName:     d.CustomerName,
			Stage:            d.Stage,
			Amount:           d.Amount,
			CanViewCostPrice: canViewCost,
			CanEditPrice:     canEditPrice,
			Probability:      d.Probability,
			CloseDate:        d.CloseDate,
			OwnerID:          d.OwnerID,
			OwnerName:        d.OwnerName,
			CreatedAt:        d.CreatedAt,
			UpdatedAt:        d.UpdatedAt,
		}

		if canViewCost {
			cost := d.CostPrice
			margin := d.MarginRate
			dto.CostPrice = &cost
			dto.CostPriceDisplay = fmt.Sprintf("¥%.2f", d.CostPrice)
			dto.MarginRate = &margin
			dto.MarginRateDisplay = fmt.Sprintf("%.2f%%", d.MarginRate)
		} else {
			// Mask sensitive price fields for normal sales reps
			dto.CostPrice = nil
			dto.CostPriceDisplay = "¥*** (底价脱敏)"
			dto.MarginRate = nil
			dto.MarginRateDisplay = "*** (无权查看)"
		}

		dtos = append(dtos, dto)
	}

	return dtos, total, nil
}

func (s *DealService) CreateDeal(deal *model.CrmDeal, userID uint, username, roleName, ip string) error {
	if deal.Name == "" || deal.CustomerName == "" {
		return errors.New("商机名称和关联客户不能为空")
	}
	if deal.Stage == "" {
		deal.Stage = "discovery"
	}
	if deal.CostPrice > 0 && deal.Amount > 0 {
		deal.MarginRate = ((deal.Amount - deal.CostPrice) / deal.Amount) * 100
	}
	deal.CreatedAt = time.Now()
	deal.UpdatedAt = time.Now()
	if deal.OwnerID == 0 {
		deal.OwnerID = userID
		deal.OwnerName = username
	}

	if err := database.DB.Create(deal).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "商机管理", "新建商机", "POST", "/api/v1/deals", ip, fmt.Sprintf("建立商机 [%s] 金额 ¥%.2f, 客户: %s", deal.Name, deal.Amount, deal.CustomerName))
	return nil
}

func (s *DealService) AdvanceStage(id uint, nextStage string, userID uint, username, roleName, ip string) error {
	var deal model.CrmDeal
	if err := database.DB.First(&deal, id).Error; err != nil {
		return errors.New("商机不存在")
	}

	prob := 50
	switch nextStage {
	case "discovery":
		prob = 30
	case "proposal":
		prob = 60
	case "negotiation":
		prob = 80
	case "closed_won":
		prob = 100
	case "closed_lost":
		prob = 0
	}

	err := database.DB.Model(&deal).Updates(map[string]interface{}{
		"stage":       nextStage,
		"probability": prob,
		"updated_at":  time.Now(),
	}).Error
	if err != nil {
		return err
	}

	// If closed_won, automatically generate a pending contract if none exists for this deal
	if nextStage == "closed_won" {
		var existingContract model.CrmContract
		if err := database.DB.Where("deal_id = ?", deal.ID).First(&existingContract).Error; err != nil {
			contract := model.CrmContract{
				ContractNo:   fmt.Sprintf("CT-%s-%03d", time.Now().Format("2006"), deal.ID),
				Title:        deal.CustomerName + " · 商业交付主合同",
				CustomerID:   deal.CustomerID,
				CustomerName: deal.CustomerName,
				DealID:       deal.ID,
				Amount:       deal.Amount,
				Status:       "pending_approval",
				SignDate:     time.Now().Format("2006-01-02"),
				OwnerID:      deal.OwnerID,
				OwnerName:    deal.OwnerName,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}
			_ = database.DB.Create(&contract)
		}
	}

	s.audit.Record(userID, username, roleName, "商机管理", "推进商机阶段", "PUT", fmt.Sprintf("/api/v1/deals/%d/stage", id), ip, fmt.Sprintf("商机 [%s] 推进至阶段: %s (赢单率: %d%%)", deal.Name, nextStage, prob))
	return nil
}

func (s *DealService) DeleteDeal(id uint, userID uint, username, roleName, ip string) error {
	var deal model.CrmDeal
	if err := database.DB.First(&deal, id).Error; err != nil {
		return errors.New("商机不存在")
	}

	if err := database.DB.Delete(&deal).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "商机管理", "删除商机", "DELETE", fmt.Sprintf("/api/v1/deals/%d", id), ip, fmt.Sprintf("删除商机: %s", deal.Name))
	return nil
}
