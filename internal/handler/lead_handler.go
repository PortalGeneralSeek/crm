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
	userID, _ := c.Locals("userId").(uint)
	roleCode, _ := c.Locals("roleCode").(string)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "50"))
	keyword := c.Query("keyword", "")
	status := c.Query("status", "")

	leads, total, err := h.leadService.ListLeads(page, pageSize, keyword, status, roleCode, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "获取线索列表失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data": fiber.Map{
			"list":     leads,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		},
	})
}

func (h *LeadHandler) CreateLead(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

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

	if err := h.leadService.CreateLead(&req, userID, username, roleCode, c.IP()); err != nil {
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
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	var req ConvertLeadRequest
	_ = c.BodyParser(&req)

	deal, err := h.leadService.ConvertLeadToDeal(uint(id), req.DealName, req.Amount, userID, username, roleCode, c.IP())
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
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	audit := service.NewAuditService()
	audit.Record(userID, username, roleCode, "线索管理", "导出线索列表", "GET", "/api/v1/leads/export", c.IP(), "全量导出潜在客户线索数据")

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "线索导出任务已生成",
		"data": fiber.Map{
			"exportedBy": username,
			"exportUrl":  "/exports/leads_2026.csv",
		},
	})
}
