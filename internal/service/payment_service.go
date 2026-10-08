package service

import (
	"errors"
	"fmt"
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
		p.PaymentNo = fmt.Sprintf("PM-%s-%03d", time.Now().Format("2006"), time.Now().Unix()%1000)
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
