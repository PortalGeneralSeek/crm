package handler

import (
	"strconv"

	"crm-backend/internal/model"
	"crm-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

type PaymentHandler struct {
	paymentService *service.PaymentService
}

func NewPaymentHandler() *PaymentHandler {
	return &PaymentHandler{
		paymentService: service.NewPaymentService(),
	}
}

func (h *PaymentHandler) ListPayments(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	roleCode, _ := c.Locals("roleCode").(string)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "10"))
	keyword := c.Query("keyword", "")
	status := c.Query("status", "")

	payments, total, err := h.paymentService.ListPayments(page, pageSize, keyword, status, roleCode, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "获取回款列表失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data": fiber.Map{
			"list":     payments,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		},
	})
}

func (h *PaymentHandler) CreatePayment(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	var req model.CrmPayment
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "参数格式错误",
		})
	}

	if err := h.paymentService.CreatePayment(&req, userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "回款登记成功",
		"data":    req,
	})
}

func (h *PaymentHandler) AuditPayment(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的回款 ID",
		})
	}

	if err := h.paymentService.AuditPayment(uint(id), userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "回款已审核确认到账",
	})
}

func (h *PaymentHandler) IssueInvoice(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的回款 ID",
		})
	}

	if err := h.paymentService.IssueInvoice(uint(id), userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "发票已成功开具",
	})
}

func (h *PaymentHandler) ListBankStatements(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "20"))
	keyword := c.Query("keyword", "")
	status := c.Query("status", "")

	list, total, err := h.paymentService.ListBankStatements(page, pageSize, keyword, status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "获取银行流水失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data": fiber.Map{
			"list":     list,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		},
	})
}

func (h *PaymentHandler) AssociateBankStatement(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	var req service.AssociateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "请求参数解析错误: " + err.Error(),
		})
	}

	payment, err := h.paymentService.AssociateBankStatement(&req, userID, username, roleCode, c.IP())
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "银行流水关联订单成功，回款已入账并激活客户对应权益",
		"data":    payment,
	})
}

func (h *PaymentHandler) ListEntitlements(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "20"))
	keyword := c.Query("keyword", "")
	status := c.Query("status", "")

	list, total, err := h.paymentService.ListCustomerEntitlements(page, pageSize, keyword, status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "获取客户权益列表失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data": fiber.Map{
			"list":     list,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		},
	})
}

func (h *PaymentHandler) SwitchEntitlement(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的权益 ID",
		})
	}

	var req service.SwitchEntitlementRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "请求参数解析错误",
		})
	}

	if err := h.paymentService.SwitchEntitlement(uint(id), &req, userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "等价权益切换成功！已等值平移并记录审计履历",
	})
}
