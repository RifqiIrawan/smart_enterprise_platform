package handlers

import (
	"math"
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── MASTER ANGGARAN ─────────────────────────────────────────────────────────

func GetBudgets(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		year := time.Now().Year()
		demo := []gin.H{
			{"id": "1", "department": "Produksi", "account": "Biaya Bahan Baku", "period": periodStr(year, 1), "budget_amount": 850000000, "notes": "Anggaran material Q1", "status": "approved"},
			{"id": "2", "department": "Produksi", "account": "Biaya Bahan Baku", "period": periodStr(year, 2), "budget_amount": 900000000, "notes": "", "status": "approved"},
			{"id": "3", "department": "Produksi", "account": "Biaya Bahan Baku", "period": periodStr(year, 3), "budget_amount": 920000000, "notes": "", "status": "draft"},
			{"id": "4", "department": "Produksi", "account": "Biaya Tenaga Kerja Langsung", "period": periodStr(year, 1), "budget_amount": 320000000, "notes": "", "status": "approved"},
			{"id": "5", "department": "Produksi", "account": "Biaya Tenaga Kerja Langsung", "period": periodStr(year, 2), "budget_amount": 325000000, "notes": "", "status": "approved"},
			{"id": "6", "department": "Produksi", "account": "Biaya Tenaga Kerja Langsung", "period": periodStr(year, 3), "budget_amount": 330000000, "notes": "", "status": "submitted"},
			{"id": "7", "department": "Marketing", "account": "Biaya Pemasaran", "period": periodStr(year, 1), "budget_amount": 120000000, "notes": "Campaign Q1", "status": "approved"},
			{"id": "8", "department": "Marketing", "account": "Biaya Pemasaran", "period": periodStr(year, 2), "budget_amount": 150000000, "notes": "Pameran produk", "status": "approved"},
			{"id": "9", "department": "HR", "account": "Biaya Gaji & Tunjangan", "period": periodStr(year, 1), "budget_amount": 580000000, "notes": "", "status": "approved"},
			{"id": "10", "department": "HR", "account": "Biaya Gaji & Tunjangan", "period": periodStr(year, 2), "budget_amount": 585000000, "notes": "", "status": "approved"},
			{"id": "11", "department": "IT", "account": "Biaya Infrastruktur IT", "period": periodStr(year, 1), "budget_amount": 75000000, "notes": "Lisensi & cloud", "status": "approved"},
			{"id": "12", "department": "Operasional", "account": "Biaya Maintenance", "period": periodStr(year, 1), "budget_amount": 95000000, "notes": "PM terjadwal", "status": "approved"},
			{"id": "13", "department": "Operasional", "account": "Biaya Maintenance", "period": periodStr(year, 2), "budget_amount": 90000000, "notes": "", "status": "submitted"},
			{"id": "14", "department": "Finance", "account": "Biaya Umum & Administrasi", "period": periodStr(year, 1), "budget_amount": 45000000, "notes": "", "status": "approved"},
			{"id": "15", "department": "Finance", "account": "Biaya Umum & Administrasi", "period": periodStr(year, 2), "budget_amount": 45000000, "notes": "", "status": "draft"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"department", "account", "period", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, odata.Response([]gin.H{}, 0))
}

func CreateBudget(c *gin.Context) {
	var req struct {
		Department   string  `json:"department"`
		Account      string  `json:"account"`
		Period       string  `json:"period"`
		BudgetAmount float64 `json:"budget_amount"`
		Notes        string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-bud-id", "department": req.Department, "account": req.Account,
			"period": req.Period, "budget_amount": req.BudgetAmount, "notes": req.Notes, "status": "draft",
		}})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true})
}

func UpdateBudget(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Department   string  `json:"department"`
		Account      string  `json:"account"`
		Period       string  `json:"period"`
		BudgetAmount float64 `json:"budget_amount"`
		Notes        string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
			"id": id, "department": req.Department, "account": req.Account,
			"period": req.Period, "budget_amount": req.BudgetAmount, "notes": req.Notes,
		}})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.Exec(
		"UPDATE budgets SET department=$1, account=$2, period=$3, budget_amount=$4, notes=$5 WHERE id=$6 AND company_id=$7",
		req.Department, req.Account, req.Period, req.BudgetAmount, req.Notes, id, companyID,
	)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func DeleteBudget(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.Exec("DELETE FROM budgets WHERE id=$1 AND company_id=$2", id, companyID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ─── BUDGET APPROVAL WORKFLOW ────────────────────────────────────────────────

func SubmitBudget(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": "submitted"}})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.Exec(
		"UPDATE budgets SET status='submitted', submitted_at=NOW() WHERE id=$1 AND company_id=$2 AND status='draft'",
		id, companyID,
	)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func ApproveBudget(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetString("user_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": "approved", "approved_by": userID}})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.Exec(
		"UPDATE budgets SET status='approved', approved_by=$1, approved_at=NOW() WHERE id=$2 AND company_id=$3 AND status='submitted'",
		userID, id, companyID,
	)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func RejectBudget(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&req)
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": "rejected", "rejection_reason": req.Reason}})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.Exec(
		"UPDATE budgets SET status='rejected', rejection_reason=$1 WHERE id=$2 AND company_id=$3 AND status='submitted'",
		req.Reason, id, companyID,
	)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ─── BUDGET IMPORT ────────────────────────────────────────────────────────────

func ImportBudgetEntries(c *gin.Context) {
	var items []struct {
		Department   string  `json:"department"`
		Account      string  `json:"account"`
		Period       string  `json:"period"`
		BudgetAmount float64 `json:"budget_amount"`
		Notes        string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&items); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request: " + err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "imported": len(items), "message": "Import berhasil (demo mode)"})
		return
	}
	companyID := c.GetString("company_id")
	count := 0
	for _, item := range items {
		if item.Department == "" || item.Account == "" || item.Period == "" {
			continue
		}
		database.DB.Exec(
			"INSERT INTO budgets (company_id, department, account, period, budget_amount, notes, status) VALUES ($1,$2,$3,$4,$5,$6,'draft')",
			companyID, item.Department, item.Account, item.Period, item.BudgetAmount, item.Notes,
		)
		count++
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "imported": count})
}

func GetBudgetTemplate(c *gin.Context) {
	lines := []string{
		"department,account,period,budget_amount,notes",
		"Produksi,Biaya Bahan Baku,2026-01,850000000,Anggaran material Q1",
		"Produksi,Biaya Bahan Baku,2026-02,900000000,",
		"Marketing,Biaya Pemasaran,2026-01,120000000,Campaign Q1",
		"HR,Biaya Gaji & Tunjangan,2026-01,580000000,",
		"IT,Biaya Infrastruktur IT,2026-01,75000000,Lisensi & cloud",
	}
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=template_anggaran.csv")
	c.String(http.StatusOK, strings.Join(lines, "\n"))
}

// ─── BUDGET VS AKTUAL ────────────────────────────────────────────────────────

func GetBudgetVsActual(c *gin.Context) {
	year := c.DefaultQuery("year", "")
	if year == "" {
		year = periodStr(time.Now().Year(), 0)[:4]
	}
	if database.DB == nil {
		y := time.Now().Year()
		demo := []gin.H{
			buildBVA("Produksi", "Biaya Bahan Baku", y, []float64{850, 900, 920}, []float64{823, 941, 898}),
			buildBVA("Produksi", "Biaya Tenaga Kerja Langsung", y, []float64{320, 325, 330}, []float64{318, 327, 335}),
			buildBVA("Marketing", "Biaya Pemasaran", y, []float64{120, 150, 0}, []float64{118, 162, 0}),
			buildBVA("HR", "Biaya Gaji & Tunjangan", y, []float64{580, 585, 590}, []float64{578, 583, 589}),
			buildBVA("IT", "Biaya Infrastruktur IT", y, []float64{75, 75, 75}, []float64{71, 78, 73}),
			buildBVA("Operasional", "Biaya Maintenance", y, []float64{95, 90, 85}, []float64{88, 103, 79}),
			buildBVA("Finance", "Biaya Umum & Administrasi", y, []float64{45, 45, 45}, []float64{43, 44, 46}),
		}
		c.JSON(http.StatusOK, gin.H{"value": demo, "@odata.count": len(demo), "year": year})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "@odata.count": 0})
}

func buildBVA(dept, account string, year int, budgets, actuals []float64) gin.H {
	monthData := []gin.H{}
	totalBudget := 0.0
	totalActual := 0.0
	for i, b := range budgets {
		mon := periodStr(year, i+1)
		a := 0.0
		if i < len(actuals) {
			a = actuals[i]
		}
		b *= 1000000
		a *= 1000000
		totalBudget += b
		totalActual += a
		pct := 0.0
		if b > 0 {
			pct = math.Round(a/b*100*10) / 10
		}
		monthData = append(monthData, gin.H{
			"period": mon, "budget": b, "actual": a,
			"variance": b - a, "pct": pct,
		})
	}
	variance := totalBudget - totalActual
	pct := 0.0
	if totalBudget > 0 {
		pct = math.Round(totalActual/totalBudget*100*10) / 10
	}
	status := "ok"
	if pct > 100 {
		status = "over"
	} else if pct > 90 {
		status = "warning"
	}
	return gin.H{
		"department": dept, "account": account,
		"total_budget": totalBudget, "total_actual": totalActual,
		"variance": variance, "realization_pct": pct,
		"status": status, "months": monthData,
	}
}

// ─── BUDGET ALERTS ───────────────────────────────────────────────────────────

func GetBudgetAlerts(c *gin.Context) {
	if database.DB == nil {
		y := time.Now().Year()
		demo := []gin.H{
			{"department": "Produksi", "account": "Biaya Bahan Baku", "period": periodStr(y, 2), "budget": 900000000, "actual": 941000000, "variance": -41000000, "pct": 104.6, "severity": "over"},
			{"department": "Produksi", "account": "Biaya Tenaga Kerja Langsung", "period": periodStr(y, 3), "budget": 330000000, "actual": 335000000, "variance": -5000000, "pct": 101.5, "severity": "over"},
			{"department": "Marketing", "account": "Biaya Pemasaran", "period": periodStr(y, 2), "budget": 150000000, "actual": 162000000, "variance": -12000000, "pct": 108.0, "severity": "over"},
			{"department": "Operasional", "account": "Biaya Maintenance", "period": periodStr(y, 2), "budget": 90000000, "actual": 103000000, "variance": -13000000, "pct": 114.4, "severity": "over"},
			{"department": "Finance", "account": "Biaya Umum & Administrasi", "period": periodStr(y, 3), "budget": 45000000, "actual": 46000000, "variance": -1000000, "pct": 102.2, "severity": "over"},
			{"department": "IT", "account": "Biaya Infrastruktur IT", "period": periodStr(y, 2), "budget": 75000000, "actual": 78000000, "variance": -3000000, "pct": 104.0, "severity": "warning"},
		}
		c.JSON(http.StatusOK, gin.H{"value": demo, "@odata.count": len(demo)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "@odata.count": 0})
}

// ─── ROLLING FORECAST ────────────────────────────────────────────────────────

func GetBudgetForecast(c *gin.Context) {
	if database.DB == nil {
		y := time.Now().Year()
		now := time.Now()
		currentMonth := int(now.Month())

		depts := []struct {
			Name       string
			Account    string
			YTDBudget  float64
			YTDActual  float64
			YearBudget float64
		}{
			{"Produksi", "Biaya Bahan Baku", 2670000000, 2662000000, 10800000000},
			{"Produksi", "Biaya TK Langsung", 975000000, 980000000, 3900000000},
			{"Marketing", "Biaya Pemasaran", 270000000, 280000000, 1500000000},
			{"HR", "Biaya Gaji & Tunjangan", 1755000000, 1750000000, 7020000000},
			{"IT", "Biaya Infrastruktur IT", 225000000, 222000000, 900000000},
			{"Operasional", "Biaya Maintenance", 275000000, 270000000, 1080000000},
		}

		demo := []gin.H{}
		for _, d := range depts {
			spendRate := 1.0
			if d.YTDBudget > 0 {
				spendRate = d.YTDActual / d.YTDBudget
			}
			remainingBudget := d.YearBudget - d.YTDBudget
			forecast := d.YTDActual + remainingBudget*spendRate
			variance := d.YearBudget - forecast
			demo = append(demo, gin.H{
				"department":        d.Name,
				"account":           d.Account,
				"ytd_month":         currentMonth,
				"ytd_budget":        d.YTDBudget,
				"ytd_actual":        d.YTDActual,
				"spend_rate":        math.Round(spendRate*100*10) / 10,
				"year_budget":       d.YearBudget,
				"forecast_full_yr":  math.Round(forecast),
				"forecast_variance": math.Round(variance),
				"forecast_year":     y,
			})
		}
		c.JSON(http.StatusOK, gin.H{"value": demo, "@odata.count": len(demo)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "@odata.count": 0})
}

// ─── SCENARIOS ───────────────────────────────────────────────────────────────

func GetBudgetScenarios(c *gin.Context) {
	if database.DB == nil {
		y := time.Now().Year()
		demo := []gin.H{
			{
				"id": "1", "name": "Base Case", "year": y, "description": "Asumsi pertumbuhan bisnis 8%, inflasi 4%",
				"total_revenue_budget": 48500000000, "total_cost_budget": 36200000000, "ebitda": 12300000000, "scenario_type": "base",
			},
			{
				"id": "2", "name": "Best Case", "year": y, "description": "Pertumbuhan 15%, efisiensi operasional 5%",
				"total_revenue_budget": 55800000000, "total_cost_budget": 34400000000, "ebitda": 21400000000, "scenario_type": "best",
			},
			{
				"id": "3", "name": "Worst Case", "year": y, "description": "Pertumbuhan stagnan 2%, biaya bahan baku naik 12%",
				"total_revenue_budget": 42000000000, "total_cost_budget": 39500000000, "ebitda": 2500000000, "scenario_type": "worst",
			},
		}
		c.JSON(http.StatusOK, gin.H{"value": demo, "@odata.count": len(demo)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "@odata.count": 0})
}

func CreateBudgetScenario(c *gin.Context) {
	var req struct {
		Name               string  `json:"name"`
		Year               int     `json:"year"`
		Description        string  `json:"description"`
		TotalRevenueBudget float64 `json:"total_revenue_budget"`
		TotalCostBudget    float64 `json:"total_cost_budget"`
		ScenarioType       string  `json:"scenario_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	ebitda := req.TotalRevenueBudget - req.TotalCostBudget
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-sc-id", "name": req.Name, "year": req.Year,
			"description": req.Description, "total_revenue_budget": req.TotalRevenueBudget,
			"total_cost_budget": req.TotalCostBudget, "ebitda": ebitda,
			"scenario_type": req.ScenarioType,
		}})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true})
}

func UpdateBudgetScenario(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name               string  `json:"name"`
		Year               int     `json:"year"`
		Description        string  `json:"description"`
		TotalRevenueBudget float64 `json:"total_revenue_budget"`
		TotalCostBudget    float64 `json:"total_cost_budget"`
		ScenarioType       string  `json:"scenario_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	ebitda := req.TotalRevenueBudget - req.TotalCostBudget
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
			"id": id, "name": req.Name, "year": req.Year,
			"description": req.Description, "total_revenue_budget": req.TotalRevenueBudget,
			"total_cost_budget": req.TotalCostBudget, "ebitda": ebitda,
			"scenario_type": req.ScenarioType,
		}})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.Exec(
		"UPDATE budget_scenarios SET name=$1, year=$2, description=$3, total_revenue_budget=$4, total_cost_budget=$5, ebitda=$6, scenario_type=$7 WHERE id=$8 AND company_id=$9",
		req.Name, req.Year, req.Description, req.TotalRevenueBudget, req.TotalCostBudget, ebitda, req.ScenarioType, id, companyID,
	)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func DeleteBudgetScenario(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.Exec("DELETE FROM budget_scenarios WHERE id=$1 AND company_id=$2", id, companyID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ─── HELPER ──────────────────────────────────────────────────────────────────

func periodStr(year, month int) string {
	if month == 0 {
		return time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC).Format("2006")
	}
	return time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC).Format("2006-01")
}
