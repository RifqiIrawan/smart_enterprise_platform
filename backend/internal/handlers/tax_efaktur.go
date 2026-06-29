package handlers

import (
	"fmt"
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

func GetNSFP(c *gin.Context) {
	if database.DB == nil {
		blocks := []gin.H{
			{
				"id": "nb1", "prefix": "010", "from_number": "00000001", "to_number": "00000100",
				"used": 85, "remaining": 15, "status": "active",
				"imported_at": "2026-01-01", "year": "2026",
				"last_assigned": "010.000-26.00000085",
			},
			{
				"id": "nb2", "prefix": "010", "from_number": "00000101", "to_number": "00000200",
				"used": 0, "remaining": 100, "status": "ready",
				"imported_at": "2026-06-01", "year": "2026",
				"last_assigned": "",
			},
			{
				"id": "nb3", "prefix": "010", "from_number": "00000001", "to_number": "00000100",
				"used": 100, "remaining": 0, "status": "exhausted",
				"imported_at": "2025-01-01", "year": "2025",
				"last_assigned": "010.000-25.00000100",
			},
		}
		c.JSON(http.StatusOK, gin.H{
			"value":             blocks,
			"count":             len(blocks),
			"total_remaining":   115,
			"alert_threshold":   20,
			"current_nsfp":      "010.000-26.00000085",
			"next_nsfp":         "010.000-26.00000086",
			"low_stock_alert":   true,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "count": 0, "total_remaining": 0})
}

func ImportNSFP(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{
			"id":        "nb_new",
			"message":   "NSFP berhasil diimport",
			"imported":  100,
			"new_block": "010.000-26.00000201 s.d. 010.000-26.00000300",
		})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "NSFP diimport"})
}

func GetEFaktur(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		list := []gin.H{
			{
				"id": "ef1", "nsfp": "010.000-26.00000085", "inv_number": "INV/2026/0012",
				"customer_name": "PT Cahaya Terang Tbk", "customer_npwp": "01.456.789.0-111.000",
				"date": "2026-06-25", "dpp": 497500000, "ppn": 59700000, "total": 557200000,
				"status": "uploaded", "coretax_ref": "CTX-2026-00085",
			},
			{
				"id": "ef2", "nsfp": "010.000-26.00000084", "inv_number": "INV/2026/0011",
				"customer_name": "PT Sinar Abadi Makmur", "customer_npwp": "55.321.987.6-789.000",
				"date": "2026-06-20", "dpp": 386000000, "ppn": 46320000, "total": 432320000,
				"status": "accepted", "coretax_ref": "CTX-2026-00084",
			},
			{
				"id": "ef3", "nsfp": "010.000-26.00000083", "inv_number": "INV/2026/0010",
				"customer_name": "PT Maju Jaya Abadi", "customer_npwp": "99.888.777.6-555.000",
				"date": "2026-06-15", "dpp": 287500000, "ppn": 34500000, "total": 322000000,
				"status": "accepted", "coretax_ref": "CTX-2026-00083",
			},
			{
				"id": "ef4", "nsfp": "010.000-26.00000082", "inv_number": "INV/2026/0009",
				"customer_name": "CV Tekno Maju Bersama", "customer_npwp": "33.222.111.0-444.000",
				"date": "2026-06-10", "dpp": 150000000, "ppn": 18000000, "total": 168000000,
				"status": "rejected", "coretax_ref": "", "reject_reason": "NPWP tidak valid",
			},
			{
				"id": "ef5", "nsfp": "010.000-26.00000081", "inv_number": "INV/2026/0008",
				"customer_name": "PT Hasil Prima Industri", "customer_npwp": "77.666.555.4-333.000",
				"date": "2026-06-05", "dpp": 225000000, "ppn": 27000000, "total": 252000000,
				"status": "accepted", "coretax_ref": "CTX-2026-00081",
			},
			{
				"id": "ef6", "nsfp": "010.000-26.00000086", "inv_number": "INV/2026/0013",
				"customer_name": "PT Global Manufacturing", "customer_npwp": "88.777.666.5-222.000",
				"date": "2026-06-28", "dpp": 180000000, "ppn": 21600000, "total": 201600000,
				"status": "draft", "coretax_ref": "",
			},
		}
		rows, total := p.ApplyToSlice(list, []string{"nsfp", "inv_number", "customer_name", "customer_npwp"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	c.JSON(http.StatusOK, gin.H{"value": []gin.H{}, "count": 0})
}

func GetEFakturXML(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		xml := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<BundleEFaktur>
  <SPT>
    <KodeMasaPajak>06</KodeMasaPajak>
    <KodeTahunPajak>2026</KodeTahunPajak>
    <STP>NORMAL</STP>
    <JmlFaktur>1</JmlFaktur>
  </SPT>
  <FakturPajak id="%s">
    <TanggalFaktur>20260625</TanggalFaktur>
    <JenisFaktur>01</JenisFaktur>
    <NoFakturPajak>010.000-26.00000085</NoFakturPajak>
    <NamaPenjual>PT SMART ENTERPRISE MANUFAKTUR</NamaPenjual>
    <NpwpPenjual>012345678999000</NpwpPenjual>
    <NamaPembeli>PT Cahaya Terang Tbk</NamaPembeli>
    <NpwpPembeli>014567890111000</NpwpPembeli>
    <JumlahDPP>497500000</JumlahDPP>
    <JumlahPPN>59700000</JumlahPPN>
    <JumlahPPNBM>0</JumlahPPNBM>
    <Detail>
      <NamaBarang>Mesin Produksi X-200</NamaBarang>
      <HargaSatuan>485000000</HargaSatuan>
      <JumlahBarang>1</JumlahBarang>
      <HargaTotal>485000000</HargaTotal>
    </Detail>
  </FakturPajak>
</BundleEFaktur>`, id)
		c.Header("Content-Type", "application/xml")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"efaktur_%s.xml\"", id))
		c.String(http.StatusOK, xml)
		return
	}
	c.String(http.StatusOK, "<?xml version=\"1.0\"?><BundleEFaktur/>")
}

func ExportEFakturCSV(c *gin.Context) {
	if database.DB == nil {
		csv := `FK,1,01,2026,06,010.000-26.00000085,20260625,NORMAL,PT SMART ENTERPRISE MANUFAKTUR,012345678999000,PT Cahaya Terang Tbk,014567890111000,1,497500000,59700000,0
FK,1,01,2026,06,010.000-26.00000084,20260620,NORMAL,PT SMART ENTERPRISE MANUFAKTUR,012345678999000,PT Sinar Abadi Makmur,055321987678900,1,386000000,46320000,0
FK,1,01,2026,06,010.000-26.00000083,20260615,NORMAL,PT SMART ENTERPRISE MANUFAKTUR,012345678999000,PT Maju Jaya Abadi,099888777655500,1,287500000,34500000,0`
		c.Header("Content-Type", "text/csv")
		c.Header("Content-Disposition", "attachment; filename=\"efaktur_juni_2026.csv\"")
		c.String(http.StatusOK, csv)
		return
	}
	c.String(http.StatusOK, "")
}

func UploadEFakturCoretax(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"id":          id,
			"status":      "uploaded",
			"coretax_ref": fmt.Sprintf("CTX-2026-%05d", time.Now().Unix()%99999),
			"uploaded_at": time.Now().Format("2006-01-02 15:04:05"),
			"message":     "Faktur pajak berhasil diupload ke sistem Coretax DJP",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Diupload"})
}

func GetSPTPPN(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"period": "Juni 2026",
			"pk": gin.H{
				"label":         "Pajak Keluaran (PK)",
				"total_faktur":  6,
				"total_dpp":     2226000000,
				"total_ppn":     267120000,
			},
			"pm": gin.H{
				"label":         "Pajak Masukan (PM)",
				"total_faktur":  5,
				"total_dpp":     1609000000,
				"total_ppn":     193080000,
			},
			"ppn_kurang_bayar":  74040000,
			"ppn_lebih_bayar":   0,
			"kompensasi":        0,
			"ppn_setor":         74040000,
			"status":            "draft",
			"submitted_at":      "",
			"coretax_ref":       "",
			"detail": []gin.H{
				{"type": "pk", "nsfp": "010.000-26.00000085", "customer": "PT Cahaya Terang Tbk", "dpp": 497500000, "ppn": 59700000},
				{"type": "pk", "nsfp": "010.000-26.00000084", "customer": "PT Sinar Abadi Makmur", "dpp": 386000000, "ppn": 46320000},
				{"type": "pk", "nsfp": "010.000-26.00000083", "customer": "PT Maju Jaya Abadi", "dpp": 287500000, "ppn": 34500000},
				{"type": "pk", "nsfp": "010.000-26.00000082", "customer": "CV Tekno Maju Bersama", "dpp": 150000000, "ppn": 18000000},
				{"type": "pk", "nsfp": "010.000-26.00000081", "customer": "PT Hasil Prima Industri", "dpp": 225000000, "ppn": 27000000},
				{"type": "pk", "nsfp": "010.000-26.00000086", "customer": "PT Global Manufacturing", "dpp": 180000000, "ppn": 21600000},
				{"type": "pm", "ref": "VI/2026/0043", "vendor": "CV Bahan Prima Sejahtera", "dpp": 160900000, "ppn": 19308000},
				{"type": "pm", "ref": "VI/2026/0041", "vendor": "PT Kimia Jaya Makmur", "dpp": 285000000, "ppn": 34200000},
				{"type": "pm", "ref": "VI/2026/0038", "vendor": "CV Logam Abadi", "dpp": 475000000, "ppn": 57000000},
				{"type": "pm", "ref": "VI/2026/0035", "vendor": "PT Baja Nusantara", "dpp": 368100000, "ppn": 44172000},
				{"type": "pm", "ref": "VI/2026/0031", "vendor": "CV Elektro Prima", "dpp": 320000000, "ppn": 38400000},
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"period": "", "status": "draft"})
}

func SubmitSPTPPN(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"status":      "submitted",
			"coretax_ref": fmt.Sprintf("SPT-PPN-2026-06-%d", time.Now().Unix()%9999),
			"submitted_at": time.Now().Format("2006-01-02 15:04:05"),
			"message":     "SPT Masa PPN Juni 2026 berhasil disubmit ke Coretax DJP. Status validasi akan diperbarui dalam 1x24 jam.",
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "SPT submitted"})
}
