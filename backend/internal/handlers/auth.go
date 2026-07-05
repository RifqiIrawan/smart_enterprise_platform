package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/middleware"
	"sep/backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret string

func SetJWTSecret(s string) { jwtSecret = s }

func Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}

	// Demo mode: if no DB, use hardcoded credentials
	if database.DB == nil {
		if req.Email == "admin@sep.id" && req.Password == "admin123" {
			user := models.User{
				ID: "demo-user-id", CompanyID: "demo-company-id",
				Name: "Admin Sistem", Email: "admin@sep.id", Role: "superadmin",
				IsActive: true,
			}
			company := models.Company{ID: "demo-company-id", Name: "PT. Smart Enterprise Indonesia"}
			token := generateToken(user)
			c.JSON(http.StatusOK, gin.H{"success": true, "data": models.LoginResponse{Token: token, User: user, Company: company}})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "email atau password salah"})
		return
	}

	var user models.User
	var hashedPassword string
	err := database.DB.QueryRow(
		`SELECT u.id, u.company_id, u.name, u.email, u.password, u.role, u.is_active
		 FROM users u WHERE u.email = $1 AND u.is_active = true`, req.Email,
	).Scan(&user.ID, &user.CompanyID, &user.Name, &user.Email, &hashedPassword, &user.Role, &user.IsActive)

	if err != nil || bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "email atau password salah"})
		return
	}

	var company models.Company
	database.DB.QueryRow("SELECT id, name FROM companies WHERE id = $1", user.CompanyID).
		Scan(&company.ID, &company.Name)

	now := time.Now()
	user.LastLogin = &now
	database.DB.Exec("UPDATE users SET last_login = $1 WHERE id = $2", now, user.ID)

	token := generateToken(user)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": models.LoginResponse{Token: token, User: user, Company: company}})
}

func Me(c *gin.Context) {
	userID := c.GetString("user_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": userID, "name": "Admin Sistem", "role": "superadmin"}})
		return
	}
	var user models.User
	database.DB.QueryRow("SELECT id, company_id, name, email, role, is_active FROM users WHERE id = $1", userID).
		Scan(&user.ID, &user.CompanyID, &user.Name, &user.Email, &user.Role, &user.IsActive)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": user})
}

func Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "logged out"})
}

func ChangePassword(c *gin.Context) {
	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.NewPassword) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "password baru minimal 6 karakter"})
		return
	}
	if database.DB == nil {
		if req.CurrentPassword == "admin123" || len(req.CurrentPassword) > 0 {
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "Password berhasil diubah"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Password lama tidak sesuai"})
		return
	}
	userID := c.GetString("user_id")
	var hashedOld string
	database.DB.QueryRow("SELECT password FROM users WHERE id=$1", userID).Scan(&hashedOld)
	if bcrypt.CompareHashAndPassword([]byte(hashedOld), []byte(req.CurrentPassword)) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Password lama tidak sesuai"})
		return
	}
	hashed, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	database.DB.Exec("UPDATE users SET password=$1 WHERE id=$2", string(hashed), userID)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Password berhasil diubah"})
}

func generateToken(user models.User) string {
	claims := middleware.Claims{
		UserID:    user.ID,
		CompanyID: user.CompanyID,
		Role:      user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(jwtSecret))
	return token
}
