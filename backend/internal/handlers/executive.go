package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Executive Dashboard ──────────────────────────────────────────────────────

func GetExecutiveDashboard(c *gin.Context) {
	period := c.DefaultQuery("period", "thisMonth")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": buildExecDashboard(period)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildExecDashboard(period)})
}

func buildExecDashboard(period string) gin.H {
	return gin.H{
		"as_of":        time.Now().Format("02 Jan 2006, 15:04"),
		"period":       period,
		"health_score": 78,
		"health_level": "good",

		// ─ Finance
		"finance": gin.H{
			"revenue":         2840000000,
			"revenue_target":  3000000000,
			"revenue_vs_target": 94.7,
			"gross_profit":    876000000,
			"gross_margin":    30.8,
			"net_profit":      412000000,
			"net_margin":      14.5,
			"ar_outstanding":  487000000,
			"ap_outstanding":  312000000,
			"cash_position":   1240000000,
			"burn_rate":       195000000,
			"trend": []gin.H{
				{"month": "Jan", "revenue": 420000000, "profit": 58000000},
				{"month": "Feb", "revenue": 445000000, "profit": 63000000},
				{"month": "Mar", "revenue": 480000000, "profit": 71000000},
				{"month": "Apr", "revenue": 510000000, "profit": 78000000},
				{"month": "Mei", "revenue": 498000000, "profit": 72000000},
				{"month": "Jun", "revenue": 487000000, "profit": 70000000},
			},
		},

		// ─ Sales
		"sales": gin.H{
			"total_orders":         124,
			"orders_target":        140,
			"orders_vs_target":     88.6,
			"total_revenue":        2840000000,
			"avg_order_value":      22900000,
			"conversion_rate":      38.5,
			"new_customers":        8,
			"customer_retention":   87.2,
			"top_products": []gin.H{
				{"name": "Assembly B-05", "qty": 480, "revenue": 600000000},
				{"name": "Komponen A-12", "qty": 1820, "revenue": 410000000},
				{"name": "Frame E-11", "qty": 320, "revenue": 121600000},
				{"name": "Part D-07", "qty": 1100, "revenue": 264000000},
			},
		},

		// ─ Production
		"production": gin.H{
			"oee":                  81.4,
			"oee_target":           85.0,
			"output_units":         12840,
			"output_target":        14000,
			"output_vs_target":     91.7,
			"yield_rate":           97.8,
			"downtime_hours":       42.5,
			"work_orders_done":     87,
			"work_orders_total":    94,
			"scrap_cost":           18500000,
		},

		// ─ Quality
		"quality": gin.H{
			"defect_rate":          2.2,
			"defect_rate_target":   2.0,
			"inspection_pass_rate": 97.8,
			"ncr_open":             3,
			"capa_pending":         5,
			"customer_complaints":  2,
			"first_pass_yield":     95.8,
		},

		// ─ Supply Chain
		"supply_chain": gin.H{
			"otd_rate":            91.5,
			"otd_target":          95.0,
			"supplier_score_avg":  78.5,
			"po_open":             12,
			"po_overdue":          2,
			"stock_turnover":      8.4,
			"stockout_items":      3,
			"supply_risk_score":   38,
		},

		// ─ HR
		"hr": gin.H{
			"headcount":           148,
			"new_hires":           4,
			"turnover_rate":       6.8,
			"turnover_target":     8.0,
			"attendance_rate":     96.2,
			"training_completion": 82.0,
			"open_positions":      7,
			"payroll_total":       892000000,
		},

		// ─ Alerts
		"alerts": []gin.H{
			{"level": "critical", "module": "Supply Chain", "msg": "UD Karya Mandiri: OTD turun ke 68%, perlu evaluasi kontrak"},
			{"level": "warning",  "module": "Quality", "msg": "Defect rate 2.2% — sedikit di atas target 2.0%"},
			{"level": "warning",  "module": "Production", "msg": "OEE 81.4% — masih 3.6% di bawah target"},
			{"level": "warning",  "module": "Sales", "msg": "Pencapaian order 88.6% — perlu akselerasi H2"},
			{"level": "info",     "module": "Finance", "msg": "Cash position sehat: Rp 1,24M · Burn rate normal"},
		},
	}
}

// ─── KPI Targets ──────────────────────────────────────────────────────────────

var kpiTargets = map[string]float64{
	"revenue":          3000000000,
	"gross_margin":     32,
	"net_margin":       16,
	"oee":              85,
	"defect_rate":      2,
	"otd":              95,
	"attendance_rate":  97,
	"turnover_rate":    8,
	"training_completion": 90,
	"customer_retention": 90,
}

func GetKPITargets(c *gin.Context) {
	targets := []gin.H{}
	for k, v := range kpiTargets {
		targets = append(targets, gin.H{"key": k, "target": v})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": targets})
}

func UpdateKPITargets(c *gin.Context) {
	var body map[string]float64
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	for k, v := range body {
		kpiTargets[k] = v
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Target KPI berhasil diperbarui"})
}

// ─── Management Report ────────────────────────────────────────────────────────

func GetManagementReport(c *gin.Context) {
	period := c.DefaultQuery("period", "Q2-2026")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": buildMgmtReport(period)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildMgmtReport(period)})
}

func buildMgmtReport(period string) gin.H {
	return gin.H{
		"period":      period,
		"prepared_by": "System — Auto Generated",
		"generated":   time.Now().Format("02 January 2006"),
		"company":     "PT Smart Enterprise Platform",

		"executive_summary": "Kinerja perusahaan pada " + period + " menunjukkan pertumbuhan positif di sisi keuangan dengan revenue Rp 2,84M (94,7% dari target). Operasional pabrik berjalan baik dengan OEE 81,4%, namun masih memerlukan peningkatan untuk mencapai target 85%. Area yang perlu perhatian: supply chain (OTD 91,5%), kualitas (defect rate sedikit di atas target), dan akselerasi penjualan di kuartal berikutnya.",

		"sections": []gin.H{
			{
				"title": "Kinerja Keuangan",
				"metrics": []gin.H{
					{"label": "Revenue", "actual": "Rp 2,84M", "target": "Rp 3,00M", "pct": 94.7, "status": "warning"},
					{"label": "Gross Margin", "actual": "30,8%", "target": "32%", "pct": 96.3, "status": "warning"},
					{"label": "Net Margin", "actual": "14,5%", "target": "16%", "pct": 90.6, "status": "warning"},
					{"label": "Cash Position", "actual": "Rp 1,24M", "target": "-", "pct": 100, "status": "good"},
				},
				"note": "Keuangan sehat, perlu dorongan revenue untuk kejar target akhir tahun.",
			},
			{
				"title": "Operasional Produksi",
				"metrics": []gin.H{
					{"label": "OEE", "actual": "81,4%", "target": "85%", "pct": 95.8, "status": "warning"},
					{"label": "Output vs Target", "actual": "12.840 unit", "target": "14.000 unit", "pct": 91.7, "status": "warning"},
					{"label": "Yield Rate", "actual": "97,8%", "target": "98%", "pct": 99.8, "status": "good"},
					{"label": "WO Completion", "actual": "87/94", "target": "94/94", "pct": 92.6, "status": "warning"},
				},
				"note": "Downtime 42,5 jam perlu diturunkan. Fokus pada preventive maintenance.",
			},
			{
				"title": "Kualitas",
				"metrics": []gin.H{
					{"label": "Defect Rate", "actual": "2,2%", "target": "2,0%", "pct": 91, "status": "warning"},
					{"label": "Inspection Pass Rate", "actual": "97,8%", "target": "98%", "pct": 99.8, "status": "good"},
					{"label": "NCR Open", "actual": "3", "target": "0", "pct": 0, "status": "warning"},
					{"label": "First Pass Yield", "actual": "95,8%", "target": "96%", "pct": 99.8, "status": "good"},
				},
				"note": "Tingkat defect sedikit di atas target. CAPA 5 item masih pending.",
			},
			{
				"title": "Supply Chain",
				"metrics": []gin.H{
					{"label": "On-Time Delivery", "actual": "91,5%", "target": "95%", "pct": 96.3, "status": "warning"},
					{"label": "Supplier Score Avg", "actual": "78,5", "target": "85", "pct": 92.4, "status": "warning"},
					{"label": "Stock Turnover", "actual": "8,4×", "target": "9×", "pct": 93.3, "status": "warning"},
					{"label": "Supply Risk Score", "actual": "38", "target": "<30", "pct": 79, "status": "critical"},
				},
				"note": "1 supplier perlu evaluasi kinerja. Risiko supply chain perlu mitigasi aktif.",
			},
			{
				"title": "Sumber Daya Manusia",
				"metrics": []gin.H{
					{"label": "Attendance Rate", "actual": "96,2%", "target": "97%", "pct": 99.2, "status": "good"},
					{"label": "Turnover Rate", "actual": "6,8%", "target": "<8%", "pct": 100, "status": "good"},
					{"label": "Training Completion", "actual": "82%", "target": "90%", "pct": 91.1, "status": "warning"},
					{"label": "Open Positions", "actual": "7", "target": "3", "pct": 43, "status": "critical"},
				},
				"note": "HR dalam kondisi baik. Percepat proses rekrutmen untuk posisi open.",
			},
		},
		"recommendations": []gin.H{
			{"priority": 1, "area": "Sales", "action": "Kampanye pemasaran intensif Q3 untuk kejar gap revenue Rp 160jt"},
			{"priority": 2, "area": "Supply Chain", "action": "Evaluasi dan audit UD Karya Mandiri; cari backup supplier"},
			{"priority": 3, "area": "Production", "action": "Analisis root cause downtime 42,5 jam; implementasi TPM"},
			{"priority": 4, "area": "HR", "action": "Tutup 7 posisi open dalam 45 hari ke depan"},
			{"priority": 5, "area": "Quality", "action": "Selesaikan 5 CAPA pending sebelum akhir bulan"},
		},
	}
}
