package model

import (
	"time"
)

type CrmLead struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:64;not null" json:"name"`
	Company   string    `gorm:"size:128;not null" json:"company"`
	Phone     string    `gorm:"size:32" json:"phone"`
	Email     string    `gorm:"size:128" json:"email"`
	Title     string    `gorm:"size:64" json:"title"`
	Source    string    `gorm:"size:64" json:"source"`
	Status    string    `gorm:"size:32;default:'new'" json:"status"` // new, contacted, qualified, converted, lost
	Budget    float64   `gorm:"type:decimal(12,2)" json:"budget"`
	OwnerID   uint      `gorm:"index" json:"ownerId"`
	OwnerName string    `gorm:"size:64" json:"ownerName"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type CrmDeal struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"size:128;not null" json:"name"`
	CustomerID   uint      `gorm:"index" json:"customerId"`
	CustomerName string    `gorm:"size:128;not null" json:"customerName"`
	Stage        string    `gorm:"size:32;not null" json:"stage"` // discovery, proposal, negotiation, closed_won, closed_lost
	Amount       float64   `gorm:"type:decimal(12,2);not null" json:"amount"`
	CostPrice    float64   `gorm:"type:decimal(12,2);not null" json:"costPrice"`   // Sensitive: Base/Cost price
	MarginRate   float64   `gorm:"type:decimal(6,2);not null" json:"marginRate"`   // Sensitive: Profit Margin %
	Probability  int       `gorm:"default:50" json:"probability"`
	CloseDate    string    `gorm:"size:32" json:"closeDate"`
	OwnerID      uint      `gorm:"index" json:"ownerId"`
	OwnerName    string    `gorm:"size:64" json:"ownerName"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// DealDTO is the presentation model with dynamic price masking based on user permissions
type DealDTO struct {
	ID           uint      `json:"id"`
	Name         string    `json:"name"`
	CustomerID   uint      `json:"customerId"`
	CustomerName string    `json:"customerName"`
	Stage        string    `json:"stage"`
	Amount       float64   `json:"amount"`
	// Masked price fields for users without field:deal:cost_price permission
	CostPrice        *float64  `json:"costPrice,omitempty"`
	CostPriceDisplay string    `json:"costPriceDisplay"`
	MarginRate       *float64  `json:"marginRate,omitempty"`
	MarginRateDisplay string   `json:"marginRateDisplay"`
	CanViewCostPrice bool      `json:"canViewCostPrice"`
	CanEditPrice     bool      `json:"canEditPrice"`
	Probability      int       `json:"probability"`
	CloseDate        string    `json:"closeDate"`
	OwnerID          uint      `json:"ownerId"`
	OwnerName        string    `json:"ownerName"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type CrmCustomer struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"size:128;not null" json:"name"`
	Industry     string    `gorm:"size:64" json:"industry"`
	Tier         string    `gorm:"size:32;default:'SMB'" json:"tier"` // VIP, KA, SMB
	ContactName  string    `gorm:"size:64" json:"contactName"`
	ContactPhone string    `gorm:"size:32" json:"contactPhone"`
	OwnerID      uint      `gorm:"index" json:"ownerId"`
	OwnerName    string    `gorm:"size:64" json:"ownerName"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type CrmContract struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	ContractNo   string    `gorm:"size:64;uniqueIndex;not null" json:"contractNo"`
	Title        string    `gorm:"size:128;not null" json:"title"`
	CustomerID   uint      `gorm:"index" json:"customerId"`
	CustomerName string    `gorm:"size:128;not null" json:"customerName"`
	DealID       uint      `gorm:"index" json:"dealId"`
	Amount       float64   `gorm:"type:decimal(12,2);not null" json:"amount"`
	Status       string    `gorm:"size:32;default:'pending_approval'" json:"status"` // pending_approval, approved, active, completed, terminated
	SignDate     string    `gorm:"size:32" json:"signDate"`
	OwnerID      uint      `gorm:"index" json:"ownerId"`
	OwnerName    string    `gorm:"size:64" json:"ownerName"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type CrmPayment struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	PaymentNo     string    `gorm:"size:64;uniqueIndex;not null" json:"paymentNo"`
	ContractID    uint      `gorm:"index" json:"contractId"`
	ContractNo    string    `gorm:"size:64;not null" json:"contractNo"`
	CustomerName  string    `gorm:"size:128;not null" json:"customerName"`
	Amount        float64   `gorm:"type:decimal(12,2);not null" json:"amount"`
	Type          string    `gorm:"size:32;not null" json:"type"` // prepayment, milestone, final
	Status        string    `gorm:"size:32;default:'pending'" json:"status"` // pending, audited, rejected
	PaymentDate   string    `gorm:"size:32" json:"paymentDate"`
	InvoiceStatus string    `gorm:"size:32;default:'unissued'" json:"invoiceStatus"` // unissued, issued
	AuditBy       string    `gorm:"size:64" json:"auditBy"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type CrmProduct struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ProductCode string    `gorm:"size:64;uniqueIndex;not null" json:"productCode"`
	Name        string    `gorm:"size:128;not null" json:"name"`
	Category    string    `gorm:"size:64;not null" json:"category"`
	Price       float64   `gorm:"type:decimal(12,2);not null" json:"price"`
	CostPrice   float64   `gorm:"type:decimal(12,2);not null" json:"costPrice"` // Sensitive
	Unit        string    `gorm:"size:32;default:'套'" json:"unit"`
	Stock       int       `gorm:"default:100" json:"stock"`
	Status      int       `gorm:"default:1" json:"status"` // 1: active, 0: disabled
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type SysOperationLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"userId"`
	Username  string    `gorm:"size:64;not null" json:"username"`
	RoleName  string    `gorm:"size:64" json:"roleName"`
	Module    string    `gorm:"size:64;not null" json:"module"`
	Action    string    `gorm:"size:64;not null" json:"action"`
	Method    string    `gorm:"size:16" json:"method"`
	Path      string    `gorm:"size:255" json:"path"`
	IP        string    `gorm:"size:64" json:"ip"`
	Details   string    `gorm:"type:text" json:"details"`
	CreatedAt time.Time `json:"createdAt"`
}
