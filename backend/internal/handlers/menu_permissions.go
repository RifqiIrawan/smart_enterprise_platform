package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/permission"

	"github.com/gin-gonic/gin"
)

// moduleMenuKeys registers the fine-grained menu keys per module as pages get
// converted from in-page tabs to sidebar submenus. Append a new entry here
// (and the matching seed in db.go) whenever another module is converted.
var moduleMenuKeys = map[string][]string{
	"purchasing": {"purchasing.pr", "purchasing.po", "purchasing.rfq", "purchasing.grn", "purchasing.vendor"},
	"sales":      {"sales.so", "sales.do", "sales.invoice", "sales.quotation", "sales.retur", "sales.crm", "sales.customer"},
	"finance":    {"finance.bank", "finance.ap", "finance.ar", "finance.aging-ap", "finance.aging-ar", "finance.recon", "finance.petty-cash"},
	"hris": {
		"hris.hrdashboard", "hris.employee", "hris.attendance", "hris.leave", "hris.payroll",
		"hris.payslip", "hris.recruitment", "hris.training", "hris.kpi", "hris.overtime", "hris.orgchart",
	},
	"factory": {
		"factory.overview", "factory.workorder", "factory.machines", "factory.bom", "factory.downtime",
		"factory.workcenters", "factory.routing", "factory.oee", "factory.scrap", "factory.capacity", "factory.report",
	},
	"warehouse": {"warehouse.inventory", "warehouse.movements", "warehouse.alerts", "warehouse.opname"},
	"accounting": {
		"accounting.dashboard", "accounting.journal", "accounting.coa", "accounting.gl",
		"accounting.trial-balance", "accounting.cashflow", "accounting.closing", "accounting.comparative",
	},
	"tax": {
		"tax.ppn", "tax.pph21", "tax.pph23", "tax.bpjs", "tax.nsfp", "tax.efaktur", "tax.spt-ppn", "tax.config",
	},
	"qms":    {"qms.inspeksi", "qms.ncr", "qms.capa", "qms.kalibrasi"},
	"budget": {"budget.master", "budget.vsactual", "budget.alerts", "budget.forecast", "budget.scenarios"},
	"mrp":    {"mrp.engine", "mrp.jadwal", "mrp.routing", "mrp.lot"},
	"cost":   {"cost.centers", "cost.wo", "cost.std", "cost.laporan", "cost.cogs", "cost.profitability", "cost.centerreport"},
	"asset":   {"asset.assets", "asset.maintenance", "asset.pm", "asset.spareparts", "asset.depreciation"},
	"vehicle": {"vehicle.fleet", "vehicle.fuel"},
	"analytics": {
		"analytics.executive", "analytics.operational", "analytics.hr", "analytics.module",
		"analytics.comparison", "analytics.forecast", "analytics.predictive", "analytics.anomalies",
		"analytics.price", "analytics.custom",
	},
	"settings": {
		"settings.company", "settings.users", "settings.roles", "settings.logs", "settings.currency",
		"settings.notifications", "settings.2fa", "settings.sessions", "settings.audit", "settings.security",
		"settings.company_access",
	},
	"approval": {"approval.pending", "approval.history", "approval.rules"},
	"executive":  {"executive.overview", "executive.report", "executive.targets"},
	"integration": {"integration.import", "integration.export", "integration.apikeys", "integration.webhooks"},
	"supplychain": {"supplychain.map", "supplychain.trace", "supplychain.scorecard", "supplychain.risk"},
	"customerportal": {"customerportal.dashboard", "customerportal.orders", "customerportal.invoices", "customerportal.delivery"},
	"vendorportal":   {"vendorportal.dashboard", "vendorportal.pos", "vendorportal.invoices", "vendorportal.payments"},
	"network":  {"network.devices", "network.traffic", "network.snmp"},
	"building": {"building.overview", "building.hvac", "building.energy"},
	"security":    {"security.visitor", "security.incident", "security.access"},
	"marketplace": {"marketplace.overview", "marketplace.channels", "marketplace.orders", "marketplace.listings"},
	"iot":         {"iot.live", "iot.devices", "iot.alerts", "iot.history"},
}

var menuPermissionRoles = []string{"superadmin", "admin", "finance", "hr", "warehouse", "sales", "purchasing", "operator", "manager", "viewer"}

func allMenuKeys() []string {
	var keys []string
	for _, ks := range moduleMenuKeys {
		keys = append(keys, ks...)
	}
	return keys
}

// GetMenuPermissions returns either:
//   - ?role=xxx                     -> that role's level for every known menu key (used by the frontend's session-wide permission loader)
//   - ?role=xxx&user_id=zzz         -> same, but resolved for that specific user (per-user override wins over the role default)
//   - ?role=xxx&module=yyy          -> that role's level for just one module's menu keys
//   - ?module=yyy                    -> the full role × menu-key matrix for one module (used by the Settings admin UI)
//
// All modes resolve against the requesting user's currently active company by
// default (c.GetString("company_id")). An optional ?company_id=zzz lets an admin
// explicitly target a DIFFERENT company's tiers (e.g. the Settings > Role &
// Permission page's company filter) WITHOUT switching their whole session into
// it — only honored if they actually have access to that company (primary,
// user_companies membership, or superadmin); otherwise silently falls back to
// their own active company, same as if the param were omitted.
func GetMenuPermissions(c *gin.Context) {
	companyID := c.GetString("company_id")
	if target := c.Query("company_id"); target != "" && database.DB != nil {
		if permission.UserHasCompanyAccess(c.GetString("user_id"), c.GetString("role"), target) {
			companyID = target
		}
	}
	role := c.Query("role")
	module := c.Query("module")
	userID := c.Query("user_id")

	if role != "" {
		keys := allMenuKeys()
		if module != "" {
			keys = moduleMenuKeys[module]
		}
		result := gin.H{}
		for _, k := range keys {
			if userID != "" {
				result[k] = permission.GetEffectiveMenuLevel(companyID, userID, role, k)
			} else {
				result[k] = permission.GetMenuLevel(companyID, role, k)
			}
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
		return
	}

	keys, ok := moduleMenuKeys[module]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "module wajib diisi jika role kosong"})
		return
	}
	matrix := gin.H{}
	for _, r := range menuPermissionRoles {
		rowPerms := gin.H{}
		for _, k := range keys {
			rowPerms[k] = permission.GetMenuLevel(companyID, r, k)
		}
		matrix[r] = rowPerms
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": matrix, "menu_keys": keys})
}

// UpdateMenuPermissions persists per-role, per-menu access tiers (none/view/add/edit/delete),
// scoped to the requesting admin's currently active company by default — or to an
// explicit req.CompanyID if provided and the admin actually has access to it (same
// rule as GetMenuPermissions' ?company_id, letting the Settings company filter save
// changes to a different company without switching the whole session into it).
func UpdateMenuPermissions(c *gin.Context) {
	var req struct {
		Role        string            `json:"role"`
		CompanyID   string            `json:"company_id"`
		Permissions map[string]string `json:"permissions"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Role == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if req.Role == "superadmin" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Super Admin tidak dapat diubah"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Permission diperbarui (demo mode)"})
		return
	}
	companyID := c.GetString("company_id")
	if req.CompanyID != "" && permission.UserHasCompanyAccess(c.GetString("user_id"), c.GetString("role"), req.CompanyID) {
		companyID = req.CompanyID
	}
	for menuKey, level := range req.Permissions {
		database.DB.Exec(
			`INSERT INTO role_menu_permissions (company_id, role, menu_key, level) VALUES ($1,$2,$3,$4)
			 ON CONFLICT (company_id, role, menu_key) DO UPDATE SET level=$4, updated_at=NOW()`,
			companyID, req.Role, menuKey, level,
		)
	}
	database.WriteAuditLog(c.GetString("user_id"), "UPDATE", "role_menu_permissions", req.Role, "Update izin menu untuk role: "+req.Role, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Permission berhasil disimpan"})
}

// GetUserMenuPermissions returns a target user's role, that role's default tier per
// menu key, and any per-user overrides on top of it (used by the Settings per-user
// override modal to show "Default dari Role" alongside the current override).
// Scoped to the requesting admin's currently active company on both dimensions: the
// target user must belong to that company (primary or via user_companies membership),
// and the role_defaults/overrides looked up are for that company specifically.
func GetUserMenuPermissions(c *gin.Context) {
	userID := c.Param("id")
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"role": "", "role_defaults": gin.H{}, "overrides": gin.H{}}})
		return
	}
	var role string
	err := database.DB.QueryRow(
		`SELECT role FROM users WHERE id=$1 AND (company_id=$2 OR EXISTS (
			SELECT 1 FROM user_companies WHERE user_id=$1 AND company_id=$2
		))`, userID, companyID,
	).Scan(&role)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User tidak ditemukan"})
		return
	}
	keys := allMenuKeys()
	roleDefaults := gin.H{}
	for _, k := range keys {
		roleDefaults[k] = permission.GetMenuLevel(companyID, role, k)
	}
	overrides := gin.H{}
	rows, err := database.DB.Query(`SELECT menu_key, level FROM user_menu_permissions WHERE company_id=$1 AND user_id=$2`, companyID, userID)
	if err == nil && rows != nil {
		defer rows.Close()
		for rows.Next() {
			var k, lvl string
			rows.Scan(&k, &lvl)
			overrides[k] = lvl
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"role": role, "role_defaults": roleDefaults, "overrides": overrides}})
}

// UpdateUserMenuPermissions upserts per-user overrides (scoped to the requesting
// admin's currently active company) on top of the role default. A value of "inherit"
// deletes that key's override row (reverting to the role tier); any other value
// ("none"/"view"/"add"/"edit"/"delete") upserts an override row. Requires the target
// user to belong to the requesting admin's company (primary or user_companies
// membership) — same tenant-isolation check as GetUserMenuPermissions.
func UpdateUserMenuPermissions(c *gin.Context) {
	userID := c.Param("id")
	companyID := c.GetString("company_id")
	var req struct {
		Permissions map[string]string `json:"permissions"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Izin user diperbarui (demo mode)"})
		return
	}
	var exists bool
	database.DB.QueryRow(
		`SELECT EXISTS (SELECT 1 FROM users WHERE id=$1 AND (company_id=$2 OR EXISTS (
			SELECT 1 FROM user_companies WHERE user_id=$1 AND company_id=$2
		)))`, userID, companyID,
	).Scan(&exists)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User tidak ditemukan"})
		return
	}
	for menuKey, level := range req.Permissions {
		if level == "inherit" {
			database.DB.Exec(`DELETE FROM user_menu_permissions WHERE company_id=$1 AND user_id=$2 AND menu_key=$3`, companyID, userID, menuKey)
			continue
		}
		database.DB.Exec(
			`INSERT INTO user_menu_permissions (company_id, user_id, menu_key, level) VALUES ($1,$2,$3,$4)
			 ON CONFLICT (company_id, user_id, menu_key) DO UPDATE SET level=$4, updated_at=NOW()`,
			companyID, userID, menuKey, level,
		)
	}
	database.WriteAuditLog(c.GetString("user_id"), "UPDATE", "user_menu_permissions", userID, "Update izin khusus untuk user: "+userID, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Izin khusus berhasil disimpan"})
}
