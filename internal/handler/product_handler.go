package handler

import (
	"strconv"

	"crm-backend/internal/model"
	"crm-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

type ProductHandler struct {
	productService *service.ProductService
	permService    *service.PermissionService
}

func NewProductHandler() *ProductHandler {
	return &ProductHandler{
		productService: service.NewProductService(),
		permService:    service.NewPermissionService(),
	}
}

func (h *ProductHandler) ListProducts(c *fiber.Ctx) error {
	roleID, _ := c.Locals("roleId").(uint)
	roleCode, _ := c.Locals("roleCode").(string)

	perms := h.permService.GetUserPermissions(roleID, roleCode)
	canViewCost := service.HasFieldPermission(perms, "field:deal:cost_price") || roleCode == "super_admin" || roleCode == "finance_auditor"

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "10"))
	keyword := c.Query("keyword", "")
	category := c.Query("category", "")

	products, total, err := h.productService.ListProducts(page, pageSize, keyword, category, canViewCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "获取产品列表失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data": fiber.Map{
			"list":        products,
			"total":       total,
			"page":        page,
			"pageSize":    pageSize,
			"canViewCost": canViewCost,
		},
	})
}

func (h *ProductHandler) CreateProduct(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	var req model.CrmProduct
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "参数格式错误",
		})
	}

	if err := h.productService.CreateProduct(&req, userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "产品上架成功",
		"data":    req,
	})
}

func (h *ProductHandler) UpdateProduct(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的产品 ID",
		})
	}

	var req model.CrmProduct
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "参数格式错误",
		})
	}

	if err := h.productService.UpdateProduct(uint(id), &req, userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "产品资料与报价已更新",
	})
}

func (h *ProductHandler) DeleteProduct(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的产品 ID",
		})
	}

	if err := h.productService.DeleteProduct(uint(id), userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "产品已下架移除",
	})
}
