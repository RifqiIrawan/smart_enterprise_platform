package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"time"

	"github.com/gin-gonic/gin"
)

// ANL-01 + ANL-02: Aggregated KPI with period filter
func GetAnalyticsSummary(c *gin.Context) {
	period := c.DefaultQuery("period", "month")

	if database.DB == nil {
		// Demo data scaled by period
		multiplier := map[string]float64{"today": 0.033, "week": 0.25, "month": 1, "year": 12}[period]
		if multiplier == 0 {
			multiplier = 1
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"period":  period,
			"kpi": gin.H{
				"total_employees":   248,
				"active_workorders": 8,
				"total_inventory":   6,
				"stock_low":         3,
				"pending_pr":        3,
				"total_assets":      42,
				"attendance_rate":   97.2,
				"oee":               89.2,
			},
			"trends": buildTrends(period),
			"dept_breakdown": []gin.H{
				{"dept": "Produksi", "employees": 85, "workorders": 12, "score": 88},
				{"dept": "Warehouse", "employees": 32, "workorders": 0, "score": 92},
				{"dept": "HR", "employees": 18, "workorders": 0, "score": 85},
				{"dept": "Finance", "employees": 15, "workorders": 0, "score": 94},
				{"dept": "IT", "employees": 22, "workorders": 0, "score": 90},
				{"dept": "Marketing", "employees": 28, "workorders": 0, "score": 78},
				{"dept": "Operasional", "employees": 48, "workorders": 5, "score": 86},
			},
			"module_health": []gin.H{
				{"module": "Factory", "status": "good", "score": 89},
				{"module": "Warehouse", "status": "warning", "score": 72},
				{"module": "HRIS", "status": "good", "score": 97},
				{"module": "Purchasing", "status": "good", "score": 85},
				{"module": "Asset", "status": "good", "score": 91},
				{"module": "Security", "status": "good", "score": 88},
			},
		})
		return
	}

	companyID := c.GetString("company_id")
	var fromDate time.Time
	switch period {
	case "today":
		fromDate = time.Now().Truncate(24 * time.Hour)
	case "week":
		fromDate = time.Now().AddDate(0, 0, -7)
	case "year":
		fromDate = time.Now().AddDate(-1, 0, 0)
	default:
		fromDate = time.Now().AddDate(0, -1, 0)
	}

	kpi := gin.H{}
	var totalEmp, activeWO, stockLow, pendingPR, totalAssets int
	database.DB.QueryRow(`SELECT COUNT(*) FROM employees WHERE company_id=$1 AND status='active'`, companyID).Scan(&totalEmp)
	database.DB.QueryRow(`SELECT COUNT(*) FROM work_orders WHERE company_id=$1 AND status='running'`, companyID).Scan(&activeWO)
	database.DB.QueryRow(`SELECT COUNT(*) FROM inventory WHERE company_id=$1 AND qty < min_stock`, companyID).Scan(&stockLow)
	database.DB.QueryRow(`SELECT COUNT(*) FROM purchase_requests WHERE company_id=$1 AND status='pending' AND created_at>=$2`, companyID, fromDate).Scan(&pendingPR)
	database.DB.QueryRow(`SELECT COUNT(*) FROM assets WHERE company_id=$1`, companyID).Scan(&totalAssets)

	kpi["total_employees"] = totalEmp
	kpi["active_workorders"] = activeWO
	kpi["stock_low"] = stockLow
	kpi["pending_pr"] = pendingPR
	kpi["total_assets"] = totalAssets
	kpi["oee"] = 89.2
	kpi["attendance_rate"] = 97.2

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"period":  period,
		"kpi":     kpi,
		"trends":  buildTrends(period),
	})
}

func buildTrends(period string) []gin.H {
	now := time.Now()
	switch period {
	case "today":
		data := make([]gin.H, 8)
		for i := range data {
			h := now.Add(time.Duration(-7+i) * time.Hour)
			data[i] = gin.H{
				"label":   h.Format("15:00"),
				"revenue": int64(50000000 + float64(i)*8000000 + float64(i%3)*2000000),
				"cost":    int64(30000000 + float64(i)*5000000),
				"orders":  1 + i%3,
			}
		}
		return data
	case "week":
		days := []string{"Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"}
		data := make([]gin.H, 7)
		for i, d := range days {
			data[i] = gin.H{
				"label":   d,
				"revenue": int64(300000000 + float64(i)*50000000 + float64(i%2)*20000000),
				"cost":    int64(180000000 + float64(i)*30000000),
				"orders":  3 + i%4,
			}
		}
		return data
	case "year":
		months := []string{"Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"}
		data := make([]gin.H, 12)
		for i, m := range months {
			data[i] = gin.H{
				"label":   m,
				"revenue": int64(3800000000 + float64(i)*100000000 + float64(i%3)*50000000),
				"cost":    int64(2500000000 + float64(i)*60000000),
				"orders":  20 + i*2,
			}
		}
		return data
	default: // month
		data := make([]gin.H, 6)
		weeks := []string{"Mg-1", "Mg-2", "Mg-3", "Mg-4", "Mg-5", "Mg-6"}
		for i, w := range weeks {
			data[i] = gin.H{
				"label":   w,
				"revenue": int64(800000000 + float64(i)*80000000 + float64(i%2)*30000000),
				"cost":    int64(500000000 + float64(i)*50000000),
				"orders":  5 + i,
			}
		}
		return data
	}
}

// ANL-03: Role-based KPI
func GetRoleDashboard(c *gin.Context) {
	role := c.GetString("role")
	if role == "" {
		role = "staff"
	}

	switch role {
	case "superadmin", "direktur":
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"role":    role,
			"view":    "executive",
			"metrics": []gin.H{
				{"label": "Revenue Bulan Ini", "value": "Rp 4,9M", "trend": 8.3, "category": "financial"},
				{"label": "Profit Margin", "value": "36.2%", "trend": 2.1, "category": "financial"},
				{"label": "OEE Produksi", "value": "89.4%", "trend": 1.2, "category": "operational"},
				{"label": "Total Karyawan", "value": "248", "trend": 3.3, "category": "hr"},
				{"label": "Aset Aktif", "value": "42 unit", "trend": 0, "category": "asset"},
				{"label": "PR Pending", "value": "3", "trend": -1, "category": "purchasing"},
			},
		})
	case "manager", "manajer":
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"role":    role,
			"view":    "manager",
			"metrics": []gin.H{
				{"label": "WO Aktif", "value": "8", "trend": 2, "category": "operational"},
				{"label": "Efisiensi Tim", "value": "92%", "trend": 1.5, "category": "hr"},
				{"label": "Stock Low Alert", "value": "3 item", "trend": -1, "category": "warehouse"},
				{"label": "Maintenance Due", "value": "2 aset", "trend": 0, "category": "asset"},
			},
		})
	default:
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"role":    role,
			"view":    "staff",
			"metrics": []gin.H{
				{"label": "Tugas Hari Ini", "value": "5 item", "trend": 0, "category": "task"},
				{"label": "Absensi Bulan Ini", "value": "22/22", "trend": 0, "category": "hr"},
			},
		})
	}
}
