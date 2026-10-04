package handler

import (
	"fmt"
	"strconv"

	"crm-backend/internal/model"
	"crm-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

type LeadHandler struct {
	leadService *service.LeadService
}

func NewLeadHandler() *LeadHandler {
	return &LeadHandler{leadService: service.NewLeadService()}
}

func (h *LeadHandler) ListLeads(c *fiber.Ctx) error {
	leads, err := h.leadService.ListLeads()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "获取线索列表失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    leads,
	})
}

func (h *LeadHandler) CreateLead(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)

	var req model.CrmLead
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "参数格式错误",
		})
	}

	req.OwnerID = userID
	if req.OwnerName == "" {
		req.OwnerName = username
	}

	if err := h.leadService.CreateLead(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "线索创建成功",
		"data":    req,
	})
}

type ConvertLeadRequest struct {
	DealName string  `json:"dealName"`
	Amount   float64 `json:"amount"`
}

func (h *LeadHandler) ConvertLead(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的线索 ID",
		})
	}

	userID, _ := c.Locals("userId").(uint)

	var req ConvertLeadRequest
	_ = c.BodyParser(&req)

	deal, err := h.leadService.ConvertLeadToDeal(uint(id), req.DealName, req.Amount, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": fmt.Sprintf("线索已成功转化为商机合同: %s", deal.Name),
		"data":    deal,
	})
}

func (h *LeadHandler) ExportLeads(c *fiber.Ctx) error {
	leads, err := h.leadService.ListLeads()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "导出失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": fmt.Sprintf("成功导出 %d 条线索记录", len(leads)),
		"data": fiber.Map{
			"count": len(leads),
			"rows":  leads,
		},
	})
}
