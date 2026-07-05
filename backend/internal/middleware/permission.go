package middleware

import (
	"net/http"
	"sep/backend/internal/permission"

	"github.com/gin-gonic/gin"
)

// MenuPermission gates a route behind a per-menu access tier (view/add/edit/delete),
// resolved for the requesting user specifically: a per-user override in
// user_menu_permissions wins if present, otherwise the user's role-level tier
// applies. Superadmin always passes.
func MenuPermission(menuKey, minLevel string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("role")
		userID := c.GetString("user_id")
		if !permission.HasEffectiveMenuLevel(userID, role, menuKey, minLevel) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"success": false, "message": "Anda tidak memiliki izin untuk aksi ini"})
			return
		}
		c.Next()
	}
}
