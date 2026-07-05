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
	"cost":   {"cost.centers", "cost.wo", "cost.std", "cost.laporan"},
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
	},
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
func GetMenuPermissions(c *gin.Context) {
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
				result[k] = permission.GetEffectiveMenuLevel(userID, role, k)
			} else {
				result[k] = permission.GetMenuLevel(role, k)
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
			rowPerms[k] = permission.GetMenuLevel(r, k)
		}
		matrix[r] = rowPerms
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": matrix, "menu_keys": keys})
}

// UpdateMenuPermissions persists per-role, per-menu access tiers (none/view/add/edit/delete).
func UpdateMenuPermissions(c *gin.Context) {
	var req struct {
		Role        string            `json:"role"`
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
	for menuKey, level := range req.Permissions {
		database.DB.Exec(
			`INSERT INTO role_menu_permissions (role, menu_key, level) VALUES ($1,$2,$3)
			 ON CONFLICT (role, menu_key) DO UPDATE SET level=$3, updated_at=NOW()`,
			req.Role, menuKey, level,
		)
	}
	database.WriteAuditLog(c.GetString("user_id"), "UPDATE", "role_menu_permissions", req.Role, "Update izin menu untuk role: "+req.Role, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Permission berhasil disimpan"})
}

// GetUserMenuPermissions returns a target user's role, that role's default tier per
// menu key, and any per-user overrides on top of it (used by the Settings per-user
// override modal to show "Default dari Role" alongside the current override).
func GetUserMenuPermissions(c *gin.Context) {
	userID := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"role": "", "role_defaults": gin.H{}, "overrides": gin.H{}}})
		return
	}
	var role string
	if err := database.DB.QueryRow(`SELECT role FROM users WHERE id=$1`, userID).Scan(&role); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User tidak ditemukan"})
		return
	}
	keys := allMenuKeys()
	roleDefaults := gin.H{}
	for _, k := range keys {
		roleDefaults[k] = permission.GetMenuLevel(role, k)
	}
	overrides := gin.H{}
	rows, err := database.DB.Query(`SELECT menu_key, level FROM user_menu_permissions WHERE user_id=$1`, userID)
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

// UpdateUserMenuPermissions upserts per-user overrides on top of the role default.
// A value of "inherit" deletes that key's override row (reverting to the role tier);
// any other value ("none"/"view"/"add"/"edit"/"delete") upserts an override row.
func UpdateUserMenuPermissions(c *gin.Context) {
	userID := c.Param("id")
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
	for menuKey, level := range req.Permissions {
		if level == "inherit" {
			database.DB.Exec(`DELETE FROM user_menu_permissions WHERE user_id=$1 AND menu_key=$2`, userID, menuKey)
			continue
		}
		database.DB.Exec(
			`INSERT INTO user_menu_permissions (user_id, menu_key, level) VALUES ($1,$2,$3)
			 ON CONFLICT (user_id, menu_key) DO UPDATE SET level=$3, updated_at=NOW()`,
			userID, menuKey, level,
		)
	}
	database.WriteAuditLog(c.GetString("user_id"), "UPDATE", "user_menu_permissions", userID, "Update izin khusus untuk user: "+userID, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Izin khusus berhasil disimpan"})
}
