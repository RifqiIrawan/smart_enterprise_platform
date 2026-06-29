# Smart Enterprise Platform — Dokumentasi Pengembangan

> Versi dokumen: 1.0 | Terakhir diperbarui: 2026-06-27

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Tech Stack](#2-tech-stack)
3. [Struktur Proyek](#3-struktur-proyek)
4. [Cara Menjalankan](#4-cara-menjalankan)
5. [Arsitektur Sistem](#5-arsitektur-sistem)
6. [API Endpoints](#6-api-endpoints)
7. [Database Schema](#7-database-schema)
8. [Status Modul Saat Ini](#8-status-modul-saat-ini)
9. [Roadmap Pengembangan](#9-roadmap-pengembangan)
10. [Konvensi Kode](#10-konvensi-kode)
11. [Variabel Lingkungan](#11-variabel-lingkungan)

---

## 1. Gambaran Umum

**Smart Enterprise Platform (SEP)** adalah platform enterprise terpadu berbasis web yang dirancang untuk industri manufaktur. Platform ini menggabungkan fitur ERP inti dengan kemampuan Smart Factory, IoT, dan AI Assistant dalam satu sistem terintegrasi.

### Fitur Utama (Saat Ini)
- Autentikasi berbasis JWT + RBAC
- 12 modul: Factory, Warehouse, HRIS, Purchasing, Asset, Security, Vehicle, Network, Building, AI, Analytics, Dashboard
- Mode demo (berjalan tanpa database)
- AI Assistant terintegrasi Google Gemini

### Akun Demo
| Email | Password | Role |
|-------|----------|------|
| admin@sep.id | admin123 | superadmin |

---

## 2. Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Frontend | React + Vite | 18.x |
| UI Styling | Tailwind CSS | 3.x |
| State Management | Zustand | - |
| Chart Library | Recharts | - |
| HTTP Client | Axios | - |
| Backend | Golang + Gin | 1.21+ |
| Database | PostgreSQL | 15+ |
| Auth | JWT (HS256) | - |
| AI | Google Gemini API | - |
| Container | Docker + Docker Compose | - |
| Reverse Proxy | Nginx | - |

---

## 3. Struktur Proyek

```
Smart_Enterprise_Platform/
├── .env                          # Konfigurasi environment
├── docker-compose.yml            # Orkestrasi container
├── DEVELOPMENT.md                # Dokumen ini
│
├── backend/
│   ├── cmd/server/main.go        # Entry point server
│   ├── go.mod / go.sum
│   ├── Dockerfile
│   ├── sep-backend.exe           # Binary Windows
│   └── internal/
│       ├── config/config.go      # Load konfigurasi dari env
│       ├── database/db.go        # Koneksi PostgreSQL + auto migrate
│       ├── middleware/auth.go    # JWT middleware
│       ├── models/models.go      # Struct data (Go)
│       ├── routes/routes.go      # Definisi semua route API
│       └── handlers/
│           ├── auth.go           # Login, logout, me
│           ├── dashboard.go      # KPI, alerts, OEE realtime
│           ├── factory.go        # Work order
│           ├── warehouse.go      # Inventory, mutasi stok
│           ├── hris.go           # Karyawan
│           ├── asset.go          # Aset, jadwal maintenance
│           ├── purchasing.go     # PR, PO, vendor
│           ├── security.go       # Visitor, insiden
│           ├── vehicle.go        # Fleet, BBM
│           ├── network.go        # Device, traffic
│           ├── notification.go   # Notifikasi user
│           └── ai.go             # Chat AI (Gemini)
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── main.jsx              # Entry point React
        ├── App.jsx               # Router utama
        ├── index.css             # Global styles
        │
        ├── api/
        │   ├── client.js         # Axios instance + interceptor
        │   ├── auth.js           # Auth API calls
        │   └── index.js          # Export semua API per modul
        │
        ├── store/
        │   ├── authStore.js      # Zustand: user, token, login/logout
        │   └── uiStore.js        # Zustand: sidebar, theme, notif
        │
        ├── hooks/
        │   └── useApi.js         # Custom hook: useApi, useSubmit
        │
        ├── utils/
        │   ├── cn.js             # classnames utility
        │   └── format.js         # formatCurrency, formatDate, dll
        │
        ├── components/
        │   ├── layout/
        │   │   ├── AppLayout.jsx # Layout utama (sidebar + header)
        │   │   ├── Sidebar.jsx   # Navigasi sidebar
        │   │   └── Header.jsx    # Top bar + notifikasi
        │   └── ui/
        │       ├── Button.jsx
        │       ├── Card.jsx
        │       ├── Input.jsx
        │       ├── Select.jsx
        │       ├── Badge.jsx
        │       ├── Table.jsx
        │       ├── Modal.jsx
        │       ├── StatCard.jsx
        │       ├── SearchInput.jsx
        │       ├── LoadingTable.jsx
        │       └── EmptyState.jsx
        │
        └── pages/
            ├── auth/Login.jsx
            ├── dashboard/Dashboard.jsx
            ├── factory/SmartFactory.jsx
            ├── warehouse/SmartWarehouse.jsx
            ├── hris/SmartHRIS.jsx
            ├── purchasing/Purchasing.jsx
            ├── asset/AssetMaintenance.jsx
            ├── security/SmartSecurity.jsx
            ├── vehicle/SmartVehicle.jsx
            ├── network/NetworkNOC.jsx
            ├── building/SmartBuilding.jsx
            ├── building/SmartEnergy.jsx
            ├── analytics/Analytics.jsx
            ├── ai/AIAssistant.jsx
            └── settings/Settings.jsx
```

---

## 4. Cara Menjalankan

### Development (tanpa Docker)

**Backend:**
```bash
# Pastikan .env sudah dikonfigurasi
cd backend
go run ./cmd/server
# atau jalankan binary langsung:
.\sep-backend.exe
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- Health check: http://localhost:8080/health

### Production (Docker)

```bash
# Build dan jalankan semua service
docker-compose up -d

# Cek log
docker-compose logs -f

# Stop
docker-compose down
```

### Mode Demo

Backend dapat berjalan **tanpa database PostgreSQL**. Jika koneksi DB gagal, server otomatis menggunakan data statis (hardcoded). Ini berguna untuk demo/presentasi tanpa setup DB.

---

## 5. Arsitektur Sistem

```
Browser (React SPA)
        │
        │ HTTP / REST JSON
        ▼
  Backend (Gin API - :8080)
        │
        ├── JWT Middleware (semua route protected)
        │
        ├── Handlers per modul
        │       │
        │       ▼
        │   PostgreSQL (jika tersedia)
        │   └── Fallback: data statis
        │
        └── Google Gemini API (AI chat)
```

### Pola Autentikasi
1. Client POST `/api/v1/auth/login` → dapat JWT token
2. Token disimpan di `localStorage` via Zustand
3. Setiap request menyertakan header `Authorization: Bearer <token>`
4. Middleware backend memverifikasi token → inject `user_id`, `company_id`, `role` ke context Gin

### Pola Data di Frontend
Menggunakan custom hook `useApi` dan `useSubmit`:

```jsx
// Fetch data
const { data, loading, refetch } = useApi(hrisApi.getEmployees)

// Submit form
const { submit, loading: saving } = useSubmit(hrisApi.createEmployee, {
  successMsg: 'Berhasil disimpan',
  onSuccess: () => { setShowModal(false); refetch() },
})
```

---

## 6. API Endpoints

Base URL: `http://localhost:8080/api/v1`

### Public
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/auth/login` | Login, return JWT token |

### Auth (Protected)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/auth/me` | Info user yang login |
| POST | `/auth/logout` | Logout |

### Dashboard
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/dashboard/kpi` | KPI utama |
| GET | `/dashboard/alerts` | Alert aktif |
| GET | `/dashboard/oee` | Data OEE realtime |

### Factory
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/factory/workorders` | List work order |
| POST | `/factory/workorders` | Buat work order baru |

### Warehouse
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/warehouse/inventory` | List inventori |
| POST | `/warehouse/inventory` | Tambah item |
| PUT | `/warehouse/inventory/:id/qty` | Update quantity |
| GET | `/warehouse/movements` | Riwayat mutasi stok |
| POST | `/warehouse/movements` | Catat mutasi stok |

### HRIS
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/hris/employees` | List karyawan |
| POST | `/hris/employees` | Tambah karyawan |

### Asset
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/asset/assets` | List aset |
| POST | `/asset/assets` | Tambah aset |
| PUT | `/asset/assets/:id` | Update aset |
| GET | `/asset/maintenance` | Jadwal maintenance |
| POST | `/asset/maintenance` | Buat jadwal maintenance |
| PATCH | `/asset/maintenance/:id/status` | Update status maintenance |

### Purchasing
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/purchasing/pr` | List purchase request |
| POST | `/purchasing/pr` | Buat PR |
| PATCH | `/purchasing/pr/:id/status` | Approve/reject PR |
| GET | `/purchasing/po` | List purchase order |
| POST | `/purchasing/po` | Buat PO |
| GET | `/purchasing/vendors` | List vendor |
| POST | `/purchasing/vendors` | Tambah vendor |

### Security
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/security/visitors` | List tamu |
| POST | `/security/visitors` | Check-in tamu |
| PATCH | `/security/visitors/:id/checkout` | Check-out tamu |
| GET | `/security/incidents` | List insiden |
| POST | `/security/incidents` | Laporkan insiden |
| PATCH | `/security/incidents/:id/status` | Update status insiden |

### Vehicle
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/vehicle/fleet` | List armada |
| GET | `/vehicle/fuel` | Log BBM |
| POST | `/vehicle/fuel` | Catat pengisian BBM |

### Network
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/network/devices` | List perangkat jaringan |
| PATCH | `/network/devices/:id/toggle` | Enable/disable device |
| GET | `/network/traffic` | Data traffic jaringan |

### Notifikasi
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/notifications` | List notifikasi user |
| PATCH | `/notifications/:id/read` | Tandai sudah dibaca |
| DELETE | `/notifications/clear` | Hapus semua notifikasi |

### AI
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/ai/chat` | Kirim pesan ke AI (Gemini) |

---

## 7. Database Schema

### Tabel yang sudah ada (auto-migrate)

```sql
-- Perusahaan
companies (id, name, npwp, address, phone, email, created_at)

-- Pengguna + RBAC
users (id, company_id, name, email, password, role, permissions JSONB, is_active, last_login, created_at)

-- Audit trail (ada tabelnya, belum diimplementasi di handler)
audit_logs (id, user_id, action, entity, entity_id, description, ip_address, created_at)

-- Notifikasi
notifications (id, user_id, title, message, type, is_read, created_at)

-- Factory
work_orders (id, company_id, wo_number, product_name, target_qty, actual_qty, machine_id, status, eta, created_at, updated_at)

-- HRIS
employees (id, company_id, emp_number, name, email, department, position, salary, status, join_date, created_at)

-- Asset
assets (id, company_id, asset_number, name, category, location, value, condition, next_maintenance, created_at)
```

### Tabel yang belum ada (perlu dibuat)

```sql
-- Warehouse
inventory (id, company_id, sku, name, location, quantity, unit, min_stock, status, created_at)
stock_movements (id, company_id, item_id, type, quantity, unit, from_to, notes, created_by, created_at)

-- HRIS Lanjutan
attendance (id, employee_id, date, check_in, check_out, status, notes)
leave_requests (id, employee_id, type, start_date, end_date, reason, status, approved_by)
payroll (id, company_id, employee_id, period, basic_salary, allowances, deductions, net_salary, status, created_at)

-- Factory Lanjutan
bom (id, company_id, product_name, material_id, quantity, unit)
machines (id, company_id, machine_code, name, status, oee, location)
downtime_logs (id, machine_id, wo_id, start_time, end_time, reason, category)

-- Asset Lanjutan
maintenance_schedules (id, asset_id, type, scheduled_date, technician, status, notes, completed_at)

-- Purchasing Lanjutan
purchase_requests (id, company_id, pr_number, requester, department, item_name, qty, unit, estimated_price, status, notes, created_at)
purchase_orders (id, company_id, po_number, vendor_id, item_name, qty, unit, unit_price, total, delivery_date, status, created_at)
vendors (id, company_id, name, category, email, phone, address, rating, created_at)
goods_receipts (id, po_id, received_qty, received_date, condition, notes, received_by)

-- Security
visitors (id, company_id, name, company, purpose, host, check_in, check_out, id_number, created_at)
incidents (id, company_id, type, location, description, severity, status, reported_by, resolved_at, created_at)

-- Vehicle
fleet (id, company_id, plate_number, type, brand, model, status, driver, mileage)
fuel_logs (id, vehicle_id, date, volume, cost, mileage, station, filled_by)

-- Network
network_devices (id, company_id, name, type, ip_address, status, location, uptime)

-- Accounting (belum ada sama sekali)
chart_of_accounts (id, company_id, code, name, type, parent_id)
journal_entries (id, company_id, date, description, ref_type, ref_id, created_by, created_at)
journal_lines (id, journal_id, account_id, debit, credit, description)
```

---

## 8. Status Modul Saat Ini

### Legenda
- **DONE** — Fungsional penuh
- **PARTIAL** — UI ada, logika bisnis sebagian
- **STUB** — UI ada, data statis / belum ada logika
- **MISSING** — Belum dibangun sama sekali

| Modul | Frontend | Backend | Integrasi DB | Keterangan |
|-------|----------|---------|--------------|------------|
| Auth + RBAC | DONE | DONE | DONE | Login/logout berfungsi, JWT aktif |
| Dashboard | PARTIAL | PARTIAL | STUB | KPI dari DB ada, chart hardcoded |
| Smart Factory | PARTIAL | PARTIAL | PARTIAL | Work Order CRUD ada; mesin, BOM, QC belum |
| Smart Warehouse | PARTIAL | PARTIAL | PARTIAL | Inventory + mutasi ada; barcode, FIFO belum |
| HRIS | PARTIAL | PARTIAL | PARTIAL | List + tambah karyawan; payroll, absensi, cuti belum |
| Purchasing | PARTIAL | PARTIAL | PARTIAL | PR/PO/Vendor CRUD ada; approval workflow, GRN belum |
| Asset & Maintenance | PARTIAL | PARTIAL | PARTIAL | CRUD aset + jadwal ada; depreciation, WO maintenance belum |
| Smart Security | PARTIAL | PARTIAL | STUB | Visitor + insiden ada; integrasi CCTV belum |
| Smart Vehicle | PARTIAL | PARTIAL | STUB | Fleet + BBM ada; GPS tracking belum |
| Network NOC | STUB | STUB | STUB | UI ada, data dummy semua |
| Smart Building | STUB | MISSING | MISSING | UI ada, tidak ada handler backend |
| Analytics | STUB | STUB | STUB | Semua chart hardcoded |
| AI Assistant | DONE | DONE | N/A | Berfungsi dengan Gemini API |
| Accounting | MISSING | MISSING | MISSING | Belum dibangun sama sekali |

---

## 9. Roadmap Pengembangan

### Tahap 1 — Fondasi & Stabilisasi (Prioritas Tinggi) ✅ SELESAI
*Target: Semua modul yang ada benar-benar terhubung ke database*

- [x] **DB-01** Verifikasi koneksi PostgreSQL di semua environment
- [x] **DB-02** Buat migration SQL lengkap untuk semua tabel yang belum ada (25 tabel ditambahkan)
- [x] **DB-03** Implementasi audit trail `WriteAuditLog()` — aktif di CREATE/UPDATE/DELETE semua modul
- [x] **DB-04** Fungsikan tabel `inventory`, `stock_movements`, `purchase_requests`, `purchase_orders`, `vendors` di backend
- [x] **FE-01** Tambah fitur Edit & Hapus di semua modul (HRIS, Warehouse, Asset, Purchasing)

---

### Tahap 2 — HRIS Lengkap ✅ SELESAI (sebagian)
*Target: Modul HRIS siap produksi*

- [x] **HRIS-01** Absensi: endpoint GET/POST/PATCH + halaman rekap harian
- [x] **HRIS-02** Cuti & Izin: pengajuan, approval (approve/reject) per karyawan
- [x] **HRIS-03** Payroll engine: kalkulasi gaji + tunjangan 20% + potongan 5% + BPJS; auto-generate per periode
- [ ] **HRIS-04** PPh 21: kalkulasi otomatis berdasarkan penghasilan tahunan
- [ ] **HRIS-05** Slip gaji: generate PDF per karyawan per periode
- [ ] **HRIS-06** Organigram: tampilan struktur jabatan per departemen
- [x] **HRIS-07** API endpoint: PUT/DELETE `/hris/employees/:id`

---

### Tahap 3 — Purchasing Workflow ✅ SELESAI (sebagian)
*Target: Alur pengadaan end-to-end*

- [x] **PUR-01** Approval workflow: PR → approve/reject dengan tombol per baris
- [x] **PUR-02** Konversi PR yang disetujui menjadi PO secara otomatis (modal Convert ke PO)
- [x] **PUR-03** GRN (Goods Receipt Note): pencatatan penerimaan barang dari PO (tab GRN + modal)
- [x] **PUR-04** GRN → update stok Warehouse secara otomatis (auto dalam CreateGRN backend)
- [x] **PUR-05** Evaluasi vendor: field rating pada vendor CRUD
- [x] **PUR-06** Edit/hapus PO dan vendor
- [ ] **PUR-07** Notifikasi email saat PR di-approve/reject

---

### Tahap 4 — Warehouse Real ✅ SELESAI (sebagian)
*Target: Manajemen stok yang akurat*

- [ ] **WH-01** Barcode scan: integrasi dengan kamera browser (QuaggaJS / ZXing)
- [x] **WH-02** Reorder point: alert otomatis saat stok di bawah minimum (tab "Reorder Alert" + endpoint GET /warehouse/alerts)
- [x] **WH-03** Transfer stok antar lokasi/gudang (modal Transfer + endpoint POST /warehouse/transfer)
- [x] **WH-04** Stock opname: proses hitung fisik vs sistem (tab "Stock Opname" + modal input + POST /warehouse/opname)
- [x] **WH-05** Integrasi PO → Warehouse (barang masuk dari GRN — auto-update inventory di CreateGRN)
- [x] **WH-06** Integrasi Work Order → Warehouse (PATCH /factory/workorders/:id/qty update actual qty)
- [x] **WH-07** Edit/hapus item inventori

---

### Tahap 5 — Smart Factory Lengkap ✅ SELESAI (sebagian)
*Target: Produksi terkelola dengan data real*

- [x] **FAC-01** Master mesin: CRUD mesin dengan status real (tab Mesin, GET/POST/PUT /factory/machines)
- [x] **FAC-02** BOM (Bill of Materials): komposisi bahan per produk (tab BOM, GET/POST /factory/bom)
- [ ] **FAC-03** Routing: urutan proses produksi per work order
- [x] **FAC-04** Update actual qty work order (PATCH /factory/workorders/:id/qty + modal "Update Qty")
- [x] **FAC-05** Pencatatan downtime: penyebab, kategori, durasi (tab Downtime, GET/POST /factory/downtime)
- [ ] **FAC-06** Quality Control: inspeksi hasil produksi (pass/fail/rework)
- [ ] **FAC-07** OEE dari data real (availability × performance × quality)

---

### Tahap 6 — Accounting (Modul Baru) ✅ SELESAI (sebagian)
*Target: Laporan keuangan terintegrasi*

- [x] **ACC-01** Chart of Accounts (COA): master akun keuangan (GET/POST /accounting/coa + tab COA)
- [x] **ACC-02** Jurnal umum: entry manual dengan baris debit/kredit (GET/POST /accounting/journal + modal balance check)
- [ ] **ACC-03** Auto-posting: PO approved → hutang, GRN → persediaan, payroll → beban gaji
- [x] **ACC-04** Laporan Laba Rugi (GET /accounting/pl + tampilan di tab Laporan)
- [x] **ACC-05** Neraca (Balance Sheet) (GET /accounting/balance-sheet + tampilan di tab Laporan)
- [ ] **ACC-06** Laporan Arus Kas
- [ ] **ACC-07** Budget vs Actual per departemen
- [ ] **ACC-08** Faktur PPN dan rekapitulasi pajak

---

### Tahap 7 — Analytics Real ✅ SELESAI (sebagian)
*Target: Dashboard berbasis data nyata dari database*

- [x] **ANL-01** Agregasi KPI dari DB — GET /analytics/summary; DashboardKPI query real counts dari DB
- [x] **ANL-02** Filter periode aktif — period param: today/week/month/year; trends data menyesuaikan
- [x] **ANL-03** Dashboard berbeda per role — GET /analytics/role-dashboard; tab Executive/Operasional/HRIS/Modul
- [x] **ANL-04** Export laporan — Excel via SheetJS (dynamic import), PDF via jsPDF (dynamic import, lazy chunk)
- [ ] **ANL-05** Scheduled report: kirim laporan otomatis via email

---

### Tahap 8 — Smart/IoT Modules ✅ SELESAI (sebagian)
*Target: Koneksi ke sistem fisik*

- [x] **IOT-01** WebSocket server (`/ws`) via gorilla/websocket; push OEE + sensor tiap 2s; frontend hook `useWebSocket` + auto-reconnect
- [x] **IOT-02** Network NOC Live Poll (`/iot/network/poll`, refresh 5s, tab "Live Poll"); CPU/BW/latency/packet loss per device
- [x] **IOT-03** Smart Building: `/iot/building/sensors` — suhu, humidity, CO₂, energy per zona; WebSocket sensor overlay
- [x] **IOT-04** GPS Fleet Tracking: `/iot/gps` — lat/lng/speed/fuel per kendaraan (simulated)
- [ ] **IOT-05** Smart Security: integrasi API access control / CCTV

---

### Tahap 9 — Enterprise Features ✅ SELESAI (sebagian)
*Target: Siap multi-tenant dan skala besar*

- [ ] **ENT-01** Multi-company / multi-tenant (company_id sudah ada di semua tabel, UI belum)
- [x] **ENT-02** Role-based access granular — `RoleRequired()` middleware; Accounting route group hanya untuk superadmin/admin/finance
- [ ] **ENT-03** Single Sign-On (SSO) / OAuth2
- [x] **ENT-04** Rate limiting — Token-bucket rate limiter (60 req/mnt global, 10 req/mnt untuk login); middleware `RateLimit()` + `AuthRateLimit()`
- [ ] **ENT-05** Backup database terjadwal
- [x] **ENT-06** Full-text search cross-modul — `GET /search?q=xxx` backend (ILIKE + demo fallback); GlobalSearchBox di Header dengan debounce 300ms + dropdown bernavigasi ke modul
- [x] **ENT-07** Aplikasi mobile (PWA) — `vite-plugin-pwa` + manifest.json + workbox service worker (NetworkFirst untuk API, precache semua assets)

---

## 10. Konvensi Kode

### Backend (Go)

```go
// Handler selalu cek database.DB == nil untuk graceful fallback
func GetSomething(c *gin.Context) {
    if database.DB == nil {
        c.JSON(http.StatusOK, gin.H{"success": true, "data": staticData})
        return
    }
    // logika DB real di sini
}

// Selalu gunakan company_id dari context (bukan dari request body)
companyID := c.GetString("company_id")
```

**Struktur response standar:**
```json
{
  "success": true,
  "data": [...],
  "total": 10,
  "message": "optional"
}
```

### Frontend (React)

```jsx
// Gunakan custom hook useApi untuk fetch, useSubmit untuk mutasi
const { data, loading, refetch } = useApi(someApi.getList)
const { submit, loading: saving } = useSubmit(someApi.create, {
  successMsg: 'Berhasil disimpan',
  onSuccess: () => { setShowModal(false); refetch() },
})

// Selalu handle array kosong dengan fallback
const items = Array.isArray(data) ? data : []
```

**Naming konvensi:**
- File komponen: `PascalCase.jsx`
- File utility: `camelCase.js`
- Handler Go: `VerbNoun` (contoh: `GetEmployees`, `CreateWorkOrder`)
- Route API: `kebab-case` (contoh: `/hris/employees`, `/factory/workorders`)

### Penambahan Modul Baru

1. Buat handler di `backend/internal/handlers/<modul>.go`
2. Daftarkan route di `backend/internal/routes/routes.go`
3. Tambah model jika perlu di `backend/internal/models/models.go`
4. Tambah fungsi API di `frontend/src/api/index.js`
5. Buat halaman di `frontend/src/pages/<modul>/`
6. Daftarkan route di `frontend/src/App.jsx`
7. Tambah menu di `frontend/src/components/layout/Sidebar.jsx`

---

## 11. Variabel Lingkungan

File `.env` di root proyek:

```env
# Server
SERVER_PORT=8080
JWT_SECRET=your-secret-key-here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_NAME=sep_db

# AI
GEMINI_API_KEY=your-gemini-api-key

# Frontend (Vite)
VITE_API_URL=http://localhost:8080/api/v1
```

> Jika `DB_HOST` tidak dapat dijangkau, backend otomatis berjalan dalam mode demo dengan data statis. Tidak ada crash, hanya log peringatan.

---

## Catatan Penting

1. **Semua handler backend harus selalu punya fallback `database.DB == nil`** agar mode demo tetap berjalan.
2. **Jangan hardcode `company_id`** — selalu ambil dari JWT context (`c.GetString("company_id")`).
3. **Data statis di frontend** (chart, mesin, dsb.) harus diganti secara bertahap dengan data dari API saat modul sudah matang.
4. **Audit trail** wajib diimplementasi sebelum naik ke production — gunakan tabel `audit_logs` yang sudah ada skemanya.
5. **Integrasi antar modul** (PO→Warehouse, WO→Stok, Payroll→Accounting) adalah kunci menjadi ERP sesungguhnya, dan harus dikerjakan di Tahap 3–6.
