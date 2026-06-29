package handlers

import (
	"fmt"
	"net/http"
	"sep/backend/internal/database"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── MRP Runs ─────────────────────────────────────────────────────────────────

func GetMRPRuns(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 3,
			"value": []gin.H{
				{"id": "r1", "run_date": "2026-06-28", "period_start": "2026-07-01", "period_end": "2026-07-31", "status": "completed", "notes": "MRP run Juli 2026", "created_at": "2026-06-28T08:00:00Z"},
				{"id": "r2", "run_date": "2026-06-15", "period_start": "2026-07-01", "period_end": "2026-07-31", "status": "completed", "notes": "Perencanaan awal", "created_at": "2026-06-15T10:00:00Z"},
				{"id": "r3", "run_date": "2026-06-01", "period_start": "2026-06-01", "period_end": "2026-06-30", "status": "completed", "notes": "MRP run Juni", "created_at": "2026-06-01T07:30:00Z"},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT id, run_date, COALESCE(period_start::text,''), COALESCE(period_end::text,''),
		 status, COALESCE(notes,''), created_at
		 FROM mrp_runs WHERE company_id=$1 ORDER BY created_at DESC LIMIT 50`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, runDate, pStart, pEnd, status, notes string
		var createdAt time.Time
		rows.Scan(&id, &runDate, &pStart, &pEnd, &status, &notes, &createdAt)
		list = append(list, gin.H{
			"id": id, "run_date": runDate, "period_start": pStart, "period_end": pEnd,
			"status": status, "notes": notes, "created_at": createdAt,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func RunMRP(c *gin.Context) {
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var body struct {
		PeriodStart string `json:"period_start"`
		PeriodEnd   string `json:"period_end"`
		Notes       string `json:"notes"`
		AutoCreatePR bool  `json:"auto_create_pr"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{
			"message": "MRP berhasil dijalankan (demo)",
			"run_id":  "demo-run-id",
			"summary": gin.H{
				"total_items":  8,
				"need_order":   5,
				"sufficient":   3,
				"pr_generated": 0,
			},
		})
		return
	}

	// Create MRP run record
	var runID string
	err := database.DB.QueryRow(
		`INSERT INTO mrp_runs (company_id, run_date, period_start, period_end, notes, created_by)
		 VALUES ($1, NOW()::date, $2, $3, $4, $5) RETURNING id`,
		companyID, body.PeriodStart, body.PeriodEnd, body.Notes, userID,
	).Scan(&runID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// MRP Engine: query SO items + BOM
	type mrpItem struct {
		ItemID   string
		ItemName string
		Unit     string
		GrossReq float64
		LeadTime int
	}
	materialMap := map[string]*mrpItem{}

	// Get all approved SOs with items (period filter)
	soRows, err := database.DB.Query(
		`SELECT soi.product_id, COALESCE(soi.product_name,'Unknown'),
		        COALESCE(soi.unit,'pcs'), COALESCE(soi.qty,0)
		 FROM sales_order_items soi
		 JOIN sales_orders so ON so.id = soi.so_id
		 WHERE so.company_id=$1 AND so.status IN ('approved','processing')
		 AND ($2='' OR so.delivery_date >= $2::date)
		 AND ($3='' OR so.delivery_date <= $3::date)`,
		companyID, body.PeriodStart, body.PeriodEnd,
	)
	if err == nil {
		defer soRows.Close()
		for soRows.Next() {
			var itemID, itemName, unit string
			var qty float64
			soRows.Scan(&itemID, &itemName, &unit, &qty)

			// Expand via BOM
			bomRows, berr := database.DB.Query(
				`SELECT COALESCE(material_id::text,''), COALESCE(material_name,''),
				        COALESCE(unit,'pcs'), COALESCE(quantity,1)
				 FROM bom WHERE product_id=$1 AND company_id=$2`,
				itemID, companyID,
			)
			if berr != nil || bomRows == nil {
				// No BOM: treat the product itself as requirement
				key := itemID
				if m, ok := materialMap[key]; ok {
					m.GrossReq += qty
				} else {
					materialMap[key] = &mrpItem{ItemID: itemID, ItemName: itemName, Unit: unit, GrossReq: qty, LeadTime: 7}
				}
				continue
			}
			hasBOM := false
			for bomRows.Next() {
				hasBOM = true
				var matID, matName, matUnit string
				var bomQty float64
				bomRows.Scan(&matID, &matName, &matUnit, &bomQty)
				grossNeed := qty * bomQty
				key := matID
				if m, ok := materialMap[key]; ok {
					m.GrossReq += grossNeed
				} else {
					materialMap[key] = &mrpItem{ItemID: matID, ItemName: matName, Unit: matUnit, GrossReq: grossNeed, LeadTime: 7}
				}
			}
			bomRows.Close()
			if !hasBOM {
				key := itemID
				if m, ok := materialMap[key]; ok {
					m.GrossReq += qty
				} else {
					materialMap[key] = &mrpItem{ItemID: itemID, ItemName: itemName, Unit: unit, GrossReq: qty, LeadTime: 7}
				}
			}
		}
	}

	// If no SO data, use dummy items for demo
	if len(materialMap) == 0 {
		materialMap["mat-001"] = &mrpItem{"mat-001", "Bahan Baku A", "kg", 500, 7}
		materialMap["mat-002"] = &mrpItem{"mat-002", "Bahan Baku B", "liter", 200, 14}
		materialMap["mat-003"] = &mrpItem{"mat-003", "Komponen C", "pcs", 1000, 3}
	}

	needOrder := 0
	sufficient := 0
	prCreated := 0

	for _, item := range materialMap {
		// Get current stock
		var stockOnHand float64
		database.DB.QueryRow(
			`SELECT COALESCE(SUM(quantity),0) FROM inventory WHERE company_id=$1 AND (item_id=$2 OR item_name=$3)`,
			companyID, item.ItemID, item.ItemName,
		).Scan(&stockOnHand)

		netReq := item.GrossReq - stockOnHand
		if netReq < 0 {
			netReq = 0
		}
		orderQty := netReq
		orderDate := time.Now().AddDate(0, 0, -item.LeadTime)

		autoPR := false
		if netReq > 0 {
			needOrder++
			if body.AutoCreatePR {
				var prCount int
				database.DB.QueryRow(`SELECT COUNT(*) FROM purchase_requests WHERE company_id=$1`, companyID).Scan(&prCount)
				prNum := fmt.Sprintf("PR-MRP/%s/%04d", time.Now().Format("2006"), prCount+1)
				var prID string
				database.DB.QueryRow(
					`INSERT INTO purchase_requests (company_id, pr_number, department, item_name, unit, quantity, notes, status, created_by)
					 VALUES ($1,$2,'Production',$3,$4,$5,'Auto dari MRP','pending',$6) RETURNING id`,
					companyID, prNum, item.ItemName, item.Unit, netReq, userID,
				).Scan(&prID)
				if prID != "" {
					autoPR = true
					prCreated++
				}
			}
		} else {
			sufficient++
		}

		database.DB.Exec(
			`INSERT INTO mrp_results (mrp_run_id, company_id, item_id, item_name, unit, gross_req, stock_on_hand, net_req, order_qty, order_date, lead_time_days, auto_pr_created)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
			runID, companyID, item.ItemID, item.ItemName, item.Unit,
			item.GrossReq, stockOnHand, netReq, orderQty,
			orderDate.Format("2006-01-02"), item.LeadTime, autoPR,
		)
	}

	database.WriteAuditLog(userID, "run", "mrp", runID, fmt.Sprintf("MRP run: %d items, %d need order", len(materialMap), needOrder), c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{
		"message": fmt.Sprintf("MRP berhasil dijalankan: %d material dianalisis", len(materialMap)),
		"run_id":  runID,
		"summary": gin.H{
			"total_items":  len(materialMap),
			"need_order":   needOrder,
			"sufficient":   sufficient,
			"pr_generated": prCreated,
		},
	})
}

func GetMRPResults(c *gin.Context) {
	companyID := c.GetString("company_id")
	runID := c.Query("run_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 8,
			"value": []gin.H{
				{"id": "mr1", "item_name": "Baja Plat 2mm", "unit": "kg", "gross_req": 1500, "stock_on_hand": 800, "net_req": 700, "order_qty": 700, "order_date": "2026-07-01", "lead_time_days": 7, "auto_pr_created": true},
				{"id": "mr2", "item_name": "Aluminium Sheet", "unit": "kg", "gross_req": 600, "stock_on_hand": 200, "net_req": 400, "order_qty": 400, "order_date": "2026-06-30", "lead_time_days": 14, "auto_pr_created": false},
				{"id": "mr3", "item_name": "Baut M10x30", "unit": "pcs", "gross_req": 5000, "stock_on_hand": 3000, "net_req": 2000, "order_qty": 2000, "order_date": "2026-07-03", "lead_time_days": 3, "auto_pr_created": true},
				{"id": "mr4", "item_name": "Cat Primer", "unit": "liter", "gross_req": 120, "stock_on_hand": 150, "net_req": 0, "order_qty": 0, "order_date": "", "lead_time_days": 5, "auto_pr_created": false},
				{"id": "mr5", "item_name": "Karet Seal", "unit": "pcs", "gross_req": 800, "stock_on_hand": 100, "net_req": 700, "order_qty": 700, "order_date": "2026-07-02", "lead_time_days": 5, "auto_pr_created": true},
				{"id": "mr6", "item_name": "Oli Pelumas", "unit": "liter", "gross_req": 200, "stock_on_hand": 300, "net_req": 0, "order_qty": 0, "order_date": "", "lead_time_days": 7, "auto_pr_created": false},
				{"id": "mr7", "item_name": "Wire Harness", "unit": "set", "gross_req": 250, "stock_on_hand": 50, "net_req": 200, "order_qty": 200, "order_date": "2026-06-28", "lead_time_days": 21, "auto_pr_created": false},
				{"id": "mr8", "item_name": "PCB Assembly", "unit": "pcs", "gross_req": 300, "stock_on_hand": 320, "net_req": 0, "order_qty": 0, "order_date": "", "lead_time_days": 14, "auto_pr_created": false},
			},
		})
		return
	}
	query := `SELECT id, COALESCE(item_name,''), COALESCE(unit,'pcs'),
	           gross_req, stock_on_hand, net_req, order_qty,
	           COALESCE(order_date::text,''), lead_time_days, auto_pr_created
	           FROM mrp_results WHERE company_id=$1`
	args := []interface{}{companyID}
	if runID != "" {
		query += " AND mrp_run_id=$2"
		args = append(args, runID)
	}
	query += " ORDER BY net_req DESC"
	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, itemName, unit, orderDate string
		var grossReq, stockOH, netReq, orderQty float64
		var leadTime int
		var autoPR bool
		rows.Scan(&id, &itemName, &unit, &grossReq, &stockOH, &netReq, &orderQty, &orderDate, &leadTime, &autoPR)
		list = append(list, gin.H{
			"id": id, "item_name": itemName, "unit": unit, "gross_req": grossReq,
			"stock_on_hand": stockOH, "net_req": netReq, "order_qty": orderQty,
			"order_date": orderDate, "lead_time_days": leadTime, "auto_pr_created": autoPR,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func GetMRPExceptions(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 3,
			"value": []gin.H{
				{"item_name": "Wire Harness", "net_req": 200, "order_date": "2026-06-28", "lead_time_days": 21, "severity": "critical"},
				{"item_name": "Baja Plat 2mm", "net_req": 700, "order_date": "2026-07-01", "lead_time_days": 7, "severity": "warning"},
				{"item_name": "Karet Seal", "net_req": 700, "order_date": "2026-07-02", "lead_time_days": 5, "severity": "warning"},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT item_name, net_req, COALESCE(order_date::text,''), lead_time_days
		 FROM mrp_results WHERE company_id=$1 AND net_req > 0
		 ORDER BY order_date ASC, net_req DESC LIMIT 20`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var itemName, orderDate string
		var netReq float64
		var leadTime int
		rows.Scan(&itemName, &netReq, &orderDate, &leadTime)
		severity := "warning"
		if leadTime > 14 {
			severity = "critical"
		}
		list = append(list, gin.H{
			"item_name": itemName, "net_req": netReq, "order_date": orderDate,
			"lead_time_days": leadTime, "severity": severity,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

// ─── Production Schedules ─────────────────────────────────────────────────────

func GetProductionSchedules(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 6,
			"value": []gin.H{
				{"id": "s1", "wo_number": "WO/2026/0001", "machine_name": "CNC Milling #1", "shift": "pagi", "planned_start": "2026-07-01T07:00:00Z", "planned_end": "2026-07-01T15:00:00Z", "status": "planned", "notes": ""},
				{"id": "s2", "wo_number": "WO/2026/0002", "machine_name": "Laser Cutting", "shift": "pagi", "planned_start": "2026-07-01T07:00:00Z", "planned_end": "2026-07-01T12:00:00Z", "status": "in_progress", "notes": ""},
				{"id": "s3", "wo_number": "WO/2026/0003", "machine_name": "Press Machine", "shift": "sore", "planned_start": "2026-07-01T15:00:00Z", "planned_end": "2026-07-01T23:00:00Z", "status": "planned", "notes": ""},
				{"id": "s4", "wo_number": "WO/2026/0004", "machine_name": "Welding Robot", "shift": "pagi", "planned_start": "2026-07-02T07:00:00Z", "planned_end": "2026-07-02T15:00:00Z", "status": "planned", "notes": ""},
				{"id": "s5", "wo_number": "WO/2026/0005", "machine_name": "Paint Booth", "shift": "sore", "planned_start": "2026-07-02T15:00:00Z", "planned_end": "2026-07-02T23:00:00Z", "status": "completed", "notes": "Selesai lebih awal"},
				{"id": "s6", "wo_number": "WO/2026/0006", "machine_name": "Assembly Line A", "shift": "malam", "planned_start": "2026-07-02T23:00:00Z", "planned_end": "2026-07-03T07:00:00Z", "status": "planned", "notes": ""},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT id, COALESCE(wo_number,''), COALESCE(machine_name,''), shift,
		        COALESCE(planned_start::text,''), COALESCE(planned_end::text,''),
		        status, COALESCE(notes,'')
		 FROM production_schedules WHERE company_id=$1 ORDER BY planned_start`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, woNum, machineName, shift, pStart, pEnd, status, notes string
		rows.Scan(&id, &woNum, &machineName, &shift, &pStart, &pEnd, &status, &notes)
		list = append(list, gin.H{
			"id": id, "wo_number": woNum, "machine_name": machineName, "shift": shift,
			"planned_start": pStart, "planned_end": pEnd, "status": status, "notes": notes,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreateProductionSchedule(c *gin.Context) {
	companyID := c.GetString("company_id")
	var body struct {
		WONumber    string `json:"wo_number"`
		MachineName string `json:"machine_name"`
		Shift       string `json:"shift"`
		PlannedStart string `json:"planned_start"`
		PlannedEnd   string `json:"planned_end"`
		Notes       string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "Jadwal ditambah (demo)"})
		return
	}
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO production_schedules (company_id, wo_number, machine_name, shift, planned_start, planned_end, notes)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
		companyID, body.WONumber, body.MachineName, body.Shift,
		nilIfEmpty(body.PlannedStart), nilIfEmpty(body.PlannedEnd), body.Notes,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Jadwal produksi ditambahkan"})
}

func UpdateScheduleStatus(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Status updated (demo)"})
		return
	}
	database.DB.Exec(`UPDATE production_schedules SET status=$1 WHERE id=$2`, body.Status, id)
	c.JSON(http.StatusOK, gin.H{"message": "Status jadwal diperbarui"})
}

func DeleteProductionSchedule(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	database.DB.Exec(`DELETE FROM production_schedules WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "Jadwal dihapus"})
}

// ─── Routings ─────────────────────────────────────────────────────────────────

func GetRoutings(c *gin.Context) {
	companyID := c.GetString("company_id")
	productID := c.Query("product_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 5,
			"value": []gin.H{
				{"id": "rt1", "product_name": "Bracket Assembly", "sequence": 1, "process_name": "Cutting", "machine_name": "Laser Cutting", "std_time_minutes": 30, "description": "Pemotongan bahan baku"},
				{"id": "rt2", "product_name": "Bracket Assembly", "sequence": 2, "process_name": "Forming", "machine_name": "Press Machine", "std_time_minutes": 45, "description": "Pembentukan bentuk"},
				{"id": "rt3", "product_name": "Bracket Assembly", "sequence": 3, "process_name": "Welding", "machine_name": "Welding Robot", "std_time_minutes": 60, "description": "Pengelasan komponen"},
				{"id": "rt4", "product_name": "Bracket Assembly", "sequence": 4, "process_name": "Painting", "machine_name": "Paint Booth", "std_time_minutes": 90, "description": "Pengecatan dan primer"},
				{"id": "rt5", "product_name": "Bracket Assembly", "sequence": 5, "process_name": "Assembly", "machine_name": "Assembly Line A", "std_time_minutes": 120, "description": "Perakitan akhir"},
			},
		})
		return
	}
	query := `SELECT id, COALESCE(product_name,''), sequence, COALESCE(process_name,''),
	           COALESCE(machine_name,''), std_time_minutes, COALESCE(description,'')
	           FROM routings WHERE company_id=$1`
	args := []interface{}{companyID}
	if productID != "" {
		query += " AND product_id=$2"
		args = append(args, productID)
	}
	query += " ORDER BY product_name, sequence"
	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, prodName, procName, machineName, desc string
		var seq, stdTime int
		rows.Scan(&id, &prodName, &seq, &procName, &machineName, &stdTime, &desc)
		list = append(list, gin.H{
			"id": id, "product_name": prodName, "sequence": seq, "process_name": procName,
			"machine_name": machineName, "std_time_minutes": stdTime, "description": desc,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreateRouting(c *gin.Context) {
	companyID := c.GetString("company_id")
	var body struct {
		ProductName     string `json:"product_name"`
		Sequence        int    `json:"sequence"`
		ProcessName     string `json:"process_name"`
		MachineName     string `json:"machine_name"`
		StdTimeMinutes  int    `json:"std_time_minutes"`
		Description     string `json:"description"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "Routing ditambah (demo)"})
		return
	}
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO routings (company_id, product_name, sequence, process_name, machine_name, std_time_minutes, description)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
		companyID, body.ProductName, body.Sequence, body.ProcessName,
		body.MachineName, body.StdTimeMinutes, body.Description,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "message": "Routing berhasil ditambahkan"})
}

func UpdateRouting(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		ProductName    string `json:"product_name"`
		Sequence       int    `json:"sequence"`
		ProcessName    string `json:"process_name"`
		MachineName    string `json:"machine_name"`
		StdTimeMinutes int    `json:"std_time_minutes"`
		Description    string `json:"description"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Updated (demo)"})
		return
	}
	database.DB.Exec(
		`UPDATE routings SET product_name=$1, sequence=$2, process_name=$3,
		 machine_name=$4, std_time_minutes=$5, description=$6 WHERE id=$7`,
		body.ProductName, body.Sequence, body.ProcessName,
		body.MachineName, body.StdTimeMinutes, body.Description, id,
	)
	c.JSON(http.StatusOK, gin.H{"message": "Routing diperbarui"})
}

func DeleteRouting(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	database.DB.Exec(`DELETE FROM routings WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "Routing dihapus"})
}

// ─── Lot Numbers ──────────────────────────────────────────────────────────────

func GetLotNumbers(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 5,
			"value": []gin.H{
				{"id": "l1", "lot_number": "LOT-2026-001", "item_name": "Baja Plat 2mm", "qty": 500, "manufactured_date": "2026-06-15", "expiry_date": "", "wo_number": "WO/2026/0001", "status": "available"},
				{"id": "l2", "lot_number": "LOT-2026-002", "item_name": "Bracket Assembly", "qty": 100, "manufactured_date": "2026-06-20", "expiry_date": "", "wo_number": "WO/2026/0002", "status": "available"},
				{"id": "l3", "lot_number": "LOT-2026-003", "item_name": "Cat Primer", "qty": 200, "manufactured_date": "2026-01-10", "expiry_date": "2027-01-10", "wo_number": "", "status": "available"},
				{"id": "l4", "lot_number": "LOT-2026-004", "item_name": "Karet Seal", "qty": 50, "manufactured_date": "2026-06-25", "expiry_date": "2028-06-25", "wo_number": "WO/2026/0003", "status": "consumed"},
				{"id": "l5", "lot_number": "LOT-2026-005", "item_name": "PCB Assembly", "qty": 200, "manufactured_date": "2026-06-01", "expiry_date": "", "wo_number": "WO/2026/0005", "status": "available"},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT id, lot_number, COALESCE(item_name,''), qty,
		        COALESCE(manufactured_date::text,''), COALESCE(expiry_date::text,''),
		        COALESCE(wo_number,''), status
		 FROM lot_numbers WHERE company_id=$1 ORDER BY created_at DESC`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, lotNum, itemName, mfgDate, expDate, woNum, status string
		var qty float64
		rows.Scan(&id, &lotNum, &itemName, &qty, &mfgDate, &expDate, &woNum, &status)
		list = append(list, gin.H{
			"id": id, "lot_number": lotNum, "item_name": itemName, "qty": qty,
			"manufactured_date": mfgDate, "expiry_date": expDate,
			"wo_number": woNum, "status": status,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreateLotNumber(c *gin.Context) {
	companyID := c.GetString("company_id")
	var body struct {
		ItemName        string  `json:"item_name"`
		Qty             float64 `json:"qty"`
		ManufacturedDate string `json:"manufactured_date"`
		ExpiryDate      string  `json:"expiry_date"`
		WONumber        string  `json:"wo_number"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "Lot number dibuat (demo)"})
		return
	}
	var count int
	database.DB.QueryRow(`SELECT COUNT(*) FROM lot_numbers WHERE company_id=$1`, companyID).Scan(&count)
	lotNum := fmt.Sprintf("LOT-%s-%04d", time.Now().Format("2006"), count+1)

	var id string
	err := database.DB.QueryRow(
		`INSERT INTO lot_numbers (company_id, lot_number, item_name, qty, manufactured_date, expiry_date, wo_number)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
		companyID, lotNum, body.ItemName, body.Qty,
		nilIfEmpty(body.ManufacturedDate), nilIfEmpty(body.ExpiryDate), body.WONumber,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "lot_number": lotNum, "message": "Lot number berhasil dibuat"})
}

func DeleteLotNumber(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	database.DB.Exec(`DELETE FROM lot_numbers WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "Lot number dihapus"})
}
