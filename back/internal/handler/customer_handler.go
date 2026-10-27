package handler

import (
	"strconv"

	"crm-backend/internal/database"
	"crm-backend/internal/model"
	"crm-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

type CustomerHandler struct {
	customerService *service.CustomerService
}

func NewCustomerHandler() *CustomerHandler {
	return &CustomerHandler{
		customerService: service.NewCustomerService(),
	}
}

func (h *CustomerHandler) ListCustomers(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	roleCode, _ := c.Locals("roleCode").(string)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "10"))
	keyword := c.Query("keyword", "")
	tier := c.Query("tier", "")
	poolType := c.Query("poolType", "private")
	branch := c.Query("branch", "")

	customers, total, err := h.customerService.ListCustomers(page, pageSize, keyword, tier, poolType, branch, roleCode, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "获取客户列表失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data": fiber.Map{
			"list":     customers,
			"total":    total,
			"page":     page,
			"pageSize": pageSize,
			"poolType": poolType,
		},
	})
}

func (h *CustomerHandler) GetCustomer(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	roleCode, _ := c.Locals("roleCode").(string)

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的客户 ID",
		})
	}

	customer, err := h.customerService.GetCustomer(uint(id), roleCode, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"code":    404,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    customer,
	})
}

func (h *CustomerHandler) CreateCustomer(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	var req model.CrmCustomer
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "参数格式错误",
		})
	}

	if err := h.customerService.CreateCustomer(&req, userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "客户企业创建成功",
		"data":    req,
	})
}

func (h *CustomerHandler) UpdateCustomer(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的客户 ID",
		})
	}

	var req model.CrmCustomer
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "参数格式错误",
		})
	}

	if err := h.customerService.UpdateCustomer(uint(id), &req, userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "客户资料更新成功",
	})
}

func (h *CustomerHandler) DeleteCustomer(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的客户 ID",
		})
	}

	if err := h.customerService.DeleteCustomer(uint(id), userID, username, roleCode, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "客户企业已成功移除",
	})
}

type ReclaimRequest struct {
	Reason string `json:"reason"`
}

// ReclaimCustomer reclaims customer into branch public sea
func (h *CustomerHandler) ReclaimCustomer(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)
	userBranch, _ := c.Locals("branch").(string)

	if userBranch == "" && userID > 0 {
		var u model.SysUser
		if err := database.DB.Select("branch").First(&u, userID).Error; err == nil {
			userBranch = u.Branch
		}
	}

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的客户 ID",
		})
	}

	var req ReclaimRequest
	_ = c.BodyParser(&req)

	if err := h.customerService.ReclaimCustomer(uint(id), req.Reason, userID, username, roleCode, userBranch, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "客户已成功回收至分公司公海池",
	})
}

type AssignRequest struct {
	TargetUserID uint   `json:"targetUserId"`
	Note         string `json:"note"`
}

// AssignCustomer assigns customer to a designated user
func (h *CustomerHandler) AssignCustomer(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)
	userBranch, _ := c.Locals("branch").(string)

	if userBranch == "" && userID > 0 {
		var u model.SysUser
		if err := database.DB.Select("branch").First(&u, userID).Error; err == nil {
			userBranch = u.Branch
		}
	}

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的客户 ID",
		})
	}

	var req AssignRequest
	if err := c.BodyParser(&req); err != nil || req.TargetUserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "请指定有效的目标负责人",
		})
	}

	if err := h.customerService.AssignCustomer(uint(id), req.TargetUserID, req.Note, userID, username, roleCode, userBranch, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "客户已成功分配给指定人员",
	})
}

// ClaimCustomer claims customer from public sea
func (h *CustomerHandler) ClaimCustomer(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)
	userBranch, _ := c.Locals("branch").(string)

	if userBranch == "" && userID > 0 {
		var u model.SysUser
		if err := database.DB.Select("branch").First(&u, userID).Error; err == nil {
			userBranch = u.Branch
		}
	}

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "无效的客户 ID",
		})
	}

	if err := h.customerService.ClaimCustomer(uint(id), userID, username, roleCode, userBranch, c.IP()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "客户已成功认领至您的私海",
	})
}
