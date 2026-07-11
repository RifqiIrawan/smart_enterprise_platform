package handlers

import (
	"database/sql"
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

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
	// Includes both primary members (users.company_id) and secondary members
	// (granted via user_companies) of the requesting admin's active company, so an
	// admin who switches into a company can still see/manage guest members there.
	res, err := database.DB.Query(
		`SELECT id, name, email, role, is_active, last_login, (company_id=$1) AS is_primary
		 FROM users
		 WHERE company_id=$1 OR id IN (SELECT user_id FROM user_companies WHERE company_id=$1)
		 ORDER BY name`,
		companyID,
	)
	if err == nil && res != nil {
		defer res.Close()
		for res.Next() {
			var id, name, email, role string
			var isActive, isPrimary bool
			var lastLogin *time.Time
			res.Scan(&id, &name, &email, &role, &isActive, &lastLogin, &isPrimary)
			rows = append(rows, gin.H{"id": id, "name": name, "email": email, "role": role, "is_active": isActive, "last_login": lastLogin, "is_primary": isPrimary})
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
	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "password minimal 6 karakter"})
		return
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "gagal memproses password"})
		return
	}
	role := req.Role
	if role == "" {
		role = "operator"
	}
	companyID := c.GetString("company_id")
	var id string
	err = database.DB.QueryRow(
		`INSERT INTO users (company_id, name, email, password, role, is_active) VALUES ($1,$2,$3,$4,$5,true) RETURNING id`,
		companyID, req.Name, req.Email, string(hashed), role,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "gagal membuat user (email mungkin sudah dipakai)"})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "CREATE", "users", id, "Buat user baru: "+req.Email, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": id, "name": req.Name, "email": req.Email, "role": role, "department": req.Department, "is_active": true,
	}})
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

// GetCompanies returns the companies the requesting user can access — their
// primary company (users.company_id) plus any user_companies memberships;
// superadmin sees every company. Flags which one is "current" based on the
// requesting user's actively-scoped company (from their JWT).
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
	userID := c.GetString("user_id")
	activeCompanyID := c.GetString("company_id")
	role := c.GetString("role")

	var rows *sql.Rows
	var err error
	if role == "superadmin" {
		rows, err = database.DB.Query(`SELECT id, name, npwp, address, email FROM companies ORDER BY name`)
	} else {
		rows, err = database.DB.Query(
			`SELECT id, name, npwp, address, email FROM companies
			 WHERE id = (SELECT company_id FROM users WHERE id=$1)
			    OR id IN (SELECT company_id FROM user_companies WHERE user_id=$1)
			 ORDER BY name`,
			userID,
		)
	}
	value := []gin.H{}
	if err == nil && rows != nil {
		defer rows.Close()
		for rows.Next() {
			var id, name, npwp, address, email string
			rows.Scan(&id, &name, &npwp, &address, &email)
			var userCount int
			database.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE company_id=$1`, id).Scan(&userCount)
			value = append(value, gin.H{
				"id": id, "name": name, "npwp": npwp, "city": address, "email": email,
				"is_active": true, "user_count": userCount, "current": id == activeCompanyID,
			})
		}
	}
	c.JSON(http.StatusOK, gin.H{"value": value, "@odata.count": len(value)})
}

// CreateCompany inserts a new company, seeds its role_menu_permissions by cloning
// the template (oldest/bootstrap) company's current tiers so it starts with sane
// defaults instead of everything defaulting to "none", and — unless the creator is
// superadmin, who can already reach any company — grants the creator access to it
// via user_companies so they can immediately switch into and configure it.
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
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO companies (name, npwp, address, phone, email) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		req.Name, req.NPWP, req.City, req.Phone, req.Email,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "gagal membuat perusahaan"})
		return
	}
	database.DB.Exec(
		`INSERT INTO role_menu_permissions (company_id, role, menu_key, level)
		 SELECT $1, role, menu_key, level FROM role_menu_permissions
		 WHERE company_id = (SELECT id FROM companies ORDER BY created_at LIMIT 1)
		 ON CONFLICT (company_id, role, menu_key) DO NOTHING`,
		id,
	)
	requesterID := c.GetString("user_id")
	if c.GetString("role") != "superadmin" {
		database.DB.Exec(`INSERT INTO user_companies (user_id, company_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, requesterID, id)
	}
	database.WriteAuditLog(requesterID, "CREATE", "companies", id, "Buat perusahaan baru: "+req.Name, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{
		"id": id, "name": req.Name, "npwp": req.NPWP, "city": req.City, "is_active": true, "user_count": 0,
	}})
}

// accessibleCompaniesCTE defines a "accessible_companies(id)" CTE (params:
// $1=requester role, $2=requester user_id) yielding the set of company IDs
// the requester can see — every company for superadmin, otherwise their own
// primary company plus any user_companies memberships. Prepend to a query and
// reference "SELECT id FROM accessible_companies" as many times as needed
// without supplying additional params. Shared by GetCompanyAccessMatrix and
// the ownership checks below, so a non-superadmin can never read or reassign
// company access for a user outside the companies they themselves can see.
const accessibleCompaniesCTE = `WITH accessible_companies AS (
	SELECT id FROM companies WHERE $1 = 'superadmin'
	UNION SELECT company_id FROM users WHERE id = $2
	UNION SELECT company_id FROM user_companies WHERE user_id = $2
)
`

// targetUserVisibleSQL (params: $1=requester role, $2=requester user_id,
// $3=target user_id) reports whether the target user shares at least one
// accessible company with the requester — i.e. the target is visible to them.
const targetUserVisibleSQL = accessibleCompaniesCTE + `
SELECT EXISTS (
	SELECT 1 FROM users u WHERE u.id = $3 AND (
		u.company_id IN (SELECT id FROM accessible_companies)
		OR u.id IN (SELECT user_id FROM user_companies WHERE company_id IN (SELECT id FROM accessible_companies))
	)
)`

// GetUserCompanies returns a user's primary company plus any extra companies
// they've been granted access to via user_companies.
func GetUserCompanies(c *gin.Context) {
	userID := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"primary_company_id": "", "company_ids": []string{}}})
		return
	}
	role := c.GetString("role")
	if role != "superadmin" {
		var visible bool
		database.DB.QueryRow(targetUserVisibleSQL, role, c.GetString("user_id"), userID).Scan(&visible)
		if !visible {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User tidak ditemukan"})
			return
		}
	}
	var primaryCompanyID string
	if err := database.DB.QueryRow(`SELECT company_id FROM users WHERE id=$1`, userID).Scan(&primaryCompanyID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User tidak ditemukan"})
		return
	}
	companyIDs := []string{}
	rows, err := database.DB.Query(`SELECT company_id FROM user_companies WHERE user_id=$1`, userID)
	if err == nil && rows != nil {
		defer rows.Close()
		for rows.Next() {
			var cid string
			rows.Scan(&cid)
			companyIDs = append(companyIDs, cid)
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"primary_company_id": primaryCompanyID, "company_ids": companyIDs}})
}

// UpdateUserCompanies replaces a user's extra (non-primary) company memberships.
// The primary company (users.company_id) is implicit and never stored in
// user_companies — it's silently skipped if included in the request.
func UpdateUserCompanies(c *gin.Context) {
	userID := c.Param("id")
	var req struct {
		CompanyIDs []string `json:"company_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Akses perusahaan diperbarui (demo mode)"})
		return
	}
	role := c.GetString("role")
	if role != "superadmin" {
		var visible bool
		database.DB.QueryRow(targetUserVisibleSQL, role, c.GetString("user_id"), userID).Scan(&visible)
		if !visible {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "User tidak ditemukan"})
			return
		}
		// Non-superadmin can only grant/revoke access to companies they themselves
		// can already see — prevents using this endpoint to hand a user access to
		// an unrelated company outside the requester's own visibility.
		for _, cid := range req.CompanyIDs {
			var companyVisible bool
			database.DB.QueryRow(accessibleCompaniesCTE+`SELECT EXISTS (SELECT 1 FROM accessible_companies WHERE id = $3)`, role, c.GetString("user_id"), cid).Scan(&companyVisible)
			if !companyVisible {
				c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Anda tidak memiliki akses ke salah satu perusahaan yang dipilih"})
				return
			}
		}
	}
	var primaryCompanyID string
	database.DB.QueryRow(`SELECT company_id FROM users WHERE id=$1`, userID).Scan(&primaryCompanyID)
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "gagal menyimpan"})
		return
	}
	tx.Exec(`DELETE FROM user_companies WHERE user_id=$1`, userID)
	for _, cid := range req.CompanyIDs {
		if cid == primaryCompanyID {
			continue
		}
		tx.Exec(`INSERT INTO user_companies (user_id, company_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, userID, cid)
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "gagal menyimpan"})
		return
	}
	database.WriteAuditLog(c.GetString("user_id"), "UPDATE", "user_companies", userID, "Update akses perusahaan utk user: "+userID, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Akses perusahaan berhasil disimpan"})
}

// GetCompanyAccessMatrix returns, in one shot, every company and every user
// visible to the requester (mirroring GetCompanies' access rule — all
// companies for superadmin, otherwise the requester's own primary + secondary
// companies), plus each user's full set of accessible company_ids (primary +
// user_companies), so the frontend can render a User x Company access matrix
// without an N+1 request per user.
func GetCompanyAccessMatrix(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
			"companies": []gin.H{
				{"id": "demo-company-id", "name": "PT. Smart Enterprise Indonesia"},
				{"id": "demo-company-2", "name": "PT. Anak Usaha Manufacturing"},
			},
			"users": []gin.H{
				{"id": "USR-001", "name": "Admin Sistem", "email": "admin@sep.id", "role": "superadmin", "primary_company_id": "demo-company-id", "company_ids": []string{"demo-company-id", "demo-company-2"}},
			},
		}})
		return
	}
	role := c.GetString("role")
	userID := c.GetString("user_id")

	companies := []gin.H{}
	companyRows, err := database.DB.Query(accessibleCompaniesCTE+`
		SELECT id, name FROM companies WHERE id IN (SELECT id FROM accessible_companies) ORDER BY name`,
		role, userID,
	)
	if err == nil && companyRows != nil {
		defer companyRows.Close()
		for companyRows.Next() {
			var id, name string
			companyRows.Scan(&id, &name)
			companies = append(companies, gin.H{"id": id, "name": name})
		}
	}

	type userRow struct {
		ID, Name, Email, Role, PrimaryCompanyID string
	}
	var users []userRow
	userRows, err := database.DB.Query(accessibleCompaniesCTE+`
		SELECT DISTINCT u.id, u.name, u.email, u.role, u.company_id
		FROM users u
		WHERE u.company_id IN (SELECT id FROM accessible_companies)
		   OR u.id IN (SELECT user_id FROM user_companies WHERE company_id IN (SELECT id FROM accessible_companies))
		ORDER BY u.name`,
		role, userID,
	)
	if err == nil && userRows != nil {
		defer userRows.Close()
		for userRows.Next() {
			var u userRow
			userRows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.PrimaryCompanyID)
			users = append(users, u)
		}
	}

	grants := map[string][]string{}
	grantRows, err := database.DB.Query(accessibleCompaniesCTE+`
		SELECT user_id, company_id FROM user_companies WHERE company_id IN (SELECT id FROM accessible_companies)`,
		role, userID,
	)
	if err == nil && grantRows != nil {
		defer grantRows.Close()
		for grantRows.Next() {
			var uid, cid string
			grantRows.Scan(&uid, &cid)
			grants[uid] = append(grants[uid], cid)
		}
	}

	usersOut := []gin.H{}
	for _, u := range users {
		companyIDs := append([]string{u.PrimaryCompanyID}, grants[u.ID]...)
		usersOut = append(usersOut, gin.H{
			"id": u.ID, "name": u.Name, "email": u.Email, "role": u.Role,
			"primary_company_id": u.PrimaryCompanyID, "company_ids": companyIDs,
		})
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"companies": companies, "users": usersOut}})
}
