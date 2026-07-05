package handlers

import (
	"fmt"
	"net/http"
	"time"

	"sep/backend/internal/database"
	"sep/backend/internal/odata"

	"github.com/gin-gonic/gin"
)

// ─── QUOTATION ───────────────────────────────────────────────────────────────

func GetQuotations(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "q1", "quo_number": "QUO/2026/0001", "customer_name": "PT Maju Jaya", "date": "2026-06-01", "valid_until": "2026-07-01", "total": 85000000, "status": "sent", "notes": "Penawaran mesin produksi"},
			{"id": "q2", "quo_number": "QUO/2026/0002", "customer_name": "CV Sukses Makmur", "date": "2026-06-10", "valid_until": "2026-07-10", "total": 42500000, "status": "accepted", "notes": "Penawaran spareparts"},
			{"id": "q3", "quo_number": "QUO/2026/0003", "customer_name": "PT Karya Mandiri", "date": "2026-06-15", "valid_until": "2026-07-15", "total": 125000000, "status": "draft", "notes": ""},
			{"id": "q4", "quo_number": "QUO/2026/0004", "customer_name": "PT Nusantara Tech", "date": "2026-05-20", "valid_until": "2026-06-20", "total": 67000000, "status": "expired", "notes": "Penawaran software lisensi"},
			{"id": "q5", "quo_number": "QUO/2026/0005", "customer_name": "PT Sinar Abadi", "date": "2026-06-20", "valid_until": "2026-07-20", "total": 95000000, "status": "rejected", "notes": "Harga tidak sesuai"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"quo_number", "customer_name"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	_ = p
	_ = companyID
	c.JSON(http.StatusOK, odata.Response([]gin.H{}, 0))
}

func CreateQuotation(c *gin.Context) {
	var body struct {
		CustomerID   string  `json:"customer_id"`
		CustomerName string  `json:"customer_name"`
		Date         string  `json:"date"`
		ValidUntil   string  `json:"valid_until"`
		Notes        string  `json:"notes"`
		Items        []gin.H `json:"items"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{
			"id":            "q-new",
			"quo_number":    fmt.Sprintf("QUO/%s/%04d", time.Now().Format("2006"), 6),
			"customer_name": body.CustomerName,
			"status":        "draft",
		})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var count int
	database.DB.QueryRow(`SELECT COUNT(*) FROM quotations WHERE company_id=$1`, companyID).Scan(&count)
	quoNumber := fmt.Sprintf("QUO/%s/%04d", time.Now().Format("2006"), count+1)
	database.WriteAuditLog(userID, "create_quotation", "quotations", "new", quoNumber, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"quo_number": quoNumber, "status": "draft"})
}

func UpdateQuotationStatus(c *gin.Context) {
	id := c.Param("id")
	var body struct{ Status string `json:"status"` }
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"id": id, "status": body.Status})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	_, err := database.DB.Exec(`UPDATE quotations SET status=$1 WHERE id=$2 AND company_id=$3`, body.Status, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update status quotation"})
		return
	}
	database.WriteAuditLog(userID, "update_quotation_status", "quotations", id, "Status: "+body.Status, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"id": id, "status": body.Status})
}

func ConvertQuotationToSO(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{
			"so_number": fmt.Sprintf("SO/%s/%04d", time.Now().Format("2006"), 8),
			"message":   "Quotation berhasil dikonversi ke Sales Order",
		})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var count int
	database.DB.QueryRow(`SELECT COUNT(*) FROM sales_orders WHERE company_id=$1`, companyID).Scan(&count)
	soNumber := fmt.Sprintf("SO/%s/%04d", time.Now().Format("2006"), count+1)
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai transaksi"})
		return
	}
	defer tx.Rollback()
	_, err = tx.Exec(`
		INSERT INTO sales_orders (company_id, so_number, customer_id, customer_name, date, status, notes)
		SELECT company_id, $1, customer_id, customer_name, CURRENT_DATE, 'draft', notes
		FROM quotations WHERE id=$2 AND company_id=$3
	`, soNumber, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat SO"})
		return
	}
	_, err = tx.Exec(`UPDATE quotations SET status='converted' WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update status quotation"})
		return
	}
	tx.Commit()
	database.WriteAuditLog(userID, "convert_quotation_to_so", "quotations", id, "SO: "+soNumber, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"so_number": soNumber, "message": "Quotation berhasil dikonversi ke Sales Order"})
}

// ─── SALES RETURN ────────────────────────────────────────────────────────────

func GetSalesReturns(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "sr1", "sr_number": "SR/2026/0001", "so_number": "SO/2026/0001", "customer_name": "PT Maju Jaya", "date": "2026-06-05", "total": 12000000, "reason": "Produk rusak", "status": "draft"},
			{"id": "sr2", "sr_number": "SR/2026/0002", "so_number": "SO/2026/0002", "customer_name": "CV Sumber Rejeki", "date": "2026-06-12", "total": 8500000, "reason": "Salah kirim", "status": "confirmed"},
			{"id": "sr3", "sr_number": "SR/2026/0003", "so_number": "SO/2026/0003", "customer_name": "PT Karya Mandiri", "date": "2026-06-20", "total": 5200000, "reason": "Kelebihan pengiriman", "status": "processed"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"sr_number", "customer_name", "so_number"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	_ = p
	_ = companyID
	c.JSON(http.StatusOK, odata.Response([]gin.H{}, 0))
}

func CreateSalesReturn(c *gin.Context) {
	var body struct {
		SOId         string  `json:"so_id"`
		SONumber     string  `json:"so_number"`
		CustomerName string  `json:"customer_name"`
		Date         string  `json:"date"`
		Reason       string  `json:"reason"`
		Items        []gin.H `json:"items"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{
			"id":        "sr-new",
			"sr_number": fmt.Sprintf("SR/%s/%04d", time.Now().Format("2006"), 4),
			"status":    "draft",
		})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var count int
	database.DB.QueryRow(`SELECT COUNT(*) FROM sales_returns WHERE company_id=$1`, companyID).Scan(&count)
	srNumber := fmt.Sprintf("SR/%s/%04d", time.Now().Format("2006"), count+1)
	database.WriteAuditLog(userID, "create_sales_return", "sales_returns", "new", srNumber, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"sr_number": srNumber, "status": "draft"})
}

func ConfirmSalesReturn(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"id": id, "status": "confirmed"})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	_, err := database.DB.Exec(`UPDATE sales_returns SET status='confirmed' WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal konfirmasi retur"})
		return
	}
	database.WriteAuditLog(userID, "confirm_sales_return", "sales_returns", id, "Konfirmasi retur", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"id": id, "status": "confirmed"})
}

// ─── CRM ─────────────────────────────────────────────────────────────────────

func GetLeads(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "l1", "name": "PT Teknologi Nusantara", "contact": "Budi Santoso", "email": "budi@teknus.id", "phone": "081234567890", "value": 150000000, "stage": "proposal", "source": "referral", "assigned_to": "Andi Sales", "created_at": "2026-06-01T10:00:00Z"},
			{"id": "l2", "name": "CV Mitra Usaha", "contact": "Dewi Rahayu", "email": "dewi@mitrausaha.com", "phone": "082345678901", "value": 75000000, "stage": "qualified", "source": "website", "assigned_to": "Budi Sales", "created_at": "2026-06-05T09:00:00Z"},
			{"id": "l3", "name": "PT Global Industri", "contact": "Eko Purnomo", "email": "eko@globalindustri.co.id", "phone": "083456789012", "value": 320000000, "stage": "negotiation", "source": "cold_call", "assigned_to": "Andi Sales", "created_at": "2026-06-08T14:00:00Z"},
			{"id": "l4", "name": "PT Sumber Daya Prima", "contact": "Fitri Handayani", "email": "fitri@sdprima.id", "phone": "084567890123", "value": 95000000, "stage": "won", "source": "exhibition", "assigned_to": "Citra Sales", "created_at": "2026-05-20T11:00:00Z"},
			{"id": "l5", "name": "CV Aneka Raya", "contact": "Gandi Wijaya", "email": "gandi@anekaraya.com", "phone": "085678901234", "value": 48000000, "stage": "new", "source": "website", "assigned_to": "Budi Sales", "created_at": "2026-06-20T08:00:00Z"},
			{"id": "l6", "name": "PT Mandiri Sejahtera", "contact": "Hendra Kusuma", "email": "hendra@mandirisjt.id", "phone": "086789012345", "value": 210000000, "stage": "contacted", "source": "referral", "assigned_to": "Andi Sales", "created_at": "2026-06-15T16:00:00Z"},
			{"id": "l7", "name": "CV Jaya Abadi", "contact": "Indah Lestari", "email": "indah@jayaabadi.id", "phone": "087890123456", "value": 62000000, "stage": "lost", "source": "cold_call", "assigned_to": "Citra Sales", "created_at": "2026-05-10T10:00:00Z"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"name", "contact", "email"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	_ = p
	_ = companyID
	c.JSON(http.StatusOK, odata.Response([]gin.H{}, 0))
}

func CreateLead(c *gin.Context) {
	var body gin.H
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		body["id"] = "l-new"
		if body["stage"] == nil {
			body["stage"] = "new"
		}
		c.JSON(http.StatusCreated, body)
		return
	}
	userID := c.GetString("user_id")
	companyID := c.GetString("company_id")
	database.WriteAuditLog(userID, "create_lead", "crm_leads", "new", fmt.Sprintf("%v", body["name"]), c.ClientIP())
	_ = companyID
	c.JSON(http.StatusCreated, body)
}

func UpdateLead(c *gin.Context) {
	id := c.Param("id")
	var body gin.H
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		body["id"] = id
		c.JSON(http.StatusOK, body)
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	database.WriteAuditLog(userID, "update_lead", "crm_leads", id, "Update lead", c.ClientIP())
	_ = companyID
	c.JSON(http.StatusOK, body)
}

func UpdateLeadStage(c *gin.Context) {
	id := c.Param("id")
	var body struct{ Stage string `json:"stage"` }
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"id": id, "stage": body.Stage})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	_, err := database.DB.Exec(`UPDATE crm_leads SET stage=$1 WHERE id=$2 AND company_id=$3`, body.Stage, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update stage lead"})
		return
	}
	database.WriteAuditLog(userID, "update_lead_stage", "crm_leads", id, "Stage: "+body.Stage, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"id": id, "stage": body.Stage})
}

func GetCRMActivities(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "a1", "lead_name": "PT Teknologi Nusantara", "type": "meeting", "subject": "Presentasi produk", "date": "2026-06-10", "result": "Tertarik, minta proposal", "assigned_to": "Andi Sales"},
			{"id": "a2", "lead_name": "CV Mitra Usaha", "type": "call", "subject": "Follow up penawaran", "date": "2026-06-12", "result": "Sedang review", "assigned_to": "Budi Sales"},
			{"id": "a3", "lead_name": "PT Global Industri", "type": "email", "subject": "Kirim proposal revisi", "date": "2026-06-14", "result": "Email terkirim", "assigned_to": "Andi Sales"},
			{"id": "a4", "lead_name": "PT Mandiri Sejahtera", "type": "demo", "subject": "Demo sistem ERP", "date": "2026-06-18", "result": "Demo berhasil, masuk negosiasi", "assigned_to": "Andi Sales"},
			{"id": "a5", "lead_name": "CV Aneka Raya", "type": "follow_up", "subject": "Follow up pertama", "date": "2026-06-22", "result": "", "assigned_to": "Budi Sales"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"lead_name", "subject", "assigned_to"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	_ = p
	_ = companyID
	c.JSON(http.StatusOK, odata.Response([]gin.H{}, 0))
}

func CreateCRMActivity(c *gin.Context) {
	var body gin.H
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		body["id"] = "a-new"
		c.JSON(http.StatusCreated, body)
		return
	}
	userID := c.GetString("user_id")
	companyID := c.GetString("company_id")
	database.WriteAuditLog(userID, "create_crm_activity", "crm_activities", "new", fmt.Sprintf("%v", body["subject"]), c.ClientIP())
	_ = companyID
	c.JSON(http.StatusCreated, body)
}

func GetCRMStats(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"total_leads":     7,
			"pipeline_value":  960000000,
			"won_this_month":  1,
			"won_value":       95000000,
			"conversion_rate": 14.3,
			"avg_deal_size":   137142857,
			"by_stage": []gin.H{
				{"stage": "new", "count": 1, "value": 48000000},
				{"stage": "contacted", "count": 1, "value": 210000000},
				{"stage": "qualified", "count": 1, "value": 75000000},
				{"stage": "proposal", "count": 1, "value": 150000000},
				{"stage": "negotiation", "count": 1, "value": 320000000},
				{"stage": "won", "count": 1, "value": 95000000},
				{"stage": "lost", "count": 1, "value": 62000000},
			},
			"by_source": []gin.H{
				{"source": "referral", "count": 2},
				{"source": "website", "count": 2},
				{"source": "cold_call", "count": 2},
				{"source": "exhibition", "count": 1},
			},
		})
		return
	}
	companyID := c.GetString("company_id")
	_ = companyID
	c.JSON(http.StatusOK, gin.H{"total_leads": 0, "pipeline_value": 0})
}
