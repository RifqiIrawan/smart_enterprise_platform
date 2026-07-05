package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
)

func GetNotifications(c *gin.Context) {
	if database.DB == nil {
		now := time.Now()
		data := []gin.H{
			{"id": "1", "title": "Work Order Selesai", "message": "WO-2848 Assembly B-05 telah selesai 100%", "type": "success", "is_read": false, "created_at": now.Add(-15 * time.Minute)},
			{"id": "2", "title": "Stok Hampir Habis", "message": "Baja Lembaran 2mm tersisa 150 lembar (min: 200)", "type": "warning", "is_read": false, "created_at": now.Add(-30 * time.Minute)},
			{"id": "3", "title": "Maintenance Terjadwal", "message": "Maintenance CNC Milling dijadwalkan 7 hari lagi", "type": "info", "is_read": true, "created_at": now.Add(-2 * time.Hour)},
			{"id": "4", "title": "PR Disetujui", "message": "Purchase Request PR-2846 telah disetujui", "type": "success", "is_read": true, "created_at": now.Add(-3 * time.Hour)},
			{"id": "5", "title": "Insiden Keamanan", "message": "Akses tidak sah terdeteksi di Gate B", "type": "danger", "is_read": false, "created_at": now.Add(-4 * time.Hour)},
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": data, "total": len(data)})
		return
	}

	userID := c.GetString("user_id")
	rows, err := database.DB.Query(
		`SELECT id, user_id, title, message, type, is_read, created_at
		 FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var notifications []models.Notification
	for rows.Next() {
		var n models.Notification
		rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Message, &n.Type, &n.IsRead, &n.CreatedAt)
		notifications = append(notifications, n)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": notifications, "total": len(notifications)})
}

func MarkNotificationRead(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "is_read": true, "updated_at": time.Now()}})
		return
	}
	userID := c.GetString("user_id")
	_, err := database.DB.Exec(
		`UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
		id, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "is_read": true, "updated_at": time.Now()}})
}

func ClearNotifications(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "semua notifikasi telah dihapus"})
		return
	}
	userID := c.GetString("user_id")
	_, err := database.DB.Exec(
		`DELETE FROM notifications WHERE user_id = $1`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "semua notifikasi telah dihapus"})
}
