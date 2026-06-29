package handlers

import (
	"fmt"
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Marketplace Channels ─────────────────────────────────────────────────────

func GetMarketplaceChannels(c *gin.Context) {
	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT code, name, type, store_name, status, products_listed, orders_today,
			       revenue_month, sync_status,
			       COALESCE(TO_CHAR(last_sync,'YYYY-MM-DD HH24:MI'),'-') AS last_sync
			FROM marketplace_channels
			WHERE company_id = (SELECT id FROM companies LIMIT 1)
			ORDER BY code`)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			for rows.Next() {
				var code, name, tp, storeName, status, syncStatus, lastSync string
				var prodListed, ordersToday int
				var revMonth int64
				if rows.Scan(&code, &name, &tp, &storeName, &status, &prodListed, &ordersToday, &revMonth, &syncStatus, &lastSync) == nil {
					result = append(result, gin.H{
						"id": code, "name": name, "type": tp, "store_name": storeName,
						"status": status, "products_listed": prodListed, "orders_today": ordersToday,
						"revenue_month": revMonth, "sync_status": syncStatus, "last_sync": lastSync,
					})
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "value": result})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "value": demoChannels})
}

var demoChannels = []gin.H{
	{"id": "CH-001", "name": "Tokopedia", "type": "tokopedia", "store_name": "SEP Official Store", "status": "active", "products_listed": 48, "orders_today": 12, "revenue_month": 87500000, "sync_status": "synced", "last_sync": "2026-06-29 08:30"},
	{"id": "CH-002", "name": "Shopee", "type": "shopee", "store_name": "SEP.id", "status": "active", "products_listed": 52, "orders_today": 18, "revenue_month": 112000000, "sync_status": "synced", "last_sync": "2026-06-29 08:35"},
	{"id": "CH-003", "name": "Lazada", "type": "lazada", "store_name": "SEP Enterprise", "status": "active", "products_listed": 31, "orders_today": 5, "revenue_month": 43200000, "sync_status": "synced", "last_sync": "2026-06-29 07:00"},
	{"id": "CH-004", "name": "Website B2B", "type": "woocommerce", "store_name": "b2b.sep.id", "status": "active", "products_listed": 120, "orders_today": 8, "revenue_month": 235000000, "sync_status": "synced", "last_sync": "2026-06-29 08:45"},
	{"id": "CH-005", "name": "Bukalapak", "type": "bukalapak", "store_name": "SEP Store BL", "status": "inactive", "products_listed": 0, "orders_today": 0, "revenue_month": 0, "sync_status": "disconnected", "last_sync": "-"},
}

func GetMarketplaceSummary(c *gin.Context) {
	var totalOrders int
	var totalRevenue int64
	var activeChannels int

	if database.DB != nil {
		database.DB.QueryRow(`SELECT COUNT(*) FROM marketplace_orders WHERE order_date = CURRENT_DATE AND company_id=(SELECT id FROM companies LIMIT 1)`).Scan(&totalOrders)
		database.DB.QueryRow(`SELECT COALESCE(SUM(revenue_month),0) FROM marketplace_channels WHERE status='active' AND company_id=(SELECT id FROM companies LIMIT 1)`).Scan(&totalRevenue)
		database.DB.QueryRow(`SELECT COUNT(*) FROM marketplace_channels WHERE status='active' AND company_id=(SELECT id FROM companies LIMIT 1)`).Scan(&activeChannels)
	} else {
		totalOrders = 43
		totalRevenue = 477700000
		activeChannels = 4
	}

	summary := gin.H{
		"total_orders_today":  totalOrders,
		"total_revenue_month": totalRevenue,
		"active_channels":     activeChannels,
		"total_products":      251,
		"pending_fulfillment": 11,
		"channel_breakdown": []gin.H{
			{"channel": "Shopee", "orders": 18, "revenue": 112000000, "color": "#ee4d2d"},
			{"channel": "Tokopedia", "orders": 12, "revenue": 87500000, "color": "#00b14f"},
			{"channel": "Website B2B", "orders": 8, "revenue": 235000000, "color": "#6366f1"},
			{"channel": "Lazada", "orders": 5, "revenue": 43200000, "color": "#0f1111"},
		},
		"daily_trend": []gin.H{
			{"date": "24/6", "tokopedia": 9, "shopee": 15, "lazada": 4, "b2b": 6},
			{"date": "25/6", "tokopedia": 11, "shopee": 17, "lazada": 6, "b2b": 7},
			{"date": "26/6", "tokopedia": 10, "shopee": 14, "lazada": 5, "b2b": 9},
			{"date": "27/6", "tokopedia": 13, "shopee": 20, "lazada": 7, "b2b": 8},
			{"date": "28/6", "tokopedia": 14, "shopee": 19, "lazada": 6, "b2b": 10},
			{"date": "29/6", "tokopedia": 12, "shopee": 18, "lazada": 5, "b2b": 8},
		},
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": summary})
}

// ─── Marketplace Orders ───────────────────────────────────────────────────────

func GetMarketplaceOrders(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT code, channel_name, channel_type, external_id,
			       TO_CHAR(order_date,'YYYY-MM-DD'), customer_name, product_summary, total, status, so_ref
			FROM marketplace_orders
			WHERE company_id=(SELECT id FROM companies LIMIT 1)
			ORDER BY order_date DESC, code DESC`)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			for rows.Next() {
				var code, channel, chType, extID, date, cust, prod, status, soRef string
				var total int64
				if rows.Scan(&code, &channel, &chType, &extID, &date, &cust, &prod, &total, &status, &soRef) == nil {
					result = append(result, gin.H{
						"id": code, "channel": channel, "channel_type": chType, "external_id": extID,
						"date": date, "customer": cust, "product_summary": prod,
						"total": total, "status": status, "so_ref": soRef,
					})
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			filtered, total := p.ApplyToSlice(result, []string{"id", "channel", "external_id", "customer", "product_summary", "status"})
			c.JSON(http.StatusOK, odata.Response(filtered, total))
			return
		}
	}
	rows, total := p.ApplyToSlice(demoMktOrders, []string{"id", "channel", "external_id", "customer", "product_summary", "status"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

var demoMktOrders = []gin.H{
	{"id": "MO-5501", "channel": "Shopee", "channel_type": "shopee", "external_id": "SHP-8821947", "date": "2026-06-29", "customer": "Budi Santoso", "product_summary": "Komponen A-12 × 2", "total": 450000, "status": "pending", "so_ref": ""},
	{"id": "MO-5502", "channel": "Tokopedia", "channel_type": "tokopedia", "external_id": "TKP-4417823", "date": "2026-06-29", "customer": "Siti Rahayu", "product_summary": "Part D-07 × 3", "total": 720000, "status": "pending", "so_ref": ""},
	{"id": "MO-5500", "channel": "Shopee", "channel_type": "shopee", "external_id": "SHP-8821901", "date": "2026-06-29", "customer": "Ahmad Fauzi", "product_summary": "Assembly B-05 × 1", "total": 1250000, "status": "fulfilled", "so_ref": "SO-1091"},
	{"id": "MO-5499", "channel": "Website B2B", "channel_type": "woocommerce", "external_id": "WC-00891", "date": "2026-06-28", "customer": "CV Maju Jaya", "product_summary": "Frame E-11 × 10, Komponen A-12 × 5", "total": 4800000, "status": "fulfilled", "so_ref": "SO-1090"},
	{"id": "MO-5498", "channel": "Lazada", "channel_type": "lazada", "external_id": "LZD-3302871", "date": "2026-06-28", "customer": "Dewi Kusuma", "product_summary": "Komponen C-33 × 4", "total": 620000, "status": "fulfilled", "so_ref": "SO-1089"},
	{"id": "MO-5497", "channel": "Tokopedia", "channel_type": "tokopedia", "external_id": "TKP-4417800", "date": "2026-06-28", "customer": "Rudi Hermawan", "product_summary": "Part D-07 × 5", "total": 1200000, "status": "pending", "so_ref": ""},
	{"id": "MO-5496", "channel": "Shopee", "channel_type": "shopee", "external_id": "SHP-8821855", "date": "2026-06-28", "customer": "Rina Oktavia", "product_summary": "Assembly B-05 × 2", "total": 2500000, "status": "pending", "so_ref": ""},
	{"id": "MO-5495", "channel": "Website B2B", "channel_type": "woocommerce", "external_id": "WC-00888", "date": "2026-06-27", "customer": "PT Kriya Mandiri", "product_summary": "Komponen A-12 × 20", "total": 4500000, "status": "cancelled", "so_ref": ""},
}

func FulfillMarketplaceOrder(c *gin.Context) {
	id := c.Param("id")
	soRef := fmt.Sprintf("SO-%04d", time.Now().UnixMilli()%10000)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Order %s berhasil dibuat SO %s", id, soRef),
		"so_ref":  soRef,
	})
}

// ─── Product Listings ─────────────────────────────────────────────────────────

func GetProductListings(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT sku, name, channels, price, stock, status,
			       TO_CHAR(last_sync,'YYYY-MM-DD HH24:MI') AS last_sync
			FROM marketplace_listings
			WHERE company_id=(SELECT id FROM companies LIMIT 1)
			ORDER BY sku`)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			for rows.Next() {
				var sku, name, status, lastSync string
				var channels []string
				var price int64
				var stock int
				if rows.Scan(&sku, &name, &channels, &price, &stock, &status, &lastSync) == nil {
					result = append(result, gin.H{
						"id": "LST-" + sku, "sku": sku, "name": name, "channels": channels,
						"price": price, "stock": stock, "status": status, "last_sync": lastSync,
					})
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			filtered, total := p.ApplyToSlice(result, []string{"sku", "name", "status"})
			c.JSON(http.StatusOK, odata.Response(filtered, total))
			return
		}
	}
	rows, total := p.ApplyToSlice(demoListings, []string{"sku", "name", "status"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

var demoListings = []gin.H{
	{"id": "LST-001", "sku": "KOM-A12", "name": "Komponen A-12", "channels": []string{"tokopedia", "shopee", "lazada"}, "price": 225000, "stock": 340, "status": "active", "last_sync": "2026-06-29 08:30"},
	{"id": "LST-002", "sku": "PRT-D07", "name": "Part D-07", "channels": []string{"tokopedia", "shopee"}, "price": 240000, "stock": 220, "status": "active", "last_sync": "2026-06-29 08:30"},
	{"id": "LST-003", "sku": "ASM-B05", "name": "Assembly B-05", "channels": []string{"shopee", "woocommerce"}, "price": 1250000, "stock": 85, "status": "active", "last_sync": "2026-06-29 08:35"},
	{"id": "LST-004", "sku": "FRM-E11", "name": "Frame E-11", "channels": []string{"woocommerce"}, "price": 380000, "stock": 112, "status": "active", "last_sync": "2026-06-29 08:45"},
	{"id": "LST-005", "sku": "KOM-C33", "name": "Komponen C-33", "channels": []string{"tokopedia", "shopee", "lazada", "woocommerce"}, "price": 155000, "stock": 430, "status": "active", "last_sync": "2026-06-29 08:30"},
	{"id": "LST-006", "sku": "SPR-X01", "name": "Spare Part X-01", "channels": []string{"shopee"}, "price": 89000, "stock": 0, "status": "out_of_stock", "last_sync": "2026-06-29 07:00"},
}

func SyncProductListing(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Produk berhasil disinkronkan ke semua channel",
		"synced_at": time.Now().Format("2006-01-02 15:04"),
	})
}

// ─── IoT Devices ─────────────────────────────────────────────────────────────

func GetIoTDevices(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT code, name, type, location, status,
			       COALESCE(TO_CHAR(last_seen,'YYYY-MM-DD HH24:MI'),'-'),
			       battery, firmware, ip_address, protocol
			FROM iot_devices
			WHERE company_id=(SELECT id FROM companies LIMIT 1) AND is_active=TRUE
			ORDER BY code`)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			for rows.Next() {
				var code, name, tp, loc, status, lastSeen, fw, ip, proto string
				var battery int
				if rows.Scan(&code, &name, &tp, &loc, &status, &lastSeen, &battery, &fw, &ip, &proto) == nil {
					result = append(result, gin.H{
						"id": code, "name": name, "type": tp, "location": loc, "status": status,
						"last_seen": lastSeen, "battery": battery, "firmware": fw, "ip": ip, "protocol": proto,
					})
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			filtered, total := p.ApplyToSlice(result, []string{"id", "name", "type", "location", "status", "protocol"})
			c.JSON(http.StatusOK, odata.Response(filtered, total))
			return
		}
	}
	rows, total := p.ApplyToSlice(demoIoTDevices, []string{"id", "name", "type", "location", "status", "protocol"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

var demoIoTDevices = []gin.H{
	{"id": "DEV-001", "name": "Sensor Suhu Mesin A1", "type": "temperature", "location": "Lantai Produksi 1", "status": "online", "last_seen": "2026-06-29 09:45", "battery": 87, "firmware": "v2.3.1", "ip": "192.168.10.11", "protocol": "MQTT"},
	{"id": "DEV-002", "name": "Sensor Getaran Mesin A2", "type": "vibration", "location": "Lantai Produksi 1", "status": "online", "last_seen": "2026-06-29 09:45", "battery": 72, "firmware": "v2.3.1", "ip": "192.168.10.12", "protocol": "MQTT"},
	{"id": "DEV-003", "name": "Sensor Kelembaban Gudang", "type": "humidity", "location": "Gudang Bahan Baku", "status": "online", "last_seen": "2026-06-29 09:44", "battery": 91, "firmware": "v2.1.0", "ip": "192.168.10.20", "protocol": "MQTT"},
	{"id": "DEV-004", "name": "Smart Meter Listrik Panel A", "type": "energy", "location": "Panel Listrik Utama", "status": "online", "last_seen": "2026-06-29 09:45", "battery": -1, "firmware": "v3.0.2", "ip": "192.168.10.30", "protocol": "Modbus"},
	{"id": "DEV-005", "name": "Kamera QC Line 2", "type": "camera", "location": "Quality Control Line 2", "status": "online", "last_seen": "2026-06-29 09:45", "battery": -1, "firmware": "v1.8.4", "ip": "192.168.10.41", "protocol": "RTSP"},
	{"id": "DEV-006", "name": "GPS Forklift FL-01", "type": "gps", "location": "Area Gudang", "status": "online", "last_seen": "2026-06-29 09:43", "battery": 65, "firmware": "v1.5.0", "ip": "192.168.10.51", "protocol": "LTE"},
	{"id": "DEV-007", "name": "Sensor Tekanan Kompresor", "type": "pressure", "location": "Ruang Kompresor", "status": "warning", "last_seen": "2026-06-29 09:40", "battery": 45, "firmware": "v2.3.1", "ip": "192.168.10.13", "protocol": "MQTT"},
	{"id": "DEV-008", "name": "Sensor CO2 Ruang Server", "type": "air_quality", "location": "Server Room", "status": "offline", "last_seen": "2026-06-29 06:12", "battery": 12, "firmware": "v2.0.3", "ip": "192.168.10.61", "protocol": "Zigbee"},
}

func CreateIoTDevice(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	body["id"] = fmt.Sprintf("DEV-%03d", time.Now().UnixMilli()%1000)
	body["status"] = "offline"
	body["last_seen"] = "-"
	body["battery"] = 100
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": body, "message": "Device berhasil didaftarkan"})
}

func UpdateIoTDevice(c *gin.Context) {
	var body map[string]interface{}
	c.ShouldBindJSON(&body)
	body["id"] = c.Param("id")
	c.JSON(http.StatusOK, gin.H{"success": true, "data": body})
}

func DeleteIoTDevice(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Device dihapus"})
}

// ─── IoT Live Readings ────────────────────────────────────────────────────────

func GetIoTReadings(c *gin.Context) {
	now := time.Now()
	readings := gin.H{
		"timestamp": now.Format("2006-01-02 15:04:05"),
		"sensors": []gin.H{
			{"id": "DEV-001", "name": "Suhu Mesin A1", "type": "temperature", "value": 72.4 + float64(now.Second()%5)*0.3, "unit": "°C", "status": "normal", "min": 20, "max": 90, "threshold_warning": 80, "threshold_critical": 85},
			{"id": "DEV-002", "name": "Getaran Mesin A2", "type": "vibration", "value": 3.2 + float64(now.Second()%3)*0.1, "unit": "mm/s", "status": "normal", "min": 0, "max": 10, "threshold_warning": 7, "threshold_critical": 9},
			{"id": "DEV-003", "name": "Kelembaban Gudang", "type": "humidity", "value": 65.1, "unit": "%RH", "status": "normal", "min": 0, "max": 100, "threshold_warning": 80, "threshold_critical": 90},
			{"id": "DEV-004", "name": "Daya Listrik", "type": "energy", "value": 148.7, "unit": "kW", "status": "normal", "min": 0, "max": 300, "threshold_warning": 250, "threshold_critical": 280},
			{"id": "DEV-007", "name": "Tekanan Kompresor", "type": "pressure", "value": 8.9, "unit": "bar", "status": "warning", "min": 0, "max": 12, "threshold_warning": 8.5, "threshold_critical": 10},
		},
		"trend": buildIoTTrend(now),
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": readings})
}

func buildIoTTrend(now time.Time) []gin.H {
	result := []gin.H{}
	for i := 11; i >= 0; i-- {
		t := now.Add(-time.Duration(i*5) * time.Minute)
		base := float64(72 + (i % 4))
		result = append(result, gin.H{
			"time":      t.Format("15:04"),
			"temp":      base + 0.2*float64(i%3),
			"vibration": 3.1 + 0.1*float64(i%4),
			"power":     145.0 + float64(i%8)*2,
			"pressure":  8.7 + 0.05*float64(i%6),
		})
	}
	return result
}

// ─── IoT Alert Rules ──────────────────────────────────────────────────────────

func GetIoTAlertRules(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT ar.id::text, d.code, d.name, ar.metric, ar.operator, ar.threshold,
			       ar.severity, ar.action, ar.enabled, ar.trigger_count
			FROM iot_alert_rules ar
			JOIN iot_devices d ON ar.device_id=d.id
			WHERE ar.company_id=(SELECT id FROM companies LIMIT 1)
			ORDER BY d.code, ar.threshold`)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			idx := 1
			for rows.Next() {
				var id, devCode, devName, metric, op, sev, action string
				var threshold float64
				var enabled bool
				var triggerCount int
				if rows.Scan(&id, &devCode, &devName, &metric, &op, &threshold, &sev, &action, &enabled, &triggerCount) == nil {
					result = append(result, gin.H{
						"id": fmt.Sprintf("ALR-%03d", idx), "device_id": devCode, "device_name": devName,
						"metric": metric, "operator": op, "threshold": threshold,
						"severity": sev, "action": action, "enabled": enabled, "trigger_count": triggerCount,
					})
					idx++
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			filtered, total := p.ApplyToSlice(result, []string{"device_name", "metric", "severity"})
			c.JSON(http.StatusOK, odata.Response(filtered, total))
			return
		}
	}
	rows, total := p.ApplyToSlice(demoAlertRules, []string{"device_name", "metric", "severity"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

var demoAlertRules = []gin.H{
	{"id": "ALR-001", "device_id": "DEV-001", "device_name": "Sensor Suhu Mesin A1", "metric": "temperature", "operator": ">", "threshold": 80, "severity": "warning", "action": "notify", "enabled": true, "trigger_count": 2},
	{"id": "ALR-002", "device_id": "DEV-001", "device_name": "Sensor Suhu Mesin A1", "metric": "temperature", "operator": ">", "threshold": 85, "severity": "critical", "action": "notify+shutdown", "enabled": true, "trigger_count": 0},
	{"id": "ALR-003", "device_id": "DEV-002", "device_name": "Sensor Getaran Mesin A2", "metric": "vibration", "operator": ">", "threshold": 7, "severity": "warning", "action": "notify", "enabled": true, "trigger_count": 5},
	{"id": "ALR-004", "device_id": "DEV-004", "device_name": "Smart Meter Listrik", "metric": "energy", "operator": ">", "threshold": 250, "severity": "warning", "action": "notify", "enabled": true, "trigger_count": 0},
	{"id": "ALR-005", "device_id": "DEV-007", "device_name": "Sensor Tekanan Kompresor", "metric": "pressure", "operator": ">", "threshold": 8.5, "severity": "warning", "action": "notify", "enabled": true, "trigger_count": 3},
}

func CreateIoTAlertRule(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	body["id"] = fmt.Sprintf("ALR-%03d", time.Now().UnixMilli()%1000)
	body["trigger_count"] = 0
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": body, "message": "Alert rule berhasil dibuat"})
}

func DeleteIoTAlertRule(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Alert rule dihapus"})
}

// ─── IoT Alert History ────────────────────────────────────────────────────────

func GetIoTAlertHistory(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB != nil {
		rows, err := database.DB.Query(`
			SELECT code, device_name, metric, value, threshold, severity,
			       TO_CHAR(occurred_at,'YYYY-MM-DD HH24:MI:SS'), resolved, COALESCE(duration,'')
			FROM iot_alert_history
			WHERE company_id=(SELECT id FROM companies LIMIT 1)
			ORDER BY occurred_at DESC`)
		if err == nil {
			defer rows.Close()
			var result []gin.H
			for rows.Next() {
				var code, device, metric, sev, ts, duration string
				var val, thr float64
				var resolved bool
				if rows.Scan(&code, &device, &metric, &val, &thr, &sev, &ts, &resolved, &duration) == nil {
					result = append(result, gin.H{
						"id": code, "device": device, "metric": metric,
						"value": val, "threshold": thr, "severity": sev,
						"timestamp": ts, "resolved": resolved, "duration": duration,
					})
				}
			}
			if result == nil {
				result = []gin.H{}
			}
			filtered, total := p.ApplyToSlice(result, []string{"device", "metric", "severity"})
			c.JSON(http.StatusOK, odata.Response(filtered, total))
			return
		}
	}
	rows, total := p.ApplyToSlice(demoAlertHistory, []string{"device", "metric", "severity"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

var demoAlertHistory = []gin.H{
	{"id": "AH-0091", "device": "Sensor Tekanan Kompresor", "metric": "pressure", "value": 9.1, "threshold": 8.5, "severity": "warning", "timestamp": "2026-06-29 09:40:12", "resolved": false, "duration": "5 menit"},
	{"id": "AH-0090", "device": "Sensor Getaran Mesin A2", "metric": "vibration", "value": 7.4, "threshold": 7.0, "severity": "warning", "timestamp": "2026-06-29 08:15:33", "resolved": true, "duration": "12 menit"},
	{"id": "AH-0089", "device": "Sensor Suhu Mesin A1", "metric": "temperature", "value": 81.2, "threshold": 80.0, "severity": "warning", "timestamp": "2026-06-29 07:02:45", "resolved": true, "duration": "8 menit"},
	{"id": "AH-0088", "device": "Sensor Getaran Mesin A2", "metric": "vibration", "value": 7.8, "threshold": 7.0, "severity": "warning", "timestamp": "2026-06-28 16:44:18", "resolved": true, "duration": "20 menit"},
	{"id": "AH-0087", "device": "Sensor Tekanan Kompresor", "metric": "pressure", "value": 8.7, "threshold": 8.5, "severity": "warning", "timestamp": "2026-06-28 14:22:09", "resolved": true, "duration": "6 menit"},
}
