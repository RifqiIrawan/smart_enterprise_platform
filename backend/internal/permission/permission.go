package permission

import (
	"strings"

	"sep/backend/internal/database"
)

var levelOrder = map[string]int{"none": 0, "view": 1, "add": 2, "edit": 3, "delete": 4}

// demoDefaults mirrors the seed data inserted into role_menu_permissions,
// used when running without a database (demo mode). Keyed by role, then by
// module (the part of a menu key before the first "."), since a role's tier
// can differ per module (e.g. the "sales" role has edit on sales.* but none
// on purchasing.*).
var demoDefaults = map[string]map[string]string{
	"superadmin": {"purchasing": "edit", "sales": "edit", "finance": "edit", "hris": "edit", "factory": "edit", "warehouse": "edit", "accounting": "edit", "tax": "edit", "qms": "edit", "budget": "edit", "mrp": "edit", "cost": "edit", "asset": "edit", "vehicle": "edit", "analytics": "edit", "settings": "edit", "network": "edit", "building": "edit", "security": "edit", "marketplace": "edit", "iot": "edit"},
	"admin":      {"purchasing": "edit", "sales": "edit", "finance": "view", "hris": "view", "factory": "edit", "warehouse": "edit", "accounting": "view", "tax": "view", "qms": "view", "budget": "view", "mrp": "view", "cost": "view", "asset": "edit", "vehicle": "edit", "analytics": "view", "settings": "edit", "network": "edit", "building": "view", "security": "edit", "marketplace": "edit", "iot": "edit"},
	"finance":    {"purchasing": "view", "sales": "view", "finance": "edit", "hris": "none", "factory": "none", "warehouse": "view", "accounting": "edit", "tax": "edit", "qms": "none", "budget": "edit", "mrp": "none", "cost": "edit", "asset": "none", "vehicle": "view", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "view", "iot": "view"},
	"hr":         {"purchasing": "none", "sales": "none", "finance": "none", "hris": "edit", "factory": "none", "warehouse": "none", "accounting": "none", "tax": "none", "qms": "none", "budget": "none", "mrp": "none", "cost": "none", "asset": "none", "vehicle": "view", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "view", "iot": "view"},
	"warehouse":  {"purchasing": "view", "sales": "none", "finance": "none", "hris": "none", "factory": "view", "warehouse": "edit", "accounting": "none", "tax": "none", "qms": "none", "budget": "none", "mrp": "none", "cost": "none", "asset": "none", "vehicle": "edit", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "edit", "iot": "view"},
	"sales":      {"purchasing": "none", "sales": "edit", "finance": "none", "hris": "none", "factory": "none", "warehouse": "none", "accounting": "none", "tax": "none", "qms": "none", "budget": "none", "mrp": "none", "cost": "none", "asset": "none", "vehicle": "view", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "edit", "iot": "view"},
	"purchasing": {"purchasing": "edit", "sales": "none", "finance": "none", "hris": "none", "factory": "none", "warehouse": "view", "accounting": "none", "tax": "none", "qms": "none", "budget": "none", "mrp": "none", "cost": "none", "asset": "none", "vehicle": "edit", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "view", "iot": "view"},
	"operator":   {"purchasing": "none", "sales": "none", "finance": "none", "hris": "none", "factory": "edit", "warehouse": "edit", "accounting": "none", "tax": "none", "qms": "edit", "budget": "none", "mrp": "none", "cost": "none", "asset": "edit", "vehicle": "edit", "analytics": "none", "settings": "none", "network": "edit", "building": "view", "security": "edit", "marketplace": "view", "iot": "edit"},
	"manager":    {"purchasing": "view", "sales": "view", "finance": "view", "hris": "view", "factory": "view", "warehouse": "view", "accounting": "view", "tax": "view", "qms": "view", "budget": "view", "mrp": "view", "cost": "view", "asset": "view", "vehicle": "view", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "view", "iot": "view"},
	"viewer":     {"purchasing": "view", "sales": "view", "finance": "none", "hris": "none", "factory": "view", "warehouse": "view", "accounting": "none", "tax": "none", "qms": "none", "budget": "none", "mrp": "none", "cost": "none", "asset": "view", "vehicle": "view", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "view", "iot": "view"},
}

// GetMenuLevel returns the configured access tier ("none"|"view"|"add"|"edit")
// a role has for a given menu key (e.g. "purchasing.pr").
func GetMenuLevel(role, menuKey string) string {
	if role == "superadmin" {
		return "edit"
	}
	module := strings.SplitN(menuKey, ".", 2)[0]
	if database.DB == nil {
		if perModule, ok := demoDefaults[role]; ok {
			if lvl, ok2 := perModule[module]; ok2 {
				return lvl
			}
		}
		return "none"
	}
	var level string
	err := database.DB.QueryRow(
		`SELECT level FROM role_menu_permissions WHERE role=$1 AND menu_key=$2`, role, menuKey,
	).Scan(&level)
	if err != nil {
		return "none"
	}
	return level
}

// HasMenuLevel reports whether a role's level for menuKey meets or exceeds minLevel.
func HasMenuLevel(role, menuKey, minLevel string) bool {
	if role == "superadmin" {
		return true
	}
	return levelOrder[GetMenuLevel(role, menuKey)] >= levelOrder[minLevel]
}

// GetEffectiveMenuLevel returns the access tier for a specific user, taking any
// per-user override (user_menu_permissions) into account before falling back to
// the user's role-level tier via GetMenuLevel.
func GetEffectiveMenuLevel(userID, role, menuKey string) string {
	if role == "superadmin" {
		return "edit"
	}
	if database.DB != nil && userID != "" {
		var level string
		err := database.DB.QueryRow(
			`SELECT level FROM user_menu_permissions WHERE user_id=$1 AND menu_key=$2`, userID, menuKey,
		).Scan(&level)
		if err == nil {
			return level
		}
	}
	return GetMenuLevel(role, menuKey)
}

// HasEffectiveMenuLevel reports whether a specific user's effective level for
// menuKey (role default, unless overridden per-user) meets or exceeds minLevel.
func HasEffectiveMenuLevel(userID, role, menuKey, minLevel string) bool {
	if role == "superadmin" {
		return true
	}
	return levelOrder[GetEffectiveMenuLevel(userID, role, menuKey)] >= levelOrder[minLevel]
}
