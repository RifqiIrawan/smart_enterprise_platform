-- =============================================================================
-- Smart Enterprise Platform — Full Database Schema
-- Version: 1.0.0  |  Covers Phase 1–22
-- Run: psql -U postgres -d sep_db -f 001_full_schema.sql
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- full-text search

-- =============================================================================
-- CORE: Companies & Users (Phase 1 + Phase 19 RBAC)
-- =============================================================================

CREATE TABLE IF NOT EXISTS companies (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(20) UNIQUE,
    address     TEXT,
    phone       VARCHAR(30),
    email       VARCHAR(150),
    npwp        VARCHAR(30),
    logo_url    TEXT,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id           SERIAL PRIMARY KEY,
    company_id   INT REFERENCES companies(id),
    name         VARCHAR(150) NOT NULL,
    email        VARCHAR(150) UNIQUE NOT NULL,
    password     VARCHAR(255) NOT NULL,
    role         VARCHAR(50) DEFAULT 'viewer',
    department   VARCHAR(100),
    is_active    BOOLEAN DEFAULT TRUE,
    last_login   TIMESTAMP,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    company_id  INT REFERENCES companies(id),
    action      VARCHAR(100),
    module      VARCHAR(50),
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    company_id  INT REFERENCES companies(id),
    type        VARCHAR(50) DEFAULT 'info',
    message     TEXT NOT NULL,
    read        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    company_id  INT REFERENCES companies(id),
    table_name  VARCHAR(100),
    record_id   INT,
    action      VARCHAR(20),   -- INSERT, UPDATE, DELETE
    old_data    JSONB,
    new_data    JSONB,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- INVENTORY & PRODUCTS (Phase 1 + Phase 4 Warehouse)
-- =============================================================================

CREATE TABLE IF NOT EXISTS products (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    code            VARCHAR(50),
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100),
    unit            VARCHAR(20) DEFAULT 'pcs',
    price           NUMERIC(15,2) DEFAULT 0,
    cost            NUMERIC(15,2) DEFAULT 0,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    product_id      INT REFERENCES products(id),
    location        VARCHAR(100),
    warehouse       VARCHAR(100) DEFAULT 'Main Warehouse',
    quantity        NUMERIC(15,3) DEFAULT 0,
    min_quantity    NUMERIC(15,3) DEFAULT 0,
    max_quantity    NUMERIC(15,3),
    unit            VARCHAR(20) DEFAULT 'pcs',
    last_updated    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    product_id      INT REFERENCES products(id),
    type            VARCHAR(20),   -- IN, OUT, TRANSFER, ADJUSTMENT
    quantity        NUMERIC(15,3),
    ref_type        VARCHAR(50),   -- GRN, DO, WO, MANUAL
    ref_id          INT,
    warehouse_from  VARCHAR(100),
    warehouse_to    VARCHAR(100),
    notes           TEXT,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- FACTORY / MES (Phase 1 + Phase 5 + Phase 13 MRP)
-- =============================================================================

CREATE TABLE IF NOT EXISTS machines (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    code            VARCHAR(50),
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(100),
    location        VARCHAR(100),
    status          VARCHAR(30) DEFAULT 'active',
    capacity        NUMERIC(10,2),
    oee             NUMERIC(5,2) DEFAULT 0,
    installed_at    DATE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bom (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    product_id      INT REFERENCES products(id),
    version         VARCHAR(20) DEFAULT '1.0',
    is_active       BOOLEAN DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bom_items (
    id              SERIAL PRIMARY KEY,
    bom_id          INT REFERENCES bom(id) ON DELETE CASCADE,
    material_id     INT REFERENCES products(id),
    quantity        NUMERIC(15,4) NOT NULL,
    unit            VARCHAR(20),
    notes           TEXT
);

CREATE TABLE IF NOT EXISTS work_orders (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    wo_number       VARCHAR(50) UNIQUE,
    product_id      INT REFERENCES products(id),
    machine_id      INT REFERENCES machines(id),
    planned_qty     NUMERIC(15,3),
    actual_qty      NUMERIC(15,3) DEFAULT 0,
    start_date      DATE,
    end_date        DATE,
    status          VARCHAR(30) DEFAULT 'pending',
    priority        VARCHAR(20) DEFAULT 'normal',
    notes           TEXT,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_order_items (
    id              SERIAL PRIMARY KEY,
    wo_id           INT REFERENCES work_orders(id) ON DELETE CASCADE,
    material_id     INT REFERENCES products(id),
    required_qty    NUMERIC(15,4),
    issued_qty      NUMERIC(15,4) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS downtime_logs (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    machine_id      INT REFERENCES machines(id),
    start_time      TIMESTAMP NOT NULL,
    end_time        TIMESTAMP,
    duration_min    INT,
    category        VARCHAR(50),
    reason          TEXT,
    reported_by     INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_schedules (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    wo_id           INT REFERENCES work_orders(id),
    machine_id      INT REFERENCES machines(id),
    shift           VARCHAR(20),
    planned_start   TIMESTAMP,
    planned_end     TIMESTAMP,
    actual_start    TIMESTAMP,
    actual_end      TIMESTAMP,
    status          VARCHAR(30) DEFAULT 'scheduled',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routings (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    product_id      INT REFERENCES products(id),
    sequence        INT NOT NULL,
    process_name    VARCHAR(100),
    machine_id      INT REFERENCES machines(id),
    std_time_minutes NUMERIC(10,2),
    description     TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lot_numbers (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    item_id         INT REFERENCES products(id),
    lot_number      VARCHAR(50) UNIQUE,
    qty             NUMERIC(15,3),
    manufactured_date DATE,
    expiry_date     DATE,
    wo_id           INT REFERENCES work_orders(id),
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mrp_runs (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    run_date        TIMESTAMP DEFAULT NOW(),
    period_start    DATE,
    period_end      DATE,
    status          VARCHAR(30) DEFAULT 'completed',
    auto_pr         BOOLEAN DEFAULT FALSE,
    created_by      INT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS mrp_results (
    id              SERIAL PRIMARY KEY,
    mrp_run_id      INT REFERENCES mrp_runs(id) ON DELETE CASCADE,
    item_id         INT REFERENCES products(id),
    item_name       VARCHAR(200),
    gross_req       NUMERIC(15,3),
    stock_on_hand   NUMERIC(15,3),
    net_req         NUMERIC(15,3),
    order_qty       NUMERIC(15,3),
    order_date      DATE,
    lead_time_days  INT DEFAULT 7
);

-- =============================================================================
-- HR / HRIS (Phase 2 + Phase 16 HR Advanced)
-- =============================================================================

CREATE TABLE IF NOT EXISTS employees (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    employee_id     VARCHAR(30) UNIQUE,
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(150),
    phone           VARCHAR(30),
    department      VARCHAR(100),
    position        VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'active',
    join_date       DATE,
    birth_date      DATE,
    gender          VARCHAR(10),
    address         TEXT,
    salary          NUMERIC(15,2) DEFAULT 0,
    bank_account    VARCHAR(50),
    bank_name       VARCHAR(50),
    npwp            VARCHAR(30),
    bpjs_kesehatan  VARCHAR(30),
    bpjs_tk         VARCHAR(30),
    ptkp_status     VARCHAR(20) DEFAULT 'TK/0',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    employee_id     INT REFERENCES employees(id),
    date            DATE NOT NULL,
    check_in        TIMESTAMP,
    check_out       TIMESTAMP,
    status          VARCHAR(20) DEFAULT 'present',
    notes           TEXT
);

CREATE TABLE IF NOT EXISTS leaves (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    employee_id     INT REFERENCES employees(id),
    type            VARCHAR(50),
    start_date      DATE,
    end_date        DATE,
    days            INT,
    reason          TEXT,
    status          VARCHAR(20) DEFAULT 'pending',
    approved_by     INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    employee_id     INT REFERENCES employees(id),
    period          VARCHAR(20),
    basic_salary    NUMERIC(15,2),
    allowances      NUMERIC(15,2) DEFAULT 0,
    deductions      NUMERIC(15,2) DEFAULT 0,
    pph21           NUMERIC(15,2) DEFAULT 0,
    bpjs_employee   NUMERIC(15,2) DEFAULT 0,
    bpjs_company    NUMERIC(15,2) DEFAULT 0,
    net_salary      NUMERIC(15,2),
    status          VARCHAR(20) DEFAULT 'draft',
    paid_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_postings (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    title           VARCHAR(150),
    department      VARCHAR(100),
    location        VARCHAR(100),
    type            VARCHAR(50) DEFAULT 'full_time',
    description     TEXT,
    requirements    TEXT,
    salary_min      NUMERIC(15,2),
    salary_max      NUMERIC(15,2),
    status          VARCHAR(20) DEFAULT 'open',
    deadline        DATE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    job_posting_id  INT REFERENCES job_postings(id),
    name            VARCHAR(150),
    email           VARCHAR(150),
    phone           VARCHAR(30),
    stage           VARCHAR(50) DEFAULT 'applied',
    cv_url          TEXT,
    notes           TEXT,
    applied_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_programs (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    name            VARCHAR(200),
    category        VARCHAR(100),
    duration_hours  INT,
    description     TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_schedules (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    program_id      INT REFERENCES training_programs(id),
    employee_id     INT REFERENCES employees(id),
    trainer         VARCHAR(150),
    start_date      DATE,
    end_date        DATE,
    location        VARCHAR(200),
    status          VARCHAR(30) DEFAULT 'scheduled',
    score           NUMERIC(5,2),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kpi_templates (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    name            VARCHAR(200),
    department      VARCHAR(100),
    metrics         JSONB,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kpi_reviews (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    employee_id     INT REFERENCES employees(id),
    template_id     INT REFERENCES kpi_templates(id),
    period          VARCHAR(20),
    self_score      NUMERIC(5,2),
    manager_score   NUMERIC(5,2),
    final_score     NUMERIC(5,2),
    notes           TEXT,
    status          VARCHAR(20) DEFAULT 'draft',
    reviewed_by     INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    name            VARCHAR(100),
    start_time      TIME,
    end_time        TIME,
    type            VARCHAR(30) DEFAULT 'morning',
    is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS overtime_records (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    employee_id     INT REFERENCES employees(id),
    date            DATE,
    hours           NUMERIC(5,2),
    reason          TEXT,
    rate_multiplier NUMERIC(3,1) DEFAULT 1.5,
    amount          NUMERIC(15,2),
    status          VARCHAR(20) DEFAULT 'pending',
    approved_by     INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- PURCHASING (Phase 3)
-- =============================================================================

CREATE TABLE IF NOT EXISTS vendors (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    code            VARCHAR(50),
    name            VARCHAR(200) NOT NULL,
    contact_person  VARCHAR(150),
    phone           VARCHAR(30),
    email           VARCHAR(150),
    address         TEXT,
    npwp            VARCHAR(30),
    bank_name       VARCHAR(100),
    bank_account    VARCHAR(50),
    payment_term    INT DEFAULT 30,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_requests (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    pr_number       VARCHAR(50) UNIQUE,
    requested_by    INT REFERENCES users(id),
    department      VARCHAR(100),
    needed_by       DATE,
    status          VARCHAR(30) DEFAULT 'pending',
    notes           TEXT,
    approved_by     INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pr_items (
    id              SERIAL PRIMARY KEY,
    pr_id           INT REFERENCES purchase_requests(id) ON DELETE CASCADE,
    product_id      INT REFERENCES products(id),
    product_name    VARCHAR(200),
    qty             NUMERIC(15,3),
    unit            VARCHAR(20),
    estimated_price NUMERIC(15,2),
    notes           TEXT
);

CREATE TABLE IF NOT EXISTS purchase_orders (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    po_number       VARCHAR(50) UNIQUE,
    pr_id           INT REFERENCES purchase_requests(id),
    vendor_id       INT REFERENCES vendors(id),
    order_date      DATE,
    delivery_date   DATE,
    subtotal        NUMERIC(15,2),
    tax_amount      NUMERIC(15,2) DEFAULT 0,
    total           NUMERIC(15,2),
    status          VARCHAR(30) DEFAULT 'pending',
    notes           TEXT,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_items (
    id              SERIAL PRIMARY KEY,
    po_id           INT REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id      INT REFERENCES products(id),
    product_name    VARCHAR(200),
    qty             NUMERIC(15,3),
    unit            VARCHAR(20),
    unit_price      NUMERIC(15,2),
    amount          NUMERIC(15,2)
);

CREATE TABLE IF NOT EXISTS grn (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    grn_number      VARCHAR(50) UNIQUE,
    po_id           INT REFERENCES purchase_orders(id),
    vendor_id       INT REFERENCES vendors(id),
    received_date   DATE,
    warehouse       VARCHAR(100) DEFAULT 'Main Warehouse',
    status          VARCHAR(30) DEFAULT 'pending',
    notes           TEXT,
    received_by     INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grn_items (
    id              SERIAL PRIMARY KEY,
    grn_id          INT REFERENCES grn(id) ON DELETE CASCADE,
    product_id      INT REFERENCES products(id),
    product_name    VARCHAR(200),
    ordered_qty     NUMERIC(15,3),
    received_qty    NUMERIC(15,3),
    unit            VARCHAR(20),
    unit_price      NUMERIC(15,2)
);

-- =============================================================================
-- SALES & CRM (Phase 10)
-- =============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    code            VARCHAR(50),
    name            VARCHAR(200) NOT NULL,
    npwp            VARCHAR(30),
    address         TEXT,
    city            VARCHAR(100),
    province        VARCHAR(100),
    phone           VARCHAR(30),
    email           VARCHAR(150),
    credit_limit    NUMERIC(15,2) DEFAULT 0,
    payment_term    INT DEFAULT 30,
    category        VARCHAR(50) DEFAULT 'regular',
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_orders (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    so_number       VARCHAR(50) UNIQUE,
    customer_id     INT REFERENCES customers(id),
    date            DATE,
    delivery_date   DATE,
    subtotal        NUMERIC(15,2),
    discount        NUMERIC(15,2) DEFAULT 0,
    tax_amount      NUMERIC(15,2) DEFAULT 0,
    total           NUMERIC(15,2),
    status          VARCHAR(30) DEFAULT 'draft',
    approved_by     INT REFERENCES users(id),
    notes           TEXT,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id              SERIAL PRIMARY KEY,
    so_id           INT REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id      INT REFERENCES products(id),
    product_name    VARCHAR(200),
    qty             NUMERIC(15,3),
    unit            VARCHAR(20),
    unit_price      NUMERIC(15,2),
    discount        NUMERIC(15,2) DEFAULT 0,
    amount          NUMERIC(15,2)
);

CREATE TABLE IF NOT EXISTS delivery_orders (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    do_number       VARCHAR(50) UNIQUE,
    so_id           INT REFERENCES sales_orders(id),
    customer_id     INT REFERENCES customers(id),
    date            DATE,
    warehouse       VARCHAR(100) DEFAULT 'Main Warehouse',
    status          VARCHAR(30) DEFAULT 'pending',
    driver          VARCHAR(150),
    vehicle_no      VARCHAR(30),
    notes           TEXT,
    confirmed_by    INT REFERENCES users(id),
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_order_items (
    id              SERIAL PRIMARY KEY,
    do_id           INT REFERENCES delivery_orders(id) ON DELETE CASCADE,
    product_id      INT REFERENCES products(id),
    product_name    VARCHAR(200),
    ordered_qty     NUMERIC(15,3),
    delivered_qty   NUMERIC(15,3),
    unit            VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS customer_invoices (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    inv_number      VARCHAR(50) UNIQUE,
    do_id           INT REFERENCES delivery_orders(id),
    customer_id     INT REFERENCES customers(id),
    date            DATE,
    due_date        DATE,
    subtotal        NUMERIC(15,2),
    tax_amount      NUMERIC(15,2) DEFAULT 0,
    total           NUMERIC(15,2),
    paid_amount     NUMERIC(15,2) DEFAULT 0,
    status          VARCHAR(30) DEFAULT 'draft',
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- FINANCE — AP / AR / CASH (Phase 11)
-- =============================================================================

CREATE TABLE IF NOT EXISTS bank_accounts (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    name            VARCHAR(150),
    bank_name       VARCHAR(100),
    account_number  VARCHAR(50),
    currency        VARCHAR(10) DEFAULT 'IDR',
    balance         NUMERIC(15,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_invoices (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    grn_id          INT REFERENCES grn(id),
    po_id           INT REFERENCES purchase_orders(id),
    vendor_id       INT REFERENCES vendors(id),
    inv_number      VARCHAR(100),
    inv_date        DATE,
    due_date        DATE,
    amount          NUMERIC(15,2),
    tax_amount      NUMERIC(15,2) DEFAULT 0,
    total           NUMERIC(15,2),
    paid_amount     NUMERIC(15,2) DEFAULT 0,
    status          VARCHAR(30) DEFAULT 'unpaid',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments_out (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    vendor_invoice_id INT REFERENCES vendor_invoices(id),
    bank_account_id INT REFERENCES bank_accounts(id),
    payment_date    DATE,
    amount          NUMERIC(15,2),
    reference       VARCHAR(100),
    notes           TEXT,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments_in (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    customer_invoice_id INT REFERENCES customer_invoices(id),
    bank_account_id INT REFERENCES bank_accounts(id),
    payment_date    DATE,
    amount          NUMERIC(15,2),
    reference       VARCHAR(100),
    notes           TEXT,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- ACCOUNTING (Phase 6)
-- =============================================================================

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    code            VARCHAR(20) UNIQUE,
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(50),   -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    parent_id       INT REFERENCES chart_of_accounts(id),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    journal_number  VARCHAR(50),
    date            DATE,
    description     TEXT,
    ref_type        VARCHAR(50),
    ref_id          INT,
    total_debit     NUMERIC(15,2),
    total_credit    NUMERIC(15,2),
    status          VARCHAR(20) DEFAULT 'posted',
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_items (
    id              SERIAL PRIMARY KEY,
    journal_id      INT REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id      INT REFERENCES chart_of_accounts(id),
    description     TEXT,
    debit           NUMERIC(15,2) DEFAULT 0,
    credit          NUMERIC(15,2) DEFAULT 0
);

-- =============================================================================
-- TAX & COMPLIANCE (Phase 12)
-- =============================================================================

CREATE TABLE IF NOT EXISTS tax_configs (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    tax_type        VARCHAR(50),   -- PPN, PPh21, PPh23, BPJS
    rate            NUMERIC(8,4),
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (company_id, tax_type)
);

CREATE TABLE IF NOT EXISTS pph21_calculations (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    employee_id     INT REFERENCES employees(id),
    period          VARCHAR(20),
    gross_income    NUMERIC(15,2),
    ptkp            NUMERIC(15,2),
    pkp             NUMERIC(15,2),
    pph21_amount    NUMERIC(15,2),
    method          VARCHAR(20) DEFAULT 'gross',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bpjs_calculations (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    employee_id     INT REFERENCES employees(id),
    period          VARCHAR(20),
    salary_base     NUMERIC(15,2),
    jht_employee    NUMERIC(15,2),
    jht_company     NUMERIC(15,2),
    jp_employee     NUMERIC(15,2),
    jp_company      NUMERIC(15,2),
    jkk             NUMERIC(15,2),
    jkm             NUMERIC(15,2),
    health_employee NUMERIC(15,2),
    health_company  NUMERIC(15,2),
    total_employee  NUMERIC(15,2),
    total_company   NUMERIC(15,2),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pph23_records (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    vendor_id       INT REFERENCES vendors(id),
    invoice_id      INT REFERENCES vendor_invoices(id),
    period          VARCHAR(20),
    gross_amount    NUMERIC(15,2),
    rate            NUMERIC(5,2),
    pph23_amount    NUMERIC(15,2),
    service_type    VARCHAR(100),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- QUALITY MANAGEMENT (Phase 14)
-- =============================================================================

CREATE TABLE IF NOT EXISTS quality_inspections (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    type            VARCHAR(20),   -- IQC, IPQC, FQC
    ref_id          INT,
    ref_type        VARCHAR(50),
    inspector       VARCHAR(150),
    date            DATE,
    result          VARCHAR(20) DEFAULT 'pending',
    sample_size     INT,
    defect_qty      INT DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspection_items (
    id              SERIAL PRIMARY KEY,
    inspection_id   INT REFERENCES quality_inspections(id) ON DELETE CASCADE,
    parameter       VARCHAR(100),
    spec_min        NUMERIC(15,4),
    spec_max        NUMERIC(15,4),
    actual_value    NUMERIC(15,4),
    result          VARCHAR(20),
    notes           TEXT
);

CREATE TABLE IF NOT EXISTS ncr (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    ncr_number      VARCHAR(50),
    ref_id          INT,
    ref_type        VARCHAR(50),
    description     TEXT,
    severity        VARCHAR(20) DEFAULT 'MEDIUM',
    root_cause      TEXT,
    status          VARCHAR(30) DEFAULT 'open',
    reported_by     INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capa (
    id              SERIAL PRIMARY KEY,
    ncr_id          INT REFERENCES ncr(id) ON DELETE CASCADE,
    action          TEXT,
    pic             VARCHAR(150),
    due_date        DATE,
    actual_date     DATE,
    verification    TEXT,
    status          VARCHAR(20) DEFAULT 'open',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS measuring_tools (
    id                          SERIAL PRIMARY KEY,
    company_id                  INT REFERENCES companies(id),
    tool_code                   VARCHAR(50),
    name                        VARCHAR(200),
    type                        VARCHAR(100),
    location                    VARCHAR(100),
    last_calibration            DATE,
    next_calibration            DATE,
    calibration_interval_days   INT DEFAULT 365,
    status                      VARCHAR(20) DEFAULT 'active',
    created_at                  TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- COST ACCOUNTING (Phase 15)
-- =============================================================================

CREATE TABLE IF NOT EXISTS cost_centers (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    code            VARCHAR(30),
    name            VARCHAR(150),
    department      VARCHAR(100),
    manager         VARCHAR(150),
    budget_monthly  NUMERIC(15,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wo_costs (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    wo_id           INT REFERENCES work_orders(id),
    cost_center_id  INT REFERENCES cost_centers(id),
    material_cost   NUMERIC(15,2) DEFAULT 0,
    labor_cost      NUMERIC(15,2) DEFAULT 0,
    overhead_rate   NUMERIC(5,2) DEFAULT 15,
    overhead_cost   NUMERIC(15,2) DEFAULT 0,
    total_cost      NUMERIC(15,2) DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS standard_costs (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    product_id      INT REFERENCES products(id),
    period          VARCHAR(20),
    material_cost   NUMERIC(15,2),
    labor_cost      NUMERIC(15,2),
    overhead_cost   NUMERIC(15,2),
    total_cost      NUMERIC(15,2),
    updated_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (company_id, product_id, period)
);

-- =============================================================================
-- ASSETS & CMMS (Phase 1 + Phase 17)
-- =============================================================================

CREATE TABLE IF NOT EXISTS assets (
    id                  SERIAL PRIMARY KEY,
    company_id          INT REFERENCES companies(id),
    asset_code          VARCHAR(50),
    name                VARCHAR(200) NOT NULL,
    category            VARCHAR(100),
    location            VARCHAR(150),
    vendor_id           INT REFERENCES vendors(id),
    purchase_date       DATE,
    purchase_price      NUMERIC(15,2),
    useful_life_years   INT DEFAULT 5,
    residual_value      NUMERIC(15,2) DEFAULT 0,
    book_value          NUMERIC(15,2),
    depreciation_method VARCHAR(30) DEFAULT 'straight_line',
    status              VARCHAR(30) DEFAULT 'active',
    last_maintenance    DATE,
    next_maintenance    DATE,
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    asset_id        INT REFERENCES assets(id),
    name            VARCHAR(200),
    frequency       VARCHAR(30),
    last_done       DATE,
    next_due        DATE,
    assigned_to     VARCHAR(150),
    status          VARCHAR(20) DEFAULT 'scheduled',
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_history (
    id              SERIAL PRIMARY KEY,
    schedule_id     INT REFERENCES maintenance_schedules(id),
    asset_id        INT REFERENCES assets(id),
    done_date       DATE,
    technician      VARCHAR(150),
    cost            NUMERIC(15,2),
    findings        TEXT,
    action_taken    TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pm_schedules (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    asset_id        INT REFERENCES assets(id),
    machine_id      INT REFERENCES machines(id),
    name            VARCHAR(200),
    trigger_type    VARCHAR(30) DEFAULT 'calendar',
    interval_days   INT DEFAULT 30,
    interval_hours  NUMERIC(10,2),
    last_done       DATE,
    next_due        DATE,
    assigned_to     VARCHAR(150),
    checklist       JSONB,
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spare_parts (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    asset_id        INT REFERENCES assets(id),
    machine_id      INT REFERENCES machines(id),
    part_number     VARCHAR(100),
    name            VARCHAR(200),
    vendor          VARCHAR(150),
    unit            VARCHAR(20) DEFAULT 'pcs',
    quantity        INT DEFAULT 0,
    min_quantity    INT DEFAULT 1,
    unit_price      NUMERIC(15,2),
    location        VARCHAR(150),
    lead_time_days  INT DEFAULT 7,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_disposals (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    asset_id        INT REFERENCES assets(id),
    disposal_date   DATE,
    method          VARCHAR(50),
    sale_price      NUMERIC(15,2) DEFAULT 0,
    book_value      NUMERIC(15,2),
    gain_loss       NUMERIC(15,2),
    reason          TEXT,
    approved_by     INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- BUDGET & PLANNING (Phase 18)
-- =============================================================================

CREATE TABLE IF NOT EXISTS budgets (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    name            VARCHAR(200),
    year            INT,
    department      VARCHAR(100),
    account_id      INT REFERENCES chart_of_accounts(id),
    jan NUMERIC(15,2) DEFAULT 0, feb NUMERIC(15,2) DEFAULT 0,
    mar NUMERIC(15,2) DEFAULT 0, apr NUMERIC(15,2) DEFAULT 0,
    may NUMERIC(15,2) DEFAULT 0, jun NUMERIC(15,2) DEFAULT 0,
    jul NUMERIC(15,2) DEFAULT 0, aug NUMERIC(15,2) DEFAULT 0,
    sep NUMERIC(15,2) DEFAULT 0, oct NUMERIC(15,2) DEFAULT 0,
    nov NUMERIC(15,2) DEFAULT 0, dec NUMERIC(15,2) DEFAULT 0,
    total           NUMERIC(15,2) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'draft',
    submitted_by    INT REFERENCES users(id),
    approved_by     INT REFERENCES users(id),
    rejection_reason TEXT,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_scenarios (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    name            VARCHAR(150),
    type            VARCHAR(20) DEFAULT 'base',
    year            INT,
    revenue         NUMERIC(15,2),
    expenses        NUMERIC(15,2),
    net_income      NUMERIC(15,2),
    assumptions     TEXT,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- SECURITY & FACILITY (Phase 1)
-- =============================================================================

CREATE TABLE IF NOT EXISTS visitors (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    name            VARCHAR(150),
    id_number       VARCHAR(50),
    purpose         VARCHAR(200),
    host_name       VARCHAR(150),
    check_in        TIMESTAMP DEFAULT NOW(),
    check_out       TIMESTAMP,
    status          VARCHAR(20) DEFAULT 'in',
    notes           TEXT
);

CREATE TABLE IF NOT EXISTS incidents (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    type            VARCHAR(50),
    location        VARCHAR(150),
    description     TEXT,
    severity        VARCHAR(20) DEFAULT 'low',
    status          VARCHAR(20) DEFAULT 'open',
    reported_by     INT REFERENCES users(id),
    resolved_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fleet (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    vehicle_no      VARCHAR(30),
    type            VARCHAR(50),
    brand           VARCHAR(100),
    model           VARCHAR(100),
    year            INT,
    status          VARCHAR(20) DEFAULT 'available',
    driver          VARCHAR(150),
    lat             NUMERIC(11,7),
    lng             NUMERIC(11,7),
    last_service    DATE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fuel_logs (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    fleet_id        INT REFERENCES fleet(id),
    date            DATE,
    liters          NUMERIC(10,2),
    cost            NUMERIC(15,2),
    odometer        INT,
    station         VARCHAR(150),
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- DOCUMENT MANAGEMENT (Phase 20)
-- =============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    ref_type        VARCHAR(50),
    ref_id          VARCHAR(100),
    file_name       VARCHAR(300),
    original_name   VARCHAR(300),
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    storage_path    TEXT,
    uploaded_by     INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS currencies (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    code            VARCHAR(10) UNIQUE NOT NULL,
    name            VARCHAR(100),
    symbol          VARCHAR(10),
    is_base         BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id),
    from_currency   VARCHAR(10),
    to_currency     VARCHAR(10) DEFAULT 'IDR',
    rate            NUMERIC(18,6),
    date            DATE NOT NULL,
    source          VARCHAR(50) DEFAULT 'manual',
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (company_id, from_currency, to_currency, date)
);

CREATE TABLE IF NOT EXISTS notif_configs (
    id              SERIAL PRIMARY KEY,
    company_id      INT REFERENCES companies(id) UNIQUE,
    smtp_host       VARCHAR(150),
    smtp_port       INT DEFAULT 587,
    smtp_user       VARCHAR(150),
    smtp_pass       VARCHAR(255),
    smtp_from       VARCHAR(150),
    smtp_ssl        BOOLEAN DEFAULT TRUE,
    wa_provider     VARCHAR(50),
    wa_token        TEXT,
    wa_number       VARCHAR(30),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- INDEXES — performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email             ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company           ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_company       ON inventory_items(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product       ON inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product    ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date       ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wo_company              ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_wo_status               ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_employees_company       ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee     ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_so_company              ON sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_so_customer             ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_so_status               ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_invoice_status          ON customer_invoices(status);
CREATE INDEX IF NOT EXISTS idx_vi_vendor               ON vendor_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_journal_date            ON journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_audit_table             ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_documents_ref           ON documents(ref_type, ref_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user        ON access_logs(user_id);

-- Full text search indexes
CREATE INDEX IF NOT EXISTS idx_products_name_fts       ON products USING gin(to_tsvector('indonesian', name));
CREATE INDEX IF NOT EXISTS idx_customers_name_fts      ON customers USING gin(to_tsvector('indonesian', name));
CREATE INDEX IF NOT EXISTS idx_vendors_name_fts        ON vendors USING gin(to_tsvector('indonesian', name));
CREATE INDEX IF NOT EXISTS idx_employees_name_fts      ON employees USING gin(to_tsvector('indonesian', name));

-- =============================================================================
-- SEED DATA — default company + admin user
-- =============================================================================

INSERT INTO companies (id, name, code, address, phone, email)
VALUES (1, 'PT Smart Enterprise Indonesia', 'SEP001', 'Jl. Sudirman No.1, Jakarta Selatan', '+62-21-12345678', 'info@sep.id')
ON CONFLICT DO NOTHING;

-- Default admin: password = admin123 (bcrypt)
INSERT INTO users (id, company_id, name, email, password, role)
VALUES (1, 1, 'Administrator', 'admin@sep.id',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'superadmin')
ON CONFLICT DO NOTHING;

INSERT INTO currencies (company_id, code, name, symbol, is_base)
VALUES (1, 'IDR', 'Indonesian Rupiah', 'Rp', TRUE)
ON CONFLICT DO NOTHING;

-- Default COA (minimal)
INSERT INTO chart_of_accounts (company_id, code, name, type) VALUES
    (1, '1100', 'Kas & Bank', 'ASSET'),
    (1, '1200', 'Piutang Usaha', 'ASSET'),
    (1, '1300', 'Persediaan', 'ASSET'),
    (1, '1500', 'Aset Tetap', 'ASSET'),
    (1, '2100', 'Hutang Usaha', 'LIABILITY'),
    (1, '2200', 'Hutang Pajak', 'LIABILITY'),
    (1, '3100', 'Modal Disetor', 'EQUITY'),
    (1, '3200', 'Laba Ditahan', 'EQUITY'),
    (1, '4100', 'Pendapatan Penjualan', 'REVENUE'),
    (1, '5100', 'Harga Pokok Penjualan', 'EXPENSE'),
    (1, '6100', 'Beban Gaji', 'EXPENSE'),
    (1, '6200', 'Beban Operasional', 'EXPENSE'),
    (1, '6300', 'Beban Depresiasi', 'EXPENSE'),
    (1, '6400', 'Beban Pajak', 'EXPENSE')
ON CONFLICT DO NOTHING;
