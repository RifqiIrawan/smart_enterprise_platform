package handlers

import (
	"fmt"
	"net/http"
	"sep/backend/internal/database"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Bank Accounts ────────────────────────────────────────────────────────────

func GetBankAccounts(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 3,
			"value": []gin.H{
				{"id": "ba1", "name": "Kas Utama BCA", "bank_name": "BCA", "account_number": "123-456-7890", "branch": "Jakarta Selatan", "currency": "IDR", "balance": 250000000, "is_active": true},
				{"id": "ba2", "name": "Operasional Mandiri", "bank_name": "Mandiri", "account_number": "987-654-3210", "branch": "Jakarta Pusat", "currency": "IDR", "balance": 150000000, "is_active": true},
				{"id": "ba3", "name": "Kas BNI", "bank_name": "BNI", "account_number": "111-222-3333", "branch": "Bandung", "currency": "IDR", "balance": 75000000, "is_active": true},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT id, name, bank_name, account_number, COALESCE(branch,''), currency, balance, is_active, created_at
		 FROM bank_accounts WHERE company_id=$1 ORDER BY name`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, name, bankName, accountNumber, branch, currency string
		var balance int64
		var isActive bool
		var createdAt time.Time
		rows.Scan(&id, &name, &bankName, &accountNumber, &branch, &currency, &balance, &isActive, &createdAt)
		list = append(list, gin.H{
			"id": id, "name": name, "bank_name": bankName, "account_number": accountNumber,
			"branch": branch, "currency": currency, "balance": balance, "is_active": isActive, "created_at": createdAt,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreateBankAccount(c *gin.Context) {
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var body struct {
		Name          string `json:"name"`
		BankName      string `json:"bank_name"`
		AccountNumber string `json:"account_number"`
		Branch        string `json:"branch"`
		Currency      string `json:"currency"`
		Balance       int64  `json:"balance"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"id": "new-ba", "name": body.Name, "bank_name": body.BankName})
		return
	}
	currency := body.Currency
	if currency == "" {
		currency = "IDR"
	}
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO bank_accounts (company_id, name, bank_name, account_number, branch, currency, balance)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
		companyID, body.Name, body.BankName, body.AccountNumber, body.Branch, currency, body.Balance,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "create", "bank_account", id, "Bank account created: "+body.Name, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Bank account berhasil dibuat"})
}

func UpdateBankAccount(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Name          string `json:"name"`
		BankName      string `json:"bank_name"`
		AccountNumber string `json:"account_number"`
		Branch        string `json:"branch"`
		Currency      string `json:"currency"`
		IsActive      *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Updated (demo)"})
		return
	}
	_, err := database.DB.Exec(
		`UPDATE bank_accounts SET name=$1, bank_name=$2, account_number=$3, branch=$4, currency=$5, is_active=$6 WHERE id=$7`,
		body.Name, body.BankName, body.AccountNumber, body.Branch, body.Currency, body.IsActive, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Bank account diperbarui"})
}

func DeleteBankAccount(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	var cnt int
	database.DB.QueryRow(`SELECT COUNT(*) FROM payments_out WHERE bank_account_id=$1`, id).Scan(&cnt)
	if cnt > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Rekening memiliki transaksi, tidak bisa dihapus"})
		return
	}
	database.DB.QueryRow(`SELECT COUNT(*) FROM payments_in WHERE bank_account_id=$1`, id).Scan(&cnt)
	if cnt > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Rekening memiliki transaksi, tidak bisa dihapus"})
		return
	}
	database.DB.Exec(`DELETE FROM bank_accounts WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "Bank account dihapus"})
}

// ─── Vendor Invoices (AP) ─────────────────────────────────────────────────────

func GetVendorInvoices(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 3,
			"value": []gin.H{
				{"id": "vi1", "vi_number": "VI/2026/0001", "vendor_name": "PT Supplier Utama", "vendor_inv_number": "INV-SUP-001", "inv_date": "2026-06-01", "due_date": "2026-07-01", "subtotal": 10000000, "tax_amount": 1100000, "total": 11100000, "paid_amount": 0, "status": "unpaid", "po_number": "PO/2026/0001"},
				{"id": "vi2", "vi_number": "VI/2026/0002", "vendor_name": "CV Bahan Baku Jaya", "vendor_inv_number": "BB-2026-045", "inv_date": "2026-06-05", "due_date": "2026-06-20", "subtotal": 5000000, "tax_amount": 550000, "total": 5550000, "paid_amount": 5550000, "status": "paid", "po_number": ""},
				{"id": "vi3", "vi_number": "VI/2026/0003", "vendor_name": "PT Komponen Industri", "vendor_inv_number": "KI/VI/0078", "inv_date": "2026-06-10", "due_date": "2026-06-25", "subtotal": 15000000, "tax_amount": 1650000, "total": 16650000, "paid_amount": 8000000, "status": "partial", "po_number": ""},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT vi.id, vi.vi_number, COALESCE(vi.vendor_name,''), COALESCE(vi.vendor_inv_number,''),
		        vi.inv_date, vi.due_date, vi.subtotal, vi.tax_amount, vi.total, vi.paid_amount,
		        vi.status, COALESCE(vi.notes,''), vi.created_at, COALESCE(po.po_number,'') as po_number
		 FROM vendor_invoices vi
		 LEFT JOIN purchase_orders po ON po.id = vi.po_id
		 WHERE vi.company_id=$1 ORDER BY vi.inv_date DESC`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, viNumber, vendorName, vendorInvNum, status, notes, poNumber string
		var invDate, dueDate time.Time
		var subtotal, taxAmount, total, paidAmount int64
		var createdAt time.Time
		rows.Scan(&id, &viNumber, &vendorName, &vendorInvNum, &invDate, &dueDate,
			&subtotal, &taxAmount, &total, &paidAmount, &status, &notes, &createdAt, &poNumber)
		list = append(list, gin.H{
			"id": id, "vi_number": viNumber, "vendor_name": vendorName,
			"vendor_inv_number": vendorInvNum, "inv_date": invDate.Format("2006-01-02"),
			"due_date": dueDate.Format("2006-01-02"), "subtotal": subtotal,
			"tax_amount": taxAmount, "total": total, "paid_amount": paidAmount,
			"status": status, "notes": notes, "po_number": poNumber,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreateVendorInvoice(c *gin.Context) {
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var body struct {
		POID         string `json:"po_id"`
		VendorID     string `json:"vendor_id"`
		VendorName   string `json:"vendor_name"`
		VendorInvNum string `json:"vendor_inv_number"`
		InvDate      string `json:"inv_date"`
		DueDate      string `json:"due_date"`
		Subtotal     int64  `json:"subtotal"`
		TaxAmount    int64  `json:"tax_amount"`
		Total        int64  `json:"total"`
		Notes        string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "Vendor invoice dibuat (demo)"})
		return
	}
	var count int
	database.DB.QueryRow(`SELECT COUNT(*) FROM vendor_invoices WHERE company_id=$1`, companyID).Scan(&count)
	viNumber := fmt.Sprintf("VI/%s/%04d", time.Now().Format("2006"), count+1)

	var id string
	err := database.DB.QueryRow(
		`INSERT INTO vendor_invoices (company_id, vi_number, po_id, vendor_id, vendor_name, vendor_inv_number, inv_date, due_date, subtotal, tax_amount, total, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
		companyID, viNumber, nilIfEmpty(body.POID), nilIfEmpty(body.VendorID),
		body.VendorName, body.VendorInvNum, body.InvDate, body.DueDate,
		body.Subtotal, body.TaxAmount, body.Total, userID,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "create", "vendor_invoice", id, "VI created: "+viNumber, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"id": id, "vi_number": viNumber, "message": "Vendor invoice berhasil dibuat"})
}

func UpdateVIStatus(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Status updated (demo)"})
		return
	}
	_, err := database.DB.Exec(`UPDATE vendor_invoices SET status=$1 WHERE id=$2`, body.Status, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status diperbarui"})
}

// ─── Payments Out (AP Payment) ────────────────────────────────────────────────

func GetPaymentsOut(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 2,
			"value": []gin.H{
				{"id": "po1", "vendor_name": "CV Bahan Baku Jaya", "payment_date": "2026-06-10", "amount": 5550000, "method": "transfer", "reference": "TRF-001", "bank_name": "BCA", "vi_number": "VI/2026/0002"},
				{"id": "po2", "vendor_name": "PT Supplier Utama", "payment_date": "2026-06-15", "amount": 5000000, "method": "transfer", "reference": "TRF-002", "bank_name": "Mandiri", "vi_number": ""},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT p.id, COALESCE(p.vendor_name,''), p.payment_date, p.amount, p.method,
		        COALESCE(p.reference,''), COALESCE(p.notes,''), p.created_at,
		        COALESCE(b.name,'') as bank_name, COALESCE(vi.vi_number,'') as vi_number
		 FROM payments_out p
		 LEFT JOIN bank_accounts b ON b.id = p.bank_account_id
		 LEFT JOIN vendor_invoices vi ON vi.id = p.vendor_invoice_id
		 WHERE p.company_id=$1 ORDER BY p.payment_date DESC`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, vendorName, method, reference, notes, bankName, viNumber string
		var paymentDate time.Time
		var amount int64
		var createdAt time.Time
		rows.Scan(&id, &vendorName, &paymentDate, &amount, &method, &reference, &notes, &createdAt, &bankName, &viNumber)
		list = append(list, gin.H{
			"id": id, "vendor_name": vendorName, "payment_date": paymentDate.Format("2006-01-02"),
			"amount": amount, "method": method, "reference": reference,
			"notes": notes, "bank_name": bankName, "vi_number": viNumber,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreatePaymentOut(c *gin.Context) {
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var body struct {
		BankAccountID   string `json:"bank_account_id"`
		VendorInvoiceID string `json:"vendor_invoice_id"`
		VendorName      string `json:"vendor_name"`
		PaymentDate     string `json:"payment_date"`
		Amount          int64  `json:"amount"`
		Method          string `json:"method"`
		Reference       string `json:"reference"`
		Notes           string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "Pembayaran keluar dicatat (demo)"})
		return
	}
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	var id string
	err = tx.QueryRow(
		`INSERT INTO payments_out (company_id, bank_account_id, vendor_invoice_id, vendor_name, payment_date, amount, method, reference, notes, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
		companyID, nilIfEmpty(body.BankAccountID), nilIfEmpty(body.VendorInvoiceID),
		body.VendorName, body.PaymentDate, body.Amount, body.Method, body.Reference, body.Notes, userID,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if body.VendorInvoiceID != "" {
		tx.Exec(
			`UPDATE vendor_invoices SET paid_amount = paid_amount + $1,
			 status = CASE WHEN paid_amount + $1 >= total THEN 'paid' ELSE 'partial' END
			 WHERE id = $2`, body.Amount, body.VendorInvoiceID)
	}
	if body.BankAccountID != "" {
		tx.Exec(`UPDATE bank_accounts SET balance = balance - $1 WHERE id = $2`, body.Amount, body.BankAccountID)
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "create", "payment_out", id, "Payment out: "+body.VendorName, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Pembayaran keluar berhasil dicatat"})
}

// ─── Payments In (AR Collection) ─────────────────────────────────────────────

func GetPaymentsIn(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 2,
			"value": []gin.H{
				{"id": "pin1", "customer_name": "PT Maju Bersama", "payment_date": "2026-06-12", "amount": 25000000, "method": "transfer", "reference": "TRF-INB-001", "bank_name": "BCA", "inv_number": "INV/2026/0001"},
				{"id": "pin2", "customer_name": "CV Toko Elektronik", "payment_date": "2026-06-18", "amount": 15000000, "method": "giro", "reference": "GR-100", "bank_name": "Mandiri", "inv_number": ""},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT p.id, COALESCE(p.customer_name,''), p.payment_date, p.amount, p.method,
		        COALESCE(p.reference,''), COALESCE(p.notes,''), p.created_at,
		        COALESCE(b.name,'') as bank_name, COALESCE(ci.inv_number,'') as inv_number
		 FROM payments_in p
		 LEFT JOIN bank_accounts b ON b.id = p.bank_account_id
		 LEFT JOIN customer_invoices ci ON ci.id = p.customer_invoice_id
		 WHERE p.company_id=$1 ORDER BY p.payment_date DESC`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, customerName, method, reference, notes, bankName, invNumber string
		var paymentDate time.Time
		var amount int64
		var createdAt time.Time
		rows.Scan(&id, &customerName, &paymentDate, &amount, &method, &reference, &notes, &createdAt, &bankName, &invNumber)
		list = append(list, gin.H{
			"id": id, "customer_name": customerName, "payment_date": paymentDate.Format("2006-01-02"),
			"amount": amount, "method": method, "reference": reference,
			"notes": notes, "bank_name": bankName, "inv_number": invNumber,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreatePaymentIn(c *gin.Context) {
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var body struct {
		BankAccountID     string `json:"bank_account_id"`
		CustomerInvoiceID string `json:"customer_invoice_id"`
		CustomerName      string `json:"customer_name"`
		PaymentDate       string `json:"payment_date"`
		Amount            int64  `json:"amount"`
		Method            string `json:"method"`
		Reference         string `json:"reference"`
		Notes             string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "Penerimaan dicatat (demo)"})
		return
	}
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	var id string
	err = tx.QueryRow(
		`INSERT INTO payments_in (company_id, bank_account_id, customer_invoice_id, customer_name, payment_date, amount, method, reference, notes, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
		companyID, nilIfEmpty(body.BankAccountID), nilIfEmpty(body.CustomerInvoiceID),
		body.CustomerName, body.PaymentDate, body.Amount, body.Method, body.Reference, body.Notes, userID,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if body.CustomerInvoiceID != "" {
		tx.Exec(
			`UPDATE customer_invoices SET paid_amount = paid_amount + $1,
			 status = CASE WHEN paid_amount + $1 >= total THEN 'paid' ELSE 'partial' END
			 WHERE id = $2`, body.Amount, body.CustomerInvoiceID)
	}
	if body.BankAccountID != "" {
		tx.Exec(`UPDATE bank_accounts SET balance = balance + $1 WHERE id = $2`, body.Amount, body.BankAccountID)
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "create", "payment_in", id, "Payment in: "+body.CustomerName, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Penerimaan berhasil dicatat"})
}

// ─── Reports ──────────────────────────────────────────────────────────────────

func GetAgingAP(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 3,
			"value": []gin.H{
				{"vendor_name": "PT Supplier Utama", "vi_number": "VI/2026/0001", "inv_date": "2026-06-01", "due_date": "2026-07-01", "outstanding": 11100000, "aging_bucket": "current"},
				{"vendor_name": "PT Komponen Industri", "vi_number": "VI/2026/0003", "inv_date": "2026-06-10", "due_date": "2026-06-15", "outstanding": 8650000, "aging_bucket": "1-30"},
				{"vendor_name": "PT Bahan Kimia", "vi_number": "VI/2026/0004", "inv_date": "2026-03-01", "due_date": "2026-04-01", "outstanding": 5000000, "aging_bucket": ">90"},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT vendor_name, vi_number, inv_date, due_date, (total - paid_amount) AS outstanding,
		 CASE
		   WHEN due_date >= NOW()::date THEN 'current'
		   WHEN (NOW()::date - due_date) <= 30 THEN '1-30'
		   WHEN (NOW()::date - due_date) <= 60 THEN '31-60'
		   WHEN (NOW()::date - due_date) <= 90 THEN '61-90'
		   ELSE '>90'
		 END AS aging_bucket
		 FROM vendor_invoices
		 WHERE company_id=$1 AND status NOT IN ('paid','cancelled') AND total > paid_amount
		 ORDER BY due_date`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var vendorName, viNumber, agingBucket string
		var invDate, dueDate time.Time
		var outstanding int64
		rows.Scan(&vendorName, &viNumber, &invDate, &dueDate, &outstanding, &agingBucket)
		list = append(list, gin.H{
			"vendor_name": vendorName, "vi_number": viNumber,
			"inv_date": invDate.Format("2006-01-02"), "due_date": dueDate.Format("2006-01-02"),
			"outstanding": outstanding, "aging_bucket": agingBucket,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func GetAgingAR(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 3,
			"value": []gin.H{
				{"customer_name": "PT Maju Bersama", "inv_number": "INV/2026/0001", "inv_date": "2026-06-10", "due_date": "2026-07-10", "outstanding": 15000000, "aging_bucket": "current"},
				{"customer_name": "CV Toko Elektronik", "inv_number": "INV/2026/0002", "inv_date": "2026-05-20", "due_date": "2026-06-20", "outstanding": 8000000, "aging_bucket": "1-30"},
				{"customer_name": "PT Distributor Nusantara", "inv_number": "INV/2026/0003", "inv_date": "2026-03-15", "due_date": "2026-04-15", "outstanding": 22000000, "aging_bucket": ">90"},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT customer_name, inv_number, date, due_date, (total - paid_amount) AS outstanding,
		 CASE
		   WHEN due_date >= NOW()::date THEN 'current'
		   WHEN (NOW()::date - due_date) <= 30 THEN '1-30'
		   WHEN (NOW()::date - due_date) <= 60 THEN '31-60'
		   WHEN (NOW()::date - due_date) <= 90 THEN '61-90'
		   ELSE '>90'
		 END AS aging_bucket
		 FROM customer_invoices
		 WHERE company_id=$1 AND status NOT IN ('paid','cancelled') AND total > paid_amount
		 ORDER BY due_date`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var customerName, invNumber, agingBucket string
		var invDate, dueDate time.Time
		var outstanding int64
		rows.Scan(&customerName, &invNumber, &invDate, &dueDate, &outstanding, &agingBucket)
		list = append(list, gin.H{
			"customer_name": customerName, "inv_number": invNumber,
			"inv_date": invDate.Format("2006-01-02"), "due_date": dueDate.Format("2006-01-02"),
			"outstanding": outstanding, "aging_bucket": agingBucket,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func GetCashPosition(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"accounts": []gin.H{
				{"name": "Kas Utama BCA", "bank_name": "BCA", "account_number": "123-456-7890", "currency": "IDR", "balance": 250000000},
				{"name": "Operasional Mandiri", "bank_name": "Mandiri", "account_number": "987-654-3210", "currency": "IDR", "balance": 150000000},
				{"name": "Kas BNI", "bank_name": "BNI", "account_number": "111-222-3333", "currency": "IDR", "balance": 75000000},
			},
			"total_balance":     475000000,
			"total_payables":    24750000,
			"total_receivables": 45000000,
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT name, bank_name, account_number, currency, balance
		 FROM bank_accounts WHERE company_id=$1 AND is_active=TRUE ORDER BY name`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var accounts []gin.H
	var totalBalance int64
	for rows.Next() {
		var name, bankName, accNum, currency string
		var balance int64
		rows.Scan(&name, &bankName, &accNum, &currency, &balance)
		accounts = append(accounts, gin.H{"name": name, "bank_name": bankName, "account_number": accNum, "currency": currency, "balance": balance})
		totalBalance += balance
	}
	if accounts == nil {
		accounts = []gin.H{}
	}
	var totalPayables, totalReceivables int64
	database.DB.QueryRow(
		`SELECT COALESCE(SUM(total - paid_amount),0) FROM vendor_invoices WHERE company_id=$1 AND status NOT IN ('paid','cancelled')`, companyID,
	).Scan(&totalPayables)
	database.DB.QueryRow(
		`SELECT COALESCE(SUM(total - paid_amount),0) FROM customer_invoices WHERE company_id=$1 AND status NOT IN ('paid','cancelled')`, companyID,
	).Scan(&totalReceivables)

	c.JSON(http.StatusOK, gin.H{
		"accounts":          accounts,
		"total_balance":     totalBalance,
		"total_payables":    totalPayables,
		"total_receivables": totalReceivables,
	})
}
