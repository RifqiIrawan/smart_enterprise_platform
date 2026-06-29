package handlers

import (
	"fmt"
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────

func GetCustomers(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "c1", "code": "CUST-001", "name": "PT Maju Bersama", "city": "Jakarta", "phone": "021-5551234", "email": "info@majubersama.co.id", "category": "distributor", "status": "active", "credit_limit": 500000000, "payment_term": 30},
			{"id": "c2", "code": "CUST-002", "name": "CV Sukses Mandiri", "city": "Bandung", "phone": "022-7773456", "email": "order@suksesmandiri.com", "category": "retailer", "status": "active", "credit_limit": 100000000, "payment_term": 14},
			{"id": "c3", "code": "CUST-003", "name": "PT Global Teknindo", "city": "Surabaya", "phone": "031-8882345", "email": "purchase@globalteknindo.id", "category": "distributor", "status": "active", "credit_limit": 750000000, "payment_term": 45},
			{"id": "c4", "code": "CUST-004", "name": "UD Berkah Jaya", "city": "Semarang", "phone": "024-3334567", "email": "udberkah@gmail.com", "category": "regular", "status": "active", "credit_limit": 50000000, "payment_term": 7},
			{"id": "c5", "code": "CUST-005", "name": "PT Nusantara Industri", "city": "Medan", "phone": "061-4445678", "email": "procurement@nusanindo.co.id", "category": "distributor", "status": "active", "credit_limit": 300000000, "payment_term": 30},
		}
		rows, total := p.ApplyToSlice(demo, []string{"name", "code", "city", "email"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, COALESCE(code,''), name, COALESCE(npwp,''), COALESCE(address,''), COALESCE(city,''),
		 COALESCE(phone,''), COALESCE(email,''), credit_limit, payment_term, category, status, created_at
		 FROM customers WHERE company_id = $1 ORDER BY name`, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, code, name, npwp, address, city, phone, email, category, status string
		var creditLimit int64
		var paymentTerm int
		var createdAt time.Time
		rows.Scan(&id, &code, &name, &npwp, &address, &city, &phone, &email, &creditLimit, &paymentTerm, &category, &status, &createdAt)
		items = append(items, gin.H{
			"id": id, "code": code, "name": name, "npwp": npwp, "address": address,
			"city": city, "phone": phone, "email": email, "credit_limit": creditLimit,
			"payment_term": paymentTerm, "category": category, "status": status, "created_at": createdAt,
		})
	}
	if items == nil {
		items = []gin.H{}
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateCustomer(c *gin.Context) {
	var req gin.H
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		req["id"] = fmt.Sprintf("c-%d", time.Now().UnixMilli())
		req["created_at"] = time.Now()
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO customers (company_id, code, name, npwp, address, city, phone, email, credit_limit, payment_term, category)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
		companyID, req["code"], req["name"], req["npwp"], req["address"], req["city"],
		req["phone"], req["email"], req["credit_limit"], req["payment_term"], req["category"],
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "CREATE", "customer", id, fmt.Sprintf("Customer baru: %v", req["name"]), c.ClientIP())
	req["id"] = id
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
}

func UpdateCustomer(c *gin.Context) {
	id := c.Param("id")
	var req gin.H
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		req["id"] = id
		c.JSON(http.StatusOK, gin.H{"success": true, "data": req})
		return
	}
	userID := c.GetString("user_id")
	_, err := database.DB.Exec(
		`UPDATE customers SET code=$1, name=$2, npwp=$3, address=$4, city=$5, phone=$6,
		 email=$7, credit_limit=$8, payment_term=$9, category=$10, status=$11 WHERE id=$12`,
		req["code"], req["name"], req["npwp"], req["address"], req["city"], req["phone"],
		req["email"], req["credit_limit"], req["payment_term"], req["category"], req["status"], id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "UPDATE", "customer", id, fmt.Sprintf("Customer diupdate: %v", req["name"]), c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "data": req})
}

func DeleteCustomer(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	userID := c.GetString("user_id")
	_, err := database.DB.Exec(`DELETE FROM customers WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "DELETE", "customer", id, "Customer dihapus", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ─── SALES ORDERS ────────────────────────────────────────────────────────────

func GetSalesOrders(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "so1", "so_number": "SO/2026/001", "customer_name": "PT Maju Bersama", "date": "2026-06-20", "delivery_date": "2026-06-30", "subtotal": int64(45000000), "tax_amount": int64(4950000), "total": int64(49950000), "status": "approved", "created_at": now.AddDate(0, 0, -7)},
			{"id": "so2", "so_number": "SO/2026/002", "customer_name": "CV Sukses Mandiri", "date": "2026-06-22", "delivery_date": "2026-07-05", "subtotal": int64(28500000), "tax_amount": int64(3135000), "total": int64(31635000), "status": "confirmed", "created_at": now.AddDate(0, 0, -5)},
			{"id": "so3", "so_number": "SO/2026/003", "customer_name": "PT Global Teknindo", "date": "2026-06-24", "delivery_date": "2026-07-10", "subtotal": int64(67000000), "tax_amount": int64(7370000), "total": int64(74370000), "status": "draft", "created_at": now.AddDate(0, 0, -3)},
			{"id": "so4", "so_number": "SO/2026/004", "customer_name": "PT Nusantara Industri", "date": "2026-06-25", "delivery_date": "2026-07-15", "subtotal": int64(120000000), "tax_amount": int64(13200000), "total": int64(133200000), "status": "delivered", "created_at": now.AddDate(0, 0, -2)},
			{"id": "so5", "so_number": "SO/2026/005", "customer_name": "UD Berkah Jaya", "date": "2026-06-27", "delivery_date": "2026-07-03", "subtotal": int64(15000000), "tax_amount": int64(1650000), "total": int64(16650000), "status": "draft", "created_at": now},
		}
		rows, total := p.ApplyToSlice(demo, []string{"so_number", "customer_name"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, so_number, COALESCE(customer_name,''), TO_CHAR(date,'YYYY-MM-DD'),
		 COALESCE(TO_CHAR(delivery_date,'YYYY-MM-DD'),''), subtotal, tax_amount, total,
		 status, COALESCE(notes,''), COALESCE(approved_by,''), created_at
		 FROM sales_orders WHERE company_id = $1 ORDER BY created_at DESC`, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, soNumber, customerName, date, deliveryDate, status, notes, approvedBy string
		var subtotal, taxAmount, total int64
		var createdAt time.Time
		rows.Scan(&id, &soNumber, &customerName, &date, &deliveryDate, &subtotal, &taxAmount, &total, &status, &notes, &approvedBy, &createdAt)
		items = append(items, gin.H{
			"id": id, "so_number": soNumber, "customer_name": customerName, "date": date,
			"delivery_date": deliveryDate, "subtotal": subtotal, "tax_amount": taxAmount,
			"total": total, "status": status, "notes": notes, "approved_by": approvedBy, "created_at": createdAt,
		})
	}
	if items == nil {
		items = []gin.H{}
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func GetSalesOrderDetail(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
			"id": id, "so_number": "SO/2026/001", "customer_name": "PT Maju Bersama",
			"status": "approved", "total": int64(49950000),
			"items": []gin.H{
				{"product_name": "Produk A", "qty": 10.0, "unit": "pcs", "unit_price": int64(2000000), "amount": int64(20000000)},
				{"product_name": "Produk B", "qty": 5.0, "unit": "pcs", "unit_price": int64(5000000), "amount": int64(25000000)},
			},
		}})
		return
	}
	var soNumber, customerName, date, deliveryDate, status, notes, approvedBy string
	var subtotal, taxAmount, total int64
	var createdAt time.Time
	err := database.DB.QueryRow(
		`SELECT so_number, COALESCE(customer_name,''), TO_CHAR(date,'YYYY-MM-DD'),
		 COALESCE(TO_CHAR(delivery_date,'YYYY-MM-DD'),''), subtotal, tax_amount, total,
		 status, COALESCE(notes,''), COALESCE(approved_by,''), created_at
		 FROM sales_orders WHERE id = $1`, id,
	).Scan(&soNumber, &customerName, &date, &deliveryDate, &subtotal, &taxAmount, &total, &status, &notes, &approvedBy, &createdAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "SO tidak ditemukan"})
		return
	}
	// Fetch items
	itemRows, _ := database.DB.Query(
		`SELECT id, COALESCE(product_name,''), qty, COALESCE(unit,'pcs'), unit_price, COALESCE(discount,0), amount
		 FROM sales_order_items WHERE so_id = $1`, id,
	)
	defer itemRows.Close()
	var items []gin.H
	for itemRows.Next() {
		var itemID, productName, unit string
		var qty, discount float64
		var unitPrice, amount int64
		itemRows.Scan(&itemID, &productName, &qty, &unit, &unitPrice, &discount, &amount)
		items = append(items, gin.H{
			"id": itemID, "product_name": productName, "qty": qty, "unit": unit,
			"unit_price": unitPrice, "discount": discount, "amount": amount,
		})
	}
	if items == nil {
		items = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"id": id, "so_number": soNumber, "customer_name": customerName, "date": date,
		"delivery_date": deliveryDate, "subtotal": subtotal, "tax_amount": taxAmount,
		"total": total, "status": status, "notes": notes, "approved_by": approvedBy,
		"created_at": createdAt, "items": items,
	}})
}

func CreateSalesOrder(c *gin.Context) {
	var req struct {
		CustomerID   string   `json:"customer_id"`
		CustomerName string   `json:"customer_name"`
		Date         string   `json:"date"`
		DeliveryDate string   `json:"delivery_date"`
		Notes        string   `json:"notes"`
		Items        []gin.H  `json:"items"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		soNum := fmt.Sprintf("SO/2026/%03d", time.Now().UnixMilli()%999)
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": fmt.Sprintf("so-%d", time.Now().UnixMilli()), "so_number": soNum,
			"customer_name": req.CustomerName, "status": "draft",
		}})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")

	// Generate SO number
	var count int
	database.DB.QueryRow(`SELECT COUNT(*) FROM sales_orders WHERE company_id = $1`, companyID).Scan(&count)
	soNumber := fmt.Sprintf("SO/%s/%04d", time.Now().Format("2006"), count+1)

	// Calculate totals
	var subtotal int64
	for _, item := range req.Items {
		if amt, ok := item["amount"]; ok {
			switch v := amt.(type) {
			case float64:
				subtotal += int64(v)
			case int64:
				subtotal += v
			}
		}
	}
	taxAmount := subtotal * 11 / 100
	total := subtotal + taxAmount

	// Begin transaction
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer tx.Rollback()

	var soID string
	err = tx.QueryRow(
		`INSERT INTO sales_orders (company_id, so_number, customer_id, customer_name, date, delivery_date,
		 subtotal, tax_amount, total, notes, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
		companyID, soNumber, nilIfEmpty(req.CustomerID), req.CustomerName, req.Date,
		nilIfEmpty(req.DeliveryDate), subtotal, taxAmount, total, req.Notes, nilIfEmpty(userID),
	).Scan(&soID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	// Insert items
	for _, item := range req.Items {
		tx.Exec(
			`INSERT INTO sales_order_items (so_id, product_name, qty, unit, unit_price, discount, amount)
			 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
			soID, item["product_name"], item["qty"], item["unit"], item["unit_price"], item["discount"], item["amount"],
		)
	}

	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "CREATE", "sales_order", soID, "Sales Order baru: "+soNumber, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": soID, "so_number": soNumber, "customer_name": req.CustomerName,
		"subtotal": subtotal, "tax_amount": taxAmount, "total": total, "status": "draft",
	}})
}

func UpdateSOStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	validStatuses := map[string]bool{
		"draft": true, "confirmed": true, "approved": true,
		"delivered": true, "invoiced": true, "cancelled": true,
	}
	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "status tidak valid"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status}})
		return
	}
	userID := c.GetString("user_id")
	userName := c.GetString("user_name")
	var query string
	var args []interface{}
	if req.Status == "approved" {
		query = `UPDATE sales_orders SET status=$1, approved_by=$2, updated_at=NOW() WHERE id=$3`
		args = []interface{}{req.Status, userName, id}
	} else {
		query = `UPDATE sales_orders SET status=$1, updated_at=NOW() WHERE id=$2`
		args = []interface{}{req.Status, id}
	}
	_, err := database.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "UPDATE", "sales_order", id, "Status SO diubah ke: "+req.Status, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status}})
}

func DeleteSalesOrder(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	userID := c.GetString("user_id")
	// Only allow delete if still draft
	var status string
	database.DB.QueryRow(`SELECT status FROM sales_orders WHERE id = $1`, id).Scan(&status)
	if status != "draft" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Hanya SO berstatus draft yang bisa dihapus"})
		return
	}
	_, err := database.DB.Exec(`DELETE FROM sales_orders WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "DELETE", "sales_order", id, "Sales Order dihapus", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ─── DELIVERY ORDERS ─────────────────────────────────────────────────────────

func GetDeliveryOrders(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "do1", "do_number": "DO/2026/001", "so_number": "SO/2026/001", "customer_name": "PT Maju Bersama", "date": "2026-06-28", "status": "confirmed", "created_at": now.AddDate(0, 0, -2)},
			{"id": "do2", "do_number": "DO/2026/002", "so_number": "SO/2026/004", "customer_name": "PT Nusantara Industri", "date": "2026-06-27", "status": "draft", "created_at": now.AddDate(0, 0, -1)},
		}
		rows, total := p.ApplyToSlice(demo, []string{"do_number", "so_number", "customer_name"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT d.id, d.do_number, COALESCE(s.so_number,''), COALESCE(d.customer_name,''),
		 TO_CHAR(d.date,'YYYY-MM-DD'), d.status, d.created_at
		 FROM delivery_orders d
		 LEFT JOIN sales_orders s ON s.id = d.so_id
		 WHERE d.company_id = $1 ORDER BY d.created_at DESC`, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, doNumber, soNumber, customerName, date, status string
		var createdAt time.Time
		rows.Scan(&id, &doNumber, &soNumber, &customerName, &date, &status, &createdAt)
		items = append(items, gin.H{
			"id": id, "do_number": doNumber, "so_number": soNumber,
			"customer_name": customerName, "date": date, "status": status, "created_at": createdAt,
		})
	}
	if items == nil {
		items = []gin.H{}
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateDelivery(c *gin.Context) {
	var req struct {
		SOId         string  `json:"so_id"`
		SONumber     string  `json:"so_number"`
		CustomerID   string  `json:"customer_id"`
		CustomerName string  `json:"customer_name"`
		Date         string  `json:"date"`
		Notes        string  `json:"notes"`
		Items        []gin.H `json:"items"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		doNum := fmt.Sprintf("DO/2026/%03d", time.Now().UnixMilli()%999)
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": fmt.Sprintf("do-%d", time.Now().UnixMilli()), "do_number": doNum, "status": "draft",
		}})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")

	var count int
	database.DB.QueryRow(`SELECT COUNT(*) FROM delivery_orders WHERE company_id = $1`, companyID).Scan(&count)
	doNumber := fmt.Sprintf("DO/%s/%04d", time.Now().Format("2006"), count+1)

	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer tx.Rollback()

	var doID string
	err = tx.QueryRow(
		`INSERT INTO delivery_orders (company_id, do_number, so_id, customer_id, customer_name, date, notes, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		companyID, doNumber, nilIfEmpty(req.SOId), nilIfEmpty(req.CustomerID),
		req.CustomerName, req.Date, req.Notes, nilIfEmpty(userID),
	).Scan(&doID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}

	// Insert items + decrement inventory
	for _, item := range req.Items {
		productName, _ := item["product_name"].(string)
		deliveredQty, _ := item["delivered_qty"].(float64)
		orderedQty, _ := item["ordered_qty"].(float64)
		unit, _ := item["unit"].(string)
		if unit == "" {
			unit = "pcs"
		}

		tx.Exec(
			`INSERT INTO delivery_order_items (do_id, product_name, ordered_qty, delivered_qty, unit)
			 VALUES ($1,$2,$3,$4,$5)`,
			doID, productName, orderedQty, deliveredQty, unit,
		)

		// Decrement warehouse inventory
		tx.Exec(
			`UPDATE inventory SET qty = GREATEST(0, qty - $1), updated_at = NOW()
			 WHERE company_id = $2 AND LOWER(name) = LOWER($3)`,
			deliveredQty, companyID, productName,
		)

		// Stock movement record
		tx.Exec(
			`INSERT INTO stock_movements (company_id, type, qty, reference, notes, created_by)
			 VALUES ($1,'out',$2,$3,$4,$5)`,
			companyID, int(deliveredQty), "Sales "+doNumber, "Pengiriman ke "+req.CustomerName, nilIfEmpty(userID),
		)
	}

	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "CREATE", "delivery_order", doID, "DO baru: "+doNumber, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": doID, "do_number": doNumber, "customer_name": req.CustomerName, "status": "draft",
	}})
}

func ConfirmDelivery(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": "confirmed"}})
		return
	}
	userID := c.GetString("user_id")
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer tx.Rollback()

	// Update DO status
	var soID string
	tx.QueryRow(`UPDATE delivery_orders SET status='confirmed' WHERE id=$1 RETURNING COALESCE(so_id::text,'')`, id).Scan(&soID)

	// Update linked SO to delivered
	if soID != "" {
		tx.Exec(`UPDATE sales_orders SET status='delivered', updated_at=NOW() WHERE id=$1`, soID)
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "UPDATE", "delivery_order", id, "DO dikonfirmasi", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": "confirmed"}})
}

// ─── CUSTOMER INVOICES ───────────────────────────────────────────────────────

func GetInvoices(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "inv1", "inv_number": "INV/2026/001", "do_number": "DO/2026/001", "customer_name": "PT Maju Bersama", "date": "2026-06-28", "due_date": "2026-07-28", "total": int64(49950000), "paid_amount": int64(0), "status": "unpaid", "created_at": now.AddDate(0, 0, -1)},
			{"id": "inv2", "inv_number": "INV/2026/002", "do_number": "DO/2026/002", "customer_name": "PT Nusantara Industri", "date": "2026-06-27", "due_date": "2026-07-27", "total": int64(133200000), "paid_amount": int64(133200000), "status": "paid", "created_at": now.AddDate(0, 0, -2)},
		}
		rows, total := p.ApplyToSlice(demo, []string{"inv_number", "customer_name"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT i.id, i.inv_number, COALESCE(d.do_number,''), COALESCE(i.customer_name,''),
		 TO_CHAR(i.date,'YYYY-MM-DD'), COALESCE(TO_CHAR(i.due_date,'YYYY-MM-DD'),''),
		 i.subtotal, i.tax_amount, i.total, i.paid_amount, i.status, i.created_at
		 FROM customer_invoices i
		 LEFT JOIN delivery_orders d ON d.id = i.do_id
		 WHERE i.company_id = $1 ORDER BY i.created_at DESC`, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, invNumber, doNumber, customerName, date, dueDate, status string
		var subtotal, taxAmount, total, paidAmount int64
		var createdAt time.Time
		rows.Scan(&id, &invNumber, &doNumber, &customerName, &date, &dueDate, &subtotal, &taxAmount, &total, &paidAmount, &status, &createdAt)
		items = append(items, gin.H{
			"id": id, "inv_number": invNumber, "do_number": doNumber, "customer_name": customerName,
			"date": date, "due_date": dueDate, "subtotal": subtotal, "tax_amount": taxAmount,
			"total": total, "paid_amount": paidAmount, "status": status, "created_at": createdAt,
		})
	}
	if items == nil {
		items = []gin.H{}
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateInvoice(c *gin.Context) {
	var req struct {
		DOId         string `json:"do_id"`
		DONumber     string `json:"do_number"`
		SOId         string `json:"so_id"`
		CustomerID   string `json:"customer_id"`
		CustomerName string `json:"customer_name"`
		Date         string `json:"date"`
		DueDate      string `json:"due_date"`
		Subtotal     int64  `json:"subtotal"`
		TaxAmount    int64  `json:"tax_amount"`
		Total        int64  `json:"total"`
		Notes        string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		invNum := fmt.Sprintf("INV/2026/%03d", time.Now().UnixMilli()%999)
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": fmt.Sprintf("inv-%d", time.Now().UnixMilli()), "inv_number": invNum,
			"customer_name": req.CustomerName, "total": req.Total, "status": "unpaid",
		}})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")

	var count int
	database.DB.QueryRow(`SELECT COUNT(*) FROM customer_invoices WHERE company_id = $1`, companyID).Scan(&count)
	invNumber := fmt.Sprintf("INV/%s/%04d", time.Now().Format("2006"), count+1)

	var invID string
	err := database.DB.QueryRow(
		`INSERT INTO customer_invoices (company_id, inv_number, do_id, so_id, customer_id, customer_name,
		 date, due_date, subtotal, tax_amount, total, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
		companyID, invNumber, nilIfEmpty(req.DOId), nilIfEmpty(req.SOId), nilIfEmpty(req.CustomerID),
		req.CustomerName, req.Date, nilIfEmpty(req.DueDate), req.Subtotal, req.TaxAmount, req.Total,
		nilIfEmpty(userID),
	).Scan(&invID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	// Update SO status to invoiced
	if req.SOId != "" {
		database.DB.Exec(`UPDATE sales_orders SET status='invoiced', updated_at=NOW() WHERE id=$1`, req.SOId)
	}
	database.WriteAuditLog(userID, "CREATE", "customer_invoice", invID, "Invoice baru: "+invNumber, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": invID, "inv_number": invNumber, "customer_name": req.CustomerName,
		"total": req.Total, "status": "unpaid",
	}})
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
