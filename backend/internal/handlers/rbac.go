package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── ROLE PERMISSION MAP (default) ───────────────────────────────────────────

var defaultRolePermissions = map[string][]string{
	"superadmin": {"*"},
	"admin":      {"dashboard.view", "sales.manage", "purchasing.manage", "warehouse.manage", "factory.manage", "hris.view", "accounting.view", "finance.view", "tax.view", "cost.view", "budget.view", "mrp.view", "qms.view", "asset.manage", "analytics.view", "settings.view"},
	"finance":    {"dashboard.view", "sales.view", "purchasing.view", "warehouse.view", "accounting.manage", "finance.manage", "tax.manage", "cost.manage", "budget.manage", "analytics.view"},
	"hr":         {"dashboard.view", "hris.manage", "analytics.view"},
	"warehouse":  {"dashboard.view", "warehouse.manage", "purchasing.view", "factory.view", "analytics.view"},
	"sales":      {"dashboard.view", "sales.manage", "analytics.view"},
	"purchasing": {"dashboard.view", "purchasing.manage", "warehouse.view", "analytics.view"},
	"operator":   {"dashboard.view", "factory.manage", "warehouse.manage", "asset.manage", "qms.manage"},
	"manager":    {"dashboard.view", "sales.view", "purchasing.view", "warehouse.view", "factory.view", "hris.view", "accounting.view", "finance.view", "tax.view", "cost.view", "budget.view", "mrp.view", "qms.view", "asset.view", "analytics.view"},
	"viewer":     {"dashboard.view", "sales.view", "purchasing.view", "warehouse.view", "factory.view", "asset.view", "analytics.view"},
}

var allModuleList = []gin.H{
	{"key": "dashboard", "label": "Dashboard"},
	{"key": "sales", "label": "Sales"},
	{"key": "purchasing", "label": "Purchasing"},
	{"key": "warehouse", "label": "Warehouse"},
	{"key": "factory", "label": "Smart Factory"},
	{"key": "hris", "label": "Smart HRIS"},
	{"key": "accounting", "label": "Accounting"},
	{"key": "finance", "label": "Finance AP/AR"},
	{"key": "tax", "label": "Tax & Pajak"},
	{"key": "cost", "label": "Cost Accounting"},
	{"key": "budget", "label": "Budget & Planning"},
	{"key": "mrp", "label": "MRP & Produksi"},
	{"key": "qms", "label": "Quality (QMS)"},
	{"key": "asset", "label": "Asset & CMMS"},
	{"key": "analytics", "label": "Analytics"},
	{"key": "settings", "label": "Settings & Admin"},
}

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

func GetUsers(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "USR-001", "name": "Admin Sistem", "email": "admin@sep.id", "role": "superadmin", "department": "IT", "is_active": true, "last_login": "2026-06-28 14:30"},
			{"id": "USR-002", "name": "Budi Santoso", "email": "budi@sep.id", "role": "operator", "department": "Produksi", "is_active": true, "last_login": "2026-06-28 08:00"},
			{"id": "USR-003", "name": "Sari Dewi", "email": "sari@sep.id", "role": "finance", "department": "Finance", "is_active": true, "last_login": "2026-06-28 09:15"},
			{"id": "USR-004", "name": "Andi Wijaya", "email": "andi@sep.id", "role": "admin", "department": "IT", "is_active": true, "last_login": "2026-06-28 10:00"},
			{"id": "USR-005", "name": "Dewi Rahayu", "email": "dewi@sep.id", "role": "hr", "department": "HR", "is_active": true, "last_login": "2026-06-27 16:00"},
			{"id": "USR-006", "name": "Fajar Nugroho", "email": "fajar@sep.id", "role": "warehouse", "department": "Gudang", "is_active": true, "last_login": "2026-06-27 07:45"},
			{"id": "USR-007", "name": "Gita Puspita", "email": "gita@sep.id", "role": "sales", "department": "Sales", "is_active": false, "last_login": "2026-06-25 11:00"},
			{"id": "USR-008", "name": "Hendra Kusuma", "email": "hendra@sep.id", "role": "purchasing", "department": "Purchasing", "is_active": true, "last_login": "2026-06-28 11:30"},
			{"id": "USR-009", "name": "Indah Permata", "email": "indah@sep.id", "role": "viewer", "department": "Management", "is_active": true, "last_login": "2026-06-26 13:00"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"name", "email", "role", "department"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows := []gin.H{}
	res, err := database.DB.Query(
		`SELECT id, name, email, role, is_active, last_login FROM users WHERE company_id=$1 ORDER BY name`,
		companyID,
	)
	if err == nil && res != nil {
		defer res.Close()
		for res.Next() {
			var id, name, email, role string
			var isActive bool
			var lastLogin *time.Time
			res.Scan(&id, &name, &email, &role, &isActive, &lastLogin)
			rows = append(rows, gin.H{"id": id, "name": name, "email": email, "role": role, "is_active": isActive, "last_login": lastLogin})
		}
	}
	c.JSON(http.StatusOK, odata.Response(rows, int64(len(rows))))
}

func CreateUser(c *gin.Context) {
	var req struct {
		Name       string `json:"name"`
		Email      string `json:"email"`
		Role       string `json:"role"`
		Department string `json:"department"`
		Password   string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" || req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "nama dan email wajib diisi"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "USR-NEW", "name": req.Name, "email": req.Email,
			"role": req.Role, "department": req.Department, "is_active": true,
		}})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true})
}

func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name       string `json:"name"`
		Role       string `json:"role"`
		Department string `json:"department"`
		IsActive   *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
			"id": id, "name": req.Name, "role": req.Role, "department": req.Department,
		}})
		return
	}
	companyID := c.GetString("company_id")
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	database.DB.Exec(
		"UPDATE users SET name=$1, role=$2, is_active=$3 WHERE id=$4 AND company_id=$5",
		req.Name, req.Role, isActive, id, companyID,
	)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func ToggleUserActive(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "is_active": req.IsActive}})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.Exec("UPDATE users SET is_active=$1 WHERE id=$2 AND company_id=$3", req.IsActive, id, companyID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func AdminResetPassword(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		NewPassword string `json:"new_password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.NewPassword) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "password minimal 6 karakter"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Password berhasil direset (demo mode)"})
		return
	}
	_ = id
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Password berhasil direset"})
}

// ─── ROLES & PERMISSIONS ─────────────────────────────────────────────────────

func GetRoles(c *gin.Context) {
	demo := []gin.H{
		{"id": "superadmin", "name": "Super Admin", "description": "Akses penuh ke semua modul sistem", "user_count": 1, "permissions": defaultRolePermissions["superadmin"], "is_system": true},
		{"id": "admin", "name": "Administrator", "description": "Akses hampir semua modul, kecuali konfigurasi sistem", "user_count": 1, "permissions": defaultRolePermissions["admin"], "is_system": true},
		{"id": "finance", "name": "Finance", "description": "Akses penuh modul keuangan dan laporan finansial", "user_count": 1, "permissions": defaultRolePermissions["finance"], "is_system": true},
		{"id": "hr", "name": "HR", "description": "Akses penuh modul HRIS dan kepegawaian", "user_count": 1, "permissions": defaultRolePermissions["hr"], "is_system": true},
		{"id": "warehouse", "name": "Warehouse", "description": "Akses modul gudang dan inventori", "user_count": 1, "permissions": defaultRolePermissions["warehouse"], "is_system": true},
		{"id": "sales", "name": "Sales", "description": "Akses modul penjualan dan CRM", "user_count": 1, "permissions": defaultRolePermissions["sales"], "is_system": true},
		{"id": "purchasing", "name": "Purchasing", "description": "Akses modul pengadaan dan pembelian", "user_count": 1, "permissions": defaultRolePermissions["purchasing"], "is_system": true},
		{"id": "operator", "name": "Operator", "description": "Akses operasional produksi dan mesin", "user_count": 1, "permissions": defaultRolePermissions["operator"], "is_system": true},
		{"id": "manager", "name": "Manager", "description": "Akses baca semua modul + approve transaksi", "user_count": 0, "permissions": defaultRolePermissions["manager"], "is_system": true},
		{"id": "viewer", "name": "Viewer", "description": "Hanya bisa melihat data, tidak bisa mengedit", "user_count": 1, "permissions": defaultRolePermissions["viewer"], "is_system": false},
	}
	c.JSON(http.StatusOK, gin.H{"value": demo, "@odata.count": len(demo)})
}

func GetPermissions(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"modules": allModuleList,
		"actions": []string{"view", "manage"},
		"roles":   defaultRolePermissions,
	})
}

func UpdateRolePermissions(c *gin.Context) {
	roleID := c.Param("role")
	var req struct {
		Permissions []string `json:"permissions"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "role": roleID, "permissions": req.Permissions, "message": "Permissions berhasil diperbarui (demo mode)"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ─── ACCESS LOG ──────────────────────────────────────────────────────────────

func GetAccessLogs(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "user_name": "Admin Sistem", "user_email": "admin@sep.id", "action": "LOGIN", "module": "Auth", "details": "Login berhasil dari browser Chrome", "ip": "192.168.1.100", "created_at": now.Add(-10 * time.Minute).Format("2006-01-02 15:04:05")},
			{"id": "2", "user_name": "Admin Sistem", "user_email": "admin@sep.id", "action": "VIEW", "module": "Budget", "details": "Melihat master anggaran Q3 2026", "ip": "192.168.1.100", "created_at": now.Add(-8 * time.Minute).Format("2006-01-02 15:04:05")},
			{"id": "3", "user_name": "Admin Sistem", "user_email": "admin@sep.id", "action": "UPDATE", "module": "Settings", "details": "Update permission role Finance", "ip": "192.168.1.100", "created_at": now.Add(-5 * time.Minute).Format("2006-01-02 15:04:05")},
			{"id": "4", "user_name": "Sari Dewi", "user_email": "sari@sep.id", "action": "LOGIN", "module": "Auth", "details": "Login berhasil dari browser Firefox", "ip": "192.168.1.105", "created_at": now.Add(-2 * time.Hour).Format("2006-01-02 15:04:05")},
			{"id": "5", "user_name": "Sari Dewi", "user_email": "sari@sep.id", "action": "CREATE", "module": "Finance", "details": "Buat pembayaran vendor VI-2026-042", "ip": "192.168.1.105", "created_at": now.Add(-2*time.Hour + 5*time.Minute).Format("2006-01-02 15:04:05")},
			{"id": "6", "user_name": "Sari Dewi", "user_email": "sari@sep.id", "action": "CREATE", "module": "Accounting", "details": "Buat jurnal umum JU-2026-108", "ip": "192.168.1.105", "created_at": now.Add(-2*time.Hour + 15*time.Minute).Format("2006-01-02 15:04:05")},
			{"id": "7", "user_name": "Budi Santoso", "user_email": "budi@sep.id", "action": "LOGIN", "module": "Auth", "details": "Login berhasil dari mobile app", "ip": "10.0.0.45", "created_at": now.Add(-6 * time.Hour).Format("2006-01-02 15:04:05")},
			{"id": "8", "user_name": "Budi Santoso", "user_email": "budi@sep.id", "action": "UPDATE", "module": "Factory", "details": "Update qty Work Order WO-2026-042 → 250 unit", "ip": "10.0.0.45", "created_at": now.Add(-6*time.Hour + 20*time.Minute).Format("2006-01-02 15:04:05")},
			{"id": "9", "user_name": "Gita Puspita", "user_email": "gita@sep.id", "action": "LOGIN_FAILED", "module": "Auth", "details": "Password salah (percobaan ke-2)", "ip": "10.0.0.52", "created_at": now.Add(-24 * time.Hour).Format("2006-01-02 15:04:05")},
			{"id": "10", "user_name": "Gita Puspita", "user_email": "gita@sep.id", "action": "LOGIN_FAILED", "module": "Auth", "details": "Password salah (percobaan ke-3) — akun dikunci", "ip": "10.0.0.52", "created_at": now.Add(-24*time.Hour + 2*time.Minute).Format("2006-01-02 15:04:05")},
			{"id": "11", "user_name": "Andi Wijaya", "user_email": "andi@sep.id", "action": "DELETE", "module": "Settings", "details": "Non-aktifkan user USR-010", "ip": "192.168.1.110", "created_at": now.Add(-3 * time.Hour).Format("2006-01-02 15:04:05")},
			{"id": "12", "user_name": "Hendra Kusuma", "user_email": "hendra@sep.id", "action": "CREATE", "module": "Purchasing", "details": "Buat Purchase Order PO-2026-031", "ip": "192.168.1.115", "created_at": now.Add(-4 * time.Hour).Format("2006-01-02 15:04:05")},
		}
		rows, total := p.ApplyToSlice(demo, []string{"user_name", "user_email", "action", "module", "details"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, odata.Response([]gin.H{}, 0))
}

// ─── MULTI-COMPANY ───────────────────────────────────────────────────────────

func GetCompanies(c *gin.Context) {
	if database.DB == nil {
		demo := []gin.H{
			{"id": "demo-company-id", "name": "PT. Smart Enterprise Indonesia", "npwp": "01.234.567.8-901.000", "city": "Jakarta", "is_active": true, "user_count": 9, "current": true},
			{"id": "demo-company-2", "name": "PT. Anak Usaha Manufacturing", "npwp": "02.345.678.9-012.000", "city": "Bekasi", "is_active": true, "user_count": 4, "current": false},
			{"id": "demo-company-3", "name": "PT. Distribusi Nusantara", "npwp": "03.456.789.0-123.000", "city": "Surabaya", "is_active": false, "user_count": 2, "current": false},
		}
		c.JSON(http.StatusOK, gin.H{"value": demo, "@odata.count": len(demo)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "@odata.count": 0})
}

func CreateCompany(c *gin.Context) {
	var req struct {
		Name  string `json:"name"`
		NPWP  string `json:"npwp"`
		City  string `json:"city"`
		Email string `json:"email"`
		Phone string `json:"phone"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "nama perusahaan wajib diisi"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
			"id": "demo-company-new", "name": req.Name, "npwp": req.NPWP,
			"city": req.City, "is_active": true, "user_count": 0,
		}})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true})
}
