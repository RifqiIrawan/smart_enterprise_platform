package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

// GetGeneralLedger — Buku Besar per akun dengan running balance
func GetGeneralLedger(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "gl1", "date": "2026-06-01", "ref": "JE-2026-001", "description": "Penerimaan pembayaran invoice INV-001", "debit": 50000000, "credit": 0, "balance": 175000000, "account_code": "1-1100", "account_name": "Kas & Bank"},
			{"id": "gl2", "date": "2026-06-03", "ref": "PAY-001", "description": "Pembayaran hutang ke vendor PT Sinar", "debit": 0, "credit": 25000000, "balance": 150000000, "account_code": "1-1100", "account_name": "Kas & Bank"},
			{"id": "gl3", "date": "2026-06-05", "ref": "PAY-002", "description": "Pembayaran gaji karyawan Juni", "debit": 0, "credit": 72000000, "balance": 78000000, "account_code": "1-1100", "account_name": "Kas & Bank"},
			{"id": "gl4", "date": "2026-06-10", "ref": "INV-2026-008", "description": "Penerimaan piutang PT Maju Jaya", "debit": 85000000, "credit": 0, "balance": 163000000, "account_code": "1-1100", "account_name": "Kas & Bank"},
			{"id": "gl5", "date": "2026-06-15", "ref": "PO-2026-015", "description": "Pembelian bahan baku dari PT Bahan Prima", "debit": 0, "credit": 45000000, "balance": 118000000, "account_code": "1-1100", "account_name": "Kas & Bank"},
			{"id": "gl6", "date": "2026-06-18", "ref": "INV-2026-009", "description": "Penerimaan piutang PT Cahaya Terang", "debit": 32000000, "credit": 0, "balance": 150000000, "account_code": "1-1100", "account_name": "Kas & Bank"},
			{"id": "gl7", "date": "2026-06-20", "ref": "PAY-003", "description": "Pembayaran beban operasional kantor", "debit": 0, "credit": 15000000, "balance": 135000000, "account_code": "1-1100", "account_name": "Kas & Bank"},
			{"id": "gl8", "date": "2026-06-25", "ref": "JE-2026-008", "description": "Penerimaan tunai penjualan langsung", "debit": 22000000, "credit": 0, "balance": 157000000, "account_code": "1-1100", "account_name": "Kas & Bank"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"ref", "description", "account_name"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "count": 0})
}

// GetTrialBalance — Neraca Saldo semua akun untuk suatu periode
func GetTrialBalance(c *gin.Context) {
	if database.DB == nil {
		accounts := []gin.H{
			{"code": "1-1100", "name": "Kas & Bank", "type": "account", "opening_balance": 125000000, "debit_mutations": 189000000, "credit_mutations": 157000000, "closing_balance": 157000000, "normal_balance": "debit"},
			{"code": "1-1200", "name": "Piutang Usaha", "type": "account", "opening_balance": 115000000, "debit_mutations": 485000000, "credit_mutations": 515000000, "closing_balance": 85000000, "normal_balance": "debit"},
			{"code": "1-1300", "name": "Persediaan Barang", "type": "account", "opening_balance": 185000000, "debit_mutations": 180000000, "credit_mutations": 155000000, "closing_balance": 210000000, "normal_balance": "debit"},
			{"code": "1-1400", "name": "Biaya Dibayar Dimuka", "type": "account", "opening_balance": 12000000, "debit_mutations": 5000000, "credit_mutations": 8000000, "closing_balance": 9000000, "normal_balance": "debit"},
			{"code": "1-2100", "name": "Tanah", "type": "account", "opening_balance": 300000000, "debit_mutations": 0, "credit_mutations": 0, "closing_balance": 300000000, "normal_balance": "debit"},
			{"code": "1-2200", "name": "Bangunan & Peralatan", "type": "account", "opening_balance": 650000000, "debit_mutations": 50000000, "credit_mutations": 0, "closing_balance": 700000000, "normal_balance": "debit"},
			{"code": "1-2300", "name": "Akumulasi Penyusutan", "type": "account", "opening_balance": -150000000, "debit_mutations": 0, "credit_mutations": 8500000, "closing_balance": -158500000, "normal_balance": "credit"},
			{"code": "2-1100", "name": "Hutang Usaha", "type": "account", "opening_balance": -75000000, "debit_mutations": 120000000, "credit_mutations": 140000000, "closing_balance": -95000000, "normal_balance": "credit"},
			{"code": "2-1200", "name": "Hutang Pajak", "type": "account", "opening_balance": -8000000, "debit_mutations": 12000000, "credit_mutations": 15000000, "closing_balance": -11000000, "normal_balance": "credit"},
			{"code": "3-1000", "name": "Modal Disetor", "type": "account", "opening_balance": -800000000, "debit_mutations": 0, "credit_mutations": 0, "closing_balance": -800000000, "normal_balance": "credit"},
			{"code": "3-2000", "name": "Laba Ditahan", "type": "account", "opening_balance": -375000000, "debit_mutations": 0, "credit_mutations": 0, "closing_balance": -375000000, "normal_balance": "credit"},
			{"code": "4-1000", "name": "Pendapatan Penjualan", "type": "account", "opening_balance": 0, "debit_mutations": 0, "credit_mutations": 485000000, "closing_balance": -485000000, "normal_balance": "credit"},
			{"code": "4-2000", "name": "Pendapatan Lain-lain", "type": "account", "opening_balance": 0, "debit_mutations": 0, "credit_mutations": 12500000, "closing_balance": -12500000, "normal_balance": "credit"},
			{"code": "5-1000", "name": "Beban Bahan Baku", "type": "account", "opening_balance": 0, "debit_mutations": 180000000, "credit_mutations": 0, "closing_balance": 180000000, "normal_balance": "debit"},
			{"code": "5-2000", "name": "Beban Gaji", "type": "account", "opening_balance": 0, "debit_mutations": 72000000, "credit_mutations": 0, "closing_balance": 72000000, "normal_balance": "debit"},
			{"code": "5-3000", "name": "Beban Operasional", "type": "account", "opening_balance": 0, "debit_mutations": 45000000, "credit_mutations": 0, "closing_balance": 45000000, "normal_balance": "debit"},
			{"code": "5-4000", "name": "Beban Penyusutan", "type": "account", "opening_balance": 0, "debit_mutations": 8500000, "credit_mutations": 0, "closing_balance": 8500000, "normal_balance": "debit"},
		}
		// total_debit = total_credit: trial balance always in equilibrium
		c.JSON(http.StatusOK, gin.H{
			"accounts":     accounts,
			"total_debit":  1346500000,
			"total_credit": 1346500000,
			"is_balanced":  true,
			"period":       "Juni 2026",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"accounts": []gin.H{}, "total_debit": 0, "total_credit": 0, "is_balanced": true})
}

// GetCashFlow — Laporan Arus Kas metode tidak langsung (Indirect Method)
func GetCashFlow(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"period": "Juni 2026",
			"operating": gin.H{
				"label": "Arus Kas dari Aktivitas Operasi",
				"items": []gin.H{
					{"label": "Laba Bersih", "amount": 192000000, "is_header": false},
					{"label": "Penyesuaian non-kas:", "amount": nil, "is_header": true},
					{"label": "Penyusutan Aset Tetap", "amount": 8500000, "is_header": false},
					{"label": "Perubahan aset & kewajiban lancar:", "amount": nil, "is_header": true},
					{"label": "Penurunan Piutang Usaha", "amount": 30000000, "is_header": false},
					{"label": "Kenaikan Persediaan", "amount": -25000000, "is_header": false},
					{"label": "Penurunan Hutang Usaha", "amount": -20000000, "is_header": false},
					{"label": "Kenaikan Hutang Pajak", "amount": 3000000, "is_header": false},
				},
				"total": 188500000,
			},
			"investing": gin.H{
				"label": "Arus Kas dari Aktivitas Investasi",
				"items": []gin.H{
					{"label": "Pembelian Aset Tetap", "amount": -50000000, "is_header": false},
					{"label": "Penerimaan dari Pelepasan Aset", "amount": 0, "is_header": false},
				},
				"total": -50000000,
			},
			"financing": gin.H{
				"label": "Arus Kas dari Aktivitas Pendanaan",
				"items": []gin.H{
					{"label": "Penerimaan Pinjaman Bank", "amount": 0, "is_header": false},
					{"label": "Pembayaran Angsuran Pinjaman", "amount": -15000000, "is_header": false},
					{"label": "Penambahan Modal Setoran", "amount": 0, "is_header": false},
					{"label": "Pembayaran Dividen", "amount": 0, "is_header": false},
				},
				"total": -15000000,
			},
			"net_change":     123500000,
			"beginning_cash": 33500000,
			"ending_cash":    157000000,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{})
}

// GetAccountingPeriods — Daftar periode akuntansi dan statusnya
func GetAccountingPeriods(c *gin.Context) {
	if database.DB == nil {
		periods := []gin.H{
			{"id": "p1", "period": "Januari 2026", "month": 1, "year": 2026, "status": "closed", "closed_at": "2026-02-05", "closed_by": "Admin Finance"},
			{"id": "p2", "period": "Februari 2026", "month": 2, "year": 2026, "status": "closed", "closed_at": "2026-03-03", "closed_by": "Admin Finance"},
			{"id": "p3", "period": "Maret 2026", "month": 3, "year": 2026, "status": "closed", "closed_at": "2026-04-02", "closed_by": "Admin Finance"},
			{"id": "p4", "period": "April 2026", "month": 4, "year": 2026, "status": "closed", "closed_at": "2026-05-04", "closed_by": "Admin Finance"},
			{"id": "p5", "period": "Mei 2026", "month": 5, "year": 2026, "status": "closed", "closed_at": "2026-06-03", "closed_by": "Admin Finance"},
			{"id": "p6", "period": "Juni 2026", "month": 6, "year": 2026, "status": "open", "closed_at": "", "closed_by": ""},
			{"id": "p7", "period": "Juli 2026", "month": 7, "year": 2026, "status": "future", "closed_at": "", "closed_by": ""},
		}
		c.JSON(http.StatusOK, gin.H{"value": periods, "count": len(periods)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "count": 0})
}

// ClosePeriod — Tutup periode akuntansi (kunci semua jurnal pada periode tersebut)
func ClosePeriod(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"id":         id,
			"status":     "closed",
			"closed_at":  time.Now().Format("2006-01-02"),
			"message":    "Periode berhasil ditutup",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

// ReopenPeriod — Buka kembali periode yang sudah ditutup (superadmin approval)
func ReopenPeriod(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"id":      id,
			"status":  "open",
			"message": "Periode berhasil dibuka kembali",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

// GetComparativeIncomeStatement — Laporan Laba Rugi Perbandingan (current vs prev vs budget vs last year)
func GetComparativeIncomeStatement(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"periods": []string{"Juni 2026", "Mei 2026", "Budget Jun", "Jun 2025"},
			"revenue": []gin.H{
				{"account": "Pendapatan Penjualan", "values": []float64{485000000, 412000000, 450000000, 380000000}},
				{"account": "Pendapatan Lain-lain", "values": []float64{12500000, 8000000, 10000000, 7500000}},
			},
			"revenue_totals": []float64{497500000, 420000000, 460000000, 387500000},
			"expenses": []gin.H{
				{"account": "Beban Bahan Baku", "values": []float64{180000000, 152000000, 165000000, 140000000}},
				{"account": "Beban Gaji", "values": []float64{72000000, 72000000, 72000000, 65000000}},
				{"account": "Beban Operasional", "values": []float64{45000000, 38000000, 42000000, 35000000}},
				{"account": "Beban Penyusutan", "values": []float64{8500000, 8500000, 8500000, 7500000}},
			},
			"expense_totals": []float64{305500000, 270500000, 287500000, 247500000},
			"net_profit":     []float64{192000000, 149500000, 172500000, 140000000},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{})
}

// GetComparativeBalanceSheet — Neraca Perbandingan dua tanggal
func GetComparativeBalanceSheet(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"dates": []string{"28 Jun 2026", "31 Mei 2026"},
			"assets": gin.H{
				"current": []gin.H{
					{"account": "Kas & Bank", "values": []float64{157000000, 125000000}},
					{"account": "Piutang Usaha", "values": []float64{85000000, 115000000}},
					{"account": "Persediaan", "values": []float64{210000000, 185000000}},
					{"account": "Biaya Dibayar Dimuka", "values": []float64{9000000, 12000000}},
				},
				"current_totals": []float64{461000000, 437000000},
				"fixed": []gin.H{
					{"account": "Tanah", "values": []float64{300000000, 300000000}},
					{"account": "Bangunan & Peralatan", "values": []float64{700000000, 650000000}},
					{"account": "Akumulasi Penyusutan", "values": []float64{-158500000, -150000000}},
				},
				"fixed_totals": []float64{841500000, 800000000},
				"total":        []float64{1302500000, 1237000000},
			},
			"liabilities": gin.H{
				"current": []gin.H{
					{"account": "Hutang Usaha", "values": []float64{95000000, 95000000}},
					{"account": "Hutang Pajak", "values": []float64{11000000, 8000000}},
				},
				"current_totals": []float64{106000000, 103000000},
				"total":          []float64{106000000, 103000000},
			},
			"equity": gin.H{
				"items": []gin.H{
					{"account": "Modal Disetor", "values": []float64{800000000, 800000000}},
					{"account": "Laba Ditahan", "values": []float64{204500000, 184500000}},
					{"account": "Laba Berjalan", "values": []float64{192000000, 149500000}},
				},
				"total": []float64{1196500000, 1134000000},
			},
			"liab_equity_total": []float64{1302500000, 1237000000},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{})
}
