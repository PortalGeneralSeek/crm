package database

import (
	"log"
	"time"

	"crm-backend/internal/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedData(db *gorm.DB) error {
	defer seedBusinessTables(db)

	var count int64
	db.Model(&model.SysRole{}).Count(&count)
	if count > 0 {
		log.Println("[Database] Seed data already exists, checking business tables...")
		return nil
	}

	log.Println("[Database] Initializing RBAC seed data, menus, button permissions and sensitive price rules...")

	// 1. Roles
	roles := []model.SysRole{
		{ID: 1, Name: "超级管理员", Code: "super_admin", Description: "全系统最高权限，具备所有菜单、所有按钮及敏感底价查看与修改权限", Status: 1},
		{ID: 2, Name: "销售总监", Code: "sales_director", Description: "负责销售团队业务管理，具备全业务流审批、导出及敏感底价/毛利率查看权限", Status: 1},
		{ID: 3, Name: "客户经理 (普通销售)", Code: "sales_rep", Description: "一线销售人员，仅限核心商机与线索操作，严禁查看敏感底价与导出数据", Status: 1},
		{ID: 4, Name: "财务合规审计员", Code: "finance_auditor", Description: "财务与审计专员，负责应收回款、底价成本审计与报表导出", Status: 1},
	}
	for _, r := range roles {
		db.FirstOrCreate(&r, model.SysRole{ID: r.ID})
	}

	// 2. Menus & Buttons & Field Permissions
	menus := []model.SysMenu{
		// Type "M": Sidebar Menus
		{ID: 1, ParentID: 0, Title: "核心仪表盘", Name: "Dashboard", Path: "/dashboard", Icon: "layout-dashboard", Component: "Dashboard", Sort: 1, Type: "M", PermissionCode: "menu:dashboard"},
		{ID: 2, ParentID: 0, Title: "线索转化管理", Name: "Leads", Path: "/leads", Icon: "filter", Component: "Leads", Sort: 2, Type: "M", PermissionCode: "menu:leads"},
		{ID: 3, ParentID: 0, Title: "客户 360° 视图", Name: "Customers", Path: "/customers", Icon: "users", Component: "Customers", Sort: 3, Type: "M", PermissionCode: "menu:customers"},
		{ID: 4, ParentID: 0, Title: "商机推进看板", Name: "Deals", Path: "/deals", Icon: "git-commit", Component: "Deals", Sort: 4, Type: "M", PermissionCode: "menu:deals"},
		{ID: 5, ParentID: 0, Title: "合同履约中心", Name: "Contracts", Path: "/contracts", Icon: "file-check", Component: "Contracts", Sort: 5, Type: "M", PermissionCode: "menu:contracts"},
		{ID: 6, ParentID: 0, Title: "回款财务结算", Name: "Payments", Path: "/payments", Icon: "credit-card", Component: "Payments", Sort: 6, Type: "M", PermissionCode: "menu:payments"},
		{ID: 7, ParentID: 0, Title: "产品与报价库", Name: "Products", Path: "/products", Icon: "package", Component: "Products", Sort: 7, Type: "M", PermissionCode: "menu:products"},
		{ID: 8, ParentID: 0, Title: "销售业绩龙虎榜", Name: "Leaderboard", Path: "/leaderboard", Icon: "trophy", Component: "Leaderboard", Sort: 8, Type: "M", PermissionCode: "menu:leaderboard"},
		{ID: 9, ParentID: 0, Title: "BI 商业智能分析", Name: "Analytics", Path: "/analytics", Icon: "pie-chart", Component: "Analytics", Sort: 9, Type: "M", PermissionCode: "menu:analytics"},
		{ID: 10, ParentID: 0, Title: "销售 AI 助理", Name: "AiCopilot", Path: "/ai", Icon: "sparkles", Component: "AiCopilot", Sort: 10, Type: "M", PermissionCode: "menu:ai"},

		// Type "B": Deals Button Actions
		{ID: 101, ParentID: 4, Title: "新建商机按钮", Name: "BtnDealAdd", Path: "", Icon: "", Component: "", Sort: 1, Type: "B", PermissionCode: "btn:deal:add"},
		{ID: 102, ParentID: 4, Title: "编辑商机按钮", Name: "BtnDealEdit", Path: "", Icon: "", Component: "", Sort: 2, Type: "B", PermissionCode: "btn:deal:edit"},
		{ID: 103, ParentID: 4, Title: "推进阶段按钮", Name: "BtnDealAdvance", Path: "", Icon: "", Component: "", Sort: 3, Type: "B", PermissionCode: "btn:deal:advance_stage"},
		{ID: 104, ParentID: 4, Title: "特批底价折扣", Name: "BtnDealApproveDiscount", Path: "", Icon: "", Component: "", Sort: 4, Type: "B", PermissionCode: "btn:deal:approve_discount"},
		{ID: 105, ParentID: 4, Title: "批量导出商机", Name: "BtnDealExport", Path: "", Icon: "", Component: "", Sort: 5, Type: "B", PermissionCode: "btn:deal:export"},
		{ID: 106, ParentID: 4, Title: "删除商机", Name: "BtnDealDelete", Path: "", Icon: "", Component: "", Sort: 6, Type: "B", PermissionCode: "btn:deal:delete"},

		// Type "B": Leads Button Actions
		{ID: 201, ParentID: 2, Title: "新建线索", Name: "BtnLeadAdd", Path: "", Icon: "", Component: "", Sort: 1, Type: "B", PermissionCode: "btn:lead:add"},
		{ID: 202, ParentID: 2, Title: "转化商机按钮", Name: "BtnLeadConvert", Path: "", Icon: "", Component: "", Sort: 2, Type: "B", PermissionCode: "btn:lead:convert"},
		{ID: 203, ParentID: 2, Title: "导出线索列表", Name: "BtnLeadExport", Path: "", Icon: "", Component: "", Sort: 3, Type: "B", PermissionCode: "btn:lead:export"},

		// Type "B": Customers Buttons
		{ID: 301, ParentID: 3, Title: "新建客户", Name: "BtnCustomerAdd", Path: "", Icon: "", Component: "", Sort: 1, Type: "B", PermissionCode: "btn:customer:add"},
		{ID: 302, ParentID: 3, Title: "编辑客户档案", Name: "BtnCustomerEdit", Path: "", Icon: "", Component: "", Sort: 2, Type: "B", PermissionCode: "btn:customer:edit"},
		{ID: 303, ParentID: 3, Title: "导出客户名录", Name: "BtnCustomerExport", Path: "", Icon: "", Component: "", Sort: 3, Type: "B", PermissionCode: "btn:customer:export"},

		// Type "F": Sensitive Price / Column Permissions (精确到价格)
		{ID: 401, ParentID: 4, Title: "查看标的成交价", Name: "FieldDealAmount", Path: "", Icon: "", Component: "", Sort: 1, Type: "F", PermissionCode: "field:deal:amount"},
		{ID: 402, ParentID: 4, Title: "查看采购/底价成本", Name: "FieldDealCostPrice", Path: "", Icon: "", Component: "", Sort: 2, Type: "F", PermissionCode: "field:deal:cost_price"},
		{ID: 403, ParentID: 4, Title: "查看综合毛利率", Name: "FieldDealMarginRate", Path: "", Icon: "", Component: "", Sort: 3, Type: "F", PermissionCode: "field:deal:margin_rate"},
		{ID: 404, ParentID: 4, Title: "编辑成交标价与底价", Name: "FieldDealEditPrice", Path: "", Icon: "", Component: "", Sort: 4, Type: "F", PermissionCode: "field:deal:edit_price"},
	}
	for _, m := range menus {
		db.FirstOrCreate(&m, model.SysMenu{ID: m.ID})
	}

	// 3. Assign Role Permissions
	// Helper to add role permissions
	assignPerms := func(roleID uint, menuIDs []uint) {
		for _, mID := range menuIDs {
			db.Create(&model.SysRolePermission{RoleID: roleID, MenuID: mID, CreatedAt: time.Now()})
		}
	}

	// Super Admin: Has ALL 10 Menus, ALL Buttons, ALL Fields
	var allMenuIDs []uint
	for _, m := range menus {
		allMenuIDs = append(allMenuIDs, m.ID)
	}
	assignPerms(1, allMenuIDs)

	// Sales Director: Has ALL 10 Menus, ALL Buttons, ALL Price Fields
	var directorMenuIDs []uint
	for _, m := range menus {
		directorMenuIDs = append(directorMenuIDs, m.ID)
	}
	assignPerms(2, directorMenuIDs)

	// Sales Rep (普通销售):
	// Menus: Dashboard (1), Leads (2), Customers (3), Deals (4), Leaderboard (8)
	// Buttons: btn:deal:add (101), btn:deal:edit (102), btn:deal:advance_stage (103), btn:lead:add (201), btn:lead:convert (202), btn:customer:add (301), btn:customer:edit (302)
	// Price Fields: ONLY field:deal:amount (401)
	// -> STRICTLY NO: field:deal:cost_price (402), field:deal:margin_rate (403), btn:deal:export (105), btn:deal:delete (106), btn:deal:approve_discount (104)
	repMenuIDs := []uint{1, 2, 3, 4, 8, 101, 102, 103, 201, 202, 301, 302, 401}
	assignPerms(3, repMenuIDs)

	// Finance Auditor (财务审计):
	// Menus: Dashboard (1), Deals (4), Contracts (5), Payments (6), Analytics (9)
	// Buttons: btn:deal:export (105)
	// Price Fields: field:deal:amount (401), field:deal:cost_price (402), field:deal:margin_rate (403)
	financeMenuIDs := []uint{1, 4, 5, 6, 9, 105, 401, 402, 403}
	assignPerms(4, financeMenuIDs)

	// 4. Default Seed Users
	hashPassword := func(pwd string) string {
		h, _ := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
		return string(h)
	}

	users := []model.SysUser{
		{
			ID:           1,
			Username:     "admin",
			PasswordHash: hashPassword("admin123"),
			RealName:     "Sarah Jenkins (超级管理员)",
			Avatar:       "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
			Email:        "admin@acme.com",
			Phone:        "13800000001",
			RoleID:       1,
			Status:       1,
		},
		{
			ID:           2,
			Username:     "director",
			PasswordHash: hashPassword("director123"),
			RealName:     "陈明 (销售总监)",
			Avatar:       "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop",
			Email:        "director@acme.com",
			Phone:        "13800000002",
			RoleID:       2,
			Status:       1,
		},
		{
			ID:           3,
			Username:     "rep",
			PasswordHash: hashPassword("rep123"),
			RealName:     "林雪 (客户经理 · 一线销售)",
			Avatar:       "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
			Email:        "rep@acme.com",
			Phone:        "13800000003",
			RoleID:       3,
			Status:       1,
		},
		{
			ID:           4,
			Username:     "finance",
			PasswordHash: hashPassword("finance123"),
			RealName:     "王建国 (财务审计主管)",
			Avatar:       "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
			Email:        "finance@acme.com",
			Phone:        "13800000004",
			RoleID:       4,
			Status:       1,
		},
	}
	for _, u := range users {
		db.FirstOrCreate(&u, model.SysUser{ID: u.ID})
	}

	// 5. Seed CRM Deals (containing Amount, CostPrice, and MarginRate for price verification)
	deals := []model.CrmDeal{
		{
			ID:           1,
			Name:         "比亚迪股份 · 智能云仓自动化集成",
			CustomerID:   1,
			CustomerName: "比亚迪股份有限公司",
			Stage:        "discovery",
			Amount:       380000.00,
			CostPrice:    210000.00, // 敏感底价: 普通销售无权查看
			MarginRate:   44.74,     // 敏感毛利率: 普通销售无权查看
			Probability:  30,
			CloseDate:    "2026-10-31",
			OwnerID:      3,
			OwnerName:    "林雪",
		},
		{
			ID:           2,
			Name:         "宁德时代 · 电池制造精益生产 MES",
			CustomerID:   2,
			CustomerName: "宁德时代新能源科技",
			Stage:        "proposal",
			Amount:       520000.00,
			CostPrice:    310000.00, // 敏感底价
			MarginRate:   40.38,     // 敏感毛利率
			Probability:  60,
			CloseDate:    "2026-11-15",
			OwnerID:      2,
			OwnerName:    "陈明",
		},
		{
			ID:           3,
			Name:         "美团点评 · 商家履约全流程监测平台",
			CustomerID:   3,
			CustomerName: "美团技术团队",
			Stage:        "negotiation",
			Amount:       260000.00,
			CostPrice:    140000.00, // 敏感底价
			MarginRate:   46.15,     // 敏感毛利率
			Probability:  80,
			CloseDate:    "2026-10-20",
			OwnerID:      3,
			OwnerName:    "林雪",
		},
		{
			ID:           4,
			Name:         "蔚来能源 · 换电站物联边缘网关项目",
			CustomerID:   4,
			CustomerName: "蔚来汽车能源事业部",
			Stage:        "closed_won",
			Amount:       450000.00,
			CostPrice:    230000.00, // 敏感底价
			MarginRate:   48.89,     // 敏感毛利率
			Probability:  100,
			CloseDate:    "2026-09-28",
			OwnerID:      2,
			OwnerName:    "陈明",
		},
	}
	for _, d := range deals {
		db.FirstOrCreate(&d, model.CrmDeal{ID: d.ID})
	}

	// 6. Seed CRM Leads
	leads := []model.CrmLead{
		{
			ID:        1,
			Name:      "小鹏汇天 · 飞行汽车航电传感器系统采购",
			Company:   "广州小鹏汇天科技有限公司",
			Phone:     "18612345678",
			Email:     "procurement@ev-tech.com",
			Title:     "采购总监",
			Source:    "官方网站咨询",
			Status:    "qualified",
			Budget:    280000.00,
			OwnerID:   3,
			OwnerName: "林雪",
		},
		{
			ID:        2,
			Name:      "大疆创新 · 农业植保无人机图传基站定制",
			Company:   "深圳市大疆创新科技有限公司",
			Phone:     "18888889999",
			Email:     "tech@dji-enterprise.com",
			Title:     "研发 VP",
			Source:    "行业展会",
			Status:    "contacted",
			Budget:    420000.00,
			OwnerID:   2,
			OwnerName: "陈明",
		},
		{
			ID:        3,
			Name:      "商汤科技 · 大模型算力集群能耗监测",
			Company:   "商汤智能科技有限公司",
			Phone:     "13911112222",
			Email:     "datacenter@sensetime.com",
			Title:     "基础设施运维架构师",
			Source:    "生态伙伴推荐",
			Status:    "new",
			Budget:    190000.00,
			OwnerID:   3,
			OwnerName: "林雪",
		},
	}
	for _, l := range leads {
		db.FirstOrCreate(&l, model.CrmLead{ID: l.ID})
	}

	// 7. Seed CRM Customers
	customers := []model.CrmCustomer{
		{ID: 1, Name: "比亚迪股份有限公司", Industry: "新能源汽车", Tier: "VIP", ContactName: "张建华", ContactPhone: "13811223344", OwnerID: 3, OwnerName: "林雪"},
		{ID: 2, Name: "宁德时代新能源科技", Industry: "动力电池", Tier: "KA", ContactName: "李海峰", ContactPhone: "13955667788", OwnerID: 2, OwnerName: "陈明"},
		{ID: 3, Name: "美团技术团队", Industry: "生活服务平台", Tier: "KA", ContactName: "王伟", ContactPhone: "13799887766", OwnerID: 3, OwnerName: "林雪"},
		{ID: 4, Name: "蔚来汽车能源事业部", Industry: "充换电能源", Tier: "VIP", ContactName: "赵强", ContactPhone: "13600112233", OwnerID: 2, OwnerName: "陈明"},
	}
	for _, c := range customers {
		db.FirstOrCreate(&c, model.CrmCustomer{ID: c.ID})
	}

	seedBusinessTables(db)

	log.Println("[Database] Seed data successfully committed.")
	return nil
}

func seedBusinessTables(db *gorm.DB) {
	// 8. Seed Contracts
	var contractCount int64
	db.Model(&model.CrmContract{}).Count(&contractCount)
	if contractCount == 0 {
		contracts := []model.CrmContract{
			{ID: 1, ContractNo: "CT-2026-001", Title: "大华股份 视觉AI私有化部署合同", CustomerID: 1, CustomerName: "大华技术股份有限公司", DealID: 1, Amount: 2400000.00, Status: "pending_approval", SignDate: "2026-10-15", OwnerID: 2, OwnerName: "陈明"},
			{ID: 2, ContractNo: "CT-2026-002", Title: "比亚迪 电池产线质检边缘一体机采购合同", CustomerID: 1, CustomerName: "比亚迪股份有限公司", DealID: 2, Amount: 1850000.00, Status: "approved", SignDate: "2026-09-20", OwnerID: 3, OwnerName: "林雪"},
			{ID: 3, ContractNo: "CT-2026-003", Title: "顺丰科技 智能仓储物流调度引擎采购", CustomerID: 3, CustomerName: "顺丰速运集团", DealID: 3, Amount: 960000.00, Status: "active", SignDate: "2026-09-10", OwnerID: 2, OwnerName: "陈明"},
			{ID: 4, ContractNo: "CT-2026-004", Title: "宁德时代 极限制造AI质检二期系统采购", CustomerID: 2, CustomerName: "宁德时代新能源科技", DealID: 4, Amount: 3200000.00, Status: "completed", SignDate: "2026-08-15", OwnerID: 2, OwnerName: "陈明"},
		}
		for _, c := range contracts {
			db.FirstOrCreate(&c, model.CrmContract{ID: c.ID})
		}
		log.Printf("[Database] Seeded %d contracts", len(contracts))
	}

	// 9. Seed Payments
	var paymentCount int64
	db.Model(&model.CrmPayment{}).Count(&paymentCount)
	if paymentCount == 0 {
		payments := []model.CrmPayment{
			{ID: 1, PaymentNo: "PM-2026-001", ContractID: 2, ContractNo: "CT-2026-002", CustomerName: "比亚迪股份有限公司", Amount: 925000.00, Type: "prepayment", Status: "audited", PaymentDate: "2026-09-25", InvoiceStatus: "issued", AuditBy: "钱多多 (财务合规审计员)"},
			{ID: 2, PaymentNo: "PM-2026-002", ContractID: 3, ContractNo: "CT-2026-003", CustomerName: "顺丰速运集团", Amount: 480000.00, Type: "prepayment", Status: "audited", PaymentDate: "2026-09-18", InvoiceStatus: "issued", AuditBy: "钱多多 (财务合规审计员)"},
			{ID: 3, PaymentNo: "PM-2026-003", ContractID: 1, ContractNo: "CT-2026-001", CustomerName: "大华技术股份有限公司", Amount: 1200000.00, Type: "prepayment", Status: "pending", PaymentDate: "2026-10-08", InvoiceStatus: "unissued", AuditBy: ""},
			{ID: 4, PaymentNo: "PM-2026-004", ContractID: 4, ContractNo: "CT-2026-004", CustomerName: "宁德时代新能源科技", Amount: 1600000.00, Type: "milestone", Status: "audited", PaymentDate: "2026-09-30", InvoiceStatus: "issued", AuditBy: "钱多多 (财务合规审计员)"},
		}
		for _, p := range payments {
			db.FirstOrCreate(&p, model.CrmPayment{ID: p.ID})
		}
		log.Printf("[Database] Seeded %d payments", len(payments))
	}

	// 10. Seed Products
	var productCount int64
	db.Model(&model.CrmProduct{}).Count(&productCount)
	if productCount == 0 {
		products := []model.CrmProduct{
			{ID: 1, ProductCode: "PRD-AI-01", Name: "领航 AI 行业大模型私有化底座", Category: "软件平台", Price: 800000.00, CostPrice: 320000.00, Unit: "套", Stock: 999, Status: 1},
			{ID: 2, ProductCode: "PRD-BOX-02", Name: "边缘算力工控一体机 Pro (8卡)", Category: "硬件算力", Price: 150000.00, CostPrice: 85000.00, Unit: "台", Stock: 45, Status: 1},
			{ID: 3, ProductCode: "PRD-SVC-03", Name: "大模型算法微调与数据标注交付服务", Category: "专业服务", Price: 250000.00, CostPrice: 110000.00, Unit: "人月", Stock: 100, Status: 1},
			{ID: 4, ProductCode: "PRD-SUB-04", Name: "企业销售智能体 SaaS 年费授权 (标准版)", Category: "订阅服务", Price: 68000.00, CostPrice: 12000.00, Unit: "企业/年", Stock: 999, Status: 1},
		}
		for _, p := range products {
			db.FirstOrCreate(&p, model.CrmProduct{ID: p.ID})
		}
		log.Printf("[Database] Seeded %d products", len(products))
	}

	// 11. Seed sample audit logs
	var logCount int64
	db.Model(&model.SysOperationLog{}).Count(&logCount)
	if logCount == 0 {
		logs := []model.SysOperationLog{
			{UserID: 1, Username: "admin", RoleName: "超级管理员", Module: "角色权限", Action: "初始化系统59项RBAC权限节点", Method: "SYSTEM", Path: "/internal/seed", IP: "127.0.0.1", Details: "系统初始化载入全部菜单与操作按钮权限", CreatedAt: time.Now().Add(-2 * time.Hour)},
			{UserID: 2, Username: "director", RoleName: "销售总监", Module: "商机管理", Action: "审批大华股份底价折扣特批", Method: "PUT", Path: "/api/v1/deals/1/stage", IP: "192.168.1.108", Details: "特批毛利率底线 35%，批准推进至商务谈判阶段", CreatedAt: time.Now().Add(-1 * time.Hour)},
		}
		for _, l := range logs {
			db.Create(&l)
		}
	}
}
