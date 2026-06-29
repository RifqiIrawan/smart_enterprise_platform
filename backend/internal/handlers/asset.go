package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/models"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

func GetAssets(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "asset_number": "AST-001", "name": "Mesin CNC Milling", "category": "Mesin Produksi", "location": "Lantai 1", "value": 450000000, "condition": "good", "next_maintenance": now.Add(7 * 24 * time.Hour).Format("2006-01-02")},
			{"id": "2", "asset_number": "AST-002", "name": "Forklift Toyota 3T", "category": "Kendaraan", "location": "Gudang", "value": 280000000, "condition": "fair", "next_maintenance": now.Add(3 * 24 * time.Hour).Format("2006-01-02")},
			{"id": "3", "asset_number": "AST-003", "name": "Kompresor Udara 50HP", "category": "Utilitas", "location": "Ruang Utility", "value": 95000000, "condition": "good", "next_maintenance": now.Add(14 * 24 * time.Hour).Format("2006-01-02")},
			{"id": "4", "asset_number": "AST-004", "name": "Panel Listrik MDP", "category": "Elektrikal", "location": "Ruang Panel", "value": 120000000, "condition": "good", "next_maintenance": now.Add(30 * 24 * time.Hour).Format("2006-01-02")},
			{"id": "5", "asset_number": "AST-005", "name": "Server Dell PowerEdge R740", "category": "IT", "location": "Server Room", "value": 85000000, "condition": "good", "next_maintenance": now.Add(60 * 24 * time.Hour).Format("2006-01-02")},
		}
		rows, total := p.ApplyToSlice(demo, []string{"name", "asset_number", "category", "location"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, asset_number, name, category, location, value, condition, next_maintenance FROM assets WHERE company_id = $1 ORDER BY name`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var assets []models.Asset
	for rows.Next() {
		var a models.Asset
		rows.Scan(&a.ID, &a.AssetNumber, &a.Name, &a.Category, &a.Location, &a.Value, &a.Condition, &a.NextMaintenance)
		assets = append(assets, a)
	}
	c.JSON(http.StatusOK, odata.Response(assets, int64(len(assets))))
}

func CreateAsset(c *gin.Context) {
	var asset models.Asset
	if err := c.ShouldBindJSON(&asset); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		asset.ID = "new-asset-id"
		asset.CreatedAt = time.Now()
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": asset})
		return
	}
	companyID := c.GetString("company_id")
	err := database.DB.QueryRow(
		`INSERT INTO assets (company_id, asset_number, name, category, location, value, condition, next_maintenance)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		companyID, asset.AssetNumber, asset.Name, asset.Category, asset.Location, asset.Value, asset.Condition, asset.NextMaintenance,
	).Scan(&asset.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": asset})
}

func UpdateAsset(c *gin.Context) {
	id := c.Param("id")
	var asset models.Asset
	if err := c.ShouldBindJSON(&asset); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		asset.ID = id
		c.JSON(http.StatusOK, gin.H{"success": true, "data": asset})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(
		`UPDATE assets SET name=$1, category=$2, location=$3, value=$4, condition=$5, next_maintenance=$6
		 WHERE id=$7 AND company_id=$8`,
		asset.Name, asset.Category, asset.Location, asset.Value, asset.Condition, asset.NextMaintenance, id, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	asset.ID = id
	c.JSON(http.StatusOK, gin.H{"success": true, "data": asset})
}

func DeleteAsset(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(`DELETE FROM assets WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "DELETE", "asset", id, "Hapus aset", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
}

func GetMaintenanceSchedule(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "asset_id": "1", "asset_name": "Mesin CNC Milling", "type": "Preventive", "scheduled_date": now.Add(7 * 24 * time.Hour).Format("2006-01-02"), "technician": "Budi Santoso", "status": "scheduled", "notes": "Ganti oli dan filter"},
			{"id": "2", "asset_id": "2", "asset_name": "Forklift Toyota 3T", "type": "Corrective", "scheduled_date": now.Add(3 * 24 * time.Hour).Format("2006-01-02"), "technician": "Andi Wijaya", "status": "scheduled", "notes": "Perbaikan sistem rem"},
			{"id": "3", "asset_id": "3", "asset_name": "Kompresor Udara 50HP", "type": "Preventive", "scheduled_date": now.Add(-2 * 24 * time.Hour).Format("2006-01-02"), "technician": "Sari Dewi", "status": "done", "notes": "Pengecekan rutin bulanan"},
			{"id": "4", "asset_id": "1", "asset_name": "Mesin CNC Milling", "type": "Inspection", "scheduled_date": now.Add(-5 * 24 * time.Hour).Format("2006-01-02"), "technician": "Budi Santoso", "status": "done", "notes": "Inspeksi komponen"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"asset_name", "type", "technician", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT m.id, m.asset_id, a.name, m.type, m.scheduled_date, m.technician, m.status, m.notes
		 FROM maintenance_schedules m JOIN assets a ON a.id = m.asset_id
		 WHERE m.company_id = $1 ORDER BY m.scheduled_date DESC LIMIT 50`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id, assetID, assetName, mType, scheduledDate, technician, status, notes string
		rows.Scan(&id, &assetID, &assetName, &mType, &scheduledDate, &technician, &status, &notes)
		items = append(items, gin.H{
			"id": id, "asset_id": assetID, "asset_name": assetName, "type": mType,
			"scheduled_date": scheduledDate, "technician": technician, "status": status, "notes": notes,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateMaintenance(c *gin.Context) {
	var req struct {
		AssetID       string `json:"asset_id"`
		Type          string `json:"type"`
		ScheduledDate string `json:"scheduled_date"`
		Technician    string `json:"technician"`
		Notes         string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-mnt-id", "asset_id": req.AssetID, "type": req.Type,
			"scheduled_date": req.ScheduledDate, "technician": req.Technician,
			"status": "scheduled", "notes": req.Notes, "created_at": time.Now(),
		}})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO maintenance_schedules (company_id, asset_id, type, scheduled_date, technician, notes, status)
		 VALUES ($1,$2,$3,$4,$5,$6,'scheduled') RETURNING id`,
		companyID, req.AssetID, req.Type, req.ScheduledDate, req.Technician, req.Notes,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": id, "asset_id": req.AssetID, "type": req.Type, "scheduled_date": req.ScheduledDate,
		"technician": req.Technician, "status": "scheduled", "notes": req.Notes,
	}})
}

func UpdateMaintenanceStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status"`
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
		`UPDATE maintenance_schedules SET status = $1 WHERE id = $2 AND company_id = $3`,
		req.Status, id, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Status, "updated_at": time.Now()}})
}
