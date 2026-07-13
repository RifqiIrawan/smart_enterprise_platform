package middleware

import (
	"net/http"
	"strings"

	"sep/backend/internal/database"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID    string `json:"user_id"`
	CompanyID string `json:"company_id"`
	Role      string `json:"role"`
	SessionID string `json:"session_id"`
	jwt.RegisteredClaims
}

func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "token required"})
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "invalid token"})
			return
		}
		// Tokens issued before session tracking existed carry no SessionID — treated
		// as exempt rather than rejected, so a schema/deploy upgrade doesn't log
		// everyone out. A DB error here also fails open (session table unreachable
		// shouldn't take down every authenticated request).
		if claims.SessionID != "" && database.DB != nil {
			var exists bool
			if err := database.DB.QueryRow(
				"SELECT EXISTS(SELECT 1 FROM user_sessions WHERE id=$1)", claims.SessionID,
			).Scan(&exists); err == nil && !exists {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Sesi telah berakhir, silakan login kembali"})
				return
			}
		}
		c.Set("user_id", claims.UserID)
		c.Set("company_id", claims.CompanyID)
		c.Set("role", claims.Role)
		c.Set("session_id", claims.SessionID)
		c.Next()
	}
}

func RoleRequired(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("role")
		for _, r := range roles {
			if r == role {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"success": false, "message": "insufficient permissions"})
	}
}
