package database

import (
	"database/sql"
	"fmt"
	"log"
	"sep/backend/internal/config"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func Connect(cfg *config.Config) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
	)
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Printf("DB connection error: %v (running without DB)", err)
		return
	}
	if err = db.Ping(); err != nil {
		log.Printf("DB ping error: %v (running without DB)", err)
		return
	}
	DB = db
	log.Println("Database connected")
	Migrate()
}

func Migrate() {
	if DB == nil {
		return
	}
	queries := []string{
		// Core
		`CREATE TABLE IF NOT EXISTS companies (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(255) NOT NULL,
			npwp VARCHAR(50),
			address TEXT,
			phone VARCHAR(50),
			email VARCHAR(255),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID REFERENCES companies(id),
			name VARCHAR(255) NOT NULL,
			email VARCHAR(255) UNIQUE NOT NULL,
			password VARCHAR(255) NOT NULL,
			role VARCHAR(50) DEFAULT 'operator',
			permissions JSONB DEFAULT '[]',
			is_active BOOLEAN DEFAULT TRUE,
			last_login TIMESTAMPTZ,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS audit_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID,
			action VARCHAR(100) NOT NULL,
			entity VARCHAR(100),
			entity_id VARCHAR(100),
			description TEXT,
			ip_address VARCHAR(50),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS notifications (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID REFERENCES users(id),
			title VARCHAR(255) NOT NULL,
			message TEXT NOT NULL,
			type VARCHAR(50) DEFAULT 'info',
			is_read BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Factory
		`CREATE TABLE IF NOT EXISTS machines (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			machine_code VARCHAR(50) UNIQUE NOT NULL,
			name VARCHAR(255) NOT NULL,
			status VARCHAR(50) DEFAULT 'idle',
			oee NUMERIC(5,2) DEFAULT 0,
			location VARCHAR(100),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS work_orders (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			wo_number VARCHAR(50) UNIQUE NOT NULL,
			product_name VARCHAR(255) NOT NULL,
			target_qty INTEGER NOT NULL,
			actual_qty INTEGER DEFAULT 0,
			machine_id VARCHAR(50),
			status VARCHAR(50) DEFAULT 'pending',
			eta TIMESTAMPTZ,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS bom (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			product_name VARCHAR(255) NOT NULL,
			material_name VARCHAR(255) NOT NULL,
			quantity NUMERIC(10,3) NOT NULL,
			unit VARCHAR(50),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS downtime_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			machine_id UUID,
			wo_id UUID,
			start_time TIMESTAMPTZ,
			end_time TIMESTAMPTZ,
			reason TEXT,
			category VARCHAR(100),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// HRIS
		`CREATE TABLE IF NOT EXISTS employees (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			emp_number VARCHAR(50) UNIQUE NOT NULL,
			name VARCHAR(255) NOT NULL,
			email VARCHAR(255),
			department VARCHAR(100),
			position VARCHAR(100),
			salary BIGINT DEFAULT 0,
			status VARCHAR(50) DEFAULT 'active',
			join_date DATE,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS attendance (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			employee_id UUID REFERENCES employees(id),
			date DATE NOT NULL,
			check_in TIMESTAMPTZ,
			check_out TIMESTAMPTZ,
			status VARCHAR(50) DEFAULT 'present',
			notes TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS leave_requests (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			employee_id UUID REFERENCES employees(id),
			type VARCHAR(50) NOT NULL,
			start_date DATE NOT NULL,
			end_date DATE NOT NULL,
			reason TEXT,
			status VARCHAR(50) DEFAULT 'pending',
			approved_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS payroll (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			employee_id UUID REFERENCES employees(id),
			period VARCHAR(20) NOT NULL,
			basic_salary BIGINT DEFAULT 0,
			allowances BIGINT DEFAULT 0,
			deductions BIGINT DEFAULT 0,
			net_salary BIGINT DEFAULT 0,
			status VARCHAR(50) DEFAULT 'draft',
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// HRIS Advanced (Phase 16)
		`CREATE TABLE IF NOT EXISTS job_postings (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			title VARCHAR(255) NOT NULL,
			department VARCHAR(100),
			description TEXT,
			requirements TEXT,
			status VARCHAR(50) DEFAULT 'open',
			open_date DATE,
			close_date DATE,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS candidates (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			job_id UUID REFERENCES job_postings(id),
			name VARCHAR(255) NOT NULL,
			email VARCHAR(255),
			phone VARCHAR(50),
			stage VARCHAR(50) DEFAULT 'Melamar',
			applied_date DATE,
			notes TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS training_programs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			title VARCHAR(255) NOT NULL,
			category VARCHAR(100),
			trainer VARCHAR(255),
			duration_hours INTEGER DEFAULT 8,
			description TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS training_schedules (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			program_id UUID REFERENCES training_programs(id),
			start_date DATE,
			end_date DATE,
			location VARCHAR(255),
			participants INTEGER DEFAULT 0,
			status VARCHAR(50) DEFAULT 'scheduled',
			score INTEGER,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS kpi_templates (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			title VARCHAR(255) NOT NULL,
			department VARCHAR(100),
			period VARCHAR(50),
			description TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS kpi_reviews (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			employee_id UUID REFERENCES employees(id),
			template_id UUID REFERENCES kpi_templates(id),
			period VARCHAR(20),
			self_score INTEGER,
			manager_score INTEGER,
			final_score INTEGER,
			status VARCHAR(50) DEFAULT 'self_review',
			notes TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS shifts (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			name VARCHAR(100) NOT NULL,
			start_time VARCHAR(10),
			end_time VARCHAR(10),
			type VARCHAR(50) DEFAULT 'regular',
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS overtime_records (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			employee_id UUID REFERENCES employees(id),
			date DATE NOT NULL,
			hours NUMERIC(5,2) NOT NULL,
			reason TEXT,
			rate_multiplier NUMERIC(4,2) DEFAULT 1.5,
			amount BIGINT DEFAULT 0,
			status VARCHAR(50) DEFAULT 'pending',
			approved_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Asset
		`CREATE TABLE IF NOT EXISTS assets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			asset_number VARCHAR(50) UNIQUE NOT NULL,
			name VARCHAR(255) NOT NULL,
			category VARCHAR(100),
			location VARCHAR(100),
			value BIGINT DEFAULT 0,
			condition VARCHAR(50) DEFAULT 'good',
			next_maintenance DATE,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS maintenance_schedules (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			asset_id UUID REFERENCES assets(id),
			type VARCHAR(100) NOT NULL,
			scheduled_date DATE,
			technician VARCHAR(255),
			status VARCHAR(50) DEFAULT 'scheduled',
			notes TEXT,
			completed_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Warehouse
		`CREATE TABLE IF NOT EXISTS inventory (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			sku VARCHAR(50),
			name VARCHAR(255) NOT NULL,
			category VARCHAR(100),
			qty INTEGER DEFAULT 0,
			min_stock INTEGER DEFAULT 0,
			unit VARCHAR(50),
			location VARCHAR(100),
			updated_at TIMESTAMPTZ DEFAULT NOW(),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS stock_movements (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			inventory_id UUID REFERENCES inventory(id),
			type VARCHAR(10) NOT NULL,
			qty INTEGER NOT NULL,
			reference VARCHAR(100),
			notes TEXT,
			created_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Purchasing
		`CREATE TABLE IF NOT EXISTS vendors (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			name VARCHAR(255) NOT NULL,
			category VARCHAR(100),
			contact VARCHAR(100),
			email VARCHAR(255),
			address TEXT,
			rating NUMERIC(3,1) DEFAULT 0,
			status VARCHAR(50) DEFAULT 'active',
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS purchase_requests (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			pr_number VARCHAR(50) UNIQUE NOT NULL,
			requester VARCHAR(255),
			department VARCHAR(100),
			item_name VARCHAR(255),
			qty INTEGER DEFAULT 0,
			unit VARCHAR(50),
			estimated_price BIGINT DEFAULT 0,
			status VARCHAR(50) DEFAULT 'pending',
			remarks TEXT,
			notes TEXT,
			updated_at TIMESTAMPTZ DEFAULT NOW(),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS purchase_orders (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			po_number VARCHAR(50) UNIQUE NOT NULL,
			vendor_id UUID,
			vendor_name VARCHAR(255),
			total_amount BIGINT DEFAULT 0,
			status VARCHAR(50) DEFAULT 'pending',
			order_date DATE DEFAULT CURRENT_DATE,
			delivery_date DATE,
			notes TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS goods_receipts (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			po_id UUID REFERENCES purchase_orders(id),
			received_qty INTEGER DEFAULT 0,
			received_date DATE,
			condition VARCHAR(50),
			notes TEXT,
			received_by VARCHAR(255),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Security
		`CREATE TABLE IF NOT EXISTS visitors (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			name VARCHAR(255) NOT NULL,
			company VARCHAR(255),
			purpose TEXT,
			host VARCHAR(255),
			check_in TIMESTAMPTZ DEFAULT NOW(),
			check_out TIMESTAMPTZ,
			status VARCHAR(50) DEFAULT 'active',
			badge VARCHAR(50),
			id_number VARCHAR(100),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS incidents (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			incident_number VARCHAR(50),
			title VARCHAR(255) NOT NULL,
			category VARCHAR(100),
			severity VARCHAR(50) DEFAULT 'medium',
			location VARCHAR(255),
			reported_by VARCHAR(255),
			description TEXT,
			status VARCHAR(50) DEFAULT 'open',
			resolution TEXT,
			updated_at TIMESTAMPTZ DEFAULT NOW(),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Vehicle
		`CREATE TABLE IF NOT EXISTS fleet (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			plate_number VARCHAR(20) UNIQUE NOT NULL,
			name VARCHAR(255),
			type VARCHAR(50),
			brand VARCHAR(100),
			model VARCHAR(100),
			status VARCHAR(50) DEFAULT 'available',
			driver VARCHAR(255),
			mileage INTEGER DEFAULT 0,
			fuel_pct INTEGER DEFAULT 100,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS fuel_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			vehicle_id UUID REFERENCES fleet(id),
			vehicle_plate VARCHAR(20),
			vehicle_name VARCHAR(255),
			liters NUMERIC(8,2) DEFAULT 0,
			price_per_liter INTEGER DEFAULT 0,
			total_cost BIGINT DEFAULT 0,
			odometer INTEGER DEFAULT 0,
			station VARCHAR(255),
			filled_by VARCHAR(255),
			date DATE DEFAULT CURRENT_DATE,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Network
		`CREATE TABLE IF NOT EXISTS network_devices (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			name VARCHAR(255) NOT NULL,
			type VARCHAR(100),
			ip_address VARCHAR(50),
			status VARCHAR(50) DEFAULT 'online',
			location VARCHAR(255),
			uptime VARCHAR(50),
			cpu_pct INTEGER DEFAULT 0,
			bandwidth_mbps INTEGER DEFAULT 0,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Sales (Phase 10)
		`CREATE TABLE IF NOT EXISTS customers (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			code VARCHAR(50),
			name VARCHAR(255) NOT NULL,
			npwp VARCHAR(30),
			address TEXT,
			city VARCHAR(100),
			phone VARCHAR(30),
			email VARCHAR(100),
			credit_limit BIGINT DEFAULT 0,
			payment_term INTEGER DEFAULT 30,
			category VARCHAR(50) DEFAULT 'regular',
			status VARCHAR(20) DEFAULT 'active',
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS sales_orders (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			so_number VARCHAR(50) UNIQUE NOT NULL,
			customer_id UUID REFERENCES customers(id),
			customer_name VARCHAR(255),
			date DATE NOT NULL,
			delivery_date DATE,
			subtotal BIGINT DEFAULT 0,
			tax_amount BIGINT DEFAULT 0,
			total BIGINT DEFAULT 0,
			status VARCHAR(30) DEFAULT 'draft',
			notes TEXT,
			approved_by VARCHAR(255),
			created_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS sales_order_items (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			so_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
			product_name VARCHAR(255) NOT NULL,
			qty NUMERIC(12,2) NOT NULL,
			unit VARCHAR(30) DEFAULT 'pcs',
			unit_price BIGINT NOT NULL,
			discount NUMERIC(5,2) DEFAULT 0,
			amount BIGINT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS delivery_orders (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			do_number VARCHAR(50) UNIQUE NOT NULL,
			so_id UUID REFERENCES sales_orders(id),
			customer_id UUID REFERENCES customers(id),
			customer_name VARCHAR(255),
			date DATE NOT NULL,
			status VARCHAR(30) DEFAULT 'draft',
			notes TEXT,
			created_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS delivery_order_items (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			do_id UUID REFERENCES delivery_orders(id) ON DELETE CASCADE,
			so_item_id UUID,
			product_name VARCHAR(255) NOT NULL,
			ordered_qty NUMERIC(12,2),
			delivered_qty NUMERIC(12,2) NOT NULL,
			unit VARCHAR(30) DEFAULT 'pcs'
		)`,
		`CREATE TABLE IF NOT EXISTS customer_invoices (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			inv_number VARCHAR(50) UNIQUE NOT NULL,
			do_id UUID REFERENCES delivery_orders(id),
			so_id UUID REFERENCES sales_orders(id),
			customer_id UUID REFERENCES customers(id),
			customer_name VARCHAR(255),
			date DATE NOT NULL,
			due_date DATE,
			subtotal BIGINT DEFAULT 0,
			tax_amount BIGINT DEFAULT 0,
			total BIGINT DEFAULT 0,
			paid_amount BIGINT DEFAULT 0,
			status VARCHAR(30) DEFAULT 'draft',
			notes TEXT,
			created_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Finance — AP/AR/Cash (Phase 11)
		`CREATE TABLE IF NOT EXISTS bank_accounts (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			name VARCHAR(100) NOT NULL,
			bank_name VARCHAR(100) NOT NULL,
			account_number VARCHAR(50) NOT NULL,
			branch VARCHAR(100),
			currency VARCHAR(10) DEFAULT 'IDR',
			balance BIGINT DEFAULT 0,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS vendor_invoices (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			vi_number VARCHAR(50) UNIQUE NOT NULL,
			po_id UUID REFERENCES purchase_orders(id),
			vendor_id UUID REFERENCES vendors(id),
			vendor_name VARCHAR(255),
			vendor_inv_number VARCHAR(100),
			inv_date DATE NOT NULL,
			due_date DATE,
			subtotal BIGINT DEFAULT 0,
			tax_amount BIGINT DEFAULT 0,
			total BIGINT DEFAULT 0,
			paid_amount BIGINT DEFAULT 0,
			status VARCHAR(30) DEFAULT 'unpaid',
			notes TEXT,
			created_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS payments_out (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			bank_account_id UUID REFERENCES bank_accounts(id),
			vendor_invoice_id UUID REFERENCES vendor_invoices(id),
			vendor_name VARCHAR(255),
			payment_date DATE NOT NULL,
			amount BIGINT NOT NULL,
			method VARCHAR(50) DEFAULT 'transfer',
			reference VARCHAR(100),
			notes TEXT,
			created_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS payments_in (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			bank_account_id UUID REFERENCES bank_accounts(id),
			customer_invoice_id UUID REFERENCES customer_invoices(id),
			customer_name VARCHAR(255),
			payment_date DATE NOT NULL,
			amount BIGINT NOT NULL,
			method VARCHAR(50) DEFAULT 'transfer',
			reference VARCHAR(100),
			notes TEXT,
			created_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Tax & Compliance (Phase 12)
		`CREATE TABLE IF NOT EXISTS tax_configs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			config_key VARCHAR(50) NOT NULL,
			config_value NUMERIC(5,2) NOT NULL,
			description TEXT,
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS pph21_calculations (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			employee_id UUID REFERENCES employees(id),
			employee_name VARCHAR(255),
			period VARCHAR(7) NOT NULL,
			bruto_gaji BIGINT DEFAULT 0,
			biaya_jabatan BIGINT DEFAULT 0,
			penghasilan_neto BIGINT DEFAULT 0,
			ptkp_status VARCHAR(10) DEFAULT 'TK/0',
			ptkp_amount BIGINT DEFAULT 0,
			pkp BIGINT DEFAULT 0,
			pph21_setahun BIGINT DEFAULT 0,
			pph21_sebulan BIGINT DEFAULT 0,
			created_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS bpjs_calculations (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			employee_id UUID REFERENCES employees(id),
			employee_name VARCHAR(255),
			period VARCHAR(7) NOT NULL,
			gaji_pokok BIGINT DEFAULT 0,
			jht_employee BIGINT DEFAULT 0,
			jht_company BIGINT DEFAULT 0,
			jp_employee BIGINT DEFAULT 0,
			jp_company BIGINT DEFAULT 0,
			jkk BIGINT DEFAULT 0,
			jkm BIGINT DEFAULT 0,
			kesehatan_employee BIGINT DEFAULT 0,
			kesehatan_company BIGINT DEFAULT 0,
			total_potongan_employee BIGINT DEFAULT 0,
			total_iuran_company BIGINT DEFAULT 0,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS pph23_records (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			bukti_number VARCHAR(50) NOT NULL,
			vendor_name VARCHAR(255),
			npwp VARCHAR(30),
			period VARCHAR(7) NOT NULL,
			jenis_penghasilan VARCHAR(100),
			bruto BIGINT DEFAULT 0,
			tarif NUMERIC(5,2) DEFAULT 2,
			pph23 BIGINT DEFAULT 0,
			notes TEXT,
			created_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Cost Accounting (Phase 15)
		`CREATE TABLE IF NOT EXISTS cost_centers (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			code VARCHAR(20) NOT NULL,
			name VARCHAR(100) NOT NULL,
			department VARCHAR(100),
			overhead_rate NUMERIC(10,4) DEFAULT 0,
			description TEXT,
			status VARCHAR(20) DEFAULT 'active',
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS wo_costs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			wo_number VARCHAR(50),
			product_name VARCHAR(255),
			material_cost BIGINT DEFAULT 0,
			labor_cost BIGINT DEFAULT 0,
			overhead_cost BIGINT DEFAULT 0,
			total_cost BIGINT DEFAULT 0,
			std_cost BIGINT DEFAULT 0,
			variance BIGINT DEFAULT 0,
			period VARCHAR(7),
			notes TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS standard_costs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			product_name VARCHAR(255) NOT NULL,
			material_std BIGINT DEFAULT 0,
			labor_std BIGINT DEFAULT 0,
			overhead_std BIGINT DEFAULT 0,
			total_std BIGINT DEFAULT 0,
			effective_date DATE DEFAULT NOW()::date,
			notes TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS cost_allocations (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			cost_center_id UUID REFERENCES cost_centers(id),
			cost_center_name VARCHAR(100),
			period VARCHAR(7) NOT NULL,
			actual_cost BIGINT DEFAULT 0,
			allocated_cost BIGINT DEFAULT 0,
			allocation_basis VARCHAR(50) DEFAULT 'labor_hours',
			notes TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Quality Management (Phase 14)
		`CREATE TABLE IF NOT EXISTS quality_inspections (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			type VARCHAR(20) NOT NULL,
			ref_number VARCHAR(50),
			ref_type VARCHAR(30),
			inspector VARCHAR(100),
			date DATE DEFAULT NOW()::date,
			result VARCHAR(20) DEFAULT 'pending',
			sample_size INT DEFAULT 0,
			defect_qty INT DEFAULT 0,
			notes TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS inspection_items (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			inspection_id UUID REFERENCES quality_inspections(id) ON DELETE CASCADE,
			parameter VARCHAR(100),
			spec_min NUMERIC(15,4),
			spec_max NUMERIC(15,4),
			actual_value NUMERIC(15,4),
			result VARCHAR(20) DEFAULT 'pending',
			notes TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS ncr (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			ncr_number VARCHAR(50) NOT NULL,
			ref_number VARCHAR(50),
			ref_type VARCHAR(30),
			description TEXT,
			severity VARCHAR(20) DEFAULT 'minor',
			root_cause TEXT,
			status VARCHAR(20) DEFAULT 'open',
			reported_by VARCHAR(100),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS capa (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			ncr_id UUID REFERENCES ncr(id) ON DELETE CASCADE,
			action TEXT,
			pic VARCHAR(100),
			due_date DATE,
			actual_date DATE,
			verification TEXT,
			status VARCHAR(20) DEFAULT 'open'
		)`,
		`CREATE TABLE IF NOT EXISTS measuring_tools (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			tool_code VARCHAR(50) NOT NULL,
			name VARCHAR(100) NOT NULL,
			type VARCHAR(50),
			location VARCHAR(100),
			last_calibration DATE,
			next_calibration DATE,
			calibration_interval_days INT DEFAULT 365,
			status VARCHAR(20) DEFAULT 'active',
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// MRP & Production Planning (Phase 13)
		`CREATE TABLE IF NOT EXISTS mrp_runs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			run_date DATE NOT NULL,
			period_start DATE,
			period_end DATE,
			status VARCHAR(20) DEFAULT 'completed',
			notes TEXT,
			created_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS mrp_results (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			mrp_run_id UUID REFERENCES mrp_runs(id),
			company_id UUID NOT NULL,
			item_id UUID,
			item_name VARCHAR(255),
			unit VARCHAR(20) DEFAULT 'pcs',
			gross_req NUMERIC(15,2) DEFAULT 0,
			stock_on_hand NUMERIC(15,2) DEFAULT 0,
			net_req NUMERIC(15,2) DEFAULT 0,
			order_qty NUMERIC(15,2) DEFAULT 0,
			order_date DATE,
			lead_time_days INT DEFAULT 7,
			auto_pr_created BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS production_schedules (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			wo_id UUID,
			wo_number VARCHAR(50),
			machine_id UUID,
			machine_name VARCHAR(100),
			shift VARCHAR(20) DEFAULT 'pagi',
			planned_start TIMESTAMPTZ,
			planned_end TIMESTAMPTZ,
			actual_start TIMESTAMPTZ,
			actual_end TIMESTAMPTZ,
			status VARCHAR(20) DEFAULT 'planned',
			notes TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS routings (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			product_id UUID,
			product_name VARCHAR(255),
			sequence INT DEFAULT 1,
			process_name VARCHAR(100),
			machine_name VARCHAR(100),
			std_time_minutes INT DEFAULT 0,
			description TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS lot_numbers (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			item_id UUID,
			item_name VARCHAR(255),
			lot_number VARCHAR(50) NOT NULL,
			qty NUMERIC(15,2) DEFAULT 0,
			manufactured_date DATE,
			expiry_date DATE,
			wo_number VARCHAR(50),
			status VARCHAR(20) DEFAULT 'available',
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// HR Advanced (Phase 16)
		`CREATE TABLE IF NOT EXISTS job_postings (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			title VARCHAR(200) NOT NULL,
			department VARCHAR(100),
			location VARCHAR(100),
			type VARCHAR(30) DEFAULT 'full_time',
			headcount INT DEFAULT 1,
			description TEXT,
			requirements TEXT,
			status VARCHAR(20) DEFAULT 'open',
			posted_date DATE DEFAULT NOW()::date,
			closed_date DATE,
			created_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS candidates (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			job_posting_id UUID REFERENCES job_postings(id),
			job_title VARCHAR(200),
			name VARCHAR(255) NOT NULL,
			email VARCHAR(255),
			phone VARCHAR(50),
			stage VARCHAR(30) DEFAULT 'applied',
			score INT DEFAULT 0,
			notes TEXT,
			applied_date DATE DEFAULT NOW()::date,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS training_programs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			code VARCHAR(30),
			name VARCHAR(200) NOT NULL,
			category VARCHAR(100),
			duration_hours INT DEFAULT 8,
			trainer VARCHAR(200),
			description TEXT,
			status VARCHAR(20) DEFAULT 'active',
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS training_schedules (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			program_id UUID REFERENCES training_programs(id),
			program_name VARCHAR(200),
			employee_id UUID REFERENCES employees(id),
			employee_name VARCHAR(255),
			scheduled_date DATE,
			location VARCHAR(200),
			status VARCHAR(20) DEFAULT 'scheduled',
			pre_score INT,
			post_score INT,
			notes TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS kpi_reviews (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			employee_id UUID REFERENCES employees(id),
			employee_name VARCHAR(255),
			department VARCHAR(100),
			period VARCHAR(7) NOT NULL,
			self_score NUMERIC(5,2) DEFAULT 0,
			manager_score NUMERIC(5,2) DEFAULT 0,
			final_score NUMERIC(5,2) DEFAULT 0,
			grade VARCHAR(5),
			notes TEXT,
			reviewed_by VARCHAR(200),
			status VARCHAR(20) DEFAULT 'draft',
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS overtime_records (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID NOT NULL,
			employee_id UUID REFERENCES employees(id),
			employee_name VARCHAR(255),
			department VARCHAR(100),
			date DATE NOT NULL,
			hours NUMERIC(5,2) NOT NULL,
			rate_multiplier NUMERIC(3,1) DEFAULT 1.5,
			hourly_rate BIGINT DEFAULT 0,
			amount BIGINT DEFAULT 0,
			reason TEXT,
			status VARCHAR(20) DEFAULT 'pending',
			approved_by VARCHAR(200),
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Accounting
		`CREATE TABLE IF NOT EXISTS chart_of_accounts (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			code VARCHAR(20) NOT NULL,
			name VARCHAR(255) NOT NULL,
			type VARCHAR(50),
			parent_id UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS journal_entries (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id UUID,
			date DATE NOT NULL,
			description TEXT,
			ref_type VARCHAR(50),
			ref_id UUID,
			created_by UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS journal_lines (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			journal_id UUID REFERENCES journal_entries(id),
			account_id UUID REFERENCES chart_of_accounts(id),
			debit BIGINT DEFAULT 0,
			credit BIGINT DEFAULT 0,
			description TEXT
		)`,
		// Phase 34-37: extend existing tables
		`ALTER TABLE vendors         ADD COLUMN IF NOT EXISTS code         VARCHAR(50)`,
		`ALTER TABLE vendors         ADD COLUMN IF NOT EXISTS payment_term VARCHAR(20) DEFAULT 'NET30'`,
		`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS carrier       VARCHAR(100)`,
		`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS tracking      VARCHAR(100)`,
		`ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS received_date DATE`,
		`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS items_summary TEXT`,
		`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS grn_status    VARCHAR(30) DEFAULT 'pending'`,
		`ALTER TABLE inventory       ADD COLUMN IF NOT EXISTS cost_price    BIGINT DEFAULT 0`,
		`ALTER TABLE inventory       ADD COLUMN IF NOT EXISTS sell_price    BIGINT DEFAULT 0`,
		// Phase 35: Marketplace
		`CREATE TABLE IF NOT EXISTS marketplace_channels (
			id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id      UUID REFERENCES companies(id),
			code            VARCHAR(20) UNIQUE NOT NULL,
			name            VARCHAR(100) NOT NULL,
			type            VARCHAR(50) NOT NULL,
			store_name      VARCHAR(150),
			status          VARCHAR(20) DEFAULT 'active',
			products_listed INT DEFAULT 0,
			orders_today    INT DEFAULT 0,
			revenue_month   BIGINT DEFAULT 0,
			sync_status     VARCHAR(30) DEFAULT 'synced',
			last_sync       TIMESTAMPTZ DEFAULT NOW(),
			created_at      TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS marketplace_orders (
			id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id      UUID REFERENCES companies(id),
			code            VARCHAR(30) UNIQUE NOT NULL,
			channel_id      UUID REFERENCES marketplace_channels(id),
			channel_name    VARCHAR(100),
			channel_type    VARCHAR(50),
			external_id     VARCHAR(100),
			order_date      DATE NOT NULL,
			customer_name   VARCHAR(200),
			product_summary TEXT,
			total           BIGINT DEFAULT 0,
			status          VARCHAR(30) DEFAULT 'pending',
			so_ref          VARCHAR(30) DEFAULT '',
			created_at      TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS marketplace_listings (
			id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id      UUID REFERENCES companies(id),
			sku             VARCHAR(50) NOT NULL,
			name            VARCHAR(200) NOT NULL,
			channels        TEXT[],
			price           BIGINT DEFAULT 0,
			stock           INT DEFAULT 0,
			status          VARCHAR(30) DEFAULT 'active',
			last_sync       TIMESTAMPTZ DEFAULT NOW(),
			created_at      TIMESTAMPTZ DEFAULT NOW()
		)`,
		// Phase 35: IoT Hub
		`CREATE TABLE IF NOT EXISTS iot_devices (
			id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id      UUID REFERENCES companies(id),
			code            VARCHAR(20) UNIQUE NOT NULL,
			name            VARCHAR(200) NOT NULL,
			type            VARCHAR(50) NOT NULL,
			location        VARCHAR(200),
			status          VARCHAR(20) DEFAULT 'offline',
			last_seen       TIMESTAMPTZ,
			battery         INT DEFAULT -1,
			firmware        VARCHAR(30),
			ip_address      VARCHAR(45),
			protocol        VARCHAR(30),
			is_active       BOOLEAN DEFAULT TRUE,
			created_at      TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS iot_alert_rules (
			id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id      UUID REFERENCES companies(id),
			device_id       UUID REFERENCES iot_devices(id),
			metric          VARCHAR(50),
			operator        VARCHAR(5),
			threshold       NUMERIC(10,3),
			severity        VARCHAR(20) DEFAULT 'warning',
			action          VARCHAR(50) DEFAULT 'notify',
			enabled         BOOLEAN DEFAULT TRUE,
			trigger_count   INT DEFAULT 0,
			created_at      TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS iot_alert_history (
			id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			company_id      UUID REFERENCES companies(id),
			code            VARCHAR(20) UNIQUE NOT NULL,
			device_id       UUID REFERENCES iot_devices(id),
			device_name     VARCHAR(200),
			metric          VARCHAR(50),
			value           NUMERIC(10,3),
			threshold       NUMERIC(10,3),
			severity        VARCHAR(20),
			occurred_at     TIMESTAMPTZ DEFAULT NOW(),
			resolved        BOOLEAN DEFAULT FALSE,
			duration        VARCHAR(50)
		)`,
	}
	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			log.Printf("Migration warning: %v", err)
		}
	}
	log.Println("Database migrated successfully")
	seedAdmin()
	seedPhase34to37()
}

// WriteAuditLog records an action to audit_logs. Non-blocking: ignores errors.
func WriteAuditLog(userID, action, entity, entityID, description, ip string) {
	if DB == nil {
		return
	}
	DB.Exec(
		`INSERT INTO audit_logs (user_id, action, entity, entity_id, description, ip_address) VALUES ($1,$2,$3,$4,$5,$6)`,
		userID, action, entity, entityID, description, ip,
	)
}

func seedAdmin() {
	var count int
	DB.QueryRow("SELECT COUNT(*) FROM users WHERE email = 'admin@sep.id'").Scan(&count)
	if count > 0 {
		return
	}
	var companyID string
	DB.QueryRow(`INSERT INTO companies (name, email) VALUES ('PT. Smart Enterprise Indonesia', 'info@sep.id') RETURNING id`).Scan(&companyID)
	// Password: admin123 (bcrypt)
	DB.Exec(`INSERT INTO users (company_id, name, email, password, role) VALUES ($1, 'Admin Sistem', 'admin@sep.id', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'superadmin')`, companyID)
	log.Println("Default admin created: admin@sep.id / admin123")
}

func seedPhase34to37() {
	var count int
	DB.QueryRow("SELECT COUNT(*) FROM iot_devices").Scan(&count)
	if count > 0 {
		return
	}
	seeds := []string{
		// Customers
		`INSERT INTO customers (id,company_id,code,name,email,phone,address,credit_limit,payment_term,status) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),s.code,s.name,s.email,s.phone,s.addr,s.cl,s.pt,'active' FROM (VALUES ('CUST-001','PT Maju Bersama','order@majubersama.co.id','021-5551234','Jl. Industri No.12, Bekasi',500000000,30),('CUST-002','CV Teknologi Maju','procurement@tekmaju.com','021-5559876','Jl. Raya Serpong No.45, Tangerang',250000000,30),('CUST-003','PT Nusantara Indah','purchasing@nusantara.id','021-5558765','Jl. Gatot Subroto No.88, Jakarta',350000000,45),('CUST-004','PT Global Solusi','buy@globalsolusi.co.id','021-5557654','Jl. Ahmad Yani No.33, Surabaya',200000000,30)) AS s(code,name,email,phone,addr,cl,pt) WHERE NOT EXISTS (SELECT 1 FROM customers WHERE code=s.code)`,
		// Vendors
		`INSERT INTO vendors (id,company_id,code,name,email,address,payment_term,status) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),s.code,s.name,s.email,s.addr,s.pt,'active' FROM (VALUES ('VND-001','CV Sukses Jaya','sales@suksesjaya.com','Jl. Pabrik No.5, Karawang','NET30'),('VND-002','PT Bahan Prima','order@bahanprima.co.id','Jl. Industri Besar No.10, Cikarang','NET30'),('VND-003','UD Karya Mandiri','info@karyamandiri.id','Jl. Raya Purwakarta No.22','NET45'),('VND-004','PT Logam Berkualitas','sales@logamberk.co.id','Jl. Logam No.7, Bekasi','NET30')) AS s(code,name,email,addr,pt) WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE code=s.code)`,
		// Inventory
		`INSERT INTO inventory (id,company_id,sku,name,category,qty,min_stock,unit,location,cost_price,sell_price) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),s.sku,s.name,s.cat,s.qty,s.ms,s.unit,s.loc,s.cp,s.sp FROM (VALUES ('KOM-A12','Komponen A-12','Komponen',340,50,'unit','RAK-A1',180000,225000),('PRT-D07','Part D-07','Part',220,30,'unit','RAK-B2',190000,240000),('ASM-B05','Assembly B-05','Assembly',85,20,'unit','RAK-C1',1000000,1250000),('FRM-E11','Frame E-11','Frame',112,20,'unit','RAK-D3',300000,380000),('KOM-C33','Komponen C-33','Komponen',430,80,'unit','RAK-A3',120000,155000),('SPR-X01','Spare Part X-01','Spare Part',0,10,'unit','RAK-E1',70000,89000)) AS s(sku,name,cat,qty,ms,unit,loc,cp,sp) WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE sku=s.sku AND company_id=(SELECT id FROM companies LIMIT 1))`,
		// Sales Orders
		`INSERT INTO sales_orders (id,company_id,so_number,customer_id,customer_name,date,delivery_date,subtotal,tax_amount,total,status) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),s.so_num,c.id,c.name,CURRENT_DATE-s.dago,CURRENT_DATE-s.eago,s.sub,s.tax,s.tot,s.status FROM customers c JOIN (VALUES ('SO-1084','CUST-001',9,4,32000000,3520000,35520000,'delivered'),('SO-1075','CUST-001',19,0,24500000,2695000,27195000,'shipped'),('SO-1068','CUST-002',28,-4,18750000,2062500,20812500,'processing'),('SO-1059','CUST-001',37,31,27000000,2970000,29970000,'delivered'),('SO-1047','CUST-002',49,43,12400000,1364000,13764000,'delivered')) AS s(so_num,cust_code,dago,eago,sub,tax,tot,status) ON c.code=s.cust_code WHERE NOT EXISTS (SELECT 1 FROM sales_orders WHERE so_number=s.so_num)`,
		// Customer Invoices
		`INSERT INTO customer_invoices (id,company_id,inv_number,so_id,customer_id,customer_name,date,due_date,subtotal,tax_amount,total,paid_amount,status) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),i.inv_num,so.id,c.id,c.name,CURRENT_DATE-i.iage,CURRENT_DATE+i.dage,i.sub,i.tax,i.tot,i.paid,i.status FROM sales_orders so JOIN customers c ON so.customer_id=c.id JOIN (VALUES ('INV-2847','SO-1084',1,29,32000000,3520000,35520000,0,'unpaid'),('INV-2831','SO-1075',14,16,24500000,2695000,27195000,0,'unpaid'),('INV-2810','SO-1059',28,-2,27000000,2970000,29970000,29970000,'paid'),('INV-2791','SO-1047',43,13,12400000,1364000,13764000,13764000,'paid')) AS i(inv_num,so_num,iage,dage,sub,tax,tot,paid,status) ON so.so_number=i.so_num WHERE NOT EXISTS (SELECT 1 FROM customer_invoices WHERE inv_number=i.inv_num)`,
		// Purchase Orders
		`INSERT INTO purchase_orders (id,company_id,po_number,vendor_id,vendor_name,total_amount,status,order_date,delivery_date,items_summary,grn_status) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),p.po_num,v.id,v.name,p.total,p.status,CURRENT_DATE-p.oage,CURRENT_DATE+p.dage,p.items,p.grn FROM vendors v JOIN (VALUES ('PO-3041','VND-001',2,-14,49950000,'confirmed','Bahan Baku X × 500 kg, Material Y × 200 unit','pending'),('PO-3035','VND-001',9,-10,31635000,'confirmed','Spare Part Z × 100 unit','pending'),('PO-3028','VND-002',19,4,29970000,'received','Bahan Baku X × 300 kg','done'),('PO-3019','VND-002',31,14,42735000,'received','Material W × 400 unit, Komponen V × 150 unit','done'),('PO-3011','VND-001',44,28,34632000,'received','Spare Part Z × 200 unit','done')) AS p(po_num,vend_code,oage,dage,total,status,items,grn) ON v.code=p.vend_code WHERE NOT EXISTS (SELECT 1 FROM purchase_orders WHERE po_number=p.po_num)`,
		// Vendor Invoices
		`INSERT INTO vendor_invoices (id,company_id,vi_number,po_id,vendor_id,vendor_name,inv_date,due_date,subtotal,tax_amount,total,paid_amount,status) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),vi.vi_num,po.id,v.id,v.name,CURRENT_DATE-vi.iage,CURRENT_DATE+vi.dage,vi.sub,vi.tax,vi.tot,vi.paid,vi.status FROM purchase_orders po JOIN vendors v ON po.vendor_id=v.id JOIN (VALUES ('VI-0891','PO-3028',9,-21,27000000,2970000,29970000,0,'pending'),('VI-0885','PO-3019',19,-11,38500000,4235000,42735000,0,'approved'),('VI-0875','PO-3011',39,9,31200000,3432000,34632000,34632000,'paid'),('VI-0861','PO-3011',54,24,22800000,2508000,25308000,25308000,'paid')) AS vi(vi_num,po_num,iage,dage,sub,tax,tot,paid,status) ON po.po_number=vi.po_num WHERE NOT EXISTS (SELECT 1 FROM vendor_invoices WHERE vi_number=vi.vi_num)`,
		// Marketplace Channels
		`INSERT INTO marketplace_channels (id,company_id,code,name,type,store_name,status,products_listed,orders_today,revenue_month,sync_status,last_sync) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),s.code,s.name,s.type,s.store_name,s.status,s.pl,s.ot,s.rev,s.sync_st,NOW()-s.ago::INTERVAL FROM (VALUES ('CH-001','Tokopedia','tokopedia','SEP Official Store','active',48,12,87500000,'synced','30 minutes'),('CH-002','Shopee','shopee','SEP.id','active',52,18,112000000,'synced','25 minutes'),('CH-003','Lazada','lazada','SEP Enterprise','active',31,5,43200000,'synced','2 hours'),('CH-004','Website B2B','woocommerce','b2b.sep.id','active',120,8,235000000,'synced','15 minutes'),('CH-005','Bukalapak','bukalapak','SEP Store BL','inactive',0,0,0,'disconnected','999 hours')) AS s(code,name,type,store_name,status,pl,ot,rev,sync_st,ago) WHERE NOT EXISTS (SELECT 1 FROM marketplace_channels WHERE code=s.code)`,
		// Marketplace Orders
		`INSERT INTO marketplace_orders (id,company_id,code,channel_id,channel_name,channel_type,external_id,order_date,customer_name,product_summary,total,status,so_ref) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),s.code,ch.id,ch.name,ch.type,s.ext_id,CURRENT_DATE-s.dago,s.cust,s.prod,s.total,s.status,COALESCE(s.so_ref,'') FROM marketplace_channels ch JOIN (VALUES ('MO-5501','CH-002','SHP-8821947',0,'Budi Santoso','Komponen A-12 × 2',450000,'pending',NULL),('MO-5502','CH-001','TKP-4417823',0,'Siti Rahayu','Part D-07 × 3',720000,'pending',NULL),('MO-5500','CH-002','SHP-8821901',0,'Ahmad Fauzi','Assembly B-05 × 1',1250000,'fulfilled','SO-1091'),('MO-5499','CH-004','WC-00891',1,'CV Maju Jaya','Frame E-11 × 10, Komponen A-12 × 5',4800000,'fulfilled','SO-1090'),('MO-5498','CH-003','LZD-3302871',1,'Dewi Kusuma','Komponen C-33 × 4',620000,'fulfilled','SO-1089'),('MO-5497','CH-001','TKP-4417800',1,'Rudi Hermawan','Part D-07 × 5',1200000,'pending',NULL),('MO-5496','CH-002','SHP-8821855',1,'Rina Oktavia','Assembly B-05 × 2',2500000,'pending',NULL),('MO-5495','CH-004','WC-00888',2,'PT Kriya Mandiri','Komponen A-12 × 20',4500000,'cancelled',NULL)) AS s(code,ch_code,ext_id,dago,cust,prod,total,status,so_ref) ON ch.code=s.ch_code WHERE NOT EXISTS (SELECT 1 FROM marketplace_orders WHERE code=s.code)`,
		// Marketplace Listings
		`INSERT INTO marketplace_listings (id,company_id,sku,name,channels,price,stock,status,last_sync) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),s.sku,s.name,s.chs,s.price,s.stock,s.status,NOW()-s.ago::INTERVAL FROM (VALUES ('KOM-A12','Komponen A-12',ARRAY['tokopedia','shopee','lazada'],225000,340,'active','30 minutes'),('PRT-D07','Part D-07',ARRAY['tokopedia','shopee'],240000,220,'active','30 minutes'),('ASM-B05','Assembly B-05',ARRAY['shopee','woocommerce'],1250000,85,'active','25 minutes'),('FRM-E11','Frame E-11',ARRAY['woocommerce'],380000,112,'active','15 minutes'),('KOM-C33','Komponen C-33',ARRAY['tokopedia','shopee','lazada','woocommerce'],155000,430,'active','30 minutes'),('SPR-X01','Spare Part X-01',ARRAY['shopee'],89000,0,'out_of_stock','2 hours')) AS s(sku,name,chs,price,stock,status,ago) WHERE NOT EXISTS (SELECT 1 FROM marketplace_listings WHERE sku=s.sku AND company_id=(SELECT id FROM companies LIMIT 1))`,
		// IoT Devices
		`INSERT INTO iot_devices (id,company_id,code,name,type,location,status,last_seen,battery,firmware,ip_address,protocol) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),s.code,s.name,s.type,s.loc,s.status,NOW()-s.ago::INTERVAL,s.bat,s.fw,s.ip,s.proto FROM (VALUES ('DEV-001','Sensor Suhu Mesin A1','temperature','Lantai Produksi 1','online','15 minutes',87,'v2.3.1','192.168.10.11','MQTT'),('DEV-002','Sensor Getaran Mesin A2','vibration','Lantai Produksi 1','online','15 minutes',72,'v2.3.1','192.168.10.12','MQTT'),('DEV-003','Sensor Kelembaban Gudang','humidity','Gudang Bahan Baku','online','16 minutes',91,'v2.1.0','192.168.10.20','MQTT'),('DEV-004','Smart Meter Listrik Panel A','energy','Panel Listrik Utama','online','15 minutes',-1,'v3.0.2','192.168.10.30','Modbus'),('DEV-005','Kamera QC Line 2','camera','Quality Control Line 2','online','15 minutes',-1,'v1.8.4','192.168.10.41','RTSP'),('DEV-006','GPS Forklift FL-01','gps','Area Gudang','online','17 minutes',65,'v1.5.0','192.168.10.51','LTE'),('DEV-007','Sensor Tekanan Kompresor','pressure','Ruang Kompresor','warning','20 minutes',45,'v2.3.1','192.168.10.13','MQTT'),('DEV-008','Sensor CO2 Ruang Server','air_quality','Server Room','offline','3 hours',12,'v2.0.3','192.168.10.61','Zigbee')) AS s(code,name,type,loc,status,ago,bat,fw,ip,proto) WHERE NOT EXISTS (SELECT 1 FROM iot_devices WHERE code=s.code)`,
		// IoT Alert Rules
		`INSERT INTO iot_alert_rules (id,company_id,device_id,metric,operator,threshold,severity,action,enabled,trigger_count) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),d.id,r.metric,r.op,r.thr,r.sev,r.act,TRUE,r.tc FROM iot_devices d JOIN (VALUES ('DEV-001','temperature','>',80.0,'warning','notify',2),('DEV-001','temperature','>',85.0,'critical','notify+shutdown',0),('DEV-002','vibration','>',7.0,'warning','notify',5),('DEV-004','energy','>',250.0,'warning','notify',0),('DEV-007','pressure','>',8.5,'warning','notify',3)) AS r(dev_code,metric,op,thr,sev,act,tc) ON d.code=r.dev_code WHERE NOT EXISTS (SELECT 1 FROM iot_alert_rules ar WHERE ar.device_id=d.id AND ar.metric=r.metric AND ar.threshold=r.thr)`,
		// IoT Alert History
		`INSERT INTO iot_alert_history (id,company_id,code,device_id,device_name,metric,value,threshold,severity,occurred_at,resolved,duration) SELECT gen_random_uuid(),(SELECT id FROM companies LIMIT 1),r.code,d.id,d.name,r.metric,r.val,r.thr,r.sev,NOW()-r.ago::INTERVAL,r.resolved,r.dur FROM iot_devices d JOIN (VALUES ('AH-0091','DEV-007','pressure',9.1,8.5,'warning','20 minutes',FALSE,'5 menit'),('AH-0090','DEV-002','vibration',7.4,7.0,'warning','90 minutes',TRUE,'12 menit'),('AH-0089','DEV-001','temperature',81.2,80.0,'warning','3 hours',TRUE,'8 menit'),('AH-0088','DEV-002','vibration',7.8,7.0,'warning','28 hours',TRUE,'20 menit'),('AH-0087','DEV-007','pressure',8.7,8.5,'warning','31 hours',TRUE,'6 menit')) AS r(code,dev_code,metric,val,thr,sev,ago,resolved,dur) ON d.code=r.dev_code WHERE NOT EXISTS (SELECT 1 FROM iot_alert_history WHERE code=r.code)`,
	}
	for _, q := range seeds {
		if _, err := DB.Exec(q); err != nil {
			log.Printf("Seed warning: %v", err)
		}
	}
	log.Println("Phase 34-37 seed data loaded")
}
