package handlers

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"encoding/csv"
	"fmt"
	"net/http"
	"sep/backend/internal/database"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ── TOTP Helpers ──────────────────────────────────────────────────────────────

func genTOTPSecret() string {
	b := make([]byte, 20)
	rand.Read(b)
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)
}

func genBackupCodes() []string {
	codes := make([]string, 10)
	for i := range codes {
		b := make([]byte, 5)
		rand.Read(b)
		codes[i] = fmt.Sprintf("%05X-%05X", b[:3], b[2:])
	}
	return codes
}

func computeTOTP(secretB32 string, t time.Time) string {
	dec, err := base32.StdEncoding.WithPadding(base32.NoPadding).
		DecodeString(strings.ToUpper(strings.ReplaceAll(secretB32, " ", "")))
	if err != nil {
		return ""
	}
	counter := uint64(t.Unix() / 30)
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, counter)
	h := hmac.New(sha1.New, dec)
	h.Write(buf)
	sum := h.Sum(nil)
	off := sum[len(sum)-1] & 0x0F
	code := binary.BigEndian.Uint32(sum[off:off+4]) & 0x7FFFFFFF
	return fmt.Sprintf("%06d", code%1_000_000)
}

func verifyTOTPCode(secret, code string) bool {
	now := time.Now()
	for _, d := range []time.Duration{-30 * time.Second, 0, 30 * time.Second} {
		if computeTOTP(secret, now.Add(d)) == code {
			return true
		}
	}
	return false
}

// ── 2FA Handlers ──────────────────────────────────────────────────────────────

func Get2FAStatus(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"enabled": false, "backup_codes_count": 0})
		return
	}
	userID := c.GetString("user_id")
	var enabled bool
	var bkRaw string
	database.DB.QueryRow(
		"SELECT COALESCE(totp_enabled,false), COALESCE(totp_backup_codes,'') FROM users WHERE id=$1", userID,
	).Scan(&enabled, &bkRaw)
	count := 0
	if bkRaw != "" && bkRaw != "[]" {
		count = strings.Count(bkRaw, ",") + 1
	}
	c.JSON(http.StatusOK, gin.H{"enabled": enabled, "backup_codes_count": count})
}

func Setup2FA(c *gin.Context) {
	secret := genTOTPSecret()
	email := "admin@sep.id"
	if database.DB != nil {
		userID := c.GetString("user_id")
		database.DB.QueryRow("SELECT email FROM users WHERE id=$1", userID).Scan(&email)
		database.DB.Exec("UPDATE users SET totp_secret=$1, totp_enabled=false WHERE id=$2", secret, userID)
	}
	otpauthURL := fmt.Sprintf(
		"otpauth://totp/SEP:%s?secret=%s&issuer=SEP&algorithm=SHA1&digits=6&period=30",
		email, secret,
	)
	c.JSON(http.StatusOK, gin.H{"secret": secret, "otpauth_url": otpauthURL, "email": email})
}

func Enable2FA(c *gin.Context) {
	var req struct {
		Code string `json:"code"`
	}
	c.ShouldBindJSON(&req)
	if len(req.Code) != 6 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Kode harus 6 digit"})
		return
	}
	if database.DB == nil {
		codes := genBackupCodes()
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "2FA berhasil diaktifkan", "backup_codes": codes})
		return
	}
	userID := c.GetString("user_id")
	var secret string
	database.DB.QueryRow("SELECT totp_secret FROM users WHERE id=$1", userID).Scan(&secret)
	if !verifyTOTPCode(secret, req.Code) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Kode OTP tidak valid atau kadaluarsa"})
		return
	}
	codes := genBackupCodes()
	codesStr := strings.Join(codes, ",")
	database.DB.Exec("UPDATE users SET totp_enabled=true, totp_backup_codes=$1 WHERE id=$2", codesStr, userID)
	c.JSON(http.StatusOK, gin.H{"success": true, "backup_codes": codes})
}

func Disable2FA(c *gin.Context) {
	var req struct {
		Code string `json:"code"`
	}
	c.ShouldBindJSON(&req)
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "2FA berhasil dinonaktifkan"})
		return
	}
	userID := c.GetString("user_id")
	var secret string
	database.DB.QueryRow("SELECT totp_secret FROM users WHERE id=$1", userID).Scan(&secret)
	if req.Code != "" && !verifyTOTPCode(secret, req.Code) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Kode OTP tidak valid"})
		return
	}
	database.DB.Exec("UPDATE users SET totp_enabled=false, totp_secret=NULL, totp_backup_codes=NULL WHERE id=$1", userID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func RegenerateBackupCodes(c *gin.Context) {
	codes := genBackupCodes()
	if database.DB != nil {
		userID := c.GetString("user_id")
		database.DB.Exec("UPDATE users SET totp_backup_codes=$1 WHERE id=$2", strings.Join(codes, ","), userID)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "backup_codes": codes})
}

// ── Sessions ─────────────────────────────────────────────────────────────────

func GetSessions(c *gin.Context) {
	if database.DB == nil {
		now := time.Now()
		c.JSON(http.StatusOK, gin.H{"value": []gin.H{
			{"id": "sess-001", "device": "Chrome 125 — Windows 11", "ip": "192.168.1.100", "location": "Jakarta, ID", "last_active": now.Add(-5 * time.Minute).Format(time.RFC3339), "current": true, "created_at": now.Add(-2 * time.Hour).Format(time.RFC3339)},
			{"id": "sess-002", "device": "Safari Mobile — iPhone 14", "ip": "103.20.45.88", "location": "Jakarta, ID", "last_active": now.Add(-2 * time.Hour).Format(time.RFC3339), "current": false, "created_at": now.Add(-24 * time.Hour).Format(time.RFC3339)},
			{"id": "sess-003", "device": "Chrome 124 — MacBook Pro", "ip": "10.0.0.55", "location": "Surabaya, ID", "last_active": now.Add(-26 * time.Hour).Format(time.RFC3339), "current": false, "created_at": now.Add(-72 * time.Hour).Format(time.RFC3339)},
		}})
		return
	}
	userID := c.GetString("user_id")
	rows, err := database.DB.Query(
		`SELECT id, device, ip, location, last_active, is_current, created_at
		 FROM user_sessions WHERE user_id=$1 ORDER BY last_active DESC`, userID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"value": []gin.H{}})
		return
	}
	defer rows.Close()
	var sessions []gin.H
	for rows.Next() {
		var id, device, ip, location string
		var lastActive, createdAt time.Time
		var current bool
		rows.Scan(&id, &device, &ip, &location, &lastActive, &current, &createdAt)
		sessions = append(sessions, gin.H{
			"id": id, "device": device, "ip": ip, "location": location,
			"last_active": lastActive.Format(time.RFC3339), "current": current,
			"created_at": createdAt.Format(time.RFC3339),
		})
	}
	if sessions == nil {
		sessions = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"value": sessions})
}

func RevokeSession(c *gin.Context) {
	sessID := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Session berhasil dihapus"})
		return
	}
	userID := c.GetString("user_id")
	database.DB.Exec("DELETE FROM user_sessions WHERE id=$1 AND user_id=$2 AND is_current=false", sessID, userID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func RevokeAllSessions(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Semua session lain berhasil dihapus"})
		return
	}
	userID := c.GetString("user_id")
	database.DB.Exec("DELETE FROM user_sessions WHERE user_id=$1 AND is_current=false", userID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ── Audit Trail ───────────────────────────────────────────────────────────────

var demoAudit = []gin.H{
	{"id": "1", "user_name": "Admin Sistem", "user_email": "admin@sep.id", "action": "LOGIN", "module": "Auth", "description": "Login berhasil dari Chrome/Windows 11", "ip": "192.168.1.100", "old_data": nil, "new_data": nil},
	{"id": "2", "user_name": "Finance Manager", "user_email": "finance@sep.id", "action": "CREATE", "module": "Finance", "description": "Buat Bank Account BCA Operasional (acc: 1234567890)", "ip": "192.168.1.101", "old_data": nil, "new_data": gin.H{"bank_name": "BCA", "account_number": "1234567890", "balance": 500000000}},
	{"id": "3", "user_name": "Admin Sistem", "user_email": "admin@sep.id", "action": "UPDATE", "module": "Settings", "description": "Update role user: warehouse@sep.id", "ip": "192.168.1.100", "old_data": gin.H{"role": "operator"}, "new_data": gin.H{"role": "warehouse"}},
	{"id": "4", "user_name": "Sales Manager", "user_email": "sales@sep.id", "action": "CREATE", "module": "Sales", "description": "Buat Sales Order SO/2026/0042 — Customer PT ABC", "ip": "10.0.0.45", "old_data": nil, "new_data": gin.H{"so_number": "SO/2026/0042", "total": 15750000}},
	{"id": "5", "user_name": "Finance Manager", "user_email": "finance@sep.id", "action": "UPDATE", "module": "Finance", "description": "Update status VI/2026/0018: unpaid → paid", "ip": "192.168.1.101", "old_data": gin.H{"status": "unpaid"}, "new_data": gin.H{"status": "paid", "paid_amount": 12500000}},
	{"id": "6", "user_name": "HR Manager", "user_email": "hr@sep.id", "action": "CREATE", "module": "HRIS", "description": "Tambah karyawan baru: Budi Santoso (EMP-025)", "ip": "10.0.0.88", "old_data": nil, "new_data": gin.H{"name": "Budi Santoso", "position": "Staff Produksi", "salary": 5500000}},
	{"id": "7", "user_name": "Purchasing Staff", "user_email": "purchasing@sep.id", "action": "CREATE", "module": "Purchasing", "description": "Buat Purchase Order PO/2026/0015 — PT Bahan Prima", "ip": "10.0.0.23", "old_data": nil, "new_data": gin.H{"po_number": "PO/2026/0015", "total": 8750000}},
	{"id": "8", "user_name": "Admin Sistem", "user_email": "admin@sep.id", "action": "DELETE", "module": "Settings", "description": "Hapus user: testuser@sep.id", "ip": "192.168.1.100", "old_data": gin.H{"email": "testuser@sep.id", "role": "viewer"}, "new_data": nil},
	{"id": "9", "user_name": "—", "user_email": "hacker@example.com", "action": "LOGIN_FAILED", "module": "Auth", "description": "Login gagal — password salah (percobaan ke-3)", "ip": "203.0.113.42", "old_data": nil, "new_data": nil},
	{"id": "10", "user_name": "Finance Manager", "user_email": "finance@sep.id", "action": "CREATE", "module": "Accounting", "description": "Input Jurnal Umum JE/2026/0025 — Beban Gaji", "ip": "192.168.1.101", "old_data": nil, "new_data": gin.H{"ref": "JE/2026/0025", "total_debit": 45000000}},
	{"id": "11", "user_name": "Warehouse Staff", "user_email": "warehouse@sep.id", "action": "UPDATE", "module": "Warehouse", "description": "Stock Opname — selisih stok produk SKU-001: -3 pcs", "ip": "10.0.0.99", "old_data": gin.H{"qty": 150}, "new_data": gin.H{"qty": 147, "adjusted": true}},
	{"id": "12", "user_name": "Admin Sistem", "user_email": "admin@sep.id", "action": "CREATE", "module": "Settings", "description": "Buat API Key baru: Integration Shopee", "ip": "192.168.1.100", "old_data": nil, "new_data": gin.H{"name": "Integration Shopee", "permissions": []string{"products.read", "inventory.read"}}},
	{"id": "13", "user_name": "Sales Manager", "user_email": "sales@sep.id", "action": "UPDATE", "module": "Sales", "description": "Approve SO/2026/0041 — senilai Rp 28.500.000", "ip": "10.0.0.45", "old_data": gin.H{"status": "pending"}, "new_data": gin.H{"status": "approved", "approved_by": "Sales Manager"}},
	{"id": "14", "user_name": "Finance Manager", "user_email": "finance@sep.id", "action": "UPDATE", "module": "Accounting", "description": "Tutup periode Mei 2026", "ip": "192.168.1.101", "old_data": gin.H{"status": "open"}, "new_data": gin.H{"status": "closed"}},
	{"id": "15", "user_name": "Admin Sistem", "user_email": "admin@sep.id", "action": "UPDATE", "module": "Settings", "description": "Update kebijakan keamanan: enforce 2FA diaktifkan", "ip": "192.168.1.100", "old_data": gin.H{"enforce_2fa": false}, "new_data": gin.H{"enforce_2fa": true}},
}

func GetAuditTrail(c *gin.Context) {
	module := c.Query("module")
	action := c.Query("action")
	search := c.Query("$search")
	pageStr := c.DefaultQuery("$skip", "0")
	limitStr := c.DefaultQuery("$top", "25")
	skip, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)
	if limit < 1 {
		limit = 25
	}

	if database.DB == nil {
		now := time.Now()
		var filtered []gin.H
		for i, row := range demoAudit {
			r := make(gin.H)
			for k, v := range row {
				r[k] = v
			}
			r["timestamp"] = now.Add(-time.Duration(i)*47*time.Minute).Format(time.RFC3339)
			if module != "" && fmt.Sprintf("%v", r["module"]) != module {
				continue
			}
			if action != "" && fmt.Sprintf("%v", r["action"]) != action {
				continue
			}
			if search != "" {
				haystack := strings.ToLower(fmt.Sprintf("%v %v %v", r["description"], r["user_name"], r["module"]))
				if !strings.Contains(haystack, strings.ToLower(search)) {
					continue
				}
			}
			filtered = append(filtered, r)
		}
		total := len(filtered)
		start := skip
		end := skip + limit
		if start > total {
			start = total
		}
		if end > total {
			end = total
		}
		if filtered == nil {
			filtered = []gin.H{}
		}
		c.JSON(http.StatusOK, gin.H{"@odata.count": total, "value": filtered[start:end]})
		return
	}

	companyID := c.GetString("company_id")
	where := "company_id=$1"
	args := []interface{}{companyID}
	n := 2
	if module != "" {
		where += fmt.Sprintf(" AND module=$%d", n)
		args = append(args, module)
		n++
	}
	if action != "" {
		where += fmt.Sprintf(" AND action=$%d", n)
		args = append(args, action)
		n++
	}
	if search != "" {
		where += fmt.Sprintf(" AND description ILIKE $%d", n)
		args = append(args, "%"+search+"%")
		n++
	}
	q := fmt.Sprintf(`SELECT id, created_at, user_name, user_email, action, module, description, ip,
		COALESCE(old_data::text,'null'), COALESCE(new_data::text,'null')
		FROM audit_logs WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, n, n+1)
	args = append(args, limit, skip)
	rows, err := database.DB.Query(q, args...)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"@odata.count": 0, "value": []gin.H{}})
		return
	}
	defer rows.Close()
	var result []gin.H
	for rows.Next() {
		var id, uName, uEmail, act, mod, desc2, ip, oldRaw, newRaw string
		var ts time.Time
		rows.Scan(&id, &ts, &uName, &uEmail, &act, &mod, &desc2, &ip, &oldRaw, &newRaw)
		result = append(result, gin.H{
			"id": id, "timestamp": ts.Format(time.RFC3339),
			"user_name": uName, "user_email": uEmail,
			"action": act, "module": mod, "description": desc2,
			"ip": ip, "old_data": oldRaw, "new_data": newRaw,
		})
	}
	var total int
	database.DB.QueryRow("SELECT COUNT(*) FROM audit_logs WHERE "+where, args[:n-1]...).Scan(&total)
	if result == nil {
		result = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": total, "value": result})
}

func ExportAuditTrail(c *gin.Context) {
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", `attachment; filename="audit_trail.csv"`)
	w := csv.NewWriter(c.Writer)
	w.Write([]string{"Timestamp", "User", "Email", "Action", "Module", "Deskripsi", "IP"})
	now := time.Now()
	for i, row := range demoAudit {
		ts := now.Add(-time.Duration(i) * 47 * time.Minute).Format("2006-01-02 15:04:05")
		w.Write([]string{
			ts,
			fmt.Sprintf("%v", row["user_name"]),
			fmt.Sprintf("%v", row["user_email"]),
			fmt.Sprintf("%v", row["action"]),
			fmt.Sprintf("%v", row["module"]),
			fmt.Sprintf("%v", row["description"]),
			fmt.Sprintf("%v", row["ip"]),
		})
	}
	w.Flush()
}

// ── Security Policy ───────────────────────────────────────────────────────────

type SecurityPolicy struct {
	MinPasswordLength  int  `json:"min_password_length"`
	RequireUppercase   bool `json:"require_uppercase"`
	RequireNumber      bool `json:"require_number"`
	RequireSpecial     bool `json:"require_special"`
	PasswordExpiryDays int  `json:"password_expiry_days"`
	MaxLoginAttempts   int  `json:"max_login_attempts"`
	LockoutMinutes     int  `json:"lockout_minutes"`
	SessionTimeoutMin  int  `json:"session_timeout_min"`
	Enforce2FA         bool `json:"enforce_2fa"`
}

var defaultSecPolicy = SecurityPolicy{
	MinPasswordLength:  8,
	RequireUppercase:   true,
	RequireNumber:      true,
	RequireSpecial:     false,
	PasswordExpiryDays: 90,
	MaxLoginAttempts:   5,
	LockoutMinutes:     30,
	SessionTimeoutMin:  120,
	Enforce2FA:         false,
}

func GetSecurityPolicy(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, defaultSecPolicy)
		return
	}
	companyID := c.GetString("company_id")
	var minLen, expiryDays, maxAttempts, lockoutMin, sessionMin int
	var requireUpper, requireNum, requireSpec, enforce2fa bool
	err := database.DB.QueryRow(
		`SELECT min_password_length, require_uppercase, require_number, require_special,
		 password_expiry_days, max_login_attempts, lockout_minutes, session_timeout_min, enforce_2fa
		 FROM security_policies WHERE company_id=$1`, companyID,
	).Scan(&minLen, &requireUpper, &requireNum, &requireSpec, &expiryDays, &maxAttempts, &lockoutMin, &sessionMin, &enforce2fa)
	if err != nil {
		c.JSON(http.StatusOK, defaultSecPolicy)
		return
	}
	c.JSON(http.StatusOK, SecurityPolicy{minLen, requireUpper, requireNum, requireSpec, expiryDays, maxAttempts, lockoutMin, sessionMin, enforce2fa})
}

func UpdateSecurityPolicy(c *gin.Context) {
	var policy SecurityPolicy
	if err := c.ShouldBindJSON(&policy); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Kebijakan keamanan berhasil disimpan"})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.Exec(`
		INSERT INTO security_policies (company_id, min_password_length, require_uppercase, require_number,
		require_special, password_expiry_days, max_login_attempts, lockout_minutes, session_timeout_min, enforce_2fa)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		ON CONFLICT (company_id) DO UPDATE SET
		min_password_length=$2, require_uppercase=$3, require_number=$4, require_special=$5,
		password_expiry_days=$6, max_login_attempts=$7, lockout_minutes=$8, session_timeout_min=$9, enforce_2fa=$10`,
		companyID, policy.MinPasswordLength, policy.RequireUppercase, policy.RequireNumber,
		policy.RequireSpecial, policy.PasswordExpiryDays, policy.MaxLoginAttempts,
		policy.LockoutMinutes, policy.SessionTimeoutMin, policy.Enforce2FA,
	)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Kebijakan keamanan berhasil disimpan"})
}
