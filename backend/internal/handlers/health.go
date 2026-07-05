package handlers

import (
	"net/http"
	"runtime"
	"time"

	"sep/backend/internal/database"

	"github.com/gin-gonic/gin"
)

var startTime = time.Now()

func HealthCheck(c *gin.Context) {
	dbStatus := "connected"
	dbLatencyMs := int64(0)

	if database.DB != nil {
		t := time.Now()
		if err := database.DB.Ping(); err != nil {
			dbStatus = "error: " + err.Error()
		} else {
			dbLatencyMs = time.Since(t).Milliseconds()
		}
	} else {
		dbStatus = "demo_mode"
	}

	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	c.JSON(http.StatusOK, gin.H{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"uptime":    time.Since(startTime).String(),
		"version":   "1.0.0",
		"database": gin.H{
			"status":     dbStatus,
			"latency_ms": dbLatencyMs,
		},
		"memory": gin.H{
			"alloc_mb":       memStats.Alloc / 1024 / 1024,
			"sys_mb":         memStats.Sys / 1024 / 1024,
			"num_goroutines": runtime.NumGoroutine(),
		},
	})
}

func ReadinessCheck(c *gin.Context) {
	if database.DB == nil {
		// Demo mode — always ready
		c.JSON(http.StatusOK, gin.H{"status": "ready", "mode": "demo"})
		return
	}
	if err := database.DB.Ping(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready", "mode": "production"})
}
