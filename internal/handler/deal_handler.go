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
	roleID, _ := c.Locals("roleId").(uint)
	roleCode, _ := c.Locals("roleCode").(string)

	perms := h.permService.GetUserPermissions(roleID, roleCode)
	deals, err := h.dealService.ListDeals(perms)
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
			"canViewCostPrice": canViewCost,
			"userRole":         roleCode,
		},
	})
}

func (h *DealHandler) CreateDeal(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)

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

	if err := h.dealService.CreateDeal(&req); err != nil {
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

	if err := h.dealService.AdvanceStage(uint(id), req.Stage); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": fmt.Sprintf("商机阶段已成功推进至 [%s]", req.Stage),
	})
}

func (h *DealHandler) DeleteDeal(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的商机 ID",
		})
	}

	if err := h.dealService.DeleteDeal(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "删除失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "商机删除成功",
	})
}

func (h *DealHandler) ExportDeals(c *fiber.Ctx) error {
	roleID, _ := c.Locals("roleId").(uint)
	roleCode, _ := c.Locals("roleCode").(string)

	perms := h.permService.GetUserPermissions(roleID, roleCode)
	deals, err := h.dealService.ListDeals(perms)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "导出失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": fmt.Sprintf("成功导出 %d 条商机数据快照", len(deals)),
		"data": fiber.Map{
			"count": len(deals),
			"rows":  deals,
		},
	})
}
