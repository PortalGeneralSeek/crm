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
