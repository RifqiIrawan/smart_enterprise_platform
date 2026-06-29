package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"sep/backend/internal/database"

	"github.com/gin-gonic/gin"
)

type SearchResult struct {
	Module string `json:"module"`
	ID     int    `json:"id"`
	Title  string `json:"title"`
	Sub    string `json:"sub"`
	Path   string `json:"path"`
}

// ENT-06: Cross-module full-text search (ILIKE on DB, static demo fallback)
func GlobalSearch(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if len(q) < 2 {
		c.JSON(http.StatusOK, gin.H{"results": []SearchResult{}, "query": q})
		return
	}

	if database.DB == nil {
		results := demoSearch(q)
		c.JSON(http.StatusOK, gin.H{"results": results, "query": q, "total": len(results)})
		return
	}

	var results []SearchResult
	like := "%" + strings.ToLower(q) + "%"

	// Employees
	rows, _ := database.DB.Query(
		`SELECT id, name, department FROM employees WHERE LOWER(name) LIKE $1 OR LOWER(department) LIKE $1 LIMIT 5`, like)
	if rows != nil {
		for rows.Next() {
			var r SearchResult
			var dept string
			rows.Scan(&r.ID, &r.Title, &dept)
			r.Module = "HRIS"
			r.Sub = "Karyawan · " + dept
			r.Path = "/hris"
			results = append(results, r)
		}
		rows.Close()
	}

	// Inventory
	rows, _ = database.DB.Query(
		`SELECT id, name, category FROM inventory WHERE LOWER(name) LIKE $1 OR LOWER(category) LIKE $1 LIMIT 5`, like)
	if rows != nil {
		for rows.Next() {
			var r SearchResult
			var cat string
			rows.Scan(&r.ID, &r.Title, &cat)
			r.Module = "Warehouse"
			r.Sub = "Inventori · " + cat
			r.Path = "/warehouse"
			results = append(results, r)
		}
		rows.Close()
	}

	// Assets
	rows, _ = database.DB.Query(
		`SELECT id, name, location FROM assets WHERE LOWER(name) LIKE $1 OR LOWER(location) LIKE $1 LIMIT 5`, like)
	if rows != nil {
		for rows.Next() {
			var r SearchResult
			var loc string
			rows.Scan(&r.ID, &r.Title, &loc)
			r.Module = "Asset"
			r.Sub = "Aset · " + loc
			r.Path = "/asset"
			results = append(results, r)
		}
		rows.Close()
	}

	// Purchase Requests
	rows, _ = database.DB.Query(
		`SELECT id, item_name, status FROM purchase_requests WHERE LOWER(item_name) LIKE $1 LIMIT 5`, like)
	if rows != nil {
		for rows.Next() {
			var r SearchResult
			var status string
			rows.Scan(&r.ID, &r.Title, &status)
			r.Module = "Purchasing"
			r.Sub = fmt.Sprintf("Purchase Request · %s", status)
			r.Path = "/purchasing"
			results = append(results, r)
		}
		rows.Close()
	}

	// Work Orders
	rows, _ = database.DB.Query(
		`SELECT id, product_name, status FROM work_orders WHERE LOWER(product_name) LIKE $1 LIMIT 5`, like)
	if rows != nil {
		for rows.Next() {
			var r SearchResult
			var status string
			rows.Scan(&r.ID, &r.Title, &status)
			r.Module = "Factory"
			r.Sub = fmt.Sprintf("Work Order · %s", status)
			r.Path = "/factory"
			results = append(results, r)
		}
		rows.Close()
	}

	if results == nil {
		results = []SearchResult{}
	}
	c.JSON(http.StatusOK, gin.H{"results": results, "query": q, "total": len(results)})
}

func demoSearch(q string) []SearchResult {
	lower := strings.ToLower(q)
	all := []SearchResult{
		{Module: "HRIS", ID: 1, Title: "Ahmad Fauzi", Sub: "Karyawan · Engineering", Path: "/hris"},
		{Module: "HRIS", ID: 2, Title: "Siti Rahayu", Sub: "Karyawan · HR", Path: "/hris"},
		{Module: "HRIS", ID: 3, Title: "Budi Santoso", Sub: "Karyawan · Finance", Path: "/hris"},
		{Module: "Warehouse", ID: 1, Title: "Besi Plat 5mm", Sub: "Inventori · Raw Material", Path: "/warehouse"},
		{Module: "Warehouse", ID: 2, Title: "Oli Mesin SAE40", Sub: "Inventori · Consumable", Path: "/warehouse"},
		{Module: "Warehouse", ID: 3, Title: "Bearing SKF 6205", Sub: "Inventori · Spare Part", Path: "/warehouse"},
		{Module: "Asset", ID: 1, Title: "Mesin CNC-01", Sub: "Aset · Lantai Produksi", Path: "/asset"},
		{Module: "Asset", ID: 2, Title: "Forklift Toyota", Sub: "Aset · Gudang", Path: "/asset"},
		{Module: "Asset", ID: 3, Title: "Server Dell R740", Sub: "Aset · Server Room", Path: "/asset"},
		{Module: "Purchasing", ID: 1, Title: "Besi Hollow 40x40", Sub: "Purchase Request · pending", Path: "/purchasing"},
		{Module: "Purchasing", ID: 2, Title: "Oli Mesin 20L", Sub: "Purchase Request · approved", Path: "/purchasing"},
		{Module: "Factory", ID: 1, Title: "Bracket Motor Pump", Sub: "Work Order · running", Path: "/factory"},
		{Module: "Factory", ID: 2, Title: "Frame Panel Listrik", Sub: "Work Order · completed", Path: "/factory"},
		{Module: "Accounting", ID: 1, Title: "Kas dan Bank", Sub: "Chart of Accounts · Aset Lancar", Path: "/accounting"},
		{Module: "Accounting", ID: 2, Title: "Pendapatan Usaha", Sub: "Chart of Accounts · Pendapatan", Path: "/accounting"},
	}

	var results []SearchResult
	for _, r := range all {
		if strings.Contains(strings.ToLower(r.Title), lower) ||
			strings.Contains(strings.ToLower(r.Sub), lower) ||
			strings.Contains(strings.ToLower(r.Module), lower) {
			results = append(results, r)
		}
	}
	return results
}
