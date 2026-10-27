package model

import (
	"time"

	"gorm.io/gorm"
)

type CrmLead struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:64;not null" json:"name"`
	Company   string         `gorm:"size:128;not null" json:"company"`
	Phone     string         `gorm:"size:32" json:"phone"`
	Email     string         `gorm:"size:128" json:"email"`
	Title     string         `gorm:"size:64" json:"title"`
	Source    string         `gorm:"size:64" json:"source"`
	Status    string         `gorm:"size:32;default:'new'" json:"status"` // new, contacted, qualified, converted, lost
	Budget    float64        `gorm:"type:decimal(12,2)" json:"budget"`
	OwnerID   uint           `gorm:"index" json:"ownerId"`
	OwnerName string         `gorm:"size:64" json:"ownerName"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type CrmDeal struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Name         string         `gorm:"size:128;not null" json:"name"`
	CustomerID   uint           `gorm:"index" json:"customerId"`
	CustomerName string         `gorm:"size:128;not null" json:"customerName"`
	Stage        string         `gorm:"size:32;not null;index:idx_owner_stage,priority:2" json:"stage"` // discovery, proposal, negotiation, closed_won, closed_lost
	Amount       float64        `gorm:"type:decimal(12,2);not null" json:"amount"`
	CostPrice    float64        `gorm:"type:decimal(12,2);not null" json:"costPrice"` // Sensitive: Base/Cost price
	MarginRate   float64        `gorm:"type:decimal(6,2);not null" json:"marginRate"` // Sensitive: Profit Margin %
	Probability  int            `gorm:"default:50" json:"probability"`
	CloseDate    string         `gorm:"size:32" json:"closeDate"`
	OwnerID      uint           `gorm:"index;index:idx_owner_stage,priority:1" json:"ownerId"`
	OwnerName    string         `gorm:"size:64" json:"ownerName"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// DealDTO is the presentation model with dynamic price masking based on user permissions
type DealDTO struct {
	ID                uint      `json:"id"`
	Name              string    `json:"name"`
	CustomerID        uint      `json:"customerId"`
	CustomerName      string    `json:"customerName"`
	Stage             string    `json:"stage"`
	Amount            float64   `json:"amount"`
	CostPrice         *float64  `json:"costPrice,omitempty"`
	CostPriceDisplay  string    `json:"costPriceDisplay"`
	MarginRate        *float64  `json:"marginRate,omitempty"`
	MarginRateDisplay string    `json:"marginRateDisplay"`
	CanViewCostPrice  bool      `json:"canViewCostPrice"`
	CanEditPrice      bool      `json:"canEditPrice"`
	Probability       int       `json:"probability"`
	CloseDate         string    `json:"closeDate"`
	OwnerID           uint      `json:"ownerId"`
	OwnerName         string    `json:"ownerName"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type CrmCustomer struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Name          string         `gorm:"size:255;not null;index" json:"name"`
	Industry      string         `gorm:"size:128" json:"industry"`
	Tier          string         `gorm:"size:32;default:'SMB'" json:"tier"` // VIP, KA, SMB
	Branch        string         `gorm:"size:64;default:'华东分公司';index:idx_branch_public,priority:1" json:"branch"`
	IsPublicSea   bool           `gorm:"default:false;index;index:idx_branch_public,priority:2" json:"isPublicSea"`
	PoolType      string         `gorm:"size:32;default:'private'" json:"poolType"` // 'private', 'branch_public'
	ContactName   string         `gorm:"size:64" json:"contactName"`
	ContactPhone  string         `gorm:"size:64" json:"contactPhone"`
	ContactEmail  string         `gorm:"size:128" json:"contactEmail"`
	OwnerID       uint           `gorm:"index" json:"ownerId"`
	OwnerName     string         `gorm:"size:64" json:"ownerName"`
	PrevOwnerID   uint           `json:"prevOwnerId"`
	PrevOwnerName string         `gorm:"size:64" json:"prevOwnerName"`
	ReclaimReason string         `gorm:"size:255" json:"reclaimReason"`
	ReclaimedAt   *time.Time     `json:"reclaimedAt"`
	AssignedAt    *time.Time     `json:"assignedAt"`

	// QCC Enterprise Enrichment Details
	LegalPerson       string `gorm:"size:128" json:"legalPerson"`
	RegistCapital     string `gorm:"size:64" json:"registCapital"`
	RegistStatus      string `gorm:"size:64" json:"registStatus"`
	EstablishDate     string `gorm:"size:32" json:"establishDate"`
	ApprovalDate      string `gorm:"size:32" json:"approvalDate"`
	Province          string `gorm:"size:32" json:"province"`
	City              string `gorm:"size:32" json:"city"`
	District          string `gorm:"size:32" json:"district"`
	EnterpriseAddress string `gorm:"size:255" json:"enterpriseAddress"`
	ReportSite        string `gorm:"size:255" json:"reportSite"`
	Website           string `gorm:"size:255" json:"website"`
	SocialCode        string `gorm:"size:64;index" json:"socialCode"`
	TaxpayerCode      string `gorm:"size:64" json:"taxpayerCode"`
	RegistCode        string `gorm:"size:64" json:"registCode"`
	OrgCode           string `gorm:"size:32" json:"orgCode"`
	InsuredTotal      string `gorm:"size:32" json:"insuredTotal"`
	EnterpriseType    string `gorm:"size:128" json:"enterpriseType"`
	EnglishName       string `gorm:"size:255" json:"englishName"`
	OldName           string `gorm:"size:255" json:"oldName"`
	Business          string `gorm:"type:text" json:"business"`
	SysTag            string `gorm:"size:255" json:"sysTag"`

	// Multiple Contacts JSON matrix: [{"id":"ct-1","name":"...","role":"...","phone":"...","email":"...","isPrimary":true,"type":"..."}]
	Contacts          string `gorm:"type:text" json:"contacts"`

	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

type CrmContract struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	ContractNo   string         `gorm:"size:64;uniqueIndex;not null" json:"contractNo"`
	Title        string         `gorm:"size:128;not null" json:"title"`
	CustomerID   uint           `gorm:"index" json:"customerId"`
	CustomerName string         `gorm:"size:128;not null" json:"customerName"`
	DealID       uint           `gorm:"index" json:"dealId"`
	Amount       float64        `gorm:"type:decimal(12,2);not null" json:"amount"`
	Status       string         `gorm:"size:32;default:'pending_approval'" json:"status"` // pending_approval, approved, active, completed, terminated
	SignDate     string         `gorm:"size:32" json:"signDate"`
	OwnerID      uint           `gorm:"index" json:"ownerId"`
	OwnerName    string         `gorm:"size:64" json:"ownerName"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type CrmPayment struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	PaymentNo       string    `gorm:"size:64;uniqueIndex;not null" json:"paymentNo"`
	BankStatementNo string    `gorm:"size:64" json:"bankStatementNo"`
	ContractID      uint      `gorm:"index" json:"contractId"`
	ContractNo      string    `gorm:"size:64;not null" json:"contractNo"`
	CustomerName    string    `gorm:"size:128;not null" json:"customerName"`
	Amount          float64   `gorm:"type:decimal(12,2);not null" json:"amount"`
	AssociationType string    `gorm:"size:32;default:'full'" json:"associationType"` // full, partial
	Type            string    `gorm:"size:32;not null" json:"type"` // prepayment, milestone, final
	Status          string    `gorm:"size:32;default:'pending'" json:"status"` // pending, audited, rejected
	PaymentDate     string    `gorm:"size:32" json:"paymentDate"`
	InvoiceStatus   string    `gorm:"size:32;default:'unissued'" json:"invoiceStatus"` // unissued, issued
	AuditBy         string    `gorm:"size:64" json:"auditBy"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type CrmBankStatement struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	StatementNo  string         `gorm:"size:64;uniqueIndex;not null" json:"statementNo"`
	Counterparty string         `gorm:"size:128;not null" json:"counterparty"`
	BankName     string         `gorm:"size:128;not null" json:"bankName"`
	BankAccount  string         `gorm:"size:64;not null" json:"bankAccount"`
	Amount       float64        `gorm:"type:decimal(12,2);not null" json:"amount"`
	LinkedAmount float64        `gorm:"type:decimal(12,2);default:0" json:"linkedAmount"`
	RemainAmount float64        `gorm:"type:decimal(12,2);not null" json:"remainAmount"`
	Status       string         `gorm:"size:32;default:'unlinked'" json:"status"` // unlinked, partial, settled
	TxDate       string         `gorm:"size:32" json:"txDate"`
	Summary      string         `gorm:"size:255" json:"summary"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

type CrmCustomerEntitlement struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	EntitlementNo   string         `gorm:"size:64;uniqueIndex;not null" json:"entitlementNo"`
	CustomerID      uint           `gorm:"index" json:"customerId"`
	CustomerName    string         `gorm:"size:128;not null" json:"customerName"`
	ContractNo      string         `gorm:"size:64" json:"contractNo"`
	BankStatementNo string         `gorm:"size:64" json:"bankStatementNo"`
	PaymentNo       string         `gorm:"size:64" json:"paymentNo"`
	Name            string         `gorm:"size:128;not null" json:"name"`
	Category        string         `gorm:"size:64;not null" json:"category"`
	Value           float64        `gorm:"type:decimal(12,2);not null" json:"value"`
	Status          string         `gorm:"size:32;default:'inactive'" json:"status"` // inactive, active, switched
	ActivatedAt     string         `gorm:"size:32" json:"activatedAt"`
	Features        string         `gorm:"type:text" json:"features"`
	SwitchHistory   string         `gorm:"type:text" json:"switchHistory"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

type CrmProduct struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	ProductCode string         `gorm:"size:64;uniqueIndex;not null" json:"productCode"`
	Name        string         `gorm:"size:128;not null" json:"name"`
	Category    string         `gorm:"size:64;not null" json:"category"`
	Price       float64        `gorm:"type:decimal(12,2);not null" json:"price"`
	CostPrice   float64        `gorm:"type:decimal(12,2);not null" json:"costPrice"` // Sensitive
	Unit        string         `gorm:"size:32;default:'套'" json:"unit"`
	Stock       int            `gorm:"default:100" json:"stock"`
	Status      int            `gorm:"default:1" json:"status"` // 1: active, 0: disabled
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type SysOperationLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"userId"`
	Username  string    `gorm:"size:64;not null" json:"username"`
	RoleName  string    `gorm:"size:64" json:"roleName"`
	Module    string    `gorm:"size:64;not null;index:idx_module_created,priority:1" json:"module"`
	Action    string    `gorm:"size:64;not null" json:"action"`
	Method    string    `gorm:"size:16" json:"method"`
	Path      string    `gorm:"size:255" json:"path"`
	IP        string    `gorm:"size:64" json:"ip"`
	Details   string    `gorm:"type:text" json:"details"`
	CreatedAt time.Time `gorm:"index;index:idx_module_created,priority:2" json:"createdAt"`
}

type CrmMarketQuote struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Symbol    string    `gorm:"size:32;uniqueIndex;not null" json:"symbol"`
	Name      string    `gorm:"size:64;not null" json:"name"`
	Category  string    `gorm:"size:32;not null" json:"category"`
	Price     float64   `gorm:"type:decimal(16,4);not null" json:"price"`
	Change    float64   `gorm:"type:decimal(16,4)" json:"change"`
	ChangePct float64   `gorm:"type:decimal(10,4)" json:"changePct"`
	High      float64   `gorm:"type:decimal(16,4)" json:"high"`
	Low       float64   `gorm:"type:decimal(16,4)" json:"low"`
	Open      float64   `gorm:"type:decimal(16,4)" json:"open"`
	PrevClose float64   `gorm:"type:decimal(16,4)" json:"prevClose"`
	Bid       float64   `gorm:"type:decimal(16,4)" json:"bid"`
	Ask       float64   `gorm:"type:decimal(16,4)" json:"ask"`
	Unit      string    `gorm:"size:16" json:"unit"`
	UpdatedAt time.Time `json:"updatedAt"`
	CreatedAt time.Time `json:"createdAt"`
}

// CrmUsStockQuote 美股核心科技股最新报价 (每只一行，后台定时 upsert，重启时预热内存)。
// 用 double 而非 decimal：市值可达 1e15 (韩元计价)，超出 decimal(16,4) 范围。
type CrmUsStockQuote struct {
	Symbol       string    `gorm:"primaryKey;size:32" json:"symbol"`
	Ticker       string    `gorm:"size:16;not null" json:"ticker"`
	Name         string    `gorm:"size:64;not null" json:"name"`
	GroupKey     string    `gorm:"size:16;not null;index" json:"group"`
	Exchange     string    `gorm:"size:32" json:"exchange"`
	Currency     string    `gorm:"size:8" json:"currency"`
	Price        float64   `gorm:"type:double;not null" json:"price"`
	Change       float64   `gorm:"type:double" json:"change"`
	ChangePct    float64   `gorm:"type:double" json:"changePct"`
	Open         float64   `gorm:"type:double" json:"open"`
	High         float64   `gorm:"type:double" json:"high"`
	Low          float64   `gorm:"type:double" json:"low"`
	PrevClose    float64   `gorm:"type:double" json:"prevClose"`
	Bid          float64   `gorm:"type:double" json:"bid"`
	Ask          float64   `gorm:"type:double" json:"ask"`
	Volume       float64   `gorm:"type:double" json:"volume"`
	MarketCap    float64   `gorm:"type:double" json:"marketCap"`
	PE           float64   `gorm:"type:double" json:"pe"`
	High52       float64   `gorm:"type:double" json:"high52"`
	Low52        float64   `gorm:"type:double" json:"low52"`
	ExtPrice     float64   `gorm:"type:double" json:"extPrice"`
	ExtChange    float64   `gorm:"type:double" json:"extChange"`
	ExtChangePct float64   `gorm:"type:double" json:"extChangePct"`
	Session      string    `gorm:"size:24" json:"session"`
	UpdateMode   string    `gorm:"size:32" json:"updateMode"`
	PriceScale   int       `json:"priceScale"`
	LastTrade    int64     `json:"lastTrade"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// CrmMarketKline 本地归档的历史 K 线。联合主键即聚簇索引，按 (标的, 周期, 时间) 范围翻页查询无需回表。
// BarTime 为 K 线开始时间 (Unix 秒, UTC)，与 TradingView 返回值一致。
type CrmMarketKline struct {
	Symbol     string    `gorm:"primaryKey;size:32" json:"symbol"`
	Resolution string    `gorm:"primaryKey;size:8" json:"resolution"`
	BarTime    int64     `gorm:"primaryKey;autoIncrement:false" json:"time"`
	Open       float64   `gorm:"type:double;not null" json:"open"`
	High       float64   `gorm:"type:double;not null" json:"high"`
	Low        float64   `gorm:"type:double;not null" json:"low"`
	Close      float64   `gorm:"type:double;not null" json:"close"`
	Volume     float64   `gorm:"type:double;not null;default:0" json:"volume"`
	UpdatedAt  time.Time `json:"updatedAt"`
}
