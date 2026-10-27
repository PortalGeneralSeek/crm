package service

import (
	"errors"
	"fmt"
	"strconv"
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

func (s *CustomerService) ListCustomers(page, pageSize int, keyword, tier, poolType, branch, roleCode string, userID uint) ([]model.CrmCustomer, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	query := database.DB.Model(&model.CrmCustomer{})

	// Pool Type Filter
	if poolType == "branch_public" || poolType == "public" {
		query = query.Where("is_public_sea = ?", true)
	} else {
		query = query.Where("is_public_sea = ?", false)
		// Data Scope: sales_rep only views own customers in private pool
		if roleCode == "sales_rep" && userID > 0 {
			query = query.Where("owner_id = ?", userID)
		}
	}

	// Branch Filter
	if branch != "" && branch != "全部" && branch != "全部分公司" {
		query = query.Where("branch = ?", branch)
	}

	if keyword != "" {
		query = query.Where("name LIKE ? OR contact_name LIKE ? OR contact_phone LIKE ? OR owner_name LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
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
	if c.Branch == "" {
		c.Branch = "华东分公司"
	}
	if c.OwnerID == 0 {
		c.OwnerID = userID
		c.OwnerName = username
	}
	c.PoolType = "private"
	c.IsPublicSea = false

	if err := database.DB.Create(c).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "客户管理", "新增客户企业", "POST", "/api/v1/customers", ip, "录入新客户企业: "+c.Name+" (所属分公司: "+c.Branch+")")
	return nil
}

func (s *CustomerService) GetCustomer(id uint, roleCode string, userID uint) (*model.CrmCustomer, error) {
	var customer model.CrmCustomer
	if err := database.DB.First(&customer, id).Error; err != nil {
		return nil, errors.New("客户不存在")
	}
	return &customer, nil
}

func (s *CustomerService) UpdateCustomer(id uint, req *model.CrmCustomer, userID uint, username, roleName, ip string) error {
	var customer model.CrmCustomer
	if err := database.DB.First(&customer, id).Error; err != nil {
		return errors.New("客户不存在")
	}

	// IDOR Protection: Sales reps can only update customers they own
	if roleName == "sales_rep" && customer.OwnerID > 0 && customer.OwnerID != userID {
		return errors.New("权限不足：无权修改非本人负责的客户资料")
	}

	customer.Name = req.Name
	customer.Industry = req.Industry
	customer.Tier = req.Tier
	customer.ContactName = req.ContactName
	customer.ContactPhone = req.ContactPhone
	customer.ContactEmail = req.ContactEmail
	if req.Contacts != "" {
		customer.Contacts = req.Contacts
	}
	if req.Branch != "" {
		customer.Branch = req.Branch
	}
	if req.LegalPerson != "" {
		customer.LegalPerson = req.LegalPerson
	}
	if req.RegistCapital != "" {
		customer.RegistCapital = req.RegistCapital
	}
	if req.RegistStatus != "" {
		customer.RegistStatus = req.RegistStatus
	}
	if req.EstablishDate != "" {
		customer.EstablishDate = req.EstablishDate
	}
	if req.ApprovalDate != "" {
		customer.ApprovalDate = req.ApprovalDate
	}
	if req.Province != "" {
		customer.Province = req.Province
	}
	if req.City != "" {
		customer.City = req.City
	}
	if req.District != "" {
		customer.District = req.District
	}
	if req.EnterpriseAddress != "" {
		customer.EnterpriseAddress = req.EnterpriseAddress
	}
	if req.ReportSite != "" {
		customer.ReportSite = req.ReportSite
	}
	if req.Website != "" {
		customer.Website = req.Website
	}
	if req.SocialCode != "" {
		customer.SocialCode = req.SocialCode
	}
	if req.TaxpayerCode != "" {
		customer.TaxpayerCode = req.TaxpayerCode
	}
	if req.RegistCode != "" {
		customer.RegistCode = req.RegistCode
	}
	if req.OrgCode != "" {
		customer.OrgCode = req.OrgCode
	}
	if req.InsuredTotal != "" {
		customer.InsuredTotal = req.InsuredTotal
	}
	if req.EnterpriseType != "" {
		customer.EnterpriseType = req.EnterpriseType
	}
	if req.EnglishName != "" {
		customer.EnglishName = req.EnglishName
	}
	if req.OldName != "" {
		customer.OldName = req.OldName
	}
	if req.Business != "" {
		customer.Business = req.Business
	}
	if req.SysTag != "" {
		customer.SysTag = req.SysTag
	}
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

	// IDOR Protection: Sales reps can only delete/release customers they own
	if roleName == "sales_rep" && customer.OwnerID > 0 && customer.OwnerID != userID {
		return errors.New("权限不足：无权释放或删除非本人负责的客户")
	}

	if err := database.DB.Delete(&customer).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "客户管理", "删除客户企业", "DELETE", "/api/v1/customers", ip, "删除客户: "+customer.Name)
	return nil
}

// ReclaimCustomer reclaims a customer to the branch open pool (公海池)
func (s *CustomerService) ReclaimCustomer(id uint, reason string, userID uint, username, roleName, userBranch, ip string) error {
	var customer model.CrmCustomer
	if err := database.DB.First(&customer, id).Error; err != nil {
		return errors.New("目标客户不存在")
	}

	if customer.IsPublicSea {
		return errors.New("该客户已在公海池中，无需重复回收")
	}

	// Branch Isolation: Branch managers can only reclaim customers within their own branch
	if roleName != "super_admin" && userBranch != "" && customer.Branch != userBranch {
		return fmt.Errorf("权限不足：分公司管理者仅允许回收本分公司的客户（目标客户归属: %s，您当前归属: %s）", customer.Branch, userBranch)
	}

	if reason == "" {
		reason = "分公司管理者手动回收重新分配"
	}

	now := time.Now()
	customer.PrevOwnerID = customer.OwnerID
	customer.PrevOwnerName = customer.OwnerName
	customer.OwnerID = 0
	customer.OwnerName = "分公司公海池"
	customer.IsPublicSea = true
	customer.PoolType = "branch_public"
	customer.ReclaimReason = reason
	customer.ReclaimedAt = &now
	customer.UpdatedAt = now

	if err := database.DB.Save(&customer).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "客户管理", "回收客户至公海", "PUT", "/api/v1/customers/"+strconv.Itoa(int(id))+"/reclaim", ip,
		"将客户【"+customer.Name+"】（原负责人: "+customer.PrevOwnerName+"）回收至【"+customer.Branch+"】公海池，原因: "+reason)
	return nil
}

// AssignCustomer assigns a customer to a designated user
func (s *CustomerService) AssignCustomer(id uint, targetUserID uint, note string, userID uint, username, roleName, userBranch, ip string) error {
	var customer model.CrmCustomer
	if err := database.DB.First(&customer, id).Error; err != nil {
		return errors.New("目标客户不存在")
	}

	// Branch Isolation: Verify customer branch
	if roleName != "super_admin" && userBranch != "" && customer.Branch != userBranch {
		return fmt.Errorf("权限不足：分公司管理者仅允许分配本分公司的客户（目标客户归属: %s，您当前归属: %s）", customer.Branch, userBranch)
	}

	var targetUser model.SysUser
	if err := database.DB.First(&targetUser, targetUserID).Error; err != nil {
		return errors.New("指定的负责人用户不存在")
	}

	if targetUser.Status == 0 {
		return errors.New("指定的成员账号已被停用，无法接收客户分配")
	}

	// Branch Isolation: Verify target user belongs to the same branch
	if roleName != "super_admin" && userBranch != "" && targetUser.Branch != userBranch {
		return fmt.Errorf("权限不足：分公司管理者仅允许将客户分配给本分公司成员（被分配人归属: %s，您当前归属: %s）", targetUser.Branch, userBranch)
	}

	now := time.Now()
	prevName := customer.OwnerName
	if customer.IsPublicSea {
		prevName = "公海池"
	}

	customer.IsPublicSea = false
	customer.PoolType = "private"
	customer.OwnerID = targetUser.ID
	customer.OwnerName = targetUser.RealName
	customer.AssignedAt = &now
	customer.UpdatedAt = now

	if err := database.DB.Save(&customer).Error; err != nil {
		return err
	}

	detailMsg := "将客户【" + customer.Name + "】（原归属: " + prevName + "）正式分配给成员【" + targetUser.RealName + "】"
	if note != "" {
		detailMsg += "，跟进指示: " + note
	}

	s.audit.Record(userID, username, roleName, "客户管理", "分配客户负责人", "PUT", "/api/v1/customers/"+strconv.Itoa(int(id))+"/assign", ip, detailMsg)
	return nil
}

// ClaimCustomer allows a sales rep to pick up a customer from public sea with concurrency protection
func (s *CustomerService) ClaimCustomer(id uint, userID uint, username, roleName, userBranch, ip string) error {
	var customer model.CrmCustomer
	if err := database.DB.First(&customer, id).Error; err != nil {
		return errors.New("目标客户不存在")
	}

	// Branch Isolation: Sales reps can only claim customers in their own branch's public sea
	if roleName != "super_admin" && userBranch != "" && customer.Branch != userBranch {
		return fmt.Errorf("权限不足：仅允许认领归属本分公司的公海客户（客户归属: %s，您当前归属: %s）", customer.Branch, userBranch)
	}

	var user model.SysUser
	database.DB.First(&user, userID)
	realName := user.RealName
	if realName == "" {
		realName = username
	}

	now := time.Now()
	// Optimistic locking / Atomic conditional update: eliminate race conditions and ghost overclaims
	res := database.DB.Model(&model.CrmCustomer{}).
		Where("id = ? AND is_public_sea = ?", id, true).
		Updates(map[string]interface{}{
			"is_public_sea": false,
			"pool_type":     "private",
			"owner_id":      userID,
			"owner_name":    realName,
			"assigned_at":   &now,
			"updated_at":    now,
		})

	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.New("认领失败：该客户手慢一步，已被其他同事认领或已移出公海池")
	}

	s.audit.Record(userID, username, roleName, "客户管理", "公海认领客户", "PUT", "/api/v1/customers/"+strconv.Itoa(int(id))+"/claim", ip,
		"从【"+customer.Branch+"】公海池中认领客户【"+customer.Name+"】进入个人私海")
	return nil
}
