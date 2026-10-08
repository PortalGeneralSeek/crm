package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"crm-backend/config"
	"crm-backend/internal/cache"
	"crm-backend/internal/database"
	"crm-backend/internal/handler"
	"crm-backend/internal/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	log.Println("[CRM Server] Starting Acme CRM GoFiber Backend Service...")

	// 1. Load Config
	cfg := config.LoadConfig()

	// 2. Initialize Database Connection Pool
	db, err := database.InitMySQL(cfg)
	if err != nil {
		log.Fatalf("[Database Fatal] %v", err)
	}

	// 3. Seed initial RBAC & business data
	if err := database.SeedData(db); err != nil {
		log.Printf("[Database Warning] Seed execution: %v", err)
	}

	// 4. Initialize Redis Connection Pool
	_, err = cache.InitRedis(cfg)
	if err != nil {
		log.Printf("[Redis Warning] %v", err)
	}

	// 5. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName:      "Acme CRM Enterprise GoFiber API v2.0",
		ServerHeader: "GoFiber/AcmeCRM",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"code":    code,
				"message": err.Error(),
			})
		},
	})

	// Middlewares
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} | ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: false,
	}))

	// 6. Register Handlers
	authH := handler.NewAuthHandler(cfg)
	dealH := handler.NewDealHandler()
	leadH := handler.NewLeadHandler()
	roleH := handler.NewRoleHandler()
	userH := handler.NewUserHandler()
	customerH := handler.NewCustomerHandler()
	contractH := handler.NewContractHandler()
	paymentH := handler.NewPaymentHandler()
	productH := handler.NewProductHandler()
	auditH := handler.NewAuditHandler()
	aiH := handler.NewAiHandler()

	// 7. Route Groups
	api := app.Group("/api/v1")

	// Public Routes
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":   "UP",
			"engine":   "GoFiber",
			"database": "MySQL 8.0 (Connection Pool Active)",
			"cache":    "Redis 7.0 (Pool Active)",
		})
	})
	api.Post("/auth/login", authH.Login)

	// Protected Routes (JWT Required)
	protected := api.Group("/", middleware.AuthRequired(cfg))

	// Auth & Dynamic Menus & Profile
	protected.Get("/auth/me", authH.GetCurrentUser)
	protected.Get("/auth/menus", authH.GetDynamicMenus)
	protected.Post("/auth/switch-role", authH.SwitchRole)
	protected.Put("/auth/profile", authH.UpdateProfile)
	protected.Post("/auth/change-password", authH.ChangePassword)

	// Deals (with Sensitive Price Masking & Button Permissions)
	protected.Get("/deals", dealH.ListDeals)
	protected.Post("/deals", middleware.RequirePermission("btn:deal:add"), dealH.CreateDeal)
	protected.Put("/deals/:id/stage", middleware.RequirePermission("btn:deal:advance_stage"), dealH.AdvanceStage)
	protected.Delete("/deals/:id", middleware.RequirePermission("btn:deal:delete"), dealH.DeleteDeal)
	protected.Get("/deals/export", middleware.RequirePermission("btn:deal:export"), dealH.ExportDeals)

	// Leads (with Lead Conversion Button Permissions)
	protected.Get("/leads", leadH.ListLeads)
	protected.Post("/leads", middleware.RequirePermission("btn:lead:add"), leadH.CreateLead)
	protected.Post("/leads/:id/convert", middleware.RequirePermission("btn:lead:convert"), leadH.ConvertLead)
	protected.Get("/leads/export", middleware.RequirePermission("btn:lead:export"), leadH.ExportLeads)

	// Customers (with Data Scope & Button Permissions)
	protected.Get("/customers", customerH.ListCustomers)
	protected.Post("/customers", middleware.RequirePermission("btn:customer:add"), customerH.CreateCustomer)
	protected.Put("/customers/:id", middleware.RequirePermission("btn:customer:edit"), customerH.UpdateCustomer)
	protected.Delete("/customers/:id", middleware.RequirePermission("btn:customer:delete"), customerH.DeleteCustomer)

	// Contracts (with Approval & Data Scope)
	protected.Get("/contracts", contractH.ListContracts)
	protected.Post("/contracts", middleware.RequirePermission("btn:contract:add"), contractH.CreateContract)
	protected.Put("/contracts/:id/approve", middleware.RequirePermission("btn:contract:approve"), contractH.ApproveContract)
	protected.Put("/contracts/:id", middleware.RequirePermission("btn:contract:edit"), contractH.UpdateContract)
	protected.Delete("/contracts/:id", middleware.RequirePermission("btn:contract:delete"), contractH.DeleteContract)

	// Payments (with Finance Audit & Invoice Issue)
	protected.Get("/payments", paymentH.ListPayments)
	protected.Post("/payments", middleware.RequirePermission("btn:payment:add"), paymentH.CreatePayment)
	protected.Put("/payments/:id/audit", middleware.RequirePermission("btn:payment:audit"), paymentH.AuditPayment)
	protected.Put("/payments/:id/invoice", middleware.RequirePermission("btn:payment:invoice"), paymentH.IssueInvoice)

	// Products (with Cost Price Masking & Adjust Permissions)
	protected.Get("/products", productH.ListProducts)
	protected.Post("/products", middleware.RequirePermission("btn:product:add"), productH.CreateProduct)
	protected.Put("/products/:id", middleware.RequirePermission("btn:product:price_adjust"), productH.UpdateProduct)
	protected.Delete("/products/:id", middleware.RequirePermission("btn:product:delete"), productH.DeleteProduct)

	// Roles & Permissions Matrix
	protected.Get("/roles", roleH.ListRoles)
	protected.Post("/roles", middleware.RequirePermission("btn:role:add"), roleH.CreateRole)
	protected.Put("/roles/:id", middleware.RequirePermission("btn:role:edit"), roleH.UpdateRole)
	protected.Delete("/roles/:id", middleware.RequirePermission("btn:role:delete"), roleH.DeleteRole)
	protected.Get("/roles/:id/permissions", roleH.GetRolePermissions)
	protected.Put("/roles/:id/permissions", middleware.RequirePermission("btn:role:edit"), roleH.UpdateRolePermissions)
	protected.Get("/permissions/tree", roleH.GetPermissionsTree)

	// User Management (Admin can add users & assign permissions)
	protected.Get("/users", middleware.RequirePermission("btn:user:list"), userH.ListUsers)
	protected.Post("/users", middleware.RequirePermission("btn:user:add"), userH.CreateUser)
	protected.Put("/users/:id", middleware.RequirePermission("btn:user:edit"), userH.UpdateUser)
	protected.Put("/users/:id/status", middleware.RequirePermission("btn:user:status"), userH.UpdateUserStatus)
	protected.Post("/users/:id/reset-password", middleware.RequirePermission("btn:user:reset_pwd"), userH.ResetPassword)
	protected.Delete("/users/:id", middleware.RequirePermission("btn:user:delete"), userH.DeleteUser)

	// Audit Logs & AI Copilot
	protected.Get("/audit/logs", auditH.ListLogs)
	protected.Post("/ai/chat", aiH.Chat)

	// 8. Start Server with Graceful Shutdown
	go func() {
		log.Printf("[CRM Server] Listening on http://0.0.0.0%s", cfg.ServerPort)
		if err := app.Listen(cfg.ServerPort); err != nil {
			log.Printf("[CRM Server] Server stopped: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("[CRM Server] Shutting down gracefully...")
	_ = app.Shutdown()
	log.Println("[CRM Server] Service successfully stopped.")
}
