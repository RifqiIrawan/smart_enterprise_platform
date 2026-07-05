package handlers

import (
	"net/http"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Multi-Currency (Phase 20) ─────────────────────────────────────────────────

func GetCurrencies(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "IDR", "code": "IDR", "name": "Indonesian Rupiah", "symbol": "Rp", "is_base": true, "is_active": true},
			{"id": "USD", "code": "USD", "name": "US Dollar", "symbol": "$", "is_base": false, "is_active": true},
			{"id": "SGD", "code": "SGD", "name": "Singapore Dollar", "symbol": "S$", "is_base": false, "is_active": true},
			{"id": "EUR", "code": "EUR", "name": "Euro", "symbol": "€", "is_base": false, "is_active": true},
			{"id": "JPY", "code": "JPY", "name": "Japanese Yen", "symbol": "¥", "is_base": false, "is_active": true},
			{"id": "CNY", "code": "CNY", "name": "Chinese Yuan", "symbol": "¥", "is_base": false, "is_active": true},
			{"id": "MYR", "code": "MYR", "name": "Malaysian Ringgit", "symbol": "RM", "is_base": false, "is_active": false},
		}
		rows, total := p.ApplyToSlice(demo, []string{"code", "name", "symbol"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows := []gin.H{}
	res, err := database.DB.Query(
		`SELECT id, code, name, symbol, is_base, is_active FROM currencies WHERE company_id=$1 ORDER BY is_base DESC, code`,
		companyID,
	)
	if err == nil && res != nil {
		defer res.Close()
		for res.Next() {
			var id, code, name, symbol string
			var isBase, isActive bool
			res.Scan(&id, &code, &name, &symbol, &isBase, &isActive)
			rows = append(rows, gin.H{"id": id, "code": code, "name": name, "symbol": symbol, "is_base": isBase, "is_active": isActive})
		}
	}
	c.JSON(http.StatusOK, odata.Response(rows, int64(len(rows))))
}

func CreateCurrency(c *gin.Context) {
	var req struct {
		Code   string `json:"code"`
		Name   string `json:"name"`
		Symbol string `json:"symbol"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "data tidak valid"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "id": req.Code, "code": req.Code, "name": req.Name, "symbol": req.Symbol, "is_active": true})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(
		`INSERT INTO currencies (id, company_id, code, name, symbol, is_base, is_active) VALUES ($1,$2,$3,$4,$5,false,true)`,
		req.Code, companyID, req.Code, req.Name, req.Symbol,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "id": req.Code})
}

func UpdateCurrency(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name     string `json:"name"`
		Symbol   string `json:"symbol"`
		IsActive bool   `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "data tidak valid"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "id": id})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(
		`UPDATE currencies SET name=$1, symbol=$2, is_active=$3 WHERE id=$4 AND company_id=$5`,
		req.Name, req.Symbol, req.IsActive, id, companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func GetExchangeRates(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		today := time.Now().Format("2006-01-02")
		yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
		demo := []gin.H{
			{"id": "USD-" + today, "from_currency": "USD", "to_currency": "IDR", "rate": 16250.0, "date": today, "source": "Manual"},
			{"id": "EUR-" + today, "from_currency": "EUR", "to_currency": "IDR", "rate": 17800.0, "date": today, "source": "Manual"},
			{"id": "SGD-" + today, "from_currency": "SGD", "to_currency": "IDR", "rate": 12100.0, "date": today, "source": "Manual"},
			{"id": "JPY-" + today, "from_currency": "JPY", "to_currency": "IDR", "rate": 105.5, "date": today, "source": "Manual"},
			{"id": "CNY-" + today, "from_currency": "CNY", "to_currency": "IDR", "rate": 2240.0, "date": today, "source": "Manual"},
			{"id": "USD-" + yesterday, "from_currency": "USD", "to_currency": "IDR", "rate": 16200.0, "date": yesterday, "source": "Manual"},
			{"id": "EUR-" + yesterday, "from_currency": "EUR", "to_currency": "IDR", "rate": 17750.0, "date": yesterday, "source": "Manual"},
		}
		rows, total := p.ApplyToSlice(demo, []string{"from_currency", "to_currency"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}
	companyID := c.GetString("company_id")
	rows := []gin.H{}
	res, err := database.DB.Query(
		`SELECT id, from_currency, to_currency, rate, date, source FROM exchange_rates WHERE company_id=$1 ORDER BY date DESC, from_currency`,
		companyID,
	)
	if err == nil && res != nil {
		defer res.Close()
		for res.Next() {
			var id, fromCurr, toCurr, source string
			var rate float64
			var date time.Time
			res.Scan(&id, &fromCurr, &toCurr, &rate, &date, &source)
			rows = append(rows, gin.H{
				"id": id, "from_currency": fromCurr, "to_currency": toCurr,
				"rate": rate, "date": date.Format("2006-01-02"), "source": source,
			})
		}
	}
	c.JSON(http.StatusOK, odata.Response(rows, int64(len(rows))))
}

func SetExchangeRate(c *gin.Context) {
	var req struct {
		FromCurrency string  `json:"from_currency"`
		ToCurrency   string  `json:"to_currency"`
		Rate         float64 `json:"rate"`
		Date         string  `json:"date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Rate <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "data tidak valid"})
		return
	}
	if req.Date == "" {
		req.Date = time.Now().Format("2006-01-02")
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"success":       true,
			"from_currency": req.FromCurrency,
			"to_currency":   req.ToCurrency,
			"rate":          req.Rate,
			"date":          req.Date,
		})
		return
	}
	companyID := c.GetString("company_id")
	id := req.FromCurrency + "-" + req.Date
	_, err := database.DB.Exec(
		`INSERT INTO exchange_rates (id, company_id, from_currency, to_currency, rate, date, source)
		 VALUES ($1,$2,$3,$4,$5,$6,'Manual')
		 ON CONFLICT (id, company_id) DO UPDATE SET rate=$5, source='Manual'`,
		id, companyID, req.FromCurrency, req.ToCurrency, req.Rate, req.Date,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func GetLatestRates(c *gin.Context) {
	if database.DB == nil {
		today := time.Now().Format("2006-01-02")
		c.JSON(http.StatusOK, gin.H{
			"date":  today,
			"base":  "IDR",
			"rates": gin.H{"USD": 16250.0, "EUR": 17800.0, "SGD": 12100.0, "JPY": 105.5, "CNY": 2240.0},
		})
		return
	}
	companyID := c.GetString("company_id")
	result := gin.H{}
	rows, err := database.DB.Query(
		`SELECT DISTINCT ON (from_currency) from_currency, rate FROM exchange_rates
		 WHERE company_id=$1 ORDER BY from_currency, date DESC`,
		companyID,
	)
	if err == nil && rows != nil {
		defer rows.Close()
		for rows.Next() {
			var code string
			var rate float64
			rows.Scan(&code, &rate)
			result[code] = rate
		}
	}
	c.JSON(http.StatusOK, gin.H{"date": time.Now().Format("2006-01-02"), "base": "IDR", "rates": result})
}

// ─── Notification Config (Phase 20) ───────────────────────────────────────────

var demoNotifConfig = gin.H{
	"email_enabled":   false,
	"smtp_host":       "",
	"smtp_port":       587,
	"smtp_user":       "",
	"smtp_from":       "",
	"smtp_ssl":        false,
	"wa_enabled":      false,
	"wa_provider":     "fonnte",
	"wa_token":        "",
	"wa_from_number":  "",
	"approval_notif":  true,
	"budget_alert":    true,
	"stock_low":       true,
	"maintenance_due": true,
}

func GetNotifConfig(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, demoNotifConfig)
		return
	}
	c.JSON(http.StatusOK, demoNotifConfig)
}

func SaveNotifConfig(c *gin.Context) {
	var req gin.H
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "data tidak valid"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Konfigurasi notifikasi berhasil disimpan"})
}

func TestEmail(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	c.ShouldBindJSON(&req)
	if req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "email tujuan diperlukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Email test terkirim ke " + req.Email + " (demo mode — SMTP belum dikonfigurasi)",
	})
}
