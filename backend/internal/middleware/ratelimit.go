package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateBucket struct {
	tokens   float64
	lastSeen time.Time
}

type rateLimiter struct {
	mu       sync.Mutex
	buckets  map[string]*rateBucket
	rate     float64 // tokens per second
	capacity float64
}

func newRateLimiter(rps float64, capacity float64) *rateLimiter {
	rl := &rateLimiter{
		buckets:  make(map[string]*rateBucket),
		rate:     rps,
		capacity: capacity,
	}
	// Cleanup goroutine
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			rl.mu.Lock()
			cutoff := time.Now().Add(-10 * time.Minute)
			for k, b := range rl.buckets {
				if b.lastSeen.Before(cutoff) {
					delete(rl.buckets, k)
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, ok := rl.buckets[key]
	if !ok {
		rl.buckets[key] = &rateBucket{tokens: rl.capacity - 1, lastSeen: now}
		return true
	}

	elapsed := now.Sub(b.lastSeen).Seconds()
	b.tokens = min64(rl.capacity, b.tokens+elapsed*rl.rate)
	b.lastSeen = now

	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}

func min64(a, b float64) float64 {
	if a < b { return a }
	return b
}

// Global rate limiter: 60 req/min per IP
var globalRL = newRateLimiter(1, 60)

// Auth rate limiter: 10 req/min per IP (brute-force protection)
var authRL = newRateLimiter(0.167, 10)

// ENT-04: Rate limiting middleware
func RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !globalRL.allow(ip) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": "Too many requests. Please slow down.",
				"retry_after": "60s",
			})
			return
		}
		c.Next()
	}
}

func AuthRateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !authRL.allow(ip) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": "Too many login attempts. Try again in 1 minute.",
				"retry_after": "60s",
			})
			return
		}
		c.Next()
	}
}
