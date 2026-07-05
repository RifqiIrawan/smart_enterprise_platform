package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"sep/backend/internal/database"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── HR Dashboard ─────────────────────────────────────────────────────────────

func GetHRDashboard(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    buildHRDashboard(),
		})
		return
	}
	companyID := c.GetString("company_id")
	_ = companyID
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildHRDashboard()})
}

func buildHRDashboard() gin.H {
	return gin.H{
		"kpi": gin.H{
			"total_employees":     142,
			"active_employees":    138,
			"new_hires_month":     5,
			"resignations_month":  2,
			"turnover_rate":       8.4,
			"avg_attendance_rate": 94.7,
			"leave_utilization":   68.3,
			"open_positions":      8,
		},
		"headcount_by_dept": []gin.H{
			{"dept": "Produksi", "count": 58, "pct": 40.8},
			{"dept": "HR", "count": 12, "pct": 8.5},
			{"dept": "Finance", "count": 14, "pct": 9.9},
			{"dept": "IT", "count": 16, "pct": 11.3},
			{"dept": "Marketing", "count": 10, "pct": 7.0},
			{"dept": "Operasional", "count": 20, "pct": 14.1},
			{"dept": "Logistik", "count": 12, "pct": 8.5},
		},
		"headcount_trend": []gin.H{
			{"month": "Jan", "headcount": 135, "hired": 3, "resigned": 1},
			{"month": "Feb", "headcount": 137, "hired": 4, "resigned": 2},
			{"month": "Mar", "headcount": 139, "hired": 5, "resigned": 3},
			{"month": "Apr", "headcount": 138, "hired": 2, "resigned": 3},
			{"month": "Mei", "headcount": 140, "hired": 6, "resigned": 4},
			{"month": "Jun", "headcount": 142, "hired": 5, "resigned": 2},
		},
		"leave_by_type": []gin.H{
			{"type": "Cuti Tahunan", "used": 248, "balance": 520},
			{"type": "Sakit", "used": 83, "balance": 0},
			{"type": "Izin Khusus", "used": 12, "balance": 0},
			{"type": "Cuti Penting", "used": 18, "balance": 0},
		},
		"attendance_summary": gin.H{
			"hadir":     3102,
			"terlambat": 187,
			"absen":     94,
			"cuti":      183,
		},
		"age_distribution": []gin.H{
			{"range": "20-25", "count": 18},
			{"range": "26-30", "count": 42},
			{"range": "31-35", "count": 38},
			{"range": "36-40", "count": 24},
			{"range": "41-45", "count": 12},
			{"range": "46+", "count": 8},
		},
		"top_performers": []gin.H{
			{"name": "Ahmad Rifqi", "dept": "IT", "kpi_score": 96.5, "emp_number": "EMP-001"},
			{"name": "Siti Rahayu", "dept": "Finance", "kpi_score": 94.8, "emp_number": "EMP-012"},
			{"name": "Budi Santoso", "dept": "Produksi", "kpi_score": 93.2, "emp_number": "EMP-007"},
			{"name": "Dewi Lestari", "dept": "Marketing", "kpi_score": 91.7, "emp_number": "EMP-023"},
			{"name": "Eko Prasetyo", "dept": "Operasional", "kpi_score": 90.4, "emp_number": "EMP-031"},
		},
	}
}

// ─── Org Chart ────────────────────────────────────────────────────────────────

func GetOrgChart(c *gin.Context) {
	dept := c.DefaultQuery("dept", "")

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    buildOrgChart(dept),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildOrgChart(dept)})
}

func buildOrgChart(dept string) gin.H {
	org := gin.H{
		"company": "PT Smart Enterprise",
		"ceo": gin.H{
			"name": "Direktur Utama", "title": "CEO", "emp_number": "EMP-001",
			"dept": "Direksi", "children": []gin.H{
				{
					"name": "VP Operasional", "title": "VP Operations", "dept": "Operasional",
					"children": []gin.H{
						{"name": "Manager Produksi", "title": "Production Manager", "dept": "Produksi", "headcount": 58,
							"children": []gin.H{
								{"name": "Supervisor A", "title": "Shift Supervisor", "dept": "Produksi"},
								{"name": "Supervisor B", "title": "Shift Supervisor", "dept": "Produksi"},
							}},
						{"name": "Manager Gudang", "title": "Warehouse Manager", "dept": "Logistik", "headcount": 12},
					},
				},
				{
					"name": "VP Finance", "title": "VP Finance & Accounting", "dept": "Finance",
					"children": []gin.H{
						{"name": "Manager Keuangan", "title": "Finance Manager", "dept": "Finance", "headcount": 14},
						{"name": "Manager Akunting", "title": "Accounting Manager", "dept": "Finance"},
					},
				},
				{
					"name": "VP HR", "title": "VP Human Resources", "dept": "HR",
					"children": []gin.H{
						{"name": "Manager HR", "title": "HR Manager", "dept": "HR", "headcount": 12},
						{"name": "Manager Rekrutmen", "title": "Recruitment Manager", "dept": "HR"},
					},
				},
				{
					"name": "VP IT", "title": "VP Information Technology", "dept": "IT",
					"children": []gin.H{
						{"name": "Manager IT", "title": "IT Manager", "dept": "IT", "headcount": 16},
					},
				},
				{
					"name": "VP Marketing", "title": "VP Marketing & Sales", "dept": "Marketing",
					"children": []gin.H{
						{"name": "Manager Marketing", "title": "Marketing Manager", "dept": "Marketing", "headcount": 10},
					},
				},
			},
		},
		"departments": []string{"Direksi", "Produksi", "HR", "Finance", "IT", "Marketing", "Operasional", "Logistik"},
	}

	if dept != "" {
		// Return flat list for specific dept
		empList := buildDeptEmployees(dept)
		return gin.H{
			"company":     org["company"],
			"dept":        dept,
			"employees":   empList,
			"departments": org["departments"],
		}
	}

	return org
}

func buildDeptEmployees(dept string) []gin.H {
	names := map[string][]gin.H{
		"Produksi": {
			{"name": "Budi Santoso", "title": "Production Manager", "level": "manager", "emp_number": "EMP-007"},
			{"name": "Agus Wibowo", "title": "Shift Supervisor", "level": "supervisor", "emp_number": "EMP-011"},
			{"name": "Slamet Riyadi", "title": "Operator Mesin", "level": "staff", "emp_number": "EMP-045"},
		},
		"HR": {
			{"name": "Rina Susanti", "title": "HR Manager", "level": "manager", "emp_number": "EMP-003"},
			{"name": "Hani Pratiwi", "title": "HR Specialist", "level": "staff", "emp_number": "EMP-018"},
		},
		"Finance": {
			{"name": "Siti Rahayu", "title": "Finance Manager", "level": "manager", "emp_number": "EMP-012"},
			{"name": "Joko Widodo", "title": "Accountant", "level": "staff", "emp_number": "EMP-027"},
		},
		"IT": {
			{"name": "Ahmad Rifqi", "title": "IT Manager", "level": "manager", "emp_number": "EMP-001"},
			{"name": "Reza Firmansyah", "title": "Backend Developer", "level": "staff", "emp_number": "EMP-014"},
		},
	}
	if emps, ok := names[dept]; ok {
		return emps
	}
	return []gin.H{{"name": dept + " Employee", "title": "Staff", "level": "staff"}}
}

// ─── Payslip ──────────────────────────────────────────────────────────────────

var demoPayslipHistory = []gin.H{
	{"id": "1", "emp_number": "EMP-001", "employee_name": "Ahmad Rifqi", "department": "IT", "period": "Juni 2026", "period_month": "2026-06", "basic_salary": 12000000, "allowance": 2400000, "deduction": 600000, "bpjs_kes": 480000, "bpjs_tk": 240000, "pph21": 890000, "net_salary": 12190000, "status": "paid"},
	{"id": "2", "emp_number": "EMP-001", "employee_name": "Ahmad Rifqi", "department": "IT", "period": "Mei 2026", "period_month": "2026-05", "basic_salary": 12000000, "allowance": 2400000, "deduction": 600000, "bpjs_kes": 480000, "bpjs_tk": 240000, "pph21": 890000, "net_salary": 12190000, "status": "paid"},
	{"id": "3", "emp_number": "EMP-012", "employee_name": "Siti Rahayu", "department": "Finance", "period": "Juni 2026", "period_month": "2026-06", "basic_salary": 10500000, "allowance": 2100000, "deduction": 525000, "bpjs_kes": 420000, "bpjs_tk": 210000, "pph21": 690000, "net_salary": 10755000, "status": "paid"},
	{"id": "4", "emp_number": "EMP-007", "employee_name": "Budi Santoso", "department": "Produksi", "period": "Juni 2026", "period_month": "2026-06", "basic_salary": 9000000, "allowance": 1800000, "deduction": 450000, "bpjs_kes": 360000, "bpjs_tk": 180000, "pph21": 520000, "net_salary": 9290000, "status": "paid"},
	{"id": "5", "emp_number": "EMP-011", "employee_name": "Agus Wibowo", "department": "Produksi", "period": "Juni 2026", "period_month": "2026-06", "basic_salary": 7500000, "allowance": 1500000, "deduction": 375000, "bpjs_kes": 300000, "bpjs_tk": 150000, "pph21": 310000, "net_salary": 7865000, "status": "paid"},
}

func GetPayslipHistory(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"@odata.count": int64(len(demoPayslipHistory)),
			"value": demoPayslipHistory,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "@odata.count": int64(len(demoPayslipHistory)), "value": demoPayslipHistory})
}

func GetPayslip(c *gin.Context) {
	id := c.Param("id")

	for _, s := range demoPayslipHistory {
		if fmt.Sprintf("%v", s["id"]) == id {
			// Enrich with detail items
			slip := gin.H{
				"id":              s["id"],
				"emp_number":      s["emp_number"],
				"employee_name":   s["employee_name"],
				"department":      s["department"],
				"position":        "Senior Staff",
				"period":          s["period"],
				"period_month":    s["period_month"],
				"company_name":    "PT Smart Enterprise",
				"company_address": "Jl. Industri No. 1, Jakarta Selatan",
				"income_items": []gin.H{
					{"label": "Gaji Pokok", "amount": s["basic_salary"]},
					{"label": "Tunjangan Jabatan (20%)", "amount": s["allowance"]},
					{"label": "Uang Makan", "amount": 500000},
					{"label": "Tunjangan Transport", "amount": 300000},
				},
				"deduction_items": []gin.H{
					{"label": "Potongan Keterlambatan", "amount": s["deduction"]},
					{"label": "BPJS Kesehatan (1%)", "amount": s["bpjs_kes"]},
					{"label": "BPJS Ketenagakerjaan (2%)", "amount": s["bpjs_tk"]},
					{"label": "PPh 21", "amount": s["pph21"]},
				},
				"basic_salary": s["basic_salary"],
				"total_income": func() float64 {
					base := toFloat(s["basic_salary"])
					return base + base*0.2 + 500000 + 300000
				}(),
				"total_deduction": func() float64 {
					return toFloat(s["deduction"]) + toFloat(s["bpjs_kes"]) + toFloat(s["bpjs_tk"]) + toFloat(s["pph21"])
				}(),
				"net_salary":  s["net_salary"],
				"status":      s["status"],
				"paid_date":   "2026-06-30",
				"bank_name":   "BCA",
				"account_no":  "1234-5678-90",
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "data": slip})
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Payslip tidak ditemukan"})
}

func toFloat(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case int:
		return float64(val)
	case int64:
		return float64(val)
	}
	return 0
}

// ─── Attendance Calendar ──────────────────────────────────────────────────────

func GetAttendanceCalendar(c *gin.Context) {
	month := c.DefaultQuery("month", time.Now().Format("2006-01"))
	empID := c.DefaultQuery("emp_id", "EMP-001")

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    buildAttCalendar(month, empID),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildAttCalendar(month, empID)})
}

func buildAttCalendar(month, empID string) gin.H {
	// Parse month
	t, _ := time.Parse("2006-01", month)
	year, m := t.Year(), t.Month()

	statuses := []string{"present", "present", "present", "present", "present", "late", "absent", "leave", "present"}
	days := []gin.H{}

	firstDay := time.Date(year, m, 1, 0, 0, 0, 0, time.UTC)
	lastDay := firstDay.AddDate(0, 1, -1)

	for d := 1; d <= lastDay.Day(); d++ {
		day := time.Date(year, m, d, 0, 0, 0, 0, time.UTC)
		wd := day.Weekday()
		if wd == time.Saturday || wd == time.Sunday {
			days = append(days, gin.H{"date": fmt.Sprintf("%d-%02d-%02d", year, m, d), "status": "weekend"})
			continue
		}
		status := statuses[rand.Intn(len(statuses))]
		entry := gin.H{
			"date":   fmt.Sprintf("%d-%02d-%02d", year, m, d),
			"status": status,
		}
		if status == "present" || status == "late" {
			entry["check_in"] = "08:05"
			entry["check_out"] = "17:02"
		}
		days = append(days, entry)
	}

	// Summary
	var present, late, absent, leave, weekend int
	for _, d := range days {
		switch d["status"] {
		case "present":
			present++
		case "late":
			late++
		case "absent":
			absent++
		case "leave":
			leave++
		case "weekend":
			weekend++
		}
	}

	return gin.H{
		"emp_id":   empID,
		"month":    month,
		"days":     days,
		"summary": gin.H{
			"present":     present,
			"late":        late,
			"absent":      absent,
			"leave":       leave,
			"working_days": len(days) - weekend,
		},
	}
}
