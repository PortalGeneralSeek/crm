package service

import (
	"errors"
	"fmt"
	"math/rand"
	"time"

	"crm-backend/internal/database"
	"crm-backend/internal/model"
)

type ProductDTO struct {
	ID          uint      `json:"id"`
	ProductCode string    `json:"productCode"`
	Name        string    `json:"name"`
	Category    string    `json:"category"`
	Price       float64   `json:"price"`
	CostPrice   *float64  `json:"costPrice,omitempty"`
	CostDisplay string    `json:"costDisplay"`
	Unit        string    `json:"unit"`
	Stock       int       `json:"stock"`
	Status      int       `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
}

type ProductService struct {
	audit *AuditService
}

func NewProductService() *ProductService {
	return &ProductService{
		audit: NewAuditService(),
	}
}

func (s *ProductService) ListProducts(page, pageSize int, keyword, category string, canViewCost bool) ([]ProductDTO, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	query := database.DB.Model(&model.CrmProduct{})

	if keyword != "" {
		query = query.Where("product_code LIKE ? OR name LIKE ? OR category LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var products []model.CrmProduct
	offset := (page - 1) * pageSize
	err := query.Order("id ASC").Offset(offset).Limit(pageSize).Find(&products).Error
	if err != nil {
		return nil, 0, err
	}

	dtos := make([]ProductDTO, len(products))
	for i, p := range products {
		dto := ProductDTO{
			ID:          p.ID,
			ProductCode: p.ProductCode,
			Name:        p.Name,
			Category:    p.Category,
			Price:       p.Price,
			Unit:        p.Unit,
			Stock:       p.Stock,
			Status:      p.Status,
			CreatedAt:   p.CreatedAt,
		}
		if canViewCost {
			cost := p.CostPrice
			dto.CostPrice = &cost
			dto.CostDisplay = fmt.Sprintf("¥%.2f", p.CostPrice)
		} else {
			dto.CostDisplay = "*** (需总监/财务权限)"
		}
		dtos[i] = dto
	}

	return dtos, total, nil
}

func (s *ProductService) CreateProduct(p *model.CrmProduct, userID uint, username, roleName, ip string) error {
	if p.Name == "" || p.Price <= 0 {
		return errors.New("产品名称与标准售价为必填项")
	}
	if p.ProductCode == "" {
		p.ProductCode = fmt.Sprintf("PRD-%s-%04d", time.Now().Format("20060102"), rand.Intn(9000)+1000)
	}
	p.CreatedAt = time.Now()
	p.UpdatedAt = time.Now()
	if p.Status == 0 {
		p.Status = 1
	}

	if err := database.DB.Create(p).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "产品库", "上架新产品", "POST", "/api/v1/products", ip, fmt.Sprintf("新增产品 [%s] %s, 售价 ¥%.2f", p.ProductCode, p.Name, p.Price))
	return nil
}

func (s *ProductService) UpdateProduct(id uint, req *model.CrmProduct, userID uint, username, roleName, ip string) error {
	var product model.CrmProduct
	if err := database.DB.First(&product, id).Error; err != nil {
		return errors.New("产品不存在")
	}

	product.Name = req.Name
	product.Category = req.Category
	product.Price = req.Price
	if req.CostPrice > 0 {
		product.CostPrice = req.CostPrice
	}
	product.Unit = req.Unit
	product.Stock = req.Stock
	product.Status = req.Status
	product.UpdatedAt = time.Now()

	if err := database.DB.Save(&product).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "产品库", "维护产品/价格调整", "PUT", "/api/v1/products", ip, fmt.Sprintf("调整产品 [%s] %s, 最新售价 ¥%.2f", product.ProductCode, product.Name, product.Price))
	return nil
}

func (s *ProductService) DeleteProduct(id uint, userID uint, username, roleName, ip string) error {
	var product model.CrmProduct
	if err := database.DB.First(&product, id).Error; err != nil {
		return errors.New("产品不存在")
	}

	if err := database.DB.Delete(&product).Error; err != nil {
		return err
	}

	s.audit.Record(userID, username, roleName, "产品库", "下架删除产品", "DELETE", "/api/v1/products", ip, "下架产品: "+product.Name)
	return nil
}
