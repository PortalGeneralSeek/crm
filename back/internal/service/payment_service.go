package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"crm-backend/internal/database"
	"crm-backend/internal/model"
)

type PaymentService struct {
	audit *AuditService
}

func NewPaymentService() *PaymentService {
	return &PaymentService{
		audit: NewAuditService(),
	}
}

func (s *PaymentService) ListPayments(page, pageSize int, keyword, status, roleCode string, userID uint) ([]model.CrmPayment, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	query := database.DB.Model(&model.CrmPayment{})

	if keyword != "" {
		query = query.Where("payment_no LIKE ? OR contract_no LIKE ? OR customer_name LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var payments []model.CrmPayment
	offset := (page - 1) * pageSize
	err := query.Order("id DESC").Offset(offset).Limit(pageSize).Find(&payments).Error
	return payments, total, err
}

func (s *PaymentService) CreatePayment(p *model.CrmPayment, userID uint, username, roleName, ip string) error {
	if p.Amount <= 0 || p.CustomerName == "" {
		return errors.New("回款金额与关联客户为必填项")
	}
	if p.PaymentNo == "" {
		p.PaymentNo = fmt.Sprintf("PM-%s-%04d", time.Now().Format("20060102150405"), rand.Intn(9000)+1000)
	}
	if p.Status == "" {
		p.Status = "pending"
	}
	if p.InvoiceStatus == "" {
		p.InvoiceStatus = "unissued"
	}
	if p.PaymentDate == "" {
		p.PaymentDate = time.Now().Format("2006-01-02")
	}
	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()

	if err := database.DB.Create(p).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "回款结算", "登记回款流水", "POST", "/api/v1/payments", ip, fmt.Sprintf("登记回款 [%s] 金额 ¥%.2f, 客户: %s", p.PaymentNo, p.Amount, p.CustomerName))
	return nil
}

func (s *PaymentService) AuditPayment(id uint, userID uint, username, roleName, ip string) error {
	var payment model.CrmPayment
	if err := database.DB.First(&payment, id).Error; err != nil {
		return errors.New("回款记录不存在")
	}

	if roleName == "sales_rep" {
		return errors.New("权限不足：普通销售无权审核对账回款流水")
	}

	payment.Status = "audited"
	payment.AuditBy = username
	payment.UpdatedAt = time.Now()

	if err := database.DB.Save(&payment).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "回款结算", "财务回款对账审核", "PUT", fmt.Sprintf("/api/v1/payments/%d/audit", id), ip, fmt.Sprintf("审核确认到账: [%s] 金额 ¥%.2f", payment.PaymentNo, payment.Amount))
	return nil
}

func (s *PaymentService) IssueInvoice(id uint, userID uint, username, roleName, ip string) error {
	var payment model.CrmPayment
	if err := database.DB.First(&payment, id).Error; err != nil {
		return errors.New("回款记录不存在")
	}

	payment.InvoiceStatus = "issued"
	payment.UpdatedAt = time.Now()

	if err := database.DB.Save(&payment).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "回款结算", "开具发票凭证", "PUT", fmt.Sprintf("/api/v1/payments/%d/invoice", id), ip, fmt.Sprintf("为回款 [%s] 开具增值税专用发票", payment.PaymentNo))
	return nil
}

func (s *PaymentService) ListBankStatements(page, pageSize int, keyword, status string) ([]model.CrmBankStatement, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := database.DB.Model(&model.CrmBankStatement{})
	if keyword != "" {
		query = query.Where("statement_no LIKE ? OR counterparty LIKE ? OR bank_name LIKE ? OR summary LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var list []model.CrmBankStatement
	offset := (page - 1) * pageSize
	err := query.Order("id DESC").Offset(offset).Limit(pageSize).Find(&list).Error
	return list, total, err
}

type AssociateRequest struct {
	StatementID     uint    `json:"statementId"`
	ContractID      uint    `json:"contractId"`
	AssociateAmount float64 `json:"associateAmount"`
	AssociateType   string  `json:"associateType"` // full, partial
	PaymentType     string  `json:"paymentType"`   // prepayment, milestone, final
	Note            string  `json:"note"`
}

func (s *PaymentService) AssociateBankStatement(req *AssociateRequest, userID uint, username, roleName, ip string) (*model.CrmPayment, error) {
	if req.StatementID == 0 || req.ContractID == 0 {
		return nil, errors.New("银行流水ID与系统订单/合同ID为必填项")
	}
	if req.AssociateAmount <= 0 {
		return nil, errors.New("关联核销金额必须大于 0")
	}

	var statement model.CrmBankStatement
	if err := database.DB.First(&statement, req.StatementID).Error; err != nil {
		return nil, errors.New("银行流水记录不存在")
	}

	if req.AssociateAmount > statement.RemainAmount+0.01 {
		return nil, fmt.Errorf("关联金额 (¥%.2f) 超出银行流水剩余可关联余额 (¥%.2f)", req.AssociateAmount, statement.RemainAmount)
	}

	var contract model.CrmContract
	if err := database.DB.First(&contract, req.ContractID).Error; err != nil {
		return nil, errors.New("关联合同/系统订单不存在")
	}

	// 1. Update bank statement balances
	statement.LinkedAmount += req.AssociateAmount
	statement.RemainAmount -= req.AssociateAmount
	if statement.RemainAmount <= 0.01 {
		statement.RemainAmount = 0
		statement.Status = "settled"
	} else {
		statement.Status = "partial"
	}
	statement.UpdatedAt = time.Now()
	if err := database.DB.Save(&statement).Error; err != nil {
		return nil, err
	}

	// 2. Create settled payment record
	assocType := req.AssociateType
	if assocType == "" {
		if statement.RemainAmount == 0 {
			assocType = "full"
		} else {
			assocType = "partial"
		}
	}
	payType := req.PaymentType
	if payType == "" {
		payType = "prepayment"
	}

	payment := model.CrmPayment{
		PaymentNo:       fmt.Sprintf("PM-%s-%04d", time.Now().Format("20060102150405"), rand.Intn(9000)+1000),
		BankStatementNo: statement.StatementNo,
		ContractID:      contract.ID,
		ContractNo:      contract.ContractNo,
		CustomerName:    contract.CustomerName,
		Amount:          req.AssociateAmount,
		AssociationType: assocType,
		Type:            payType,
		Status:          "audited", // Automatically audited once linked to verified bank statement
		PaymentDate:     time.Now().Format("2006-01-02"),
		InvoiceStatus:   "unissued",
		AuditBy:         username,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	if err := database.DB.Create(&payment).Error; err != nil {
		return nil, err
	}

	// 3. Activate customer entitlement upon payment settlement
	var entitlement model.CrmCustomerEntitlement
	entErr := database.DB.Where("(contract_no = ? OR customer_name = ?) AND status = ?", contract.ContractNo, contract.CustomerName, "inactive").First(&entitlement).Error
	if entErr == nil {
		entitlement.Status = "active"
		entitlement.BankStatementNo = statement.StatementNo
		entitlement.PaymentNo = payment.PaymentNo
		entitlement.ActivatedAt = time.Now().Format("2006-01-02 15:04:05")
		entitlement.UpdatedAt = time.Now()
		_ = database.DB.Save(&entitlement).Error
	} else {
		// If no inactive entitlement existed, check if any active exists; if none, create a new active entitlement for this customer
		var anyEnt model.CrmCustomerEntitlement
		if err := database.DB.Where("customer_name = ?", contract.CustomerName).First(&anyEnt).Error; err != nil {
			newEnt := model.CrmCustomerEntitlement{
				EntitlementNo:   fmt.Sprintf("EQ-%s-%04d", time.Now().Format("20060102"), rand.Intn(9000)+1000),
				CustomerID:      contract.CustomerID,
				CustomerName:    contract.CustomerName,
				ContractNo:      contract.ContractNo,
				BankStatementNo: statement.StatementNo,
				PaymentNo:       payment.PaymentNo,
				Name:            "企业云端私有化部署实施包",
				Category:        "系统实施交付类",
				Value:           50000.00,
				Status:          "active",
				ActivatedAt:     time.Now().Format("2006-01-02 15:04:05"),
				Features:        "[\"1套高可用集群私有云部署\", \"全量业务数据无缝热迁移\", \"数据库调优与容器化部署支持\"]",
				SwitchHistory:   "[]",
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			}
			_ = database.DB.Create(&newEnt).Error
		}
	}

	s.audit.Record(userID, username, roleName, "回款结算", "银行流水关联系统订单", "POST", "/api/v1/bank-statements/associate", ip,
		fmt.Sprintf("流水 [%s] 成功关联订单 [%s] 结算回款 ¥%.2f (%s关联)，已激活客户 [%s] 对应等价权益",
			statement.StatementNo, contract.ContractNo, req.AssociateAmount, assocType, contract.CustomerName))

	return &payment, nil
}

func (s *PaymentService) ListCustomerEntitlements(page, pageSize int, keyword, status string) ([]model.CrmCustomerEntitlement, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	query := database.DB.Model(&model.CrmCustomerEntitlement{})
	if keyword != "" {
		query = query.Where("entitlement_no LIKE ? OR customer_name LIKE ? OR contract_no LIKE ? OR name LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var list []model.CrmCustomerEntitlement
	offset := (page - 1) * pageSize
	err := query.Order("id DESC").Offset(offset).Limit(pageSize).Find(&list).Error
	return list, total, err
}

type SwitchEntitlementRequest struct {
	NewName     string `json:"newName"`
	NewCategory string `json:"newCategory"`
	Reason      string `json:"reason"`
}

func (s *PaymentService) SwitchEntitlement(id uint, req *SwitchEntitlementRequest, userID uint, username, roleName, ip string) error {
	var ent model.CrmCustomerEntitlement
	if err := database.DB.First(&ent, id).Error; err != nil {
		return errors.New("客户权益记录不存在")
	}

	if ent.Status != "active" {
		return errors.New("仅允许【生效中】的客户权益进行等价平移切换（待回款激活权益需先完成流水结算）")
	}

	if req.NewName == "" || req.NewName == ent.Name {
		return errors.New("请选择目标等价权益包进行置换")
	}

	// Parse previous history
	type HistoryItem struct {
		FromName   string  `json:"fromName"`
		ToName     string  `json:"toName"`
		Value      float64 `json:"value"`
		Operator   string  `json:"operator"`
		Reason     string  `json:"reason"`
		SwitchedAt string  `json:"switchedAt"`
	}

	var history []HistoryItem
	if ent.SwitchHistory != "" && ent.SwitchHistory != "[]" {
		_ = json.Unmarshal([]byte(ent.SwitchHistory), &history)
	}

	item := HistoryItem{
		FromName:   ent.Name,
		ToName:     req.NewName,
		Value:      ent.Value,
		Operator:   username,
		Reason:     req.Reason,
		SwitchedAt: time.Now().Format("2006-01-02 15:04:05"),
	}
	history = append(history, item)
	historyBytes, _ := json.Marshal(history)

	oldName := ent.Name
	ent.Name = req.NewName
	if req.NewCategory != "" {
		ent.Category = req.NewCategory
	}
	ent.SwitchHistory = string(historyBytes)
	ent.UpdatedAt = time.Now()

	if err := database.DB.Save(&ent).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "回款结算", "切换等价权益", "POST", fmt.Sprintf("/api/v1/customer-entitlements/%d/switch", id), ip,
		fmt.Sprintf("客户 [%s] 成功切换等价权益: 【%s】 -> 【%s】(等值 ¥%.2f)，说明: %s", ent.CustomerName, oldName, req.NewName, ent.Value, req.Reason))

	return nil
}
