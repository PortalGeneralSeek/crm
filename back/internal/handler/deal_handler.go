package handler

import (
	"fmt"
	"strconv"

	"crm-backend/internal/model"
	"crm-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

type DealHandler struct {
	dealService *service.DealService
	permService *service.PermissionService
}

func NewDealHandler() *DealHandler {
	return &DealHandler{
		dealService: service.NewDealService(),
		permService: service.NewPermissionService(),
	}
}

func (h *DealHandler) ListDeals(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	roleID, _ := c.Locals("roleId").(uint)
	roleCode, _ := c.Locals("roleCode").(string)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "50"))
	keyword := c.Query("keyword", "")
	stage := c.Query("stage", "")

	perms := h.permService.GetUserPermissions(roleID, roleCode)
	deals, total, err := h.dealService.ListDeals(perms, page, pageSize, keyword, stage, roleCode, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "获取商机列表失败: " + err.Error(),
		})
	}

	canViewCost := service.HasFieldPermission(perms, "field:deal:cost_price")

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data": fiber.Map{
			"deals":            deals,
			"list":             deals,
			"total":            total,
			"page":             page,
			"pageSize":         pageSize,
			"canViewCostPrice": canViewCost,
			"userRole":         roleCode,
		},
	})
}

func (h *DealHandler) CreateDeal(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	var req model.CrmDeal
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

	if err := h.dealService.CreateDeal(&req, userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "商机创建成功",
		"data":    req,
	})
}

type AdvanceStageRequest struct {
	Stage string `json:"stage"`
}

func (h *DealHandler) AdvanceStage(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的商机 ID",
		})
	}

	var req AdvanceStageRequest
	if err := c.BodyParser(&req); err != nil || req.Stage == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "推进目标阶段参数 (stage) 不能为空",
		})
	}

	if err := h.dealService.AdvanceStage(uint(id), req.Stage, userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": fmt.Sprintf("商机已推进至【%s】", req.Stage),
	})
}

func (h *DealHandler) DeleteDeal(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的商机 ID",
		})
	}

	if err := h.dealService.DeleteDeal(uint(id), userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "商机已成功移除",
	})
}

func (h *DealHandler) ExportDeals(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	audit := service.NewAuditService()
	audit.Record(userID, username, roleCode, "商机管理", "批量导出商机", "GET", "/api/v1/deals/export", c.IP(), "全量导出商机台账数据")

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "商机导出任务已提交生成，请稍后下载 CSV 文件",
		"data": fiber.Map{
			"exportedBy": username,
			"exportUrl":  "/exports/deals_2026.csv",
		},
	})
}
