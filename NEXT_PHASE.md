# Next Phase Development Plan — Smart Enterprise Platform

> Dokumen ini merangkum hasil audit modul per 2026-06-29 dan mendefinisikan rencana pengembangan fase berikutnya.  
> Untuk roadmap jangka panjang (Phase 10–35), lihat [ERP_ROADMAP.md](./ERP_ROADMAP.md).

---

## Ringkasan Eksekutif

Platform saat ini memiliki **12 modul aktif** dengan kesiapan rata-rata **~70%** untuk operasional enterprise. Infrastruktur inti (Auth, WebSocket, AI Assistant, Go-Live readiness) sudah solid. Gap terbesar ada di alur bisnis end-to-end: siklus penjualan belum tertutup, laporan keuangan standar belum lengkap, dan kepatuhan perpajakan Indonesia (PPh 21/22/23/25/26 + Coretax) belum terhubung ke modul operasional.

### Status Kesiapan Per Modul

| Modul | Kelengkapan | Gap Kritis |
|-------|-------------|------------|
| **Dashboard** | 75% | Cash flow widget, drill-down chart |
| **Smart Factory** | 70% | Gantt chart, batch/lot tracking, routing lengkap |
| **Smart Warehouse** | 72% | Bin location, FIFO/FEFO picking, transfer antar gudang |
| **HRIS** | 65% | PPh 21 terintegrasi, slip gaji PDF, organigram |
| **Purchasing** | 68% | RFQ/Tender, supplier scorecard, 3-way matching |
| **Asset Management** | 60% | Depresiasi auto-posting ke GL, disposal, CMMS penuh |
| **Finance / Accounting** | 55% | General Ledger, Cash Flow Statement, closing periode |
| **Security** | 70% | Audit trail UI, 2FA, session management |
| **Vehicle / Fleet** | 65% | Trip costing, fuel efficiency report |
| **Network NOC** | 70% | Alerting rules engine, topology map |
| **Smart Building** | 65% | Energy baseline, anomaly detection |
| **Analytics** | 60% | Drill-down, custom report builder, scheduled export |
| **Sales** | 45% | Quotation, CRM pipeline, AR aging |
| **Tax** | 50% | PPh 21/22/23/25/26, Coretax API, e-SPT |
| **Cost Accounting** | 55% | Standard costing, WO cost, variance analysis |

---

## Prioritas Pengembangan

### Prioritas 1 — Wajib (Bulan 1–2)

Fitur-fitur ini diperlukan agar siklus bisnis utama berjalan end-to-end.

#### 1.1 Approval Workflow Engine

Saat ini banyak transaksi (PO, SO, jurnal besar, cuti) tidak memiliki mekanisme persetujuan formal.

**Cakupan:**
- [ ] Konfigurasi rule approval: modul + kondisi nilai (mis. PO > 50 juta → wajib approval Direktur)
- [ ] Multi-level approval: Level 1 (Supervisor) → Level 2 (Manager) → Level 3 (Direksi)
- [ ] Status tracking: Pending → Approved / Rejected / Revision
- [ ] Notifikasi in-app + email saat ada item menunggu approval
- [ ] Delegasi approval saat pejabat tidak hadir (cuti/tugas luar)
- [ ] Audit trail setiap keputusan approval (siapa, kapan, catatan)

**Modul yang terpengaruh:** Purchasing (PO, PR), Sales (SO besar), Finance (jurnal penyesuaian), HRIS (cuti, lembur)

**Database:**
```sql
approval_rules (id, company_id, module, doc_type, condition_field, condition_operator, condition_value, levels, created_at)
approval_levels (id, rule_id, level, approver_role, approver_user_id, is_any_of_role)
approval_requests (id, company_id, rule_id, doc_type, doc_id, doc_number, amount, status, requested_by, created_at)
approval_actions (id, request_id, level, action, actor_id, note, acted_at)
```

**Estimasi:** 1 minggu

---

#### 1.2 RFQ / Tender (Purchasing)

Alur pengadaan belum memiliki proses penawaran kompetitif dari vendor.

**Cakupan:**
- [ ] Buat RFQ (Request for Quotation) dari Purchase Request
- [ ] Kirim RFQ ke beberapa vendor sekaligus
- [ ] Input penawaran vendor: harga, lead time, syarat pembayaran
- [ ] Bandingkan penawaran: tabel komparasi harga per vendor per item
- [ ] Pilih vendor pemenang → auto-generate PO
- [ ] Status RFQ: Draft → Sent → Offers Received → Evaluated → Closed

**Estimasi:** 1 minggu

---

#### 1.3 Batch / Lot Tracking (Warehouse + Factory)

Material dan produk jadi perlu dapat ditelusuri hingga ke batch produksi.

**Cakupan:**
- [ ] Nomor lot auto-generate saat GRN (format: LOT/2026/001)
- [ ] Assign lot ke setiap penerimaan barang (GRN)
- [ ] Lacak lot dari: Vendor → GRN → Gudang → Produksi → Produk Jadi → DO Customer
- [ ] Expiry date management untuk material perishable
- [ ] FIFO/FEFO picking: saat issue ke produksi, sistem suggest lot terlama/terdekat expired
- [ ] Blokir lot (hold) untuk QC release pending
- [ ] Recall report: semua lot yang terdampak dari satu batch material bermasalah

**Database:**
```sql
lot_numbers (id, company_id, item_id, lot_number, qty_received, qty_remaining,
             received_date, expiry_date, grn_id, supplier_id, status)
lot_transactions (id, lot_id, type, qty, ref_type, ref_id, date, notes)
```

**Estimasi:** 1 minggu

---

#### 1.4 Integrasi Pajak PPh (Tax Module)

Modul Tax saat ini fokus pada PPN dan e-Faktur. PPh belum terintegrasi ke operasional.

**Cakupan PPh 21:**
- [ ] Hitung PPh 21 bulanan per karyawan (PTKP 2024: K/0, K/1, K/2, K/3, TK)
- [ ] Metode: gross, gross-up (tunjangan pajak), netto
- [ ] Integrasi otomatis dengan payroll HRIS
- [ ] Bukti Potong PPh 21 PDF (Form 1721-A1)
- [ ] Export SPT Masa PPh 21 CSV format e-SPT

**Cakupan PPh 23:**
- [ ] Potong PPh 23 saat bayar vendor jasa: 2% (jasa lain), 15% (dividen, bunga, royalti)
- [ ] Cek NPWP vendor (ada NPWP = tarif normal, tidak ada = 2× tarif)
- [ ] Bukti Potong PPh 23 PDF

**Cakupan PPh 25/29:**
- [ ] Angsuran PPh 25 bulanan dari estimasi PPh tahunan
- [ ] Rekap PPh 29 (kurang bayar akhir tahun)

**Estimasi:** 1,5 minggu

---

#### 1.5 Credit Limit Enforcement (Sales)

Saat ini tidak ada pengecekan limit kredit customer saat pembuatan SO.

**Cakupan:**
- [ ] Field `credit_limit` dan `payment_term_days` di master customer
- [ ] Saat SO dibuat: cek outstanding AR + SO pending vs credit limit
- [ ] Jika melebihi: blokir SO (default) atau warning + butuh approval kredit
- [ ] Dashboard AR aging per customer
- [ ] Alert otomatis: customer mendekati 80% credit limit

**Estimasi:** 3 hari

---

### Prioritas 2 — Sangat Penting (Bulan 2–3)

#### 2.1 General Ledger & Financial Closing (Finance)

- [ ] Buku Besar per akun COA: semua posting debit/kredit chronologis
- [ ] Neraca Saldo (Trial Balance): debit = kredit validation
- [ ] Closing bulanan: lock jurnal periode lalu, auto-closing entry L/R ke Retained Earnings
- [ ] Cash Flow Statement (metode tidak langsung dari laba bersih)
- [ ] Laporan keuangan perbandingan: bulan ini vs bulan lalu vs tahun lalu

**Estimasi:** 1,5 minggu

---

#### 2.2 Work Order dari Preventive Maintenance (Asset)

- [ ] Saat jadwal PM jatuh tempo → auto-generate Work Order ke teknisi
- [ ] WO maintenance: assign teknisi, estimasi durasi, spare parts yang dibutuhkan
- [ ] Konfirmasi selesai: waktu aktual, biaya aktual spare parts
- [ ] Integrasi downtime Factory: downtime mesin → auto-create WO maintenance
- [ ] MTBF & MTTR report per mesin

**Estimasi:** 1 minggu

---

#### 2.3 Supplier Scorecard (Purchasing)

- [ ] Evaluasi vendor per periode (bulanan/kuartalan)
- [ ] Kriteria: on-time delivery %, kualitas (% rejection dari QC), harga kompetitif, responsiveness
- [ ] Skor 0–100 dengan bobot per kriteria (configurable)
- [ ] History skor vendor — tren naik/turun
- [ ] Flag vendor underperforming (skor < 60) → perlu review atau stop order

**Estimasi:** 4 hari

---

#### 2.4 Cash Flow Forecast (Finance)

- [ ] Proyeksi penerimaan kas: dari AR outstanding + SO confirmed + expected payment dates
- [ ] Proyeksi pengeluaran kas: dari AP outstanding + PO pending + payroll due
- [ ] Tampilan 30/60/90 hari ke depan
- [ ] Gap analysis: hari mana butuh tambahan dana
- [ ] Skenario: optimis (semua bayar tepat waktu) vs realistis (rata-rata historis)

**Estimasi:** 1 minggu

---

#### 2.5 Analytics Drill-Down

- [ ] Klik KPI di dashboard → lihat transaksi pendukung
- [ ] Revenue chart → drill ke SO per customer, per produk
- [ ] OEE chart → drill ke WO per mesin, per shift
- [ ] Export Excel dengan filter aktif di semua DataTable
- [ ] Scheduled report: kirim PDF/Excel via email setiap Senin pagi

**Estimasi:** 1 minggu

---

#### 2.6 Sales Quotation & CRM Pipeline

- [ ] Tab Quotation di modul Sales: buat, kirim, track status
- [ ] Convert Quotation → SO dengan 1 klik
- [ ] Pipeline CRM: Lead → Qualified → Proposal → Negotiation → Won/Lost
- [ ] Log aktivitas per lead: call, meeting, email, WhatsApp
- [ ] Target vs realisasi per salesperson per bulan
- [ ] Win rate analytics per stage

**Estimasi:** 1,5 minggu

---

### Prioritas 3 — Penting (Bulan 3–4)

#### 3.1 Multi-currency

- [ ] Master mata uang (USD, SGD, EUR, CNY)
- [ ] Kurs harian: input manual atau API Bank Indonesia (webapi.bps.go.id)
- [ ] Transaksi SO/PO dalam foreign currency
- [ ] Revaluasi selisih kurs akhir bulan (jurnal otomatis)
- [ ] Laporan keuangan dalam IDR + mata uang asing

**Estimasi:** 1 minggu

---

#### 3.2 Bin Location (Warehouse)

- [ ] Definisi layout gudang: Zona → Rak → Lajur → Posisi (mis. A-01-B-03)
- [ ] Assign item ke bin location saat GRN
- [ ] Picking list menunjukkan lokasi bin: "Ambil dari A-01-B-03"
- [ ] Transfer antar bin (putaway optimization)
- [ ] Stok per bin location report

**Estimasi:** 1 minggu

---

#### 3.3 Notification System (Multi-channel)

- [ ] In-app notification bell (sudah ada skeleton — perlu enrichment)
- [ ] Email notifikasi via SMTP: approval pending, invoice jatuh tempo, stock alert
- [ ] Template pesan per event yang bisa dikustomisasi admin
- [ ] WhatsApp via Fonnte/Wablas API (opsional, butuh nomor bisnis terverifikasi)
- [ ] Preference per user: pilih channel mana yang aktif

**Estimasi:** 1 minggu

---

#### 3.4 Audit Trail UI

- [ ] Halaman Audit Log: semua perubahan data dengan filter modul/tanggal/user
- [ ] Per-record history: icon di tabel → lihat semua versi data
- [ ] Diff view: field mana yang berubah (old value → new value)
- [ ] Export audit log ke Excel
- [ ] Backend: `audit_logs` table sudah perlu dicatat di semua handler yang melakukan perubahan

**Estimasi:** 1 minggu

---

#### 3.5 Employee Benefits & KPI 360°

- [ ] Komponen benefit: tunjangan makan, transport, jabatan, anak, istri (configurable)
- [ ] Potongan variabel: keterlambatan, absen, cicilan pinjaman karyawan
- [ ] Slip gaji PDF dengan branding perusahaan
- [ ] Template KPI per jabatan
- [ ] Self-assessment + penilaian atasan + penilaian rekan (360°)
- [ ] Hasil penilaian → dasar kenaikan gaji / promosi

**Estimasi:** 1,5 minggu

---

#### 3.6 Custom Report Builder

- [ ] Pilih sumber data (modul): Sales, Purchasing, Inventory, HR, Finance
- [ ] Pilih field/kolom yang ingin ditampilkan
- [ ] Filter kondisi: nilai, tanggal range, status
- [ ] Group by: per customer, per produk, per departemen
- [ ] Simpan template report sebagai "Laporan Favorit"
- [ ] Export ke Excel/PDF

**Estimasi:** 1,5 minggu

---

#### 3.7 OEE Real-time dari Sensor

- [ ] MQTT subscriber (Mosquitto/EMQX): subscribe ke topic mesin
- [ ] Parse production count, downtime, cycle time dari sensor
- [ ] Hitung OEE real-time: Availability × Performance × Quality
- [ ] Alert OEE < threshold per mesin (configurable)
- [ ] TimescaleDB (PostgreSQL extension) untuk simpan data time-series

**Estimasi:** 2 minggu (tergantung ketersediaan sensor/PLC)

---

## Sprint Planning

### Sprint 1 (Minggu 1–2): Approval Workflow + RFQ

| Task | Estimasi | PIC |
|------|----------|-----|
| Desain DB approval_rules, approval_requests | 0.5 hari | Backend |
| API: create/approve/reject approval request | 2 hari | Backend |
| UI: halaman "Menunggu Persetujuan" di sidebar | 1 hari | Frontend |
| UI: inline approval button di SO/PO/Jurnal | 1 hari | Frontend |
| API + UI: RFQ create, send, compare offers | 3 hari | Full-stack |
| Auto-generate PO dari RFQ winner | 1 hari | Backend |
| **Testing & QA** | 1 hari | - |

---

### Sprint 2 (Minggu 3–4): Batch/Lot + PPh

| Task | Estimasi | PIC |
|------|----------|-----|
| DB: lot_numbers, lot_transactions | 0.5 hari | Backend |
| GRN: field lot number + expiry date | 1 hari | Full-stack |
| FIFO/FEFO picking logic | 1.5 hari | Backend |
| Lot trace report (genealogy) | 1 hari | Full-stack |
| PPh 21 calculation engine (PTKP 2024) | 2 hari | Backend |
| Integrasi PPh 21 → payroll run | 1 hari | Backend |
| Bukti Potong PPh 21 PDF | 1 hari | Backend |
| PPh 23 pemotongan saat payment vendor | 1 hari | Backend |
| **Testing & QA** | 1 hari | - |

---

### Sprint 3 (Minggu 5–6): GL + Financial Closing

| Task | Estimasi | PIC |
|------|----------|-----|
| General Ledger view per akun COA | 1.5 hari | Full-stack |
| Trial Balance dengan balance validation | 1 hari | Full-stack |
| Cash Flow Statement (metode tidak langsung) | 2 hari | Backend |
| Closing periode: lock jurnal + closing entry | 1.5 hari | Backend |
| UI closing workflow dengan konfirmasi | 1 hari | Frontend |
| Comparative report: bulan ini vs lalu | 1 hari | Full-stack |
| **Testing & QA** | 1 hari | - |

---

### Sprint 4 (Minggu 7–8): Sales Quotation + CRM

| Task | Estimasi | PIC |
|------|----------|-----|
| DB: sales_quotations, sq_items, crm_leads | 0.5 hari | Backend |
| API: CRUD quotation, convert → SO | 2 hari | Backend |
| UI: Tab Quotation di halaman Sales | 1.5 hari | Frontend |
| UI: Pipeline board CRM (Kanban view) | 2 hari | Frontend |
| Log aktivitas per lead/customer | 1 hari | Full-stack |
| Target vs realisasi salesperson | 1 hari | Full-stack |
| **Testing & QA** | 1 hari | - |

---

### Sprint 5 (Minggu 9–10): Notification + Audit Trail

| Task | Estimasi | PIC |
|------|----------|-----|
| DB: notifications, audit_logs | 0.5 hari | Backend |
| Backend middleware: auto-log semua CRUD | 2 hari | Backend |
| API: list notifications, mark as read | 1 hari | Backend |
| UI: notification bell enrichment | 1 hari | Frontend |
| Email SMTP service (approval, reminder) | 1.5 hari | Backend |
| UI: halaman Audit Log dengan filter | 1.5 hari | Frontend |
| Per-record diff view | 1 hari | Full-stack |
| **Testing & QA** | 0.5 hari | - |

---

## Definisi Selesai (Definition of Done)

Setiap fitur dianggap selesai jika memenuhi semua kriteria berikut:

1. **Fungsional**: Alur utama dan edge cases berjalan tanpa error
2. **Build passing**: `npx vite build` berhasil tanpa error/warning kritis
3. **UI konsisten**: Menggunakan komponen shared (DataTable, Modal, Badge, Button)
4. **Validasi input**: Form memiliki validasi client-side dan server-side
5. **Otorisasi**: Endpoint dilindungi JWT, cek company_id di semua query
6. **Audit trail**: Operasi CREATE/UPDATE/DELETE tercatat di `audit_logs`
7. **Responsive**: Tampil baik di desktop (1280px+) dan tablet (768px+)
8. **Tidak ada data dummy hardcoded**: Semua data dari API/DB, bukan mock statis

---

## Teknologi Tambahan yang Dibutuhkan

| Kebutuhan | Pilihan | Prioritas |
|---|---|---|
| Email SMTP | Mailgun / Brevo (Sendinblue) / Gmail SMTP | Sprint 5 |
| PDF generation | `chromedp` (Go headless Chrome) atau `go-pdf` | Sprint 2 (slip gaji) |
| WhatsApp | Fonnte API / WAHA (self-hosted) | Sprint 5 (opsional) |
| MQTT broker | Mosquitto (sudah di docker-compose?) | Sprint OEE |
| TimescaleDB | `CREATE EXTENSION timescaledb` di PostgreSQL | Sprint OEE |
| File storage | MinIO (sudah ada di docker-compose) | Sprint 5 (attachment) |

---

## Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| PPh 21 computation salah (PTKP/tarif berbeda per golongan) | Tinggi | Buat unit test untuk setiap golongan, bandingkan dengan kalkulator DJP |
| Batch/lot tracking: performa query slow jika volume lot besar | Menengah | Index pada `lot_number`, `item_id`, `expiry_date`; partition tabel jika perlu |
| Approval workflow deadlock (semua approver tidak aktif) | Menengah | Fitur delegasi approval + super-admin bypass dengan audit log |
| Coretax API DJP tidak stabil / berubah spesifikasi | Tinggi | Selalu sediakan fallback export CSV e-Faktur 3.2 manual |
| GL closing salah (debit ≠ kredit setelah closing) | Kritis | Validasi ketat: tolak closing jika trial balance tidak balance |

---

## Referensi

- Roadmap lengkap (Phase 10–35): [ERP_ROADMAP.md](./ERP_ROADMAP.md)
- Panduan setup & run lokal: [PANDUAN_RUN.md](./PANDUAN_RUN.md)
- Spesifikasi teknis implementasi: [DEVELOPMENT.md](./DEVELOPMENT.md)
- Demo login: `admin@sep.id` / `admin123`

---

*Dokumen ini diperbarui: 2026-06-30*  
*Target selesai Sprint 1–5: ± 10 minggu dari sekarang (~September 2026)*
