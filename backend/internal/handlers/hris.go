package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/models"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

func init() {
	RegisterApprovalFinalizer("hris", "cuti", func(docID, finalStatus string) {
		database.DB.Exec(`UPDATE leave_requests SET status=$1 WHERE id=$2`, finalStatus, docID)
	})
}

func GetEmployees(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "emp_number": "EMP-001", "name": "Budi Santoso", "department": "Produksi", "position": "Operator", "status": "active", "salary": 5500000},
			{"id": "2", "emp_number": "EMP-002", "name": "Sari Dewi", "department": "HR", "position": "HR Manager", "status": "active", "salary": 12000000},
			{"id": "3", "emp_number": "EMP-003", "name": "Andi Wijaya", "department": "IT", "position": "System Analyst", "status": "active", "salary": 9500000},
			{"id": "4", "emp_number": "EMP-004", "name": "Deni Purnama", "department": "Produksi", "position": "Supervisor", "status": "active", "salary": 8500000},
			{"id": "5", "emp_number": "EMP-005", "name": "Rina Kusuma", "department": "Finance", "position": "Accounting", "status": "active", "salary": 7000000},
			{"id": "6", "emp_number": "EMP-006", "name": "Hendra Susanto", "department": "Logistik", "position": "Coordinator", "status": "leave", "salary": 6500000},
		}
		rows, total := p.ApplyToSlice(demo, []string{"name", "emp_number", "department", "position"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		"SELECT id, emp_number, name, department, position, status, salary FROM employees WHERE company_id = $1 ORDER BY name LIMIT 100",
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var employees []models.Employee
	for rows.Next() {
		var e models.Employee
		rows.Scan(&e.ID, &e.EmpNumber, &e.Name, &e.Department, &e.Position, &e.Status, &e.Salary)
		employees = append(employees, e)
	}
	count := int64(len(employees))
	c.JSON(http.StatusOK, odata.Response(employees, count))
}

func CreateEmployee(c *gin.Context) {
	var emp models.Employee
	if err := c.ShouldBindJSON(&emp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		emp.ID = "new-emp-id"
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": emp})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.QueryRow(
		"INSERT INTO employees (company_id, emp_number, name, email, department, position, salary, join_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
		companyID, emp.EmpNumber, emp.Name, emp.Email, emp.Department, emp.Position, emp.Salary, emp.JoinDate,
	).Scan(&emp.ID)
	database.WriteAuditLog(c.GetString("user_id"), "CREATE", "employee", emp.ID, "Tambah karyawan: "+emp.Name, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": emp})
}

func UpdateEmployee(c *gin.Context) {
	id := c.Param("id")
	var emp models.Employee
	if err := c.ShouldBindJSON(&emp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		emp.ID = id
		c.JSON(http.StatusOK, gin.H{"success": true, "data": emp})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(
		`UPDATE employees SET name=$1, email=$2, department=$3, position=$4, salary=$5, status=$6 WHERE id=$7 AND company_id=$8`,
		emp.Name, emp.Email, emp.Department, emp.Position, emp.Salary, emp.Status, id, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	emp.ID = id
	database.WriteAuditLog(c.GetString("user_id"), "UPDATE", "employee", id, "Edit karyawan: "+emp.Name, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "data": emp})
}

func DeleteEmployee(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(`DELETE FROM employees WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "DELETE", "employee", id, "Hapus karyawan", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
}

// --- Attendance ---

func GetAttendance(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		today := now.Format("2006-01-02")
		demo := []gin.H{
			{"id": "1", "emp_number": "EMP-001", "name": "Budi Santoso", "department": "Produksi", "date": today, "check_in": "08:02", "check_out": "17:05", "status": "present", "work_hours": "9j 3m"},
			{"id": "2", "emp_number": "EMP-002", "name": "Sari Dewi", "department": "HR", "date": today, "check_in": "08:45", "check_out": "17:00", "status": "late", "work_hours": "8j 15m"},
			{"id": "3", "emp_number": "EMP-003", "name": "Andi Wijaya", "department": "IT", "date": today, "check_in": "07:55", "check_out": "", "status": "present", "work_hours": "—"},
			{"id": "4", "emp_number": "EMP-004", "name": "Deni Purnama", "department": "Produksi", "date": today, "check_in": "08:00", "check_out": "17:00", "status": "present", "work_hours": "9j 0m"},
			{"id": "5", "emp_number": "EMP-005", "name": "Rina Kusuma", "department": "Finance", "date": today, "check_in": "", "check_out": "", "status": "absent", "work_hours": "—"},
			{"id": "6", "emp_number": "EMP-006", "name": "Hendra Susanto", "department": "Logistik", "date": today, "check_in": "", "check_out": "", "status": "leave", "work_hours": "—"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"name", "emp_number", "department", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	date := c.Query("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	rows, err := database.DB.Query(
		`SELECT a.id, e.emp_number, e.name, e.department, a.date, a.check_in, a.check_out, a.status
		 FROM attendance a JOIN employees e ON e.id = a.employee_id
		 WHERE e.company_id=$1 AND a.date=$2 ORDER BY e.name`,
		companyID, date,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, empNumber, name, department, dateStr, status string
		var checkIn, checkOut *string
		rows.Scan(&id, &empNumber, &name, &department, &dateStr, &checkIn, &checkOut, &status)
		items = append(items, gin.H{
			"id": id, "emp_number": empNumber, "name": name, "department": department,
			"date": dateStr, "check_in": checkIn, "check_out": checkOut, "status": status,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CheckInAttendance(c *gin.Context) {
	var req struct {
		EmployeeID string `json:"employee_id"`
		Date       string `json:"date"`
		Notes      string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	now := time.Now()
	if req.Date == "" {
		req.Date = now.Format("2006-01-02")
	}
	checkIn := now.Format("15:04")
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-att-id", "employee_id": req.EmployeeID, "date": req.Date,
			"check_in": checkIn, "status": "present",
		}})
		return
	}
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO attendance (employee_id, date, check_in, status, notes) VALUES ($1,$2,NOW(),'present',$3)
		 ON CONFLICT (employee_id, date) DO UPDATE SET check_in=NOW() RETURNING id`,
		req.EmployeeID, req.Date, req.Notes,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id, "check_in": checkIn, "status": "present"}})
}

func CheckOutAttendance(c *gin.Context) {
	id := c.Param("id")
	now := time.Now()
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "check_out": now.Format("15:04")}})
		return
	}
	_, err := database.DB.Exec(`UPDATE attendance SET check_out=NOW() WHERE id=$1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "check_out": now.Format("15:04")}})
}

// --- Leave Requests ---

func GetLeaveRequests(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "emp_number": "EMP-006", "employee_name": "Hendra Susanto", "department": "Logistik", "type": "Cuti Tahunan", "start_date": now.Format("2006-01-02"), "end_date": now.Add(5 * 24 * time.Hour).Format("2006-01-02"), "days": 5, "reason": "Liburan keluarga", "status": "approved"},
			{"id": "2", "emp_number": "EMP-003", "employee_name": "Andi Wijaya", "department": "IT", "type": "Izin Sakit", "start_date": now.Add(-2 * 24 * time.Hour).Format("2006-01-02"), "end_date": now.Add(-1 * 24 * time.Hour).Format("2006-01-02"), "days": 2, "reason": "Sakit demam", "status": "approved"},
			{"id": "3", "emp_number": "EMP-002", "employee_name": "Sari Dewi", "department": "HR", "type": "Cuti Melahirkan", "start_date": now.Add(7 * 24 * time.Hour).Format("2006-01-02"), "end_date": now.Add(97 * 24 * time.Hour).Format("2006-01-02"), "days": 90, "reason": "Cuti melahirkan", "status": "pending"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"employee_name", "emp_number", "department", "type", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT lr.id, e.emp_number, e.name, e.department, lr.type, lr.start_date, lr.end_date,
		 (lr.end_date - lr.start_date + 1) as days, lr.reason, lr.status
		 FROM leave_requests lr JOIN employees e ON e.id = lr.employee_id
		 WHERE e.company_id=$1 ORDER BY lr.created_at DESC LIMIT 100`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, empNumber, name, department, leaveType, startDate, endDate, reason, status string
		var days int
		rows.Scan(&id, &empNumber, &name, &department, &leaveType, &startDate, &endDate, &days, &reason, &status)
		items = append(items, gin.H{
			"id": id, "emp_number": empNumber, "employee_name": name, "department": department,
			"type": leaveType, "start_date": startDate, "end_date": endDate,
			"days": days, "reason": reason, "status": status,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateLeaveRequest(c *gin.Context) {
	var req struct {
		EmployeeID string `json:"employee_id"`
		Type       string `json:"type"`
		StartDate  string `json:"start_date"`
		EndDate    string `json:"end_date"`
		Reason     string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-leave-id", "employee_id": req.EmployeeID, "type": req.Type,
			"start_date": req.StartDate, "end_date": req.EndDate, "reason": req.Reason, "status": "pending",
		}})
		return
	}
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO leave_requests (employee_id, type, start_date, end_date, reason, status)
		 VALUES ($1,$2,$3,$4,$5,'pending') RETURNING id`,
		req.EmployeeID, req.Type, req.StartDate, req.EndDate, req.Reason,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	status := "pending"
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	if _, required, _ := SubmitForApproval(companyID, "hris", "cuti", id, req.Type+" "+req.StartDate, 0, userID); required {
		status = "pending_approval"
		database.DB.Exec(`UPDATE leave_requests SET status='pending_approval' WHERE id=$1`, id)
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id, "status": status}})
}

func UpdateLeaveStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status}})
		return
	}
	approvedBy := c.GetString("user_id")
	_, err := database.DB.Exec(
		`UPDATE leave_requests SET status=$1, approved_by=$2 WHERE id=$3`,
		req.Status, approvedBy, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(approvedBy, "UPDATE", "leave_request", id, "Status cuti diubah ke: "+req.Status, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status}})
}

// --- Payroll ---

func GetPayroll(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		period := now.Format("2006-01")
		demo := []gin.H{
			{"id": "1", "emp_number": "EMP-001", "employee_name": "Budi Santoso", "department": "Produksi", "period": period, "basic_salary": 5500000, "allowances": 1100000, "deductions": 275000, "bpjs": 247500, "pph21": 0, "net_salary": 6077500, "status": "paid"},
			{"id": "2", "emp_number": "EMP-002", "employee_name": "Sari Dewi", "department": "HR", "period": period, "basic_salary": 12000000, "allowances": 2400000, "deductions": 600000, "bpjs": 540000, "pph21": 450000, "net_salary": 12810000, "status": "paid"},
			{"id": "3", "emp_number": "EMP-003", "employee_name": "Andi Wijaya", "department": "IT", "period": period, "basic_salary": 9500000, "allowances": 1900000, "deductions": 475000, "bpjs": 427500, "pph21": 225000, "net_salary": 10272500, "status": "paid"},
			{"id": "4", "emp_number": "EMP-004", "employee_name": "Deni Purnama", "department": "Produksi", "period": period, "basic_salary": 8500000, "allowances": 1700000, "deductions": 425000, "bpjs": 382500, "pph21": 100000, "net_salary": 9292500, "status": "draft"},
			{"id": "5", "emp_number": "EMP-005", "employee_name": "Rina Kusuma", "department": "Finance", "period": period, "basic_salary": 7000000, "allowances": 1400000, "deductions": 350000, "bpjs": 315000, "pph21": 0, "net_salary": 7735000, "status": "draft"},
			{"id": "6", "emp_number": "EMP-006", "employee_name": "Hendra Susanto", "department": "Logistik", "period": period, "basic_salary": 6500000, "allowances": 1300000, "deductions": 325000, "bpjs": 292500, "pph21": 0, "net_salary": 7182500, "status": "draft"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"employee_name", "emp_number", "department", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	period := c.Query("period")
	if period == "" {
		period = time.Now().Format("2006-01")
	}
	rows, err := database.DB.Query(
		`SELECT p.id, e.emp_number, e.name, e.department, p.period, p.basic_salary,
		 p.allowances, p.deductions, p.net_salary, p.status
		 FROM payroll p JOIN employees e ON e.id = p.employee_id
		 WHERE p.company_id=$1 AND p.period=$2 ORDER BY e.name`,
		companyID, period,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, empNumber, name, department, per, status string
		var basic, allowances, deductions, net int64
		rows.Scan(&id, &empNumber, &name, &department, &per, &basic, &allowances, &deductions, &net, &status)
		items = append(items, gin.H{
			"id": id, "emp_number": empNumber, "employee_name": name, "department": department,
			"period": per, "basic_salary": basic, "allowances": allowances,
			"deductions": deductions, "net_salary": net, "status": status,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func GeneratePayroll(c *gin.Context) {
	var req struct {
		Period string `json:"period"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if req.Period == "" {
		req.Period = time.Now().Format("2006-01")
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Payroll berhasil digenerate (demo mode)", "period": req.Period, "count": 6})
		return
	}
	companyID := c.GetString("company_id")
	// Generate payroll: tunjangan 20%, potongan 5%, BPJS 4.5%, PPh21 simplified
	res, err := database.DB.Exec(
		`INSERT INTO payroll (company_id, employee_id, period, basic_salary, allowances, deductions, net_salary, status)
		 SELECT $1, id, $2,
		   salary,
		   ROUND(salary * 0.20),
		   ROUND(salary * 0.05),
		   ROUND(salary * 1.15),
		   'draft'
		 FROM employees WHERE company_id=$1
		 ON CONFLICT DO NOTHING`,
		companyID, req.Period,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	count, _ := res.RowsAffected()
	database.WriteAuditLog(c.GetString("user_id"), "GENERATE", "payroll", req.Period, "Generate payroll periode: "+req.Period, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Payroll berhasil digenerate", "period": req.Period, "count": count})
}

func UpdatePayrollStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status}})
		return
	}
	_, err := database.DB.Exec(`UPDATE payroll SET status=$1 WHERE id=$2`, req.Status, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status}})
}
