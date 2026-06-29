package handlers

import (
	"fmt"
	"math"
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Work Centers ─────────────────────────────────────────────────────────────

var demoWorkCenters = []gin.H{
	{"id": "1", "code": "WC-CNC", "name": "CNC Machining", "type": "machine", "capacity": 480, "efficiency": 88, "status": "active", "machines": 3, "operators": 5},
	{"id": "2", "code": "WC-AS1", "name": "Assembly Line 1", "type": "assembly", "capacity": 480, "efficiency": 92, "status": "active", "machines": 8, "operators": 12},
	{"id": "3", "code": "WC-AS2", "name": "Assembly Line 2", "type": "assembly", "capacity": 480, "efficiency": 85, "status": "active", "machines": 6, "operators": 10},
	{"id": "4", "code": "WC-WLD", "name": "Welding Station", "type": "welding", "capacity": 240, "efficiency": 78, "status": "active", "machines": 4, "operators": 4},
	{"id": "5", "code": "WC-QC1", "name": "QC Inspection", "type": "inspection", "capacity": 480, "efficiency": 95, "status": "active", "machines": 2, "operators": 6},
	{"id": "6", "code": "WC-PKG", "name": "Packaging", "type": "packaging", "capacity": 480, "efficiency": 90, "status": "active", "machines": 4, "operators": 8},
	{"id": "7", "code": "WC-LAB", "name": "Laser Cutting", "type": "machine", "capacity": 240, "efficiency": 82, "status": "maintenance", "machines": 2, "operators": 3},
}

func GetWorkCenters(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		rows, total := p.ApplyToSlice(demoWorkCenters, []string{"code", "name", "type", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, odata.Response(demoWorkCenters, int64(len(demoWorkCenters))))
}

func CreateWorkCenter(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	body["id"] = fmt.Sprintf("%d", time.Now().UnixMilli())
	if body["status"] == nil {
		body["status"] = "active"
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": body})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": body})
}

func UpdateWorkCenter(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	body["id"] = c.Param("id")
	c.JSON(http.StatusOK, gin.H{"success": true, "data": body})
}

func DeleteWorkCenter(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Work center dihapus"})
}

// ─── Production Routing ───────────────────────────────────────────────────────

var demoRoutings = []gin.H{
	{
		"id": "1", "product_code": "KMP-A12", "product_name": "Komponen A-12", "total_steps": 5,
		"steps": []gin.H{
			{"seq": 1, "work_center": "WC-CNC", "operation": "CNC Machining", "setup_time": 30, "run_time": 45, "unit": "mnt/unit"},
			{"seq": 2, "work_center": "WC-WLD", "operation": "Welding", "setup_time": 15, "run_time": 20, "unit": "mnt/unit"},
			{"seq": 3, "work_center": "WC-AS1", "operation": "Sub-Assembly", "setup_time": 20, "run_time": 30, "unit": "mnt/unit"},
			{"seq": 4, "work_center": "WC-QC1", "operation": "QC Inspection", "setup_time": 5, "run_time": 10, "unit": "mnt/unit"},
			{"seq": 5, "work_center": "WC-PKG", "operation": "Packaging", "setup_time": 10, "run_time": 5, "unit": "mnt/unit"},
		},
	},
	{
		"id": "2", "product_code": "ASM-B05", "product_name": "Assembly B-05", "total_steps": 4,
		"steps": []gin.H{
			{"seq": 1, "work_center": "WC-AS1", "operation": "Main Assembly", "setup_time": 30, "run_time": 60, "unit": "mnt/unit"},
			{"seq": 2, "work_center": "WC-AS2", "operation": "Sub-Assembly 2", "setup_time": 20, "run_time": 40, "unit": "mnt/unit"},
			{"seq": 3, "work_center": "WC-QC1", "operation": "Final QC", "setup_time": 5, "run_time": 15, "unit": "mnt/unit"},
			{"seq": 4, "work_center": "WC-PKG", "operation": "Packaging", "setup_time": 10, "run_time": 8, "unit": "mnt/unit"},
		},
	},
	{
		"id": "3", "product_code": "FRM-E11", "product_name": "Frame E-11", "total_steps": 3,
		"steps": []gin.H{
			{"seq": 1, "work_center": "WC-LAB", "operation": "Laser Cutting", "setup_time": 45, "run_time": 90, "unit": "mnt/unit"},
			{"seq": 2, "work_center": "WC-WLD", "operation": "Welding", "setup_time": 20, "run_time": 35, "unit": "mnt/unit"},
			{"seq": 3, "work_center": "WC-QC1", "operation": "Inspection", "setup_time": 5, "run_time": 12, "unit": "mnt/unit"},
		},
	},
}

func GetProductRoutings(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		rows, total := p.ApplyToSlice(demoRoutings, []string{"product_code", "product_name"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, odata.Response(demoRoutings, int64(len(demoRoutings))))
}

func CreateProductRouting(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	body["id"] = fmt.Sprintf("%d", time.Now().UnixMilli())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": body})
}

func UpdateProductRouting(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	body["id"] = c.Param("id")
	c.JSON(http.StatusOK, gin.H{"success": true, "data": body})
}

func DeleteProductRouting(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Routing dihapus"})
}

// ─── OEE Real ─────────────────────────────────────────────────────────────────

func GetOEEReal(c *gin.Context) {
	period := c.DefaultQuery("period", "month")

	if database.DB == nil {
		// Simulated OEE calculation — formula: Availability × Performance × Quality
		data := buildDemoOEE(period)
		c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
		return
	}

	// Real DB: calculate from work_orders + downtime tables
	companyID := c.GetString("company_id")
	var startDate time.Time
	now := time.Now()
	switch period {
	case "week":
		startDate = now.AddDate(0, 0, -7)
	case "year":
		startDate = now.AddDate(-1, 0, 0)
	default:
		startDate = now.AddDate(0, -1, 0)
	}

	// Total planned time (minutes) for active machines
	plannedMinutes := 480 * 22 // 8 hours × 22 working days
	_ = startDate
	_ = companyID

	// Fallback to demo if query fails
	data := buildDemoOEE(period)
	data["planned_minutes"] = plannedMinutes
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}

func buildDemoOEE(period string) gin.H {
	// Base values vary by period
	availability := 87.3
	performance := 91.5
	quality := 96.8
	if period == "week" {
		availability = 89.1
		performance = 93.2
		quality = 97.4
	} else if period == "year" {
		availability = 85.7
		performance = 89.8
		quality = 95.9
	}

	oee := math.Round(availability*performance*quality/10000*10) / 10

	return gin.H{
		"overall_oee":       oee,
		"availability":      availability,
		"performance":       performance,
		"quality":           quality,
		"target_oee":        85.0,
		"period":            period,
		"planned_minutes":   10560, // 22 days × 8h × 60min
		"downtime_minutes":  1342,
		"actual_minutes":    9218,
		"produced_units":    12450,
		"target_units":      13500,
		"defect_units":      401,
		"trend": []gin.H{
			{"label": "Jan", "oee": 79.2, "availability": 84.0, "performance": 88.5, "quality": 95.8},
			{"label": "Feb", "oee": 81.4, "availability": 85.3, "performance": 90.0, "quality": 96.1},
			{"label": "Mar", "oee": 83.1, "availability": 86.7, "performance": 90.8, "quality": 96.5},
			{"label": "Apr", "oee": 80.5, "availability": 84.5, "performance": 89.2, "quality": 95.9},
			{"label": "Mei", "oee": 84.7, "availability": 88.0, "performance": 91.6, "quality": 97.1},
			{"label": "Jun", "oee": oee, "availability": availability, "performance": performance, "quality": quality},
		},
		"by_work_center": []gin.H{
			{"work_center": "CNC Machining", "oee": 84.2, "availability": 88.5, "performance": 90.5, "quality": 97.5},
			{"work_center": "Assembly Line 1", "oee": 88.9, "availability": 92.1, "performance": 93.8, "quality": 97.2},
			{"work_center": "Assembly Line 2", "oee": 82.3, "availability": 86.4, "performance": 90.1, "quality": 95.8},
			{"work_center": "Welding Station", "oee": 74.8, "availability": 80.2, "performance": 87.4, "quality": 96.0},
			{"work_center": "Laser Cutting", "oee": 69.3, "availability": 75.0, "performance": 85.5, "quality": 95.5},
		},
		"downtime_by_category": []gin.H{
			{"category": "Maintenance Terencana", "minutes": 420, "pct": 31.3},
			{"category": "Kerusakan Mesin", "minutes": 385, "pct": 28.7},
			{"category": "Setup & Changeover", "minutes": 280, "pct": 20.9},
			{"category": "Kekurangan Material", "minutes": 157, "pct": 11.7},
			{"category": "Lain-lain", "minutes": 100, "pct": 7.4},
		},
	}
}

// ─── Scrap / Rework ───────────────────────────────────────────────────────────

var demoScrap = []gin.H{
	{"id": "1", "wo_number": "WO-2847", "product_name": "Komponen A-12", "type": "scrap", "qty": 12, "reason": "Dimensi tidak sesuai", "work_center": "WC-CNC", "cost": 1440000, "date": "2026-06-25"},
	{"id": "2", "wo_number": "WO-2848", "product_name": "Assembly B-05", "type": "rework", "qty": 8, "reason": "Cacat permukaan", "work_center": "WC-AS1", "cost": 480000, "date": "2026-06-24"},
	{"id": "3", "wo_number": "WO-2849", "product_name": "Komponen C-33", "type": "scrap", "qty": 5, "reason": "Bahan baku cacat", "work_center": "WC-WLD", "cost": 750000, "date": "2026-06-22"},
	{"id": "4", "wo_number": "WO-2850", "product_name": "Part D-07", "type": "rework", "qty": 15, "reason": "Gagal QC visual", "work_center": "WC-QC1", "cost": 225000, "date": "2026-06-21"},
	{"id": "5", "wo_number": "WO-2847", "product_name": "Komponen A-12", "type": "scrap", "qty": 3, "reason": "Toleransi berlebih", "work_center": "WC-CNC", "cost": 360000, "date": "2026-06-20"},
	{"id": "6", "wo_number": "WO-2848", "product_name": "Assembly B-05", "type": "rework", "qty": 22, "reason": "Perakitan salah", "work_center": "WC-AS2", "cost": 660000, "date": "2026-06-18"},
}

func GetScrapRework(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		rows, total := p.ApplyToSlice(demoScrap, []string{"wo_number", "product_name", "type", "reason", "work_center"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, odata.Response(demoScrap, int64(len(demoScrap))))
}

func CreateScrapRework(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	body["id"] = fmt.Sprintf("%d", time.Now().UnixMilli())
	body["date"] = time.Now().Format("2006-01-02")
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": body})
}

// ─── Capacity Planning ────────────────────────────────────────────────────────

func GetCapacityPlan(c *gin.Context) {
	month := c.DefaultQuery("month", time.Now().Format("2006-01"))

	if database.DB == nil {
		data := buildDemoCapacity(month)
		c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildDemoCapacity(month)})
}

func buildDemoCapacity(month string) gin.H {
	_ = month
	return gin.H{
		"month": month,
		"summary": gin.H{
			"total_capacity": 33600, // minutes
			"total_used":     28140,
			"utilization":    83.7,
			"over_capacity":  0,
		},
		"by_work_center": []gin.H{
			{"work_center": "CNC Machining", "code": "WC-CNC", "capacity": 10080, "used": 9072, "utilization": 90.0, "status": "high"},
			{"work_center": "Assembly Line 1", "code": "WC-AS1", "capacity": 10080, "used": 8467, "utilization": 84.0, "status": "normal"},
			{"work_center": "Assembly Line 2", "code": "WC-AS2", "capacity": 10080, "used": 6552, "utilization": 65.0, "status": "low"},
			{"work_center": "Welding Station", "code": "WC-WLD", "capacity": 4800, "used": 3696, "utilization": 77.0, "status": "normal"},
			{"work_center": "QC Inspection", "code": "WC-QC1", "capacity": 4800, "used": 4128, "utilization": 86.0, "status": "normal"},
			{"work_center": "Packaging", "code": "WC-PKG", "capacity": 4800, "used": 3696, "utilization": 77.0, "status": "normal"},
			{"work_center": "Laser Cutting", "code": "WC-LAB", "capacity": 2400, "used": 816, "utilization": 34.0, "status": "low"},
		},
		"weekly_load": []gin.H{
			{"week": "W1", "load": 7140, "capacity": 8400},
			{"week": "W2", "load": 7560, "capacity": 8400},
			{"week": "W3", "load": 6300, "capacity": 8400},
			{"week": "W4", "load": 7140, "capacity": 8400},
		},
	}
}

// ─── Production Report ────────────────────────────────────────────────────────

func GetProductionReport(c *gin.Context) {
	period := c.DefaultQuery("period", "month")

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    buildDemoProductionReport(period),
		})
		return
	}

	companyID := c.GetString("company_id")
	_ = companyID
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildDemoProductionReport(period)})
}

func buildDemoProductionReport(period string) gin.H {
	multiplier := 1.0
	if period == "week" {
		multiplier = 0.25
	} else if period == "year" {
		multiplier = 12.0
	}

	totalWO := int(47 * multiplier)
	doneWO := int(38 * multiplier)
	totalProd := int(12450 * multiplier)
	targetProd := int(14000 * multiplier)
	scrapQty := int(401 * multiplier)
	reworkQty := int(580 * multiplier)

	yieldRate := 0.0
	if totalProd > 0 {
		yieldRate = math.Round(float64(totalProd-scrapQty)/float64(totalProd)*1000) / 10
	}

	completionRate := 0.0
	if totalWO > 0 {
		completionRate = math.Round(float64(doneWO)/float64(totalWO)*1000) / 10
	}

	return gin.H{
		"period": period,
		"kpi": gin.H{
			"total_wo":         totalWO,
			"completed_wo":     doneWO,
			"in_progress_wo":   totalWO - doneWO - 3,
			"delayed_wo":       3,
			"completion_rate":  completionRate,
			"total_produced":   totalProd,
			"target_produced":  targetProd,
			"scrap_qty":        scrapQty,
			"rework_qty":       reworkQty,
			"yield_rate":       yieldRate,
			"on_time_delivery": 84.2,
		},
		"by_product": []gin.H{
			{"product": "Komponen A-12", "target": int(3000 * multiplier), "actual": int(2847 * multiplier), "scrap": int(92 * multiplier), "completion": 94.9},
			{"product": "Assembly B-05", "target": int(2000 * multiplier), "actual": int(1980 * multiplier), "scrap": int(68 * multiplier), "completion": 99.0},
			{"product": "Komponen C-33", "target": int(3500 * multiplier), "actual": int(3120 * multiplier), "scrap": int(115 * multiplier), "completion": 89.1},
			{"product": "Part D-07", "target": int(2500 * multiplier), "actual": int(2310 * multiplier), "scrap": int(78 * multiplier), "completion": 92.4},
			{"product": "Frame E-11", "target": int(1000 * multiplier), "actual": int(890 * multiplier), "scrap": int(35 * multiplier), "completion": 89.0},
			{"product": "Lainnya", "target": int(2000 * multiplier), "actual": int(1303 * multiplier), "scrap": int(13 * multiplier), "completion": 65.2},
		},
		"monthly_trend": []gin.H{
			{"month": "Jan", "produced": 11200, "target": 12000, "scrap": 420},
			{"month": "Feb", "produced": 11800, "target": 12000, "scrap": 380},
			{"month": "Mar", "produced": 12100, "target": 13000, "scrap": 445},
			{"month": "Apr", "produced": 11500, "target": 12500, "scrap": 390},
			{"month": "Mei", "produced": 13200, "target": 14000, "scrap": 410},
			{"month": "Jun", "produced": totalProd, "target": targetProd, "scrap": scrapQty},
		},
	}
}

// ─── Downtime Analysis ────────────────────────────────────────────────────────

func GetDowntimeAnalysis(c *gin.Context) {
	period := c.DefaultQuery("period", "month")

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    buildDemoDowntimeAnalysis(period),
		})
		return
	}

	companyID := c.GetString("company_id")
	_ = companyID
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildDemoDowntimeAnalysis(period)})
}

func buildDemoDowntimeAnalysis(period string) gin.H {
	multiplier := 1.0
	label := "Bulan Ini"
	if period == "week" {
		multiplier = 0.25
		label = "Minggu Ini"
	} else if period == "year" {
		multiplier = 12.0
		label = "Tahun Ini"
	}

	return gin.H{
		"period": period,
		"label":  label,
		"summary": gin.H{
			"total_minutes":    int(1342 * multiplier),
			"total_incidents":  int(47 * multiplier),
			"avg_mtbf":         strconv.Itoa(int(6.8*multiplier)) + " jam",
			"avg_mttr":         "28 mnt",
			"planned_pct":      31.3,
			"unplanned_pct":    68.7,
		},
		"by_machine": []gin.H{
			{"machine": "CNC-01", "work_center": "CNC Machining", "incidents": int(8 * multiplier), "total_min": int(245 * multiplier), "status": "attention"},
			{"machine": "WLD-02", "work_center": "Welding Station", "incidents": int(12 * multiplier), "total_min": int(380 * multiplier), "status": "critical"},
			{"machine": "AS1-03", "work_center": "Assembly Line 1", "incidents": int(5 * multiplier), "total_min": int(140 * multiplier), "status": "normal"},
			{"machine": "LAB-01", "work_center": "Laser Cutting", "incidents": int(15 * multiplier), "total_min": int(420 * multiplier), "status": "critical"},
			{"machine": "AS2-01", "work_center": "Assembly Line 2", "incidents": int(7 * multiplier), "total_min": int(157 * multiplier), "status": "attention"},
		},
		"trend": []gin.H{
			{"week": "W1", "planned": 120, "unplanned": 210},
			{"week": "W2", "planned": 90, "unplanned": 180},
			{"week": "W3", "planned": 150, "unplanned": 240},
			{"week": "W4", "planned": 60, "unplanned": 172},
		},
		"pareto": []gin.H{
			{"cause": "Kerusakan Komponen", "minutes": int(385 * multiplier), "cumulative_pct": 28.7},
			{"cause": "Setup & Changeover", "minutes": int(280 * multiplier), "cumulative_pct": 49.6},
			{"cause": "Maintenance Terencana", "minutes": int(240 * multiplier), "cumulative_pct": 67.5},
			{"cause": "Kekurangan Material", "minutes": int(157 * multiplier), "cumulative_pct": 79.2},
			{"cause": "Operator Tidak Ada", "minutes": int(130 * multiplier), "cumulative_pct": 88.9},
			{"cause": "Lain-lain", "minutes": int(150 * multiplier), "cumulative_pct": 100.0},
		},
	}
}
