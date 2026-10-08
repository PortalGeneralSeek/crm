package service

import (
	"errors"
	"time"

	"crm-backend/internal/database"
	"crm-backend/internal/model"
)

type CustomerService struct {
	audit *AuditService
}

func NewCustomerService() *CustomerService {
	return &CustomerService{
		audit: NewAuditService(),
	}
}

func (s *CustomerService) ListCustomers(page, pageSize int, keyword, tier, roleCode string, userID uint) ([]model.CrmCustomer, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	query := database.DB.Model(&model.CrmCustomer{})

	// Data Scope: sales_rep only views own customers
	if roleCode == "sales_rep" && userID > 0 {
		query = query.Where("owner_id = ?", userID)
	}

	if keyword != "" {
		query = query.Where("name LIKE ? OR contact_name LIKE ? OR contact_phone LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if tier != "" {
		query = query.Where("tier = ?", tier)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var customers []model.CrmCustomer
	offset := (page - 1) * pageSize
	err := query.Order("id DESC").Offset(offset).Limit(pageSize).Find(&customers).Error
	return customers, total, err
}

func (s *CustomerService) CreateCustomer(c *model.CrmCustomer, userID uint, username, roleName, ip string) error {
	if c.Name == "" {
		return errors.New("客户企业名称不能为空")
	}
	c.CreatedAt = time.Now()
	c.UpdatedAt = time.Now()
	if c.OwnerID == 0 {
		c.OwnerID = userID
		c.OwnerName = username
	}

	if err := database.DB.Create(c).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "客户管理", "新增客户企业", "POST", "/api/v1/customers", ip, "录入新客户企业: "+c.Name)
	return nil
}

func (s *CustomerService) UpdateCustomer(id uint, req *model.CrmCustomer, userID uint, username, roleName, ip string) error {
	var customer model.CrmCustomer
	if err := database.DB.First(&customer, id).Error; err != nil {
		return errors.New("客户不存在")
	}

	customer.Name = req.Name
	customer.Industry = req.Industry
	customer.Tier = req.Tier
	customer.ContactName = req.ContactName
	customer.ContactPhone = req.ContactPhone
	customer.UpdatedAt = time.Now()

	if err := database.DB.Save(&customer).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "客户管理", "编辑客户资料", "PUT", "/api/v1/customers", ip, "更新客户信息: "+customer.Name)
	return nil
}

func (s *CustomerService) DeleteCustomer(id uint, userID uint, username, roleName, ip string) error {
	var customer model.CrmCustomer
	if err := database.DB.First(&customer, id).Error; err != nil {
		return errors.New("客户不存在")
	}

	if err := database.DB.Delete(&customer).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "客户管理", "删除客户企业", "DELETE", "/api/v1/customers", ip, "删除客户: "+customer.Name)
	return nil
}
