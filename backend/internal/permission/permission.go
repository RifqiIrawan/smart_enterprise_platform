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
	"superadmin": {"purchasing": "edit", "sales": "edit", "finance": "edit", "hris": "edit", "factory": "edit", "warehouse": "edit", "accounting": "edit", "tax": "edit", "qms": "edit", "budget": "edit", "mrp": "edit", "cost": "edit", "asset": "edit", "vehicle": "edit", "analytics": "edit", "settings": "edit", "network": "edit", "building": "edit", "security": "edit", "marketplace": "edit", "iot": "edit", "approval": "edit", "executive": "edit", "integration": "edit", "supplychain": "view", "customerportal": "view", "vendorportal": "add"},
	"admin":      {"purchasing": "edit", "sales": "edit", "finance": "view", "hris": "view", "factory": "edit", "warehouse": "edit", "accounting": "view", "tax": "view", "qms": "view", "budget": "view", "mrp": "view", "cost": "view", "asset": "edit", "vehicle": "edit", "analytics": "view", "settings": "edit", "network": "edit", "building": "view", "security": "edit", "marketplace": "edit", "iot": "edit", "approval": "edit", "executive": "edit", "integration": "edit", "supplychain": "view", "customerportal": "view", "vendorportal": "add"},
	"finance":    {"purchasing": "view", "sales": "view", "finance": "edit", "hris": "none", "factory": "none", "warehouse": "view", "accounting": "edit", "tax": "edit", "qms": "none", "budget": "edit", "mrp": "none", "cost": "edit", "asset": "none", "vehicle": "view", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "view", "iot": "view", "approval": "edit", "executive": "view", "integration": "edit", "supplychain": "view", "customerportal": "view", "vendorportal": "add"},
	"hr":         {"purchasing": "none", "sales": "none", "finance": "none", "hris": "edit", "factory": "none", "warehouse": "none", "accounting": "none", "tax": "none", "qms": "none", "budget": "none", "mrp": "none", "cost": "none", "asset": "none", "vehicle": "view", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "view", "iot": "view", "approval": "edit", "executive": "view", "integration": "edit", "supplychain": "view", "customerportal": "view", "vendorportal": "add"},
	"warehouse":  {"purchasing": "view", "sales": "none", "finance": "none", "hris": "none", "factory": "view", "warehouse": "edit", "accounting": "none", "tax": "none", "qms": "none", "budget": "none", "mrp": "none", "cost": "none", "asset": "none", "vehicle": "edit", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "edit", "iot": "view", "approval": "edit", "executive": "view", "integration": "edit", "supplychain": "view", "customerportal": "view", "vendorportal": "add"},
	"sales":      {"purchasing": "none", "sales": "edit", "finance": "none", "hris": "none", "factory": "none", "warehouse": "none", "accounting": "none", "tax": "none", "qms": "none", "budget": "none", "mrp": "none", "cost": "none", "asset": "none", "vehicle": "view", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "edit", "iot": "view", "approval": "edit", "executive": "view", "integration": "edit", "supplychain": "view", "customerportal": "view", "vendorportal": "add"},
	"purchasing": {"purchasing": "edit", "sales": "none", "finance": "none", "hris": "none", "factory": "none", "warehouse": "view", "accounting": "none", "tax": "none", "qms": "none", "budget": "none", "mrp": "none", "cost": "none", "asset": "none", "vehicle": "edit", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "view", "iot": "view", "approval": "edit", "executive": "view", "integration": "edit", "supplychain": "view", "customerportal": "view", "vendorportal": "add"},
	"operator":   {"purchasing": "none", "sales": "none", "finance": "none", "hris": "none", "factory": "edit", "warehouse": "edit", "accounting": "none", "tax": "none", "qms": "edit", "budget": "none", "mrp": "none", "cost": "none", "asset": "edit", "vehicle": "edit", "analytics": "none", "settings": "none", "network": "edit", "building": "view", "security": "edit", "marketplace": "view", "iot": "edit", "approval": "edit", "executive": "view", "integration": "edit", "supplychain": "view", "customerportal": "view", "vendorportal": "add"},
	"manager":    {"purchasing": "view", "sales": "view", "finance": "view", "hris": "view", "factory": "view", "warehouse": "view", "accounting": "view", "tax": "view", "qms": "view", "budget": "view", "mrp": "view", "cost": "view", "asset": "view", "vehicle": "view", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "view", "iot": "view", "approval": "edit", "executive": "view", "integration": "edit", "supplychain": "view", "customerportal": "view", "vendorportal": "add"},
	"viewer":     {"purchasing": "view", "sales": "view", "finance": "none", "hris": "none", "factory": "view", "warehouse": "view", "accounting": "none", "tax": "none", "qms": "none", "budget": "none", "mrp": "none", "cost": "none", "asset": "view", "vehicle": "view", "analytics": "view", "settings": "none", "network": "view", "building": "view", "security": "view", "marketplace": "view", "iot": "view", "approval": "edit", "executive": "view", "integration": "edit", "supplychain": "view", "customerportal": "view", "vendorportal": "add"},
}

// GetMenuLevel returns the configured access tier ("none"|"view"|"add"|"edit")
// a role has for a given menu key (e.g. "purchasing.pr") within a specific
// company — the same role can have a different tier in different companies.
func GetMenuLevel(companyID, role, menuKey string) string {
	if role == "superadmin" {
		return "edit"
	}
	module := strings.SplitN(menuKey, ".", 2)[0]
	if database.DB == nil {
		// Demo mode has no real multi-company concept, so companyID is ignored here.
		if perModule, ok := demoDefaults[role]; ok {
			if lvl, ok2 := perModule[module]; ok2 {
				return lvl
			}
		}
		return "none"
	}
	var level string
	err := database.DB.QueryRow(
		`SELECT level FROM role_menu_permissions WHERE company_id=$1 AND role=$2 AND menu_key=$3`, companyID, role, menuKey,
	).Scan(&level)
	if err != nil {
		return "none"
	}
	return level
}

// HasMenuLevel reports whether a role's level for menuKey meets or exceeds minLevel
// within the given company.
func HasMenuLevel(companyID, role, menuKey, minLevel string) bool {
	if role == "superadmin" {
		return true
	}
	return levelOrder[GetMenuLevel(companyID, role, menuKey)] >= levelOrder[minLevel]
}

// GetEffectiveMenuLevel returns the access tier for a specific user within a specific
// company, taking any per-user override (user_menu_permissions) into account before
// falling back to the user's role-level tier via GetMenuLevel.
func GetEffectiveMenuLevel(companyID, userID, role, menuKey string) string {
	if role == "superadmin" {
		return "edit"
	}
	if database.DB != nil && userID != "" {
		var level string
		err := database.DB.QueryRow(
			`SELECT level FROM user_menu_permissions WHERE company_id=$1 AND user_id=$2 AND menu_key=$3`, companyID, userID, menuKey,
		).Scan(&level)
		if err == nil {
			return level
		}
	}
	return GetMenuLevel(companyID, role, menuKey)
}

// HasEffectiveMenuLevel reports whether a specific user's effective level for
// menuKey (role default, unless overridden per-user) meets or exceeds minLevel,
// within the given company.
func HasEffectiveMenuLevel(companyID, userID, role, menuKey, minLevel string) bool {
	if role == "superadmin" {
		return true
	}
	return levelOrder[GetEffectiveMenuLevel(companyID, userID, role, menuKey)] >= levelOrder[minLevel]
}

// UserHasCompanyAccess reports whether a user can act within companyID — either
// as their primary company (users.company_id), via a user_companies membership
// row, or unconditionally if they're superadmin. Shared by SwitchCompany, the
// per-user menu-permissions endpoints, and CompanyFilter middleware — anywhere
// an admin targets a company other than their own currently-active one (e.g.
// viewing/editing another company's data without switching their whole session
// into it).
func UserHasCompanyAccess(userID, role, companyID string) bool {
	if role == "superadmin" {
		return true
	}
	if database.DB == nil {
		return false
	}
	var hasAccess bool
	database.DB.QueryRow(
		`SELECT EXISTS (SELECT 1 FROM users WHERE id=$1 AND company_id=$2)
		 OR EXISTS (SELECT 1 FROM user_companies WHERE user_id=$1 AND company_id=$2)`,
		userID, companyID,
	).Scan(&hasAccess)
	return hasAccess
}
