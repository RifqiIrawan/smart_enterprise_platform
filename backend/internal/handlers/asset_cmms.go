package handlers

import (
	"math"
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── PM SCHEDULES ────────────────────────────────────────────────────────────

func GetPMSchedules(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "asset_id": "1", "asset_name": "Mesin CNC Milling", "name": "Ganti Oli Spindle", "type": "calendar", "interval_days": 90, "last_done": now.Add(-45 * 24 * time.Hour).Format("2006-01-02"), "next_due": now.Add(45 * 24 * time.Hour).Format("2006-01-02"), "technician": "Budi Santoso", "status": "upcoming"},
			{"id": "2", "asset_id": "2", "asset_name": "Forklift Toyota 3T", "name": "Service Berkala 250 Jam", "type": "meter", "interval_days": 60, "last_done": now.Add(-60 * 24 * time.Hour).Format("2006-01-02"), "next_due": now.Format("2006-01-02"), "technician": "Andi Wijaya", "status": "due"},
			{"id": "3", "asset_id": "3", "asset_name": "Kompresor Udara 50HP", "name": "Ganti Filter Udara", "type": "calendar", "interval_days": 30, "last_done": now.Add(-28 * 24 * time.Hour).Format("2006-01-02"), "next_due": now.Add(2 * 24 * time.Hour).Format("2006-01-02"), "technician": "Sari Dewi", "status": "upcoming"},
			{"id": "4", "asset_id": "1", "asset_name": "Mesin CNC Milling", "name": "Kalibrasi Sumbu X-Y-Z", "type": "calendar", "interval_days": 180, "last_done": now.Add(-200 * 24 * time.Hour).Format("2006-01-02"), "next_due": now.Add(-20 * 24 * time.Hour).Format("2006-01-02"), "technician": "Budi Santoso", "status": "overdue"},
			{"id": "5", "asset_id": "4", "asset_name": "Panel Listrik MDP", "name": "Pengecekan Insulation Resistance", "type": "calendar", "interval_days": 365, "last_done": now.Add(-10 * 24 * time.Hour).Format("2006-01-02"), "next_due": now.Add(355 * 24 * time.Hour).Format("2006-01-02"), "technician": "Teguh Prasetyo", "status": "upcoming"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"asset_name", "name", "technician", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, odata.Response([]gin.H{}, 0))
}

func CreatePMSchedule(c *gin.Context) {
	var req struct {
		AssetID      string `json:"asset_id"`
		AssetName    string `json:"asset_name"`
		Name         string `json:"name"`
		Type         string `json:"type"`
		IntervalDays int    `json:"interval_days"`
		LastDone     string `json:"last_done"`
		Technician   string `json:"technician"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	nextDue := time.Now().Add(time.Duration(req.IntervalDays) * 24 * time.Hour)
	if req.LastDone != "" {
		if t, err := time.Parse("2006-01-02", req.LastDone); err == nil {
			nextDue = t.Add(time.Duration(req.IntervalDays) * 24 * time.Hour)
		}
	}
	status := "upcoming"
	if nextDue.Before(time.Now()) {
		status = "overdue"
	} else if nextDue.Before(time.Now().Add(7 * 24 * time.Hour)) {
		status = "due"
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-pm-id", "asset_id": req.AssetID, "asset_name": req.AssetName,
			"name": req.Name, "type": req.Type, "interval_days": req.IntervalDays,
			"last_done": req.LastDone, "next_due": nextDue.Format("2006-01-02"),
			"technician": req.Technician, "status": status,
		}})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true})
}

func UpdatePMSchedule(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		LastDone string `json:"last_done"`
	}
	c.ShouldBindJSON(&req)
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "last_done": req.LastDone}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func DeletePMSchedule(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.Exec("DELETE FROM pm_schedules WHERE id=$1 AND company_id=$2", id, companyID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ─── SPARE PARTS ─────────────────────────────────────────────────────────────

func GetSpareParts(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "asset_id": "1", "asset_name": "Mesin CNC Milling", "part_code": "SP-001", "name": "Bearing 6205-2RS", "qty": 5, "unit": "pcs", "unit_cost": 85000, "min_stock": 3, "status": "ok"},
			{"id": "2", "asset_id": "1", "asset_name": "Mesin CNC Milling", "part_code": "SP-002", "name": "Oil Seal 40x60x10", "qty": 2, "unit": "pcs", "unit_cost": 45000, "min_stock": 4, "status": "low"},
			{"id": "3", "asset_id": "2", "asset_name": "Forklift Toyota 3T", "part_code": "SP-003", "name": "Filter Oli HF6553", "qty": 6, "unit": "pcs", "unit_cost": 120000, "min_stock": 2, "status": "ok"},
			{"id": "4", "asset_id": "3", "asset_name": "Kompresor Udara 50HP", "part_code": "SP-004", "name": "Filter Udara AF25665", "qty": 1, "unit": "pcs", "unit_cost": 350000, "min_stock": 2, "status": "low"},
			{"id": "5", "asset_id": "2", "asset_name": "Forklift Toyota 3T", "part_code": "SP-005", "name": "Drive Belt B-68", "qty": 8, "unit": "pcs", "unit_cost": 75000, "min_stock": 4, "status": "ok"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"part_code", "name", "asset_name", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, odata.Response([]gin.H{}, 0))
}

func CreateSparePart(c *gin.Context) {
	var req struct {
		AssetID   string  `json:"asset_id"`
		AssetName string  `json:"asset_name"`
		PartCode  string  `json:"part_code"`
		Name      string  `json:"name"`
		Qty       int     `json:"qty"`
		Unit      string  `json:"unit"`
		UnitCost  float64 `json:"unit_cost"`
		MinStock  int     `json:"min_stock"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	status := "ok"
	if req.Qty < req.MinStock {
		status = "low"
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-sp-id", "asset_id": req.AssetID, "asset_name": req.AssetName,
			"part_code": req.PartCode, "name": req.Name, "qty": req.Qty,
			"unit": req.Unit, "unit_cost": req.UnitCost, "min_stock": req.MinStock, "status": status,
		}})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true})
}

func UpdateSparePart(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func DeleteSparePart(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.Exec("DELETE FROM spare_parts WHERE id=$1 AND company_id=$2", id, companyID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ─── DEPRECIATION ─────────────────────────────────────────────────────────────

func GetDepreciation(c *gin.Context) {
	if database.DB == nil {
		now := time.Now()
		type assetInfo struct {
			ID      string
			Name    string
			Value   float64
			AcqDate time.Time
			Method  string
		}
		assets := []assetInfo{
			{"1", "Mesin CNC Milling", 450000000, now.Add(-3 * 365 * 24 * time.Hour), "straight_line"},
			{"2", "Forklift Toyota 3T", 280000000, now.Add(-5 * 365 * 24 * time.Hour), "straight_line"},
			{"3", "Kompresor Udara 50HP", 95000000, now.Add(-2 * 365 * 24 * time.Hour), "double_declining"},
			{"4", "Panel Listrik MDP", 120000000, now.Add(-4 * 365 * 24 * time.Hour), "straight_line"},
			{"5", "Server Dell PowerEdge R740", 85000000, now.Add(-1 * 365 * 24 * time.Hour), "straight_line"},
		}
		demo := []gin.H{}
		usefulLife := 10.0
		for _, a := range assets {
			salvage := a.Value * 0.10
			yearsOwned := now.Sub(a.AcqDate).Hours() / (24 * 365)
			var accDepr, annualDepr float64
			if a.Method == "straight_line" {
				annualDepr = (a.Value - salvage) / usefulLife
				accDepr = annualDepr * yearsOwned
			} else {
				rate := 2.0 / usefulLife
				bookVal := a.Value
				annualDepr = a.Value * rate
				for y := 0.0; y < yearsOwned && bookVal > salvage; y++ {
					d := bookVal * rate
					if bookVal-d < salvage {
						d = bookVal - salvage
					}
					accDepr += d
					bookVal -= d
				}
			}
			maxDepr := a.Value - salvage
			if accDepr > maxDepr {
				accDepr = maxDepr
			}
			demo = append(demo, gin.H{
				"id":                       a.ID,
				"asset_name":               a.Name,
				"acquisition_value":        a.Value,
				"acquisition_date":         a.AcqDate.Format("2006-01-02"),
				"method":                   a.Method,
				"useful_life_years":        usefulLife,
				"salvage_value":            salvage,
				"annual_depreciation":      math.Round(annualDepr),
				"accumulated_depreciation": math.Round(accDepr),
				"book_value":               math.Round(a.Value - accDepr),
				"years_owned":              math.Round(yearsOwned*10) / 10,
			})
		}
		c.JSON(http.StatusOK, gin.H{"value": demo, "@odata.count": len(demo)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "@odata.count": 0})
}

func CalculateDepreciation(c *gin.Context) {
	var req struct {
		Period string `json:"period"`
		Method string `json:"method"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "message": "Depresiasi berhasil dihitung", "data": gin.H{
			"period": req.Period, "assets_processed": 5, "total_depreciation": 25750000,
		}})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true})
}

// ─── DISPOSALS ────────────────────────────────────────────────────────────────

func GetDisposals(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "asset_name": "Printer HP LaserJet Pro", "disposal_type": "sale", "sale_price": 2500000, "book_value": 1800000, "gain_loss": 700000, "disposal_date": now.Add(-90 * 24 * time.Hour).Format("2006-01-02"), "notes": "Dijual ke pihak ketiga", "status": "completed"},
			{"id": "2", "asset_name": "UPS APC 3000VA (lama)", "disposal_type": "write_off", "sale_price": 0, "book_value": 5200000, "gain_loss": -5200000, "disposal_date": now.Add(-30 * 24 * time.Hour).Format("2006-01-02"), "notes": "Kerusakan total akibat lonjakan listrik", "status": "completed"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"asset_name", "disposal_type", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, odata.Response([]gin.H{}, 0))
}

func CreateDisposal(c *gin.Context) {
	var req struct {
		AssetID      string  `json:"asset_id"`
		AssetName    string  `json:"asset_name"`
		DisposalType string  `json:"disposal_type"`
		SalePrice    float64 `json:"sale_price"`
		BookValue    float64 `json:"book_value"`
		DisposalDate string  `json:"disposal_date"`
		Notes        string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	gainLoss := req.SalePrice - req.BookValue
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-disp-id", "asset_id": req.AssetID, "asset_name": req.AssetName,
			"disposal_type": req.DisposalType, "sale_price": req.SalePrice,
			"book_value": req.BookValue, "gain_loss": gainLoss,
			"disposal_date": req.DisposalDate, "notes": req.Notes, "status": "completed",
		}})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true})
}
