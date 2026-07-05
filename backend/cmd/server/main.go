package main

import (
	"log"
	"net/http"
	"sep/backend/internal/config"
	"sep/backend/internal/database"
	"sep/backend/internal/handlers"
	"sep/backend/internal/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env if exists — try the conventional run locations in order and stop at
	// the first one that's actually found. godotenv.Load(a, b, c) does NOT fall
	// through to b/c if a is missing (it aborts on the first missing file), so each
	// candidate must be attempted independently.
	for _, p := range []string{".env", "../.env", "../../.env"} {
		if err := godotenv.Load(p); err == nil {
			break
		}
	}

	cfg := config.Load()
	handlers.SetJWTSecret(cfg.JWTSecret)

	// Try DB connection (gracefully degrade if not available)
	database.Connect(cfg)

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		dbStatus := "disconnected"
		if database.DB != nil {
			dbStatus = "connected"
		}
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"db":      dbStatus,
			"version": "1.0.0",
		})
	})

	routes.Setup(r, cfg.JWTSecret)

	log.Printf("Smart Enterprise Platform API starting on port %s", cfg.ServerPort)
	log.Printf("Health check: http://localhost:%s/health", cfg.ServerPort)
	log.Printf("API Base: http://localhost:%s/api/v1", cfg.ServerPort)

	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
