package middleware

import (
	"strings"

	"crm-backend/config"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID   uint   `json:"userId"`
	Username string `json:"username"`
	RoleID   uint   `json:"roleId"`
	RoleCode string `json:"roleCode"`
	jwt.RegisteredClaims
}

func AuthRequired(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"code":    401,
				"message": "未提供身份认证凭据 (Missing Authorization header)",
			})
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"code":    401,
				"message": "认证凭据格式无效 (Format must be Bearer <token>)",
			})
		}

		tokenString := parts[1]
		claims := &JWTClaims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"code":    401,
				"message": "登录会话已过期或令牌无效，请重新登录",
			})
		}

		// Set user context
		c.Locals("userId", claims.UserID)
		c.Locals("username", claims.Username)
		c.Locals("roleId", claims.RoleID)
		c.Locals("roleCode", claims.RoleCode)

		return c.Next()
	}
}
