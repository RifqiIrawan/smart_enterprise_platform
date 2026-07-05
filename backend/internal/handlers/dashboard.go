package handlers

import (
	"math/rand"
	"net/http"
	"sep/backend/internal/database"
	"time"

	"github.com/gin-gonic/gin"
)

func DashboardKPI(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"oee":               89.2,
				"revenue":           4900000000,
				"total_employees":   248,
				"energy_kwh":        1240,
				"active_workorders": 8,
				"stock_low":         5,
				"stock_out":         3,
				"attendance_rate":   97.2,
				"incidents":         2,
				"total_assets":      42,
				"active_alerts":     4,
				"total_vendors":     12,
				"pending_pr":        3,
			},
		})
		return
	}

	companyID := c.GetString("company_id")
	kpi := gin.H{}

	// Real DB aggregations
	var totalEmployees, activeWorkorders, stockLow, stockOut, totalAssets, pendingPR, totalVendors int
	database.DB.QueryRow(`SELECT COUNT(*) FROM employees WHERE company_id=$1 AND status='active'`, companyID).Scan(&totalEmployees)
	database.DB.QueryRow(`SELECT COUNT(*) FROM work_orders WHERE company_id=$1 AND status='running'`, companyID).Scan(&activeWorkorders)
	database.DB.QueryRow(`SELECT COUNT(*) FROM inventory WHERE company_id=$1 AND qty < min_stock AND qty > 0`, companyID).Scan(&stockLow)
	database.DB.QueryRow(`SELECT COUNT(*) FROM inventory WHERE company_id=$1 AND qty = 0`, companyID).Scan(&stockOut)
	database.DB.QueryRow(`SELECT COUNT(*) FROM assets WHERE company_id=$1`, companyID).Scan(&totalAssets)
	database.DB.QueryRow(`SELECT COUNT(*) FROM purchase_requests WHERE company_id=$1 AND status='pending'`, companyID).Scan(&pendingPR)
	database.DB.QueryRow(`SELECT COUNT(*) FROM vendors WHERE company_id=$1`, companyID).Scan(&totalVendors)

	kpi["total_employees"] = totalEmployees
	kpi["active_workorders"] = activeWorkorders
	kpi["stock_low"] = stockLow
	kpi["stock_out"] = stockOut
	kpi["total_assets"] = totalAssets
	kpi["pending_pr"] = pendingPR
	kpi["total_vendors"] = totalVendors
	kpi["oee"] = 89.2
	kpi["attendance_rate"] = 97.2
	kpi["active_alerts"] = stockLow + stockOut + pendingPR

	c.JSON(http.StatusOK, gin.H{"success": true, "data": kpi})
}

func DashboardAlerts(c *gin.Context) {
	if database.DB == nil {
		alerts := []gin.H{
			{"id": 1, "type": "danger", "message": "Mesin CNC-03 butuh maintenance segera", "module": "Factory", "created_at": time.Now().Add(-5 * time.Minute)},
			{"id": 2, "type": "warning", "message": "Stok bahan baku hampir habis (< 20%)", "module": "Warehouse", "created_at": time.Now().Add(-23 * time.Minute)},
			{"id": 3, "type": "info", "message": "PR #2847 menunggu approval", "module": "Purchasing", "created_at": time.Now().Add(-1 * time.Hour)},
			{"id": 4, "type": "danger", "message": "Akses tidak sah terdeteksi di Gate B", "module": "Security", "created_at": time.Now().Add(-2 * time.Hour)},
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": alerts})
		return
	}

	companyID := c.GetString("company_id")
	var alerts []gin.H

	// Low stock alerts
	rows, err := database.DB.Query(
		`SELECT name, qty, min_stock FROM inventory WHERE company_id=$1 AND qty <= min_stock ORDER BY qty ASC LIMIT 5`,
		companyID,
	)
	if err == nil {
		defer rows.Close()
		i := 1
		for rows.Next() {
			var name string
			var qty, minStock int
			rows.Scan(&name, &qty, &minStock)
			typ := "warning"
			if qty == 0 {
				typ = "danger"
			}
			alerts = append(alerts, gin.H{
				"id": i, "type": typ,
				"message":    "Stok " + name + " rendah (" + string(rune('0'+qty/10)) + ")",
				"module":     "Warehouse",
				"created_at": time.Now(),
			})
			i++
		}
	}

	// Pending PRs
	var pendingCount int
	database.DB.QueryRow(`SELECT COUNT(*) FROM purchase_requests WHERE company_id=$1 AND status='pending'`, companyID).Scan(&pendingCount)
	if pendingCount > 0 {
		alerts = append(alerts, gin.H{
			"id": 99, "type": "info",
			"message":    "Ada " + string(rune('0'+pendingCount)) + " PR menunggu approval",
			"module":     "Purchasing",
			"created_at": time.Now(),
		})
	}

	if len(alerts) == 0 {
		alerts = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": alerts})
}

func OEERealtimeData(c *gin.Context) {
	data := make([]gin.H, 8)
	base := 85.0
	for i := range data {
		oee := base + rand.Float64()*10 - 2
		data[i] = gin.H{
			"time":         time.Now().Add(time.Duration(-7+i) * time.Hour).Format("15:04"),
			"oee":          oee,
			"availability": oee + rand.Float64()*5,
			"performance":  oee + rand.Float64()*3,
			"quality":      oee + rand.Float64()*8,
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data})
}
