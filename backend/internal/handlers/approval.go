package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"sep/backend/internal/database"
	"sep/backend/internal/odata"

	"github.com/gin-gonic/gin"
)

// ApprovalLevel is one step in an approval_rules.levels JSONB array.
type ApprovalLevel struct {
	Level        int    `json:"level"`
	ApproverRole string `json:"approver_role"`
}

// approvalFinalizers lets each module register how to flip its own document's
// status once an approval_requests row reaches a final state, without approval.go
// needing to know each module's schema. Key is "module:doc_type".
var approvalFinalizers = map[string]func(docID, finalStatus string){}

func RegisterApprovalFinalizer(module, docType string, fn func(docID, finalStatus string)) {
	approvalFinalizers[module+":"+docType] = fn
}

// SubmitForApproval looks up an active rule for module+docType whose min_amount
// threshold (if any) is met by amount. If a rule matches, it creates a pending
// approval_requests row at level 1 and notifies the level-1 approvers, returning
// required=true. If no rule matches, required=false and the caller should proceed
// with its own legacy immediate-approve behavior.
func SubmitForApproval(companyID, module, docType, docID, docNumber string, amount float64, requestedBy string) (requestID string, required bool, err error) {
	if database.DB == nil {
		return "", false, nil
	}

	var ruleID string
	var levelsRaw []byte
	rerr := database.DB.QueryRow(
		`SELECT id, levels FROM approval_rules
		 WHERE company_id=$1 AND module=$2 AND doc_type=$3 AND is_active=TRUE
		   AND (min_amount IS NULL OR min_amount <= $4)
		 ORDER BY min_amount DESC NULLS LAST LIMIT 1`,
		companyID, module, docType, int64(amount),
	).Scan(&ruleID, &levelsRaw)
	if rerr != nil {
		return "", false, nil
	}

	var levels []ApprovalLevel
	if jerr := json.Unmarshal(levelsRaw, &levels); jerr != nil || len(levels) == 0 {
		return "", false, nil
	}

	rowErr := database.DB.QueryRow(
		`INSERT INTO approval_requests (company_id, rule_id, module, doc_type, doc_id, doc_number, amount, requested_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		companyID, ruleID, module, docType, docID, docNumber, int64(amount), requestedBy,
	).Scan(&requestID)
	if rowErr != nil {
		return "", false, rowErr
	}

	database.NotifyRole(companyID, levels[0].ApproverRole, "Persetujuan Menunggu",
		"Dokumen "+docNumber+" ("+module+"/"+docType+") menunggu persetujuan Anda", "info")

	return requestID, true, nil
}

// isDelegatedApprover reports whether userID is currently delegated to act for approverRole.
func isDelegatedApprover(userID, approverRole string) bool {
	if database.DB == nil {
		return false
	}
	var exists int
	err := database.DB.QueryRow(
		`SELECT 1 FROM approval_delegations d JOIN users u ON u.id = d.delegate_from
		 WHERE d.delegate_to=$1 AND u.role=$2 AND CURRENT_DATE BETWEEN d.start_date AND d.end_date LIMIT 1`,
		userID, approverRole,
	).Scan(&exists)
	return err == nil
}

func GetMyApprovals(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "ap1", "module": "purchasing", "doc_type": "pr", "doc_number": "PR-2847", "amount": 65000000, "current_level": 1, "requested_by": "Budi Santoso", "created_at": now.Add(-2 * time.Hour)},
			{"id": "ap2", "module": "sales", "doc_type": "so", "doc_number": "SO-2026-014", "amount": 120000000, "current_level": 1, "requested_by": "Sari Dewi", "created_at": now.Add(-5 * time.Hour)},
		}
		rows, total := p.ApplyToSlice(demo, []string{"doc_number", "module", "doc_type"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	userID := c.GetString("user_id")
	role := c.GetString("role")

	rows, err := database.DB.Query(
		`SELECT ar.id, ar.module, ar.doc_type, ar.doc_id, ar.doc_number, ar.amount, ar.current_level, ar.requested_by, ar.created_at, r.levels
		 FROM approval_requests ar JOIN approval_rules r ON r.id = ar.rule_id
		 WHERE ar.company_id=$1 AND ar.status='pending' ORDER BY ar.created_at DESC LIMIT 100`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id, module, docType, docID, docNumber, requestedBy string
		var amount int64
		var currentLevel int
		var createdAt time.Time
		var levelsRaw []byte
		if err := rows.Scan(&id, &module, &docType, &docID, &docNumber, &amount, &currentLevel, &requestedBy, &createdAt, &levelsRaw); err != nil {
			continue
		}
		var levels []ApprovalLevel
		json.Unmarshal(levelsRaw, &levels)
		if currentLevel-1 < 0 || currentLevel-1 >= len(levels) {
			continue
		}
		approverRole := levels[currentLevel-1].ApproverRole
		if approverRole != role && !isDelegatedApprover(userID, approverRole) {
			continue
		}
		items = append(items, gin.H{
			"id": id, "module": module, "doc_type": docType, "doc_id": docID, "doc_number": docNumber,
			"amount": amount, "current_level": currentLevel, "total_levels": len(levels),
			"requested_by": requestedBy, "created_at": createdAt,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func GetApprovalRequest(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": "pending"}, "actions": []gin.H{}})
		return
	}
	var module, docType, docID, docNumber, status, requestedBy string
	var amount int64
	var currentLevel int
	var createdAt time.Time
	err := database.DB.QueryRow(
		`SELECT module, doc_type, doc_id, doc_number, amount, status, current_level, requested_by, created_at
		 FROM approval_requests WHERE id=$1`, id,
	).Scan(&module, &docType, &docID, &docNumber, &amount, &status, &currentLevel, &requestedBy, &createdAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "approval request not found"})
		return
	}

	rows, err := database.DB.Query(
		`SELECT level, approver_role, action, actor_id, note, acted_at FROM approval_actions WHERE request_id=$1 ORDER BY acted_at ASC`, id,
	)
	var actions []gin.H
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var level int
			var approverRole, action, actorID, note string
			var actedAt time.Time
			rows.Scan(&level, &approverRole, &action, &actorID, &note, &actedAt)
			actions = append(actions, gin.H{
				"level": level, "approver_role": approverRole, "action": action,
				"actor_id": actorID, "note": note, "acted_at": actedAt,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"id": id, "module": module, "doc_type": docType, "doc_id": docID, "doc_number": docNumber,
		"amount": amount, "status": status, "current_level": currentLevel,
		"requested_by": requestedBy, "created_at": createdAt,
	}, "actions": actions})
}

func GetApprovalHistory(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		now := time.Now()
		demo := []gin.H{
			{"id": "ah1", "module": "purchasing", "doc_type": "pr", "doc_number": "PR-2846", "amount": 15000000, "status": "approved", "requested_by": "Andi Wijaya", "created_at": now.Add(-24 * time.Hour)},
			{"id": "ah2", "module": "hris", "doc_type": "cuti", "doc_number": "CUTI-0231", "amount": 0, "status": "rejected", "requested_by": "Sari Dewi", "created_at": now.Add(-48 * time.Hour)},
		}
		rows, total := p.ApplyToSlice(demo, []string{"doc_number", "module", "doc_type", "status"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, module, doc_type, doc_number, amount, status, requested_by, created_at, updated_at
		 FROM approval_requests WHERE company_id=$1 AND status != 'pending' ORDER BY updated_at DESC LIMIT 100`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id, module, docType, docNumber, status, requestedBy string
		var amount int64
		var createdAt, updatedAt time.Time
		rows.Scan(&id, &module, &docType, &docNumber, &amount, &status, &requestedBy, &createdAt, &updatedAt)
		items = append(items, gin.H{
			"id": id, "module": module, "doc_type": docType, "doc_number": docNumber,
			"amount": amount, "status": status, "requested_by": requestedBy,
			"created_at": createdAt, "updated_at": updatedAt,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func ActOnApproval(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Action string `json:"action"`
		Note   string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || (req.Action != "approve" && req.Action != "reject") {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "action must be 'approve' or 'reject'"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "status": req.Action + "d"}})
		return
	}

	userID := c.GetString("user_id")
	role := c.GetString("role")

	var companyID, module, docType, docID, status, ruleID string
	var currentLevel int
	err := database.DB.QueryRow(
		`SELECT company_id, module, doc_type, doc_id, status, current_level, rule_id FROM approval_requests WHERE id=$1`, id,
	).Scan(&companyID, &module, &docType, &docID, &status, &currentLevel, &ruleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "approval request not found"})
		return
	}
	if status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "approval request sudah diproses"})
		return
	}

	var levelsRaw []byte
	database.DB.QueryRow(`SELECT levels FROM approval_rules WHERE id=$1`, ruleID).Scan(&levelsRaw)
	var levels []ApprovalLevel
	json.Unmarshal(levelsRaw, &levels)
	if currentLevel-1 < 0 || currentLevel-1 >= len(levels) {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "approval rule tidak valid"})
		return
	}
	approverRole := levels[currentLevel-1].ApproverRole
	if approverRole != role && !isDelegatedApprover(userID, approverRole) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Anda bukan approver untuk level ini"})
		return
	}

	actionWord := req.Action + "d"
	database.DB.Exec(
		`INSERT INTO approval_actions (request_id, level, approver_role, action, actor_id, note) VALUES ($1,$2,$3,$4,$5,$6)`,
		id, currentLevel, approverRole, actionWord, userID, req.Note,
	)

	var requestedBy string
	database.DB.QueryRow(`SELECT requested_by FROM approval_requests WHERE id=$1`, id).Scan(&requestedBy)

	if req.Action == "reject" {
		database.DB.Exec(`UPDATE approval_requests SET status='rejected', updated_at=NOW() WHERE id=$1`, id)
		if fn, ok := approvalFinalizers[module+":"+docType]; ok {
			fn(docID, "rejected")
		}
		database.CreateNotification(requestedBy, "Dokumen Ditolak", "Dokumen "+docType+" Anda ditolak pada level "+strconv.Itoa(currentLevel), "danger")
	} else if currentLevel < len(levels) {
		database.DB.Exec(`UPDATE approval_requests SET current_level=current_level+1, updated_at=NOW() WHERE id=$1`, id)
		database.NotifyRole(companyID, levels[currentLevel].ApproverRole, "Persetujuan Menunggu",
			"Dokumen "+docType+" menunggu persetujuan Anda", "info")
	} else {
		database.DB.Exec(`UPDATE approval_requests SET status='approved', updated_at=NOW() WHERE id=$1`, id)
		if fn, ok := approvalFinalizers[module+":"+docType]; ok {
			fn(docID, "approved")
		}
		database.CreateNotification(requestedBy, "Dokumen Disetujui", "Dokumen "+docType+" Anda telah disetujui sepenuhnya", "success")
	}

	database.WriteAuditLog(userID, "APPROVAL_"+actionWord, module+"."+docType, docID, "Level "+strconv.Itoa(currentLevel)+": "+req.Note, c.ClientIP())
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id, "action": req.Action}})
}

// ─── APPROVAL RULES CONFIG ───────────────────────────────────────────────────

func GetApprovalRules(c *gin.Context) {
	p := odata.Parse(c)
	if database.DB == nil {
		demo := []gin.H{
			{"id": "r1", "module": "purchasing", "doc_type": "pr", "min_amount": 5000000, "levels": []ApprovalLevel{{Level: 1, ApproverRole: "manager"}, {Level: 2, ApproverRole: "admin"}}, "is_active": true},
			{"id": "r2", "module": "hris", "doc_type": "cuti", "min_amount": nil, "levels": []ApprovalLevel{{Level: 1, ApproverRole: "manager"}}, "is_active": true},
		}
		rows, total := p.ApplyToSlice(demo, []string{"module", "doc_type"})
		c.JSON(http.StatusOK, odata.Response(rows, total))
		return
	}

	companyID := c.GetString("company_id")
	rows, err := database.DB.Query(
		`SELECT id, module, doc_type, min_amount, levels, is_active FROM approval_rules WHERE company_id=$1 ORDER BY module, doc_type`,
		companyID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	defer rows.Close()

	var items []gin.H
	for rows.Next() {
		var id, module, docType string
		var minAmount *int64
		var levelsRaw []byte
		var isActive bool
		rows.Scan(&id, &module, &docType, &minAmount, &levelsRaw, &isActive)
		var levels []ApprovalLevel
		json.Unmarshal(levelsRaw, &levels)
		items = append(items, gin.H{
			"id": id, "module": module, "doc_type": docType, "min_amount": minAmount,
			"levels": levels, "is_active": isActive,
		})
	}
	c.JSON(http.StatusOK, odata.Response(items, int64(len(items))))
}

func CreateApprovalRule(c *gin.Context) {
	var req struct {
		Module    string          `json:"module"`
		DocType   string          `json:"doc_type"`
		MinAmount *int64          `json:"min_amount"`
		Levels    []ApprovalLevel `json:"levels"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Module == "" || req.DocType == "" || len(req.Levels) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "module, doc_type, dan minimal 1 level wajib diisi"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": "new-rule-id", "module": req.Module, "doc_type": req.DocType}})
		return
	}
	companyID := c.GetString("company_id")
	levelsJSON, _ := json.Marshal(req.Levels)
	var id string
	err := database.DB.QueryRow(
		`INSERT INTO approval_rules (company_id, module, doc_type, min_amount, levels) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		companyID, req.Module, req.DocType, req.MinAmount, levelsJSON,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

func UpdateApprovalRule(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		MinAmount *int64          `json:"min_amount"`
		Levels    []ApprovalLevel `json:"levels"`
		IsActive  bool            `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": id}})
		return
	}
	companyID := c.GetString("company_id")
	levelsJSON, _ := json.Marshal(req.Levels)
	database.DB.Exec(
		`UPDATE approval_rules SET min_amount=$1, levels=$2, is_active=$3 WHERE id=$4 AND company_id=$5`,
		req.MinAmount, levelsJSON, req.IsActive, id, companyID,
	)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func DeleteApprovalRule(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	companyID := c.GetString("company_id")
	database.DB.Exec(`DELETE FROM approval_rules WHERE id=$1 AND company_id=$2`, id, companyID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}
