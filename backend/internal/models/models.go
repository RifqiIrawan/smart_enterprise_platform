package models

import "time"

type Company struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	NPWP      string    `json:"npwp"`
	Address   string    `json:"address"`
	Phone     string    `json:"phone"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type User struct {
	ID          string    `json:"id"`
	CompanyID   string    `json:"company_id"`
	Name        string    `json:"name"`
	Email       string    `json:"email"`
	Password    string    `json:"-"`
	Role        string    `json:"role"`
	Permissions []string  `json:"permissions"`
	IsActive    bool      `json:"is_active"`
	LastLogin   *time.Time `json:"last_login,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token   string  `json:"token"`
	User    User    `json:"user"`
	Company Company `json:"company"`
}

type WorkOrder struct {
	ID          string     `json:"id"`
	CompanyID   string     `json:"company_id"`
	WONumber    string     `json:"wo_number"`
	ProductName string     `json:"product_name"`
	TargetQty   int        `json:"target_qty"`
	ActualQty   int        `json:"actual_qty"`
	MachineID   string     `json:"machine_id"`
	Status      string     `json:"status"`
	ETA         *time.Time `json:"eta,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type Employee struct {
	ID         string    `json:"id"`
	CompanyID  string    `json:"company_id"`
	EmpNumber  string    `json:"emp_number"`
	Name       string    `json:"name"`
	Email      string    `json:"email"`
	Department string    `json:"department"`
	Position   string    `json:"position"`
	Salary     int64     `json:"salary"`
	Status     string    `json:"status"`
	JoinDate   string    `json:"join_date"`
	CreatedAt  time.Time `json:"created_at"`
}

type Asset struct {
	ID              string    `json:"id"`
	CompanyID       string    `json:"company_id"`
	AssetNumber     string    `json:"asset_number"`
	Name            string    `json:"name"`
	Category        string    `json:"category"`
	Location        string    `json:"location"`
	Value           int64     `json:"value"`
	Condition       string    `json:"condition"`
	NextMaintenance string    `json:"next_maintenance"`
	CreatedAt       time.Time `json:"created_at"`
}

type Notification struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Type      string    `json:"type"`
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Total   int         `json:"total,omitempty"`
}

type Customer struct {
	ID          string    `json:"id"`
	CompanyID   string    `json:"company_id"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	NPWP        string    `json:"npwp"`
	Address     string    `json:"address"`
	City        string    `json:"city"`
	Phone       string    `json:"phone"`
	Email       string    `json:"email"`
	CreditLimit int64     `json:"credit_limit"`
	PaymentTerm int       `json:"payment_term"`
	Category    string    `json:"category"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type SOItem struct {
	ID          string  `json:"id"`
	SOId        string  `json:"so_id"`
	ProductName string  `json:"product_name"`
	Qty         float64 `json:"qty"`
	Unit        string  `json:"unit"`
	UnitPrice   int64   `json:"unit_price"`
	Discount    float64 `json:"discount"`
	Amount      int64   `json:"amount"`
}

type SalesOrder struct {
	ID           string    `json:"id"`
	CompanyID    string    `json:"company_id"`
	SONumber     string    `json:"so_number"`
	CustomerID   string    `json:"customer_id"`
	CustomerName string    `json:"customer_name"`
	Date         string    `json:"date"`
	DeliveryDate string    `json:"delivery_date"`
	Subtotal     int64     `json:"subtotal"`
	TaxAmount    int64     `json:"tax_amount"`
	Total        int64     `json:"total"`
	Status       string    `json:"status"`
	Notes        string    `json:"notes"`
	ApprovedBy   string    `json:"approved_by"`
	Items        []SOItem  `json:"items,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type DOItem struct {
	ID           string  `json:"id"`
	DOId         string  `json:"do_id"`
	SOItemId     string  `json:"so_item_id"`
	ProductName  string  `json:"product_name"`
	OrderedQty   float64 `json:"ordered_qty"`
	DeliveredQty float64 `json:"delivered_qty"`
	Unit         string  `json:"unit"`
}

type DeliveryOrder struct {
	ID           string    `json:"id"`
	CompanyID    string    `json:"company_id"`
	DONumber     string    `json:"do_number"`
	SOId         string    `json:"so_id"`
	SONumber     string    `json:"so_number"`
	CustomerID   string    `json:"customer_id"`
	CustomerName string    `json:"customer_name"`
	Date         string    `json:"date"`
	Status       string    `json:"status"`
	Notes        string    `json:"notes"`
	Items        []DOItem  `json:"items,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type CustomerInvoice struct {
	ID           string    `json:"id"`
	CompanyID    string    `json:"company_id"`
	InvNumber    string    `json:"inv_number"`
	DOId         string    `json:"do_id"`
	DONumber     string    `json:"do_number"`
	SOId         string    `json:"so_id"`
	CustomerID   string    `json:"customer_id"`
	CustomerName string    `json:"customer_name"`
	Date         string    `json:"date"`
	DueDate      string    `json:"due_date"`
	Subtotal     int64     `json:"subtotal"`
	TaxAmount    int64     `json:"tax_amount"`
	Total        int64     `json:"total"`
	PaidAmount   int64     `json:"paid_amount"`
	Status       string    `json:"status"`
	Notes        string    `json:"notes"`
	CreatedAt    time.Time `json:"created_at"`
}
