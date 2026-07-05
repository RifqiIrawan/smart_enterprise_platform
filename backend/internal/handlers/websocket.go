package handlers

import (
	"log"
	"math/rand"
	"net/http"
	"sep/backend/internal/database"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type wsHub struct {
	clients map[*websocket.Conn]bool
	mu      sync.Mutex
}

var hub = &wsHub{clients: make(map[*websocket.Conn]bool)}

func (h *wsHub) broadcast(msg interface{}) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for conn := range h.clients {
		if err := conn.WriteJSON(msg); err != nil {
			conn.Close()
			delete(h.clients, conn)
		}
	}
}

func init() {
	// Background goroutine: push realtime data every 2 seconds
	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		machineOEE := map[string]float64{
			"CNC-01": 87.5, "CNC-02": 72.3, "AS-01": 91.2, "AS-02": 0, "WL-01": 68.9,
		}
		for range ticker.C {
			if len(hub.clients) == 0 {
				continue
			}
			// Simulate OEE fluctuation
			for k, v := range machineOEE {
				if v > 0 {
					machineOEE[k] = clampFloat(v+rand.Float64()*2-1, 60, 99)
				}
			}
			// Count real alerts from DB
			stockLow := 3
			if database.DB != nil {
				var count int
				database.DB.QueryRow(`SELECT COUNT(*) FROM inventory WHERE qty <= min_stock`).Scan(&count)
				stockLow = count
			}
			hub.broadcast(gin.H{
				"type":      "realtime",
				"timestamp": time.Now().Format(time.RFC3339),
				"oee": gin.H{
					"CNC-01": round2(machineOEE["CNC-01"]),
					"CNC-02": round2(machineOEE["CNC-02"]),
					"AS-01":  round2(machineOEE["AS-01"]),
					"AS-02":  machineOEE["AS-02"],
					"WL-01":  round2(machineOEE["WL-01"]),
				},
				"sensors": gin.H{
					"temp_server_room": round2(22 + rand.Float64()*3),
					"temp_produksi":    round2(28 + rand.Float64()*4),
					"energy_kwh":       round2(1200 + rand.Float64()*100),
					"humidity":         round2(55 + rand.Float64()*10),
				},
				"alerts": gin.H{
					"stock_low":  stockLow,
					"machine_ok": 3 + rand.Intn(2),
					"incidents":  rand.Intn(3),
				},
			})
		}
	}()
}

func clampFloat(v, min, max float64) float64 {
	if v < min { return min }
	if v > max { return max }
	return v
}
func round2(v float64) float64 { return float64(int(v*100)) / 100 }

// IOT-01: WebSocket endpoint
func WSHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	hub.mu.Lock()
	hub.clients[conn] = true
	hub.mu.Unlock()

	// Send welcome message
	conn.WriteJSON(gin.H{"type": "connected", "message": "WebSocket connected to SEP realtime feed", "timestamp": time.Now()})

	// Keep alive: read messages (ping/pong)
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			hub.mu.Lock()
			delete(hub.clients, conn)
			hub.mu.Unlock()
			conn.Close()
			break
		}
	}
}

// IOT-02: Network device poll (simulated SNMP-like)
func PollNetworkDevices(c *gin.Context) {
	devices := []gin.H{
		{"id": "1", "name": "Core Switch", "ip": "192.168.1.1", "cpu_pct": int(15 + rand.Float64()*20), "bandwidth_mbps": int(700 + rand.Float64()*300), "packet_loss": round2(rand.Float64() * 0.5), "latency_ms": round2(0.5 + rand.Float64()*1), "status": "online"},
		{"id": "2", "name": "Router Utama", "ip": "192.168.1.254", "cpu_pct": int(10 + rand.Float64()*15), "bandwidth_mbps": int(800 + rand.Float64()*200), "packet_loss": round2(rand.Float64() * 0.3), "latency_ms": round2(1 + rand.Float64()*2), "status": "online"},
		{"id": "3", "name": "AP Lantai 1", "ip": "192.168.2.1", "cpu_pct": int(5 + rand.Float64()*10), "bandwidth_mbps": int(80 + rand.Float64()*80), "packet_loss": 0.0, "latency_ms": round2(2 + rand.Float64()*3), "status": "online"},
		{"id": "4", "name": "AP Lantai 2", "ip": "192.168.2.2", "cpu_pct": 0, "bandwidth_mbps": 0, "packet_loss": 100.0, "latency_ms": 0.0, "status": "offline"},
		{"id": "5", "name": "Server DB", "ip": "192.168.1.10", "cpu_pct": int(35 + rand.Float64()*25), "bandwidth_mbps": int(200 + rand.Float64()*200), "packet_loss": 0.0, "latency_ms": round2(0.3 + rand.Float64()*0.5), "status": "online"},
		{"id": "6", "name": "NAS Storage", "ip": "192.168.1.20", "cpu_pct": int(8 + rand.Float64()*10), "bandwidth_mbps": int(100 + rand.Float64()*200), "packet_loss": 0.0, "latency_ms": round2(0.8 + rand.Float64()*1), "status": "online"},
		{"id": "7", "name": "CCTV DVR", "ip": "192.168.3.100", "cpu_pct": 0, "bandwidth_mbps": 0, "packet_loss": 100.0, "latency_ms": 0.0, "status": "offline"},
		{"id": "8", "name": "Firewall", "ip": "192.168.0.1", "cpu_pct": int(25 + rand.Float64()*15), "bandwidth_mbps": int(850 + rand.Float64()*150), "packet_loss": round2(rand.Float64() * 0.1), "latency_ms": round2(0.2 + rand.Float64()*0.3), "status": "online"},
	}
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       devices,
		"polled_at":  time.Now(),
		"online":     6,
		"offline":    2,
		"avg_cpu":    round2(15 + rand.Float64()*10),
		"avg_bw":     round2(350 + rand.Float64()*100),
	})
}

// IOT-03: Smart Building sensor data
func GetBuildingSensors(c *gin.Context) {
	zones := []gin.H{
		{"zone": "Server Room", "temp": round2(22 + rand.Float64()*2), "humidity": round2(45 + rand.Float64()*5), "co2_ppm": int(400 + rand.Intn(100)), "lights_on": true, "ac_on": true, "energy_kw": round2(12 + rand.Float64()*3)},
		{"zone": "Produksi Lt.1", "temp": round2(27 + rand.Float64()*4), "humidity": round2(60 + rand.Float64()*10), "co2_ppm": int(600 + rand.Intn(200)), "lights_on": true, "ac_on": false, "energy_kw": round2(85 + rand.Float64()*20)},
		{"zone": "Gudang A", "temp": round2(25 + rand.Float64()*3), "humidity": round2(55 + rand.Float64()*8), "co2_ppm": int(450 + rand.Intn(80)), "lights_on": true, "ac_on": false, "energy_kw": round2(8 + rand.Float64()*2)},
		{"zone": "Kantor Lt.2", "temp": round2(23 + rand.Float64()*2), "humidity": round2(50 + rand.Float64()*5), "co2_ppm": int(500 + rand.Intn(150)), "lights_on": true, "ac_on": true, "energy_kw": round2(15 + rand.Float64()*5)},
		{"zone": "Meeting Room", "temp": round2(21 + rand.Float64()*2), "humidity": round2(48 + rand.Float64()*5), "co2_ppm": int(420 + rand.Intn(60)), "lights_on": false, "ac_on": false, "energy_kw": round2(0.5 + rand.Float64()*0.5)},
	}
	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"data":          zones,
		"total_energy":  round2(120 + rand.Float64()*20),
		"polled_at":     time.Now(),
	})
}

// IOT-04: GPS fleet tracking
func GetGPSTracking(c *gin.Context) {
	vehicles := []gin.H{
		{"id": "1", "plate": "B 1234 XY", "driver": "Budi Santoso", "lat": -6.2088 + rand.Float64()*0.01, "lng": 106.8456 + rand.Float64()*0.01, "speed_kmh": int(rand.Float64() * 80), "status": "moving", "fuel_pct": int(60 + rand.Float64()*30), "updated_at": time.Now()},
		{"id": "2", "plate": "B 5678 AB", "driver": "Ahmad Fauzi", "lat": -6.2200 + rand.Float64()*0.01, "lng": 106.8100 + rand.Float64()*0.01, "speed_kmh": 0, "status": "parked", "fuel_pct": int(30 + rand.Float64()*20), "updated_at": time.Now()},
		{"id": "3", "plate": "B 9012 CD", "driver": "Dewi Rahayu", "lat": -6.1800 + rand.Float64()*0.01, "lng": 106.8700 + rand.Float64()*0.01, "speed_kmh": int(rand.Float64() * 60), "status": "moving", "fuel_pct": int(70 + rand.Float64()*25), "updated_at": time.Now()},
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": vehicles, "total": len(vehicles)})
}
