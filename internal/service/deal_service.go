package service

import (
	"errors"
	"fmt"

	"crm-backend/internal/database"
	"crm-backend/internal/model"
)

type DealService struct{}

func NewDealService() *DealService {
	return &DealService{}
}

func (s *DealService) ListDeals(perms []string) ([]model.DealDTO, error) {
	var deals []model.CrmDeal
	if err := database.DB.Order("id DESC").Find(&deals).Error; err != nil {
		return nil, err
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

	return dtos, nil
}

func (s *DealService) CreateDeal(deal *model.CrmDeal) error {
	if deal.Name == "" || deal.CustomerName == "" {
		return errors.New("商机名称和关联客户不能为空")
	}
	if deal.Stage == "" {
		deal.Stage = "discovery"
	}
	if deal.CostPrice > 0 && deal.Amount > 0 {
		deal.MarginRate = ((deal.Amount - deal.CostPrice) / deal.Amount) * 100
	}
	return database.DB.Create(deal).Error
}

func (s *DealService) AdvanceStage(id uint, nextStage string) error {
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

	return database.DB.Model(&deal).Updates(map[string]interface{}{
		"stage":       nextStage,
		"probability": prob,
	}).Error
}

func (s *DealService) DeleteDeal(id uint) error {
	return database.DB.Delete(&model.CrmDeal{}, id).Error
}
