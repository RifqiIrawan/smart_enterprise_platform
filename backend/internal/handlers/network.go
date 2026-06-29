package handlers

import (
	"math/rand"
	"net/http"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

var deviceStates = map[string]bool{
	"1": true, "2": true, "3": true, "4": false,
	"5": true, "6": true, "7": false, "8": true,
}

var deviceStateMutex = make(map[string]bool)

func init() {
	for k, v := range deviceStates {
		deviceStateMutex[k] = v
	}
}

func GetDevices(c *gin.Context) {
	p := odata.Parse(c)
	demo := []gin.H{
		{"id": "1", "name": "Core Switch - Rack A", "type": "Switch", "ip": "192.168.1.1", "mac": "AA:BB:CC:DD:EE:01", "location": "Server Room", "status": boolToStatus(deviceStateMutex["1"]), "uptime": "45 hari", "cpu_pct": 23, "bandwidth_mbps": 850},
		{"id": "2", "name": "Router Utama", "type": "Router", "ip": "192.168.1.254", "mac": "AA:BB:CC:DD:EE:02", "location": "Server Room", "status": boolToStatus(deviceStateMutex["2"]), "uptime": "90 hari", "cpu_pct": 15, "bandwidth_mbps": 950},
		{"id": "3", "name": "Access Point Lt.1", "type": "Access Point", "ip": "192.168.2.1", "mac": "AA:BB:CC:DD:EE:03", "location": "Lantai 1", "status": boolToStatus(deviceStateMutex["3"]), "uptime": "30 hari", "cpu_pct": 8, "bandwidth_mbps": 120},
		{"id": "4", "name": "Access Point Lt.2", "type": "Access Point", "ip": "192.168.2.2", "mac": "AA:BB:CC:DD:EE:04", "location": "Lantai 2", "status": boolToStatus(deviceStateMutex["4"]), "uptime": "-", "cpu_pct": 0, "bandwidth_mbps": 0},
		{"id": "5", "name": "Server Database", "type": "Server", "ip": "192.168.1.10", "mac": "AA:BB:CC:DD:EE:05", "location": "Server Room", "status": boolToStatus(deviceStateMutex["5"]), "uptime": "120 hari", "cpu_pct": 45, "bandwidth_mbps": 340},
		{"id": "6", "name": "NAS Storage", "type": "Storage", "ip": "192.168.1.20", "mac": "AA:BB:CC:DD:EE:06", "location": "Server Room", "status": boolToStatus(deviceStateMutex["6"]), "uptime": "200 hari", "cpu_pct": 12, "bandwidth_mbps": 280},
		{"id": "7", "name": "CCTV DVR Gudang", "type": "CCTV", "ip": "192.168.3.100", "mac": "AA:BB:CC:DD:EE:07", "location": "Gudang", "status": boolToStatus(deviceStateMutex["7"]), "uptime": "-", "cpu_pct": 0, "bandwidth_mbps": 0},
		{"id": "8", "name": "Firewall Utama", "type": "Firewall", "ip": "192.168.0.1", "mac": "AA:BB:CC:DD:EE:08", "location": "Server Room", "status": boolToStatus(deviceStateMutex["8"]), "uptime": "365 hari", "cpu_pct": 31, "bandwidth_mbps": 990},
	}
	rows, total := p.ApplyToSlice(demo, []string{"name", "type", "ip", "location", "status"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

func boolToStatus(active bool) string {
	if active {
		return "online"
	}
	return "offline"
}

func ToggleDevice(c *gin.Context) {
	id := c.Param("id")
	current, exists := deviceStateMutex[id]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "device not found"})
		return
	}
	deviceStateMutex[id] = !current
	newStatus := boolToStatus(deviceStateMutex[id])
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"id":         id,
		"status":     newStatus,
		"updated_at": time.Now(),
	}})
}

func GetTraffic(c *gin.Context) {
	now := time.Now()
	data := make([]gin.H, 24)
	baseIn := 400.0
	baseOut := 250.0
	for i := range data {
		hour := now.Add(time.Duration(i-23) * time.Hour)
		inMbps := baseIn + rand.Float64()*300 - 50
		outMbps := baseOut + rand.Float64()*200 - 30
		if inMbps < 50 {
			inMbps = 50
		}
		if outMbps < 20 {
			outMbps = 20
		}
		data[i] = gin.H{
			"time":       hour.Format("15:04"),
			"timestamp":  hour,
			"in_mbps":    inMbps,
			"out_mbps":   outMbps,
			"total_mbps": inMbps + outMbps,
			"packets_in": int(inMbps * 1000),
			"packets_out": int(outMbps * 1000),
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": data, "total": len(data)})
}
