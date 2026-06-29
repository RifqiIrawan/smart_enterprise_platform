# ERP Roadmap — Smart Enterprise Platform

> Dokumen ini mendefinisikan roadmap lengkap pengembangan SEP menjadi sistem ERP manufaktur kelas enterprise.
> Versi: 2.0 | Terakhir diperbarui: 2026-06-27

---

## Daftar Isi

1. [Status Saat Ini](#1-status-saat-ini)
2. [Visi ERP](#2-visi-erp)
3. [Phase 10 — Sales & CRM](#3-phase-10--sales--crm)
4. [Phase 11 — AP / AR & Cash Management](#4-phase-11--ap--ar--cash-management)
5. [Phase 12 — Tax & Compliance Indonesia](#5-phase-12--tax--compliance-indonesia)
6. [Phase 13 — MRP & Production Planning](#6-phase-13--mrp--production-planning)
7. [Phase 14 — Quality Management (QMS)](#7-phase-14--quality-management-qms)
8. [Phase 15 — Cost Accounting](#8-phase-15--cost-accounting)
9. [Phase 16 — HR & Payroll Lanjutan](#9-phase-16--hr--payroll-lanjutan)
10. [Phase 17 — Asset & CMMS Lanjutan](#10-phase-17--asset--cmms-lanjutan)
11. [Phase 18 — Budget & Financial Planning](#11-phase-18--budget--financial-planning)
12. [Phase 19 — RBAC & Multi-tenant](#12-phase-19--rbac--multi-tenant)
13. [Phase 20 — Integrasi & Ekosistem](#13-phase-20--integrasi--ekosistem)
14. [Phase 21 — BI & AI Lanjutan](#14-phase-21--bi--ai-lanjutan)
15. [Phase 22 — Mobile & PWA](#15-phase-22--mobile--pwa)
16. [Phase 23 — Production Ready & Go-Live](#16-phase-23--production-ready--go-live)
17. [Phase 24 — Sales Completion & CRM Pipeline](#17-phase-24--sales-completion--crm-pipeline)
18. [Phase 25 — Finance Lanjutan (GL, Closing, Cash Flow)](#18-phase-25--finance-lanjutan-gl-closing-cash-flow)
19. [Phase 26 — PDF & Print Center](#19-phase-26--pdf--print-center)
20. [Phase 27 — Bank Rekonsiliasi & Cash Management](#20-phase-27--bank-rekonsiliasi--cash-management)
21. [Phase 28 — Coretax DJP & E-Invoice](#21-phase-28--coretax-djp--e-invoice)
22. [Phase 29 — Import / Export & API Publik](#22-phase-29--import--export--api-publik)
23. [Phase 30 — Security Lanjutan (2FA, Session, Audit Trail)](#23-phase-30--security-lanjutan-2fa-session-audit-trail)
24. [Phase 31 — Manufacturing Excellence](#24-phase-31--manufacturing-excellence)
25. [Phase 32 — HR Completion (Slip Gaji, Organigram)](#25-phase-32--hr-completion-slip-gaji-organigram)
26. [Phase 33 — UX & Platform (Dark Mode, Multi-language)](#26-phase-33--ux--platform-dark-mode-multi-language)
27. [Phase 34 — Customer & Vendor Portal](#27-phase-34--customer--vendor-portal)
28. [Phase 35 — Marketplace & IoT Real Integration](#28-phase-35--marketplace--iot-real-integration)
29. [Ringkasan Timeline](#29-ringkasan-timeline)
30. [Arsitektur Target](#30-arsitektur-target)

---

## 1. Status Saat Ini

### Modul yang Sudah Ada (Phase 1–9)

| Modul | Status | Kelengkapan |
|-------|--------|-------------|
| Auth + JWT | ✅ Selesai | Login, logout, token |
| Dashboard | 🟡 Partial | KPI dari DB, chart partial |
| Smart Factory | 🟡 Partial | WO, mesin, BOM, downtime |
| Warehouse | 🟡 Partial | Inventory, mutasi, opname, transfer |
| HRIS | 🟡 Partial | Karyawan, absensi, cuti, payroll dasar |
| Purchasing | 🟡 Partial | PR→PO→GRN, approval, vendor |
| Asset | 🟡 Partial | CRUD aset, jadwal maintenance |
| Accounting | 🟡 Partial | COA, jurnal, Laba Rugi, Neraca |
| Security | 🟡 Partial | Visitor, insiden |
| Vehicle | 🟡 Partial | Fleet, BBM, GPS |
| Network NOC | 🟡 Partial | Device, traffic, live poll |
| Smart Building | 🟡 Partial | Sensor IoT, energy |
| Analytics | 🟡 Partial | Summary, role dashboard, export |
| AI Assistant | ✅ Selesai | Gemini API terintegrasi |
| WebSocket / IoT | ✅ Selesai | Real-time push OEE, sensor |

### Gap Utama vs ERP Standar

| Komponen ERP | Status |
|---|---|
| **Sales / CRM** | ❌ Belum ada |
| **Accounts Payable (AP)** | ❌ Belum ada |
| **Accounts Receivable (AR)** | ❌ Belum ada |
| **Cash & Bank Management** | ❌ Belum ada |
| **Tax (PPN / PPh)** | ❌ Belum ada |
| **MRP** | ❌ Belum ada |
| **Quality Control (QMS)** | ❌ Belum ada |
| **Cost Accounting** | ❌ Belum ada |
| **Budget Management** | ❌ Belum ada |
| **Multi-role RBAC** | ❌ Belum ada |
| **Document Management** | ❌ Belum ada |
| **E-Invoice / Coretax** | ❌ Belum ada |

---

## 2. Visi ERP

```
SEP akan menjadi ERP manufaktur Indonesia yang mencakup:

┌─────────────────────────────────────────────────────────────┐
│                    SMART ENTERPRISE PLATFORM                │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   FINANSIAL  │  OPERASIONAL │    PEOPLE    │  INTELLIGENCE │
│              │              │              │               │
│ • Accounting │ • Sales      │ • HRIS       │ • Analytics   │
│ • AP / AR    │ • Purchasing │ • Payroll    │ • AI/ML       │
│ • Cash/Bank  │ • Warehouse  │ • Recruitment│ • IoT/OEE     │
│ • Tax/PPN    │ • MRP        │ • Training   │ • BI Reports  │
│ • Budget     │ • Factory    │ • PPh21      │ • Prediction  │
│ • Fixed Asset│ • QC         │ • BPJS       │               │
└──────────────┴──────────────┴──────────────┴───────────────┘
```

**Target go-live minimal:** Phase 10 + 11 + 12 + 19 (Sales, AP/AR, Tax, RBAC)

---

## 3. Phase 10 — Sales & CRM

> **Prioritas: KRITIS** | Estimasi: 3–4 minggu

Siklus penjualan end-to-end: dari customer masuk sampai pembayaran diterima.

### Alur Proses

```
Customer → Quotation → Sales Order → Delivery Order → Invoice → Pembayaran
                                          │
                                    Warehouse (kurangi stok)
                                          │
                                    Accounting (posting AR)
```

### Fitur yang Dibangun

#### CRM Dasar
- [ ] **SLS-01** Master Customer: CRUD customer (nama, NPWP, alamat, kontak, credit limit)
- [ ] **SLS-02** Kategori customer: distributor, retailer, end-user, export
- [ ] **SLS-03** Riwayat transaksi per customer

#### Sales Quotation
- [ ] **SLS-04** Buat penawaran harga (nomor otomatis: QUO/2026/001)
- [ ] **SLS-05** Line item: produk, qty, harga, diskon, PPN
- [ ] **SLS-06** Status: Draft → Sent → Accepted / Rejected
- [ ] **SLS-07** Convert Quotation → Sales Order (1 klik)
- [ ] **SLS-08** Print / export PDF penawaran

#### Sales Order
- [ ] **SLS-09** Buat SO (nomor: SO/2026/001)
- [ ] **SLS-10** Approval workflow SO berdasarkan nilai nominal
- [ ] **SLS-11** Cek ketersediaan stok saat SO dibuat
- [ ] **SLS-12** Convert SO → Delivery Order
- [ ] **SLS-13** Partial delivery: 1 SO → beberapa DO

#### Delivery Order
- [ ] **SLS-14** Buat DO dari SO
- [ ] **SLS-15** Picking list: daftar item yang perlu diambil dari gudang
- [ ] **SLS-16** Konfirmasi pengiriman → stok berkurang otomatis
- [ ] **SLS-17** Surat Jalan (print PDF)
- [ ] **SLS-18** Sales Return (retur barang dari customer)

#### Customer Invoice
- [ ] **SLS-19** Generate invoice dari DO (nomor: INV/2026/001)
- [ ] **SLS-20** Faktur pajak PPN otomatis
- [ ] **SLS-21** Status invoice: Draft → Sent → Partial Paid → Paid → Overdue
- [ ] **SLS-22** Cetak invoice PDF (format standar)
- [ ] **SLS-23** Kirim invoice via email

#### Pipeline & Aktivitas CRM
- [ ] **SLS-24** Pipeline penjualan: Lead → Prospect → Proposal → Negosiasi → Won/Lost
- [ ] **SLS-25** Log aktivitas: call, meeting, email per customer
- [ ] **SLS-26** Target vs realisasi penjualan per salesperson

### Database Baru

```sql
customers (id, company_id, code, name, npwp, address, city, province,
           phone, email, credit_limit, payment_term, category, status, created_at)

sales_quotations (id, company_id, quo_number, customer_id, date, valid_until,
                  subtotal, discount, tax_amount, total, status, notes, created_by, created_at)

sales_orders (id, company_id, so_number, quo_id, customer_id, date, delivery_date,
              subtotal, discount, tax_amount, total, status, approved_by, notes, created_at)

so_items (id, so_id, product_id, product_name, qty, unit, unit_price, discount, amount)

delivery_orders (id, company_id, do_number, so_id, customer_id, date, warehouse,
                 status, driver, notes, created_by, created_at)

do_items (id, do_id, so_item_id, product_name, ordered_qty, delivered_qty, unit)

customer_invoices (id, company_id, inv_number, do_id, customer_id, date, due_date,
                   subtotal, tax_amount, total, paid_amount, status, created_at)

sales_returns (id, company_id, return_number, inv_id, reason, total, status, created_at)

crm_activities (id, company_id, customer_id, type, date, notes, user_id, created_at)
```

### API Endpoint Baru

```
GET/POST   /sales/customers
PUT/DELETE /sales/customers/:id
GET/POST   /sales/quotations
PATCH      /sales/quotations/:id/status
POST       /sales/quotations/:id/convert-to-so
GET/POST   /sales/orders
PATCH      /sales/orders/:id/approve
POST       /sales/orders/:id/create-do
GET/POST   /sales/delivery-orders
PATCH      /sales/delivery-orders/:id/confirm
GET/POST   /sales/invoices
PATCH      /sales/invoices/:id/status
GET/POST   /sales/returns
GET        /sales/pipeline
GET        /sales/analytics
```

---

## 4. Phase 11 — AP / AR & Cash Management

> **Prioritas: KRITIS** | Estimasi: 2–3 minggu

### Accounts Payable (Hutang Usaha)

- [ ] **AP-01** Vendor Invoice: catat invoice dari vendor (dari GRN atau manual)
- [ ] **AP-02** Matching: GRN ↔ Vendor Invoice ↔ PO (3-way matching)
- [ ] **AP-03** Jadwal pembayaran (payment schedule) per invoice
- [ ] **AP-04** Bukti pembayaran: catat pembayaran ke vendor
- [ ] **AP-05** Aging AP: laporan hutang berdasarkan umur (0–30, 31–60, 61–90, >90 hari)
- [ ] **AP-06** Auto-posting: vendor invoice → debit Persediaan, kredit Hutang Usaha

### Accounts Receivable (Piutang Usaha)

- [ ] **AR-01** Customer Invoice linked ke modul Sales
- [ ] **AR-02** Penerimaan pembayaran: catat pelunasan dari customer
- [ ] **AR-03** Aging AR: laporan piutang berdasarkan umur
- [ ] **AR-04** Reminder otomatis: invoice jatuh tempo H-3, H-0, H+7
- [ ] **AR-05** Write-off piutang macet dengan approval
- [ ] **AR-06** Auto-posting: customer payment → debit Kas, kredit Piutang

### Cash & Bank Management

- [ ] **CASH-01** Master rekening bank (BCA, Mandiri, BNI, dll)
- [ ] **CASH-02** Buku kas kecil (petty cash) per departemen
- [ ] **CASH-03** Transaksi kas masuk / keluar
- [ ] **CASH-04** Transfer antar rekening (kas ↔ bank)
- [ ] **CASH-05** Rekonsiliasi bank: upload statement bank, matching otomatis
- [ ] **CASH-06** Laporan posisi kas harian

### Laporan Keuangan Lanjutan

- [ ] **FIN-01** Laporan Arus Kas (Cash Flow Statement — metode langsung & tidak langsung)
- [ ] **FIN-02** Buku Besar per akun (General Ledger)
- [ ] **FIN-03** Trial Balance
- [ ] **FIN-04** Closing periode bulanan (lock jurnal bulan lalu)
- [ ] **FIN-05** Perbandingan laporan: bulan ini vs bulan lalu vs tahun lalu

### Database Baru

```sql
vendor_invoices (id, company_id, grn_id, po_id, vendor_id, inv_number,
                 inv_date, due_date, amount, tax_amount, total, status, created_at)

payments_out (id, company_id, vendor_invoice_id, bank_account_id,
              payment_date, amount, reference, notes, created_by, created_at)

payments_in (id, company_id, customer_invoice_id, bank_account_id,
             payment_date, amount, reference, notes, created_by, created_at)

bank_accounts (id, company_id, name, bank_name, account_number,
               currency, balance, is_active, created_at)

cash_transactions (id, company_id, bank_account_id, type, amount,
                   description, ref_type, ref_id, date, created_by, created_at)

bank_reconciliations (id, company_id, bank_account_id, period, statement_balance,
                      book_balance, difference, status, reconciled_by, created_at)
```

---

## 5. Phase 12 — Tax & Compliance Indonesia

> **Prioritas: TINGGI** | Estimasi: 2 minggu

### PPN (Pajak Pertambahan Nilai)

- [ ] **TAX-01** Konfigurasi tarif PPN (saat ini 12%, configurable)
- [ ] **TAX-02** Auto-hitung PPN di setiap SO dan vendor invoice
- [ ] **TAX-03** Nomor Seri Faktur Pajak (NSFP) — generate urutan per bulan
- [ ] **TAX-04** Faktur Pajak Masukan (dari vendor) dan Keluaran (ke customer)
- [ ] **TAX-05** Rekap PPN bulan per bulan (kurang/lebih bayar)
- [ ] **TAX-06** Export CSV format e-Faktur DJP / Coretax

### PPh 21 (Pajak Penghasilan Karyawan)

- [ ] **TAX-07** Perhitungan PPh 21 bulanan per karyawan (PTKP 2024)
- [ ] **TAX-08** Metode gross, gross-up, net
- [ ] **TAX-09** Tunjangan pajak (bila metode gross-up)
- [ ] **TAX-10** Bukti Potong PPh 21 per karyawan (PDF)
- [ ] **TAX-11** SPT Masa PPh 21 bulanan (format CSV e-SPT)

### PPh 23 (Jasa & Dividen)

- [ ] **TAX-12** Pemotongan PPh 23 untuk vendor jasa (2% / 15%)
- [ ] **TAX-13** Bukti Potong PPh 23 (print PDF)
- [ ] **TAX-14** Rekap PPh 23 per bulan

### BPJS

- [ ] **TAX-15** Perhitungan BPJS Ketenagakerjaan (JHT, JP, JKK, JKM)
- [ ] **TAX-16** BPJS Kesehatan (4% perusahaan, 1% karyawan)
- [ ] **TAX-17** File iuran bulanan format BPJS
- [ ] **TAX-18** Auto-integrasi ke payroll

---

## 6. Phase 13 — MRP & Production Planning

> **Prioritas: TINGGI** | Estimasi: 3 minggu

MRP adalah fitur **pembeda utama** untuk ERP manufaktur.

### Material Requirements Planning

```
Sales Orders
     │
     ▼
MRP Engine ← BOM (Bill of Materials)
     │      ← Stok Saat Ini
     │      ← Work Orders Aktif
     │      ← Lead Time Vendor
     ▼
Kebutuhan Material → Auto Purchase Request
                   → Production Schedule
```

- [ ] **MRP-01** Engine MRP: hitung kebutuhan bahan dari SO aktif + BOM
- [ ] **MRP-02** Netting: kebutuhan bruto – stok tersedia = kebutuhan bersih
- [ ] **MRP-03** Lot sizing: perhitungan batch optimal per item
- [ ] **MRP-04** Lead time: kalkulasi tanggal order berdasarkan lead time vendor
- [ ] **MRP-05** Auto-generate Purchase Request dari MRP
- [ ] **MRP-06** MRP exception report: item kritis, kekurangan, kelebihan stok

### Production Planning & Scheduling

- [ ] **PROD-01** Perencanaan kapasitas produksi per mesin per shift
- [ ] **PROD-02** Production schedule mingguan / bulanan
- [ ] **PROD-03** Work Order auto-create dari SO yang disetujui
- [ ] **PROD-04** Routing: urutan proses (cutting → forming → welding → painting → QC)
- [ ] **PROD-05** Finite capacity scheduling: cegah overload mesin
- [ ] **PROD-06** Gantt chart jadwal produksi (interaktif)
- [ ] **PROD-07** Rencana vs realisasi produksi harian

### Manajemen Batch & Lot

- [ ] **BATCH-01** Nomor batch / lot per produksi
- [ ] **BATCH-02** Trace material: dari vendor → gudang → produksi → produk jadi
- [ ] **BATCH-03** Expiry date management untuk material dengan masa simpan
- [ ] **BATCH-04** FIFO / FEFO picking otomatis di warehouse

### Database Baru

```sql
mrp_runs (id, company_id, run_date, period_start, period_end, status, created_by)

mrp_results (id, mrp_run_id, item_id, item_name, gross_req, stock_on_hand,
             net_req, order_qty, order_date, lead_time_days)

production_schedules (id, company_id, wo_id, machine_id, shift,
                      planned_start, planned_end, status, created_at)

routings (id, company_id, product_id, sequence, process_name,
          machine_id, std_time_minutes, description)

lot_numbers (id, company_id, item_id, lot_number, qty, manufactured_date,
             expiry_date, wo_id, status)
```

---

## 7. Phase 14 — Quality Management (QMS)

> **Prioritas: TINGGI** | Estimasi: 2–3 minggu

### Incoming Quality Control

- [ ] **QC-01** Inspection request otomatis saat GRN dibuat
- [ ] **QC-02** Form inspeksi: sampling plan (AQL), parameter, hasil ukur
- [ ] **QC-03** Status: Accept / Conditional Accept / Reject
- [ ] **QC-04** Reject → auto RTV (Return to Vendor) ke modul Purchasing
- [ ] **QC-05** CoA (Certificate of Analysis) upload & simpan per lot

### In-Process Quality Control

- [ ] **QC-06** Checkpoint QC per routing / proses produksi
- [ ] **QC-07** Input hasil QC: pass qty, fail qty, rework qty
- [ ] **QC-08** Real-time update OEE: quality rate = pass / total produksi
- [ ] **QC-09** SPC (Statistical Process Control) chart: X-bar, R chart

### Final Quality Control

- [ ] **QC-10** Inspeksi barang jadi sebelum DO dibuat
- [ ] **QC-11** Release untuk pengiriman: QC Pass → DO bisa dibuat
- [ ] **QC-12** Certificate of Conformance (CoC) per SO

### Non-Conformance & CAPA

- [ ] **QC-13** NCR (Non-Conformance Report): laporan ketidaksesuaian
- [ ] **QC-14** Root cause analysis (5 Why, Fishbone — template)
- [ ] **QC-15** CAPA (Corrective and Preventive Action): action plan, PIC, deadline
- [ ] **QC-16** Verifikasi CAPA: close NCR setelah tindakan terbukti efektif
- [ ] **QC-17** Rekap NCR per vendor, per mesin, per produk

### Kalibrasi Alat Ukur

- [ ] **QC-18** Master alat ukur (micrometer, jangka sorong, timbangan)
- [ ] **QC-19** Jadwal kalibrasi dan reminder
- [ ] **QC-20** Sertifikat kalibrasi: upload dan tracking expired

### Database Baru

```sql
quality_inspections (id, company_id, type, ref_id, ref_type, inspector,
                     date, result, sample_size, defect_qty, notes, created_at)

inspection_items (id, inspection_id, parameter, spec_min, spec_max,
                  actual_value, result, notes)

ncr (id, company_id, ncr_number, ref_id, ref_type, description, severity,
     root_cause, status, reported_by, created_at)

capa (id, ncr_id, action, pic, due_date, actual_date, verification, status)

measuring_tools (id, company_id, tool_code, name, type, location,
                 last_calibration, next_calibration, calibration_interval_days, status)
```

---

## 8. Phase 15 — Cost Accounting

> **Prioritas: MENENGAH** | Estimasi: 2 minggu

### Cost Center

- [ ] **COST-01** Master cost center per departemen / line produksi
- [ ] **COST-02** Alokasi biaya overhead ke cost center
- [ ] **COST-03** Laporan biaya per cost center per periode

### Biaya Produksi per Work Order

- [ ] **COST-04** Biaya material: konsumsi aktual dari BOM × harga material
- [ ] **COST-05** Biaya tenaga kerja: jam kerja aktual × rate per jam
- [ ] **COST-06** Biaya overhead: alokasi berdasarkan jam mesin / volume produksi
- [ ] **COST-07** Biaya produksi total = material + tenaga kerja + overhead
- [ ] **COST-08** Variance analysis: estimasi vs aktual per WO

### COGS & Inventory Valuation

- [ ] **COST-09** Metode penilaian stok: FIFO / Average Cost / Standard Cost
- [ ] **COST-10** Auto-posting COGS saat Delivery Order dikonfirmasi
- [ ] **COST-11** Laporan profitabilitas per produk
- [ ] **COST-12** Gross margin analysis per customer / per produk

### Standard Costing

- [ ] **COST-13** Penetapan harga standar per produk
- [ ] **COST-14** Price variance: harga beli aktual vs standar
- [ ] **COST-15** Usage variance: pemakaian aktual vs standar BOM

---

## 9. Phase 16 — HR & Payroll Lanjutan

> **Prioritas: MENENGAH** | Estimasi: 2 minggu

### Rekrutmen

- [ ] **HR-01** Job posting internal
- [ ] **HR-02** Pipeline kandidat: Melamar → Screening → Interview → Offering → Hired
- [ ] **HR-03** Onboarding checklist karyawan baru

### Training & Development

- [ ] **HR-04** Master program training
- [ ] **HR-05** Jadwal training: peserta, trainer, lokasi, status
- [ ] **HR-06** Evaluasi training (pre-test / post-test score)
- [ ] **HR-07** Sertifikasi & masa berlaku per karyawan

### Penilaian Kinerja (KPI)

- [ ] **HR-08** Template KPI per jabatan
- [ ] **HR-09** Penilaian kinerja per periode (semester / tahunan)
- [ ] **HR-10** Self-assessment + atasan assessment
- [ ] **HR-11** Hasil penilaian → dasar kenaikan gaji / promosi

### Payroll Lengkap

- [ ] **HR-12** Komponen gaji fleksibel (tunjangan jabatan, makan, transport, dll)
- [ ] **HR-13** Potongan variabel (keterlambatan, tidak hadir, pinjaman karyawan)
- [ ] **HR-14** Integrasi BPJS otomatis (dari Phase 12)
- [ ] **HR-15** Integrasi PPh 21 otomatis (dari Phase 12)
- [ ] **HR-16** Slip gaji PDF per karyawan
- [ ] **HR-17** Transfer gaji: export file bank (BCA, Mandiri format)
- [ ] **HR-18** Organigram dinamis dari data jabatan

### Overtime & Shift

- [ ] **HR-19** Jadwal shift (pagi, sore, malam)
- [ ] **HR-20** Pencatatan lembur + perhitungan upah lembur (UU Ketenagakerjaan)
- [ ] **HR-21** Rekap jam kerja vs jam lembur per karyawan per bulan

---

## 10. Phase 17 — Asset & CMMS Lanjutan

> **Prioritas: MENENGAH** | Estimasi: 1–2 minggu

### Depresiasi Aset

- [ ] **ASSET-01** Metode depresiasi: Garis Lurus, Saldo Menurun Ganda
- [ ] **ASSET-02** Kalkulasi depresiasi otomatis bulanan
- [ ] **ASSET-03** Auto-posting jurnal depresiasi ke Accounting
- [ ] **ASSET-04** Akumulasi depresiasi per aset
- [ ] **ASSET-05** Laporan nilai buku aset per tanggal

### Disposal & Revaluasi

- [ ] **ASSET-06** Disposal aset: penjualan, penyerahan, penghapusan
- [ ] **ASSET-07** Gain/loss on disposal → auto-posting jurnal
- [ ] **ASSET-08** Revaluasi aset (aset tanah, bangunan)

### CMMS (Computerized Maintenance Management)

- [ ] **CMMS-01** Preventive maintenance berbasis kalender (PM terjadwal)
- [ ] **CMMS-02** Preventive maintenance berbasis jam operasi / meter
- [ ] **CMMS-03** Work order maintenance: assign ke teknisi, status, biaya
- [ ] **CMMS-04** Spare parts inventory: stok suku cadang per mesin
- [ ] **CMMS-05** Laporan biaya maintenance per aset per periode
- [ ] **CMMS-06** MTBF (Mean Time Between Failures) & MTTR per mesin
- [ ] **CMMS-07** Integrasi downtime → auto-create WO maintenance

---

## 11. Phase 18 — Budget & Financial Planning

> **Prioritas: MENENGAH** | Estimasi: 2 minggu

- [ ] **BUD-01** Master anggaran per departemen per akun per bulan
- [ ] **BUD-02** Upload anggaran tahunan (Excel import)
- [ ] **BUD-03** Budget vs Aktual real-time per akun / departemen
- [ ] **BUD-04** Alert over-budget: notifikasi saat realisasi > 90% anggaran
- [ ] **BUD-05** Revisi anggaran dengan approval (workflow)
- [ ] **BUD-06** Rolling forecast: proyeksi sisa tahun berdasarkan tren aktual
- [ ] **BUD-07** Laporan realisasi anggaran (format tabel + chart)
- [ ] **BUD-08** Multi-scenario: worst case / base case / best case

---

## 12. Phase 19 — RBAC & Multi-tenant

> **Prioritas: KRITIS (wajib sebelum go-live)** | Estimasi: 2 minggu

### Role-Based Access Control

```
Role Matrix:

Modul          | SuperAdmin | Finance | HR | Warehouse | Sales | Purchasing | Operator | Viewer
---------------|-----------|---------|-----|-----------|-------|------------|----------|-------
Dashboard      |    ✅     |   ✅   |  ✅ |     ✅    |   ✅  |     ✅     |   ✅     |   ✅
Sales          |    ✅     |   👁️   |     |           |   ✅  |            |          |   👁️
Purchasing     |    ✅     |   👁️   |     |           |       |     ✅     |          |   👁️
Warehouse      |    ✅     |   👁️   |     |     ✅    |       |     👁️    |   ✅     |   👁️
Factory        |    ✅     |         |     |     👁️   |       |            |   ✅     |   👁️
HRIS           |    ✅     |   👁️   |  ✅ |           |       |            |          |
Accounting     |    ✅     |   ✅   |     |           |       |            |          |
Asset          |    ✅     |   👁️   |     |           |       |            |   ✅     |   👁️
QC             |    ✅     |         |     |           |       |            |   ✅     |   👁️
Reports        |    ✅     |   ✅   |  ✅ |     ✅    |   ✅  |     ✅     |          |   👁️
Settings       |    ✅     |         |     |           |       |            |          |
Admin Users    |    ✅     |         |     |           |       |            |          |

✅ = Full CRUD  |  👁️ = View Only
```

- [ ] **RBAC-01** UI manajemen user: invite, non-aktifkan, reset password
- [ ] **RBAC-02** Role assignment per user
- [ ] **RBAC-03** Custom permission: override per user untuk aksi spesifik
- [ ] **RBAC-04** Halaman 403 Forbidden dengan pesan jelas
- [ ] **RBAC-05** Log akses: siapa akses modul apa dan kapan
- [ ] **RBAC-06** Department-based data filter (user Finance hanya lihat data Finance)

### Manajemen Pengguna

- [ ] **USR-01** Invite user via email
- [ ] **USR-02** Self-service: ganti password, foto profil
- [ ] **USR-03** 2FA (Two-Factor Authentication) via OTP email / TOTP
- [ ] **USR-04** Session management: lihat device aktif, paksa logout

### Multi-Company

- [ ] **MULTI-01** UI switch perusahaan (company selector di header)
- [ ] **MULTI-02** Isolasi data ketat per company_id di semua query
- [ ] **MULTI-03** Shared master data opsional (COA template, satuan)
- [ ] **MULTI-04** Laporan konsolidasi antar perusahaan (untuk holding)
- [ ] **MULTI-05** SSO lintas perusahaan: 1 login untuk semua entity

---

## 13. Phase 20 — Integrasi & Ekosistem

> **Prioritas: MENENGAH** | Estimasi: 3–4 minggu

### Document Management

- [ ] **DOC-01** Upload attachment ke semua transaksi (PDF, JPG, Excel)
- [ ] **DOC-02** Penyimpanan: MinIO (self-hosted) atau S3-compatible
- [ ] **DOC-03** Preview dokumen langsung di browser
- [ ] **DOC-04** Versi dokumen (v1.0, v2.0, Final)
- [ ] **DOC-05** Approval dokumen digital (e-signature sederhana)

### Notifikasi Multi-Channel

- [ ] **NOTIF-01** Email: SMTP (approval, reminder, alert)
- [ ] **NOTIF-02** WhatsApp: Fonnte / Wablas API (approval, jatuh tempo)
- [ ] **NOTIF-03** In-app: notifikasi bell sudah ada, perlu diperkaya
- [ ] **NOTIF-04** Template pesan per event yang bisa dikustomisasi

### E-Invoice & Perpajakan Digital

- [ ] **EINV-01** Integrasi API Coretax DJP untuk faktur pajak
- [ ] **EINV-02** Upload e-Faktur dari aplikasi langsung ke DJP
- [ ] **EINV-03** Nomor Seri Faktur Pajak (NSFP) dari DJP
- [ ] **EINV-04** Sinkronisasi status validasi e-Faktur

### Multi-currency

- [ ] **FX-01** Master mata uang (USD, SGD, EUR, CNY, dll)
- [ ] **FX-02** Kurs harian: input manual atau API Bank Indonesia
- [ ] **FX-03** Transaksi dalam foreign currency
- [ ] **FX-04** Revaluasi selisih kurs akhir bulan
- [ ] **FX-05** Laporan keuangan dalam IDR dan mata uang asing

### API Publik & Webhook

- [ ] **API-01** REST API publik dengan API key untuk integrasi third-party
- [ ] **API-02** Webhook: push event ke sistem eksternal (e-commerce, marketplace)
- [ ] **API-03** Import data: upload Excel untuk inventory, karyawan, COA
- [ ] **API-04** Integrasi marketplace: Tokopedia, Shopee (sync stok & pesanan)

### Barcode & RFID

- [ ] **BAR-01** Scan barcode via kamera browser (ZXing / QuaggaJS)
- [ ] **BAR-02** Generate QR code per item inventori / aset
- [ ] **BAR-03** Print label barcode (Zebra / label printer)
- [ ] **BAR-04** RFID reader integration (via USB HID atau webhook)

---

## 14. Phase 21 — BI & AI Lanjutan

> **Prioritas: RENDAH–MENENGAH** | Estimasi: 3–4 minggu

### Business Intelligence

- [ ] **BI-01** Dashboard eksekutif: Revenue, EBITDA, Cash, OEE, Headcount
- [ ] **BI-02** Drill-down: klik KPI → lihat detail transaksi
- [ ] **BI-03** Custom report builder: pilih field, filter, group, sort
- [ ] **BI-04** Scheduled report: kirim laporan otomatis via email setiap Senin
- [ ] **BI-05** Export ke Excel / PDF semua laporan dengan 1 klik
- [ ] **BI-06** Comparison view: periode ini vs periode lalu vs target

### AI & Predictive Analytics

- [ ] **AI-01** Demand forecasting: prediksi kebutuhan produksi dari historis SO
- [ ] **AI-02** Predictive maintenance: prediksi kerusakan mesin dari data downtime
- [ ] **AI-03** Anomaly detection: deteksi transaksi tidak wajar (fraud detection)
- [ ] **AI-04** AI chat ditingkatkan: tanya "berapa stok X?" → dapat jawaban dari DB real
- [ ] **AI-05** Auto-suggestion COA: AI sarankan akun yang tepat saat input jurnal
- [ ] **AI-06** Price recommendation: saran harga jual berdasarkan cost + margin target

### Real-time Operational Intelligence

- [ ] **BI-07** OEE live per mesin (WebSocket sudah ada, perlu data real dari sensor)
- [ ] **BI-08** Live inventory: stok real-time per gudang per item
- [ ] **BI-09** Sales live: pesanan masuk hari ini, revenue hari ini
- [ ] **BI-10** Alert intelligence: sistem deteksi sendiri pola yang perlu diperhatikan

---

## 15. Phase 22 — Mobile & PWA

> **Prioritas: RENDAH** | Estimasi: 2–3 minggu

- [ ] **MOB-01** PWA icons & splash screen (aset gambar kurang)
- [ ] **MOB-02** Offline mode: simpan data draft saat tidak ada koneksi
- [ ] **MOB-03** Push notification: browser push untuk approval & alert
- [ ] **MOB-04** Mobile-first layout untuk halaman utama
- [ ] **MOB-05** Biometric login (fingerprint/face ID) via WebAuthn
- [ ] **MOB-06** Camera integration: foto untuk aset, QC, visitor badge
- [ ] **MOB-07** Barcode scan via kamera mobile

---

## 16. Phase 23 — Production Ready & Go-Live ✅

> **Prioritas: KRITIS** | Status: **SELESAI** (2026-06-28)

- [x] **PROD-01** Health & readiness endpoint (`/api/v1/health`, `/api/v1/ready`)
- [x] **PROD-02** Full DB migration SQL (50+ tabel, semua phase)
- [x] **PROD-03** Nginx production: security headers, gzip, cache-control per tipe aset
- [x] **PROD-04** docker-compose.prod.yml: Redis, healthcheck, resource limits
- [x] **PROD-05** `.env.example`: semua environment variable terdokumentasi
- [x] **PROD-06** Error Boundary React + NotFound 404 page
- [x] **PROD-07** SW Update Prompt: notifikasi versi baru tersedia

---

## 17. Phase 24 — Sales Completion & CRM Pipeline

> **Prioritas: TINGGI** | Estimasi: 2–3 minggu

Melengkapi siklus penjualan yang belum tuntas: penawaran harga, retur barang, dan pipeline CRM aktif.

### Sales Quotation (Penawaran Harga)

- [ ] **SQ-01** Buat Quotation (nomor: QUO/2026/001) dengan line item produk, harga, diskon
- [ ] **SQ-02** Status: Draft → Sent → Accepted / Rejected / Expired
- [ ] **SQ-03** Validasi tanggal berlaku (valid_until), auto-expired
- [ ] **SQ-04** Convert Quotation → Sales Order 1 klik (copy semua line item)
- [ ] **SQ-05** Tab Quotation baru di halaman Sales

### Sales Return (Retur Penjualan)

- [ ] **SR-01** Buat Retur dari customer invoice yang sudah terkirim
- [ ] **SR-02** Pilih item yang diretur + qty yang dikembalikan
- [ ] **SR-03** Stok otomatis bertambah kembali saat retur dikonfirmasi
- [ ] **SR-04** Credit Note: kurangi tagihan customer (partial/full)
- [ ] **SR-05** Status: Draft → Confirmed → Stok Updated

### Purchase Return (Retur Pembelian)

- [ ] **SR-06** Buat Retur ke vendor dari GRN yang sudah diterima
- [ ] **SR-07** Debit Note: kurangi hutang ke vendor
- [ ] **SR-08** Stok otomatis berkurang

### CRM Pipeline

- [ ] **CRM-01** Master Lead: nama, perusahaan, kontak, sumber (referral/web/event)
- [ ] **CRM-02** Pipeline board: Lead → Qualified → Proposal → Negotiation → Won / Lost
- [ ] **CRM-03** Log aktivitas: call, meeting, email, WhatsApp per lead/customer
- [ ] **CRM-04** Target vs realisasi per salesperson per bulan
- [ ] **CRM-05** Konversi rate per stage (Win rate analytics)

### Database Baru

```sql
sales_quotations (id, company_id, quo_number, customer_id, date, valid_until,
                  subtotal, discount, tax_amount, total, status, notes, created_by)

sq_items (id, quo_id, product_id, product_name, qty, unit, unit_price, discount, amount)

sales_returns (id, company_id, return_number, inv_id, customer_id, date,
               reason, total, status, created_by)

return_items (id, return_id, product_id, qty, unit_price, amount)

crm_leads (id, company_id, name, company_name, phone, email, source, stage,
           owner_id, estimated_value, expected_close, notes, created_at)

crm_activities (id, lead_id, customer_id, type, date, notes, user_id)
```

---

## 18. Phase 25 — Finance Lanjutan (GL, Closing, Cash Flow)

> **Prioritas: TINGGI** | Estimasi: 2–3 minggu

Laporan keuangan lengkap yang memenuhi standar akuntansi Indonesia.

### General Ledger (Buku Besar)

- [ ] **GL-01** Buku Besar per akun COA: semua transaksi debit/kredit chronologis
- [ ] **GL-02** Filter periode, akun, departemen
- [ ] **GL-03** Saldo awal → mutasi → saldo akhir
- [ ] **GL-04** Export Excel / PDF per akun

### Trial Balance (Neraca Saldo)

- [ ] **TB-01** Neraca saldo per tanggal: semua akun, debit, kredit, saldo
- [ ] **TB-02** Auto-check: total debit = total kredit (balance validation)
- [ ] **TB-03** Comparative: bulan ini vs bulan lalu

### Cash Flow Statement

- [ ] **CF-01** Arus kas dari aktivitas operasi (metode tidak langsung)
- [ ] **CF-02** Arus kas dari aktivitas investasi (pembelian/penjualan aset)
- [ ] **CF-03** Arus kas dari aktivitas pendanaan
- [ ] **CF-04** Rekonsiliasi: laba bersih → kas akhir

### Closing Periode

- [ ] **CL-01** Lock jurnal: cegah posting ke periode yang sudah ditutup
- [ ] **CL-02** Closing entry otomatis: tutup akun pendapatan & beban ke Laba Ditahan
- [ ] **CL-03** Buka periode baru dengan saldo awal carry-forward
- [ ] **CL-04** Re-open periode (dengan approval superadmin)

### Laporan Perbandingan

- [ ] **COMP-01** Laporan Laba Rugi: bulan ini vs bulan lalu vs budget vs tahun lalu
- [ ] **COMP-02** Neraca: per tanggal vs tanggal pembanding
- [ ] **COMP-03** Variansi: aktual vs budget, highlight over/under

---

## 19. Phase 26 — PDF & Print Center

> **Prioritas: TINGGI** | Estimasi: 2 minggu

Semua dokumen transaksi bisa dicetak dalam format standar siap kirim.

### Dokumen Penjualan

- [ ] **PDF-01** Sales Quotation: header perusahaan, line item, tanda tangan, validity
- [ ] **PDF-02** Sales Order Confirmation: SO detail, delivery terms
- [ ] **PDF-03** Surat Jalan / Delivery Order: format standar pengiriman
- [ ] **PDF-04** Customer Invoice: nomor faktur, NPWP, PPN, due date, QR code
- [ ] **PDF-05** Faktur Pajak: format standar DJP (e-Faktur style)

### Dokumen Pembelian

- [ ] **PDF-06** Purchase Order: header vendor, delivery date, payment terms
- [ ] **PDF-07** Goods Receipt Note (GRN): konfirmasi penerimaan barang

### Dokumen HR

- [ ] **PDF-08** Slip Gaji bulanan: komponen gaji, potongan, take-home pay
- [ ] **PDF-09** Bukti Potong PPh 21 per karyawan (Form 1721-A1)
- [ ] **PDF-10** Sertifikat training + surat keterangan karyawan

### Infrastruktur Print

- [ ] **PDF-11** Template engine: header/footer/watermark per jenis dokumen
- [ ] **PDF-12** Kustomisasi logo & warna per perusahaan
- [ ] **PDF-13** Kirim PDF via email langsung dari halaman dokumen
- [ ] **PDF-14** Batch print: cetak 50 slip gaji sekaligus

### Teknologi

```
Backend: go-pdf / unipdf / chromedp (HTML to PDF headless Chrome)
Frontend: jsPDF sudah ada, tambah html2canvas untuk layout kompleks
Template: Go html/template → PDF via wkhtmltopdf atau Chromium
```

---

## 20. Phase 27 — Bank Rekonsiliasi & Cash Management

> **Prioritas: TINGGI** | Estimasi: 2 minggu

### Bank Rekonsiliasi

- [ ] **REC-01** Upload statement bank (CSV/Excel format BCA, Mandiri, BNI, BRI)
- [ ] **REC-02** Auto-matching: cocokkan transaksi sistem dengan statement bank
- [ ] **REC-03** Matching rules: amount + date ± 1 hari + description fuzzy match
- [ ] **REC-04** Manual match / unmatch untuk transaksi yang tidak cocok otomatis
- [ ] **REC-05** Laporan selisih rekonsiliasi: outstanding items per sisi
- [ ] **REC-06** Lock setelah rekonsiliasi selesai (prevent double recon)

### Petty Cash

- [ ] **PC-01** Master petty cash per departemen dengan saldo awal
- [ ] **PC-02** Pencairan petty cash: catat pengeluaran kecil harian
- [ ] **PC-03** Pengisian ulang (replenishment): ajukan ke Finance
- [ ] **PC-04** Laporan petty cash per departemen

### Transfer Antar Rekening

- [ ] **TRF-01** Transfer kas ↔ bank atau antar bank
- [ ] **TRF-02** Auto-posting jurnal: debit rekening tujuan, kredit rekening asal
- [ ] **TRF-03** Status: pending → confirmed

### Database Baru

```sql
bank_statements (id, company_id, bank_account_id, period, statement_date,
                 opening_balance, closing_balance, uploaded_at)

statement_lines (id, statement_id, date, description, debit, credit, balance, matched_id)

petty_cash (id, company_id, department, name, balance, max_limit, created_at)

petty_cash_transactions (id, petty_cash_id, date, description, amount, type, receipt_url)
```

---

## 21. Phase 28 — Coretax DJP & E-Invoice

> **Prioritas: KRITIS (sebelum go-live produksi)** | Estimasi: 3 minggu

Kepatuhan pajak digital wajib untuk perusahaan PKP di Indonesia.

### Nomor Seri Faktur Pajak (NSFP)

- [ ] **TAX-19** Input/import NSFP dari DJP (nomor seri yang diberikan DJP)
- [ ] **TAX-20** Auto-assign NSFP ke setiap faktur pajak keluaran secara urut
- [ ] **TAX-21** Alert saat NSFP hampir habis (threshold configurable)

### Faktur Pajak Digital

- [ ] **TAX-22** Generate e-Faktur format XML sesuai spesifikasi DJP
- [ ] **TAX-23** QR Code pada faktur pajak (sesuai standar Coretax)
- [ ] **TAX-24** Tanda tangan elektronik (menggunakan sertifikat digital)
- [ ] **TAX-25** Preview e-Faktur sebelum upload

### Integrasi API Coretax DJP

- [ ] **TAX-26** Autentikasi OAuth ke sistem Coretax DJP
- [ ] **TAX-27** Upload faktur pajak keluaran langsung ke DJP
- [ ] **TAX-28** Sinkronisasi status validasi (approved/rejected) dari DJP
- [ ] **TAX-29** Download faktur masukan yang dilaporkan vendor ke DJP
- [ ] **TAX-30** Laporan SPT Masa PPN: rekap + upload ke DJP

### Export Format Lama (e-Faktur Desktop)

- [ ] **TAX-31** Export CSV format e-Faktur 3.2 (fallback jika API tidak tersedia)
- [ ] **TAX-32** Validasi format sebelum export (cek NPWP, NSFP, nilai)

---

## 22. Phase 29 — Import / Export & API Publik

> **Prioritas: MENENGAH** | Estimasi: 3 minggu

### Import Data via Excel

- [ ] **IMP-01** Import master produk: kode, nama, satuan, harga, kategori
- [ ] **IMP-02** Import master karyawan: semua field dari template Excel
- [ ] **IMP-03** Import COA: kode akun, nama, tipe, parent
- [ ] **IMP-04** Import stok awal: produk, warehouse, qty, harga rata-rata
- [ ] **IMP-05** Import transaksi historis: SO, PO, jurnal (migration dari sistem lama)
- [ ] **IMP-06** Validasi sebelum import: preview errors, skip/abort/fix
- [ ] **IMP-07** Template Excel downloadable untuk setiap jenis import

### Export Lanjutan

- [ ] **EXP-01** Export semua DataTable ke Excel dengan filter aktif
- [ ] **EXP-02** Export laporan keuangan ke Excel dengan formatting (bold, border, color)
- [ ] **EXP-03** Scheduled export: kirim laporan Excel ke email setiap Senin pagi

### REST API Publik

- [ ] **API-01** API Key management: generate/revoke per aplikasi third-party
- [ ] **API-02** Rate limiting per API key (100 req/menit default)
- [ ] **API-03** Endpoint publik: GET products, inventory, customers, orders
- [ ] **API-04** Dokumentasi API otomatis (Swagger/OpenAPI 3.0)
- [ ] **API-05** API usage log: siapa call apa kapan, berapa response time

### Webhook

- [ ] **WH-01** Subscribe ke event: SO created, PO approved, invoice paid, stock alert
- [ ] **WH-02** Kirim HTTP POST ke URL tujuan saat event terpicu
- [ ] **WH-03** Retry otomatis jika endpoint tujuan down (exponential backoff)
- [ ] **WH-04** Webhook log: history pengiriman + status response

### Marketplace Integration

- [ ] **MKT-01** Sync produk ke Tokopedia / Shopee via Official API
- [ ] **MKT-02** Tarik pesanan masuk dari marketplace → auto-buat SO
- [ ] **MKT-03** Update stok di marketplace saat stok sistem berubah
- [ ] **MKT-04** Dashboard marketplace: pesanan, revenue, stok per channel

---

## 23. Phase 30 — Security Lanjutan (2FA, Session, Audit Trail)

> **Prioritas: TINGGI (keamanan enterprise)** | Estimasi: 2 minggu

### Two-Factor Authentication (2FA)

- [ ] **SEC-01** 2FA via OTP email: kode 6 digit kirim ke email saat login
- [ ] **SEC-02** 2FA via TOTP: Google Authenticator / Authy (RFC 6238)
- [ ] **SEC-03** QR code setup TOTP di halaman profil user
- [ ] **SEC-04** Backup codes: 10 one-time recovery codes
- [ ] **SEC-05** Admin bisa enforce 2FA wajib untuk semua user
- [ ] **SEC-06** Remember device: skip 2FA di perangkat yang dipercaya (30 hari)

### Session Management

- [ ] **SES-01** Lihat semua session aktif: perangkat, browser, IP, lokasi, last active
- [ ] **SES-02** Paksa logout satu session atau semua session
- [ ] **SES-03** Auto-logout setelah inaktif (configurable: 30 mnt / 2 jam / 8 jam)
- [ ] **SES-04** Notifikasi login dari perangkat/IP baru via email

### Audit Trail UI

- [ ] **AUD-01** Halaman Audit Log: tampilkan semua perubahan data dengan filter
- [ ] **AUD-02** Per-record history: klik icon di tabel → lihat semua versi data
- [ ] **AUD-03** Diff view: tampilkan field mana yang berubah (old vs new)
- [ ] **AUD-04** Export audit log ke Excel untuk kebutuhan compliance
- [ ] **AUD-05** Retention policy: auto-archive log > 1 tahun ke cold storage

### Keamanan Tambahan

- [ ] **SEC-07** Password policy: minimum length, kompleksitas, expiry 90 hari
- [ ] **SEC-08** IP whitelist per user/role (opsional)
- [ ] **SEC-09** Failed login lockout: 5x gagal → locked 30 menit

---

## 24. Phase 31 — Manufacturing Excellence

> **Prioritas: MENENGAH** | Estimasi: 3 minggu

Peningkatan modul manufaktur ke level industri.

### Gantt Chart Produksi

- [ ] **GANTT-01** Visualisasi jadwal WO per mesin secara timeline
- [ ] **GANTT-02** Drag-and-drop reschedule WO (ubah tanggal / mesin)
- [ ] **GANTT-03** Deteksi konflik: 2 WO di mesin yang sama di waktu yang sama
- [ ] **GANTT-04** Critical path: identifikasi WO yang mempengaruhi delivery date
- [ ] **GANTT-05** Color coding: status WO (scheduled/running/late/done)

### Statistical Process Control (SPC)

- [ ] **SPC-01** X-bar chart: rata-rata per sampel vs control limits (UCL/LCL)
- [ ] **SPC-02** R chart: rentang per sampel
- [ ] **SPC-03** Auto-hitung UCL/LCL dari historis 25 subgroup pertama
- [ ] **SPC-04** Alert otomatis: Western Electric rules violation
- [ ] **SPC-05** Capability index: Cp, Cpk per parameter inspeksi

### FIFO / FEFO Picking

- [ ] **FIFO-01** Auto-suggest lot yang harus diambil saat issue dari produksi
- [ ] **FIFO-02** FEFO: prioritaskan lot dengan expiry terdekat untuk material perishable
- [ ] **FIFO-03** Lot costing: harga rata-rata per lot untuk akurasi COGS
- [ ] **FIFO-04** Block lot: tandai lot yang di-hold pending QC release

### OEE Real dari Sensor

- [ ] **OEE-01** Koneksi MQTT broker: subscribe ke topic mesin
- [ ] **OEE-02** Parse data sensor: production count, downtime, speed
- [ ] **OEE-03** Hitung OEE real-time: Availability × Performance × Quality
- [ ] **OEE-04** Dashboard OEE live: per mesin, per shift, per hari
- [ ] **OEE-05** Alert OEE < threshold (configurable per mesin)

---

## 25. Phase 32 — HR Completion (Slip Gaji, Organigram)

> **Prioritas: MENENGAH** | Estimasi: 2 minggu

### Payroll Lengkap

- [ ] **PAY-01** Komponen gaji fleksibel: tunjangan jabatan, makan, transport, anak, istri
- [ ] **PAY-02** Potongan variabel: absen, terlambat, pinjaman karyawan
- [ ] **PAY-03** Integrasi auto PPh21 & BPJS dari Phase 12
- [ ] **PAY-04** Slip gaji PDF: branding perusahaan, QR verify, password-protected
- [ ] **PAY-05** Kirim slip gaji ke email karyawan secara batch
- [ ] **PAY-06** Export file transfer bank: BCA, Mandiri, BNI (format CSV)

### Pinjaman Karyawan

- [ ] **LOAN-01** Pengajuan pinjaman: jumlah, tenor, cicilan/bulan
- [ ] **LOAN-02** Approval workflow: HRD → Finance
- [ ] **LOAN-03** Auto-potong cicilan dari payroll setiap bulan
- [ ] **LOAN-04** Laporan outstanding pinjaman per karyawan

### Organigram Dinamis

- [ ] **ORG-01** Render tree dari data jabatan + atasan langsung di tabel employees
- [ ] **ORG-02** Interactive zoom/pan, klik node → lihat detail karyawan
- [ ] **ORG-03** Export organigram ke PNG / PDF

### Sertifikasi & Kompetensi

- [ ] **CERT-01** Master kompetensi per jabatan
- [ ] **CERT-02** Tracking sertifikasi karyawan: issued date + expired date
- [ ] **CERT-03** Alert sertifikasi hampir expired (H-30)

---

## 26. Phase 33 — UX & Platform (Dark Mode, Multi-language)

> **Prioritas: MENENGAH** | Estimasi: 2–3 minggu

### Dark Mode

- [ ] **UX-01** Toggle dark/light mode di header, tersimpan di localStorage
- [ ] **UX-02** System preference detection: `prefers-color-scheme`
- [ ] **UX-03** Semua komponen (Card, Table, Modal, Sidebar) support dark variables
- [ ] **UX-04** Chart recharts: dark-mode aware (grid color, label color)

### Multi-language (i18n)

- [ ] **I18N-01** Library: i18next + react-i18next
- [ ] **I18N-02** Bahasa: Indonesia (default) + English
- [ ] **I18N-03** Language selector di Settings profil user
- [ ] **I18N-04** Format angka, tanggal, mata uang sesuai locale
- [ ] **I18N-05** Semua label form, pesan error, tooltip diterjemahkan

### Aksesibilitas (a11y)

- [ ] **A11Y-01** Keyboard navigation: semua interaksi bisa via keyboard
- [ ] **A11Y-02** ARIA labels pada semua button/input/icon-only
- [ ] **A11Y-03** Color contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] **A11Y-04** Focus visible: outline jelas saat focus

### Performa Frontend

- [ ] **PERF-01** Lazy loading per route (React.lazy + Suspense sudah ada)
- [ ] **PERF-02** Virtual scrolling untuk tabel > 1000 baris (react-window)
- [ ] **PERF-03** Image optimization: WebP, lazy loading, blur placeholder
- [ ] **PERF-04** Bundle analyzer: identifikasi dan split chunk besar

---

## 27. Phase 34 — Customer & Vendor Portal

> **Prioritas: RENDAH–MENENGAH** | Estimasi: 3 minggu

### Customer Self-Service Portal

- [ ] **CP-01** Login terpisah untuk customer (email + password unik per customer)
- [ ] **CP-02** Dashboard customer: outstanding invoice, order status, payment history
- [ ] **CP-03** Lihat & download invoice PDF
- [ ] **CP-04** Konfirmasi pembayaran: upload bukti transfer → Finance menerima notifikasi
- [ ] **CP-05** Track delivery order: status pengiriman real-time
- [ ] **CP-06** Ajukan retur / klaim langsung dari portal
- [ ] **CP-07** Download statement piutang (aging AR) per customer

### Vendor Self-Service Portal

- [ ] **VP-01** Login terpisah untuk vendor
- [ ] **VP-02** Lihat PO yang diterbitkan: status, delivery deadline
- [ ] **VP-03** Upload invoice & dokumen pengiriman ke PO terkait
- [ ] **VP-04** Track pembayaran: status hutang, tanggal jatuh tempo
- [ ] **VP-05** Update katalog produk & harga terkini
- [ ] **VP-06** Download statement hutang (aging AP)

### Teknologi

```
Route terpisah: /portal/customer/:token dan /portal/vendor/:token
Auth: JWT pendek (8 jam) + refresh token
Akses terbatas: hanya data company_id + customer_id/vendor_id milik sendiri
```

---

## 28. Phase 35 — Marketplace & IoT Real Integration

> **Prioritas: RENDAH** | Estimasi: 4–6 minggu

### Marketplace Integration

- [ ] **MKT-01** Koneksi API Tokopedia (Official Partner API)
- [ ] **MKT-02** Koneksi API Shopee (Open Platform API)
- [ ] **MKT-03** Auto-sync stok: setiap perubahan stok di SEP → update listing marketplace
- [ ] **MKT-04** Auto-import order: pesanan baru di marketplace → SO di SEP
- [ ] **MKT-05** Sync harga: update harga jual di marketplace dari master produk SEP
- [ ] **MKT-06** Omni-channel stock: 1 pool stok dibagi ke semua channel (alokasi per channel)
- [ ] **MKT-07** Dashboard omni: revenue, order, konversi per channel dalam 1 view

### IoT Real Sensor Integration

- [ ] **IOT-01** MQTT broker (Mosquitto / EMQX): subscribe ke topic sensor mesin
- [ ] **IOT-02** OPC-UA client: integrasi ke PLC / SCADA industrial
- [ ] **IOT-03** Parser data: konversi raw sensor value → OEE metric
- [ ] **IOT-04** Time-series DB: simpan data sensor di TimescaleDB (PostgreSQL extension)
- [ ] **IOT-05** Alert rule engine: trigger notifikasi saat sensor > threshold
- [ ] **IOT-06** Historical chart: grafik sensor 24 jam, 7 hari, 30 hari

### Background Job & Scheduler

- [ ] **JOB-01** Job queue: Asynq (Redis-based) untuk task berat async
- [ ] **JOB-02** Cron jobs: generate laporan terjadwal, kirim email reminder AP/AR jatuh tempo
- [ ] **JOB-03** Retry & dead-letter queue untuk jobs yang gagal
- [ ] **JOB-04** Job dashboard: lihat queue, running, failed, completed

---

## 29. Ringkasan Timeline

```
━━━ SELESAI ✅ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 10–23: Core ERP + Manufacturing + BI/AI + Mobile + Go-Live
Status: SELESAI (2026-06-28)

━━━ ROADMAP SELANJUTNYA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2026

Q3 (Juli–Agustus) — Sales & Finance Completion
├── Phase 24: Sales Completion & CRM Pipeline    (Juli minggu 1–3)
├── Phase 25: Finance Lanjutan (GL, Closing)     (Juli minggu 4 – Agustus minggu 2)
└── Phase 26: PDF & Print Center                 (Agustus minggu 3–4)

Q3–Q4 (September–Oktober) — Rekonsiliasi & Pajak
├── Phase 27: Bank Rekonsiliasi & Cash Mgmt      (September minggu 1–2)
├── Phase 28: Coretax DJP & E-Invoice            (September minggu 3 – Oktober minggu 2)
└── Phase 29: Import/Export & API Publik         (Oktober minggu 3–4)

Q4 (November–Desember) — Security & Manufacturing Excellence
├── Phase 30: Security Lanjutan (2FA, Audit)     (November minggu 1–2)
└── Phase 31: Manufacturing Excellence           (November minggu 3 – Desember minggu 2)

2027

Q1 (Januari–Februari) — HR & UX
├── Phase 32: HR Completion (Slip Gaji, Org)     (Januari minggu 1–2)
└── Phase 33: UX & Platform (Dark Mode, i18n)    (Januari minggu 3 – Februari minggu 1)

Q1–Q2 (Februari–April) — Portal & Integrasi
├── Phase 34: Customer & Vendor Portal           (Februari minggu 2 – Maret minggu 2)
└── Phase 35: Marketplace & IoT Real             (Maret minggu 3 – April minggu 4)

Q2 (Mei 2027) — Enterprise Go-Live v2.0
└── Full Production v2.0: semua 35 phase aktif
```

### Prioritas berdasarkan nilai bisnis

| Tier | Phase | Alasan |
|------|-------|--------|
| **Wajib segera** | 24, 25, 26, 28 | Melengkapi siklus bisnis + compliance pajak |
| **Sangat penting** | 27, 29, 30 | Rekonsiliasi + API + keamanan enterprise |
| **Penting** | 31, 32 | Manufaktur & HR lebih lengkap |
| **Nice to have** | 33, 34, 35 | UX + portal + integrasi eksternal |

---

## 30. Arsitektur Target

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER / MOBILE (React PWA)                 │
│  Sales │ Purchase │ WH │ Factory │ HRIS │ Finance │ QC │ BI    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                   API GATEWAY / NGINX                           │
│              Rate Limiting │ SSL Termination                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                  BACKEND (Golang + Gin)                         │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐ │
│  │   Auth   │ │  Sales   │ │Purchasing│ │    Accounting      │ │
│  │  + RBAC  │ │  + CRM   │ │ + AP/AR  │ │  + Tax + Budget    │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐ │
│  │ Factory  │ │Warehouse │ │   HRIS   │ │   QC / CMMS        │ │
│  │ + MRP    │ │+ Barcode │ │+ Payroll │ │  + Cost Acctg      │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Services: Email │ WhatsApp │ Gemini AI │ Coretax DJP   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
     ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
     │ PostgreSQL  │  │    MinIO    │  │    Redis    │
     │  (Primary)  │  │  (Storage)  │  │   (Cache)   │
     └─────────────┘  └─────────────┘  └─────────────┘
```

### Teknologi Tambahan yang Dibutuhkan

| Kebutuhan | Teknologi Pilihan | Phase |
|---|---|---|
| File storage | MinIO (self-hosted) atau AWS S3 | 20 ✅ |
| Cache & session | Redis | 23 ✅ |
| Email | SMTP (Gmail / Mailgun / SendGrid) | 26 |
| WhatsApp | Fonnte API / Wablas / WAHA | 26 |
| PDF generation | Chromium headless / go-pdf / wkhtmltopdf | 26 |
| Barcode | ZXing-js / QuaggaJS | 20 ✅ |
| E-Faktur | API Coretax DJP | 28 |
| Background job | Asynq (Redis-based) | 35 |
| Search | PostgreSQL FTS ✅ / Meilisearch (opsional) | 23 ✅ |
| i18n | i18next + react-i18next | 33 |
| Virtual scroll | react-window | 33 |
| Time-series DB | TimescaleDB (pg extension) | 35 |
| MQTT IoT | Mosquitto / EMQX | 35 |
| Marketplace | Tokopedia / Shopee Open API | 35 |
| 2FA TOTP | otpauth (Go) + google-authenticator | 30 |
| SPC Charts | Recharts + custom control limits | 31 |
| Gantt Chart | dhtmlx-gantt / bryntum / custom SVG | 31 |

---

## Kriteria Go-Live Minimum

Sebelum aplikasi dipakai untuk operasional nyata, **wajib selesai**:

- [ ] Phase 10: Sales Module (SO → DO → Invoice)
- [ ] Phase 11: AP/AR (vendor invoice + customer payment)
- [ ] Phase 12: Tax (PPN + PPh 21)
- [ ] Phase 19: RBAC multi-role
- [ ] Export PDF/Excel di semua modul utama
- [ ] Audit trail aktif di semua transaksi keuangan
- [ ] Backup database otomatis
- [ ] HTTPS / SSL di production
- [ ] User manual / panduan penggunaan

---

*Dokumen ini diperbarui seiring progress pengembangan.*
*Untuk detail teknis implementasi, lihat `DEVELOPMENT.md`.*
