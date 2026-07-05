package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type geminiRequest struct {
	Contents []geminiContent `json:"contents"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func AIChat(c *gin.Context) {
	var req struct {
		Message string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "pesan tidak boleh kosong"})
		return
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey != "" {
		reply, err := callGemini(apiKey, req.Message)
		if err == nil {
			c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
				"reply":      reply,
				"source":     "gemini",
				"created_at": time.Now(),
			}})
			return
		}
	}

	// Demo mode: keyword-based smart responses
	reply := getDemoReply(req.Message)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"reply":      reply,
		"source":     "demo",
		"created_at": time.Now(),
	}})
}

func callGemini(apiKey, message string) (string, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=%s", apiKey)

	systemPrompt := `Kamu adalah asisten AI untuk Smart Enterprise Platform (SEP), sistem manajemen pabrik terintegrasi.
	Jawab pertanyaan dalam Bahasa Indonesia yang profesional dan ringkas.`

	body := geminiRequest{
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: systemPrompt + "\n\nPertanyaan: " + message}}},
		},
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("gemini API error: %d", resp.StatusCode)
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var geminiResp geminiResponse
	if err := json.Unmarshal(respBody, &geminiResp); err != nil {
		return "", err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response from Gemini")
	}

	return geminiResp.Candidates[0].Content.Parts[0].Text, nil
}

func getDemoReply(message string) string {
	msg := strings.ToLower(message)

	switch {
	case containsAny(msg, "kpi", "performa", "performance", "target"):
		return "Berdasarkan data terkini, OEE pabrik berada di 89,2% (target: 85%). Revenue bulan ini Rp 4,9M dari target Rp 5M. Tingkat kehadiran karyawan 97,2%. Secara keseluruhan, performa pabrik dalam kondisi baik dengan beberapa area yang perlu perhatian pada work order yang sedang berjalan."

	case containsAny(msg, "oee", "overall equipment effectiveness", "mesin", "efisiensi"):
		return "OEE (Overall Equipment Effectiveness) saat ini 89,2%. Komponen: Availability 94%, Performance 91%, Quality 97%. Mesin CNC-03 membutuhkan maintenance segera yang dapat mempengaruhi OEE. Saya merekomendasikan jadwalkan preventive maintenance dalam 24 jam ke depan untuk menjaga OEE di atas 88%."

	case containsAny(msg, "produksi", "work order", "wo", "manufaktur"):
		return "Status produksi saat ini: 8 work order aktif. WO-2847 (Komponen A-12) berjalan 84,6% dari target 500 unit. WO-2848 (Assembly B-05) telah selesai 100%. WO-2849 masih pending menunggu bahan baku. Estimasi penyelesaian target produksi hari ini: 94%."

	case containsAny(msg, "karyawan", "sdm", "hris", "pegawai", "absensi", "attendance"):
		return "Data HRIS: Total 248 karyawan aktif. Tingkat kehadiran hari ini 97,2% (241 hadir, 7 tidak hadir). Departemen Produksi: 120 orang, HR: 15 orang, IT: 12 orang, Maintenance: 25 orang, lainnya: 76 orang. Ada 3 karyawan cuti hari ini dan 4 dalam proses rekrutmen posisi Operator Produksi."

	case containsAny(msg, "stok", "inventory", "gudang", "warehouse", "bahan baku"):
		return "Status inventori gudang: 5 item perlu perhatian. Baja Lembaran 2mm tersisa 150 lembar (min: 200) - status LOW. Aluminium Profil 40x40 - STOK HABIS, perlu reorder segera. Cairan Pelumas tersisa 45L (min: 100L) - LOW. Saran: buat Purchase Request untuk 3 item tersebut hari ini untuk menghindari gangguan produksi."

	case containsAny(msg, "maintenance", "perawatan", "aset", "asset"):
		return "Jadwal maintenance: 2 maintenance terjadwal minggu ini. CNC Milling (AST-001) preventive maintenance dalam 7 hari - ganti oli dan filter. Forklift Toyota (AST-002) corrective maintenance dalam 3 hari - perbaikan sistem rem. Pastikan ketersediaan spare part sebelum jadwal maintenance untuk menghindari downtime."

	case containsAny(msg, "laporan", "report", "analisis", "analysis", "ringkasan", "summary"):
		return "Ringkasan harian per " + time.Now().Format("02 January 2006") + ": Produksi berjalan normal (8 WO aktif), OEE 89,2%, kehadiran 97,2%. Perhatian: stok Aluminium Profil habis (perlu reorder), CNC-03 butuh maintenance, ada insiden keamanan di Gate B yang sedang diinvestigasi. Rekomendasi prioritas: (1) Reorder bahan baku, (2) Jadwalkan maintenance CNC-03, (3) Tindak lanjut insiden keamanan."

	case containsAny(msg, "purchasing", "pembelian", "pr", "po", "vendor"):
		return "Status pembelian: 1 PR pending approval (PR-2847 - Baja Lembaran Rp 5jt). 2 PO aktif: PO-1233 (Aluminium Profil) dalam proses pengiriman, PO-1234 (Kardus Box) sudah delivered. 4 vendor aktif dengan rating rata-rata 4,1/5. Rekomendasi: approve PR-2847 segera mengingat stok baja mendekati minimum."

	case containsAny(msg, "keamanan", "security", "insiden", "incident", "visitor", "tamu"):
		return "Status keamanan: 3 insiden terbuka - 1 high severity (akses tidak sah Gate B, sedang diselidiki), 1 high severity (kehilangan laptop IT, dalam penanganan), 1 medium (kebocoran pipa, sudah resolved). 2 tamu aktif saat ini di area gedung. Rekomendasi: tingkatkan pengawasan Gate B dan lakukan audit akses kartu karyawan."

	case containsAny(msg, "kendaraan", "vehicle", "fleet", "bbm", "bahan bakar", "fuel"):
		return "Status armada: 5 kendaraan. 2 sedang dalam perjalanan (Innova & CR-V), 2 available (Colt Diesel & Elf NMR), 1 dalam maintenance (HiAce). Total konsumsi BBM minggu ini: 235,5 liter (Rp 1,87jt). CR-V perlu pengisian BBM segera (45%). Maintenance HiAce diperkirakan selesai 2 hari lagi."

	case containsAny(msg, "network", "jaringan", "internet", "server", "it"):
		return "Status jaringan: 6 dari 8 perangkat online. Firewall dan Router utama beroperasi normal (uptime 365 hari). Access Point Lt.2 dan CCTV DVR Gudang offline - perlu pengecekan. Bandwidth rata-rata: 750 Mbps in, 450 Mbps out. Server database CPU 45% - masih dalam batas normal. Saran: segera cek AP Lt.2 untuk memastikan konektivitas lantai 2."

	case containsAny(msg, "halo", "hi", "hello", "selamat", "apa kabar", "bantuan", "help"):
		return "Halo! Saya adalah asisten AI Smart Enterprise Platform. Saya dapat membantu Anda dengan informasi dan analisis mengenai: KPI & OEE, Status Produksi, Data Karyawan (HRIS), Inventori & Gudang, Jadwal Maintenance, Pembelian (PR/PO), Keamanan & Insiden, Armada Kendaraan, dan Jaringan IT. Silakan tanyakan apa yang Anda butuhkan!"

	default:
		return fmt.Sprintf("Terima kasih atas pertanyaan Anda mengenai '%s'. Sebagai asisten AI SEP, saya dapat membantu analisis KPI, OEE, produksi, HRIS, inventori, maintenance, pembelian, keamanan, armada, dan jaringan. Untuk informasi lebih spesifik, silakan tanyakan dengan kata kunci yang lebih detail atau hubungi tim IT support.", message)
	}
}

func containsAny(s string, keywords ...string) bool {
	for _, k := range keywords {
		if strings.Contains(s, k) {
			return true
		}
	}
	return false
}
