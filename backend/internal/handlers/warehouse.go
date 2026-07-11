package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

func GetInventory(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "sku": "RAW-001", "name": "Baja Lembaran 2mm", "category": "Bahan Baku", "qty": 150, "min_stock": 200, "unit": "lembar", "location": "Gudang A-1", "status": "low", "updated_at": now.Add(-2 * time.Hour)},
			{"id": "2", "sku": "RAW-002", "name": "Aluminium Profil 40x40", "category": "Bahan Baku", "qty": 0, "min_stock": 50, "unit": "batang", "location": "Gudang A-2", "status": "out", "updated_at": now.Add(-5 * time.Hour)},
			{"id": "3", "sku": "PKG-001", "name": "Kardus Box 50x50x50", "category": "Packaging", "qty": 850, "min_stock": 300, "unit": "pcs", "location": "Gudang B-1", "status": "ok", "updated_at": now.Add(-1 * time.Hour)},
			{"id": "4", "sku": "CHM-001", "name": "Cairan Pelumas ISO 46", "category": "Kimia", "qty": 45, "min_stock": 100, "unit": "liter", "location": "Gudang C-1", "status": "low", "updated_at": now.Add(-30 * time.Minute)},
			{"id": "5", "sku": "ELC-001", "name": "Kabel NYY 3x2.5mm", "category": "Elektrikal", "qty": 500, "min_stock": 100, "unit": "meter", "location": "Gudang D-1", "status": "ok", "updated_at": now.Add(-3 * time.Hour)},
			{"id": "6", "sku": "RAW-003", "name": "Besi Siku 40x40x4mm", "category": "Bahan Baku", "qty": 300, "min_stock": 100, "unit": "batang", "location": "Gudang A-3", "status": "ok", "updated_at": now.Add(-6 * time.Hour)},
		}
		rows, total := p.ApplyToSlice(demo, []string{"name", "sku", "category", "location"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, sku, name, category, qty, min_stock, unit, location,
		 CASE WHEN qty = 0 THEN 'out' WHEN qty < min_stock THEN 'low' ELSE 'ok' END as status,
		 updated_at FROM inventory WHERE company_id = $1 ORDER BY name`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id, sku, name, category, unit, location, status string
		var qty, minStock int
		var updatedAt time.Time
		rows.Scan(&id, &sku, &name, &category, &qty, &minStock, &unit, &location, &status, &updatedAt)
		items = append(items, gin.H{
			"id": id, "sku": sku, "name": name, "category": category,
			"qty": qty, "min_stock": minStock, "unit": unit, "location": location,
			"status": status, "updated_at": updatedAt,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateInventory(c *gin.Context) {
	var req gin.H
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		req["id"] = "new-inv-id"
		req["status"] = "ok"
		req["updated_at"] = time.Now()
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO inventory (company_id, sku, name, category, qty, min_stock, unit, location)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		companyID, req["sku"], req["name"], req["category"], req["qty"], req["min_stock"], req["unit"], req["location"],
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	req["id"] = id
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
}

func UpdateInventory(c *gin.Context) {
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
		`UPDATE inventory SET sku=$1, name=$2, category=$3, min_stock=$4, unit=$5, location=$6, updated_at=NOW() WHERE id=$7 AND company_id=$8`,
		req["sku"], req["name"], req["category"], req["min_stock"], req["unit"], req["location"], id, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	req["id"] = id
	c.JSON(http.StatusOK, gin.H{"success": true, "data": req})
}

func DeleteInventory(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(`DELETE FROM inventory WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "DELETE", "inventory", id, "Hapus item inventori", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "deleted"})
}

func UpdateInventoryQty(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Qty    int    `json:"qty"`
		Adjust int    `json:"adjust"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "qty": req.Qty + req.Adjust, "updated_at": time.Now()}})
		return
	}
	companyID := c.GetString("company_id")
	var newQty int
	var err error
	if req.Qty > 0 {
		err = database.DB.QueryRow(
			`UPDATE inventory SET qty = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING qty`,
			req.Qty, id, companyID,
		).Scan(&newQty)
	} else {
		err = database.DB.QueryRow(
			`UPDATE inventory SET qty = qty + $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING qty`,
			req.Adjust, id, companyID,
		).Scan(&newQty)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "qty": newQty, "updated_at": time.Now()}})
}

func GetMovements(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "item_name": "Baja Lembaran 2mm", "type": "out", "qty": 50, "reference": "WO-2847", "notes": "Produksi Komponen A-12", "created_at": now.Add(-1 * time.Hour)},
			{"id": "2", "item_name": "Kardus Box 50x50x50", "type": "in", "qty": 200, "reference": "PO-1234", "notes": "Penerimaan dari supplier", "created_at": now.Add(-2 * time.Hour)},
			{"id": "3", "item_name": "Cairan Pelumas ISO 46", "type": "out", "qty": 10, "reference": "MNT-001", "notes": "Maintenance CNC-01", "created_at": now.Add(-3 * time.Hour)},
			{"id": "4", "item_name": "Aluminium Profil 40x40", "type": "in", "qty": 100, "reference": "PO-1233", "notes": "Penerimaan dari PT Alumindo", "created_at": now.Add(-1 * 24 * time.Hour)},
			{"id": "5", "item_name": "Kabel NYY 3x2.5mm", "type": "out", "qty": 30, "reference": "WO-2848", "notes": "Instalasi panel", "created_at": now.Add(-5 * time.Hour)},
		}
		rows, total := p.ApplyToSlice(demo, []string{"item_name", "type", "reference", "notes"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT sm.id, i.name, sm.type, sm.qty, sm.reference, sm.notes, sm.created_at
		 FROM stock_movements sm
		 JOIN inventory i ON i.id = sm.inventory_id
		 WHERE sm.company_id = $1 ORDER BY sm.created_at DESC LIMIT 100`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var movements []gin.H
	for rows.Next() {
		var id, itemName, mvType, reference, notes string
		var qty int
		var createdAt time.Time
		rows.Scan(&id, &itemName, &mvType, &qty, &reference, &notes, &createdAt)
		movements = append(movements, gin.H{
			"id": id, "item_name": itemName, "type": mvType, "qty": qty,
			"reference": reference, "notes": notes, "created_at": createdAt,
		})
	}
	c.JSON(http.StatusOK, odata.Response(movements, int64(len(movements))))
}

func CreateMovement(c *gin.Context) {
	var req struct {
		InventoryID string `json:"inventory_id"`
		Type        string `json:"type"`
		Qty         int    `json:"qty"`
		Reference   string `json:"reference"`
		Notes       string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if req.Type != "in" && req.Type != "out" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "type must be 'in' or 'out'"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-mv-id", "inventory_id": req.InventoryID, "type": req.Type,
			"qty": req.Qty, "reference": req.Reference, "notes": req.Notes, "created_at": time.Now(),
		}})
		return
	}
	companyID := c.GetString("company_id")
	var mvID string
	err := database.DB.QueryRow(
		`INSERT INTO stock_movements (company_id, inventory_id, type, qty, reference, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		companyID, req.InventoryID, req.Type, req.Qty, req.Reference, req.Notes,
	).Scan(&mvID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	if req.Type == "in" {
		_, err = database.DB.Exec(`UPDATE inventory SET qty = qty + $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`, req.Qty, req.InventoryID, companyID)
	} else {
		_, err = database.DB.Exec(`UPDATE inventory SET qty = GREATEST(0, qty - $1), updated_at = NOW() WHERE id = $2 AND company_id = $3`, req.Qty, req.InventoryID, companyID)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Movement tercatat tapi gagal update stok: " + err.Error()})
		return
	}
	req.InventoryID = mvID
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": mvID, "type": req.Type, "qty": req.Qty, "reference": req.Reference,
		"notes": req.Notes, "created_at": time.Now(),
	}})
}

// WH-02: Reorder point alerts
func GetStockAlerts(c *gin.Context) {
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "sku": "RAW-001", "name": "Baja Lembaran 2mm", "qty": 150, "min_stock": 200, "unit": "lembar", "location": "Gudang A-1", "status": "low"},
			{"id": "2", "sku": "RAW-002", "name": "Aluminium Profil 40x40", "qty": 0, "min_stock": 50, "unit": "batang", "location": "Gudang A-2", "status": "out"},
			{"id": "4", "sku": "CHM-001", "name": "Cairan Pelumas ISO 46", "qty": 45, "min_stock": 100, "unit": "liter", "location": "Gudang C-1", "status": "low"},
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": demo, "total": len(demo)})
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, sku, name, qty, min_stock, unit, location,
		 CASE WHEN qty = 0 THEN 'out' ELSE 'low' END as status
		 FROM inventory WHERE company_id=$1 AND qty <= min_stock ORDER BY qty ASC`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var alerts []gin.H
	for rows.Next() {
		var id, sku, name, unit, location, status string
		var qty, minStock int
		rows.Scan(&id, &sku, &name, &qty, &minStock, &unit, &location, &status)
		alerts = append(alerts, gin.H{"id": id, "sku": sku, "name": name, "qty": qty, "min_stock": minStock, "unit": unit, "location": location, "status": status})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": alerts, "total": len(alerts)})
}

// WH-03: Stock transfer between locations
func CreateStockTransfer(c *gin.Context) {
	var req struct {
		InventoryID  string `json:"inventory_id"`
		FromLocation string `json:"from_location"`
		ToLocation   string `json:"to_location"`
		Qty          int    `json:"qty"`
		Notes        string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "new-transfer-id", "from": req.FromLocation, "to": req.ToLocation,
			"qty": req.Qty, "created_at": time.Now(),
		}})
		return
	}
	companyID := c.GetString("company_id")
	// Update location in inventory
	_, err := database.DB.Exec(
		`UPDATE inventory SET location=$1, updated_at=NOW() WHERE id=$2 AND company_id=$3`,
		req.ToLocation, req.InventoryID, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	// Record movement
	var mvID string
	database.DB.QueryRow(
		`INSERT INTO stock_movements (company_id, inventory_id, type, qty, reference, notes) VALUES ($1,$2,'transfer',$3,'TRANSFER',$4) RETURNING id`,
		companyID, req.InventoryID, req.Qty, "Transfer: "+req.FromLocation+" → "+req.ToLocation+" | "+req.Notes,
	).Scan(&mvID)
	database.WriteAuditLog(c.GetString("user_id"), "TRANSFER", "inventory", req.InventoryID, "Transfer stok ke "+req.ToLocation, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": mvID, "from": req.FromLocation, "to": req.ToLocation, "qty": req.Qty, "created_at": time.Now(),
	}})
}

// WH-04: Stock opname
func GetStockOpname(c *gin.Context) {
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "sku": "RAW-001", "name": "Baja Lembaran 2mm", "system_qty": 150, "physical_qty": 148, "difference": -2, "unit": "lembar", "location": "Gudang A-1", "status": "checked"},
			{"id": "2", "sku": "RAW-002", "name": "Aluminium Profil 40x40", "system_qty": 0, "physical_qty": 0, "difference": 0, "unit": "batang", "location": "Gudang A-2", "status": "checked"},
			{"id": "3", "sku": "PKG-001", "name": "Kardus Box 50x50x50", "system_qty": 850, "physical_qty": 852, "difference": 2, "unit": "pcs", "location": "Gudang B-1", "status": "pending"},
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": demo, "total": len(demo)})
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, sku, name, qty as system_qty, qty as physical_qty, 0 as difference, unit, location, 'pending' as status FROM inventory WHERE company_id=$1 ORDER BY name`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, sku, name, unit, location, status string
		var systemQty, physicalQty, diff int
		rows.Scan(&id, &sku, &name, &systemQty, &physicalQty, &diff, &unit, &location, &status)
		items = append(items, gin.H{"id": id, "sku": sku, "name": name, "system_qty": systemQty, "physical_qty": physicalQty, "difference": diff, "unit": unit, "location": location, "status": status})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items, "total": len(items)})
}

func SubmitStockOpname(c *gin.Context) {
	var req struct {
		Items []struct {
			InventoryID string `json:"inventory_id"`
			PhysicalQty int    `json:"physical_qty"`
			Notes       string `json:"notes"`
		} `json:"items"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Stock opname berhasil disimpan", "updated": len(req.Items)})
		return
	}
	companyID := c.GetString("company_id")
	updated := 0
	for _, item := range req.Items {
		_, err := database.DB.Exec(
			`UPDATE inventory SET qty=$1, updated_at=NOW() WHERE id=$2 AND company_id=$3`,
			item.PhysicalQty, item.InventoryID, companyID,
		)
		if err == nil {
			updated++
			database.DB.Exec(
				`INSERT INTO stock_movements (company_id, inventory_id, type, qty, reference, notes) VALUES ($1,$2,'adjustment',$3,'OPNAME',$4)`,
				companyID, item.InventoryID, item.PhysicalQty, "Penyesuaian opname: "+item.Notes,
			)
		}
	}
	database.WriteAuditLog(c.GetString("user_id"), "OPNAME", "inventory", "", "Stock opname selesai", c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Stock opname berhasil disimpan", "updated": updated})
}
