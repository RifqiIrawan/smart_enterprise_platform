package handlers

import (
	"fmt"
	"net/http"
	"sep/backend/internal/database"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Inspections ──────────────────────────────────────────────────────────────

func GetInspections(c *gin.Context) {
	companyID := c.GetString("company_id")
	qType := c.Query("type")
	if database.DB == nil {
		all := []gin.H{
			{"id": "i1", "type": "IQC", "ref_number": "GRN/2026/0001", "ref_type": "GRN", "inspector": "Andi Kurniawan", "date": "2026-06-25", "result": "accepted", "sample_size": 50, "defect_qty": 2, "notes": "2 unit cacat permukaan minor"},
			{"id": "i2", "type": "IQC", "ref_number": "GRN/2026/0002", "ref_type": "GRN", "inspector": "Budi Santoso", "date": "2026-06-26", "result": "rejected", "sample_size": 30, "defect_qty": 8, "notes": "Dimensi tidak sesuai spec"},
			{"id": "i3", "type": "IPQC", "ref_number": "WO/2026/0001", "ref_type": "WO", "inspector": "Siti Rahayu", "date": "2026-06-27", "result": "accepted", "sample_size": 20, "defect_qty": 0, "notes": "Semua parameter dalam batas toleransi"},
			{"id": "i4", "type": "IPQC", "ref_number": "WO/2026/0002", "ref_type": "WO", "inspector": "Hendra Wijaya", "date": "2026-06-27", "result": "conditional", "sample_size": 25, "defect_qty": 3, "notes": "Rework 3 unit sebelum lanjut"},
			{"id": "i5", "type": "FQC", "ref_number": "WO/2026/0003", "ref_type": "WO", "inspector": "Dewi Kusuma", "date": "2026-06-28", "result": "accepted", "sample_size": 100, "defect_qty": 1, "notes": "1 unit cosmetic reject — batch lulus"},
			{"id": "i6", "type": "FQC", "ref_number": "WO/2026/0004", "ref_type": "WO", "inspector": "Ahmad Fauzi", "date": "2026-06-28", "result": "pending", "sample_size": 80, "defect_qty": 0, "notes": "Inspeksi berjalan"},
		}
		if qType != "" {
			var filtered []gin.H
			for _, v := range all {
				if v["type"] == qType {
					filtered = append(filtered, v)
				}
			}
			if filtered == nil {
				filtered = []gin.H{}
			}
			c.JSON(http.StatusOK, gin.H{"@odata.count": len(filtered), "value": filtered})
			return
		}
		c.JSON(http.StatusOK, gin.H{"@odata.count": len(all), "value": all})
		return
	}
	query := `SELECT id, type, COALESCE(ref_number,''), COALESCE(ref_type,''),
	           COALESCE(inspector,''), COALESCE(date::text,''), result,
	           sample_size, defect_qty, COALESCE(notes,'')
	           FROM quality_inspections WHERE company_id=$1`
	args := []interface{}{companyID}
	if qType != "" {
		query += " AND type=$2"
		args = append(args, qType)
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
		var id, qtype, refNum, refType, inspector, date, result, notes string
		var sampleSize, defectQty int
		rows.Scan(&id, &qtype, &refNum, &refType, &inspector, &date, &result, &sampleSize, &defectQty, &notes)
		list = append(list, gin.H{
			"id": id, "type": qtype, "ref_number": refNum, "ref_type": refType,
			"inspector": inspector, "date": date, "result": result,
			"sample_size": sampleSize, "defect_qty": defectQty, "notes": notes,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreateInspection(c *gin.Context) {
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var body struct {
		Type       string `json:"type"`
		RefNumber  string `json:"ref_number"`
		RefType    string `json:"ref_type"`
		Inspector  string `json:"inspector"`
		Date       string `json:"date"`
		SampleSize int    `json:"sample_size"`
		DefectQty  int    `json:"defect_qty"`
		Notes      string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "Inspeksi dicatat (demo)"})
		return
	}
	if body.Date == "" {
		body.Date = time.Now().Format("2006-01-02")
	}
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO quality_inspections (company_id, type, ref_number, ref_type, inspector, date, sample_size, defect_qty, notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
		companyID, body.Type, body.RefNumber, body.RefType, body.Inspector,
		body.Date, body.SampleSize, body.DefectQty, body.Notes,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "create", "inspection", id, fmt.Sprintf("%s: %s", body.Type, body.RefNumber), c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Inspeksi berhasil dicatat"})
}

func UpdateInspectionResult(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Result    string `json:"result"`
		DefectQty int    `json:"defect_qty"`
		Notes     string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Result updated (demo)"})
		return
	}
	database.DB.Exec(
		`UPDATE quality_inspections SET result=$1, defect_qty=$2, notes=$3 WHERE id=$4`,
		body.Result, body.DefectQty, body.Notes, id,
	)
	c.JSON(http.StatusOK, gin.H{"message": "Hasil inspeksi diperbarui"})
}

func GetQCStats(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"total_inspections":  6,
			"accepted":           3,
			"rejected":           1,
			"conditional":        1,
			"pending":            1,
			"total_ncr":          4,
			"open_ncr":           2,
			"overdue_capa":       1,
			"tools_due_calibration": 2,
			"defect_rate":        3.2,
		})
		return
	}
	var total, accepted, rejected, conditional, pending int
	database.DB.QueryRow(`SELECT COUNT(*), COALESCE(SUM(CASE WHEN result='accepted' THEN 1 ELSE 0 END),0),
		COALESCE(SUM(CASE WHEN result='rejected' THEN 1 ELSE 0 END),0),
		COALESCE(SUM(CASE WHEN result='conditional' THEN 1 ELSE 0 END),0),
		COALESCE(SUM(CASE WHEN result='pending' THEN 1 ELSE 0 END),0)
		FROM quality_inspections WHERE company_id=$1`, companyID,
	).Scan(&total, &accepted, &rejected, &conditional, &pending)

	var totalNCR, openNCR int
	database.DB.QueryRow(`SELECT COUNT(*), COALESCE(SUM(CASE WHEN status='open' THEN 1 ELSE 0 END),0) FROM ncr WHERE company_id=$1`, companyID).Scan(&totalNCR, &openNCR)

	var toolsDue int
	database.DB.QueryRow(`SELECT COUNT(*) FROM measuring_tools WHERE company_id=$1 AND next_calibration <= NOW()::date AND status='active'`, companyID).Scan(&toolsDue)

	var totalSample, totalDefect int64
	database.DB.QueryRow(`SELECT COALESCE(SUM(sample_size),0), COALESCE(SUM(defect_qty),0) FROM quality_inspections WHERE company_id=$1`, companyID).Scan(&totalSample, &totalDefect)
	defectRate := 0.0
	if totalSample > 0 {
		defectRate = float64(totalDefect) / float64(totalSample) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"total_inspections":     total,
		"accepted":              accepted,
		"rejected":              rejected,
		"conditional":           conditional,
		"pending":               pending,
		"total_ncr":             totalNCR,
		"open_ncr":              openNCR,
		"tools_due_calibration": toolsDue,
		"defect_rate":           defectRate,
	})
}

// ─── NCR ──────────────────────────────────────────────────────────────────────

func GetNCRs(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 4,
			"value": []gin.H{
				{"id": "n1", "ncr_number": "NCR/2026/0001", "ref_number": "GRN/2026/0002", "ref_type": "GRN", "description": "Dimensi baut tidak sesuai drawing", "severity": "major", "status": "open", "reported_by": "Budi Santoso", "created_at": "2026-06-26"},
				{"id": "n2", "ncr_number": "NCR/2026/0002", "ref_number": "WO/2026/0002", "ref_type": "WO", "description": "Cacat las (porosity) pada bracket assembly", "severity": "critical", "status": "capa_issued", "reported_by": "Hendra Wijaya", "created_at": "2026-06-27"},
				{"id": "n3", "ncr_number": "NCR/2026/0003", "ref_number": "WO/2026/0005", "ref_type": "WO", "description": "Coating tidak rata pada 5 unit", "severity": "minor", "status": "closed", "reported_by": "Dewi Kusuma", "created_at": "2026-06-20"},
				{"id": "n4", "ncr_number": "NCR/2026/0004", "ref_number": "GRN/2026/0003", "ref_type": "GRN", "description": "Material tidak memiliki CoA dari vendor", "severity": "major", "status": "open", "reported_by": "Ahmad Fauzi", "created_at": "2026-06-28"},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT id, ncr_number, COALESCE(ref_number,''), COALESCE(ref_type,''),
		 COALESCE(description,''), severity, COALESCE(root_cause,''), status,
		 COALESCE(reported_by,''), created_at::date
		 FROM ncr WHERE company_id=$1 ORDER BY created_at DESC`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, ncrNum, refNum, refType, desc, severity, rootCause, status, reporter, createdAt string
		rows.Scan(&id, &ncrNum, &refNum, &refType, &desc, &severity, &rootCause, &status, &reporter, &createdAt)
		list = append(list, gin.H{
			"id": id, "ncr_number": ncrNum, "ref_number": refNum, "ref_type": refType,
			"description": desc, "severity": severity, "root_cause": rootCause,
			"status": status, "reported_by": reporter, "created_at": createdAt,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreateNCR(c *gin.Context) {
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var body struct {
		RefNumber   string `json:"ref_number"`
		RefType     string `json:"ref_type"`
		Description string `json:"description"`
		Severity    string `json:"severity"`
		RootCause   string `json:"root_cause"`
		ReportedBy  string `json:"reported_by"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "NCR dibuat (demo)"})
		return
	}
	var count int
	database.DB.QueryRow(`SELECT COUNT(*) FROM ncr WHERE company_id=$1`, companyID).Scan(&count)
	ncrNum := fmt.Sprintf("NCR/%s/%04d", time.Now().Format("2006"), count+1)

	var id string
	err := database.DB.QueryRow(
		`INSERT INTO ncr (company_id, ncr_number, ref_number, ref_type, description, severity, root_cause, reported_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		companyID, ncrNum, body.RefNumber, body.RefType, body.Description,
		body.Severity, body.RootCause, body.ReportedBy,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "create", "ncr", id, "NCR: "+body.Description, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"id": id, "ncr_number": ncrNum, "message": "NCR berhasil dibuat"})
}

func UpdateNCRStatus(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Status    string `json:"status"`
		RootCause string `json:"root_cause"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Status updated (demo)"})
		return
	}
	database.DB.Exec(`UPDATE ncr SET status=$1, root_cause=$2 WHERE id=$3`, body.Status, body.RootCause, id)
	c.JSON(http.StatusOK, gin.H{"message": "Status NCR diperbarui"})
}

// ─── CAPA ─────────────────────────────────────────────────────────────────────

func GetCAPAs(c *gin.Context) {
	ncrID := c.Query("ncr_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 3,
			"value": []gin.H{
				{"id": "c1", "ncr_id": "n2", "action": "Kalibrasi ulang jig pengelasan dan training welder", "pic": "Hendra Wijaya", "due_date": "2026-07-05", "status": "open", "verification": ""},
				{"id": "c2", "ncr_id": "n2", "action": "Review prosedur WPS (Welding Procedure Specification)", "pic": "Ahmad Fauzi", "due_date": "2026-07-10", "status": "open", "verification": ""},
				{"id": "c3", "ncr_id": "n3", "action": "Ganti nozzle spray gun + training operator cat", "pic": "Dewi Kusuma", "due_date": "2026-06-25", "actual_date": "2026-06-24", "status": "closed", "verification": "Uji coating 3 batch berikutnya OK"},
			},
		})
		return
	}
	query := `SELECT id, ncr_id, COALESCE(action,''), COALESCE(pic,''),
	           COALESCE(due_date::text,''), COALESCE(actual_date::text,''),
	           COALESCE(verification,''), status FROM capa WHERE 1=1`
	args := []interface{}{}
	if ncrID != "" {
		query += " AND ncr_id=$1"
		args = append(args, ncrID)
	}
	query += " ORDER BY due_date"
	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, nID, action, pic, dueDate, actualDate, verification, status string
		rows.Scan(&id, &nID, &action, &pic, &dueDate, &actualDate, &verification, &status)
		list = append(list, gin.H{
			"id": id, "ncr_id": nID, "action": action, "pic": pic,
			"due_date": dueDate, "actual_date": actualDate, "verification": verification, "status": status,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreateCAPA(c *gin.Context) {
	var body struct {
		NCRId        string `json:"ncr_id"`
		Action       string `json:"action"`
		PIC          string `json:"pic"`
		DueDate      string `json:"due_date"`
		Verification string `json:"verification"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "CAPA dibuat (demo)"})
		return
	}
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO capa (ncr_id, action, pic, due_date, verification)
		 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		body.NCRId, body.Action, body.PIC, nilIfEmpty(body.DueDate), body.Verification,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// Update NCR status
	database.DB.Exec(`UPDATE ncr SET status='capa_issued' WHERE id=$1`, body.NCRId)
	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "CAPA berhasil dibuat"})
}

func UpdateCAPAStatus(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Status       string `json:"status"`
		Verification string `json:"verification"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Status updated (demo)"})
		return
	}
	database.DB.Exec(
		`UPDATE capa SET status=$1, verification=$2, actual_date=CASE WHEN $1='closed' THEN NOW()::date ELSE actual_date END WHERE id=$3`,
		body.Status, body.Verification, id,
	)
	c.JSON(http.StatusOK, gin.H{"message": "Status CAPA diperbarui"})
}

// ─── Measuring Tools / Kalibrasi ─────────────────────────────────────────────

func GetMeasuringTools(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 6,
			"value": []gin.H{
				{"id": "t1", "tool_code": "MT-001", "name": "Vernier Caliper 150mm", "type": "Dimensional", "location": "QC Lab", "last_calibration": "2026-01-15", "next_calibration": "2027-01-15", "calibration_interval_days": 365, "status": "active"},
				{"id": "t2", "tool_code": "MT-002", "name": "Micrometer 0-25mm", "type": "Dimensional", "location": "QC Lab", "last_calibration": "2026-03-01", "next_calibration": "2027-03-01", "calibration_interval_days": 365, "status": "active"},
				{"id": "t3", "tool_code": "MT-003", "name": "Digital Scale 5kg", "type": "Mass", "location": "Warehouse", "last_calibration": "2025-12-10", "next_calibration": "2026-06-10", "calibration_interval_days": 180, "status": "active"},
				{"id": "t4", "tool_code": "MT-004", "name": "Tensile Tester", "type": "Mechanical", "location": "QC Lab", "last_calibration": "2025-10-20", "next_calibration": "2026-10-20", "calibration_interval_days": 365, "status": "active"},
				{"id": "t5", "tool_code": "MT-005", "name": "Coating Thickness Gauge", "type": "Surface", "location": "Paint Area", "last_calibration": "2026-05-01", "next_calibration": "2026-11-01", "calibration_interval_days": 180, "status": "active"},
				{"id": "t6", "tool_code": "MT-006", "name": "Thermometer Infra Red", "type": "Temperature", "location": "Factory Floor", "last_calibration": "2025-08-15", "next_calibration": "2026-08-15", "calibration_interval_days": 365, "status": "active"},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT id, tool_code, name, COALESCE(type,''), COALESCE(location,''),
		        COALESCE(last_calibration::text,''), COALESCE(next_calibration::text,''),
		        calibration_interval_days, status
		 FROM measuring_tools WHERE company_id=$1 ORDER BY next_calibration`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, code, name, ttype, location, lastCal, nextCal, status string
		var interval int
		rows.Scan(&id, &code, &name, &ttype, &location, &lastCal, &nextCal, &interval, &status)
		list = append(list, gin.H{
			"id": id, "tool_code": code, "name": name, "type": ttype, "location": location,
			"last_calibration": lastCal, "next_calibration": nextCal,
			"calibration_interval_days": interval, "status": status,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreateMeasuringTool(c *gin.Context) {
	companyID := c.GetString("company_id")
	var body struct {
		ToolCode                string `json:"tool_code"`
		Name                    string `json:"name"`
		Type                    string `json:"type"`
		Location                string `json:"location"`
		LastCalibration         string `json:"last_calibration"`
		CalibrationIntervalDays int    `json:"calibration_interval_days"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "Alat ditambah (demo)"})
		return
	}
	if body.CalibrationIntervalDays == 0 {
		body.CalibrationIntervalDays = 365
	}
	nextCal := ""
	if body.LastCalibration != "" {
		t, err := time.Parse("2006-01-02", body.LastCalibration)
		if err == nil {
			nextCal = t.AddDate(0, 0, body.CalibrationIntervalDays).Format("2006-01-02")
		}
	}
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO measuring_tools (company_id, tool_code, name, type, location, last_calibration, next_calibration, calibration_interval_days)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		companyID, body.ToolCode, body.Name, body.Type, body.Location,
		nilIfEmpty(body.LastCalibration), nilIfEmpty(nextCal), body.CalibrationIntervalDays,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Alat ukur ditambahkan"})
}

func RecordCalibration(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		CalibrationDate string `json:"calibration_date"`
		Notes           string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Kalibrasi dicatat (demo)"})
		return
	}
	if body.CalibrationDate == "" {
		body.CalibrationDate = time.Now().Format("2006-01-02")
	}
	// Get interval to compute next calibration
	var interval int
	database.DB.QueryRow(`SELECT calibration_interval_days FROM measuring_tools WHERE id=$1`, id).Scan(&interval)
	if interval == 0 {
		interval = 365
	}
	t, err := time.Parse("2006-01-02", body.CalibrationDate)
	if err != nil {
		t = time.Now()
	}
	nextCal := t.AddDate(0, 0, interval).Format("2006-01-02")
	database.DB.Exec(
		`UPDATE measuring_tools SET last_calibration=$1, next_calibration=$2 WHERE id=$3`,
		body.CalibrationDate, nextCal, id,
	)
	c.JSON(http.StatusOK, gin.H{"message": "Kalibrasi berhasil dicatat", "next_calibration": nextCal})
}

func GetCalibrationAlerts(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 2,
			"value": []gin.H{
				{"tool_code": "MT-003", "name": "Digital Scale 5kg", "next_calibration": "2026-06-10", "days_overdue": 18, "severity": "overdue"},
				{"tool_code": "MT-005", "name": "Coating Thickness Gauge", "next_calibration": "2026-11-01", "days_overdue": -126, "severity": "due_soon"},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT tool_code, name, COALESCE(next_calibration::text,''),
		        (NOW()::date - next_calibration)::int AS days_overdue
		 FROM measuring_tools WHERE company_id=$1 AND status='active'
		 AND next_calibration <= NOW()::date + interval '90 days'
		 ORDER BY next_calibration`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var code, name, nextCal string
		var daysOverdue int
		rows.Scan(&code, &name, &nextCal, &daysOverdue)
		severity := "due_soon"
		if daysOverdue >= 0 {
			severity = "overdue"
		}
		list = append(list, gin.H{
			"tool_code": code, "name": name, "next_calibration": nextCal,
			"days_overdue": daysOverdue, "severity": severity,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func DeleteMeasuringTool(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	database.DB.Exec(`DELETE FROM measuring_tools WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "Alat ukur dihapus"})
}

func DeleteInspection(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	database.DB.Exec(`DELETE FROM quality_inspections WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "Data inspeksi dihapus"})
}

func DeleteNCR(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	database.DB.Exec(`DELETE FROM ncr WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "NCR dihapus"})
}
