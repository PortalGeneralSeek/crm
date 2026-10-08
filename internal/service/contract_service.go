package service

import (
	"errors"
	"fmt"
	"time"

	"crm-backend/internal/database"
	"crm-backend/internal/model"
)

type ContractService struct {
	audit *AuditService
}

func NewContractService() *ContractService {
	return &ContractService{
		audit: NewAuditService(),
	}
}

func (s *ContractService) ListContracts(page, pageSize int, keyword, status, roleCode string, userID uint) ([]model.CrmContract, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	query := database.DB.Model(&model.CrmContract{})

	// Data Scope: sales_rep only views own contracts
	if roleCode == "sales_rep" && userID > 0 {
		query = query.Where("owner_id = ?", userID)
	}

	if keyword != "" {
		query = query.Where("contract_no LIKE ? OR title LIKE ? OR customer_name LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var contracts []model.CrmContract
	offset := (page - 1) * pageSize
	err := query.Order("id DESC").Offset(offset).Limit(pageSize).Find(&contracts).Error
	return contracts, total, err
}

func (s *ContractService) CreateContract(c *model.CrmContract, userID uint, username, roleName, ip string) error {
	if c.Title == "" || c.Amount <= 0 {
		return errors.New("合同名称与有效金额为必填项")
	}
	if c.ContractNo == "" {
		c.ContractNo = fmt.Sprintf("CT-%s-%03d", time.Now().Format("2006"), time.Now().Unix()%1000)
	}
	c.CreatedAt = time.Now()
	c.UpdatedAt = time.Now()
	if c.OwnerID == 0 {
		c.OwnerID = userID
		c.OwnerName = username
	}
	if c.Status == "" {
		c.Status = "pending_approval"
	}

	if err := database.DB.Create(c).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "合同中心", "起草新签署合同", "POST", "/api/v1/contracts", ip, fmt.Sprintf("生成合同 [%s] %s, 金额 ¥%.2f", c.ContractNo, c.Title, c.Amount))
	return nil
}

func (s *ContractService) ApproveContract(id uint, userID uint, username, roleName, ip string) error {
	var contract model.CrmContract
	if err := database.DB.First(&contract, id).Error; err != nil {
		return errors.New("合同不存在")
	}

	contract.Status = "approved"
	contract.UpdatedAt = time.Now()

	if err := database.DB.Save(&contract).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "合同中心", "合同法务/总监终审批准", "PUT", fmt.Sprintf("/api/v1/contracts/%d/approve", id), ip, fmt.Sprintf("审核签署合同 [%s] %s 状态置为生效", contract.ContractNo, contract.Title))
	return nil
}

func (s *ContractService) UpdateContract(id uint, req *model.CrmContract, userID uint, username, roleName, ip string) error {
	var contract model.CrmContract
	if err := database.DB.First(&contract, id).Error; err != nil {
		return errors.New("合同不存在")
	}

	contract.Title = req.Title
	contract.Amount = req.Amount
	contract.Status = req.Status
	contract.SignDate = req.SignDate
	contract.UpdatedAt = time.Now()

	if err := database.DB.Save(&contract).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "合同中心", "编辑合同要素", "PUT", "/api/v1/contracts", ip, "更新合同要素: "+contract.ContractNo)
	return nil
}

func (s *ContractService) DeleteContract(id uint, userID uint, username, roleName, ip string) error {
	var contract model.CrmContract
	if err := database.DB.First(&contract, id).Error; err != nil {
		return errors.New("合同不存在")
	}

	if err := database.DB.Delete(&contract).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "合同中心", "作废并删除合同", "DELETE", "/api/v1/contracts", ip, "删除合同: "+contract.ContractNo)
	return nil
}
