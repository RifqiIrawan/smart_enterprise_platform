package handlers

import (
	"fmt"
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Import / Export ──────────────────────────────────────────────────────────

var importTemplates = []gin.H{
	{
		"type": "products", "name": "Master Produk", "icon": "package",
		"description": "Kode, nama, satuan, harga jual/beli, kategori, stok minimum",
		"fields": []string{"kode_produk", "nama_produk", "satuan", "harga_jual", "harga_beli", "kategori", "stok_min"},
		"sample_count": 5,
	},
	{
		"type": "employees", "name": "Master Karyawan", "icon": "users",
		"description": "NIK, nama lengkap, departemen, jabatan, tanggal masuk, gaji pokok, PTKP",
		"fields": []string{"nik", "nama", "departemen", "jabatan", "tanggal_masuk", "gaji_pokok", "ptkp", "npwp"},
		"sample_count": 3,
	},
	{
		"type": "coa", "name": "Chart of Accounts", "icon": "book-open",
		"description": "Kode akun, nama akun, tipe, sub-tipe, parent akun, is_header",
		"fields": []string{"kode_akun", "nama_akun", "tipe", "sub_tipe", "parent_kode", "is_header"},
		"sample_count": 10,
	},
	{
		"type": "opening_stock", "name": "Stok Awal", "icon": "warehouse",
		"description": "Kode produk, nama produk, warehouse, qty, harga rata-rata",
		"fields": []string{"kode_produk", "nama_produk", "warehouse", "qty", "harga_rata"},
		"sample_count": 8,
	},
	{
		"type": "journals", "name": "Transaksi Historis", "icon": "file-text",
		"description": "Import jurnal umum dari sistem lama: tanggal, no jurnal, keterangan, akun, debit, kredit",
		"fields": []string{"tanggal", "no_jurnal", "keterangan", "kode_akun", "nama_akun", "debit", "kredit"},
		"sample_count": 4,
	},
}

var templateCSV = map[string]string{
	"products":      "kode_produk,nama_produk,satuan,harga_jual,harga_beli,kategori,stok_min\nPRD-001,Mesin Presisi A-100,unit,350000000,280000000,Mesin,1\nPRD-002,Spare Part Kit B,set,3500000,2800000,Spare Part,5\nPRD-003,Baja Plat 2mm,kg,18500,15000,Bahan Baku,1000\nPRD-004,Elektroda Las,kg,45000,36000,Consumable,50\nPRD-005,Tooling Set XL,set,12000000,9500000,Tooling,2",
	"employees":     "nik,nama,departemen,jabatan,tanggal_masuk,gaji_pokok,ptkp,npwp\nEMP-0001,Ahmad Fauzi,Produksi,Supervisor,2020-01-15,8000000,K/2,86.420.135.7-123.000\nEMP-0002,Rina Wijaya,Marketing,Staff,2021-03-01,5500000,TK/0,\nEMP-0003,Budi Santoso,Operasional,Teknisi,2019-06-10,6000000,K/1,",
	"coa":           "kode_akun,nama_akun,tipe,sub_tipe,parent_kode,is_header\n1,ASET,asset,,,true\n1-1,Aset Lancar,asset,current,1,true\n1-1100,Kas & Bank,asset,current,1-1,false\n1-1200,Piutang Usaha,asset,current,1-1,false\n1-1300,Persediaan,asset,current,1-1,false",
	"opening_stock": "kode_produk,nama_produk,warehouse,qty,harga_rata\nPRD-001,Mesin Presisi A-100,Gudang Utama,3,280000000\nPRD-002,Spare Part Kit B,Gudang Utama,25,2800000\nPRD-003,Baja Plat 2mm,Gudang Bahan Baku,5000,15000\nPRD-004,Elektroda Las,Gudang Bahan Baku,200,36000",
	"journals":      "tanggal,no_jurnal,keterangan,kode_akun,nama_akun,debit,kredit\n2026-01-01,JE-OPEN-001,Saldo awal kas,1-1100,Kas & Bank,157000000,0\n2026-01-01,JE-OPEN-001,Saldo awal modal,3-1000,Modal Disetor,0,500000000\n2026-01-01,JE-OPEN-002,Aset tetap awal,1-2100,Aset Tetap,450000000,0",
}

func GetImportTemplates(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"value": importTemplates, "count": len(importTemplates)})
}

func DownloadTemplate(c *gin.Context) {
	t := c.Param("type")
	csv, ok := templateCSV[t]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template tidak ditemukan"})
		return
	}
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"template_import_%s.csv\"", t))
	c.String(http.StatusOK, csv)
}

func PreviewImport(c *gin.Context) {
	if database.DB == nil {
		preview := []gin.H{
			{"row": 2, "status": "valid", "data": gin.H{"kode_produk": "PRD-101", "nama_produk": "Mesin Baru X-500", "satuan": "unit", "harga_jual": "450000000", "kategori": "Mesin"}},
			{"row": 3, "status": "valid", "data": gin.H{"kode_produk": "PRD-102", "nama_produk": "Spare Part Y", "satuan": "set", "harga_jual": "5000000", "kategori": "Spare Part"}},
			{"row": 4, "status": "error", "error": "Kode produk PRD-001 sudah ada di sistem", "data": gin.H{"kode_produk": "PRD-001", "nama_produk": "Mesin Lama (duplikat)", "satuan": "unit", "harga_jual": "100000000", "kategori": "Mesin"}},
			{"row": 5, "status": "valid", "data": gin.H{"kode_produk": "PRD-103", "nama_produk": "Komponen Z", "satuan": "pcs", "harga_jual": "250000", "kategori": "Komponen"}},
			{"row": 6, "status": "error", "error": "Harga jual tidak valid (bukan angka)", "data": gin.H{"kode_produk": "PRD-104", "nama_produk": "Baut & Mur", "satuan": "kg", "harga_jual": "N/A", "kategori": "Consumable"}},
			{"row": 7, "status": "valid", "data": gin.H{"kode_produk": "PRD-105", "nama_produk": "Pelumas Industri", "satuan": "liter", "harga_jual": "85000", "kategori": "Consumable"}},
			{"row": 8, "status": "valid", "data": gin.H{"kode_produk": "PRD-106", "nama_produk": "Filter Udara", "satuan": "pcs", "harga_jual": "450000", "kategori": "Spare Part"}},
			{"row": 9, "status": "warning", "error": "Stok minimum tidak diisi (default: 0)", "data": gin.H{"kode_produk": "PRD-107", "nama_produk": "Gasket Set", "satuan": "set", "harga_jual": "175000", "kategori": "Spare Part"}},
		}
		c.JSON(http.StatusOK, gin.H{
			"total_rows":  8,
			"valid_rows":  5,
			"error_rows":  2,
			"warning_rows": 1,
			"preview":     preview,
			"import_type": c.Query("type"),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"total_rows": 0, "valid_rows": 0, "error_rows": 0, "preview": []gin.H{}})
}

func ExecuteImport(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"imported": 5,
			"skipped":  2,
			"warnings": 1,
			"message":  "Import berhasil: 5 baris diimport, 2 baris dilewati (error), 1 baris dengan peringatan",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"imported": 0, "skipped": 0, "message": "Tidak ada data"})
}

func GetImportHistory(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		history := []gin.H{
			{"id": "ih1", "import_type": "products", "type_label": "Master Produk", "total_rows": 8, "imported": 5, "skipped": 2, "warnings": 1, "status": "partial", "created_by": "Admin", "created_at": "2026-06-28T14:32:00Z"},
			{"id": "ih2", "import_type": "employees", "type_label": "Master Karyawan", "total_rows": 12, "imported": 12, "skipped": 0, "warnings": 0, "status": "success", "created_by": "Admin", "created_at": "2026-06-20T09:15:00Z"},
			{"id": "ih3", "import_type": "opening_stock", "type_label": "Stok Awal", "total_rows": 50, "imported": 47, "skipped": 3, "warnings": 0, "status": "partial", "created_by": "Admin", "created_at": "2026-06-01T08:00:00Z"},
			{"id": "ih4", "import_type": "coa", "type_label": "Chart of Accounts", "total_rows": 45, "imported": 45, "skipped": 0, "warnings": 0, "status": "success", "created_by": "Admin", "created_at": "2026-05-15T10:00:00Z"},
		}
		rows, total := p.ApplyToSlice(history, []string{"type_label", "created_by", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "count": 0})
}

func ExportData(c *gin.Context) {
	t := c.Param("type")
	now := time.Now().Format("20060102")
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"export_%s_%s.csv\"", t, now))
	c.String(http.StatusOK, fmt.Sprintf("# Export %s — %s\n# Generated by Smart Enterprise Platform\nid,name,status,value\n1,Item A,active,100\n2,Item B,active,200\n3,Item C,inactive,0", t, now))
}

// ─── API Keys ───���─────────────────────────────────────────────────────────────

func GetAPIKeys(c *gin.Context) {
	if database.DB == nil {
		keys := []gin.H{
			{
				"id": "ak1", "name": "Integration Tokopedia", "key_masked": "sep_live_****3a7f1c2d",
				"permissions": []string{"products.read", "inventory.read", "orders.write"},
				"created_at": "2026-06-01", "last_used": "2026-06-28", "calls_today": 145,
				"calls_month": 3280, "status": "active",
			},
			{
				"id": "ak2", "name": "BI Dashboard PowerBI", "key_masked": "sep_live_****8b2e5f9a",
				"permissions": []string{"reports.read", "analytics.read", "finance.read"},
				"created_at": "2026-06-15", "last_used": "2026-06-29", "calls_today": 24,
				"calls_month": 456, "status": "active",
			},
			{
				"id": "ak3", "name": "Webhook Processor", "key_masked": "sep_live_****4c9d1e6b",
				"permissions": []string{"webhooks.read"},
				"created_at": "2026-05-01", "last_used": "2026-06-10", "calls_today": 0,
				"calls_month": 12, "status": "revoked",
			},
		}
		c.JSON(http.StatusOK, gin.H{"value": keys, "count": len(keys)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "count": 0})
}

func CreateAPIKey(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{
			"id":      "ak_new",
			"key":     fmt.Sprintf("sep_live_%x_DEMO_ONLY", time.Now().UnixNano()),
			"message": "API Key berhasil dibuat. Simpan key ini — tidak akan ditampilkan lagi!",
		})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "API Key dibuat"})
}

func RevokeAPIKey(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"id": id, "status": "revoked", "message": "API Key berhasil direvoke"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Direvoke"})
}

func GetAPIUsageLogs(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		logs := []gin.H{
			{"id": "ul1", "api_key_name": "Integration Tokopedia", "endpoint": "GET /api/v1/warehouse/inventory", "status": 200, "latency_ms": 45, "ip": "103.22.44.55", "timestamp": "2026-06-29T08:34:12Z"},
			{"id": "ul2", "api_key_name": "Integration Tokopedia", "endpoint": "GET /api/v1/warehouse/inventory", "status": 200, "latency_ms": 38, "ip": "103.22.44.55", "timestamp": "2026-06-29T08:31:05Z"},
			{"id": "ul3", "api_key_name": "BI Dashboard PowerBI", "endpoint": "GET /api/v1/analytics/summary", "status": 200, "latency_ms": 123, "ip": "140.82.45.12", "timestamp": "2026-06-29T08:15:00Z"},
			{"id": "ul4", "api_key_name": "Integration Tokopedia", "endpoint": "POST /api/v1/sales/orders", "status": 201, "latency_ms": 89, "ip": "103.22.44.55", "timestamp": "2026-06-29T07:58:33Z"},
			{"id": "ul5", "api_key_name": "BI Dashboard PowerBI", "endpoint": "GET /api/v1/finance/cash-position", "status": 200, "latency_ms": 67, "ip": "140.82.45.12", "timestamp": "2026-06-29T07:00:00Z"},
			{"id": "ul6", "api_key_name": "Integration Tokopedia", "endpoint": "GET /api/v1/warehouse/inventory", "status": 429, "latency_ms": 2, "ip": "103.22.44.55", "timestamp": "2026-06-28T23:45:10Z"},
		}
		rows, total := p.ApplyToSlice(logs, []string{"api_key_name", "endpoint", "ip"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "count": 0})
}

// ─── Webhooks ──���──────────────────────────────────────────────────────────────

var webhookEvents = []string{
	"so.created", "so.approved", "so.shipped",
	"invoice.created", "invoice.paid",
	"po.created", "po.approved",
	"stock.low", "stock.stockout",
	"payment.received", "payment.sent",
}

func GetWebhooks(c *gin.Context) {
	if database.DB == nil {
		webhooks := []gin.H{
			{
				"id": "wh1", "name": "Notifikasi SO Baru ke ERP Cabang",
				"url": "https://erp-cabang.example.com/webhook/so",
				"events": []string{"so.created", "so.approved"},
				"status": "active", "success_count": 142, "fail_count": 2,
				"last_triggered": "2026-06-28T15:30:00Z", "created_at": "2026-05-01",
			},
			{
				"id": "wh2", "name": "Payment Alert ke Telegram Bot",
				"url": "https://api.telegram.org/bot123456/sendMessage",
				"events": []string{"invoice.paid", "payment.received"},
				"status": "active", "success_count": 38, "fail_count": 0,
				"last_triggered": "2026-06-25T10:12:00Z", "created_at": "2026-05-15",
			},
			{
				"id": "wh3", "name": "Stock Alert Monitoring",
				"url": "https://monitoring.example.com/hooks/stock",
				"events": []string{"stock.low", "stock.stockout"},
				"status": "paused", "success_count": 15, "fail_count": 5,
				"last_triggered": "2026-06-10T09:00:00Z", "created_at": "2026-06-01",
			},
		}
		c.JSON(http.StatusOK, gin.H{"value": webhooks, "count": len(webhooks)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "count": 0})
}

func CreateWebhook(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"id": "wh_new", "message": "Webhook berhasil dibuat"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Webhook dibuat"})
}

func UpdateWebhook(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"id": id, "message": "Webhook diperbarui"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Diperbarui"})
}

func DeleteWebhook(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"id": id, "message": "Webhook dihapus"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Dihapus"})
}

func GetWebhookLogs(c *gin.Context) {
	p := odata.Parse(c)
	id := c.Param("id")
	if database.DB == nil {
		logs := []gin.H{
			{"id": "wl1", "webhook_id": id, "event": "so.created", "status": "success", "http_status": 200, "payload_size": 1240, "latency_ms": 234, "timestamp": "2026-06-28T15:30:00Z"},
			{"id": "wl2", "webhook_id": id, "event": "so.approved", "status": "success", "http_status": 200, "payload_size": 980, "latency_ms": 189, "timestamp": "2026-06-28T14:15:00Z"},
			{"id": "wl3", "webhook_id": id, "event": "so.created", "status": "failed", "http_status": 500, "payload_size": 1100, "latency_ms": 5001, "timestamp": "2026-06-27T11:20:00Z", "error": "Connection timeout"},
			{"id": "wl4", "webhook_id": id, "event": "so.created", "status": "success", "http_status": 200, "payload_size": 1180, "latency_ms": 145, "timestamp": "2026-06-26T09:45:00Z"},
		}
		rows, total := p.ApplyToSlice(logs, []string{"event", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "count": 0})
}

func GetWebhookEvents(c *gin.Context) {
	events := make([]gin.H, len(webhookEvents))
	for i, e := range webhookEvents {
		events[i] = gin.H{"value": e, "label": e}
	}
	c.JSON(http.StatusOK, gin.H{"value": events})
}
