package odata

import (
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

const DefaultTop = 25
const MaxTop = 100

type Params struct {
	Top     int
	Skip    int
	OrderBy string
	Search  string
}

func Parse(c *gin.Context) Params {
	top, _ := strconv.Atoi(c.DefaultQuery("$top", strconv.Itoa(DefaultTop)))
	skip, _ := strconv.Atoi(c.DefaultQuery("$skip", "0"))
	if top <= 0 || top > MaxTop {
		top = DefaultTop
	}
	if skip < 0 {
		skip = 0
	}
	return Params{
		Top:     top,
		Skip:    skip,
		OrderBy: c.Query("$orderby"),
		Search:  strings.ToLower(strings.TrimSpace(c.Query("$search"))),
	}
}

// ApplyToSlice filters, sorts, and paginates a demo data slice in-memory.
// searchFields: which keys to match the search term against.
// Returns (page of rows, total count before pagination).
func (p Params) ApplyToSlice(data []gin.H, searchFields []string) ([]gin.H, int64) {
	rows := data
	if p.Search != "" {
		var out []gin.H
		for _, row := range data {
			for _, f := range searchFields {
				if strings.Contains(strings.ToLower(fmt.Sprintf("%v", row[f])), p.Search) {
					out = append(out, row)
					break
				}
			}
		}
		rows = out
	}
	total := int64(len(rows))

	if p.OrderBy != "" {
		parts := strings.Fields(p.OrderBy)
		field := parts[0]
		desc := len(parts) > 1 && strings.EqualFold(parts[1], "desc")
		sort.SliceStable(rows, func(i, j int) bool {
			a := fmt.Sprintf("%v", rows[i][field])
			b := fmt.Sprintf("%v", rows[j][field])
			if desc {
				return a > b
			}
			return a < b
		})
	}

	start := p.Skip
	if start >= len(rows) {
		return []gin.H{}, total
	}
	end := start + p.Top
	if end > len(rows) {
		end = len(rows)
	}
	return rows[start:end], total
}

// SQLClauses generates ORDER BY and LIMIT/OFFSET SQL clauses.
// allowedFields maps OData field name → SQL column name (prevents injection).
func (p Params) SQLClauses(allowedFields map[string]string, defaultOrder string) (string, string) {
	orderClause := defaultOrder
	if p.OrderBy != "" {
		parts := strings.Fields(p.OrderBy)
		if col, ok := allowedFields[parts[0]]; ok {
			dir := "ASC"
			if len(parts) > 1 && strings.EqualFold(parts[1], "desc") {
				dir = "DESC"
			}
			orderClause = fmt.Sprintf("ORDER BY %s %s", col, dir)
		}
	}
	return orderClause, fmt.Sprintf("LIMIT %d OFFSET %d", p.Top, p.Skip)
}

// Response wraps data in OData response format.
func Response(value interface{}, count int64) gin.H {
	if value == nil {
		value = []gin.H{}
	}
	return gin.H{
		"@odata.count": count,
		"value":        value,
	}
}
