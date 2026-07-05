package handlers

import (
	"fmt"
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Customer Portal ──────────────────────────────────────────────────────────

func GetPortalCustomers(c *gin.Context) {
	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT COALESCE(code, id::text), name, COALESCE(email,''), COALESCE(phone,'')
			FROM customers
			WHERE company_id=(SELECT id FROM companies LIMIT 1) AND status='active'
			ORDER BY name`)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			for rows.Next() {
				var id, name, email, phone string
				if rows.Scan(&id, &name, &email, &phone) == nil {
					result = append(result, gin.H{"id": id, "name": name, "email": email, "phone": phone})
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "value": result})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "value": []gin.H{
		{"id": "CUST-001", "name": "PT Maju Bersama", "email": "order@majubersama.co.id", "phone": "021-5551234"},
		{"id": "CUST-002", "name": "CV Teknologi Maju", "email": "procurement@tekmaju.com", "phone": "021-5559876"},
		{"id": "CUST-003", "name": "PT Nusantara Indah", "email": "purchasing@nusantara.id", "phone": "021-5558765"},
		{"id": "CUST-004", "name": "PT Global Solusi", "email": "buy@globalsolusi.co.id", "phone": "021-5557654"},
	}})
}

func GetPortalVendors(c *gin.Context) {
	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT COALESCE(code, id::text), name, COALESCE(email,''), COALESCE(contact,'')
			FROM vendors
			WHERE company_id=(SELECT id FROM companies LIMIT 1) AND status='active'
			ORDER BY name`)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			for rows.Next() {
				var id, name, email, phone string
				if rows.Scan(&id, &name, &email, &phone) == nil {
					result = append(result, gin.H{"id": id, "name": name, "email": email, "phone": phone})
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "value": result})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "value": []gin.H{
		{"id": "VND-001", "name": "CV Sukses Jaya", "email": "sales@suksesjaya.com", "phone": "021-5554321"},
		{"id": "VND-002", "name": "PT Bahan Prima", "email": "order@bahanprima.co.id", "phone": "021-5553456"},
		{"id": "VND-003", "name": "UD Karya Mandiri", "email": "info@karyamandiri.id", "phone": "021-5552345"},
		{"id": "VND-004", "name": "PT Logam Berkualitas", "email": "sales@logamberk.co.id", "phone": "021-5551234"},
	}})
}

func GetCustomerPortalDashboard(c *gin.Context) {
	customerCode := c.DefaultQuery("customer_id", "CUST-001")

	if database.DB != nil {
		var custID, custName string
		err := database.DB.QueryRow(
			`SELECT id::text, name FROM customers WHERE code=$1 AND company_id=(SELECT id FROM companies LIMIT 1) LIMIT 1`,
			customerCode,
		).Scan(&custID, &custName)
		if err == nil {
			var totalOrders, activeOrders, unpaidInv int
			var outstanding, totalPurchases int64
			database.DB.QueryRow(`SELECT COUNT(*) FROM sales_orders WHERE customer_id=$1::uuid`, custID).Scan(&totalOrders)
			database.DB.QueryRow(`SELECT COUNT(*) FROM sales_orders WHERE customer_id=$1::uuid AND status NOT IN ('delivered','cancelled')`, custID).Scan(&activeOrders)
			database.DB.QueryRow(`SELECT COUNT(*) FROM customer_invoices WHERE customer_id=$1::uuid AND status='unpaid'`, custID).Scan(&unpaidInv)
			database.DB.QueryRow(`SELECT COALESCE(SUM(total-paid_amount),0) FROM customer_invoices WHERE customer_id=$1::uuid AND status='unpaid'`, custID).Scan(&outstanding)
			database.DB.QueryRow(`SELECT COALESCE(SUM(total),0) FROM sales_orders WHERE customer_id=$1::uuid`, custID).Scan(&totalPurchases)

			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    buildCustomerDashboardDB(customerCode, custName, totalOrders, activeOrders, unpaidInv, outstanding, totalPurchases),
			})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildCustomerDashboard(customerCode)})
}

func buildCustomerDashboardDB(code, name string, totalOrders, activeOrders, unpaidInv int, outstanding, totalPurchases int64) gin.H {
	return gin.H{
		"customer_id": code, "customer_name": name, "since": "2024-01-15",
		"kpi": gin.H{
			"total_orders": totalOrders, "active_orders": activeOrders,
			"unpaid_invoices": unpaidInv, "outstanding_amount": outstanding,
			"total_purchases": totalPurchases, "on_time_delivery": 91.7,
		},
		"recent_activity": []gin.H{
			{"date": time.Now().Format("2006-01-02"), "type": "order", "ref": "SO-1084", "desc": "Pesanan terakhir", "amount": 35520000},
			{"date": time.Now().AddDate(0, 0, -5).Format("2006-01-02"), "type": "invoice", "ref": "INV-2847", "desc": "Invoice diterbitkan", "amount": 35520000},
			{"date": time.Now().AddDate(0, 0, -4).Format("2006-01-02"), "type": "delivery", "ref": "DO-2201", "desc": "Barang dikirim", "amount": 0},
		},
		"monthly_spend": []gin.H{
			{"month": "Jan", "amount": 65000000}, {"month": "Feb", "amount": 82000000},
			{"month": "Mar", "amount": 71000000}, {"month": "Apr", "amount": 95000000},
			{"month": "Mei", "amount": 88000000}, {"month": "Jun", "amount": 74000000},
		},
	}
}

func buildCustomerDashboard(id string) gin.H {
	return gin.H{
		"customer_id": id, "customer_name": "PT Maju Bersama", "since": "2024-01-15",
		"kpi": gin.H{
			"total_orders": 24, "active_orders": 3, "total_invoices": 22,
			"unpaid_invoices": 2, "outstanding_amount": 48500000, "total_purchases": 875000000, "on_time_delivery": 91.7,
		},
		"recent_activity": []gin.H{
			{"date": "2026-06-28", "type": "invoice", "ref": "INV-2847", "desc": "Invoice diterbitkan", "amount": 24500000},
			{"date": "2026-06-25", "type": "delivery", "ref": "DO-2201", "desc": "Barang dikirim", "amount": 0},
			{"date": "2026-06-20", "type": "order", "ref": "SO-1084", "desc": "Pesanan dikonfirmasi", "amount": 32000000},
			{"date": "2026-06-15", "type": "payment", "ref": "PAY-0921", "desc": "Pembayaran diterima", "amount": 18750000},
		},
		"monthly_spend": []gin.H{
			{"month": "Jan", "amount": 65000000}, {"month": "Feb", "amount": 82000000},
			{"month": "Mar", "amount": 71000000}, {"month": "Apr", "amount": 95000000},
			{"month": "Mei", "amount": 88000000}, {"month": "Jun", "amount": 74000000},
		},
	}
}

func GetCustomerPortalOrders(c *gin.Context) {
	customerCode := c.DefaultQuery("customer_id", "CUST-001")
	p := odata.Parse(c)

	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT so.so_number, TO_CHAR(so.date,'YYYY-MM-DD'), so.customer_name,
			       COALESCE(so.notes,''), so.total, so.status,
			       COALESCE(TO_CHAR(so.delivery_date,'YYYY-MM-DD'),'')
			FROM sales_orders so
			WHERE so.company_id=(SELECT id FROM companies LIMIT 1)
			  AND so.customer_id=(SELECT id FROM customers WHERE code=$1 LIMIT 1)
			ORDER BY so.date DESC`, customerCode)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			for rows.Next() {
				var soNum, date, custName, notes, status, eta string
				var total int64
				if rows.Scan(&soNum, &date, &custName, &notes, &total, &status, &eta) == nil {
					result = append(result, gin.H{
						"id": soNum, "date": date, "product_summary": notes,
						"total": total, "status": status, "eta": eta, "items": 1,
					})
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			filtered, total := p.ApplyToSlice(result, []string{"id", "product_summary", "status"})
			c.JSON(http.StatusOK, odata.Response(filtered, total))
			return
		}
	}
	rows, total := p.ApplyToSlice(demoCustomerOrders, []string{"id", "product_summary", "status"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

var demoCustomerOrders = []gin.H{
	{"id": "SO-1084", "date": "2026-06-20", "product_summary": "Komponen A-12 × 200, Part D-07 × 150", "total": 32000000, "status": "delivered", "eta": "2026-06-25", "items": 2},
	{"id": "SO-1075", "date": "2026-06-10", "product_summary": "Assembly B-05 × 100", "total": 24500000, "status": "shipped", "eta": "2026-06-30", "items": 1},
	{"id": "SO-1068", "date": "2026-06-01", "product_summary": "Frame E-11 × 50, Komponen A-12 × 100", "total": 18750000, "status": "processing", "eta": "2026-07-05", "items": 2},
	{"id": "SO-1059", "date": "2026-05-22", "product_summary": "Part D-07 × 300", "total": 27000000, "status": "delivered", "eta": "2026-05-28", "items": 1},
	{"id": "SO-1047", "date": "2026-05-10", "product_summary": "Komponen C-33 × 80", "total": 12400000, "status": "delivered", "eta": "2026-05-16", "items": 1},
}

func GetCustomerPortalInvoices(c *gin.Context) {
	customerCode := c.DefaultQuery("customer_id", "CUST-001")
	p := odata.Parse(c)

	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT ci.inv_number, COALESCE(so.so_number,''), TO_CHAR(ci.date,'YYYY-MM-DD'),
			       COALESCE(TO_CHAR(ci.due_date,'YYYY-MM-DD'),''), ci.total, ci.paid_amount, ci.status,
			       (ci.due_date < CURRENT_DATE AND ci.status != 'paid')
			FROM customer_invoices ci
			LEFT JOIN sales_orders so ON ci.so_id=so.id
			WHERE ci.company_id=(SELECT id FROM companies LIMIT 1)
			  AND ci.customer_id=(SELECT id FROM customers WHERE code=$1 LIMIT 1)
			ORDER BY ci.date DESC`, customerCode)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			for rows.Next() {
				var invNum, soRef, date, dueDate, status string
				var total, paid int64
				var overdue bool
				if rows.Scan(&invNum, &soRef, &date, &dueDate, &total, &paid, &status, &overdue) == nil {
					result = append(result, gin.H{
						"id": invNum, "so_ref": soRef, "date": date, "due_date": dueDate,
						"amount": total, "paid": paid, "status": status, "overdue": overdue,
					})
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			filtered, total := p.ApplyToSlice(result, []string{"id", "so_ref", "status"})
			c.JSON(http.StatusOK, odata.Response(filtered, total))
			return
		}
	}
	rows, total := p.ApplyToSlice(demoCustomerInvoices, []string{"id", "so_ref", "status"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

var demoCustomerInvoices = []gin.H{
	{"id": "INV-2847", "so_ref": "SO-1084", "date": "2026-06-28", "due_date": "2026-07-28", "amount": 32000000, "paid": 0, "status": "unpaid", "overdue": false},
	{"id": "INV-2831", "so_ref": "SO-1075", "date": "2026-06-15", "due_date": "2026-07-15", "amount": 24500000, "paid": 0, "status": "unpaid", "overdue": false},
	{"id": "INV-2810", "so_ref": "SO-1059", "date": "2026-06-01", "due_date": "2026-07-01", "amount": 27000000, "paid": 27000000, "status": "paid", "overdue": false},
	{"id": "INV-2791", "so_ref": "SO-1047", "date": "2026-05-16", "due_date": "2026-06-16", "amount": 12400000, "paid": 12400000, "status": "paid", "overdue": false},
}

func GetCustomerPortalDeliveries(c *gin.Context) {
	customerCode := c.DefaultQuery("customer_id", "CUST-001")
	p := odata.Parse(c)

	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT d.do_number, COALESCE(so.so_number,''), TO_CHAR(d.date,'YYYY-MM-DD'),
			       d.status, COALESCE(d.carrier,''), COALESCE(d.tracking,''),
			       COALESCE(TO_CHAR(d.received_date,'YYYY-MM-DD'),'')
			FROM delivery_orders d
			LEFT JOIN sales_orders so ON d.so_id=so.id
			WHERE d.company_id=(SELECT id FROM companies LIMIT 1)
			  AND d.customer_id=(SELECT id FROM customers WHERE code=$1 LIMIT 1)
			ORDER BY d.date DESC`, customerCode)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			for rows.Next() {
				var doNum, soRef, date, status, carrier, tracking, receivedDate string
				if rows.Scan(&doNum, &soRef, &date, &status, &carrier, &tracking, &receivedDate) == nil {
					result = append(result, gin.H{
						"id": doNum, "so_ref": soRef, "date": date, "items": "-",
						"status": status, "carrier": carrier, "tracking": tracking, "received_date": receivedDate,
					})
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			filtered, total := p.ApplyToSlice(result, []string{"id", "so_ref", "status", "carrier", "tracking"})
			c.JSON(http.StatusOK, odata.Response(filtered, total))
			return
		}
	}
	rows, total := p.ApplyToSlice(demoCustomerDeliveries, []string{"id", "so_ref", "status", "carrier", "tracking"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

var demoCustomerDeliveries = []gin.H{
	{"id": "DO-2201", "so_ref": "SO-1084", "date": "2026-06-25", "items": "Komponen A-12 × 200, Part D-07 × 150", "status": "delivered", "carrier": "JNE Express", "tracking": "JNE1234567890", "received_date": "2026-06-26"},
	{"id": "DO-2198", "so_ref": "SO-1075", "date": "2026-06-28", "items": "Assembly B-05 × 100", "status": "in_transit", "carrier": "SiCepat", "tracking": "SCP9876543210", "received_date": ""},
	{"id": "DO-2185", "so_ref": "SO-1059", "date": "2026-05-27", "items": "Part D-07 × 300", "status": "delivered", "carrier": "Anteraja", "tracking": "ANT5432167890", "received_date": "2026-05-28"},
}

// ─── Vendor Portal ────────────────────────────────────────────────────────────

func GetVendorPortalDashboard(c *gin.Context) {
	vendorCode := c.DefaultQuery("vendor_id", "VND-001")

	if database.DB != nil {
		var vendID, vendName string
		err := database.DB.QueryRow(
			`SELECT id::text, name FROM vendors WHERE code=$1 AND company_id=(SELECT id FROM companies LIMIT 1) LIMIT 1`,
			vendorCode,
		).Scan(&vendID, &vendName)
		if err == nil {
			var totalPOs, activePOs, unpaidInv int
			var outstanding, totalReceived int64
			database.DB.QueryRow(`SELECT COUNT(*) FROM purchase_orders WHERE vendor_id=$1::uuid`, vendID).Scan(&totalPOs)
			database.DB.QueryRow(`SELECT COUNT(*) FROM purchase_orders WHERE vendor_id=$1::uuid AND status NOT IN ('received','cancelled')`, vendID).Scan(&activePOs)
			database.DB.QueryRow(`SELECT COUNT(*) FROM vendor_invoices WHERE vendor_id=$1::uuid AND status NOT IN ('paid')`, vendID).Scan(&unpaidInv)
			database.DB.QueryRow(`SELECT COALESCE(SUM(total-paid_amount),0) FROM vendor_invoices WHERE vendor_id=$1::uuid AND status != 'paid'`, vendID).Scan(&outstanding)
			database.DB.QueryRow(`SELECT COALESCE(SUM(total),0) FROM purchase_orders WHERE vendor_id=$1::uuid`, vendID).Scan(&totalReceived)

			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data": gin.H{
					"vendor_id": vendorCode, "vendor_name": vendName, "since": "2023-03-10",
					"kpi": gin.H{
						"total_pos": totalPOs, "active_pos": activePOs,
						"unpaid_invoices": unpaidInv, "outstanding_amount": outstanding,
						"total_received": totalReceived, "on_time_delivery": 88.5,
					},
					"recent_activity": []gin.H{
						{"date": time.Now().AddDate(0, 0, -2).Format("2006-01-02"), "type": "po", "ref": "PO-3041", "desc": "PO baru diterima", "amount": 49950000},
						{"date": time.Now().AddDate(0, 0, -5).Format("2006-01-02"), "type": "invoice", "ref": "VI-0891", "desc": "Invoice terkirim", "amount": 29970000},
					},
					"monthly_revenue": []gin.H{
						{"month": "Jan", "amount": 180000000}, {"month": "Feb", "amount": 210000000},
						{"month": "Mar", "amount": 195000000}, {"month": "Apr", "amount": 230000000},
						{"month": "Mei", "amount": 245000000}, {"month": "Jun", "amount": 180000000},
					},
				},
			})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildVendorDashboard(vendorCode)})
}

func buildVendorDashboard(id string) gin.H {
	return gin.H{
		"vendor_id": id, "vendor_name": "CV Sukses Jaya", "since": "2023-03-10",
		"kpi": gin.H{
			"total_pos": 31, "active_pos": 4, "total_invoices": 28,
			"unpaid_invoices": 3, "outstanding_amount": 67200000,
			"total_received": 1240000000, "on_time_delivery": 88.5,
		},
		"recent_activity": []gin.H{
			{"date": "2026-06-27", "type": "po", "ref": "PO-3041", "desc": "PO baru diterima", "amount": 45000000},
			{"date": "2026-06-24", "type": "payment", "ref": "PAY-1147", "desc": "Pembayaran masuk", "amount": 28500000},
			{"date": "2026-06-20", "type": "invoice", "ref": "VI-0891", "desc": "Invoice dikirim", "amount": 31200000},
			{"date": "2026-06-18", "type": "grn", "ref": "GRN-0445", "desc": "Barang diterima", "amount": 0},
		},
		"monthly_revenue": []gin.H{
			{"month": "Jan", "amount": 180000000}, {"month": "Feb", "amount": 210000000},
			{"month": "Mar", "amount": 195000000}, {"month": "Apr", "amount": 230000000},
			{"month": "Mei", "amount": 245000000}, {"month": "Jun", "amount": 180000000},
		},
	}
}

func GetVendorPortalPOs(c *gin.Context) {
	vendorCode := c.DefaultQuery("vendor_id", "VND-001")
	p := odata.Parse(c)

	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT po_number, TO_CHAR(order_date,'YYYY-MM-DD'),
			       COALESCE(items_summary,''), total_amount, status,
			       COALESCE(TO_CHAR(delivery_date,'YYYY-MM-DD'),''),
			       COALESCE(grn_status,'pending')
			FROM purchase_orders
			WHERE company_id=(SELECT id FROM companies LIMIT 1)
			  AND vendor_id=(SELECT id FROM vendors WHERE code=$1 LIMIT 1)
			ORDER BY order_date DESC`, vendorCode)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			for rows.Next() {
				var poNum, date, items, status, deadline, grnStatus string
				var total int64
				if rows.Scan(&poNum, &date, &items, &total, &status, &deadline, &grnStatus) == nil {
					result = append(result, gin.H{
						"id": poNum, "date": date, "items_summary": items,
						"total": total, "status": status, "delivery_deadline": deadline, "grn_status": grnStatus,
					})
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			filtered, total := p.ApplyToSlice(result, []string{"id", "items_summary", "status", "grn_status"})
			c.JSON(http.StatusOK, odata.Response(filtered, total))
			return
		}
	}
	rows, total := p.ApplyToSlice(demoVendorPOs, []string{"id", "items_summary", "status", "grn_status"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

var demoVendorPOs = []gin.H{
	{"id": "PO-3041", "date": "2026-06-27", "items_summary": "Bahan Baku X × 500 kg, Material Y × 200 unit", "total": 45000000, "status": "confirmed", "delivery_deadline": "2026-07-15", "grn_status": "pending"},
	{"id": "PO-3035", "date": "2026-06-20", "items_summary": "Spare Part Z × 100 unit", "total": 28500000, "status": "confirmed", "delivery_deadline": "2026-07-10", "grn_status": "pending"},
	{"id": "PO-3028", "date": "2026-06-10", "items_summary": "Bahan Baku X × 300 kg", "total": 27000000, "status": "received", "delivery_deadline": "2026-06-25", "grn_status": "done"},
	{"id": "PO-3019", "date": "2026-05-28", "items_summary": "Material W × 400 unit, Komponen V × 150 unit", "total": 38500000, "status": "received", "delivery_deadline": "2026-06-15", "grn_status": "done"},
	{"id": "PO-3011", "date": "2026-05-15", "items_summary": "Spare Part Z × 200 unit", "total": 31200000, "status": "received", "delivery_deadline": "2026-06-01", "grn_status": "done"},
}

func GetVendorPortalInvoices(c *gin.Context) {
	vendorCode := c.DefaultQuery("vendor_id", "VND-001")
	p := odata.Parse(c)

	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT vi.vi_number, COALESCE(po.po_number,''), TO_CHAR(vi.inv_date,'YYYY-MM-DD'),
			       COALESCE(TO_CHAR(vi.due_date,'YYYY-MM-DD'),''), vi.total, vi.paid_amount, vi.status
			FROM vendor_invoices vi
			LEFT JOIN purchase_orders po ON vi.po_id=po.id
			WHERE vi.company_id=(SELECT id FROM companies LIMIT 1)
			  AND vi.vendor_id=(SELECT id FROM vendors WHERE code=$1 LIMIT 1)
			ORDER BY vi.inv_date DESC`, vendorCode)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			for rows.Next() {
				var viNum, poRef, date, dueDate, status string
				var total, paid int64
				if rows.Scan(&viNum, &poRef, &date, &dueDate, &total, &paid, &status) == nil {
					result = append(result, gin.H{
						"id": viNum, "po_ref": poRef, "date": date, "due_date": dueDate,
						"amount": total, "paid": paid, "status": status,
					})
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			filtered, total := p.ApplyToSlice(result, []string{"id", "po_ref", "status"})
			c.JSON(http.StatusOK, odata.Response(filtered, total))
			return
		}
	}
	rows, total := p.ApplyToSlice(demoVendorInvoices, []string{"id", "po_ref", "status"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

var demoVendorInvoices = []gin.H{
	{"id": "VI-0891", "po_ref": "PO-3028", "date": "2026-06-20", "due_date": "2026-07-20", "amount": 27000000, "paid": 0, "status": "pending"},
	{"id": "VI-0885", "po_ref": "PO-3019", "date": "2026-06-10", "due_date": "2026-07-10", "amount": 38500000, "paid": 0, "status": "approved"},
	{"id": "VI-0875", "po_ref": "PO-3011", "date": "2026-05-20", "due_date": "2026-06-20", "amount": 31200000, "paid": 31200000, "status": "paid"},
	{"id": "VI-0861", "po_ref": "PO-2998", "date": "2026-05-05", "due_date": "2026-06-05", "amount": 22800000, "paid": 22800000, "status": "paid"},
}

func CreatePortalVendorInvoice(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	body["id"] = fmt.Sprintf("VI-%04d", time.Now().UnixMilli()%10000)
	body["date"] = time.Now().Format("2006-01-02")
	body["status"] = "pending"
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": body, "message": "Invoice berhasil dikirim"})
}

func GetVendorPortalPayments(c *gin.Context) {
	vendorCode := c.DefaultQuery("vendor_id", "VND-001")
	p := odata.Parse(c)

	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT po.vendor_name, po.payment_date, po.amount, po.method,
			       COALESCE(po.reference,''), COALESCE(vi.vi_number,'')
			FROM payments_out po
			LEFT JOIN vendor_invoices vi ON po.vendor_invoice_id=vi.id
			WHERE po.company_id=(SELECT id FROM companies LIMIT 1)
			  AND po.vendor_name=(SELECT name FROM vendors WHERE code=$1 LIMIT 1)
			ORDER BY po.payment_date DESC`, vendorCode)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			idx := 1
			for rows.Next() {
				var vendName, method, ref, viRef string
				var date string
				var amount int64
				if rows.Scan(&vendName, &date, &amount, &method, &ref, &viRef) == nil {
					result = append(result, gin.H{
						"id": fmt.Sprintf("PAY-%04d", idx), "vi_ref": viRef,
						"date": date, "amount": amount, "method": method, "ref": ref,
					})
					idx++
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			filtered, total := p.ApplyToSlice(result, []string{"id", "vi_ref", "method"})
			c.JSON(http.StatusOK, odata.Response(filtered, total))
			return
		}
	}
	rows, total := p.ApplyToSlice(demoVendorPayments, []string{"id", "vi_ref", "method", "bank"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

var demoVendorPayments = []gin.H{
	{"id": "PAY-1147", "vi_ref": "VI-0875", "date": "2026-06-24", "amount": 31200000, "method": "Transfer Bank", "bank": "BCA", "ref": "TRF20260624001"},
	{"id": "PAY-1138", "vi_ref": "VI-0861", "date": "2026-06-08", "amount": 22800000, "method": "Transfer Bank", "bank": "Mandiri", "ref": "TRF20260608002"},
	{"id": "PAY-1122", "vi_ref": "VI-0849", "date": "2026-05-25", "amount": 18500000, "method": "Transfer Bank", "bank": "BCA", "ref": "TRF20260525003"},
}
