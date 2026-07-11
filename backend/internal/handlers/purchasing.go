package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

func init() {
	RegisterApprovalFinalizer("purchasing", "pr", func(docID, finalStatus string) {
		database.DB.Exec(`UPDATE purchase_requests SET status=$1, updated_at=NOW() WHERE id=$2`, finalStatus, docID)
	})
	RegisterApprovalFinalizer("purchasing", "po", func(docID, finalStatus string) {
		database.DB.Exec(`UPDATE purchase_orders SET status=$1 WHERE id=$2`, finalStatus, docID)
	})
}

func GetPurchaseRequests(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		data := []gin.H{
			{"id": "1", "pr_number": "PR-2847", "requester": "Budi Santoso", "department": "Produksi", "item_name": "Baja Lembaran 2mm", "qty": 100, "unit": "lembar", "estimated_price": 5000000, "status": "pending", "created_at": now.Add(-2 * time.Hour)},
			{"id": "2", "pr_number": "PR-2846", "requester": "Andi Wijaya", "department": "Maintenance", "item_name": "Oli Mesin ISO 46", "qty": 50, "unit": "liter", "estimated_price": 1500000, "status": "approved", "created_at": now.Add(-1 * 24 * time.Hour)},
			{"id": "3", "pr_number": "PR-2845", "requester": "Sari Dewi", "department": "HR", "item_name": "ATK Kantor", "qty": 10, "unit": "paket", "estimated_price": 750000, "status": "rejected", "created_at": now.Add(-2 * 24 * time.Hour)},
			{"id": "4", "pr_number": "PR-2844", "requester": "Deni Purnama", "department": "Produksi", "item_name": "Aluminium Profil", "qty": 200, "unit": "batang", "estimated_price": 12000000, "status": "approved", "created_at": now.Add(-3 * 24 * time.Hour)},
		}
		rows, total := p.ApplyToSlice(data, []string{"pr_number", "requester", "department", "item_name", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, pr_number, requester, department, item_name, qty, unit, estimated_price, status, created_at
		 FROM purchase_requests WHERE company_id = $1 ORDER BY created_at DESC LIMIT 100`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id, prNumber, requester, department, itemName, unit, status string
		var qty int
		var estimatedPrice int64
		var createdAt time.Time
		rows.Scan(&id, &prNumber, &requester, &department, &itemName, &qty, &unit, &estimatedPrice, &status, &createdAt)
		items = append(items, gin.H{
			"id": id, "pr_number": prNumber, "requester": requester, "department": department,
			"item_name": itemName, "qty": qty, "unit": unit, "estimated_price": estimatedPrice,
			"status": status, "created_at": createdAt,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreatePurchaseRequest(c *gin.Context) {
	var req struct {
		PRNumber       string  `json:"pr_number"`
		Requester      string  `json:"requester"`
		Department     string  `json:"department"`
		ItemName       string  `json:"item_name"`
		Qty            int     `json:"qty"`
		Unit           string  `json:"unit"`
		EstimatedPrice float64 `json:"estimated_price"`
		Notes          string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-pr-id", "pr_number": req.PRNumber, "requester": req.Requester,
			"department": req.Department, "item_name": req.ItemName, "qty": req.Qty,
			"unit": req.Unit, "estimated_price": req.EstimatedPrice, "status": "pending",
			"created_at": time.Now(),
		}})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO purchase_requests (company_id, pr_number, requester, department, item_name, qty, unit, estimated_price, notes, status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending') RETURNING id`,
		companyID, req.PRNumber, req.Requester, req.Department, req.ItemName, req.Qty, req.Unit, req.EstimatedPrice, req.Notes,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	status := "pending"
	if _, required, _ := SubmitForApproval(companyID, "purchasing", "pr", id, req.PRNumber, req.EstimatedPrice, userID); required {
		status = "pending_approval"
		database.DB.Exec(`UPDATE purchase_requests SET status='pending_approval' WHERE id=$1`, id)
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id, "status": status}})
}

func UpdatePRStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status  string `json:"status"`
		Remarks string `json:"remarks"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if req.Status != "approved" && req.Status != "rejected" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "status must be 'approved' or 'rejected'"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status, "updated_at": time.Now()}})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(
		`UPDATE purchase_requests SET status = $1, remarks = $2, updated_at = NOW() WHERE id = $3 AND company_id = $4`,
		req.Status, req.Remarks, id, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "UPDATE", "purchase_request", id, "Status PR diubah ke: "+req.Status, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status, "updated_at": time.Now()}})
}

func GetPurchaseOrders(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "po_number": "PO-1234", "vendor_name": "PT Baja Makmur", "total_amount": 15000000, "status": "delivered", "order_date": now.Add(-5 * 24 * time.Hour).Format("2006-01-02"), "delivery_date": now.Add(-1 * 24 * time.Hour).Format("2006-01-02")},
			{"id": "2", "po_number": "PO-1233", "vendor_name": "PT Alumindo Jaya", "total_amount": 24000000, "status": "processing", "order_date": now.Add(-3 * 24 * time.Hour).Format("2006-01-02"), "delivery_date": now.Add(2 * 24 * time.Hour).Format("2006-01-02")},
			{"id": "3", "po_number": "PO-1232", "vendor_name": "CV Kimia Utama", "total_amount": 3750000, "status": "pending", "order_date": now.Add(-1 * 24 * time.Hour).Format("2006-01-02"), "delivery_date": now.Add(7 * 24 * time.Hour).Format("2006-01-02")},
		}
		rows, total := p.ApplyToSlice(demo, []string{"po_number", "vendor_name", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, po_number, vendor_name, total_amount, status, order_date, delivery_date
		 FROM purchase_orders WHERE company_id = $1 ORDER BY created_at DESC LIMIT 100`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id, poNumber, vendorName, status, orderDate, deliveryDate string
		var totalAmount int64
		rows.Scan(&id, &poNumber, &vendorName, &totalAmount, &status, &orderDate, &deliveryDate)
		items = append(items, gin.H{
			"id": id, "po_number": poNumber, "vendor_name": vendorName, "total_amount": totalAmount,
			"status": status, "order_date": orderDate, "delivery_date": deliveryDate,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreatePurchaseOrder(c *gin.Context) {
	var req struct {
		PONumber     string  `json:"po_number"`
		VendorID     string  `json:"vendor_id"`
		VendorName   string  `json:"vendor_name"`
		TotalAmount  float64 `json:"total_amount"`
		DeliveryDate string  `json:"delivery_date"`
		Notes        string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-po-id", "po_number": req.PONumber, "vendor_name": req.VendorName,
			"total_amount": req.TotalAmount, "status": "pending",
			"order_date": time.Now().Format("2006-01-02"), "delivery_date": req.DeliveryDate,
		}})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO purchase_orders (company_id, po_number, vendor_id, vendor_name, total_amount, delivery_date, notes, status, order_date)
		 VALUES ($1,$2,NULLIF($3,'')::uuid,$4,$5,$6,$7,'pending',NOW()) RETURNING id`,
		companyID, req.PONumber, req.VendorID, req.VendorName, req.TotalAmount, req.DeliveryDate, req.Notes,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	status := "pending"
	if _, required, _ := SubmitForApproval(companyID, "purchasing", "po", id, req.PONumber, req.TotalAmount, userID); required {
		status = "pending_approval"
		database.DB.Exec(`UPDATE purchase_orders SET status='pending_approval' WHERE id=$1`, id)
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id, "po_number": req.PONumber, "status": status}})
}

func GetVendors(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "name": "PT Baja Makmur", "category": "Bahan Baku", "contact": "021-5551234", "email": "sales@bajamakmur.com", "rating": 4.5, "status": "active"},
			{"id": "2", "name": "PT Alumindo Jaya", "category": "Bahan Baku", "contact": "021-5552345", "email": "sales@alumindo.com", "rating": 4.2, "status": "active"},
			{"id": "3", "name": "CV Kimia Utama", "category": "Kimia", "contact": "021-5553456", "email": "info@kimiautama.com", "rating": 3.8, "status": "active"},
			{"id": "4", "name": "PT Packaging Indonesia", "category": "Packaging", "contact": "021-5554567", "email": "order@pkging.co.id", "rating": 4.0, "status": "active"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"name", "category", "email", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, name, category, contact, email, rating, status FROM vendors WHERE company_id = $1 ORDER BY name`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id, name, category, contact, email, status string
		var rating float64
		rows.Scan(&id, &name, &category, &contact, &email, &rating, &status)
		items = append(items, gin.H{
			"id": id, "name": name, "category": category, "contact": contact,
			"email": email, "rating": rating, "status": status,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func UpdateVendor(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name     string  `json:"name"`
		Category string  `json:"category"`
		Contact  string  `json:"contact"`
		Email    string  `json:"email"`
		Address  string  `json:"address"`
		Rating   float64 `json:"rating"`
		Status   string  `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "name": req.Name, "status": req.Status}})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(
		`UPDATE vendors SET name=$1, category=$2, contact=$3, email=$4, address=$5, rating=$6, status=$7 WHERE id=$8 AND company_id=$9`,
		req.Name, req.Category, req.Contact, req.Email, req.Address, req.Rating, req.Status, id, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "name": req.Name}})
}

func DeleteVendor(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(`DELETE FROM vendors WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "DELETE", "vendor", id, "Hapus vendor", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
}

func DeletePurchaseRequest(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(`DELETE FROM purchase_requests WHERE id=$1 AND company_id=$2 AND status='pending'`, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "DELETE", "purchase_request", id, "Hapus PR", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
}

func DeletePurchaseOrder(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(`DELETE FROM purchase_orders WHERE id=$1 AND company_id=$2 AND status='pending'`, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "DELETE", "purchase_order", id, "Hapus PO", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
}

// ConvertPRtoPO creates a PO from an approved PR (PUR-02)
func ConvertPRtoPO(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		VendorID     string  `json:"vendor_id"`
		VendorName   string  `json:"vendor_name"`
		UnitPrice    float64 `json:"unit_price"`
		DeliveryDate string  `json:"delivery_date"`
		Notes        string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		poNumber := "PO-AUTO-" + time.Now().Format("0102150405")
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-po-id", "po_number": poNumber, "vendor_name": req.VendorName,
			"status": "pending", "order_date": time.Now().Format("2006-01-02"),
			"delivery_date": req.DeliveryDate, "from_pr": id,
		}})
		return
	}
	companyID := c.GetString("company_id")
	// Get PR details
	var prNumber, itemName, unit string
	var qty int
	var estPrice int64
	err := database.DB.QueryRow(
		`SELECT pr_number, item_name, qty, unit, estimated_price FROM purchase_requests WHERE id=$1 AND company_id=$2 AND status='approved'`,
		id, companyID,
	).Scan(&prNumber, &itemName, &qty, &unit, &estPrice)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "PR tidak ditemukan atau belum diapprove"})
		return
	}
	unitPrice := req.UnitPrice
	if unitPrice == 0 {
		unitPrice = float64(estPrice) / float64(qty)
	}
	totalAmount := unitPrice * float64(qty)
	poNumber := "PO-" + time.Now().Format("0102150405")
	var poID string
	err = database.DB.QueryRow(
		`INSERT INTO purchase_orders (company_id, po_number, vendor_id, vendor_name, total_amount, delivery_date, notes, status, order_date)
		 VALUES ($1,$2,NULLIF($3,'')::uuid,$4,$5,$6,$7,'pending',NOW()) RETURNING id`,
		companyID, poNumber, req.VendorID, req.VendorName, totalAmount, req.DeliveryDate, req.Notes,
	).Scan(&poID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	// Mark PR as converted
	database.DB.Exec(`UPDATE purchase_requests SET status='converted' WHERE id=$1`, id)
	database.WriteAuditLog(c.GetString("user_id"), "CONVERT", "purchase_request", id, "PR→PO: "+poNumber, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": poID, "po_number": poNumber, "vendor_name": req.VendorName,
		"total_amount": totalAmount, "status": "pending", "from_pr": id,
	}})
}

// GetGRN lists Goods Receipt Notes (PUR-03)
func GetGRN(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "po_number": "PO-1234", "vendor_name": "PT Baja Makmur", "received_qty": 100, "received_date": now.Add(-1 * 24 * time.Hour).Format("2006-01-02"), "condition": "good", "received_by": "Budi Santoso", "notes": "Barang sesuai PO"},
			{"id": "2", "po_number": "PO-1233", "vendor_name": "PT Alumindo Jaya", "received_qty": 180, "received_date": now.Format("2006-01-02"), "condition": "partial", "received_by": "Deni Purnama", "notes": "20 unit rusak, dikembalikan"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"po_number", "vendor_name", "condition", "received_by"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	rows, err := database.DB.Query(
		`SELECT gr.id, po.po_number, po.vendor_name, gr.received_qty, gr.received_date, gr.condition, gr.received_by, gr.notes
		 FROM goods_receipts gr JOIN purchase_orders po ON po.id = gr.po_id
		 ORDER BY gr.created_at DESC LIMIT 100`,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, poNumber, vendorName, receivedDate, condition, receivedBy, notes string
		var receivedQty int
		rows.Scan(&id, &poNumber, &vendorName, &receivedQty, &receivedDate, &condition, &receivedBy, &notes)
		items = append(items, gin.H{
			"id": id, "po_number": poNumber, "vendor_name": vendorName,
			"received_qty": receivedQty, "received_date": receivedDate,
			"condition": condition, "received_by": receivedBy, "notes": notes,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

// CreateGRN records a goods receipt and auto-updates inventory (PUR-03 + PUR-04)
func CreateGRN(c *gin.Context) {
	var req struct {
		POID         string `json:"po_id"`
		ReceivedQty  int    `json:"received_qty"`
		ReceivedDate string `json:"received_date"`
		Condition    string `json:"condition"`
		ReceivedBy   string `json:"received_by"`
		Notes        string `json:"notes"`
		InventoryID  string `json:"inventory_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if req.Condition == "" {
		req.Condition = "good"
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-grn-id", "po_id": req.POID, "received_qty": req.ReceivedQty,
			"received_date": req.ReceivedDate, "condition": req.Condition,
			"received_by": req.ReceivedBy, "message": "Stok inventori diperbarui (demo mode)",
		}})
		return
	}
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO goods_receipts (po_id, received_qty, received_date, condition, notes, received_by)
		 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		req.POID, req.ReceivedQty, req.ReceivedDate, req.Condition, req.Notes, req.ReceivedBy,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	// PUR-04: auto update inventory if inventory_id provided
	if req.InventoryID != "" {
		if _, err := database.DB.Exec(
			`UPDATE inventory SET qty = qty + $1, updated_at = NOW() WHERE id = $2`,
			req.ReceivedQty, req.InventoryID,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "GRN tercatat tapi gagal update stok: " + err.Error()})
			return
		}
		if _, err := database.DB.Exec(
			`INSERT INTO stock_movements (inventory_id, type, qty, reference, notes, created_by) VALUES ($1,'in',$2,$3,'GRN dari PO',$4)`,
			req.InventoryID, req.ReceivedQty, req.POID, c.GetString("user_id"),
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "GRN tercatat tapi gagal catat pergerakan stok: " + err.Error()})
			return
		}
	}
	// Update PO status
	if _, err := database.DB.Exec(`UPDATE purchase_orders SET status='delivered' WHERE id=$1`, req.POID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "GRN tercatat tapi gagal update status PO: " + err.Error()})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "CREATE", "goods_receipt", id, "GRN untuk PO: "+req.POID, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": id, "po_id": req.POID, "received_qty": req.ReceivedQty, "status": "received",
	}})
}

func CreateVendor(c *gin.Context) {
	var req struct {
		Name     string  `json:"name"`
		Category string  `json:"category"`
		Contact  string  `json:"contact"`
		Email    string  `json:"email"`
		Address  string  `json:"address"`
		Rating   float64 `json:"rating"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-vendor-id", "name": req.Name, "category": req.Category,
			"contact": req.Contact, "email": req.Email, "status": "active",
			"rating": req.Rating, "created_at": time.Now(),
		}})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO vendors (company_id, name, category, contact, email, address, rating, status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,'active') RETURNING id`,
		companyID, req.Name, req.Category, req.Contact, req.Email, req.Address, req.Rating,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": id, "name": req.Name, "category": req.Category, "status": "active",
	}})
}
