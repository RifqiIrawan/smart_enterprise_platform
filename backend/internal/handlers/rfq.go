package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetRFQs lists RFQ / Tender documents (PUR-RFQ)
func GetRFQs(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "rfq_number": "RFQ-2026-001", "item_name": "Baja Lembaran 2mm", "qty": 100, "unit": "lembar", "status": "offers_received", "created_at": now.Add(-3 * 24 * time.Hour)},
			{"id": "2", "rfq_number": "RFQ-2026-002", "item_name": "Oli Mesin ISO 46", "qty": 50, "unit": "liter", "status": "sent", "created_at": now.Add(-1 * 24 * time.Hour)},
			{"id": "3", "rfq_number": "RFQ-2026-003", "item_name": "Aluminium Profil", "qty": 200, "unit": "batang", "status": "closed", "created_at": now.Add(-6 * 24 * time.Hour)},
			{"id": "4", "rfq_number": "RFQ-2026-004", "item_name": "ATK Kantor", "qty": 10, "unit": "paket", "status": "draft", "created_at": now.Add(-2 * time.Hour)},
		}
		rows, total := p.ApplyToSlice(demo, []string{"rfq_number", "item_name", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, rfq_number, item_name, qty, unit, status, created_at
		 FROM rfqs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 100`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id, rfqNumber, itemName, unit, status string
		var qty int
		var createdAt time.Time
		rows.Scan(&id, &rfqNumber, &itemName, &qty, &unit, &status, &createdAt)
		items = append(items, gin.H{
			"id": id, "rfq_number": rfqNumber, "item_name": itemName,
			"qty": qty, "unit": unit, "status": status, "created_at": createdAt,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

// CreateRFQ creates an RFQ, optionally sourced from an approved Purchase Request
func CreateRFQ(c *gin.Context) {
	var req struct {
		RFQNumber   string `json:"rfq_number"`
		PRID        string `json:"pr_id"`
		ItemName    string `json:"item_name"`
		Qty         int    `json:"qty"`
		Unit        string `json:"unit"`
		Description string `json:"description"`
		Notes       string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-rfq-id", "rfq_number": req.RFQNumber, "item_name": req.ItemName,
			"qty": req.Qty, "unit": req.Unit, "status": "draft", "created_at": time.Now(),
		}})
		return
	}
	companyID := c.GetString("company_id")
	var prID interface{}
	if req.PRID != "" {
		prID = req.PRID
	}
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO rfqs (company_id, rfq_number, pr_id, item_name, qty, unit, description, notes, status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft') RETURNING id`,
		companyID, req.RFQNumber, prID, req.ItemName, req.Qty, req.Unit, req.Description, req.Notes,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "CREATE", "rfq", id, "RFQ dibuat: "+req.RFQNumber, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id, "rfq_number": req.RFQNumber, "status": "draft"}})
}

// DeleteRFQ removes an RFQ while still in draft
func DeleteRFQ(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(`DELETE FROM rfqs WHERE id=$1 AND company_id=$2 AND status='draft'`, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "DELETE", "rfq", id, "Hapus RFQ", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
}

// SendRFQ dispatches an RFQ to multiple vendors at once
func SendRFQ(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Vendors []struct {
			VendorID   string `json:"vendor_id"`
			VendorName string `json:"vendor_name"`
		} `json:"vendors"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Vendors) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "pilih minimal 1 vendor"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": "sent", "vendor_count": len(req.Vendors)}})
		return
	}
	companyID := c.GetString("company_id")
	for _, v := range req.Vendors {
		database.DB.Exec(
			`INSERT INTO rfq_vendors (rfq_id, vendor_id, vendor_name, status) VALUES ($1,$2,$3,'sent')`,
			id, v.VendorID, v.VendorName,
		)
	}
	database.DB.Exec(`UPDATE rfqs SET status='sent', updated_at=NOW() WHERE id=$1 AND company_id=$2`, id, companyID)
	database.WriteAuditLog(c.GetString("user_id"), "UPDATE", "rfq", id, "RFQ dikirim ke "+strconv.Itoa(len(req.Vendors))+" vendor", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": "sent", "vendor_count": len(req.Vendors)}})
}

// GetRFQVendors lists the vendors an RFQ was sent to
func GetRFQVendors(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		demo := []gin.H{
			{"id": "v1", "vendor_id": "1", "vendor_name": "PT Baja Makmur", "status": "sent"},
			{"id": "v2", "vendor_id": "2", "vendor_name": "PT Alumindo Jaya", "status": "sent"},
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": demo})
		return
	}
	rows, err := database.DB.Query(
		`SELECT id, vendor_id, vendor_name, status FROM rfq_vendors WHERE rfq_id=$1 ORDER BY sent_at`, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var rid, vendorID, vendorName, status string
		rows.Scan(&rid, &vendorID, &vendorName, &status)
		items = append(items, gin.H{"id": rid, "vendor_id": vendorID, "vendor_name": vendorName, "status": status})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

// GetRFQOffers lists vendor offers for comparison, cheapest first
func GetRFQOffers(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		demo := []gin.H{
			{"id": "o1", "vendor_id": "1", "vendor_name": "PT Baja Makmur", "price": 4800000, "lead_time_days": 5, "payment_term": "NET30", "notes": "", "is_winner": false},
			{"id": "o2", "vendor_id": "2", "vendor_name": "PT Alumindo Jaya", "price": 5100000, "lead_time_days": 3, "payment_term": "NET14", "notes": "", "is_winner": false},
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": demo})
		return
	}
	rows, err := database.DB.Query(
		`SELECT id, vendor_id, vendor_name, price, lead_time_days, payment_term, notes, is_winner
		 FROM rfq_offers WHERE rfq_id=$1 ORDER BY price ASC`, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var oid, vendorID, vendorName, paymentTerm, notes string
		var price int64
		var leadTime int
		var isWinner bool
		rows.Scan(&oid, &vendorID, &vendorName, &price, &leadTime, &paymentTerm, &notes, &isWinner)
		items = append(items, gin.H{
			"id": oid, "vendor_id": vendorID, "vendor_name": vendorName, "price": price,
			"lead_time_days": leadTime, "payment_term": paymentTerm, "notes": notes, "is_winner": isWinner,
		})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

// SubmitOffer records a vendor's quotation against an RFQ
func SubmitOffer(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		VendorID     string  `json:"vendor_id"`
		VendorName   string  `json:"vendor_name"`
		Price        float64 `json:"price"`
		LeadTimeDays int     `json:"lead_time_days"`
		PaymentTerm  string  `json:"payment_term"`
		Notes        string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-offer-id", "vendor_name": req.VendorName, "price": req.Price,
			"lead_time_days": req.LeadTimeDays, "payment_term": req.PaymentTerm,
		}})
		return
	}
	var offerID string
	err := database.DB.QueryRow(
		`INSERT INTO rfq_offers (rfq_id, vendor_id, vendor_name, price, lead_time_days, payment_term, notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
		id, req.VendorID, req.VendorName, req.Price, req.LeadTimeDays, req.PaymentTerm, req.Notes,
	).Scan(&offerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.DB.Exec(`UPDATE rfqs SET status='offers_received', updated_at=NOW() WHERE id=$1 AND status IN ('sent','offers_received')`, id)
	database.WriteAuditLog(c.GetString("user_id"), "CREATE", "rfq_offer", offerID, "Penawaran vendor "+req.VendorName+" masuk untuk RFQ", c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": offerID, "vendor_name": req.VendorName, "price": req.Price,
		"lead_time_days": req.LeadTimeDays, "payment_term": req.PaymentTerm,
	}})
}

// SelectRFQWinner picks the winning offer, closes the RFQ, and auto-generates a PO
func SelectRFQWinner(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		OfferID      string `json:"offer_id"`
		DeliveryDate string `json:"delivery_date"`
		Notes        string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.OfferID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "offer_id wajib diisi"})
		return
	}
	if database.DB == nil {
		poNumber := "PO-AUTO-" + time.Now().Format("0102150405")
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-po-id", "po_number": poNumber, "status": "pending",
			"order_date": time.Now().Format("2006-01-02"), "delivery_date": req.DeliveryDate, "from_rfq": id,
		}})
		return
	}
	companyID := c.GetString("company_id")

	var vendorID, vendorName string
	var price int64
	err := database.DB.QueryRow(
		`SELECT vendor_id, vendor_name, price FROM rfq_offers WHERE id=$1 AND rfq_id=$2`,
		req.OfferID, id,
	).Scan(&vendorID, &vendorName, &price)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Penawaran tidak ditemukan"})
		return
	}

	var prID string
	err = database.DB.QueryRow(
		`SELECT COALESCE(pr_id::text, '') FROM rfqs WHERE id=$1 AND company_id=$2`, id, companyID,
	).Scan(&prID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "RFQ tidak ditemukan"})
		return
	}

	poNumber := "PO-" + time.Now().Format("0102150405")
	var poID string
	err = database.DB.QueryRow(
		`INSERT INTO purchase_orders (company_id, po_number, vendor_id, vendor_name, total_amount, delivery_date, notes, status, order_date)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',NOW()) RETURNING id`,
		companyID, poNumber, vendorID, vendorName, price, req.DeliveryDate, req.Notes,
	).Scan(&poID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	database.DB.Exec(`UPDATE rfq_offers SET is_winner=TRUE WHERE id=$1`, req.OfferID)
	database.DB.Exec(`UPDATE rfqs SET status='closed', updated_at=NOW() WHERE id=$1`, id)
	if prID != "" {
		database.DB.Exec(`UPDATE purchase_requests SET status='converted' WHERE id=$1`, prID)
	}
	database.WriteAuditLog(c.GetString("user_id"), "CONVERT", "rfq", id, "RFQ→PO: "+poNumber+" (vendor: "+vendorName+")", c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": poID, "po_number": poNumber, "vendor_name": vendorName,
		"total_amount": price, "status": "pending", "from_rfq": id,
	}})
}
