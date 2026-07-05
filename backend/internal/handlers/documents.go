package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"sep/backend/internal/database"
	"sep/backend/internal/odata"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Document Management (Phase 20) ───────────────────────────────────────────

func UploadDocument(c *gin.Context) {
	refType := c.PostForm("ref_type")
	refID := c.PostForm("ref_id")

	if database.DB == nil {
		fileHeader, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "file diperlukan"})
			return
		}
		id := fmt.Sprintf("DOC-%04d", time.Now().UnixMilli()%9999)
		c.JSON(http.StatusOK, gin.H{
			"success":    true,
			"id":         id,
			"name":       fileHeader.Filename,
			"size":       fileHeader.Size,
			"ref_type":   refType,
			"ref_id":     refID,
			"url":        "/api/v1/documents/" + id + "/download",
			"created_at": time.Now().Format("2006-01-02 15:04"),
			"message":    "File berhasil diupload (demo mode — tidak disimpan secara permanen)",
		})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "file diperlukan"})
		return
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	allowed := map[string]bool{".pdf": true, ".jpg": true, ".jpeg": true, ".png": true, ".xlsx": true, ".xls": true, ".docx": true}
	if !allowed[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "tipe file tidak diizinkan"})
		return
	}

	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	id := fmt.Sprintf("DOC-%d", time.Now().UnixMilli())

	_, err = database.DB.Exec(
		`INSERT INTO documents (id, company_id, ref_type, ref_id, name, size, mime_type, uploaded_by, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
		id, companyID, refType, refID, fileHeader.Filename, fileHeader.Size, fileHeader.Header.Get("Content-Type"), userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "id": id, "name": fileHeader.Filename})
}

func GetDocuments(c *gin.Context) {
	p := odata.Parse(c)
	refType := c.Query("ref_type")
	refID := c.Query("ref_id")

	if database.DB == nil {
		demo := []gin.H{
			{"id": "DOC-001", "ref_type": "SO", "ref_id": "SO/2026/001", "name": "Sales_Order_001.pdf", "mime_type": "application/pdf", "size": 245760, "uploaded_by": "Admin Sistem", "created_at": "2026-06-28 10:00"},
			{"id": "DOC-002", "ref_type": "PO", "ref_id": "PO/2026/042", "name": "PO_PT_Maju_Jaya.pdf", "mime_type": "application/pdf", "size": 189440, "uploaded_by": "Budi Santoso", "created_at": "2026-06-28 09:30"},
			{"id": "DOC-003", "ref_type": "GRN", "ref_id": "GRN/2026/018", "name": "GRN_delivery_note.jpg", "mime_type": "image/jpeg", "size": 512000, "uploaded_by": "Fajar Nugroho", "created_at": "2026-06-27 14:15"},
			{"id": "DOC-004", "ref_type": "INV", "ref_id": "INV/2026/011", "name": "Invoice_Customer_Bahari.pdf", "mime_type": "application/pdf", "size": 156672, "uploaded_by": "Sari Dewi", "created_at": "2026-06-27 11:00"},
			{"id": "DOC-005", "ref_type": "QC", "ref_id": "QC/2026/033", "name": "CoA_Material_Baja.pdf", "mime_type": "application/pdf", "size": 98304, "uploaded_by": "Admin Sistem", "created_at": "2026-06-26 16:45"},
			{"id": "DOC-006", "ref_type": "ASSET", "ref_id": "AST-001", "name": "BPKB_Mesin_CNC.pdf", "mime_type": "application/pdf", "size": 1048576, "uploaded_by": "Andi Wijaya", "created_at": "2026-06-26 10:00"},
			{"id": "DOC-007", "ref_type": "HR", "ref_id": "EMP-003", "name": "Kontrak_Kerja_Sari.docx", "mime_type": "application/docx", "size": 45056, "uploaded_by": "Dewi Rahayu", "created_at": "2026-06-25 09:00"},
			{"id": "DOC-008", "ref_type": "SO", "ref_id": "SO/2026/002", "name": "Spec_Sheet_Product.xlsx", "mime_type": "application/xlsx", "size": 72704, "uploaded_by": "Gita Puspita", "created_at": "2026-06-25 13:30"},
		}
		filtered := demo
		if refType != "" || refID != "" {
			filtered = []gin.H{}
			for _, d := range demo {
				if (refType == "" || d["ref_type"] == refType) && (refID == "" || d["ref_id"] == refID) {
					filtered = append(filtered, d)
				}
			}
		}
		rows, total := p.ApplyToSlice(filtered, []string{"name", "ref_type", "ref_id", "uploaded_by"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	args := []interface{}{companyID}
	query := `SELECT id, ref_type, ref_id, name, size, mime_type, uploaded_by, created_at FROM documents WHERE company_id=$1`
	if refType != "" {
		args = append(args, refType)
		query += fmt.Sprintf(" AND ref_type=$%d", len(args))
	}
	if refID != "" {
		args = append(args, refID)
		query += fmt.Sprintf(" AND ref_id=$%d", len(args))
	}
	query += " ORDER BY created_at DESC"

	rows := []gin.H{}
	res, err := database.DB.Query(query, args...)
	if err == nil && res != nil {
		defer res.Close()
		for res.Next() {
			var id, refT, refI, name, mimeType, uploadedBy string
			var size int64
			var createdAt time.Time
			res.Scan(&id, &refT, &refI, &name, &size, &mimeType, &uploadedBy, &createdAt)
			rows = append(rows, gin.H{
				"id": id, "ref_type": refT, "ref_id": refI, "name": name,
				"size": size, "mime_type": mimeType, "uploaded_by": uploadedBy,
				"created_at": createdAt.Format("2006-01-02 15:04"),
			})
		}
	}
	c.JSON(http.StatusOK, odata.Response(rows, int64(len(rows))))
}

func DeleteDocument(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "id": id})
		return
	}
	companyID := c.GetString("company_id")
	_, err := database.DB.Exec(`DELETE FROM documents WHERE id=$1 AND company_id=$2`, id, companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}
