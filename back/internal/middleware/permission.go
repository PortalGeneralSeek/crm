package middleware

import (
	"context"
	"fmt"
	"time"

	"crm-backend/internal/cache"
	"crm-backend/internal/database"

	"github.com/gofiber/fiber/v2"
)

// RequirePermission verifies that the logged-in user possesses the specified action permission code
func RequirePermission(permCode string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		roleCode, _ := c.Locals("roleCode").(string)
		if roleCode == "super_admin" {
			// Super admin has unrestricted access to all endpoints
			return c.Next()
		}

		userID, ok := c.Locals("userId").(uint)
		if !ok || userID == 0 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"code":    401,
				"message": "未登录或无法识别操作主体",
			})
		}

		roleID, _ := c.Locals("roleId").(uint)

		// 1. Try Redis cache
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		perms, err := cache.Rdb.GetUserPermissions(ctx, userID)
		if err != nil || len(perms) == 0 {
			// Cache miss: query database
			var dbPerms []string
			database.DB.Table("sys_menus").
				Select("sys_menus.permission_code").
				Joins("JOIN sys_role_permissions ON sys_role_permissions.menu_id = sys_menus.id").
				Where("sys_role_permissions.role_id = ? AND sys_menus.status = 1", roleID).
				Pluck("sys_menus.permission_code", &dbPerms)

			perms = dbPerms
			_ = cache.Rdb.SetUserPermissions(ctx, userID, perms)
		}

		// 2. Check if required permission code exists
		hasPerm := false
		for _, p := range perms {
			if p == permCode || p == "*" {
				hasPerm = true
				break
			}
		}

		if !hasPerm {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"code":    403,
				"message": fmt.Sprintf("权限不足：当前角色无权执行此操作，缺少动作权限标识 [%s]", permCode),
				"data": fiber.Map{
					"requiredPermission": permCode,
					"userRole":           roleCode,
				},
			})
		}

		return c.Next()
	}
}
