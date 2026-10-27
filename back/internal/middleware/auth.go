package middleware

import (
	"crypto/sha256"
	"fmt"
	"strings"

	"crm-backend/config"
	"crm-backend/internal/cache"
	"crm-backend/internal/database"
	"crm-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID   uint   `json:"userId"`
	Username string `json:"username"`
	RoleID   uint   `json:"roleId"`
	RoleCode string `json:"roleCode"`
	Branch   string `json:"branch"`
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

		// 1. Parse and verify signing method (prevent algorithm confusion attacks like 'none' or RSA-HMAC)
		token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return []byte(cfg.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"code":    401,
				"message": "登录会话已过期或令牌无效，请重新登录",
			})
		}

		// 2. Token Blacklist Check (Instant token revocation on logout or admin intervention)
		tokenHash := fmt.Sprintf("%x", sha256.Sum256([]byte(tokenString)))
		if cache.Rdb.IsTokenBlacklisted(c.Context(), tokenHash) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"code":    401,
				"message": "登录凭证已被安全注销或主动吊销，请重新登录",
			})
		}

		// 3. User Status Check (Instant block if account has been disabled by administrator)
		var userStatus int
		if err := database.DB.Model(&model.SysUser{}).Where("id = ?", claims.UserID).Pluck("status", &userStatus).Error; err == nil {
			if userStatus == 0 {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
					"code":    403,
					"message": "您的账户已被系统管理员冻结或停用，无法继续访问系统",
				})
			}
		}

		// Set user context
		c.Locals("userId", claims.UserID)
		c.Locals("username", claims.Username)
		c.Locals("roleId", claims.RoleID)
		c.Locals("roleCode", claims.RoleCode)
		c.Locals("branch", claims.Branch)

		return c.Next()
	}
}

