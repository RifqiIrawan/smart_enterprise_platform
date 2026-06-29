-- =============================================================================
-- Smart Enterprise Platform — Phase 34-37 Tables & Sample Data
-- Run: psql -U postgres -d sep_db -f 002_phase34_37.sql
-- =============================================================================

-- ─── Extend existing tables ───────────────────────────────────────────────────

ALTER TABLE vendors         ADD COLUMN IF NOT EXISTS code         VARCHAR(50);
ALTER TABLE vendors         ADD COLUMN IF NOT EXISTS payment_term VARCHAR(20) DEFAULT 'NET30';
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS carrier       VARCHAR(100);
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS tracking      VARCHAR(100);
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS received_date DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS items_summary TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS grn_status    VARCHAR(30) DEFAULT 'pending';
ALTER TABLE inventory       ADD COLUMN IF NOT EXISTS cost_price    BIGINT DEFAULT 0;
ALTER TABLE inventory       ADD COLUMN IF NOT EXISTS sell_price    BIGINT DEFAULT 0;

-- ─── New Tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketplace_channels (
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
);

CREATE TABLE IF NOT EXISTS marketplace_orders (
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
);

CREATE TABLE IF NOT EXISTS marketplace_listings (
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
);

CREATE TABLE IF NOT EXISTS iot_devices (
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
);

CREATE TABLE IF NOT EXISTS iot_alert_rules (
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
);

CREATE TABLE IF NOT EXISTS iot_alert_history (
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
);

-- ─── Seed: Customers ─────────────────────────────────────────────────────────

INSERT INTO customers (id, company_id, code, name, email, phone, address, credit_limit, payment_term, status)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1), s.code, s.name, s.email, s.phone, s.addr, s.cl, s.pt, 'active'
FROM (VALUES
  ('CUST-001','PT Maju Bersama',    'order@majubersama.co.id', '021-5551234','Jl. Industri No.12, Bekasi',        500000000,30),
  ('CUST-002','CV Teknologi Maju',  'procurement@tekmaju.com', '021-5559876','Jl. Raya Serpong No.45, Tangerang', 250000000,30),
  ('CUST-003','PT Nusantara Indah', 'purchasing@nusantara.id', '021-5558765','Jl. Gatot Subroto No.88, Jakarta',  350000000,45),
  ('CUST-004','PT Global Solusi',   'buy@globalsolusi.co.id',  '021-5557654','Jl. Ahmad Yani No.33, Surabaya',    200000000,30)
) AS s(code,name,email,phone,addr,cl,pt)
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE code = s.code);

-- ─── Seed: Vendors ────────────────────────────────────────────────────────────

INSERT INTO vendors (id, company_id, code, name, email, address, payment_term, status)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1), s.code, s.name, s.email, s.addr, s.pt, 'active'
FROM (VALUES
  ('VND-001','CV Sukses Jaya',       'sales@suksesjaya.com',   'Jl. Pabrik No.5, Karawang',          'NET30'),
  ('VND-002','PT Bahan Prima',       'order@bahanprima.co.id', 'Jl. Industri Besar No.10, Cikarang', 'NET30'),
  ('VND-003','UD Karya Mandiri',     'info@karyamandiri.id',   'Jl. Raya Purwakarta No.22',          'NET45'),
  ('VND-004','PT Logam Berkualitas', 'sales@logamberk.co.id',  'Jl. Logam No.7, Bekasi',             'NET30')
) AS s(code,name,email,addr,pt)
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE code = s.code);

-- ─── Seed: Inventory ─────────────────────────────────────────────────────────

INSERT INTO inventory (id, company_id, sku, name, category, qty, min_stock, unit, location, cost_price, sell_price)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1), s.sku, s.name, s.cat, s.qty, s.ms, s.unit, s.loc, s.cp, s.sp
FROM (VALUES
  ('KOM-A12','Komponen A-12',   'Komponen',   340,50,'unit','RAK-A1', 180000, 225000),
  ('PRT-D07','Part D-07',       'Part',       220,30,'unit','RAK-B2', 190000, 240000),
  ('ASM-B05','Assembly B-05',   'Assembly',    85,20,'unit','RAK-C1',1000000,1250000),
  ('FRM-E11','Frame E-11',      'Frame',      112,20,'unit','RAK-D3', 300000, 380000),
  ('KOM-C33','Komponen C-33',   'Komponen',   430,80,'unit','RAK-A3', 120000, 155000),
  ('SPR-X01','Spare Part X-01', 'Spare Part',   0,10,'unit','RAK-E1',  70000,  89000)
) AS s(sku,name,cat,qty,ms,unit,loc,cp,sp)
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE sku=s.sku AND company_id=(SELECT id FROM companies LIMIT 1));

-- ─── Seed: Sales Orders ───────────────────────────────────────────────────────

INSERT INTO sales_orders (id, company_id, so_number, customer_id, customer_name, date, delivery_date, subtotal, tax_amount, total, status, notes)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1),
       s.so_num, c.id, c.name, s.odate, s.ddate, s.sub, s.tax, s.tot, s.status, s.notes
FROM customers c
JOIN (VALUES
  ('SO-1091','CUST-003',CURRENT_DATE,    CURRENT_DATE+7,   1250000,  137500,  1387500,'confirmed','From Shopee'),
  ('SO-1090','CUST-004',CURRENT_DATE-1,  CURRENT_DATE+6,   4800000,  528000,  5328000,'confirmed','From B2B'),
  ('SO-1084','CUST-001',CURRENT_DATE-9,  CURRENT_DATE-4,  32000000, 3520000, 35520000,'delivered','Urgent delivery'),
  ('SO-1075','CUST-001',CURRENT_DATE-19, CURRENT_DATE,    24500000, 2695000, 27195000,'shipped',  NULL),
  ('SO-1068','CUST-002',CURRENT_DATE-28, CURRENT_DATE+4,  18750000, 2062500, 20812500,'processing',NULL),
  ('SO-1059','CUST-001',CURRENT_DATE-37, CURRENT_DATE-31, 27000000, 2970000, 29970000,'delivered',NULL),
  ('SO-1047','CUST-002',CURRENT_DATE-49, CURRENT_DATE-43, 12400000, 1364000, 13764000,'delivered',NULL)
) AS s(so_num,cust_code,odate,ddate,sub,tax,tot,status,notes) ON c.code=s.cust_code
WHERE NOT EXISTS (SELECT 1 FROM sales_orders WHERE so_number=s.so_num);

-- ─── Seed: Customer Invoices ──────────────────────────────────────────────────

INSERT INTO customer_invoices (id, company_id, inv_number, so_id, customer_id, customer_name, date, due_date, subtotal, tax_amount, total, paid_amount, status)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1),
       i.inv_num, so.id, c.id, c.name, i.idate, i.ddate, i.sub, i.tax, i.tot, i.paid, i.status
FROM sales_orders so
JOIN customers c ON so.customer_id=c.id
JOIN (VALUES
  ('INV-2847','SO-1084',CURRENT_DATE-1,  CURRENT_DATE+29,32000000,3520000,35520000,       0,'unpaid'),
  ('INV-2831','SO-1075',CURRENT_DATE-14, CURRENT_DATE+16,24500000,2695000,27195000,       0,'unpaid'),
  ('INV-2810','SO-1059',CURRENT_DATE-28, CURRENT_DATE+2, 27000000,2970000,29970000,29970000,'paid'),
  ('INV-2791','SO-1047',CURRENT_DATE-43, CURRENT_DATE-13,12400000,1364000,13764000,13764000,'paid')
) AS i(inv_num,so_num,idate,ddate,sub,tax,tot,paid,status) ON so.so_number=i.so_num
WHERE NOT EXISTS (SELECT 1 FROM customer_invoices WHERE inv_number=i.inv_num);

-- ─── Seed: Delivery Orders ────────────────────────────────────────────────────

INSERT INTO delivery_orders (id, company_id, do_number, so_id, customer_id, customer_name, date, status, carrier, tracking, received_date)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1),
       d.do_num, so.id, so.customer_id, so.customer_name, d.ddate, d.status, d.carrier, d.tracking, d.recv_date
FROM sales_orders so
JOIN (VALUES
  ('DO-2201','SO-1084',CURRENT_DATE-4,  'delivered','JNE Express','JNE1234567890', CURRENT_DATE-3),
  ('DO-2198','SO-1075',CURRENT_DATE-1,  'shipped',  'SiCepat',    'SCP9876543210', NULL),
  ('DO-2185','SO-1059',CURRENT_DATE-32, 'delivered','Anteraja',   'ANT5432167890', CURRENT_DATE-31)
) AS d(do_num,so_num,ddate,status,carrier,tracking,recv_date) ON so.so_number=d.so_num
WHERE NOT EXISTS (SELECT 1 FROM delivery_orders WHERE do_number=d.do_num);

-- ─── Seed: Purchase Orders ────────────────────────────────────────────────────

INSERT INTO purchase_orders (id, company_id, po_number, vendor_id, vendor_name, total_amount, status, order_date, delivery_date, items_summary, grn_status)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1),
       p.po_num, v.id, v.name, p.total, p.status, p.odate, p.ddate, p.items, p.grn
FROM vendors v
JOIN (VALUES
  ('PO-3041','VND-001',CURRENT_DATE-2,  CURRENT_DATE+14,49950000,'confirmed','Bahan Baku X × 500 kg, Material Y × 200 unit','pending'),
  ('PO-3035','VND-001',CURRENT_DATE-9,  CURRENT_DATE+10,31635000,'confirmed','Spare Part Z × 100 unit',                      'pending'),
  ('PO-3028','VND-002',CURRENT_DATE-19, CURRENT_DATE-4, 29970000,'received', 'Bahan Baku X × 300 kg',                        'done'),
  ('PO-3019','VND-002',CURRENT_DATE-31, CURRENT_DATE-14,42735000,'received', 'Material W × 400 unit, Komponen V × 150 unit', 'done'),
  ('PO-3011','VND-001',CURRENT_DATE-44, CURRENT_DATE-28,34632000,'received', 'Spare Part Z × 200 unit',                      'done')
) AS p(po_num,vend_code,odate,ddate,total,status,items,grn) ON v.code=p.vend_code
WHERE NOT EXISTS (SELECT 1 FROM purchase_orders WHERE po_number=p.po_num);

-- ─── Seed: Vendor Invoices ────────────────────────────────────────────────────

INSERT INTO vendor_invoices (id, company_id, vi_number, po_id, vendor_id, vendor_name, inv_date, due_date, subtotal, tax_amount, total, paid_amount, status)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1),
       vi.vi_num, po.id, v.id, v.name, vi.idate, vi.ddate, vi.sub, vi.tax, vi.tot, vi.paid, vi.status
FROM purchase_orders po
JOIN vendors v ON po.vendor_id=v.id
JOIN (VALUES
  ('VI-0891','PO-3028',CURRENT_DATE-9,  CURRENT_DATE+21,27000000,2970000,29970000,       0,'pending'),
  ('VI-0885','PO-3019',CURRENT_DATE-19, CURRENT_DATE+11,38500000,4235000,42735000,       0,'approved'),
  ('VI-0875','PO-3011',CURRENT_DATE-39, CURRENT_DATE-9, 31200000,3432000,34632000,34632000,'paid'),
  ('VI-0861','PO-3011',CURRENT_DATE-54, CURRENT_DATE-24,22800000,2508000,25308000,25308000,'paid')
) AS vi(vi_num,po_num,idate,ddate,sub,tax,tot,paid,status) ON po.po_number=vi.po_num
WHERE NOT EXISTS (SELECT 1 FROM vendor_invoices WHERE vi_number=vi.vi_num);

-- ─── Seed: Marketplace Channels ───────────────────────────────────────────────

INSERT INTO marketplace_channels (id, company_id, code, name, type, store_name, status, products_listed, orders_today, revenue_month, sync_status, last_sync)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1),
       s.code, s.name, s.type, s.store_name, s.status, s.pl, s.ot, s.rev, s.sync_st, NOW()-s.ago::INTERVAL
FROM (VALUES
  ('CH-001','Tokopedia',   'tokopedia',   'SEP Official Store', 'active',    48,12, 87500000, 'synced',        '30 minutes'),
  ('CH-002','Shopee',      'shopee',      'SEP.id',             'active',    52,18,112000000, 'synced',        '25 minutes'),
  ('CH-003','Lazada',      'lazada',      'SEP Enterprise',     'active',    31, 5, 43200000, 'synced',        '2 hours'),
  ('CH-004','Website B2B', 'woocommerce', 'b2b.sep.id',         'active',   120, 8,235000000, 'synced',        '15 minutes'),
  ('CH-005','Bukalapak',   'bukalapak',   'SEP Store BL',       'inactive',   0, 0,        0, 'disconnected',  '999 hours')
) AS s(code,name,type,store_name,status,pl,ot,rev,sync_st,ago)
WHERE NOT EXISTS (SELECT 1 FROM marketplace_channels WHERE code=s.code);

-- ─── Seed: Marketplace Orders ─────────────────────────────────────────────────

INSERT INTO marketplace_orders (id, company_id, code, channel_id, channel_name, channel_type, external_id, order_date, customer_name, product_summary, total, status, so_ref)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1),
       s.code, ch.id, ch.name, ch.type, s.ext_id, s.odate, s.cust, s.prod, s.total, s.status, COALESCE(s.so_ref,'')
FROM marketplace_channels ch
JOIN (VALUES
  ('MO-5501','CH-002','SHP-8821947',CURRENT_DATE,   'Budi Santoso',    'Komponen A-12 × 2',                     450000,'pending',  NULL),
  ('MO-5502','CH-001','TKP-4417823',CURRENT_DATE,   'Siti Rahayu',     'Part D-07 × 3',                         720000,'pending',  NULL),
  ('MO-5500','CH-002','SHP-8821901',CURRENT_DATE,   'Ahmad Fauzi',     'Assembly B-05 × 1',                    1250000,'fulfilled','SO-1091'),
  ('MO-5499','CH-004','WC-00891',   CURRENT_DATE-1, 'CV Maju Jaya',    'Frame E-11 × 10, Komponen A-12 × 5',  4800000,'fulfilled','SO-1090'),
  ('MO-5498','CH-003','LZD-3302871',CURRENT_DATE-1, 'Dewi Kusuma',     'Komponen C-33 × 4',                     620000,'fulfilled','SO-1089'),
  ('MO-5497','CH-001','TKP-4417800',CURRENT_DATE-1, 'Rudi Hermawan',   'Part D-07 × 5',                        1200000,'pending',  NULL),
  ('MO-5496','CH-002','SHP-8821855',CURRENT_DATE-1, 'Rina Oktavia',    'Assembly B-05 × 2',                    2500000,'pending',  NULL),
  ('MO-5495','CH-004','WC-00888',   CURRENT_DATE-2, 'PT Kriya Mandiri','Komponen A-12 × 20',                   4500000,'cancelled',NULL)
) AS s(code,ch_code,ext_id,odate,cust,prod,total,status,so_ref) ON ch.code=s.ch_code
WHERE NOT EXISTS (SELECT 1 FROM marketplace_orders WHERE code=s.code);

-- ─── Seed: Marketplace Listings ───────────────────────────────────────────────

INSERT INTO marketplace_listings (id, company_id, sku, name, channels, price, stock, status, last_sync)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1),
       s.sku, s.name, s.chs, s.price, s.stock, s.status, NOW()-s.ago::INTERVAL
FROM (VALUES
  ('KOM-A12','Komponen A-12',   ARRAY['tokopedia','shopee','lazada'],               225000, 340,'active',       '30 minutes'),
  ('PRT-D07','Part D-07',       ARRAY['tokopedia','shopee'],                        240000, 220,'active',       '30 minutes'),
  ('ASM-B05','Assembly B-05',   ARRAY['shopee','woocommerce'],                     1250000,  85,'active',       '25 minutes'),
  ('FRM-E11','Frame E-11',      ARRAY['woocommerce'],                               380000, 112,'active',       '15 minutes'),
  ('KOM-C33','Komponen C-33',   ARRAY['tokopedia','shopee','lazada','woocommerce'], 155000, 430,'active',       '30 minutes'),
  ('SPR-X01','Spare Part X-01', ARRAY['shopee'],                                    89000,   0,'out_of_stock', '2 hours')
) AS s(sku,name,chs,price,stock,status,ago)
WHERE NOT EXISTS (SELECT 1 FROM marketplace_listings WHERE sku=s.sku AND company_id=(SELECT id FROM companies LIMIT 1));

-- ─── Seed: IoT Devices ────────────────────────────────────────────────────────

INSERT INTO iot_devices (id, company_id, code, name, type, location, status, last_seen, battery, firmware, ip_address, protocol)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1),
       s.code, s.name, s.type, s.loc, s.status, NOW()-s.ago::INTERVAL, s.bat, s.fw, s.ip, s.proto
FROM (VALUES
  ('DEV-001','Sensor Suhu Mesin A1',       'temperature','Lantai Produksi 1',     'online',  '15 minutes', 87,'v2.3.1','192.168.10.11','MQTT'),
  ('DEV-002','Sensor Getaran Mesin A2',    'vibration',  'Lantai Produksi 1',     'online',  '15 minutes', 72,'v2.3.1','192.168.10.12','MQTT'),
  ('DEV-003','Sensor Kelembaban Gudang',   'humidity',   'Gudang Bahan Baku',     'online',  '16 minutes', 91,'v2.1.0','192.168.10.20','MQTT'),
  ('DEV-004','Smart Meter Listrik Panel A','energy',     'Panel Listrik Utama',   'online',  '15 minutes',-1, 'v3.0.2','192.168.10.30','Modbus'),
  ('DEV-005','Kamera QC Line 2',           'camera',     'Quality Control Line 2','online',  '15 minutes',-1, 'v1.8.4','192.168.10.41','RTSP'),
  ('DEV-006','GPS Forklift FL-01',         'gps',        'Area Gudang',           'online',  '17 minutes', 65,'v1.5.0','192.168.10.51','LTE'),
  ('DEV-007','Sensor Tekanan Kompresor',   'pressure',   'Ruang Kompresor',       'warning', '20 minutes', 45,'v2.3.1','192.168.10.13','MQTT'),
  ('DEV-008','Sensor CO2 Ruang Server',    'air_quality','Server Room',           'offline', '3 hours',    12,'v2.0.3','192.168.10.61','Zigbee')
) AS s(code,name,type,loc,status,ago,bat,fw,ip,proto)
WHERE NOT EXISTS (SELECT 1 FROM iot_devices WHERE code=s.code);

-- ─── Seed: IoT Alert Rules ────────────────────────────────────────────────────

INSERT INTO iot_alert_rules (id, company_id, device_id, metric, operator, threshold, severity, action, enabled, trigger_count)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1),
       d.id, r.metric, r.op, r.thr, r.sev, r.act, TRUE, r.tc
FROM iot_devices d
JOIN (VALUES
  ('DEV-001','temperature','>',  80.0,'warning', 'notify',          2),
  ('DEV-001','temperature','>',  85.0,'critical','notify+shutdown',  0),
  ('DEV-002','vibration',  '>',   7.0,'warning', 'notify',          5),
  ('DEV-004','energy',     '>',250.0, 'warning', 'notify',          0),
  ('DEV-007','pressure',   '>',   8.5,'warning', 'notify',          3)
) AS r(dev_code,metric,op,thr,sev,act,tc) ON d.code=r.dev_code
WHERE NOT EXISTS (SELECT 1 FROM iot_alert_rules ar WHERE ar.device_id=d.id AND ar.metric=r.metric AND ar.threshold=r.thr);

-- ─── Seed: IoT Alert History ─────────────────────────────────────────────────

INSERT INTO iot_alert_history (id, company_id, code, device_id, device_name, metric, value, threshold, severity, occurred_at, resolved, duration)
SELECT gen_random_uuid(), (SELECT id FROM companies LIMIT 1),
       r.code, d.id, d.name, r.metric, r.val, r.thr, r.sev, NOW()-r.ago::INTERVAL, r.resolved, r.dur
FROM iot_devices d
JOIN (VALUES
  ('AH-0091','DEV-007','pressure',    9.1,8.5,'warning', '20 minutes',FALSE,'5 menit'),
  ('AH-0090','DEV-002','vibration',   7.4,7.0,'warning', '90 minutes',TRUE, '12 menit'),
  ('AH-0089','DEV-001','temperature',81.2,80.0,'warning','3 hours',   TRUE, '8 menit'),
  ('AH-0088','DEV-002','vibration',   7.8,7.0,'warning', '28 hours',  TRUE, '20 menit'),
  ('AH-0087','DEV-007','pressure',    8.7,8.5,'warning', '31 hours',  TRUE, '6 menit')
) AS r(code,dev_code,metric,val,thr,sev,ago,resolved,dur) ON d.code=r.dev_code
WHERE NOT EXISTS (SELECT 1 FROM iot_alert_history WHERE code=r.code);

SELECT 'Phase 34-37 migration complete' AS status;
