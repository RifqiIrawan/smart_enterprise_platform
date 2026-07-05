package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/models"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

func GetWorkOrders(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "wo_number": "WO-2847", "product_name": "Komponen A-12", "target_qty": 500, "actual_qty": 423, "status": "running", "machine_id": "CNC-01", "eta": "2026-06-30"},
			{"id": "2", "wo_number": "WO-2848", "product_name": "Assembly B-05", "target_qty": 200, "actual_qty": 200, "status": "done", "machine_id": "AS-02", "eta": "2026-06-26"},
			{"id": "3", "wo_number": "WO-2849", "product_name": "Komponen C-33", "target_qty": 750, "actual_qty": 0, "status": "pending", "machine_id": "CNC-02", "eta": "2026-07-05"},
			{"id": "4", "wo_number": "WO-2850", "product_name": "Part D-07", "target_qty": 300, "actual_qty": 150, "status": "running", "machine_id": "AS-01", "eta": "2026-07-02"},
			{"id": "5", "wo_number": "WO-2851", "product_name": "Frame E-11", "target_qty": 100, "actual_qty": 0, "status": "pending", "machine_id": "WL-01", "eta": "2026-07-10"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"wo_number", "product_name", "status", "machine_id"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		"SELECT id, wo_number, product_name, target_qty, actual_qty, machine_id, status FROM work_orders WHERE company_id = $1 ORDER BY created_at DESC LIMIT 50",
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var wos []models.WorkOrder
	for rows.Next() {
		var wo models.WorkOrder
		rows.Scan(&wo.ID, &wo.WONumber, &wo.ProductName, &wo.TargetQty, &wo.ActualQty, &wo.MachineID, &wo.Status)
		wos = append(wos, wo)
	}
	c.JSON(http.StatusOK, odata.Response(wos, int64(len(wos))))
}

func CreateWorkOrder(c *gin.Context) {
	var wo models.WorkOrder
	if err := c.ShouldBindJSON(&wo); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		wo.ID = "new-id"
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": wo})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.QueryRow(
		"INSERT INTO work_orders (company_id, wo_number, product_name, target_qty, machine_id, status) VALUES ($1,$2,$3,$4,$5,'pending') RETURNING id",
		companyID, wo.WONumber, wo.ProductName, wo.TargetQty, wo.MachineID,
	).Scan(&wo.ID)
	database.WriteAuditLog(c.GetString("user_id"), "CREATE", "work_orders", wo.ID, "Buat WO "+wo.WONumber, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": wo})
}

// FAC-01: Machine CRUD
func GetMachines(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "machine_code": "CNC-01", "name": "CNC Turning 01", "status": "running", "oee": 87.5, "location": "Lantai 1"},
			{"id": "2", "machine_code": "CNC-02", "name": "CNC Milling 02", "status": "idle", "oee": 72.3, "location": "Lantai 1"},
			{"id": "3", "machine_code": "AS-01", "name": "Assembly Station 01", "status": "running", "oee": 91.2, "location": "Lantai 2"},
			{"id": "4", "machine_code": "AS-02", "name": "Assembly Station 02", "status": "maintenance", "oee": 0, "location": "Lantai 2"},
			{"id": "5", "machine_code": "WL-01", "name": "Welding Line 01", "status": "idle", "oee": 68.9, "location": "Lantai 3"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"machine_code", "name", "status", "location"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, machine_code, name, status, COALESCE(oee,0), location FROM machines WHERE company_id=$1 ORDER BY machine_code`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var machines []gin.H
	for rows.Next() {
		var id, code, name, status, location string
		var oee float64
		rows.Scan(&id, &code, &name, &status, &oee, &location)
		machines = append(machines, gin.H{"id": id, "machine_code": code, "name": name, "status": status, "oee": oee, "location": location})
	}
	c.JSON(http.StatusOK, odata.Response(machines, int64(len(machines))))
}

func CreateMachine(c *gin.Context) {
	var req gin.H
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		req["id"] = "new-machine-id"
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO machines (company_id, machine_code, name, status, location) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		companyID, req["machine_code"], req["name"], "idle", req["location"],
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	req["id"] = id
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
}

func UpdateMachine(c *gin.Context) {
	id := c.Param("id")
	var req gin.H
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		req["id"] = id
		c.JSON(http.StatusOK, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(
		`UPDATE machines SET name=$1, status=$2, location=$3 WHERE id=$4 AND company_id=$5`,
		req["name"], req["status"], req["location"], id, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	req["id"] = id
	c.JSON(http.StatusOK, gin.H{"success": true, "data": req})
}

// FAC-04: Update actual qty + WH-06 consume BOM materials
func UpdateWorkOrderQty(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		ActualQty int    `json:"actual_qty"`
		Status    string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "actual_qty": req.ActualQty, "status": req.Status}})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(
		`UPDATE work_orders SET actual_qty=$1, status=$2, updated_at=NOW() WHERE id=$3 AND company_id=$4`,
		req.ActualQty, req.Status, id, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "UPDATE", "work_orders", id, "Update actual qty WO", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "actual_qty": req.ActualQty, "status": req.Status}})
}

// FAC-02: BOM
func GetBOM(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "product_name": "Komponen A-12", "material_name": "Baja Lembaran 2mm", "quantity": 5, "unit": "lembar"},
			{"id": "2", "product_name": "Komponen A-12", "material_name": "Cairan Pelumas ISO 46", "quantity": 0.5, "unit": "liter"},
			{"id": "3", "product_name": "Assembly B-05", "material_name": "Aluminium Profil 40x40", "quantity": 3, "unit": "batang"},
			{"id": "4", "product_name": "Assembly B-05", "material_name": "Kabel NYY 3x2.5mm", "quantity": 10, "unit": "meter"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"product_name", "material_name"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT b.id, b.product_name, i.name as material_name, b.quantity, b.unit FROM bom b
		 LEFT JOIN inventory i ON i.id = b.material_id WHERE b.company_id=$1 ORDER BY b.product_name`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, productName, materialName, unit string
		var qty float64
		rows.Scan(&id, &productName, &materialName, &qty, &unit)
		items = append(items, gin.H{"id": id, "product_name": productName, "material_name": materialName, "quantity": qty, "unit": unit})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateBOM(c *gin.Context) {
	var req gin.H
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		req["id"] = "new-bom-id"
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO bom (company_id, product_name, material_id, quantity, unit) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		companyID, req["product_name"], req["material_id"], req["quantity"], req["unit"],
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	req["id"] = id
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
}

// FAC-05: Downtime logging
func GetDowntime(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "machine_code": "CNC-01", "machine_name": "CNC Turning 01", "reason": "Pergantian tool", "category": "planned", "duration_min": 45, "created_at": now.Add(-2 * time.Hour)},
			{"id": "2", "machine_code": "AS-02", "machine_name": "Assembly Station 02", "reason": "Kerusakan motor", "category": "breakdown", "duration_min": 180, "created_at": now.Add(-5 * time.Hour)},
			{"id": "3", "machine_code": "WL-01", "machine_name": "Welding Line 01", "reason": "Menunggu material", "category": "idle", "duration_min": 60, "created_at": now.Add(-1 * time.Hour)},
		}
		rows, total := p.ApplyToSlice(demo, []string{"machine_code", "machine_name", "reason", "category"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT d.id, m.machine_code, m.name, d.reason, d.category,
		 EXTRACT(EPOCH FROM (COALESCE(d.end_time, NOW()) - d.start_time))/60 as duration_min, d.start_time
		 FROM downtime_logs d JOIN machines m ON m.id = d.machine_id
		 WHERE m.company_id=$1 ORDER BY d.start_time DESC LIMIT 50`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, code, name, reason, category string
		var durationMin float64
		var startTime time.Time
		rows.Scan(&id, &code, &name, &reason, &category, &durationMin, &startTime)
		items = append(items, gin.H{
			"id": id, "machine_code": code, "machine_name": name,
			"reason": reason, "category": category, "duration_min": int(durationMin), "created_at": startTime,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateDowntime(c *gin.Context) {
	var req struct {
		MachineID string `json:"machine_id"`
		Reason    string `json:"reason"`
		Category  string `json:"category"`
		Notes     string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-dt-id", "machine_id": req.MachineID, "reason": req.Reason,
			"category": req.Category, "start_time": time.Now(),
		}})
		return
	}
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO downtime_logs (machine_id, reason, category, start_time) VALUES ($1,$2,$3,NOW()) RETURNING id`,
		req.MachineID, req.Reason, req.Category,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	// Mark machine as maintenance
	database.DB.Exec(`UPDATE machines SET status='maintenance' WHERE id=$1`, req.MachineID)
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}
