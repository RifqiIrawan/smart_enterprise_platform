package handlers

import (
	"fmt"
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

// ==================== JOB POSTINGS ====================

func GetJobPostings(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "title": "Operator Produksi", "department": "Produksi", "status": "open", "open_date": "2026-06-01", "close_date": "2026-07-31", "applicants": 12},
			{"id": "2", "title": "Staff Accounting", "department": "Finance", "status": "open", "open_date": "2026-06-15", "close_date": "2026-07-15", "applicants": 8},
			{"id": "3", "title": "Teknisi Mesin", "department": "Produksi", "status": "closed", "open_date": "2026-05-01", "close_date": "2026-06-01", "applicants": 20},
		}
		rows, total := p.ApplyToSlice(demo, []string{"title", "department", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT jp.id, jp.title, jp.department, jp.status, jp.open_date, jp.close_date,
		 COUNT(cn.id) as applicants
		 FROM job_postings jp LEFT JOIN candidates cn ON cn.job_id = jp.id
		 WHERE jp.company_id=$1 GROUP BY jp.id ORDER BY jp.created_at DESC`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, title, department, status, openDate, closeDate string
		var applicants int
		rows.Scan(&id, &title, &department, &status, &openDate, &closeDate, &applicants)
		items = append(items, gin.H{
			"id": id, "title": title, "department": department, "status": status,
			"open_date": openDate, "close_date": closeDate, "applicants": applicants,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateJobPosting(c *gin.Context) {
	var req struct {
		Title        string `json:"title"`
		Department   string `json:"department"`
		Description  string `json:"description"`
		Requirements string `json:"requirements"`
		OpenDate     string `json:"open_date"`
		CloseDate    string `json:"close_date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO job_postings (company_id, title, department, description, requirements, open_date, close_date, status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,'open') RETURNING id`,
		companyID, req.Title, req.Department, req.Description, req.Requirements, req.OpenDate, req.CloseDate,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "CREATE", "job_posting", id, "Buka lowongan: "+req.Title, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

func UpdateJobPosting(c *gin.Context) {
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
	database.DB.Exec(`UPDATE job_postings SET status=$1 WHERE id=$2`, req.Status, id)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status}})
}

func DeleteJobPosting(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	database.DB.Exec(`DELETE FROM job_postings WHERE id=$1 AND company_id=$2`, id, c.GetString("company_id"))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ==================== CANDIDATES ====================

func GetCandidates(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "name": "Ahmad Fauzi", "email": "ahmad@email.com", "phone": "081234567890", "job_title": "Operator Produksi", "stage": "Interview", "applied_date": "2026-06-10"},
			{"id": "2", "name": "Budi Hartono", "email": "budi@email.com", "phone": "082345678901", "job_title": "Operator Produksi", "stage": "Screening", "applied_date": "2026-06-12"},
			{"id": "3", "name": "Citra Lestari", "email": "citra@email.com", "phone": "083456789012", "job_title": "Staff Accounting", "stage": "Offering", "applied_date": "2026-06-08"},
			{"id": "4", "name": "Dwi Santoso", "email": "dwi@email.com", "phone": "084567890123", "job_title": "Staff Accounting", "stage": "Melamar", "applied_date": "2026-06-20"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"name", "email", "job_title", "stage"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT cn.id, cn.name, cn.email, cn.phone, jp.title as job_title, cn.stage, cn.applied_date, cn.notes
		 FROM candidates cn LEFT JOIN job_postings jp ON jp.id = cn.job_id
		 WHERE cn.company_id=$1 ORDER BY cn.applied_date DESC`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, name, email, phone, jobTitle, stage, appliedDate string
		var notes *string
		rows.Scan(&id, &name, &email, &phone, &jobTitle, &stage, &appliedDate, &notes)
		items = append(items, gin.H{
			"id": id, "name": name, "email": email, "phone": phone,
			"job_title": jobTitle, "stage": stage, "applied_date": appliedDate, "notes": notes,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateCandidate(c *gin.Context) {
	var req struct {
		JobID       string `json:"job_id"`
		Name        string `json:"name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		Notes       string `json:"notes"`
		AppliedDate string `json:"applied_date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if req.AppliedDate == "" {
		req.AppliedDate = time.Now().Format("2006-01-02")
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO candidates (company_id, job_id, name, email, phone, notes, applied_date, stage)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,'Melamar') RETURNING id`,
		companyID, req.JobID, req.Name, req.Email, req.Phone, req.Notes, req.AppliedDate,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

func UpdateCandidateStage(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Stage string `json:"stage"`
		Notes string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "stage": req.Stage}})
		return
	}
	database.DB.Exec(`UPDATE candidates SET stage=$1, notes=$2 WHERE id=$3`, req.Stage, req.Notes, id)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "stage": req.Stage}})
}

func DeleteCandidate(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	database.DB.Exec(`DELETE FROM candidates WHERE id=$1 AND company_id=$2`, id, c.GetString("company_id"))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ==================== TRAINING PROGRAMS ====================

func GetTrainingPrograms(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "title": "K3 Dasar", "category": "Safety", "trainer": "Pak Rahmat", "duration_hours": 8, "description": "Keselamatan dan Kesehatan Kerja"},
			{"id": "2", "title": "Lean Manufacturing", "category": "Produksi", "trainer": "Ibu Fitri", "duration_hours": 16, "description": "Eliminasi waste dalam proses produksi"},
			{"id": "3", "title": "Excel Advanced", "category": "IT", "trainer": "Pak Andi", "duration_hours": 8, "description": "Pelatihan Excel untuk analisis data"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"title", "category", "trainer"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, title, category, trainer, duration_hours, description FROM training_programs WHERE company_id=$1 ORDER BY title`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, title, category, trainer, description string
		var durationHours int
		rows.Scan(&id, &title, &category, &trainer, &durationHours, &description)
		items = append(items, gin.H{
			"id": id, "title": title, "category": category, "trainer": trainer,
			"duration_hours": durationHours, "description": description,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateTrainingProgram(c *gin.Context) {
	var req struct {
		Title         string `json:"title"`
		Category      string `json:"category"`
		Trainer       string `json:"trainer"`
		DurationHours int    `json:"duration_hours"`
		Description   string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO training_programs (company_id, title, category, trainer, duration_hours, description)
		 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		companyID, req.Title, req.Category, req.Trainer, req.DurationHours, req.Description,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

func DeleteTrainingProgram(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	database.DB.Exec(`DELETE FROM training_programs WHERE id=$1 AND company_id=$2`, id, c.GetString("company_id"))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ==================== TRAINING SCHEDULES ====================

func GetTrainingSchedules(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "program_title": "K3 Dasar", "start_date": now.Add(7 * 24 * time.Hour).Format("2006-01-02"), "end_date": now.Add(7 * 24 * time.Hour).Format("2006-01-02"), "location": "Ruang Training A", "participants": 15, "status": "scheduled", "score": 0},
			{"id": "2", "program_title": "Lean Manufacturing", "start_date": now.Add(-14 * 24 * time.Hour).Format("2006-01-02"), "end_date": now.Add(-13 * 24 * time.Hour).Format("2006-01-02"), "location": "Aula Utama", "participants": 25, "status": "completed", "score": 88},
			{"id": "3", "program_title": "Excel Advanced", "start_date": now.Add(14 * 24 * time.Hour).Format("2006-01-02"), "end_date": now.Add(14 * 24 * time.Hour).Format("2006-01-02"), "location": "Lab Komputer", "participants": 10, "status": "scheduled", "score": 0},
		}
		rows, total := p.ApplyToSlice(demo, []string{"program_title", "location", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT ts.id, tp.title as program_title, ts.start_date, ts.end_date, ts.location,
		 ts.participants, ts.status, COALESCE(ts.score,0)
		 FROM training_schedules ts LEFT JOIN training_programs tp ON tp.id = ts.program_id
		 WHERE ts.company_id=$1 ORDER BY ts.start_date DESC`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, programTitle, startDate, endDate, location, status string
		var participants, score int
		rows.Scan(&id, &programTitle, &startDate, &endDate, &location, &participants, &status, &score)
		items = append(items, gin.H{
			"id": id, "program_title": programTitle, "start_date": startDate, "end_date": endDate,
			"location": location, "participants": participants, "status": status, "score": score,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateTrainingSchedule(c *gin.Context) {
	var req struct {
		ProgramID    string `json:"program_id"`
		StartDate    string `json:"start_date"`
		EndDate      string `json:"end_date"`
		Location     string `json:"location"`
		Participants int    `json:"participants"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO training_schedules (company_id, program_id, start_date, end_date, location, participants, status)
		 VALUES ($1,$2,$3,$4,$5,$6,'scheduled') RETURNING id`,
		companyID, req.ProgramID, req.StartDate, req.EndDate, req.Location, req.Participants,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

func UpdateTrainingStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status"`
		Score  int    `json:"score"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status}})
		return
	}
	database.DB.Exec(`UPDATE training_schedules SET status=$1, score=$2 WHERE id=$3`, req.Status, req.Score, id)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status}})
}

// ==================== KPI TEMPLATES ====================

func GetKPITemplates(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "title": "KPI Operator Produksi", "department": "Produksi", "period": "Semester", "description": "Produktivitas, kualitas, kedisiplinan"},
			{"id": "2", "title": "KPI Staff Finance", "department": "Finance", "period": "Tahunan", "description": "Akurasi laporan, ketepatan waktu"},
			{"id": "3", "title": "KPI Supervisor", "department": "Semua", "period": "Semester", "description": "Leadership, target departemen, komunikasi"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"title", "department", "period"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, title, department, period, description FROM kpi_templates WHERE company_id=$1 ORDER BY title`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, title, department, period, description string
		rows.Scan(&id, &title, &department, &period, &description)
		items = append(items, gin.H{
			"id": id, "title": title, "department": department, "period": period, "description": description,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateKPITemplate(c *gin.Context) {
	var req struct {
		Title       string `json:"title"`
		Department  string `json:"department"`
		Period      string `json:"period"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO kpi_templates (company_id, title, department, period, description) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		companyID, req.Title, req.Department, req.Period, req.Description,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

func DeleteKPITemplate(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	database.DB.Exec(`DELETE FROM kpi_templates WHERE id=$1 AND company_id=$2`, id, c.GetString("company_id"))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ==================== KPI REVIEWS ====================

func GetKPIReviews(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		semester := "S1"
		if now.Month() > 6 {
			semester = "S2"
		}
		period := fmt.Sprintf("%d-%s", now.Year(), semester)
		demo := []gin.H{
			{"id": "1", "employee_name": "Budi Santoso", "template_title": "KPI Operator Produksi", "period": period, "self_score": 78, "manager_score": 82, "final_score": 80, "status": "completed"},
			{"id": "2", "employee_name": "Rina Kusuma", "template_title": "KPI Staff Finance", "period": period, "self_score": 85, "manager_score": 88, "final_score": 87, "status": "completed"},
			{"id": "3", "employee_name": "Deni Purnama", "template_title": "KPI Supervisor", "period": period, "self_score": 75, "manager_score": 0, "final_score": 0, "status": "self_review"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"employee_name", "template_title", "period", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT kr.id, e.name as employee_name, kt.title as template_title, kr.period,
		 COALESCE(kr.self_score,0), COALESCE(kr.manager_score,0), COALESCE(kr.final_score,0), kr.status
		 FROM kpi_reviews kr
		 JOIN employees e ON e.id = kr.employee_id
		 JOIN kpi_templates kt ON kt.id = kr.template_id
		 WHERE kr.company_id=$1 ORDER BY kr.created_at DESC`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, employeeName, templateTitle, period, status string
		var selfScore, managerScore, finalScore int
		rows.Scan(&id, &employeeName, &templateTitle, &period, &selfScore, &managerScore, &finalScore, &status)
		items = append(items, gin.H{
			"id": id, "employee_name": employeeName, "template_title": templateTitle, "period": period,
			"self_score": selfScore, "manager_score": managerScore, "final_score": finalScore, "status": status,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateKPIReview(c *gin.Context) {
	var req struct {
		EmployeeID string `json:"employee_id"`
		TemplateID string `json:"template_id"`
		Period     string `json:"period"`
		SelfScore  int    `json:"self_score"`
		Notes      string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if req.Period == "" {
		now := time.Now()
		semester := "S1"
		if now.Month() > 6 {
			semester = "S2"
		}
		req.Period = fmt.Sprintf("%d-%s", now.Year(), semester)
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO kpi_reviews (company_id, employee_id, template_id, period, self_score, notes, status)
		 VALUES ($1,$2,$3,$4,$5,$6,'self_review') RETURNING id`,
		companyID, req.EmployeeID, req.TemplateID, req.Period, req.SelfScore, req.Notes,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

// ==================== SHIFTS ====================

func GetShifts(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "name": "Shift Pagi", "start_time": "07:00", "end_time": "15:00", "type": "regular"},
			{"id": "2", "name": "Shift Siang", "start_time": "15:00", "end_time": "23:00", "type": "regular"},
			{"id": "3", "name": "Shift Malam", "start_time": "23:00", "end_time": "07:00", "type": "night"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"name", "type"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, name, start_time, end_time, type FROM shifts WHERE company_id=$1 ORDER BY start_time`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, name, startTime, endTime, shiftType string
		rows.Scan(&id, &name, &startTime, &endTime, &shiftType)
		items = append(items, gin.H{
			"id": id, "name": name, "start_time": startTime, "end_time": endTime, "type": shiftType,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateShift(c *gin.Context) {
	var req struct {
		Name      string `json:"name"`
		StartTime string `json:"start_time"`
		EndTime   string `json:"end_time"`
		Type      string `json:"type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO shifts (company_id, name, start_time, end_time, type) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		companyID, req.Name, req.StartTime, req.EndTime, req.Type,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

func DeleteShift(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	database.DB.Exec(`DELETE FROM shifts WHERE id=$1 AND company_id=$2`, id, c.GetString("company_id"))
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ==================== OVERTIME ====================

func GetOvertimeRecords(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "employee_name": "Budi Santoso", "department": "Produksi", "date": now.Add(-2 * 24 * time.Hour).Format("2006-01-02"), "hours": 3.0, "reason": "Lembur produksi mendesak", "rate_multiplier": 1.5, "amount": 309375, "status": "approved"},
			{"id": "2", "employee_name": "Deni Purnama", "department": "Produksi", "date": now.Add(-24 * time.Hour).Format("2006-01-02"), "hours": 2.0, "reason": "Setup mesin baru", "rate_multiplier": 1.5, "amount": 212500, "status": "pending"},
			{"id": "3", "employee_name": "Andi Wijaya", "department": "IT", "date": now.Format("2006-01-02"), "hours": 4.0, "reason": "Deployment sistem", "rate_multiplier": 2.0, "amount": 475000, "status": "pending"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"employee_name", "department", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT ot.id, e.name, e.department, ot.date, ot.hours, ot.reason, ot.rate_multiplier, ot.amount, ot.status
		 FROM overtime_records ot JOIN employees e ON e.id = ot.employee_id
		 WHERE ot.company_id=$1 ORDER BY ot.date DESC`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, employeeName, department, date, reason, status string
		var hours, rateMultiplier float64
		var amount int64
		rows.Scan(&id, &employeeName, &department, &date, &hours, &reason, &rateMultiplier, &amount, &status)
		items = append(items, gin.H{
			"id": id, "employee_name": employeeName, "department": department,
			"date": date, "hours": hours, "reason": reason,
			"rate_multiplier": rateMultiplier, "amount": amount, "status": status,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateOvertimeRecord(c *gin.Context) {
	var req struct {
		EmployeeID     string  `json:"employee_id"`
		Date           string  `json:"date"`
		Hours          float64 `json:"hours"`
		Reason         string  `json:"reason"`
		RateMultiplier float64 `json:"rate_multiplier"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if req.RateMultiplier == 0 {
		req.RateMultiplier = 1.5
	}
	if req.Date == "" {
		req.Date = time.Now().Format("2006-01-02")
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	var salary int64
	database.DB.QueryRow(`SELECT salary FROM employees WHERE id=$1`, req.EmployeeID).Scan(&salary)
	hourlyRate := float64(salary) / 173.0
	amount := int64(hourlyRate * req.Hours * req.RateMultiplier)
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO overtime_records (company_id, employee_id, date, hours, reason, rate_multiplier, amount, status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING id`,
		companyID, req.EmployeeID, req.Date, req.Hours, req.Reason, req.RateMultiplier, amount,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id, "amount": amount}})
}

func UpdateOvertimeStatus(c *gin.Context) {
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
	database.DB.Exec(`UPDATE overtime_records SET status=$1, approved_by=$2 WHERE id=$3`, req.Status, approvedBy, id)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status}})
}
