package handler

import (
	"crm-backend/internal/service"

	"github.com/gofiber/fiber/v2"
)

type AiHandler struct {
	aiService *service.AiService
}

func NewAiHandler() *AiHandler {
	return &AiHandler{
		aiService: service.NewAiService(),
	}
}

type AiChatRequest struct {
	Prompt string `json:"prompt"`
}

func (h *AiHandler) Chat(c *fiber.Ctx) error {
	userID, _ := c.Locals("userId").(uint)
	username, _ := c.Locals("username").(string)
	roleCode, _ := c.Locals("roleCode").(string)

	var req AiChatRequest
	if err := c.BodyParser(&req); err != nil || req.Prompt == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"code":    400,
			"message": "请提供有效的提问或分析指令",
		})
	}

	resp, err := h.aiService.Chat(req.Prompt, userID, username, roleCode, c.IP())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"code":    500,
			"message": "AI 助理分析处理失败: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"code":    200,
		"message": "ok",
		"data":    resp,
	})
}
