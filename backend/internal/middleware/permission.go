package middleware

import (
	"net/http"
	"sep/backend/internal/permission"

	"github.com/gin-gonic/gin"
)

// MenuPermission gates a route behind a per-menu access tier (view/add/edit/delete),
// resolved for the requesting user specifically within their currently active
// company: a per-user override in user_menu_permissions wins if present, otherwise
// the user's role-level tier applies (which itself can differ per company).
// Superadmin always passes.
func MenuPermission(menuKey, minLevel string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("role")
		userID := c.GetString("user_id")
		companyID := c.GetString("company_id")
		if !permission.HasEffectiveMenuLevel(companyID, userID, role, menuKey, minLevel) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"success": false, "message": "Anda tidak memiliki izin untuk aksi ini"})
			return
		}
		c.Next()
	}
}

// CompanyFilter lets a request "browse as" a different company than the one
// baked into the caller's JWT, via a ?company_id= query param honored on every
// method (GET/POST/PUT/PATCH/DELETE) — so it applies to both reads and writes.
// Only takes effect if the requester actually has access to that company
// (primary, user_companies membership, or superadmin); otherwise it's silently
// ignored and the session's own company_id (set by AuthMiddleware) stands.
// Registered once on the protected route group, so every handler's existing
// c.GetString("company_id") and every MenuPermission check transparently see
// the override with zero per-handler changes.
func CompanyFilter() gin.HandlerFunc {
	return func(c *gin.Context) {
		if target := c.Query("company_id"); target != "" {
			if permission.UserHasCompanyAccess(c.GetString("user_id"), c.GetString("role"), target) {
				c.Set("company_id", target)
			}
		}
		c.Next()
	}
}
