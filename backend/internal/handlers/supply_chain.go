package handlers

import (
	"net/http"
	"sep/backend/internal/database"

	"github.com/gin-gonic/gin"
)

// ─── Supply Chain Map ─────────────────────────────────────────────────────────

func GetSupplyChainMap(c *gin.Context) {
	if database.DB != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": buildSCMap()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildSCMap()})
}

func buildSCMap() gin.H {
	return gin.H{
		"nodes": []gin.H{
			{"id": "n1", "type": "supplier", "label": "CV Sukses Jaya", "sub": "Bahan Baku X, Y", "status": "active", "x": 50, "y": 120},
			{"id": "n2", "type": "supplier", "label": "PT Bahan Prima", "sub": "Material W, Spare Part Z", "status": "active", "x": 50, "y": 250},
			{"id": "n3", "type": "supplier", "label": "UD Karya Mandiri", "sub": "Komponen V, Frame", "status": "risk", "x": 50, "y": 380},
			{"id": "n4", "type": "warehouse", "label": "Gudang Bahan Baku", "sub": "340 SKU · 12.400 unit", "status": "normal", "x": 230, "y": 250},
			{"id": "n5", "type": "production", "label": "Work Center A1", "sub": "Assembly Line", "status": "active", "x": 410, "y": 150},
			{"id": "n6", "type": "production", "label": "Work Center A2", "sub": "Machining", "status": "active", "x": 410, "y": 250},
			{"id": "n7", "type": "production", "label": "Work Center B1", "sub": "Finishing", "status": "active", "x": 410, "y": 350},
			{"id": "n8", "type": "qc", "label": "Quality Control", "sub": "IQC · IPQC · FQC", "status": "normal", "x": 590, "y": 250},
			{"id": "n9", "type": "warehouse", "label": "Gudang Barang Jadi", "sub": "48 SKU · 5.200 unit", "status": "normal", "x": 760, "y": 250},
			{"id": "n10", "type": "channel", "label": "Shopee / Tokopedia", "sub": "B2C Channel", "status": "active", "x": 940, "y": 150},
			{"id": "n11", "type": "channel", "label": "Direct B2B", "sub": "Customer Portal", "status": "active", "x": 940, "y": 250},
			{"id": "n12", "type": "channel", "label": "Distributor", "sub": "3 distributor aktif", "status": "active", "x": 940, "y": 350},
		},
		"edges": []gin.H{
			{"from": "n1", "to": "n4", "label": "2-4 hari", "type": "supply"},
			{"from": "n2", "to": "n4", "label": "3-5 hari", "type": "supply"},
			{"from": "n3", "to": "n4", "label": "5-7 hari", "type": "supply_risk"},
			{"from": "n4", "to": "n5", "label": "WO", "type": "production"},
			{"from": "n4", "to": "n6", "label": "WO", "type": "production"},
			{"from": "n4", "to": "n7", "label": "WO", "type": "production"},
			{"from": "n5", "to": "n8", "label": "FQC", "type": "qc"},
			{"from": "n6", "to": "n8", "label": "FQC", "type": "qc"},
			{"from": "n7", "to": "n8", "label": "FQC", "type": "qc"},
			{"from": "n8", "to": "n9", "label": "Pass", "type": "logistics"},
			{"from": "n9", "to": "n10", "label": "DO", "type": "delivery"},
			{"from": "n9", "to": "n11", "label": "DO", "type": "delivery"},
			{"from": "n9", "to": "n12", "label": "DO", "type": "delivery"},
		},
		"summary": gin.H{
			"avg_lead_time_days":   12,
			"active_suppliers":     4,
			"active_customers":     24,
			"in_transit_shipments": 7,
			"supply_risk_items":    2,
		},
	}
}

// ─── Product Traceability ─────────────────────────────────────────────────────

func GetProductTraceability(c *gin.Context) {
	lot := c.DefaultQuery("lot", "LOT-2026-0441")
	product := c.DefaultQuery("product", "Komponen A-12")
	_ = lot
	_ = product

	trace := gin.H{
		"lot_number":   "LOT-2026-0441",
		"product_code": "KOM-A12",
		"product_name": "Komponen A-12",
		"batch_qty":    200,
		"status":       "delivered",
		"timeline": []gin.H{
			{
				"step":        1,
				"stage":       "Bahan Baku Diterima",
				"icon":        "package",
				"date":        "2026-06-15",
				"actor":       "Gudang — GRN-0441",
				"details":     "Raw material diterima dari CV Sukses Jaya (PO-3028). GRN OK.",
				"status":      "done",
				"attachments": []string{"GRN-0441", "PO-3028"},
			},
			{
				"step":        2,
				"stage":       "Inspeksi Kualitas (IQC)",
				"icon":        "clipboard",
				"date":        "2026-06-16",
				"actor":       "QC Team — INS-0221",
				"details":     "IQC passed. Sampling 5% → 0 defect. Material disetujui masuk produksi.",
				"status":      "done",
				"attachments": []string{"INS-0221"},
			},
			{
				"step":        3,
				"stage":       "Work Order Dibuat",
				"icon":        "factory",
				"date":        "2026-06-17",
				"actor":       "PPIC — WO-2026-0851",
				"details":     "WO dibuat untuk 200 unit. Routing: Machining → Assembly → Finishing.",
				"status":      "done",
				"attachments": []string{"WO-2026-0851"},
			},
			{
				"step":        4,
				"stage":       "Proses Produksi",
				"icon":        "cpu",
				"date":        "2026-06-18 s/d 2026-06-21",
				"actor":       "Produksi — Work Center A1, A2",
				"details":     "Machining selesai 100%. Assembly selesai 100%. Finishing selesai 100%.",
				"status":      "done",
				"attachments": []string{"WO-2026-0851"},
			},
			{
				"step":        5,
				"stage":       "Final Quality Check (FQC)",
				"icon":        "check-circle",
				"date":        "2026-06-22",
				"actor":       "QC Team — INS-0235",
				"details":     "FQC passed. 198 unit lolos, 2 unit scrap. Yield 99%. Lot disetujui.",
				"status":      "done",
				"attachments": []string{"INS-0235"},
			},
			{
				"step":        6,
				"stage":       "Masuk Gudang Barang Jadi",
				"icon":        "warehouse",
				"date":        "2026-06-22",
				"actor":       "Gudang — Stock IN",
				"details":     "198 unit masuk gudang barang jadi. Lot ID: LOT-2026-0441.",
				"status":      "done",
				"attachments": []string{},
			},
			{
				"step":        7,
				"stage":       "Delivery ke Customer",
				"icon":        "truck",
				"date":        "2026-06-25",
				"actor":       "Logistik — DO-2201",
				"details":     "200 unit dikirim ke PT Maju Bersama (SO-1084). Ekspedisi: JNE Express. No Resi: JNE1234567890.",
				"status":      "done",
				"attachments": []string{"DO-2201", "SO-1084"},
			},
		},
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": trace})
}

// ─── Supplier Scorecard ───────────────────────────────────────────────────────

func GetSupplierScorecard(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": buildSupplierScorecard()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildSupplierScorecard()})
}

func buildSupplierScorecard() gin.H {
	return gin.H{
		"vendors": []gin.H{
			{
				"id": "VND-001", "name": "CV Sukses Jaya", "category": "Bahan Baku",
				"score": 91, "grade": "A",
				"metrics": gin.H{
					"on_time_delivery": 94.2,
					"quality_rate":     98.5,
					"price_compliance": 96.0,
					"responsiveness":   90.0,
				},
				"total_pos": 31, "total_value": 1240000000,
				"trend": []gin.H{
					{"month": "Jan", "score": 88},
					{"month": "Feb", "score": 89},
					{"month": "Mar", "score": 90},
					{"month": "Apr", "score": 92},
					{"month": "Mei", "score": 93},
					{"month": "Jun", "score": 91},
				},
				"issues": []string{},
			},
			{
				"id": "VND-002", "name": "PT Bahan Prima", "category": "Material & Spare Part",
				"score": 83, "grade": "B",
				"metrics": gin.H{
					"on_time_delivery": 85.7,
					"quality_rate":     95.2,
					"price_compliance": 88.0,
					"responsiveness":   82.0,
				},
				"total_pos": 24, "total_value": 780000000,
				"trend": []gin.H{
					{"month": "Jan", "score": 82},
					{"month": "Feb", "score": 84},
					{"month": "Mar", "score": 80},
					{"month": "Apr", "score": 83},
					{"month": "Mei", "score": 85},
					{"month": "Jun", "score": 83},
				},
				"issues": []string{"Keterlambatan 2× di Mei"},
			},
			{
				"id": "VND-003", "name": "UD Karya Mandiri", "category": "Komponen",
				"score": 62, "grade": "C",
				"metrics": gin.H{
					"on_time_delivery": 68.4,
					"quality_rate":     88.0,
					"price_compliance": 72.0,
					"responsiveness":   60.0,
				},
				"total_pos": 15, "total_value": 320000000,
				"trend": []gin.H{
					{"month": "Jan", "score": 70},
					{"month": "Feb", "score": 68},
					{"month": "Mar", "score": 64},
					{"month": "Apr", "score": 65},
					{"month": "Mei", "score": 60},
					{"month": "Jun", "score": 62},
				},
				"issues": []string{"OTD turun", "Kualitas NCR 2 kali", "Harga tidak sesuai kontrak"},
			},
			{
				"id": "VND-004", "name": "PT Logam Berkualitas", "category": "Logam & Plat",
				"score": 78, "grade": "B",
				"metrics": gin.H{
					"on_time_delivery": 80.0,
					"quality_rate":     96.0,
					"price_compliance": 82.0,
					"responsiveness":   74.0,
				},
				"total_pos": 18, "total_value": 540000000,
				"trend": []gin.H{
					{"month": "Jan", "score": 75},
					{"month": "Feb", "score": 76},
					{"month": "Mar", "score": 78},
					{"month": "Apr", "score": 79},
					{"month": "Mei", "score": 77},
					{"month": "Jun", "score": 78},
				},
				"issues": []string{"Lead time perlu dipersingkat"},
			},
		},
	}
}

// ─── Supply Chain Risk ────────────────────────────────────────────────────────

func GetSupplyChainRisk(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": buildSCRisk()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": buildSCRisk()})
}

func buildSCRisk() gin.H {
	return gin.H{
		"risk_score": 38,
		"risk_level": "medium",
		"categories": []gin.H{
			{"category": "Ketergantungan Supplier", "score": 55, "level": "medium", "desc": "3 dari 5 bahan baku kritikal hanya dari 1 supplier"},
			{"category": "Lead Time Risiko", "score": 40, "level": "medium", "desc": "UD Karya Mandiri rata-rata terlambat 2.3 hari"},
			{"category": "Stok Buffer", "score": 25, "level": "low", "desc": "Safety stock 85% item terpenuhi, 3 item mendekati minimum"},
			{"category": "Fluktuasi Harga", "score": 45, "level": "medium", "desc": "Bahan baku logam naik 8% dalam 3 bulan terakhir"},
			{"category": "Geopolitik & Logistik", "score": 20, "level": "low", "desc": "Jalur pengiriman dalam negeri stabil"},
		},
		"risk_items": []gin.H{
			{"id": "RSK-001", "item": "Komponen V (UD Karya Mandiri)", "type": "supplier_risk", "severity": "high", "probability": "medium", "mitigation": "Cari alternatif supplier atau stok 30 hari", "deadline": "2026-07-15"},
			{"id": "RSK-002", "item": "Bahan Baku X — stok menipis", "type": "stock_risk", "severity": "medium", "probability": "high", "mitigation": "Percepat PO ke CV Sukses Jaya", "deadline": "2026-07-05"},
			{"id": "RSK-003", "item": "Kenaikan harga logam", "type": "price_risk", "severity": "medium", "probability": "high", "mitigation": "Negosiasi kontrak jangka panjang / hedging", "deadline": "2026-08-01"},
			{"id": "RSK-004", "item": "Lead time Frame E-11 memanjang", "type": "lead_time_risk", "severity": "low", "probability": "medium", "mitigation": "Buffer stock 2 minggu ditambah", "deadline": "2026-07-20"},
		},
		"monthly_risk_trend": []gin.H{
			{"month": "Jan", "score": 32},
			{"month": "Feb", "score": 35},
			{"month": "Mar", "score": 42},
			{"month": "Apr", "score": 45},
			{"month": "Mei", "score": 41},
			{"month": "Jun", "score": 38},
		},
	}
}
