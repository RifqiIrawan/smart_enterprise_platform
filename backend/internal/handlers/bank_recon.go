package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

func GetReconSessions(c *gin.Context) {
	if database.DB == nil {
		sessions := []gin.H{
			{
				"id": "rs1", "bank_account": "BCA — Kas Operasional", "period": "Juni 2026",
				"bank_items": 6, "system_items": 5, "matched": 4,
				"unmatched_bank": 2, "unmatched_system": 1, "difference": -9500000,
				"status": "open", "created_at": "2026-06-28",
			},
			{
				"id": "rs2", "bank_account": "Mandiri — Kas Giro", "period": "Mei 2026",
				"bank_items": 12, "system_items": 12, "matched": 12,
				"unmatched_bank": 0, "unmatched_system": 0, "difference": 0,
				"status": "locked", "created_at": "2026-06-01", "locked_at": "2026-06-05",
			},
			{
				"id": "rs3", "bank_account": "BCA — Kas Operasional", "period": "April 2026",
				"bank_items": 9, "system_items": 9, "matched": 9,
				"unmatched_bank": 0, "unmatched_system": 0, "difference": 0,
				"status": "locked", "created_at": "2026-05-03", "locked_at": "2026-05-07",
			},
		}
		c.JSON(http.StatusOK, gin.H{"value": sessions, "count": len(sessions)})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "count": 0})
}

func CreateReconSession(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{
			"id": "rs_new", "status": "open",
			"created_at": time.Now().Format("2006-01-02"),
			"message":    "Sesi rekonsiliasi baru berhasil dibuat",
		})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Sesi rekonsiliasi dibuat"})
}

func GetReconDetail(c *gin.Context) {
	if database.DB == nil {
		bankItems := []gin.H{
			{"id": "bs1", "date": "2026-06-01", "description": "TRANSFER MASUK - PT MAJU JAYA ABADI", "amount": 50000000, "type": "credit", "ref": "TRF/2026/0234", "status": "matched", "matched_with": "sys1"},
			{"id": "bs2", "date": "2026-06-05", "description": "BIAYA ADMIN BCA", "amount": 25000, "type": "debit", "ref": "ADM/JUN/01", "status": "matched", "matched_with": "sys2"},
			{"id": "bs3", "date": "2026-06-10", "description": "TRANSFER KELUAR - PENGGAJIAN JUNI", "amount": 125000000, "type": "debit", "ref": "GAJ/JUN/2026", "status": "matched", "matched_with": "sys3"},
			{"id": "bs4", "date": "2026-06-15", "description": "TRANSFER MASUK - PT CAHAYA TERANG TBK", "amount": 75000000, "type": "credit", "ref": "TRF/2026/0251", "status": "matched", "matched_with": "sys4"},
			{"id": "bs5", "date": "2026-06-20", "description": "TRANSFER KELUAR", "amount": 35000000, "type": "debit", "ref": "TRF/2026/0267", "status": "unmatched", "matched_with": ""},
			{"id": "bs6", "date": "2026-06-22", "description": "TRANSFER MASUK TIDAK DIKENAL", "amount": 7500000, "type": "credit", "ref": "TRF/2026/0271", "status": "unmatched", "matched_with": ""},
		}
		systemItems := []gin.H{
			{"id": "sys1", "date": "2026-06-01", "description": "Penerimaan INV/2026/0008 - PT Maju Jaya Abadi", "amount": 50000000, "type": "credit", "ref": "INV/2026/0008", "status": "matched", "matched_with": "bs1"},
			{"id": "sys2", "date": "2026-06-05", "description": "Biaya administrasi bank - Juni 2026", "amount": 25000, "type": "debit", "ref": "JE-2026-042", "status": "matched", "matched_with": "bs2"},
			{"id": "sys3", "date": "2026-06-10", "description": "Penggajian karyawan bulan Juni 2026", "amount": 125000000, "type": "debit", "ref": "PAY-JUN-2026", "status": "matched", "matched_with": "bs3"},
			{"id": "sys4", "date": "2026-06-15", "description": "Penerimaan INV/2026/0010 - PT Cahaya Terang Tbk", "amount": 75000000, "type": "credit", "ref": "INV/2026/0010", "status": "matched", "matched_with": "bs4"},
			{"id": "sys5", "date": "2026-06-18", "description": "Pembayaran PO/2026/0043 - CV Bahan Prima", "amount": 42500000, "type": "debit", "ref": "PO/2026/0043", "status": "unmatched", "matched_with": ""},
		}
		c.JSON(http.StatusOK, gin.H{
			"session_id":   c.Param("id"),
			"bank_items":   bankItems,
			"system_items": systemItems,
			"summary": gin.H{
				"bank_opening": 157000000, "bank_closing": 124475000,
				"system_opening": 157000000, "system_closing": 114975000,
				"difference": -9500000, "matched": 4, "unmatched_bank": 2, "unmatched_system": 1,
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"bank_items": []gin.H{}, "system_items": []gin.H{}, "summary": gin.H{}})
}

func AutoMatch(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"matched": 4, "still_unmatched_bank": 2, "still_unmatched_system": 1,
			"message": "Auto-matching selesai: 4 transaksi berhasil dicocokkan. 3 transaksi memerlukan review manual.",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"matched": 0, "message": "Auto-matching selesai"})
}

func ManualMatch(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Transaksi berhasil dicocokkan secara manual"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Matched"})
}

func LockRecon(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"id": id, "status": "locked",
			"locked_at": time.Now().Format("2006-01-02"),
			"message":   "Rekonsiliasi berhasil dikunci. Periode tidak dapat diubah.",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Rekonsiliasi dikunci"})
}

func GetPettyCash(c *gin.Context) {
	if database.DB == nil {
		accounts := []gin.H{
			{"id": "pc1", "department": "Operasional", "custodian": "Budi Santoso", "limit": 5000000, "balance": 2350000, "last_replenishment": "2026-06-15", "status": "normal"},
			{"id": "pc2", "department": "Marketing", "custodian": "Rina Wijaya", "limit": 3000000, "balance": 850000, "last_replenishment": "2026-06-10", "status": "normal"},
			{"id": "pc3", "department": "Produksi", "custodian": "Hendra Kusuma", "limit": 10000000, "balance": 6500000, "last_replenishment": "2026-06-20", "status": "normal"},
			{"id": "pc4", "department": "HRD", "custodian": "Dewi Rahayu", "limit": 2000000, "balance": 150000, "last_replenishment": "2026-06-01", "status": "low"},
		}
		c.JSON(http.StatusOK, gin.H{
			"value": accounts, "count": 4,
			"total_limit": 20000000, "total_balance": 9850000, "low_count": 1,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "count": 0, "total_limit": 0, "total_balance": 0, "low_count": 0})
}

func CreatePettyCash(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"id": "pc_new", "message": "Kas kecil berhasil ditambahkan"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Kas kecil ditambahkan"})
}

func GetPettyCashTransactions(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		txs := []gin.H{
			{"id": "pct1", "date": "2026-06-28", "department": "Operasional", "description": "Pembelian ATK & perlengkapan kantor", "category": "Office Supplies", "amount": 350000, "type": "debit", "balance_after": 2350000, "created_by": "Budi Santoso"},
			{"id": "pct2", "date": "2026-06-27", "department": "Marketing", "description": "Biaya transportasi kunjungan client", "category": "Transport", "amount": 250000, "type": "debit", "balance_after": 1100000, "created_by": "Rina Wijaya"},
			{"id": "pct3", "date": "2026-06-25", "department": "Produksi", "description": "Pembelian spare part kecil darurat", "category": "Maintenance", "amount": 875000, "type": "debit", "balance_after": 7375000, "created_by": "Hendra Kusuma"},
			{"id": "pct4", "date": "2026-06-24", "department": "HRD", "description": "Konsumsi rapat internal", "category": "Meals", "amount": 450000, "type": "debit", "balance_after": 600000, "created_by": "Dewi Rahayu"},
			{"id": "pct5", "date": "2026-06-20", "department": "Produksi", "description": "Pengisian ulang kas kecil produksi", "category": "Replenishment", "amount": 10000000, "type": "credit", "balance_after": 8250000, "created_by": "Finance Dept"},
			{"id": "pct6", "date": "2026-06-15", "department": "Operasional", "description": "Pengisian ulang kas kecil operasional", "category": "Replenishment", "amount": 5000000, "type": "credit", "balance_after": 2700000, "created_by": "Finance Dept"},
			{"id": "pct7", "date": "2026-06-12", "department": "HRD", "description": "Biaya fotocopy & dokumen HR", "category": "Office Supplies", "amount": 45000, "type": "debit", "balance_after": 150000, "created_by": "Dewi Rahayu"},
			{"id": "pct8", "date": "2026-06-10", "department": "Marketing", "description": "Pengisian ulang kas kecil marketing", "category": "Replenishment", "amount": 3000000, "type": "credit", "balance_after": 1350000, "created_by": "Finance Dept"},
		}
		rows, total := p.ApplyToSlice(txs, []string{"description", "department", "category", "created_by"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "count": 0})
}

func CreatePettyCashTransaction(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"id": "pct_new", "message": "Transaksi kas kecil berhasil dicatat"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Transaksi dicatat"})
}

func ReplenishPettyCash(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"id": id, "message": "Pengisian ulang kas kecil berhasil dicatat",
			"new_balance": 5000000,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Replenishment dicatat"})
}
