package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

func init() {
	RegisterApprovalFinalizer("finance", "jurnal", func(docID, finalStatus string) {
		newStatus := "posted"
		if finalStatus == "rejected" {
			newStatus = "rejected"
		}
		database.DB.Exec(`UPDATE journal_entries SET status=$1 WHERE id=$2`, newStatus, docID)
	})
}

// ACC-01: Chart of Accounts
func GetCOA(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "1", "code": "1-0000", "name": "AKTIVA", "type": "header", "parent_id": ""},
			{"id": "2", "code": "1-1000", "name": "Aktiva Lancar", "type": "header", "parent_id": "1"},
			{"id": "3", "code": "1-1100", "name": "Kas & Setara Kas", "type": "account", "parent_id": "2"},
			{"id": "4", "code": "1-1200", "name": "Piutang Usaha", "type": "account", "parent_id": "2"},
			{"id": "5", "code": "1-1300", "name": "Persediaan Barang", "type": "account", "parent_id": "2"},
			{"id": "6", "code": "1-2000", "name": "Aktiva Tetap", "type": "header", "parent_id": "1"},
			{"id": "7", "code": "1-2100", "name": "Mesin & Peralatan", "type": "account", "parent_id": "6"},
			{"id": "8", "code": "2-0000", "name": "KEWAJIBAN", "type": "header", "parent_id": ""},
			{"id": "9", "code": "2-1000", "name": "Hutang Usaha", "type": "account", "parent_id": "8"},
			{"id": "10", "code": "3-0000", "name": "EKUITAS", "type": "header", "parent_id": ""},
			{"id": "11", "code": "3-1000", "name": "Modal Disetor", "type": "account", "parent_id": "10"},
			{"id": "12", "code": "4-0000", "name": "PENDAPATAN", "type": "header", "parent_id": ""},
			{"id": "13", "code": "4-1000", "name": "Pendapatan Penjualan", "type": "account", "parent_id": "12"},
			{"id": "14", "code": "5-0000", "name": "BEBAN", "type": "header", "parent_id": ""},
			{"id": "15", "code": "5-1000", "name": "Beban Gaji", "type": "account", "parent_id": "14"},
			{"id": "16", "code": "5-1100", "name": "Beban Pembelian", "type": "account", "parent_id": "14"},
			{"id": "17", "code": "5-1200", "name": "Beban Operasional", "type": "account", "parent_id": "14"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"code", "name", "type"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, code, name, type, COALESCE(parent_id::text,'') FROM chart_of_accounts WHERE company_id=$1 ORDER BY code`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var accounts []gin.H
	for rows.Next() {
		var id, code, name, typ, parentID string
		rows.Scan(&id, &code, &name, &typ, &parentID)
		accounts = append(accounts, gin.H{"id": id, "code": code, "name": name, "type": typ, "parent_id": parentID})
	}
	c.JSON(http.StatusOK, odata.Response(accounts, int64(len(accounts))))
}

func CreateCOA(c *gin.Context) {
	var req gin.H
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		req["id"] = "new-coa-id"
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
		return
	}
	companyID := c.GetString("company_id")
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO chart_of_accounts (company_id, code, name, type) VALUES ($1,$2,$3,$4) RETURNING id`,
		companyID, req["code"], req["name"], req["type"],
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	req["id"] = id
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": req})
}

// ACC-02: Journal Entries
func GetJournalEntries(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "1", "ref": "JE-001", "date": now.Add(-1 * 24 * time.Hour), "description": "Pembelian bahan baku PO-1210", "ref_type": "PO", "total_debit": 15000000, "total_credit": 15000000, "created_by": "admin"},
			{"id": "2", "ref": "JE-002", "date": now.Add(-2 * 24 * time.Hour), "description": "Pembayaran gaji periode Juni 2026", "ref_type": "PAYROLL", "total_debit": 72000000, "total_credit": 72000000, "created_by": "admin"},
			{"id": "3", "ref": "JE-003", "date": now.Add(-3 * 24 * time.Hour), "description": "Penerimaan pembayaran invoice INV-045", "ref_type": "INVOICE", "total_debit": 28500000, "total_credit": 28500000, "created_by": "admin"},
			{"id": "4", "ref": "JE-004", "date": now.Add(-5 * 24 * time.Hour), "description": "Biaya operasional bulanan", "ref_type": "MANUAL", "total_debit": 8750000, "total_credit": 8750000, "created_by": "admin"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"ref", "description", "ref_type"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT je.id, je.ref, je.date, je.description, je.ref_type,
		 COALESCE(SUM(jl.debit),0) as total_debit, COALESCE(SUM(jl.credit),0) as total_credit, je.created_by
		 FROM journal_entries je
		 LEFT JOIN journal_lines jl ON jl.journal_id = je.id
		 WHERE je.company_id=$1 GROUP BY je.id ORDER BY je.date DESC LIMIT 50`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()
	var entries []gin.H
	for rows.Next() {
		var id, ref, desc, refType, createdBy string
		var date time.Time
		var totalDebit, totalCredit float64
		rows.Scan(&id, &ref, &date, &desc, &refType, &totalDebit, &totalCredit, &createdBy)
		entries = append(entries, gin.H{
			"id": id, "ref": ref, "date": date, "description": desc,
			"ref_type": refType, "total_debit": totalDebit, "total_credit": totalCredit, "created_by": createdBy,
		})
	}
	c.JSON(http.StatusOK, odata.Response(entries, int64(len(entries))))
}

func CreateJournalEntry(c *gin.Context) {
	var req struct {
		Ref         string `json:"ref"`
		Date        string `json:"date"`
		Description string `json:"description"`
		RefType     string `json:"ref_type"`
		Lines       []struct {
			AccountID   string  `json:"account_id"`
			AccountName string  `json:"account_name"`
			Debit       float64 `json:"debit"`
			Credit      float64 `json:"credit"`
			Description string  `json:"description"`
		} `json:"lines"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": "new-je-id", "ref": req.Ref}})
		return
	}
	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	var jeID string
	err := database.DB.QueryRow(
		`INSERT INTO journal_entries (company_id, ref, date, description, ref_type, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		companyID, req.Ref, req.Date, req.Description, req.RefType, userID,
	).Scan(&jeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	var totalDebit float64
	for _, line := range req.Lines {
		totalDebit += line.Debit
		database.DB.Exec(
			`INSERT INTO journal_lines (journal_id, account_id, debit, credit, description) VALUES ($1,$2,$3,$4,$5)`,
			jeID, line.AccountID, line.Debit, line.Credit, line.Description,
		)
	}
	status := "posted"
	if _, required, _ := SubmitForApproval(companyID, "finance", "jurnal", jeID, req.Ref, totalDebit, userID); required {
		status = "draft"
		database.DB.Exec(`UPDATE journal_entries SET status='draft' WHERE id=$1`, jeID)
	}
	database.WriteAuditLog(userID, "CREATE", "journal_entries", jeID, "Jurnal "+req.Ref, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": jeID, "ref": req.Ref, "status": status}})
}

// ACC-04: Profit & Loss
func GetProfitLoss(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"period":  "2026-06",
			"revenue": gin.H{
				"pendapatan_penjualan": 485000000,
				"pendapatan_lain":      12500000,
				"total":                497500000,
			},
			"expenses": gin.H{
				"beban_gaji":        72000000,
				"beban_bahan_baku":  180000000,
				"beban_operasional": 45000000,
				"beban_penyusutan":  8500000,
				"total":             305500000,
			},
			"gross_profit":    317500000,
			"operating_profit": 192000000,
			"net_profit":      192000000,
		})
		return
	}
	companyID := c.GetString("company_id")
	// Aggregate from journal lines by account type
	var totalRevenue, totalExpense float64
	database.DB.QueryRow(
		`SELECT COALESCE(SUM(jl.credit - jl.debit),0) FROM journal_lines jl
		 JOIN journal_entries je ON je.id = jl.journal_id
		 JOIN chart_of_accounts coa ON coa.id = jl.account_id
		 WHERE je.company_id=$1 AND coa.type='revenue' AND je.status='posted'`,
		companyID,
	).Scan(&totalRevenue)
	database.DB.QueryRow(
		`SELECT COALESCE(SUM(jl.debit - jl.credit),0) FROM journal_lines jl
		 JOIN journal_entries je ON je.id = jl.journal_id
		 JOIN chart_of_accounts coa ON coa.id = jl.account_id
		 WHERE je.company_id=$1 AND coa.type='expense' AND je.status='posted'`,
		companyID,
	).Scan(&totalExpense)
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"revenue":    gin.H{"total": totalRevenue},
		"expenses":   gin.H{"total": totalExpense},
		"net_profit": totalRevenue - totalExpense,
	})
}

// ACC-05: Balance Sheet
func GetBalanceSheet(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"date":    time.Now().Format("2006-01-02"),
			"assets": gin.H{
				"kas":       125000000,
				"piutang":   85000000,
				"persediaan": 210000000,
				"aset_tetap": 850000000,
				"total":     1270000000,
			},
			"liabilities": gin.H{
				"hutang_usaha": 95000000,
				"total":        95000000,
			},
			"equity": gin.H{
				"modal":  800000000,
				"laba":   375000000,
				"total":  1175000000,
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Balance sheet dari DB belum diimplementasi"})
}
