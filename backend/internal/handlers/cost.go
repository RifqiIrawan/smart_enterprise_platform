package handlers

import (
	"fmt"
	"net/http"
	"sep/backend/internal/database"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Cost Centers ─────────────────────────────────────────────────────────────

func GetCostCenters(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 5,
			"value": []gin.H{
				{"id": "cc1", "code": "CC-MFG-01", "name": "Produksi Line A", "department": "Manufacturing", "overhead_rate": 0.35, "status": "active"},
				{"id": "cc2", "code": "CC-MFG-02", "name": "Produksi Line B", "department": "Manufacturing", "overhead_rate": 0.40, "status": "active"},
				{"id": "cc3", "code": "CC-QC-01", "name": "Quality Control", "department": "QC", "overhead_rate": 0.15, "status": "active"},
				{"id": "cc4", "code": "CC-WH-01", "name": "Gudang & Logistik", "department": "Warehouse", "overhead_rate": 0.10, "status": "active"},
				{"id": "cc5", "code": "CC-ADM-01", "name": "Administrasi & Umum", "department": "Administration", "overhead_rate": 0.12, "status": "active"},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT id, code, name, COALESCE(department,''), overhead_rate,
		        COALESCE(description,''), status
		 FROM cost_centers WHERE company_id=$1 ORDER BY code`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, code, name, dept, desc, status string
		var rate float64
		rows.Scan(&id, &code, &name, &dept, &rate, &desc, &status)
		list = append(list, gin.H{"id": id, "code": code, "name": name, "department": dept, "overhead_rate": rate, "description": desc, "status": status})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreateCostCenter(c *gin.Context) {
	companyID := c.GetString("company_id")
	var body struct {
		Code         string  `json:"code"`
		Name         string  `json:"name"`
		Department   string  `json:"department"`
		OverheadRate float64 `json:"overhead_rate"`
		Description  string  `json:"description"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "Cost center ditambah (demo)"})
		return
	}
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO cost_centers (company_id, code, name, department, overhead_rate, description)
		 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		companyID, body.Code, body.Name, body.Department, body.OverheadRate, body.Description,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Cost center berhasil ditambahkan"})
}

func UpdateCostCenter(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Name         string  `json:"name"`
		Department   string  `json:"department"`
		OverheadRate float64 `json:"overhead_rate"`
		Description  string  `json:"description"`
		Status       string  `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Updated (demo)"})
		return
	}
	database.DB.Exec(
		`UPDATE cost_centers SET name=$1, department=$2, overhead_rate=$3, description=$4, status=$5 WHERE id=$6`,
		body.Name, body.Department, body.OverheadRate, body.Description, body.Status, id,
	)
	c.JSON(http.StatusOK, gin.H{"message": "Cost center diperbarui"})
}

func DeleteCostCenter(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	database.DB.Exec(`DELETE FROM cost_centers WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "Cost center dihapus"})
}

// ─── Work Order Costs ─────────────────────────────────────────────────────────

func GetWOCosts(c *gin.Context) {
	companyID := c.GetString("company_id")
	period := c.Query("period")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 6,
			"value": []gin.H{
				{"id": "wc1", "wo_number": "WO/2026/0001", "product_name": "Bracket Assembly A", "period": "2026-06", "material_cost": 8500000, "labor_cost": 2400000, "overhead_cost": 3740000, "total_cost": 14640000, "std_cost": 14000000, "variance": 640000},
				{"id": "wc2", "wo_number": "WO/2026/0002", "product_name": "Housing Cover B", "period": "2026-06", "material_cost": 12000000, "labor_cost": 3600000, "overhead_cost": 5600000, "total_cost": 21200000, "std_cost": 20000000, "variance": 1200000},
				{"id": "wc3", "wo_number": "WO/2026/0003", "product_name": "Shaft Assembly C", "period": "2026-06", "material_cost": 6200000, "labor_cost": 1800000, "overhead_cost": 2800000, "total_cost": 10800000, "std_cost": 11000000, "variance": -200000},
				{"id": "wc4", "wo_number": "WO/2026/0004", "product_name": "Panel Frame D", "period": "2026-06", "material_cost": 18000000, "labor_cost": 5400000, "overhead_cost": 8400000, "total_cost": 31800000, "std_cost": 30000000, "variance": 1800000},
				{"id": "wc5", "wo_number": "WO/2026/0005", "product_name": "Gear Box E", "period": "2026-06", "material_cost": 25000000, "labor_cost": 7500000, "overhead_cost": 11670000, "total_cost": 44170000, "std_cost": 45000000, "variance": -830000},
				{"id": "wc6", "wo_number": "WO/2026/0006", "product_name": "Motor Housing F", "period": "2026-06", "material_cost": 9800000, "labor_cost": 2940000, "overhead_cost": 4572000, "total_cost": 17312000, "std_cost": 17000000, "variance": 312000},
			},
		})
		return
	}
	query := `SELECT id, COALESCE(wo_number,''), COALESCE(product_name,''), COALESCE(period,''),
	           material_cost, labor_cost, overhead_cost, total_cost, std_cost, variance, COALESCE(notes,'')
	           FROM wo_costs WHERE company_id=$1`
	args := []interface{}{companyID}
	if period != "" {
		query += " AND period=$2"
		args = append(args, period)
	}
	query += " ORDER BY created_at DESC"
	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, woNum, prodName, per, notes string
		var mat, labor, ovhd, total, std, variance int64
		rows.Scan(&id, &woNum, &prodName, &per, &mat, &labor, &ovhd, &total, &std, &variance, &notes)
		list = append(list, gin.H{
			"id": id, "wo_number": woNum, "product_name": prodName, "period": per,
			"material_cost": mat, "labor_cost": labor, "overhead_cost": ovhd,
			"total_cost": total, "std_cost": std, "variance": variance, "notes": notes,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreateWOCost(c *gin.Context) {
	companyID := c.GetString("company_id")
	var body struct {
		WONumber     string `json:"wo_number"`
		ProductName  string `json:"product_name"`
		Period       string `json:"period"`
		MaterialCost int64  `json:"material_cost"`
		LaborCost    int64  `json:"labor_cost"`
		OverheadRate float64 `json:"overhead_rate"` // as decimal, e.g. 0.35
		StdCost      int64  `json:"std_cost"`
		Notes        string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "Biaya WO dicatat (demo)"})
		return
	}
	if body.Period == "" {
		body.Period = time.Now().Format("2006-01")
	}
	// overhead = (material + labor) × overhead_rate
	ovhd := int64(float64(body.MaterialCost+body.LaborCost) * body.OverheadRate)
	total := body.MaterialCost + body.LaborCost + ovhd
	variance := total - body.StdCost

	var id string
	err := database.DB.QueryRow(
		`INSERT INTO wo_costs (company_id, wo_number, product_name, period, material_cost, labor_cost, overhead_cost, total_cost, std_cost, variance, notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
		companyID, body.WONumber, body.ProductName, body.Period,
		body.MaterialCost, body.LaborCost, ovhd, total, body.StdCost, variance, body.Notes,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "total_cost": total, "overhead_cost": ovhd, "variance": variance, "message": "Biaya WO berhasil dicatat"})
}

func DeleteWOCost(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	database.DB.Exec(`DELETE FROM wo_costs WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "Data biaya WO dihapus"})
}

// ─── Standard Costs ───────────────────────────────────────────────────────────

func GetStandardCosts(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 5,
			"value": []gin.H{
				{"id": "sc1", "product_name": "Bracket Assembly A", "material_std": 8000000, "labor_std": 2200000, "overhead_std": 3570000, "total_std": 13770000, "effective_date": "2026-01-01"},
				{"id": "sc2", "product_name": "Housing Cover B", "material_std": 11000000, "labor_std": 3300000, "overhead_std": 5093000, "total_std": 19393000, "effective_date": "2026-01-01"},
				{"id": "sc3", "product_name": "Shaft Assembly C", "material_std": 6000000, "labor_std": 1800000, "overhead_std": 2800000, "total_std": 10600000, "effective_date": "2026-01-01"},
				{"id": "sc4", "product_name": "Panel Frame D", "material_std": 17000000, "labor_std": 5100000, "overhead_std": 7905000, "total_std": 30005000, "effective_date": "2026-01-01"},
				{"id": "sc5", "product_name": "Gear Box E", "material_std": 24000000, "labor_std": 7200000, "overhead_std": 11160000, "total_std": 42360000, "effective_date": "2026-01-01"},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT id, product_name, material_std, labor_std, overhead_std, total_std,
		        COALESCE(effective_date::text,''), COALESCE(notes,'')
		 FROM standard_costs WHERE company_id=$1 ORDER BY product_name`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, prodName, effDate, notes string
		var mat, labor, ovhd, total int64
		rows.Scan(&id, &prodName, &mat, &labor, &ovhd, &total, &effDate, &notes)
		list = append(list, gin.H{
			"id": id, "product_name": prodName, "material_std": mat,
			"labor_std": labor, "overhead_std": ovhd, "total_std": total,
			"effective_date": effDate, "notes": notes,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func UpsertStandardCost(c *gin.Context) {
	companyID := c.GetString("company_id")
	var body struct {
		ProductName   string `json:"product_name"`
		MaterialStd   int64  `json:"material_std"`
		LaborStd      int64  `json:"labor_std"`
		OverheadStd   int64  `json:"overhead_std"`
		EffectiveDate string `json:"effective_date"`
		Notes         string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Standard cost disimpan (demo)"})
		return
	}
	totalStd := body.MaterialStd + body.LaborStd + body.OverheadStd
	if body.EffectiveDate == "" {
		body.EffectiveDate = time.Now().Format("2006-01-02")
	}
	// Try update first
	res, _ := database.DB.Exec(
		`UPDATE standard_costs SET material_std=$1, labor_std=$2, overhead_std=$3, total_std=$4, effective_date=$5, notes=$6
		 WHERE company_id=$7 AND product_name=$8`,
		body.MaterialStd, body.LaborStd, body.OverheadStd, totalStd, body.EffectiveDate, body.Notes, companyID, body.ProductName,
	)
	n, _ := res.RowsAffected()
	if n == 0 {
		database.DB.Exec(
			`INSERT INTO standard_costs (company_id, product_name, material_std, labor_std, overhead_std, total_std, effective_date, notes)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
			companyID, body.ProductName, body.MaterialStd, body.LaborStd, body.OverheadStd, totalStd, body.EffectiveDate, body.Notes,
		)
	}
	c.JSON(http.StatusOK, gin.H{"total_std": totalStd, "message": "Standard cost disimpan"})
}

func DeleteStandardCost(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	database.DB.Exec(`DELETE FROM standard_costs WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "Standard cost dihapus"})
}

// ─── Cost Reports ─────────────────────────────────────────────────────────────

func GetCostVariance(c *gin.Context) {
	companyID := c.GetString("company_id")
	period := c.Query("period")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 6,
			"value": []gin.H{
				{"product_name": "Bracket Assembly A", "total_cost": 14640000, "std_cost": 14000000, "variance": 640000, "variance_pct": 4.57, "status": "unfavorable"},
				{"product_name": "Housing Cover B", "total_cost": 21200000, "std_cost": 20000000, "variance": 1200000, "variance_pct": 6.00, "status": "unfavorable"},
				{"product_name": "Shaft Assembly C", "total_cost": 10800000, "std_cost": 11000000, "variance": -200000, "variance_pct": -1.82, "status": "favorable"},
				{"product_name": "Panel Frame D", "total_cost": 31800000, "std_cost": 30000000, "variance": 1800000, "variance_pct": 6.00, "status": "unfavorable"},
				{"product_name": "Gear Box E", "total_cost": 44170000, "std_cost": 45000000, "variance": -830000, "variance_pct": -1.84, "status": "favorable"},
				{"product_name": "Motor Housing F", "total_cost": 17312000, "std_cost": 17000000, "variance": 312000, "variance_pct": 1.84, "status": "unfavorable"},
			},
			"summary": gin.H{"total_actual": 139922000, "total_std": 137000000, "total_variance": 2922000, "variance_pct": 2.13},
		})
		return
	}
	query := `SELECT product_name, SUM(total_cost) AS actual, SUM(std_cost) AS std,
	           SUM(variance) AS var
	           FROM wo_costs WHERE company_id=$1`
	args := []interface{}{companyID}
	if period != "" {
		query += " AND period=$2"
		args = append(args, period)
	}
	query += " GROUP BY product_name ORDER BY ABS(SUM(variance)) DESC"
	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	var totalActual, totalStd, totalVariance int64
	for rows.Next() {
		var prodName string
		var actual, std, variance int64
		rows.Scan(&prodName, &actual, &std, &variance)
		varPct := 0.0
		if std != 0 {
			varPct = float64(variance) / float64(std) * 100
		}
		status := "favorable"
		if variance > 0 {
			status = "unfavorable"
		}
		list = append(list, gin.H{
			"product_name": prodName, "total_cost": actual, "std_cost": std,
			"variance": variance, "variance_pct": varPct, "status": status,
		})
		totalActual += actual
		totalStd += std
		totalVariance += variance
	}
	if list == nil {
		list = []gin.H{}
	}
	varPct := 0.0
	if totalStd != 0 {
		varPct = float64(totalVariance) / float64(totalStd) * 100
	}
	c.JSON(http.StatusOK, gin.H{
		"@odata.count": len(list),
		"value":        list,
		"summary": gin.H{
			"total_actual": totalActual, "total_std": totalStd,
			"total_variance": totalVariance, "variance_pct": varPct,
		},
	})
}

func GetCOGSReport(c *gin.Context) {
	companyID := c.GetString("company_id")
	period := c.Query("period")
	if period == "" {
		period = time.Now().Format("2006-01")
	}
	if database.DB == nil {
		months := []string{}
		cogs := []int64{}
		for i := 5; i >= 0; i-- {
			t := time.Now().AddDate(0, -i, 0)
			months = append(months, t.Format("2006-01"))
			base := int64(85000000 + i*5000000)
			cogs = append(cogs, base)
		}
		c.JSON(http.StatusOK, gin.H{
			"period":      period,
			"cogs_detail": []gin.H{
				{"category": "Material Langsung", "amount": 52000000, "pct": 61.2},
				{"category": "Tenaga Kerja Langsung", "amount": 15600000, "pct": 18.4},
				{"category": "Overhead Pabrik", "amount": 17400000, "pct": 20.5},
			},
			"total_cogs": 85000000,
			"gross_revenue": 127500000,
			"gross_profit": 42500000,
			"gross_margin_pct": 33.3,
			"trend": gin.H{"months": months, "cogs": cogs},
		})
		return
	}
	var totalCOGS int64
	database.DB.QueryRow(
		`SELECT COALESCE(SUM(total_cost),0) FROM wo_costs WHERE company_id=$1 AND period=$2`, companyID, period,
	).Scan(&totalCOGS)
	var revenue int64
	database.DB.QueryRow(
		`SELECT COALESCE(SUM(total),0) FROM customer_invoices WHERE company_id=$1 AND to_char(date,'YYYY-MM')=$2`, companyID, period,
	).Scan(&revenue)
	grossProfit := revenue - totalCOGS
	margin := 0.0
	if revenue > 0 {
		margin = float64(grossProfit) / float64(revenue) * 100
	}
	c.JSON(http.StatusOK, gin.H{
		"period":           period,
		"total_cogs":       totalCOGS,
		"gross_revenue":    revenue,
		"gross_profit":     grossProfit,
		"gross_margin_pct": margin,
	})
}

func GetProfitabilityReport(c *gin.Context) {
	companyID := c.GetString("company_id")
	period := c.Query("period")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 5,
			"value": []gin.H{
				{"product_name": "Bracket Assembly A", "revenue": 22500000, "cogs": 14640000, "gross_profit": 7860000, "margin_pct": 34.9},
				{"product_name": "Housing Cover B", "revenue": 32000000, "cogs": 21200000, "gross_profit": 10800000, "margin_pct": 33.8},
				{"product_name": "Shaft Assembly C", "revenue": 16500000, "cogs": 10800000, "gross_profit": 5700000, "margin_pct": 34.5},
				{"product_name": "Panel Frame D", "revenue": 48000000, "cogs": 31800000, "gross_profit": 16200000, "margin_pct": 33.8},
				{"product_name": "Gear Box E", "revenue": 72000000, "cogs": 44170000, "gross_profit": 27830000, "margin_pct": 38.7},
			},
		})
		return
	}
	query := `SELECT wc.product_name,
	           COALESCE(SUM(wc.total_cost),0) AS cogs
	           FROM wo_costs wc WHERE wc.company_id=$1`
	args := []interface{}{companyID}
	if period != "" {
		query += " AND wc.period=$2"
		args = append(args, period)
	}
	query += " GROUP BY wc.product_name ORDER BY cogs DESC"
	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var prodName string
		var cogs int64
		rows.Scan(&prodName, &cogs)
		// Approximate revenue as cost × margin factor (no invoice-product link in this demo)
		revenue := int64(float64(cogs) * 1.5)
		profit := revenue - cogs
		margin := 0.0
		if revenue > 0 {
			margin = float64(profit) / float64(revenue) * 100
		}
		list = append(list, gin.H{
			"product_name": prodName, "revenue": revenue, "cogs": cogs,
			"gross_profit": profit, "margin_pct": margin,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func GetCostCenterReport(c *gin.Context) {
	companyID := c.GetString("company_id")
	period := c.Query("period")
	if period == "" {
		period = time.Now().Format("2006-01")
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"period": period,
			"@odata.count": 5,
			"value": []gin.H{
				{"cost_center": "Produksi Line A", "department": "Manufacturing", "actual_cost": 45000000, "allocated": 15750000, "overhead_rate": 0.35},
				{"cost_center": "Produksi Line B", "department": "Manufacturing", "actual_cost": 38000000, "allocated": 15200000, "overhead_rate": 0.40},
				{"cost_center": "Quality Control", "department": "QC", "actual_cost": 12000000, "allocated": 1800000, "overhead_rate": 0.15},
				{"cost_center": "Gudang & Logistik", "department": "Warehouse", "actual_cost": 8500000, "allocated": 850000, "overhead_rate": 0.10},
				{"cost_center": "Administrasi & Umum", "department": "Administration", "actual_cost": 15000000, "allocated": 1800000, "overhead_rate": 0.12},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT cc.name, COALESCE(cc.department,''), cc.overhead_rate,
		        COALESCE(SUM(ca.actual_cost),0) AS actual,
		        COALESCE(SUM(ca.allocated_cost),0) AS allocated
		 FROM cost_centers cc
		 LEFT JOIN cost_allocations ca ON ca.cost_center_id = cc.id AND ca.period = $2
		 WHERE cc.company_id=$1 AND cc.status='active'
		 GROUP BY cc.name, cc.department, cc.overhead_rate
		 ORDER BY actual DESC`, companyID, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var name, dept string
		var rate float64
		var actual, allocated int64
		rows.Scan(&name, &dept, &rate, &actual, &allocated)
		list = append(list, gin.H{
			"cost_center": name, "department": dept, "overhead_rate": rate,
			"actual_cost": actual, "allocated": allocated,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"period": period, "@odata.count": len(list), "value": list})
}

func GetCostSummary(c *gin.Context) {
	companyID := c.GetString("company_id")
	period := c.Query("period")
	if period == "" {
		period = time.Now().Format("2006-01")
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"period":           period,
			"total_material":   123500000,
			"total_labor":      37020000,
			"total_overhead":   57522000,
			"total_production": 218042000,
			"total_std":        210000000,
			"total_variance":   8042000,
			"variance_pct":     3.83,
			"wo_count":         6,
			"cost_centers":     5,
		})
		return
	}
	var totalMat, totalLabor, totalOvhd, totalProd, totalStd, totalVar int64
	var woCount int
	database.DB.QueryRow(
		`SELECT COALESCE(SUM(material_cost),0), COALESCE(SUM(labor_cost),0),
		        COALESCE(SUM(overhead_cost),0), COALESCE(SUM(total_cost),0),
		        COALESCE(SUM(std_cost),0), COALESCE(SUM(variance),0), COUNT(*)
		 FROM wo_costs WHERE company_id=$1 AND period=$2`, companyID, period,
	).Scan(&totalMat, &totalLabor, &totalOvhd, &totalProd, &totalStd, &totalVar, &woCount)
	varPct := 0.0
	if totalStd > 0 {
		varPct = float64(totalVar) / float64(totalStd) * 100
	}
	var ccCount int
	database.DB.QueryRow(`SELECT COUNT(*) FROM cost_centers WHERE company_id=$1 AND status='active'`, companyID).Scan(&ccCount)
	c.JSON(http.StatusOK, gin.H{
		"period":           period,
		"total_material":   totalMat,
		"total_labor":      totalLabor,
		"total_overhead":   totalOvhd,
		"total_production": totalProd,
		"total_std":        totalStd,
		"total_variance":   totalVar,
		"variance_pct":     fmt.Sprintf("%.2f", varPct),
		"wo_count":         woCount,
		"cost_centers":     ccCount,
	})
}
