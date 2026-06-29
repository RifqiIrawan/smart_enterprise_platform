package handlers

import (
	"net/http"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

func GetFleet(c *gin.Context) {
	p := odata.Parse(c)
	now := time.Now()
	demo := []gin.H{
		{"id": "1", "plate": "B 1234 SEP", "name": "Toyota Kijang Innova", "type": "Minibus", "driver": "Deni Purnama", "status": "on_trip", "location": "Jl. Sudirman, Jakarta", "fuel_pct": 72, "odometer": 45230, "last_service": now.Add(-30 * 24 * time.Hour).Format("2006-01-02")},
		{"id": "2", "plate": "B 5678 SEP", "name": "Mitsubishi Colt Diesel", "type": "Truck", "driver": "Agus Triyono", "status": "available", "location": "Gudang Utama", "fuel_pct": 88, "odometer": 78540, "last_service": now.Add(-15 * 24 * time.Hour).Format("2006-01-02")},
		{"id": "3", "plate": "B 9012 SEP", "name": "Honda CR-V", "type": "SUV", "driver": "Hendra Kurniawan", "status": "on_trip", "location": "Tol Jagorawi KM 12", "fuel_pct": 45, "odometer": 32100, "last_service": now.Add(-45 * 24 * time.Hour).Format("2006-01-02")},
		{"id": "4", "plate": "B 3456 SEP", "name": "Toyota HiAce", "type": "Van", "driver": "", "status": "maintenance", "location": "Bengkel Mitra", "fuel_pct": 30, "odometer": 91200, "last_service": now.Add(-60 * 24 * time.Hour).Format("2006-01-02")},
		{"id": "5", "plate": "B 7890 SEP", "name": "Isuzu Elf NMR", "type": "Truck", "driver": "Rudi Hartono", "status": "available", "location": "Parkiran A", "fuel_pct": 95, "odometer": 23400, "last_service": now.Add(-10 * 24 * time.Hour).Format("2006-01-02")},
	}
	rows, total := p.ApplyToSlice(demo, []string{"plate", "name", "type", "driver", "status", "location"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

func GetFuelLogs(c *gin.Context) {
	p := odata.Parse(c)
	now := time.Now()
	demo := []gin.H{
		{"id": "1", "vehicle_plate": "B 1234 SEP", "vehicle_name": "Toyota Kijang Innova", "liters": 40.5, "price_per_liter": 10000, "total_cost": 405000, "odometer": 45200, "station": "SPBU Pertamina Gatot Subroto", "filled_by": "Deni Purnama", "date": now.Add(-1 * 24 * time.Hour).Format("2006-01-02")},
		{"id": "2", "vehicle_plate": "B 5678 SEP", "vehicle_name": "Mitsubishi Colt Diesel", "liters": 80.0, "price_per_liter": 6800, "total_cost": 544000, "odometer": 78450, "station": "SPBU Shell Tangerang", "filled_by": "Agus Triyono", "date": now.Add(-2 * 24 * time.Hour).Format("2006-01-02")},
		{"id": "3", "vehicle_plate": "B 9012 SEP", "vehicle_name": "Honda CR-V", "liters": 45.0, "price_per_liter": 10000, "total_cost": 450000, "odometer": 32050, "station": "SPBU Pertamina Cibubur", "filled_by": "Hendra Kurniawan", "date": now.Add(-3 * 24 * time.Hour).Format("2006-01-02")},
		{"id": "4", "vehicle_plate": "B 7890 SEP", "vehicle_name": "Isuzu Elf NMR", "liters": 70.0, "price_per_liter": 6800, "total_cost": 476000, "odometer": 23300, "station": "SPBU Total Bekasi", "filled_by": "Rudi Hartono", "date": now.Add(-4 * 24 * time.Hour).Format("2006-01-02")},
	}
	rows, total := p.ApplyToSlice(demo, []string{"vehicle_plate", "vehicle_name", "station", "filled_by"})
	c.JSON(http.StatusOK, odata.Response(rows, total))
}

func CreateFuelLog(c *gin.Context) {
	var req struct {
		VehicleID    string  `json:"vehicle_id"`
		VehiclePlate string  `json:"vehicle_plate"`
		Liters       float64 `json:"liters"`
		PricePerLiter float64 `json:"price_per_liter"`
		Odometer     int     `json:"odometer"`
		Station      string  `json:"station"`
		FilledBy     string  `json:"filled_by"`
		Date         string  `json:"date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	totalCost := req.Liters * req.PricePerLiter
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id":             "new-fuel-id",
		"vehicle_plate":  req.VehiclePlate,
		"liters":         req.Liters,
		"price_per_liter": req.PricePerLiter,
		"total_cost":     totalCost,
		"odometer":       req.Odometer,
		"station":        req.Station,
		"filled_by":      req.FilledBy,
		"date":           req.Date,
		"created_at":     time.Now(),
	}})
}
