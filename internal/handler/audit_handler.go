package handler

import (
	"strconv"

	"crm-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

type AuditHandler struct {
	auditService *service.AuditService
}

func NewAuditHandler() *AuditHandler {
	return &AuditHandler{
		auditService: service.NewAuditService(),
	}
}

func (h *AuditHandler) ListLogs(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "20"))
	keyword := c.Query("keyword", "")
	module := c.Query("module", "")

	logs, total, err := h.auditService.List(page, pageSize, keyword, module)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "获取审计日志失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data": fiber.Map{
			"list":     logs,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
		},
	})
}
