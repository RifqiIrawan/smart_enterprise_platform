package handlers

import (
	"fmt"
	"net/http"
	"sep/backend/internal/database"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Tax Config ───────────────────────────────────────────────────────────────

var defaultTaxConfigs = []gin.H{
	{"config_key": "ppn_rate", "config_value": 12, "description": "Tarif PPN (%)"},
	{"config_key": "pph23_jasa", "config_value": 2, "description": "PPh 23 Jasa (%)"},
	{"config_key": "pph23_dividen", "config_value": 15, "description": "PPh 23 Dividen (%)"},
	{"config_key": "bpjs_jht_ee", "config_value": 2, "description": "BPJS JHT Karyawan (%)"},
	{"config_key": "bpjs_jht_er", "config_value": 3.7, "description": "BPJS JHT Perusahaan (%)"},
	{"config_key": "bpjs_jp_ee", "config_value": 1, "description": "BPJS JP Karyawan (%)"},
	{"config_key": "bpjs_jp_er", "config_value": 2, "description": "BPJS JP Perusahaan (%)"},
	{"config_key": "bpjs_jkk", "config_value": 0.24, "description": "BPJS JKK (%)"},
	{"config_key": "bpjs_jkm", "config_value": 0.3, "description": "BPJS JKM (%)"},
	{"config_key": "bpjs_kes_ee", "config_value": 1, "description": "BPJS Kesehatan Karyawan (%)"},
	{"config_key": "bpjs_kes_er", "config_value": 4, "description": "BPJS Kesehatan Perusahaan (%)"},
}

func GetTaxConfigs(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"@odata.count": len(defaultTaxConfigs), "value": defaultTaxConfigs})
		return
	}
	rows, err := database.DB.Query(
		`SELECT config_key, config_value, COALESCE(description,''), updated_at FROM tax_configs WHERE company_id=$1 ORDER BY config_key`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var key, desc string
		var val float64
		var updAt time.Time
		rows.Scan(&key, &val, &desc, &updAt)
		list = append(list, gin.H{"config_key": key, "config_value": val, "description": desc, "updated_at": updAt})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func UpsertTaxConfig(c *gin.Context) {
	companyID := c.GetString("company_id")
	var body struct {
		ConfigKey   string  `json:"config_key"`
		ConfigValue float64 `json:"config_value"`
		Description string  `json:"description"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Config saved (demo)"})
		return
	}
	_, err := database.DB.Exec(
		`INSERT INTO tax_configs (company_id, config_key, config_value, description)
		 VALUES ($1,$2,$3,$4)
		 ON CONFLICT (company_id, config_key) DO UPDATE SET config_value=$3, description=$4, updated_at=NOW()`,
		companyID, body.ConfigKey, body.ConfigValue, body.Description,
	)
	if err != nil {
		// Fallback: no unique constraint yet — try upsert via delete+insert
		database.DB.Exec(`DELETE FROM tax_configs WHERE company_id=$1 AND config_key=$2`, companyID, body.ConfigKey)
		database.DB.Exec(`INSERT INTO tax_configs (company_id, config_key, config_value, description) VALUES ($1,$2,$3,$4)`,
			companyID, body.ConfigKey, body.ConfigValue, body.Description)
	}
	c.JSON(http.StatusOK, gin.H{"message": "Konfigurasi disimpan"})
}

// ─── PPN / Faktur Pajak ───────────────────────────────────────────────────────

func GetFakturPajakKeluaran(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 3,
			"value": []gin.H{
				{"inv_number": "INV/2026/0001", "customer_name": "PT Maju Bersama", "date": "2026-06-10", "subtotal": 13513514, "tax_amount": 1621622, "total": 15135136, "status": "unpaid"},
				{"inv_number": "INV/2026/0002", "customer_name": "CV Sukses Mandiri", "date": "2026-06-15", "subtotal": 27027027, "tax_amount": 3243243, "total": 30270270, "status": "paid"},
				{"inv_number": "INV/2026/0003", "customer_name": "PT Global Teknindo", "date": "2026-06-20", "subtotal": 45045045, "tax_amount": 5405405, "total": 50450450, "status": "unpaid"},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT inv_number, COALESCE(customer_name,''), date, subtotal, tax_amount, total, status
		 FROM customer_invoices WHERE company_id=$1 ORDER BY date DESC`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var invNum, custName, status string
		var date time.Time
		var subtotal, taxAmt, total int64
		rows.Scan(&invNum, &custName, &date, &subtotal, &taxAmt, &total, &status)
		list = append(list, gin.H{
			"inv_number": invNum, "customer_name": custName,
			"date": date.Format("2006-01-02"), "subtotal": subtotal,
			"tax_amount": taxAmt, "total": total, "status": status,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func GetFakturPajakMasukan(c *gin.Context) {
	companyID := c.GetString("company_id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 2,
			"value": []gin.H{
				{"vi_number": "VI/2026/0001", "vendor_name": "PT Supplier Utama", "inv_date": "2026-06-01", "subtotal": 10000000, "tax_amount": 1100000, "total": 11100000, "status": "unpaid"},
				{"vi_number": "VI/2026/0002", "vendor_name": "CV Bahan Baku Jaya", "inv_date": "2026-06-05", "subtotal": 5000000, "tax_amount": 550000, "total": 5550000, "status": "paid"},
			},
		})
		return
	}
	rows, err := database.DB.Query(
		`SELECT vi_number, COALESCE(vendor_name,''), inv_date, subtotal, tax_amount, total, status
		 FROM vendor_invoices WHERE company_id=$1 ORDER BY inv_date DESC`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var viNum, vendorName, status string
		var invDate time.Time
		var subtotal, taxAmt, total int64
		rows.Scan(&viNum, &vendorName, &invDate, &subtotal, &taxAmt, &total, &status)
		list = append(list, gin.H{
			"vi_number": viNum, "vendor_name": vendorName,
			"inv_date": invDate.Format("2006-01-02"), "subtotal": subtotal,
			"tax_amount": taxAmt, "total": total, "status": status,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func GetRekapPPN(c *gin.Context) {
	companyID := c.GetString("company_id")
	period := c.Query("period") // YYYY-MM
	if period == "" {
		period = time.Now().Format("2006-01")
	}
	if database.DB == nil {
		// Demo: generate rekap for last 6 months
		var rekap []gin.H
		for i := 5; i >= 0; i-- {
			t := time.Now().AddDate(0, -i, 0)
			p := t.Format("2006-01")
			pk := int64(15000000 + i*2000000)
			pm := int64(8000000 + i*1000000)
			selisih := pk - pm
			status := "kurang_bayar"
			if selisih < 0 {
				status = "lebih_bayar"
			}
			rekap = append(rekap, gin.H{"period": p, "total_pk": pk, "total_pm": pm, "selisih": selisih, "status": status})
		}
		c.JSON(http.StatusOK, gin.H{"@odata.count": len(rekap), "value": rekap, "current_period": period})
		return
	}
	var totalPK, totalPM int64
	database.DB.QueryRow(
		`SELECT COALESCE(SUM(tax_amount),0) FROM customer_invoices WHERE company_id=$1 AND to_char(date,'YYYY-MM')=$2`, companyID, period,
	).Scan(&totalPK)
	database.DB.QueryRow(
		`SELECT COALESCE(SUM(tax_amount),0) FROM vendor_invoices WHERE company_id=$1 AND to_char(inv_date,'YYYY-MM')=$2`, companyID, period,
	).Scan(&totalPM)
	selisih := totalPK - totalPM
	status := "kurang_bayar"
	if selisih < 0 {
		status = "lebih_bayar"
	}
	c.JSON(http.StatusOK, gin.H{
		"period": period, "total_pk": totalPK, "total_pm": totalPM,
		"selisih": selisih, "status": status,
	})
}

// ─── PPh 21 ───────────────────────────────────────────────────────────────────

var ptkpTable = map[string]int64{
	"TK/0": 54_000_000, "TK/1": 58_500_000, "TK/2": 63_000_000, "TK/3": 67_500_000,
	"K/0":  58_500_000, "K/1":  63_000_000, "K/2":  67_500_000, "K/3":  72_000_000,
}

func hitungProgresif(pkp int64) int64 {
	switch {
	case pkp <= 60_000_000:
		return pkp * 5 / 100
	case pkp <= 250_000_000:
		return 3_000_000 + (pkp-60_000_000)*15/100
	case pkp <= 500_000_000:
		return 31_500_000 + (pkp-250_000_000)*25/100
	case pkp <= 5_000_000_000:
		return 94_000_000 + (pkp-500_000_000)*30/100
	default:
		return 1_444_000_000 + (pkp-5_000_000_000)*35/100
	}
}

func int64Min(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}

func int64Max(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}

func GetPPh21(c *gin.Context) {
	companyID := c.GetString("company_id")
	period := c.Query("period")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 5,
			"value": []gin.H{
				{"id": "p1", "employee_name": "Budi Santoso", "period": "2026-06", "bruto_gaji": 8000000, "ptkp_status": "K/1", "ptkp_amount": 63000000, "pkp": 33000000, "pph21_sebulan": 137500},
				{"id": "p2", "employee_name": "Siti Rahayu", "period": "2026-06", "bruto_gaji": 12000000, "ptkp_status": "TK/0", "ptkp_amount": 54000000, "pkp": 78240000, "pph21_sebulan": 325500},
				{"id": "p3", "employee_name": "Ahmad Fauzi", "period": "2026-06", "bruto_gaji": 20000000, "ptkp_status": "K/2", "ptkp_amount": 67500000, "pkp": 171000000, "pph21_sebulan": 1387500},
				{"id": "p4", "employee_name": "Dewi Kusuma", "period": "2026-06", "bruto_gaji": 7500000, "ptkp_status": "TK/0", "ptkp_amount": 54000000, "pkp": 21300000, "pph21_sebulan": 88750},
				{"id": "p5", "employee_name": "Hendra Wijaya", "period": "2026-06", "bruto_gaji": 35000000, "ptkp_status": "K/3", "ptkp_amount": 72000000, "pkp": 330600000, "pph21_sebulan": 3762500},
			},
		})
		return
	}
	query := `SELECT id, COALESCE(employee_name,''), period, bruto_gaji, ptkp_status, ptkp_amount, pkp, pph21_sebulan
	           FROM pph21_calculations WHERE company_id=$1`
	args := []interface{}{companyID}
	if period != "" {
		query += " AND period=$2"
		args = append(args, period)
	}
	query += " ORDER BY employee_name"
	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, empName, per, ptkpStatus string
		var bruto, ptkpAmt, pkp, pph21Sebulan int64
		rows.Scan(&id, &empName, &per, &bruto, &ptkpStatus, &ptkpAmt, &pkp, &pph21Sebulan)
		list = append(list, gin.H{
			"id": id, "employee_name": empName, "period": per, "bruto_gaji": bruto,
			"ptkp_status": ptkpStatus, "ptkp_amount": ptkpAmt, "pkp": pkp, "pph21_sebulan": pph21Sebulan,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func GeneratePPh21(c *gin.Context) {
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var body struct {
		Period      string `json:"period"`
		PTKPDefault string `json:"ptkp_default"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Period == "" {
		body.Period = time.Now().Format("2006-01")
	}
	if body.PTKPDefault == "" {
		body.PTKPDefault = "TK/0"
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "PPh 21 dihitung (demo)", "count": 5})
		return
	}

	// Delete existing for this period
	database.DB.Exec(`DELETE FROM pph21_calculations WHERE company_id=$1 AND period=$2`, companyID, body.Period)

	// Fetch active employees
	rows, err := database.DB.Query(
		`SELECT id, name, salary FROM employees WHERE company_id=$1 AND status='active'`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	ptkp := ptkpTable[body.PTKPDefault]
	if ptkp == 0 {
		ptkp = 54_000_000
	}
	count := 0
	for rows.Next() {
		var empID, empName string
		var salary int64
		rows.Scan(&empID, &empName, &salary)

		brutoSetahun := salary * 12
		biayaJabatan := int64Min(brutoSetahun*5/100, 6_000_000)
		penghNeto := brutoSetahun - biayaJabatan
		pkp := int64Max(0, penghNeto-ptkp)
		pph21Setahun := hitungProgresif(pkp)
		pph21Sebulan := pph21Setahun / 12

		if _, err := database.DB.Exec(
			`INSERT INTO pph21_calculations
			 (company_id, employee_id, employee_name, period, bruto_gaji, biaya_jabatan, penghasilan_neto, ptkp_status, ptkp_amount, pkp, pph21_setahun, pph21_sebulan, created_by)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
			companyID, empID, empName, body.Period, salary, biayaJabatan, penghNeto,
			body.PTKPDefault, ptkp, pkp, pph21Setahun, pph21Sebulan, userID,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		count++
	}
	database.WriteAuditLog(userID, "generate", "pph21", companyID, fmt.Sprintf("PPh 21 %s: %d karyawan", body.Period, count), c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("PPh 21 berhasil dihitung untuk %d karyawan", count), "count": count})
}

func DeletePPh21(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	database.DB.Exec(`DELETE FROM pph21_calculations WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "Data PPh 21 dihapus"})
}

// ─── PPh 23 ───────────────────────────────────────────────────────────────────

func GetPPh23(c *gin.Context) {
	companyID := c.GetString("company_id")
	period := c.Query("period")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 2,
			"value": []gin.H{
				{"id": "bp1", "bukti_number": "BP23/2026/0001", "vendor_name": "PT Konsultan Teknologi", "npwp": "01.234.567.8-901.000", "period": "2026-06", "jenis_penghasilan": "Jasa Konsultasi", "bruto": 10000000, "tarif": 2, "pph23": 200000},
				{"id": "bp2", "bukti_number": "BP23/2026/0002", "vendor_name": "CV Jasa Manajemen", "npwp": "02.345.678.9-012.000", "period": "2026-06", "jenis_penghasilan": "Jasa Manajemen", "bruto": 25000000, "tarif": 2, "pph23": 500000},
			},
		})
		return
	}
	query := `SELECT id, bukti_number, COALESCE(vendor_name,''), COALESCE(npwp,''), period,
	           COALESCE(jenis_penghasilan,''), bruto, tarif, pph23, COALESCE(notes,''), created_at
	           FROM pph23_records WHERE company_id=$1`
	args := []interface{}{companyID}
	if period != "" {
		query += " AND period=$2"
		args = append(args, period)
	}
	query += " ORDER BY created_at DESC"
	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, buktiNum, vendorName, npwp, per, jenisPhsl, notes string
		var bruto, pph23 int64
		var tarif float64
		var createdAt time.Time
		rows.Scan(&id, &buktiNum, &vendorName, &npwp, &per, &jenisPhsl, &bruto, &tarif, &pph23, &notes, &createdAt)
		list = append(list, gin.H{
			"id": id, "bukti_number": buktiNum, "vendor_name": vendorName, "npwp": npwp,
			"period": per, "jenis_penghasilan": jenisPhsl, "bruto": bruto, "tarif": tarif,
			"pph23": pph23, "notes": notes,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func CreatePPh23(c *gin.Context) {
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var body struct {
		VendorName      string  `json:"vendor_name"`
		NPWP            string  `json:"npwp"`
		Period          string  `json:"period"`
		JenisPenghasilan string `json:"jenis_penghasilan"`
		Bruto           int64   `json:"bruto"`
		Tarif           float64 `json:"tarif"`
		Notes           string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"message": "PPh 23 dicatat (demo)"})
		return
	}
	pph23 := int64(float64(body.Bruto) * body.Tarif / 100)
	var count int
	database.DB.QueryRow(`SELECT COUNT(*) FROM pph23_records WHERE company_id=$1`, companyID).Scan(&count)
	buktiNumber := fmt.Sprintf("BP23/%s/%04d", time.Now().Format("2006"), count+1)

	var id string
	err := database.DB.QueryRow(
		`INSERT INTO pph23_records (company_id, bukti_number, vendor_name, npwp, period, jenis_penghasilan, bruto, tarif, pph23, notes, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
		companyID, buktiNumber, body.VendorName, body.NPWP, body.Period,
		body.JenisPenghasilan, body.Bruto, body.Tarif, pph23, body.Notes, userID,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	database.WriteAuditLog(userID, "create", "pph23", id, "PPh 23: "+body.VendorName, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"id": id, "bukti_number": buktiNumber, "pph23": pph23, "message": "PPh 23 berhasil dicatat"})
}

func DeletePPh23(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	database.DB.Exec(`DELETE FROM pph23_records WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "Data PPh 23 dihapus"})
}

// ─── BPJS ────────────────────────────────────────────────────────────────────

func GetBPJS(c *gin.Context) {
	companyID := c.GetString("company_id")
	period := c.Query("period")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"@odata.count": 5,
			"value": []gin.H{
				{"id": "b1", "employee_name": "Budi Santoso", "period": "2026-06", "gaji_pokok": 8000000, "jht_employee": 160000, "jht_company": 296000, "jp_employee": 80000, "jp_company": 160000, "jkk": 19200, "jkm": 24000, "kesehatan_employee": 80000, "kesehatan_company": 320000, "total_potongan_employee": 320000, "total_iuran_company": 819200},
				{"id": "b2", "employee_name": "Siti Rahayu", "period": "2026-06", "gaji_pokok": 12000000, "jht_employee": 240000, "jht_company": 444000, "jp_employee": 95596, "jp_company": 191192, "jkk": 28800, "jkm": 36000, "kesehatan_employee": 120000, "kesehatan_company": 480000, "total_potongan_employee": 455596, "total_iuran_company": 1179992},
				{"id": "b3", "employee_name": "Ahmad Fauzi", "period": "2026-06", "gaji_pokok": 20000000, "jht_employee": 400000, "jht_company": 740000, "jp_employee": 95596, "jp_company": 191192, "jkk": 48000, "jkm": 60000, "kesehatan_employee": 120000, "kesehatan_company": 480000, "total_potongan_employee": 615596, "total_iuran_company": 1519192},
				{"id": "b4", "employee_name": "Dewi Kusuma", "period": "2026-06", "gaji_pokok": 7500000, "jht_employee": 150000, "jht_company": 277500, "jp_employee": 75000, "jp_company": 150000, "jkk": 18000, "jkm": 22500, "kesehatan_employee": 75000, "kesehatan_company": 300000, "total_potongan_employee": 300000, "total_iuran_company": 768000},
				{"id": "b5", "employee_name": "Hendra Wijaya", "period": "2026-06", "gaji_pokok": 35000000, "jht_employee": 700000, "jht_company": 1295000, "jp_employee": 95596, "jp_company": 191192, "jkk": 84000, "jkm": 105000, "kesehatan_employee": 120000, "kesehatan_company": 480000, "total_potongan_employee": 915596, "total_iuran_company": 2155192},
			},
		})
		return
	}
	query := `SELECT id, COALESCE(employee_name,''), period, gaji_pokok,
	           jht_employee, jht_company, jp_employee, jp_company, jkk, jkm,
	           kesehatan_employee, kesehatan_company, total_potongan_employee, total_iuran_company
	           FROM bpjs_calculations WHERE company_id=$1`
	args := []interface{}{companyID}
	if period != "" {
		query += " AND period=$2"
		args = append(args, period)
	}
	query += " ORDER BY employee_name"
	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var list []gin.H
	for rows.Next() {
		var id, empName, per string
		var gajiPokok, jhtEE, jhtER, jpEE, jpER, jkk, jkm, kesEE, kesER, totalEE, totalER int64
		rows.Scan(&id, &empName, &per, &gajiPokok, &jhtEE, &jhtER, &jpEE, &jpER, &jkk, &jkm, &kesEE, &kesER, &totalEE, &totalER)
		list = append(list, gin.H{
			"id": id, "employee_name": empName, "period": per, "gaji_pokok": gajiPokok,
			"jht_employee": jhtEE, "jht_company": jhtER, "jp_employee": jpEE, "jp_company": jpER,
			"jkk": jkk, "jkm": jkm, "kesehatan_employee": kesEE, "kesehatan_company": kesER,
			"total_potongan_employee": totalEE, "total_iuran_company": totalER,
		})
	}
	if list == nil {
		list = []gin.H{}
	}
	c.JSON(http.StatusOK, gin.H{"@odata.count": len(list), "value": list})
}

func GenerateBPJS(c *gin.Context) {
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var body struct {
		Period string `json:"period"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.Period == "" {
		body.Period = time.Now().Format("2006-01")
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "BPJS dihitung (demo)", "count": 5})
		return
	}

	database.DB.Exec(`DELETE FROM bpjs_calculations WHERE company_id=$1 AND period=$2`, companyID, body.Period)

	rows, err := database.DB.Query(
		`SELECT id, name, salary FROM employees WHERE company_id=$1 AND status='active'`, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	const maxJP int64 = 9_559_600
	const maxKes int64 = 12_000_000
	count := 0
	for rows.Next() {
		var empID, empName string
		var gaji int64
		rows.Scan(&empID, &empName, &gaji)

		gajiJP := int64Min(gaji, maxJP)
		gajiJK := int64Min(gaji, maxKes)

		jhtEE := gaji * 2 / 100
		jhtER := gaji * 37 / 1000
		jpEE := gajiJP * 1 / 100
		jpER := gajiJP * 2 / 100
		jkk := gaji * 24 / 10000
		jkm := gaji * 3 / 1000
		kesEE := gajiJK * 1 / 100
		kesER := gajiJK * 4 / 100
		totalEE := jhtEE + jpEE + kesEE
		totalER := jhtER + jpER + jkk + jkm + kesER

		if _, err := database.DB.Exec(
			`INSERT INTO bpjs_calculations
			 (company_id, employee_id, employee_name, period, gaji_pokok,
			  jht_employee, jht_company, jp_employee, jp_company, jkk, jkm,
			  kesehatan_employee, kesehatan_company, total_potongan_employee, total_iuran_company)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
			companyID, empID, empName, body.Period, gaji,
			jhtEE, jhtER, jpEE, jpER, jkk, jkm, kesEE, kesER, totalEE, totalER,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		count++
	}
	database.WriteAuditLog(userID, "generate", "bpjs", companyID, fmt.Sprintf("BPJS %s: %d karyawan", body.Period, count), c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("BPJS berhasil dihitung untuk %d karyawan", count), "count": count})
}

func DeleteBPJS(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Deleted (demo)"})
		return
	}
	database.DB.Exec(`DELETE FROM bpjs_calculations WHERE id=$1`, id)
	c.JSON(http.StatusOK, gin.H{"message": "Data BPJS dihapus"})
}
