package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

func GetVisitors(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		checkoutTime := now.Add(-1 * time.Hour)
		demo := []gin.H{
			{"id": "1", "name": "Reza Firmansyah", "company": "PT Supplier Jaya", "purpose": "Meeting Procurement", "host": "Sari Dewi", "check_in": now.Add(-3 * time.Hour), "check_out": &checkoutTime, "status": "checked_out", "badge": "V-001"},
			{"id": "2", "name": "Diana Putri", "company": "CV Konsultan IT", "purpose": "Demo Software", "host": "Andi Wijaya", "check_in": now.Add(-2 * time.Hour), "check_out": nil, "status": "active", "badge": "V-002"},
			{"id": "3", "name": "Hendra Kurniawan", "company": "PT Logistik Cepat", "purpose": "Pengiriman Barang", "host": "Budi Santoso", "check_in": now.Add(-30 * time.Minute), "check_out": nil, "status": "active", "badge": "V-003"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"name", "company", "purpose", "host", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, name, company, purpose, host, check_in, check_out, status, badge
		 FROM visitors WHERE company_id = $1 ORDER BY check_in DESC LIMIT 100`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id, name, company, purpose, host, status, badge string
		var checkIn time.Time
		var checkOut *time.Time
		rows.Scan(&id, &name, &company, &purpose, &host, &checkIn, &checkOut, &status, &badge)
		items = append(items, gin.H{
			"id": id, "name": name, "company": company, "purpose": purpose,
			"host": host, "check_in": checkIn, "check_out": checkOut,
			"status": status, "badge": badge,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CheckInVisitor(c *gin.Context) {
	var req struct {
		Name    string `json:"name"`
		Company string `json:"company"`
		Purpose string `json:"purpose"`
		Host    string `json:"host"`
		Badge   string `json:"badge"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-visitor-id", "name": req.Name, "company": req.Company,
			"purpose": req.Purpose, "host": req.Host, "badge": req.Badge,
			"check_in": time.Now(), "check_out": nil, "status": "active",
		}})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO visitors (company_id, name, company, purpose, host, badge, check_in, status)
		 VALUES ($1,$2,$3,$4,$5,$6,NOW(),'active') RETURNING id`,
		companyID, req.Name, req.Company, req.Purpose, req.Host, req.Badge,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": id, "name": req.Name, "status": "active", "check_in": time.Now(),
	}})
}

func CheckOutVisitor(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": "checked_out", "check_out": time.Now()}})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(
		`UPDATE visitors SET check_out = NOW(), status = 'checked_out' WHERE id = $1 AND company_id = $2`,
		id, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": "checked_out", "check_out": time.Now()}})
}

func GetIncidents(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "incident_number": "INC-001", "title": "Akses Tidak Sah Gate B", "category": "Keamanan", "severity": "high", "location": "Gate B", "reported_by": "Satpam A", "status": "investigating", "created_at": now.Add(-2 * time.Hour)},
			{"id": "2", "incident_number": "INC-002", "title": "Kebocoran Pipa Air", "category": "Fasilitas", "severity": "medium", "location": "Lantai 2", "reported_by": "Budi Santoso", "status": "resolved", "created_at": now.Add(-1 * 24 * time.Hour)},
			{"id": "3", "incident_number": "INC-003", "title": "Kehilangan Aset Laptop", "category": "Keamanan", "severity": "high", "location": "Ruang IT", "reported_by": "Andi Wijaya", "status": "open", "created_at": now.Add(-3 * 24 * time.Hour)},
			{"id": "4", "incident_number": "INC-004", "title": "Kecelakaan Kerja Ringan", "category": "K3", "severity": "low", "location": "Lantai Produksi", "reported_by": "Sari Dewi", "status": "closed", "created_at": now.Add(-5 * 24 * time.Hour)},
		}
		rows, total := p.ApplyToSlice(demo, []string{"title", "category", "severity", "location", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, incident_number, title, category, severity, location, reported_by, status, created_at
		 FROM incidents WHERE company_id = $1 ORDER BY created_at DESC LIMIT 100`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id, incidentNumber, title, category, severity, location, reportedBy, status string
		var createdAt time.Time
		rows.Scan(&id, &incidentNumber, &title, &category, &severity, &location, &reportedBy, &status, &createdAt)
		items = append(items, gin.H{
			"id": id, "incident_number": incidentNumber, "title": title, "category": category,
			"severity": severity, "location": location, "reported_by": reportedBy,
			"status": status, "created_at": createdAt,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateIncident(c *gin.Context) {
	var req struct {
		Title          string `json:"title"`
		Category       string `json:"category"`
		Severity       string `json:"severity"`
		Location       string `json:"location"`
		ReportedBy     string `json:"reported_by"`
		Description    string `json:"description"`
		IncidentNumber string `json:"incident_number"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-incident-id", "incident_number": req.IncidentNumber, "title": req.Title,
			"category": req.Category, "severity": req.Severity, "location": req.Location,
			"reported_by": req.ReportedBy, "status": "open", "created_at": time.Now(),
		}})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO incidents (company_id, incident_number, title, category, severity, location, reported_by, description, status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open') RETURNING id`,
		companyID, req.IncidentNumber, req.Title, req.Category, req.Severity, req.Location, req.ReportedBy, req.Description,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": id, "title": req.Title, "status": "open", "created_at": time.Now(),
	}})
}

func UpdateIncidentStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status     string `json:"status"`
		Resolution string `json:"resolution"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status, "updated_at": time.Now()}})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(
		`UPDATE incidents SET status = $1, resolution = $2, updated_at = NOW() WHERE id = $3 AND company_id = $4`,
		req.Status, req.Resolution, id, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status, "updated_at": time.Now()}})
}
