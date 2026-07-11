# Sistem Navigasi Submenu & Izin Granular (Permission System)

> Dibangun mulai 2026-07-05. Dokumen ini menjelaskan arsitektur sistem navigasi tab→submenu dan izin akses granular (View/Add/Edit) yang sedang digulirkan bertahap ke seluruh modul aplikasi.

---

## Latar Belakang

Sebelumnya, setiap modul (Purchasing, Sales, dst) menampilkan beberapa sub-halaman sebagai **tab di dalam satu halaman** (mis. Purchasing punya tab PR/PO/RFQ/GRN/Vendor semua dalam satu route `/purchasing`). Sistem izin akses (RBAC) hanya bekerja di level modul dengan 2 tingkat: `view` dan `manage`.

Kebutuhan baru:
1. Setiap tab dipisah jadi **submenu sendiri di sidebar**, masing-masing dengan URL sendiri.
2. Admin bisa mengatur izin akses **per submenu** (bukan cuma per modul), dengan pilihan **None / View / Add / Edit**.
3. **Delete tidak pernah bisa diberikan ke role manapun** — hanya Super Admin yang bisa menghapus data, ini hardcoded dan tidak muncul sebagai opsi yang bisa di-assign.
4. Enforcement dilakukan di **frontend (sembunyikan tombol) DAN backend (validasi API)** — bukan hanya kosmetik di UI.

**UPDATE (2026-07-05, Phase 60)**: Sistem lama (module-level `view`/`manage`, hardcoded di `defaultRolePermissions`/`ROLE_PERMISSIONS`) sudah **dihapus total**, bukan lagi "dipertahankan berdampingan" seperti rencana awal. Alasannya: sistem lama ternyata 100% hardcoded, tidak pernah baca/tulis ke database sama sekali — bahkan tombol Simpan-nya (`UpdateRolePermissions`) diam-diam tidak menulis apapun ke DB saat DB tersambung (fake success). `RequirePermission` di `App.jsx` (module-level route guard) sekarang membaca `hasPermission()` yang sudah di-rewrite jadi **rollup generik atas `menuPermissions`** (data yg sama dgn `canDo()`, sumbernya tabel `role_menu_permissions`) — bukan map hardcoded lagi. Lihat bagian "Phase 60" di bawah utk detail lengkap.

**UPDATE (2026-07-05, Phase 61)**: Dua penyempurnaan lanjutan atas permintaan user (masih dgn prinsip "jangan hardcode"):
1. **`delete` sekarang jadi tier ke-5 yang bisa di-assign** (`none < view < add < edit < delete`), lewat tabel `role_menu_permissions` yang sama — bukan lagi hardcoded superadmin-only via `DeleteRequiresSuperadmin()` (middleware itu sudah dihapus, tidak dipakai lagi di manapun).
2. **Per-user permission override** — tabel baru `user_menu_permissions(user_id, menu_key, level)`, kosong secara default. Kalau ada baris utk kombinasi user+menu_key tertentu, nilainya MENGGANTIKAN tier role (bisa lebih longgar ATAU lebih ketat dari role), lewat `GetEffectiveMenuLevel`/`HasEffectiveMenuLevel`. Kalau tidak ada baris → otomatis ikut tier role seperti biasa (`GetMenuLevel`/`HasMenuLevel`, TIDAK diubah).

Lihat bagian "Phase 61" di bawah utk detail lengkap.

**UPDATE (2026-07-05, Phase 69)**: **Multi-company support** — sebelumnya `role_menu_permissions`/`user_menu_permissions` global lintas company (satu tier role berlaku sama di company manapun). Sekarang kedua tabel py kolom `company_id` — role/user yg sama BISA punya tier berbeda di company berbeda. User bisa py akses ke lebih dari satu company (tabel baru `user_companies`, tambahan di atas `users.company_id` yg tetap jadi "company utama/rumah") dan bisa **switch company** (re-issue JWT session-scoped, bukan permanen). Lihat bagian "Phase 69" di bawah utk detail lengkap.

**UPDATE (2026-07-05, Phase 71)**: **Filter perusahaan GLOBAL** — satu middleware `CompanyFilter()` + satu dropdown di header + satu axios interceptor bikin SEMUA ~27 modul (bukan cuma Settings > Role & Permission dari Phase 70) bisa di-"browse as"/ditulis sbg company lain via `?company_id=`, tanpa switch session, berlaku utk read MAUPUN write. Zero perubahan ke handler/halaman individual. Lihat bagian "Phase 71" di bawah utk detail lengkap.

**UPDATE (2026-07-06, Phase 73)**: Fix bug kontras teks putih-di-atas-terang di `StatCard` (component shared, truncate+tooltip utk nilai panjang) dan di Cost Accounting's KPI card manual. Sekalian modul Cost Accounting py sisa TAB IN-PAGE terakhir (4 sub-report di "Laporan & Analisis") dipecah jadi submenu sidebar asli (`cost.cogs`, `cost.profitability`, `cost.centerreport` — 3 menu_key baru), menyelesaikan Cost Accounting sepenuhnya ke pola tab→submenu. Lihat bagian "Phase 73" di bawah utk detail lengkap.

**UPDATE (2026-07-06, Phase 72)**: **Master matrix User × Perusahaan** — tab baru `/settings/company-access` (menu_key `settings.company_access`) menampilkan SEMUA user × SEMUA company yg visible ke requester dalam satu tabel (checkbox), bukan modal satu-user-satu-waktu spt "Akses Perusahaan" di tab Users. Endpoint baru `GET /rbac/company-access-matrix` (read-only, satu request, dibangun dari access-rule yg sama dgn `GetCompanies`). Sekalian mengetatkan `GetUserCompanies`/`UpdateUserCompanies` — sebelumnya TIDAK ada pengecekan apakah requester (non-superadmin) beneran punya hubungan visibilitas ke target user/company (gap lama, jadi lebih kentara begitu ada UI matrix yg gampang dipakai), sekarang keduanya divalidasi lewat subquery `accessible_companies` yg sama. Lihat bagian "Phase 72" di bawah utk detail lengkap.

---

## Modul yang Sudah Dikonversi

| Modul | Submenu | Status |
|---|---|---|
| Purchasing | Purchase Request, Purchase Order, RFQ/Tender, GRN, Vendor | ✅ Selesai |
| Sales | Sales Order, Delivery, Invoice, Quotation, Retur, CRM, Customer | ✅ Selesai |
| Finance AP/AR | Bank & Kas, Hutang (AP), Piutang (AR), Aging AP, Aging AR, Rekonsiliasi, Petty Cash | ✅ Selesai |
| Smart HRIS | HR Dashboard, Karyawan, Absensi, Cuti & Izin, Payroll, Slip Gaji, Rekrutmen, Training, KPI, Shift & Lembur, Organigram | ✅ Selesai |
| Smart Factory | Overview, Work Order, Mesin, BOM, Downtime, Work Center, Routing, OEE Real, Scrap/Rework, Kapasitas, Laporan | ✅ Selesai |
| Smart Warehouse | Inventori, Mutasi, Reorder Alert, Stock Opname | ✅ Selesai |
| Accounting | Laporan, Jurnal, COA, Buku Besar, Neraca Saldo, Arus Kas, Closing, Perbandingan | ✅ Selesai |
| Tax & Pajak | PPN, PPh 21, PPh 23, BPJS, NSFP, e-Faktur, SPT PPN, Konfigurasi | ✅ Selesai |
| Quality (QMS) | Inspeksi QC, NCR, CAPA, Kalibrasi | ✅ Selesai |
| Budget & Planning | Master Anggaran, Budget vs Aktual, Peringatan, Forecast, Skenario | ✅ Selesai |
| MRP & Produksi | MRP Engine, Jadwal Produksi, Routing, Lot Tracking | ✅ Selesai |
| Cost Accounting | Cost Center, Biaya WO, Standard Cost, Laporan & Analisis | ✅ Selesai |
| Asset & CMMS | Daftar Aset, Jadwal Maintenance, PM Schedule, Spare Parts, Depresiasi & Disposal | ✅ Selesai |
| Smart Vehicle | Armada, Log BBM | ✅ Selesai |
| Analytics | Executive, Operasional, HRIS, Kesehatan Modul, Perbandingan, Demand Forecast, Predictive Maint., Anomali, Rekomendasi Harga, Custom Report | ✅ Selesai |
| Settings | Perusahaan, Users, Role & Permission, Akses Log, Mata Uang, Notifikasi, 2FA, Sessions, Audit Trail, Kebijakan | ✅ Selesai |
| Network NOC | Perangkat, Traffic, Live Poll (IOT-02) | ✅ Selesai |
| Smart Building | Overview, HVAC, Energi | ✅ Selesai |
| Smart Security | Tamu, Insiden, Akses Pintu | ✅ Selesai |
| Smart Energy | — | ⛔ N/A — halaman datar tanpa tab, 100% data statis/mock, tidak ada aksi create/edit/delete (bukan kandidat pola ini) |
| Marketplace | Ringkasan, Channel, Pesanan, Listing Produk | ✅ Selesai |
| IoT Hub | Live Monitor, Perangkat, Alert Rules, Riwayat Alert | ✅ Selesai |
| Approval Center | Menunggu Persetujuan, Riwayat, Konfigurasi Rule | ✅ Selesai |
| Executive Dashboard | Overview, Management Report, Target KPI | ✅ Selesai |
| Integration | Import Data, Export Data, API Keys, Webhooks | ✅ Selesai |
| Supply Chain | Peta Rantai Pasok, Traceability, Supplier Scorecard, Risk Dashboard | ✅ Selesai |
| Customer Portal | Dashboard, Pesanan Saya, Invoice, Pengiriman | ✅ Selesai |
| Vendor Portal | Dashboard, Purchase Order, Invoice Saya, Pembayaran | ✅ Selesai |
| Print Center | — | ⛔ N/A — halaman datar dgn filter client-side saja, 100% data statis/mock, tidak ada satupun panggilan API backend (mirip kasus Smart Energy). **Dikonfirmasi eksplisit ke user 2026-07-05 (AskUserQuestion, Phase 68)** → user pilih "Skip permanently" |

---

## Arsitektur

### 1. Level Izin (Tier)

Setiap kombinasi **role × menu key** punya satu nilai tier:

| Tier | Arti |
|---|---|
| `none` | Tidak ada akses sama sekali (menu disembunyikan) |
| `view` | Hanya bisa melihat data |
| `add` | Bisa melihat + menambah data baru |
| `edit` | Bisa melihat + menambah + mengubah data |
| `delete` | Bisa melihat + menambah + mengubah + menghapus data |

Tier bersifat **kumulatif** (`edit` otomatis mencakup `add` dan `view`; `delete` mencakup semuanya). **Sejak Phase 61, `delete` adalah tier ke-5 yang bisa di-assign lewat tabel yang sama** — bukan lagi hardcoded superadmin-only. Superadmin tetap selalu punya semua tier (`edit`/`delete` short-circuit `true`) apa pun isi tabelnya.

### 2. Menu Key

Setiap submenu punya identifier unik berformat `<modul>.<submenu>`, misalnya:
- `purchasing.pr`, `purchasing.rfq`
- `sales.so`, `sales.crm`
- `finance.bank`, `finance.petty-cash`
- `hris.employee`, `hris.orgchart`

### 3. Backend

**Database** — tabel `role_menu_permissions` (didefinisikan di `backend/internal/database/db.go`, BUKAN di `backend/migrations/*.sql` yang legacy/tidak dipakai):
```sql
CREATE TABLE role_menu_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    menu_key VARCHAR(100) NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'view',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, menu_key)
)
```
Setiap kali modul baru dikonversi, seed default untuk menu key modul tersebut ditambahkan sebagai `INSERT ... ON CONFLICT DO NOTHING` di `db.go` (idempotent — hanya seed sekali, edit lewat UI tidak akan tertimpa ulang saat restart server).

**Tabel `user_menu_permissions`** (Phase 61, juga di `db.go`) — override per-user, di atas tier role:
```sql
CREATE TABLE user_menu_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    menu_key VARCHAR(100) NOT NULL,
    level VARCHAR(20) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, menu_key)
)
```
Kosong secara default (tidak ada seed) — kalau tidak ada baris utk suatu user+menu_key, otomatis ikut tier role seperti biasa.

**Package `backend/internal/permission/`** (`permission.go`) — logic inti, dipisah jadi package sendiri supaya tidak circular-import antara `handlers` dan `middleware`:
- `GetMenuLevel(role, menuKey string) string` — ambil tier role untuk suatu menu key. Superadmin selalu `"edit"`. Mode demo (tanpa DB) pakai `demoDefaults` (map bertingkat `role → module → level`, PENTING: bertingkat per modul karena satu role bisa punya tier berbeda per modul). **Tidak diubah di Phase 61** — tetap murni role-only, dipakai apa adanya oleh Settings admin matrix (role-level).
- `HasMenuLevel(role, menuKey, minLevel string) bool` — cek apakah tier role ≥ tier minimum yang dibutuhkan. Juga tidak diubah.
- `GetEffectiveMenuLevel(userID, role, menuKey string) string` (Phase 61) — versi yang memperhitungkan override per-user: cek dulu baris di `user_menu_permissions` utk `(userID, menuKey)`, kalau ada pakai itu, kalau tidak fallback ke `GetMenuLevel(role, menuKey)`. Superadmin tetap selalu `"edit"` (tidak pernah tunduk ke override).
- `HasEffectiveMenuLevel(userID, role, menuKey, minLevel string) bool` (Phase 61) — versi effective dari `HasMenuLevel`, dipakai middleware.

**Middleware `backend/internal/middleware/permission.go`**:
- `MenuPermission(menuKey, minLevel string) gin.HandlerFunc` — gate satu route di belakang tier tertentu. **Sejak Phase 61**, membaca `user_id` dari context (`c.GetString("user_id")`, sudah di-set `AuthMiddleware` dari JWT claims) dan memanggil `HasEffectiveMenuLevel` — jadi override per-user otomatis berlaku di SEMUA ~150 titik `mp(...)` yang sudah ada tanpa perlu diubah satu-satu.
- ~~`DeleteRequiresSuperadmin()`~~ — **dihapus di Phase 61** (tidak dipakai lagi; delete sekarang lewat `mp(menuKey, "delete")` seperti tier lainnya).

Dipakai di `routes.go` seperti ini (shorthand `mp` dideklarasikan sekali di paling atas blok `protected { ... }`, dipakai di semua modul termasuk delete):
```go
protected.GET("/purchasing/pr", mp("purchasing.pr", "view"), handlers.GetPurchaseRequests)
protected.POST("/purchasing/pr", mp("purchasing.pr", "add"), handlers.CreatePurchaseRequest)
protected.PATCH("/purchasing/pr/:id/status", mp("purchasing.pr", "edit"), handlers.UpdatePRStatus)
protected.DELETE("/purchasing/pr/:id", mp("purchasing.pr", "delete"), handlers.DeletePurchaseRequest)
```

**Handler `backend/internal/handlers/menu_permissions.go`**:
- `moduleMenuKeys map[string][]string` — registry semua menu key per modul yang sudah dikonversi. **Tambah modul baru di sini.**
- `GetMenuPermissions(c)` — `GET /rbac/menu-permissions`:
  - `?role=xxx` → semua menu key (lintas modul) untuk role tsb (dipakai frontend saat login)
  - `?role=xxx&user_id=zzz` (Phase 61) → sama, tapi diresolve lewat `GetEffectiveMenuLevel` (override per-user menang kalau ada) — ini yang dipanggil `authStore.loadMenuPermissions()`
  - `?role=xxx&module=yyy` → menu key satu modul saja untuk role tsb
  - `?module=yyy` (tanpa role) → matrix semua role untuk satu modul (dipakai Settings admin UI, tetap role-only, tidak terpengaruh override)
- `UpdateMenuPermissions(c)` — `POST /rbac/menu-permissions`, upsert ke `role_menu_permissions`, dibatasi role `superadmin`/`admin` lewat `middleware.RoleRequired`.
- `GetUserMenuPermissions(c)` (Phase 61) — `GET /rbac/users/:id/menu-permissions`, balikin `{ role, role_defaults, overrides }` utk satu user — dipakai modal "Izin Khusus" di Settings.
- `UpdateUserMenuPermissions(c)` (Phase 61) — `POST /rbac/users/:id/menu-permissions`, upsert ke `user_menu_permissions`; nilai `"inherit"` pada suatu key MENGHAPUS baris override-nya (balik ikut role).

### 4. Frontend

**`frontend/src/store/authStore.js`** — tambahan state & action (tidak mengubah `hasPermission` lama):
- `menuPermissions` — cache hasil fetch, bentuk `{ "modul.submenu": "view"|"add"|"edit"|"delete"|"none" }`
- `loadMenuPermissions()` — fetch sekali saat `AppLayout` mount. **Sejak Phase 61**, ikut kirim `user_id: user.id` di params — supaya hasilnya sudah effective (memperhitungkan override per-user), bukan cuma tier role mentah.
- `getMenuLevel(menuKey)` — ambil tier
- `canDo(menuKey, action)` — `true`/`false`, dipakai untuk gating tombol. `action` bisa `'delete'` sejak Phase 61.
- `isSuperAdmin()` — TIDAK LAGI dipakai utk gating tombol Delete (Phase 61) — semua 21 titik `canDelete = isSuperAdmin()` di 13 halaman modul sudah diganti `canDelete = canDo(menuKey, 'delete')`, superadmin tetap selalu lolos krn `canDo` short-circuit `true` utk role itu.

**`frontend/src/components/layout/Sidebar.jsx`** — nav item modul yang sudah dikonversi punya properti `children: [{ path, label, menuKey }]`. Item induk otomatis expand/collapse (klik toggle, chevron animasi, auto-expand kalau route aktif ada di dalam salah satu child). Child difilter pakai `canDo(child.menuKey, 'view')` — kalau semua child ke-filter, parent ikut disembunyikan.

**Halaman modul (mis. `Purchasing.jsx`)**:
- `activeTab` **tidak lagi local state**, tapi diturunkan dari `useParams().tab` (route `/purchasing/:tab?`), dengan redirect ke tab default kalau param kosong/tidak valid.
- Komponen `<Tabs>` internal **dihapus** — navigasi sepenuhnya lewat sidebar.
- `menuKey = \`purchasing.${activeTab}\``, lalu `canAdd`/`canEdit`/`canDelete` dihitung sekali di awal komponen dan dipakai untuk membungkus tombol Tambah/Edit/Hapus:
  ```jsx
  {canAdd && <Button onClick={...}>Tambah</Button>}
  {canEdit && <button onClick={...}>Edit</button>}
  {canDelete && <button onClick={...}>Hapus</button>}
  ```
- Kalau ada sub-komponen terpisah di file yang sama (mis. `TabCRM`, `TabRecon`), masing-masing manggil `useAuthStore()` sendiri dengan menu key tetap (bukan dari `activeTab` parent), karena mereka bisa dipakai lepas dari konteks tab aktif.

**`frontend/src/pages/settings/Settings.jsx`** — komponen reusable `MenuPermissionCard({ module, title, menuKeys, selectedRole, isSystem })` menampilkan tabel submenu × dropdown level akses (None/View/Add/Edit/Delete sejak Phase 61), dengan tombol Simpan sendiri per modul. Setiap modul yang dikonversi dapat satu card:
```jsx
<MenuPermissionCard module="purchasing" title="Purchasing" menuKeys={PURCHASING_MENU_KEYS} selectedRole={selectedRole} isSystem={isSystem} />
```

**Modal "Izin Khusus" per-user (Phase 61)** — di `TabUsers`, tombol baru di baris tabel user (disembunyikan utk `role === 'superadmin'`) membuka modal yang menampilkan SEMUA menu key (dikelompokkan per modul lewat konstanta `MENU_GROUPS`), masing-masing dgn badge read-only "Default: <tier role>" plus dropdown override (`USER_OVERRIDE_OPTIONS` = `Ikuti Role` + 5 tier biasa). Simpan lewat `rbacApi.updateUserMenuPermissions(userId, permissions)`. Pilih "Ikuti Role" utk key manapun = hapus override key itu (balik ikut tier role).

---

## Cara Menambah Modul Baru ke Pola Ini

Checklist lengkap, urutan disarankan:

1. **Backend — registry & seed**
   - Tambah entry di `moduleMenuKeys` (`backend/internal/handlers/menu_permissions.go`)
   - Tambah entry per-role di `demoDefaults` (`backend/internal/permission/permission.go`) — WAJIB per modul, karena map-nya bertingkat `role → module → level`
   - Tambah query `INSERT INTO role_menu_permissions ... ON CONFLICT DO NOTHING` di `db.go` dengan default level masuk akal per role (samakan dengan tier lama di `authStore.js` `ROLE_PERMISSIONS` / backend `defaultRolePermissions` supaya konsisten)

2. **Backend — enforcement routes**
   - Di `routes.go`, bungkus tiap endpoint modul dengan `mp("modul.submenu", "view"|"add"|"edit"|"delete")` — termasuk endpoint delete, sejak Phase 61 pakai tier `"delete"` yang sama, bukan middleware terpisah lagi. Ingat: `mp` sudah dideklarasikan di paling atas blok `protected { ... }`, tidak perlu dideklarasikan ulang.

3. **Frontend — navigasi**
   - `Sidebar.jsx`: ubah nav item modul jadi punya `children: [{ path, label, menuKey }]`
   - `App.jsx`: ubah route modul dari `path="modul"` jadi `path="modul/:tab?"`
   - Di file halaman modul: ganti `activeTab` local state jadi turunan `useParams().tab` + redirect default, hapus `<Tabs>` internal, ganti dengan judul section polos

4. **Frontend — gating tombol**
   - Hitung `menuKey`, `canAdd = canDo(menuKey,'add')`, `canEdit = canDo(menuKey,'edit')`, `canDelete = canDo(menuKey,'delete')` di awal komponen (semua lewat `canDo`, tidak ada lagi `isSuperAdmin()` khusus utk delete)
   - Bungkus semua tombol Tambah/Edit/Hapus di tiap tab dengan pengecekan yang sesuai
   - Untuk sub-komponen terpisah di file yang sama, panggil `useAuthStore()` sendiri dengan menu key tetap

5. **Frontend — Settings admin UI**
   - Tambah konstanta `<MODUL>_MENU_KEYS` di `Settings.jsx`
   - Tambah satu baris `<MenuPermissionCard module="..." title="..." menuKeys={...} .../>`

6. **Build & verifikasi**
   - `go build ./...` (backend), `npx vite build` (frontend) — harus bersih
   - Test manual: expand submenu sidebar, navigasi tiap submenu (URL berubah benar), bare route redirect ke tab default, simulasi role dengan tier terbatas (patch `localStorage.sep-auth` di browser console/devtools) → pastikan tombol yang sesuai hilang tapi data tetap terlihat

---

## Catatan & Gotcha

- **Dua sumber schema di backend**: `backend/migrations/*.sql` itu legacy dan TIDAK dieksekusi. Source of truth aktual adalah `backend/internal/database/db.go` (`queries` slice yang dijalankan tiap server boot). Selalu tambah tabel/kolom baru di `db.go`.
- **Windows file lock**: kalau rebuild backend (`go build -o sep-backend.exe`) sementara proses lama masih jalan, build bisa gagal overwrite tanpa error yang jelas, sehingga proses LAMA tetap listen dan endpoint baru terlihat 404 padahal source sudah benar. Selalu `taskkill //IM sep-backend.exe //F` (atau cari PID spesifik lewat `netstat -ano | grep :8080` kalau taskkill by-name gagal) sebelum build ulang.
- **Demo mode**: tanpa koneksi database, backend jalan di "demo mode" — data tidak persist, termasuk perubahan izin lewat Settings (akan kembali ke `demoDefaults` setelah refresh). Ini konsisten dengan seluruh aplikasi yang memang didesain bisa jalan tanpa DB untuk demo/development.
- **✅ RESOLVED (Phase 60)**: sempat ditemukan backend SELALU jalan demo mode di environment dev ini (`DB ping error: pq: password authentication failed for user "postgres"`) — awalnya dikira Postgres tidak terpasang, TERNYATA Postgres 18 sudah terinstall & jalan normal sbg Windows service (`postgresql-x64-18`, port 5432), user/password/database di `.env` (`postgres`/`1234`/`sep_db`) semua VALID (diverifikasi manual pakai `psql`). **Root cause sebenarnya**: `backend/cmd/server/main.go` manggil `godotenv.Load("../../.env")` — path relatif itu cuma benar kalau binary dijalankan dari `backend/cmd/server/`, padahal konvensi project (`cd backend && ./sep-backend.exe`) jalanin dari `backend/`, jadi `../../.env` nunjuk ke `htdocs/.env` (tidak ada) — .env-nya SILENT GAGAL ke-load, password fallback ke default hardcoded `"postgres"` (salah, harusnya `"1234"`) → auth gagal ke Postgres. Fix: loop coba beberapa path kandidat (`.env`, `../.env`, `../../.env`) satu-satu SAMPAI ketemu — bukan pass semua sekaligus ke `godotenv.Load(a,b,c)` krn fungsi itu ABORT di file pertama yang tidak ketemu, tidak lanjut ke kandidat berikutnya. Setelah fix: backend log `Database connected`, tabel `role_menu_permissions` terkonfirmasi ke-seed 1220 baris (10 role × 122 menu_key, PERSIS sesuai jumlah yg diharapkan dari SEMUA seed INSERT Phase 39-59) — artinya seed data yg ditulis sepanjang 21 fase konversi TERNYATA SUDAH BENAR SEMUA, cuma baru pertama kali ini benar2 dieksekusi ke DB asli. Diverifikasi end-to-end: ubah permission role via API sungguhan → `{"message":"Permission berhasil disimpan"}` (bukan lagi "demo mode") → role yg di-deny beneran ke-redirect /403, direvert beneran balik akses — closed loop DB-driven authorization confirmed working for real.
- **Race condition antara `menuPermissions` (async fetch) dan `RequirePermission` (sync render)**: `loadMenuPermissions()` di-fetch async saat `AppLayout` mount, tapi `RequirePermission` (route guard di `App.jsx`) awalnya dievaluasi SEBELUM fetch itu selesai — di render pertama `menuPermissions` masih `{}`, jadi `hasPermission()` salah balikin `false` dan `<Navigate to="/403">` langsung commit, padahal user SEBENARNYA punya akses begitu data selesai di-load (tapi URL sudah kadung pindah ke /403, tidak otomatis balik). Fix: tambah flag `menuPermissionsLoaded` di `authStore` (di-set `true` setelah fetch settle, baik sukses maupun gagal), dan `RequirePermission` return `null` (tunggu) selama `!menuPermissionsLoaded` sebelum boleh memutuskan allow/deny. Ini WAJIB ada setiap kali sebuah permission check bergantung pada data yang di-fetch async — jangan biarkan pengecekan "deny by default" jalan sebelum fetch pertama selesai.
- **Route dalam Gin sub-group (`.Group()` + `.Use()`)**: beberapa modul (mis. Accounting) punya route yang dikelompokkan dalam `protected.Group("/xxx")` dengan middleware role-level sendiri (`RoleRequired(...)`) dari phase sebelumnya. `mp(...)` tetap bisa ditambahkan sebagai handler tambahan per-route di dalam grup itu (Gin mendukung banyak handler per route) — request akan lolos dua lapis: role-check grup dulu, baru tier-check per-menu. Jangan hapus `RoleRequired` yang sudah ada, cukup tambahkan `mp(...)` di sampingnya.
- **Route yang secara historis "salah tempat"**: tidak semua endpoint yang tampil di satu halaman modul punya prefix path yang sama (mis. halaman Accounting punya beberapa route berprefix `/finance/gl`, `/finance/trial-balance`, dst — peninggalan phase lama sebelum modul dipecah). Tetap gate pakai menu_key yang sesuai dengan pengelompokan di FRONTEND (per halaman/tab), bukan berdasar prefix path backend-nya.
- **`GET /rbac/menu-permissions` TIDAK BOLEH digate dengan `mp(...)`**: endpoint ini dipanggil oleh `authStore.loadMenuPermissions()` SETIAP user dari SEMUA role saat app mount (`?role=<role sendiri>`) — ini fondasi seluruh sistem canDo/menu permission, bukan endpoint khusus modul Settings meskipun secara UI cuma dipakai di tab Role & Permission (mode `?module=yyy` tanpa role, dipakai matrix admin). Kalau digate `mp("settings.roles","view")`, semua role selain admin/superadmin akan gagal load menu permission mereka SENDIRI di setiap halaman (403 di awal sesi) — meregresi total. `POST /rbac/menu-permissions` (yang benar2 mengubah data) aman digate krn sudah dibatasi `RoleRequired("superadmin","admin")` + bisa ditambah `mp(...)` di sampingnya.
- **Modul meta seperti Settings — tab yg sifatnya self-service (akun sendiri) vs data organisasi**: tab 2FA & Sessions itu mengelola akun/sesi milik user yg sedang login sendiri, BUKAN data organisasi yg dimiliki role lain — kalau digate tier `add`/`edit` spt modul bisnis biasa, user dgn tier `view` jadi tidak bisa mengamankan akunnya sendiri (aneh & tidak match prinsip keamanan). Solusi: gate SEMUA endpoint tab jenis ini di tier `view` saja secara seragam (bukan view/add/edit berjenjang) — asal user bisa reach tab-nya (module-level gate + tier `view`), dia bisa kelola akun sendiri penuh. Password ganti sendiri (`/auth/password`) malah di luar sistem menu permission ini sama sekali krn dipakai lintas halaman, bukan cuma di Settings.
- **Modul yg jadi rumah UI permission system-nya sendiri (Settings)**: `MenuPermissionCard` dipakai utk menampilkan+edit izin SEMUA modul termasuk Settings sendiri di dalam `TabRolePermission`. Supaya tidak muter2 sendiri tanpa kontrol, tambahkan gate `canDo('settings.roles','edit')` di level `TabRolePermission` (bukan cuma isSystem check bawaan) dan teruskan sbg prop `canEdit` ke tiap `<MenuPermissionCard>` (termasuk yg utk modul lain) — kalau role yg sedang login cuma py tier `view` di `settings.roles`, seluruh matrix+card jadi read-only (Select disabled, tombol Simpan hilang), bukan cuma yg utk modul Settings.
- **Prefix path backend yang dipakai bareng oleh 2 modul frontend berbeda**: `/security/*` dipakai oleh DUA fitur yang sama sekali tidak berhubungan — `/security/visitors` & `/security/incidents` itu modul **Smart Security** (keamanan fisik/gedung, di-gate `security.visitor`/`security.incident`), sedangkan `/security/2fa`, `/security/sessions`, `/security/audit-trail`, `/security/policy` itu bagian dari **Settings** (akun/keamanan sistem, sudah di-gate `settings.2fa` dst sejak Phase 54). Jangan asal grep prefix `/security/` saat konversi modul baru — selalu cek dulu route mana yang benar2 dipakai frontend modul yang sedang dikerjakan.
- **Modul yang sebelumnya TIDAK punya module-level gate sama sekali** (mis. Smart Vehicle — routenya di `App.jsx` tidak dibungkus `RequirePermission`, item Sidebar-nya juga tidak punya prop `permission`): pola AWAL (Phase 52-59) adalah "jangan tambah gate module-level baru" krn saat itu sistem lama masih hardcoded terpisah dan menambah gate baru berarti campur tangan ke sistem lama. **Sejak Phase 60 (sistem lama sudah dihapus total), pola ini berubah**: `RequirePermission` sekarang aman ditambahkan ke modul manapun yg sudah py menu_key terdaftar, krn `hasPermission()` sepenuhnya generik (rollup atas `menuPermissions`, bukan hardcoded), tidak perlu penanganan khusus per modul. Utk modul BARU yg belum py `moduleMenuKeys` entry sama sekali, tetap ikuti checklist di atas dulu (menu_keys+seed) baru boleh tambah `RequirePermission`. Untuk demoDefaults/seed modul yg sebelumnya fully-open, pastikan tidak ada role yang jadi `none` di semua menu key-nya (supaya tidak regresi akses) — pilih tier minimal `view` utk semua role, `add`/`edit` hanya utk role yang relevan operasional.

### Phase 61 (2026-07-05) — Delete jadi tier grantable + per-user override

Dua permintaan lanjutan dari user setelah Phase 60: **"delete data pun berdasarkan user akses dari table"** dan **"saya ingin setiap user bisa di setting menu dan action apa saja"** (multi-company sengaja ditunda, belum dikerjakan).

**Bagian 1 — Delete sebagai tier**: `levelOrder` di `permission.go` nambah `"delete": 4`. Semua 35 route `DELETE` di `routes.go` yang tadinya pakai shorthand `del` (= `middleware.DeleteRequiresSuperadmin()`) diganti `mp("<menu_key sesuai resource>", "delete")` — menu_key-nya SELALU sama dgn menu_key GET/POST/PUT tetangga resource yg sama, tidak ada key baru yg perlu didaftarkan. `del` var dan `DeleteRequiresSuperadmin()` dihapus total (dipastikan dulu tidak ada pemakaian lain lewat grep). **Tidak ada perubahan seed data** — krn tidak ada satupun baris seed yang set level ke `'delete'`, semua role otomatis tetap di bawah tier `delete` (masih efektif superadmin-only) SAMPAI admin secara eksplisit menaikkan tier suatu role ke `delete` lewat Settings — perubahan ini murni aditif, nol risiko regresi. 8 route DELETE yang dari dulu memang TIDAK pakai `del`/`mp` (Approval rules, Integration API keys/webhooks, notifications clear, documents, push unsubscribe, settings sessions) sengaja tidak disentuh — sudah tercatat terpisah sbg follow-up (belum py enforcement sama sekali kecuali settings sessions & approval rules).

Frontend: `MENU_LEVEL_ORDER` (authStore.js) dan `MENU_LEVEL_OPTIONS` (Settings.jsx) nambah `delete`. Semua 21 titik `const canDelete = isSuperAdmin()` di 13 file (AssetMaintenance, Cost×3, SmartFactory, Finance, IoTHub, Purchasing, QMS×3, SmartHRIS, MRP×3, SmartWarehouse, Tax×3, Sales, Budget) diganti `const canDelete = canDo(menuKey, 'delete')` — utk file yang gate-nya per-tab (`menuKey` variabel turunan `activeTab`, mis. Purchasing/Sales/Finance/dst) tinggal pakai `menuKey` yang sudah ada; utk file yang tiap tab adalah komponen terpisah dgn menu_key literal (Cost/MRP/QMS/Tax), pakai literal yg sama dgn `canAdd`/`canEdit` di komponen itu. Kasus khusus `IoTHub.jsx`: satu `canDelete` tunggal tadinya dipakai utk DUA resource beda (`iot.devices` utk hapus device, `iot.alerts` utk hapus alert rule) — dipecah jadi `canDeleteDevice`/`canDeleteRule` masing2 dgn menu_key yg benar, bukan disamakan.

**Bagian 2 — Per-user override**: tabel baru `user_menu_permissions` (kosong by default, lihat schema di atas). `GetEffectiveMenuLevel`/`HasEffectiveMenuLevel` (baru) dipakai `middleware.MenuPermission` (internal, tidak perlu ubah ~150 titik `mp(...)` yg sudah ada) — override user MENANG kalau ada barisnya utk `(user_id, menu_key)`, kalau tidak ada fallback ke tier role spt biasa (`GetMenuLevel`/`HasMenuLevel`, TIDAK diubah — tetap murni role-only, dipakai apa adanya oleh Settings admin matrix). Endpoint baru `GET`/`POST /rbac/users/:id/menu-permissions`, digate `RoleRequired("superadmin","admin")` + `mp("settings.users","view"|"edit")`. `authStore.loadMenuPermissions()` ikut kirim `user_id` supaya `menuPermissions` yg di-cache di frontend SUDAH effective (bukan tier role mentah).

**Prasyarat yang ditemukan & diperbaiki sekalian**: `CreateUser` (`rbac.go`) ternyata SELALU no-op saat DB tersambung (`c.JSON(http.StatusCreated, gin.H{"success": true})` tanpa INSERT sama sekali) — user yg "berhasil dibuat" lewat Settings sebenarnya TIDAK PERNAH masuk ke tabel `users`. Diperbaiki: hash password dgn `bcrypt.GenerateFromPassword(..., 12)` (samakan cost dgn `auth.go`), `INSERT INTO users (company_id, name, email, password, role, is_active) VALUES (...) RETURNING id`. Tanpa fix ini, fitur override per-user tidak bisa diverifikasi sama sekali (tidak ada user id asli utk dilekatkan override-nya).

**Verifikasi end-to-end (Playwright, DB asli)**:
- Delete tier: role `sales` di-set `sales.customer` dari `edit` → `delete` → tombol Hapus muncul di tabel Customer (0 → 4 tombol), endpoint `DELETE /sales/customers/:id` yg tadinya 403 utk role ini sekarang lolos (bukan 403 lagi, respons 200 utk id palsu krn lolos permission check meski row tidak ketemu).
- `CreateUser` fix: user baru beneran dpt UUID asli dari Postgres (bukan lagi placeholder).
- Per-user override: user baru role `sales` awalnya `GET /sales/customers` → 200 (ikut tier role). Di-override `sales.customer` → `none` khusus user itu → `GET /sales/customers` → 403 utk user itu SAJA (role `sales` lain tidak terpengaruh). Revert override ke `"inherit"` → balik 200. **Catatan penting**: override HANYA mempengaruhi enforcement level API/tombol per-menu_key, BUKAN route guard halaman (`RequirePermission` di `App.jsx` itu module-level rollup — cek SEMUA menu_key modul sekaligus pakai `MAX`, jadi selama modul itu py menu_key lain yg masih ≥view, halaman tetap bisa diakses meski satu submenu di-`none`-kan; ini bukan bug, memang desain module-level vs per-menu_key yang berbeda layer).

### Bug ditemukan & diperbaiki (2026-07-05, sama hari) — 500 di `GET /warehouse/inventory`

Root cause: tabel `inventory` di DB asli py schema LAMA (`quantity NUMERIC(12,2)`, tanpa `category`, tanpa `updated_at`, `min_stock NUMERIC(12,2)`) yg beda dari yg diasumsikan `CREATE TABLE IF NOT EXISTS inventory` di `db.go` (`qty INTEGER`, `category VARCHAR`, `updated_at TIMESTAMPTZ`, `min_stock INTEGER`) — krn `CREATE TABLE IF NOT EXISTS` adalah no-op di tabel yg sudah ada, evolusi schema di source TIDAK PERNAH ter-apply ke tabel real (cuma `cost_price`/`sell_price` yg py `ALTER TABLE ADD COLUMN` eksplisit sebelumnya). Baru kelihatan skrng krn DB genuinely connected sejak Phase 60. **Fix** (pola sama dgn `cost_price`/`sell_price`): tambah `ALTER TABLE inventory ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT ''`, `... updated_at TIMESTAMPTZ DEFAULT NOW()`, `... qty INTEGER DEFAULT 0` + backfill `UPDATE ... SET qty = COALESCE(quantity,0)::INTEGER WHERE qty=0 AND quantity<>0` (idempotent), dan `ALTER TABLE inventory ALTER COLUMN min_stock TYPE INTEGER USING min_stock::INTEGER`. Kolom `quantity` lama sengaja tidak di-drop. **Pelajaran**: kalau `CREATE TABLE IF NOT EXISTS` berubah shape SETELAH tabel sempat ter-buat, WAJIB tambah `ALTER TABLE ADD COLUMN IF NOT EXISTS` terpisah — jangan asumsikan definisi CREATE TABLE di source otomatis reflect DB asli.

### Phase 62 (2026-07-05) — Approval Center dikonversi (modul ke-22)

- Lanjutan pola Phase 39-59 — modul kedua puluh dua: **Approval Center** (3 submenu: Menunggu Persetujuan, Riwayat, Konfigurasi Rule)
- **Sebelumnya TIDAK punya module-level gate sama sekali** (sama seperti kasus Vehicle/Network/Building/Security/Marketplace/IoT Hub) — route `/approval` di `App.jsx` tidak dibungkus `RequirePermission`, item Sidebar tidak py prop `permission`. Sejak Phase 60 (sistem generik), `RequirePermission permission="approval.view"` aman ditambahkan.
- **Tab "Konfigurasi Rule" sebelumnya digate CLIENT-SIDE via `hasRole('superadmin','admin')`** (bukan lewat menu permission), plus backend routes `/approvals/rules*` sudah py `middleware.RoleRequired("superadmin","admin")`. Diganti jadi `canDo('approval.rules', tier)` (DB-driven) — TAPI `RoleRequired` di backend SENGAJA TIDAK dihapus, `mp(...)` ditambah di SAMPING-nya (pola sama dgn Accounting Phase 45: dua lapis, role-check dulu baru tier-check). Seed: hanya `admin`+`superadmin` dapat `edit` di `approval.rules`, role lain `none` — persis menyamai perilaku lama.
- **`approval.pending` & `approval.history` sebelumnya bisa diakses+diaksi SIAPAPUN role manapun** (endpoint `GetMyApprovals`/`ActOnApproval` tidak py role check sama sekali di level route) — tapi `GetMyApprovals` PUNYA filtering business-logic sendiri di level Go handler: hanya menampilkan approval request yg `current_level`-nya match `approverRole` milik role si requester (atau delegated approver) — jadi walau tier menu permission dikasih `edit` ke SEMUA role (utk menghindari regresi drastis dari akses lama yg universal), user tetap TIDAK BISA lihat/aksi approval yg bukan levelnya — double-layer proteksi (tier menu + business-logic filter), bukan celah.
- Diverifikasi Playwright (DB asli): expand submenu Approval Center (3 item), navigasi Konfigurasi Rule → URL `/approval/rules` benar, bare `/approval` redirect ke `/approval/pending`, superadmin lihat tombol "Tambah Rule", simulasi role `sales` (approval.rules=none per seed) → submenu Konfigurasi Rule hilang dari sidebar DAN konten card-nya tidak render sama sekali walau diakses langsung via URL, tapi tetap bisa akses `/approval/pending` normal (approval.pending=edit utk sales) — 0 console error
- `PERMISSION_SYSTEM.md` diupdate (tabel status modul + section ini)
- **Sisa 5 halaman**: Executive Dashboard, Integration, Customer Portal, Vendor Portal, Supply Chain — semua dikonfirmasi py tab asli + panggilan API backend real (lihat hasil investigasi), kandidat valid utk konversi lanjutan, lanjut kapan user minta. **Print Center** ditandai ⛔ N/A (mirip Smart Energy — nihil panggilan API, 100% data statis, tab-nya cuma filter client-side) — belum dikonfirmasi eksplisit ke user (beda dari kasus Smart Energy yg sempat ditanya AskUserQuestion), jadi masih bisa direvisi kalau user memutuskan lain.

### Phase 63 (2026-07-05) — Executive Dashboard dikonversi (modul ke-23)

- Lanjutan langsung dari Phase 62 (user bilang "next") — modul kedua puluh tiga: **Executive Dashboard** (3 submenu: Overview, Management Report, Target KPI)
- **Sebelumnya TIDAK punya module-level gate sama sekali** (pola sama spt Vehicle/Network/Building/Security/Marketplace/IoT/Approval) — ditambahkan `RequirePermission permission="executive.view"`.
- **Modul ini 100% read-only di sisi frontend** — tidak ada satupun tombol create/edit/delete, termasuk tab "Target KPI" yg cuma menampilkan tabel target (ada catatan teks "diperbarui melalui API PUT /executive/kpi-targets" tapi endpoint itu TIDAK dipanggil dari UI manapun). Backend endpoint `PUT /executive/kpi-targets` tetap digate `mp("executive.targets","edit")` utk future-proofing meski dead di frontend saat ini (konsisten dgn pola precedent QMS Phase 47's dead-code-tetap-digate).
- **Nama menu_key sengaja dibedakan dari modul lain**: dipakai prefix `executive.*` (bukan reuse `analytics.executive` yg sudah ada sejak Phase 53 utk tab "Executive" DI DALAM modul Analytics — dua hal yg beda sama sekali meski nama mirip).
- Seed: krn seluruh 3 tab read-only & sebelumnya terbuka utk SEMUA role, dikasih `admin`+`superadmin`='edit' (utk future-proof kalau nanti KPI target editing di-expose ke frontend), 8 role lain='view' — SATU blok CROSS JOIN gabungan (bukan 3 terpisah spt Approval Center) krn tidak perlu differensiasi per-key.
- Komponen `TABS` array (icon+id) yg dulu drive tab-bar internal dihapus total (termasuk import icon `LayoutDashboard`/`FileBarChart` yg jadi unused) — activeTab sekarang murni dari `useParams().tab`, navigasi lewat sidebar submenu.
- Diverifikasi Playwright (DB asli): expand submenu Executive (3 item), navigasi Management Report → URL `/executive/report` benar, bare `/executive` redirect ke `/executive/overview`, role `viewer` (executive.*=view per seed) tetap lihat semua 3 submenu (module ini emang read-only utk semua role) dan bisa akses `/executive/targets` normal. **Verifikasi backend enforcement WAJIB pakai user login asli** (bukan cuma patch localStorage role) krn JWT token yg dipatch di localStorage TETAP membawa role asli dari saat login (superadmin) — patch localStorage cuma mempengaruhi rendering FRONTEND (sidebar visibility, canDo() pakai menuPermissions yg di-fetch pakai role yg dipatch), TIDAK mengubah apa yg backend lihat dari JWT claims. Dibuatkan user asli role `viewer` via `CreateUser`, login sungguhan dpt token asli → `PUT /executive/kpi-targets` (butuh edit) → 403 sesuai ekspektasi; `GET /executive/dashboard` (butuh view) → 200. 0 console error.
- `PERMISSION_SYSTEM.md` diupdate (tabel status modul + section ini)
- **Sisa 4 halaman valid**: Integration, Customer Portal, Vendor Portal, Supply Chain — lanjut kapan user minta. **Pelajaran penting utk phase berikutnya**: kalau perlu verifikasi enforcement backend utk role NON-superadmin, jangan andalkan patch `localStorage`-nya saja — JWT yg dibawa browser tetap py role asli dari login terakhir. Kalau mau test role lain scr sungguhan di level API, WAJIB login betulan sbg user dgn role itu (via `CreateUser` + login form), baru token-nya representatif.

### Phase 64 (2026-07-05) — Integration dikonversi (modul ke-24)

- Lanjutan langsung dari Phase 63 (user bilang "next") — modul kedua puluh empat: **Integration** (4 submenu: Import Data, Export Data, API Keys, Webhooks)
- **Sebelumnya TIDAK punya module-level gate sama sekali** — pola sama spt modul2 lain yg sebelumnya fully-open. Ditambahkan `RequirePermission permission="integration.view"`.
- **Modul ini py sub-tab INTERNAL di dalam 2 dari 4 submenu** (API Keys punya sub-tab Keys/Logs; Webhooks punya master-detail drill-down ke log pengiriman) — sub-tab internal ini TIDAK dikonversi jadi sidebar submenu terpisah (beda dari top-level tab), tetap state lokal di dalam komponen masing2, konsisten dgn precedent (mis. QMS/IoT yg py struktur serupa).
- **Nuansa keamanan penting**: sebelum konversi, endpoint2 di modul ini (create/revoke API key, create/delete webhook, execute import) TIDAK PUNYA proteksi role/permission SAMA SEKALI — literally siapapun role yg login bisa bikin API key programmatic access atau webhook ke URL sembarang. Mengikuti prinsip konsisten dari modul2 lain (jangan regresi akses saat konversi, biar admin yg tighten belakangan via Settings), seed dikasih SEMUA 10 role tier `edit` scr seragam di ke-4 menu_key (bukan dipersempit sepihak) — TAPI ini kandidat kuat utk admin PERLU langsung meninjau & mempersempit manual via Settings begitu Phase ini selesai, krn beda dari kasus lain yg emang read-only/rendah-risiko.
- Menu key: `integration.import` (view utk GET template/preview/history, `add` utk execute), `integration.export` (view saja, unduh CSV), `integration.apikeys` (view/add/delete — tidak ada endpoint update), `integration.webhooks` (view/add/edit/delete lengkap, meski tombol edit tidak ada di UI, PUT route tetap digate utk future-proof).
- Diverifikasi Playwright (DB asli): expand submenu Integration (4 item), navigasi API Keys → URL benar, bare `/integration` redirect ke `/integration/import`, tombol "Buat API Key"/"Tambah Webhook" muncul utk superadmin. **Verifikasi enforcement per-tier**: di-set `integration.apikeys`→`none` khusus role `viewer` via API, dibuatkan user asli role viewer, login sungguhan → `GET /integration/api-keys` → 403 (benar), tapi `GET /integration/webhooks` (masih tier `edit` krn cuma apikeys yg diubah) → 200 (benar) — konfirmasi granularitas per-menu_key jalan independen antar submenu dalam modul yg sama. Sidebar submenu "API Keys" hilang utk user itu, 3 submenu lain tetap tampil. 0 console error selain 403 yg memang expected. State test (permission + user) dibersihkan lagi setelah verifikasi.
- `PERMISSION_SYSTEM.md` diupdate (tabel status modul + section ini)
- **Sisa 3 halaman valid**: Customer Portal, Vendor Portal, Supply Chain — lanjut kapan user minta.

### Phase 65 (2026-07-05) — Supply Chain dikonversi (modul ke-25)

- User sempat interupsi mid-Phase 64 minta "run apps" (backend+frontend dijalankan biar bisa dicoba langsung), lalu setelah Phase 64 kelar user langsung nunjuk "http://localhost:3000/supply-chain belum di buatkan menu akses" — jadi lanjut konversi Supply Chain (4 submenu: Peta Rantai Pasok, Traceability, Supplier Scorecard, Risk Dashboard), module_key prefix `supplychain` (tanpa tanda hubung, beda dari URL path `/supply-chain` yg py hyphen — konsisten dgn konvensi semua module_key lain yg gak pernah pakai hyphen)
- **Sebelumnya TIDAK punya module-level gate sama sekali** — ditambahkan `RequirePermission permission="supplychain.view"`
- **Modul ini 100% read-only** — sama seperti Executive Dashboard, tidak ada satupun tombol create/edit/delete di 4 tab-nya (map visual, traceability search, supplier scorecard, risk dashboard — semua view/search/analytics). Seed: SEMUA 10 role `view` seragam di ke-4 menu_key (beda dari Executive yg kasih admin/superadmin `edit` demi future-proof PUT endpoint — Supply Chain tidak py endpoint mutasi APAPUN di backend, jadi `view` cukup utk semua termasuk superadmin, meski superadmin toh selalu `edit` otomatis by design `GetMenuLevel`)
- Diverifikasi Playwright (DB asli): expand submenu (4 item), navigasi Risk Dashboard → URL `/supply-chain/risk` benar, bare `/supply-chain` redirect ke `/supply-chain/map`. **Verifikasi granularitas independen**: `supplychain.scorecard` di-set `none` khusus role viewer → user asli viewer login → `GET /supply-chain/supplier-scorecard` → 403, TAPI `GET /supply-chain/map` (menu_key lain, masih `view`) → 200 — konfirmasi 4 menu_key independen. Sidebar submenu "Supplier Scorecard" hilang khusus utk user itu, 3 lain tetap tampil. State test dibersihkan lagi
- `PERMISSION_SYSTEM.md` diupdate (tabel status modul + section ini)
- **Sisa 2 halaman valid**: Customer Portal, Vendor Portal — lanjut kapan user minta. Print Center tetap ⛔ N/A (belum dikonfirmasi eksplisit ke user).

### Phase 66 (2026-07-05) — Customer Portal dikonversi (modul ke-26)

- Lanjutan langsung dari Phase 65 (user bilang "next") — modul kedua puluh enam: **Customer Portal** (4 submenu: Dashboard, Pesanan Saya, Invoice, Pengiriman) — halaman self-service internal (staff app melihat data pelanggan, BUKAN portal eksternal terpisah utk pelanggan asli login sendiri)
- **Sebelumnya TIDAK punya module-level gate sama sekali** — ditambahkan `RequirePermission permission="customerportal.view"`
- **100% read-only** (mirip Supply Chain) — tidak ada aksi mutasi apapun, cuma view dashboard/orders/invoices/deliveries utk customer yg dipilih via dropdown switcher. Endpoint bootstrap `GET /portal/customers` (dipakai buat isi dropdown switcher, dipanggil di semua tab) digate `customerportal.dashboard` sbg tier representatif (pola sama dgn endpoint shared lainnya)
- Seed: SEMUA 10 role `view` seragam di ke-4 menu_key (tidak ada endpoint mutasi sama sekali di backend module ini, beda dari Executive Dashboard yg py 1 endpoint PUT dead-di-frontend)
- Diverifikasi Playwright (DB asli): expand submenu (4 item), navigasi Pesanan Saya → URL `/portal/customer/orders` benar, bare `/portal/customer` redirect ke `/portal/customer/dashboard`. Verifikasi granularitas independen: `customerportal.invoices`→`none` khusus viewer → user asli login → GET invoices 403, GET dashboard (key lain) tetap 200, submenu Invoice hilang dari sidebar (Pesanan Saya & Pengiriman tetap tampil). **Gotcha testing**: locator awal `hasText: /^Dashboard$/` sempat ambigu krn ada nav item TOP-LEVEL lain juga bernama persis "Dashboard" (menu utama, bukan submenu Customer Portal) — bikin logic "expand kalau masih 0 item" salah nyimpul udah expanded padahal belum. Fix: scope locator hanya ke label yg unik (Pesanan Saya/Invoice/Pengiriman, exclude Dashboard) buat verifikasi. State test dibersihkan
- `PERMISSION_SYSTEM.md` diupdate (tabel status modul + section ini)
- **Sisa 1 halaman valid**: Vendor Portal — lanjut kapan user minta. Print Center tetap ⛔ N/A (belum dikonfirmasi eksplisit).

### Phase 67 (2026-07-05) — Vendor Portal dikonversi (modul ke-27, konversi terakhir dari daftar yg diketahui)

- Lanjutan langsung dari Phase 66 (user bilang "next") — modul kedua puluh tujuh: **Vendor Portal** (4 submenu: Dashboard, Purchase Order, Invoice Saya, Pembayaran) — mirror Customer Portal tapi utk vendor/supplier
- **Sebelumnya TIDAK punya module-level gate sama sekali** — ditambahkan `RequirePermission permission="vendorportal.view"`
- **Beda dari Customer Portal**: modul ini PY 1 mutasi nyata — tombol "Kirim Invoice" (submit invoice vendor, `POST /portal/vendor/invoices`), muncul di DUA tempat (header + toolbar tab Invoice Saya, keduanya trigger modal yg sama). Endpoint bootstrap `GET /portal/vendors` digate `vendorportal.dashboard` sbg representatif (sama pola dgn `/portal/customers`). Karena ada mutasi nyata yg sebelumnya bisa dipakai SIAPAPUN, seed dikasih tier `add` (bukan cuma `view`) ke SEMUA 10 role secara seragam utk menghindari regresi — `canDo('vendorportal.invoices','add')` dipakai gate KEDUA tombol Kirim Invoice sekaligus (1 variabel `canSubmitInvoice` dipakai di 2 lokasi render berbeda dalam file yg sama)
- Diverifikasi Playwright (DB asli): expand submenu (dicek pakai label non-Dashboard krn "Dashboard" ambigu dgn nav utama, temuan Phase 66), bare `/portal/vendor` redirect ke dashboard, superadmin lihat 2 tombol Kirim Invoice. **Verifikasi enforcement tier add vs view**: `vendorportal.invoices` didowngrade ke `view` (di bawah `add`) khusus viewer → user asli login → `POST /portal/vendor/invoices` → 403 (benar, view < add), `GET /portal/vendor/invoices` tetap 200 (view masih cukup utk baca), tombol Kirim Invoice hilang total (count 0) di UI utk user itu. State test dibersihkan
- `PERMISSION_SYSTEM.md` diupdate (tabel status modul + section ini)
- **Semua halaman yg diketahui py tab+API real (dari investigasi 7-halaman awal Phase 62) SELESAI dikonversi**: Approval Center, Executive Dashboard, Integration, Supply Chain, Customer Portal, Vendor Portal — total 27 modul. **Print Center** tetap satu2nya sisa, ditandai ⛔ kemungkinan N/A (mirip Smart Energy: nihil API call, 100% data statis/mock) TAPI belum pernah dikonfirmasi eksplisit ke user via pertanyaan langsung (beda dari kasus Smart Energy yg didapat consent eksplisit) — kalau user minta lanjut ke situ, TANYAKAN dulu apakah mau tetap dikonversi (mis. jadi placeholder submenu tanpa data nyata) atau di-skip permanen spt Smart Energy.

### Phase 68 (2026-07-05) — Print Center dikonfirmasi N/A, KONVERSI 27 MODUL SELESAI TOTAL

- User bilang "next" lagi setelah Phase 67 — satu2nya sisa adalah Print Center, yg SEBELUMNYA ditandai "kemungkinan N/A" tapi belum consent eksplisit. Ditanya via `AskUserQuestion` (3 opsi: skip permanen / convert anyway meski kosmetik / user cek dulu) → **user pilih "Skip permanently"**
- Print Center RESMI ditandai ⛔ N/A di tabel status modul, sama persis kasus Smart Energy (Phase 55) — halaman datar, filter murni client-side atas 1 array demo statis, zero panggilan API backend, tidak ada data/aksi apapun yg bisa digate secara berarti
- **Dengan ini, KONVERSI SELESAI TOTAL**: 27 dari 27 modul yg py tab+API real sudah dikonversi ke pola tab→submenu+izin granular DB-driven. 2 halaman ditandai N/A permanen (Smart Energy, Print Center) — bukan kandidat pola ini krn 100% statis. Tidak ada lagi modul "belum dikonversi" yg tersisa dalam scope investigasi Phase 62.
- `PERMISSION_SYSTEM.md` diupdate (tabel status modul final)

### Phase 69 (2026-07-05) — Multi-company support (per-company permission scoping + user company access)

User bertanya "apakah user akses bisa multicompany" → dijelaskan belum bisa (permission tables 100% global lintas company saat itu) → user minta dibuatkan plan → **masuk EnterPlanMode** krn scope besar (nyentuh core permission engine yg dibangun sejak Phase 39). Ditanya via `AskUserQuestion` soal kedalaman scope: (a) cuma data access (user bisa akses multi company, tapi tier permission tetap global) vs (b) data access + tier permission BENERAN beda per company → **user pilih (b), yg lebih dalam**.

**Validasi desain**: sebelum eksekusi, plan divalidasi oleh Plan-agent terpisah yg baca langsung source code — menemukan 2 hal KRITIS yg WAJIB dibereskan sekalian, bukan cuma "nice to have":
1. **Bug urutan migrasi**: `Migrate()` di db.go jalanin seed `role_menu_permissions` (~30 blok INSERT) SEBELUM `seedAdmin()` (yg insert baris `companies` pertama) — kalau `company_id` langsung dibikin `NOT NULL`, instalasi FRESH (DB kosong) bakal gagal total krn belum ada company sama sekali saat seed jalan. Fix: tambah bootstrap `INSERT INTO companies ... WHERE NOT EXISTS` SEBELUM blok role_menu_permissions manapun, `seedAdmin()` diubah jadi SELECT company yg udah ada (bukan insert baru, biar gak dobel).
2. **IDOR pre-existing**: `GetUserMenuPermissions`/`UpdateUserMenuPermissions` (endpoint per-user override dari Phase 61) TERNYATA dari awal tidak pernah cek apakah target user_id itu benar2 milik company admin yg minta — bug lama yg jadi lebih parah kalau tidak dibenerin sekalian saat nambah company-scoping. Fix WAJIB dibundel: tambah cek membership (`company_id=$2 OR EXISTS (SELECT 1 FROM user_companies ...)`) sebelum baca/tulis baris manapun.

**Desain final**:
- **Role tetap global, cuma tier yg beda per company** — `users.role` tetap 1 kolom (BUKAN per-company role assignment, itu fitur beda/lebih besar).
- **`users.company_id` tetap jadi company utama/rumah** user (dipakai default login + scope `GetUsers`). Tabel baru `user_companies(user_id, company_id)` = akses TAMBAHAN. Akses penuh = utama ∪ `user_companies`. Superadmin bisa switch ke company manapun tanpa perlu baris di situ.
- **Switch company session-only, bukan permanen** — re-issue JWT baru dgn `CompanyID` claim beda, `users.company_id` TIDAK berubah. Login ulang selalu balik ke company utama.
- **TIDAK ada company-picker baru di dalam Settings** — matrix Role & Permission dan modal "Izin Khusus" yg udah ada TETAP dipakai apa adanya, sekarang implisit beroperasi di company yg lagi aktif di sesi admin. Mau atur company B → switch dulu ke company B → pakai Settings spt biasa.

**Perubahan backend**: `role_menu_permissions`/`user_menu_permissions` tambah kolom `company_id` (ALTER+backfill+swap UNIQUE constraint, idempotent, ngikutin pola `ALTER TABLE ADD COLUMN IF NOT EXISTS` yg sama dgn fix inventory Phase 64) — SEMUA ~30 blok seed lama di db.go ikut diupdate (company_id + ganti ON CONFLICT target). `permission.go`'s 4 fungsi (`GetMenuLevel`/`HasMenuLevel`/`GetEffectiveMenuLevel`/`HasEffectiveMenuLevel`) tambah param `companyID` di depan — blast radius KECIL krn cuma dipanggil dari `middleware/permission.go` (1 baris tambahan: `companyID := c.GetString("company_id")`) dan `menu_permissions.go`'s 4 handler — **~150 titik `mp(...)` di routes.go NOL PERUBAHAN** (sama spt Phase 61 dulu). `SwitchCompany` handler baru (`POST /auth/switch-company`) re-issue token via `generateToken` yg udah ada. `GetCompanies`/`CreateCompany` (`rbac.go`) yg SEBELUMNYA no-op di real-DB mode (bug sekelas `CreateUser` yg dulu ketemu di Phase 61) dibenerin sekalian: `CreateCompany` insert company beneran + auto-clone `role_menu_permissions` dari company template (company pertama/bootstrap) + auto-grant creator (kalau bukan superadmin) via `user_companies`. `GetUsers` diperluas biar nampilin member sekunder (via `user_companies`) + flag `is_primary`. Endpoint baru `GET`/`POST /rbac/users/:id/companies` (kelola akses company per-user).

**Perubahan frontend**: `authStore.js` tambah action `switchCompany` (panggil API, `setAuth`, lalu FULL RELOAD — disengaja, krn ~30 halaman pakai `useApi`/`DataTable` yg nol cache-invalidation company-aware, reload penuh satu2nya cara aman hindari data company lama nyangkut). Tombol "Switch" di `TabCompany` (Settings) yg dulu cuma stub toast "re-login diperlukan" sekarang beneran jalan. Modal baru "Akses Perusahaan" di `TabUsers` (mirror pola modal "Izin Khusus" yg udah ada) buat atur company tambahan per-user.

**Diverifikasi (Playwright, DB asli)**:
- Fresh-install regression (WAJIB test di Postgres KOSONG, bukan dev DB yg udah pernah dimigrasi, krn itu nutupin bug): confirmed `role_menu_permissions` te-seed benar (1440 baris = 10 role × 144 key × 1 company) di database benar2 baru, 0 migration warning selain 1 warning lama yg emang expected (inventory `quantity` column, pre-existing dari Phase 64).
- Superadmin bikin 2 company real via `CreateCompany` (masing2 auto-ke-seed 1440 baris permission dari template) + 1 user real role `sales` + grant akses ke 2 company via `user_companies`.
- Role `sales` di-set `hris.employee`=`edit` di Company A, `none` di Company B (masing2 lewat sesi admin yg switch ke company itu dulu). User sales asli login → switch ke A → `GET /hris/employees` → 200. Switch ke B (user & JWT sama persis, cuma company beda) → `GET /hris/employees` → 403. **Konfirmasi tier permission role yg SAMA beneran beda per company.**
- Negative test switch-company: user tanpa membership ke company C → switch → 403. Superadmin switch ke company C tanpa baris `user_companies` sama sekali → 200 (bypass sesuai desain).
- Negative test IDOR: dibikin user kedua yg CUMA py akses ke company C. Admin yg sesinya aktif di company A coba `GET`/`POST /rbac/users/:id/menu-permissions` ke user itu → 404 (diblokir, fix IDOR jalan). Sanity check: admin yg sama BISA akses user yg emang py membership ke company A → 200.
- Semua data test (3 company, 2 user, permission rows) dibersihkan lagi setelah verifikasi.
- **Temuan sampingan (BUKAN bug dari fitur ini, tidak difix)**: `GET /purchasing/pr` (`GetPurchaseRequests`) ternyata 500 di SEMUA company termasuk company asli — root cause: query SQL-nya baca kolom `requester` yg TIDAK ADA di tabel real `purchase_requests` (kolom asli `requested_by`) — bug schema-drift sekelas kasus `inventory` Phase 64, tapi di modul Purchasing, ketemu gak sengaja pas testing. TIDAK difix skrng krn di luar scope plan multi-company — dicatat sbg follow-up terpisah. (Verifikasi tier tetap valid krn middleware permission SUDAH lolos/blokir sebelum request nyampe ke baris yg bug — 403 di Company B jelas benar krn ketahan middleware, dan lolos-ke-500 di Company A pun tetap membuktikan middleware-nya TIDAK memblokir, jadi kesimpulan soal permission scoping tetap sah walau endpoint itu sendiri py bug lain.)
- `PERMISSION_SYSTEM.md` diupdate (bagian Latar Belakang + section ini). Project memory diupdate.

**Belum/sengaja di luar scope** (dicatat eksplisit, bukan lupa):
- Revocation token/sesi tetap dekoratif (pre-existing, `user_sessions` gak pernah di-insert, `AuthMiddleware` gak pernah re-check per-request) — cabut akses company user di tengah sesi TIDAK langsung invalidate JWT yg lagi dipegang, baru expired natural 24 jam. Bukan regresi dari fitur ini, keterbatasan lama.
- `audit_logs` masih belum py kolom `company_id` sama sekali (audit trail masih unscoped) — moot krn `GetAccessLogs` sendiri masih no-op di real-DB mode. Endpoint BARU dari fitur ini (`switch-company`, `CreateCompany`) tetap kirim `WriteAuditLog` spt biasa, tidak nambah utang baru scr sengaja.
- Bug `GET /purchasing/pr` (kolom `requester` vs `requested_by`) — ditemukan gak sengaja, dicatat tapi TIDAK difix (di luar scope plan ini).

### Phase 70 (2026-07-05) — Filter perusahaan di halaman Settings > Role & Permission

User minta tambahan: "tambahkan pilihan perusahaan juga untuk memfilter perusahaan apa saja yang bisa di lihat" di halaman `/settings/roles`. Ini secara eksplisit membalik satu keputusan desain Phase 69 ("TIDAK ada company-picker baru di Settings, implisit ikut company aktif sesi") — user lebih suka bisa pilih company LANGSUNG dari dropdown di halaman itu, tanpa perlu switch session dulu via Settings > Perusahaan.

**Desain**: `GetMenuPermissions`/`UpdateMenuPermissions` (`menu_permissions.go`) tambah parameter opsional `company_id` (query param utk GET, field JSON utk POST) yg — kalau diisi DAN requester beneran py akses ke company itu (dicek pakai `userHasCompanyAccess`, helper baru yg diextract dari logic `SwitchCompany` biar reusable) — dipakai MENGGANTIKAN `c.GetString("company_id")` (company aktif sesi) sbg scope. Kalau kosong ATAU requester gak py akses, diam2 fallback ke company aktif sesi (bukan error) — jadi endpoint ini tetap 100% backward-compatible utk semua caller lama yg gak pernah kirim param ini.

`userHasCompanyAccess(userID, role, companyID string) bool` dipindah jadi helper bersama di `rbac.go` (dipakai jg oleh `SwitchCompany` di `auth.go`, gantiin logic inline yg tadinya duplikat).

**Frontend**: `TabRolePermission` (Settings.jsx) tambah `<Select>` company kedua di sebelah dropdown role yg udah ada, terisi dari `rbacApi.getCompanies()` (daftar company yg BENERAN bisa diakses user itu — otomatis konsisten dgn apa yg backend akan terima), default pilih company yg `current: true`. State `selectedCompanyId` diteruskan sbg prop baru ke SEMUA 27 `<MenuPermissionCard>` yg ada di halaman itu, yg lalu meneruskannya ke `rbacApi.getMenuPermissions`/`updateMenuPermissions` sbg param `companyId` opsional. `rbacApi`'s 2 fungsi itu diupdate terima param ke-3 opsional.

**Kenapa ini AMAN, bukan buka celah baru**: krn access-check-nya di backend (bukan cuma UI-level dropdown yg keliatannya restricted), user manapun yg somehow ngirim `company_id` company yg BUKAN aksesnya (mis. lewat DevTools/curl manual) otomatis fallback ke company mereka sendiri — gak pernah bisa baca ATAU nulis ke company yg bukan aksesnya, walaupun mereka tau ID-nya.

**Diverifikasi (Playwright, DB asli)**: company selector di halaman menampilkan company baru yg baru dibikin (superadmin), GET/POST dgn `company_id` eksplisit ke company LAIN (tanpa switch session) berhasil baca/tulis tier company itu secara independen dari company aktif sesi (`finance` role: `edit` di company sendiri, `none` di company lain, dua2nya kebaca benar via `company_id` param yg beda). Negative test: admin non-superadmin yg TIDAK py akses ke company kedua itu — GET dgn `company_id` company itu jatuh balik ke tier company SENDIRI (bukan company target), POST-nya jg diam2 nulis ke company sendiri (bukan ke company target) — dikonfirmasi lewat re-check company target masih gak berubah. Data test dibersihkan (termasuk 2 leftover test user dari sesi Phase 61 yg kelewat kebersihannya waktu itu, ditemukan gak sengaja pas cleanup skrng).

`PERMISSION_SYSTEM.md` diupdate (section ini). Project memory diupdate.

### Phase 71 (2026-07-05) — Filter perusahaan GLOBAL, berlaku di SEMUA ~27 modul (reads + writes)

User minta scope Phase 70 diperluas drastis: "semua fitur, data yang di munculkan bisa filter perusahaan" — dikonfirmasi lewat AskUserQuestion bahwa ini beneran LITERALLY setiap modul (bukan cuma dashboard/reporting), dan filter-nya berlaku utk read MAUPUN write (bukan cuma browsing).

**Kenapa gak niru pola Phase 70 (company-picker per halaman) ke 27 halaman**: itu butuh ubah ~30 file handler + ~27 komponen halaman satu-satu — kerjaan multi-hari yg rawan human error. Solusi jauh lebih kecil ternyata memungkinkan krn SEMUA query data bisnis di backend udah baca `c.GetString("company_id")` (di-set sekali oleh `AuthMiddleware` dari JWT), dan SEMUA call API di frontend udah lewat SATU axios instance bersama (`frontend/src/api/client.js`). Jadi filter bisa diimplementasi SEKALI, secara global, transparan ke semua tempat — nol perubahan ke handler/halaman manapun.

**Desain**:
- **Backend**: satu middleware baru, `middleware.CompanyFilter()`, didaftarkan SEKALI di `protected.Use(...)` (routes.go) tepat setelah `AuthMiddleware` — jalan di SEMUA ~150 endpoint terproteksi, sebelum handler ATAU `mp(...)` permission-check manapun jalan. Kalau ada `?company_id=` di query string DAN requester beneran py akses ke company itu (`permission.UserHasCompanyAccess`, di-export dari `permission` package biar bisa dipakai `middleware` tanpa bikin import cycle — sebelumnya helper ini `userHasCompanyAccess` tak-diexport di `handlers/rbac.go`, dipindah jadi `permission.UserHasCompanyAccess`), maka `c.Set("company_id", target)` — OVERWRITE nilai yg udah di-set `AuthMiddleware`. Krn Gin context cuma map yg bisa di-overwrite, SEMUA `c.GetString("company_id")` sesudahnya (di handler manapun) otomatis liat nilai baru ini, TERMASUK `mp(...)`/`MenuPermission` middleware yg jalan SESUDAH `CompanyFilter` di chain — jadi permission tier yg dicek jg ikut ter-scope ke company yg difilter (bukan company aktif sesi). Query param jalan di semua HTTP method (GET/POST/PUT/PATCH/DELETE), jadi otomatis nyakup read+write sesuai keputusan user. Target invalid/gak-punya-akses diam2 diabaikan (fallback ke company sesi asli) — gak pernah error, gak pernah bocor.
- **Frontend**: state baru `companyFilter` (terpisah dari `company` yg reflect JWT session asli) di `authStore.js`, persisted via `partialize`. `setCompanyFilter(company)` set state lalu `window.location.reload()` (sama kaya `switchCompany`, krn gak ada halaman yg invalidate cache company-aware). Request interceptor di `client.js` di-extend: kalau `companyFilter` ke-set, merge `company_id: companyFilter.id` ke `config.params` (spread duluan biar gak nimpa params yg call-site udah kirim). Dropdown baru `CompanyFilterDropdown` di `Header.jsx` (dekat `GlobalSearchBox`/`ThemeToggle`), keisi dari `rbacApi.getCompanies()` (otomatis cuma company yg user itu emang punya akses — gak ada filtering tambahan perlu di client), opsi teratas "Ikuti Perusahaan Saya" utk clear filter.

Halaman Settings > Role & Permission (Phase 70) TETAP independen/gak berubah — selector di sana itu buat milih company mana yg MATRIX PERMISSION-nya mau diedit, konsep beda dari "browsing app sbg company apa" yg filter global ini urusin.

**Diverifikasi (Playwright, DB asli, `hris.employee` sbg modul sehat — hindari `purchasing.pr` yg py bug pre-existing gak terkait)**:
- Company kedua dibikin via `CreateCompany` (superadmin). Employee dibikin di company aktif sesi (tanpa filter) DAN di company kedua (via `?company_id=` eksplisit, TANPA switch session) — kedua tempat berhasil, dan masing2 `GET /hris/employees` (dgn/tanpa filter) cuma nunjukin employee company yg sesuai (gak ada bocor cross-company).
- Permission enforcement ikut ter-scope: role `admin` di-set `hris.employee=edit` di company sesi tapi `none` di company kedua — user dgn role itu (dan akses `user_companies` ke company kedua) BERHASIL akses company sesi (200) tapi DIBLOK (403) begitu filter diarahkan ke company kedua — konfirmasi `MenuPermission` evaluasi company yg DIFILTER, bukan company sesi.
- Negative test: admin lain yg SAMA SEKALI gak py akses ke company kedua — GET dgn `?company_id=` company itu diam2 fallback ke company sendiri (gak liat data company kedua), POST-nya jg diam2 KETULIS ke company sendiri (dikonfirmasi company kedua tetap gak nambah row) — persis pola aman Phase 70, diperluas ke method write.
- Dropdown header dikonfirmasi render & berfungsi di browser asli (button + opsi "Ikuti Perusahaan Saya" muncul).
- `go build ./...`, `go vet ./...`, `npx vite build` semua bersih. Data test dibersihkan total (companies, users, employees, user_companies, role_menu_permissions terkait — semua match pola nama `QA %`/`qa-%@sep.id`/`QA-%`).

`PERMISSION_SYSTEM.md` diupdate (section ini). Project memory diupdate.

### Phase 72 (2026-07-06) — Master matrix User × Perusahaan, plus hardening 2 endpoint lama

User minta: "1 akun login bisa akses beberapa perusahaan. buatkan masternya untuk di mapping ke menu akses" — dikonfirmasi via AskUserQuestion bahwa yg dimaksud BUKAN sekadar nambah dropdown company ke modal "Izin Khusus" per-user yg sudah ada, melainkan **halaman master baru**: satu tabel matrix menampilkan SEMUA user × SEMUA company sekaligus (bukan modal satu-per-satu).

**Backend**:
1. Menu key baru `settings.company_access` — ditambah ke `moduleMenuKeys["settings"]` (menu_permissions.go) dan seed `role_menu_permissions` (db.go, pola sama dgn key `settings.*` lain: superadmin/admin `edit`, role lain `none` by default, admin bisa ubah lewat Role & Permission spt biasa).
2. Handler baru `GetCompanyAccessMatrix` (`rbac.go`) — SATU request mengembalikan `{companies: [...], users: [...tiap user + company_ids gabungan primary+user_companies...]}`, di-scope pakai access-rule YANG SAMA dgn `GetCompanies` (semua company utk superadmin; primary+`user_companies` doang utk role lain) — jadi non-superadmin gak pernah lihat company/user di luar visibility mereka sendiri, walau tampilannya "matrix global".
3. Query re-usable `accessibleCompaniesCTE` (subquery `WITH accessible_companies AS (...)`, param `$1`=role, `$2`=user_id) — dipakai 3x di `GetCompanyAccessMatrix` (companies/users/grants) DAN dipakai ulang utk mengetatkan 2 endpoint LAMA:
   - `GetUserCompanies`: sebelumnya SIAPAPUN dgn tier `settings.users view` bisa baca company access user MANAPUN di sistem tanpa ada hubungan visibility apapun (gap lama dari Phase 69, kebetulan baru kentara pas bikin fitur matrix ini). Sekarang non-superadmin wajib share minimal 1 accessible company dgn target user (`targetUserVisibleSQL`), kalau tidak → 404 spt IDOR-fix Phase 69 yg lain.
   - `UpdateUserCompanies`: sama (ownership check target user), PLUS baru: requester non-superadmin tidak bisa assign company_id yg BUKAN salah satu company yg dia sendiri punya akses — mencegah dipakai utk "menyusupkan" user ke company yg gak related ke requester sama sekali, walau requester py hubungan ke target user-nya. Ditolak 403 kalau ada company_id di luar itu.
4. Route baru `GET /rbac/company-access-matrix`, gated `mp("settings.company_access","view")`.

**Frontend**: tab baru "Akses Perusahaan" (`/settings/company-access`, submenu sidebar baru), komponen `TabCompanyAccessMatrix` — tabel dgn baris=user, kolom=company, checkbox per sel (primary company selalu checked+disabled+badge "Utama"; superadmin semua checked+disabled krn bypass; sel lain togglable, auto-save on-change lewat endpoint `updateUserCompanies` YANG SAMA dipakai modal per-user lama di tab Users — tidak ada endpoint tulis baru). Modal "Akses Perusahaan" di tab Users TETAP ada, tidak dihapus (masih berguna utk workflow "saya lagi urus 1 user ini").

**Diverifikasi (Playwright, DB asli)**: company kedua + 2 user admin baru (satu jadi "target", satu jadi "outsider" tanpa akses ke company kedua) dibikin via superadmin. Matrix superadmin nunjukin company kedua + kedua user baru dgn `company_ids` benar (cuma primary company sebelum grant, nambah company kedua stlh di-grant lewat endpoint yg sama dipakai UI). Outsider login asli → matrix-nya TIDAK menampilkan company kedua (scoping benar) → coba self-grant company kedua lewat raw API (bypass UI) → **403 ditolak** (hardening baru jalan), dikonfirmasi ulang company kedua tetap gak nambah ke outsider stlh percobaan itu. UI matrix di browser asli dikonfirmasi render benar (checkbox superadmin semua ter-check+disabled, target user checked di company kedua, outsider unchecked). `go build`/`go vet`/`npx vite build` bersih. Data test dibersihkan total.

`PERMISSION_SYSTEM.md` diupdate (section ini). Project memory diupdate.

### Phase 73 (2026-07-06) — Fix bug kontras StatCard + Cost Accounting: split in-page report tabs jadi submenu asli (modul ke-28)

Dua permintaan terpisah dari user, dikerjakan berurutan:

1. **Bug**: `http://localhost:3000/accounting/dashboard icon berantakan` — 4 `StatCard` di dashboard Accounting, nilai Rupiah panjang (mis. "Rp 497.500.000") gak bisa wrap (gak ada spasi di dalam angkanya), jadi overflow dan ke-render TUMPANG TINDIH di belakang icon badge kanan atas (icon "berantakan" krn ketutupan/numpuk teks). Fix: `StatCard.jsx`'s value `<p>` ditambah `truncate` + `title` attribute (tooltip nilai lengkap on-hover) — cukup di SATU tempat (component shared), otomatis kefix di SEMUA halaman yg pakai StatCard, bukan cuma Accounting.

2. **Cost Accounting (`/cost/laporan`)**: "tampilan kurang menarik, dan masih ada tap menu. buatkan jadi sub menu saja di menu nav". Investigasi nemuin 2 masalah:
   - **Tab in-page tersisa**: tab "Laporan & Analisis" py 4 sub-report (Analisis Varians/COGS/Profitabilitas/Cost Center Report) yg di-switch pakai TAB BAR internal (`activeReport` state) — pola lama sebelum konversi Phase 39-68, belum ikut dikonversi jadi submenu sidebar asli walau modul Cost Accounting sendiri sudah py submenu (Cost Center/Biaya WO/Standard Cost/Laporan).
   - **Bug kontras yg SAMA** kayak StatCard tapi versi manual: KPI card di halaman ini pakai div custom (bukan `StatCard` component) dgn `text-white` hardcoded utk nilai (didesain utk card gradient GELAP), tapi background card-nya translucent pastel TERANG (mis. `from-indigo-500/20 to-indigo-600/10`) — nilai jadi nyaris gak kebaca (putih di atas terang). Sama persis kejadian di sub-stat COGS Report (`text-white` di 2 dari 4 mini-card).
   - **Fix**: 4 sub-report dipecah jadi 4 komponen terpisah (`VarianceReportTab`, `CogsReportTab`, `ProfitabilityReportTab`, `CenterReportTab`), masing2 py route sendiri — `/cost/laporan` (tetap, jadi "Analisis Varians"), `/cost/cogs`, `/cost/profitability`, `/cost/center-report` (BARU). KPI card lama diganti pakai `StatCard` component yg sudah benar (dan otomatis dapat fix truncate dari poin 1 di atas). Header periode+KPI di-extract ke `CostReportHeader` shared component, dipakai ke-4 tab (DRY, tiap tab tetap py `period` state sendiri2 — konsisten pola existing kayak `WOCostTab`/`StandardCostTab`).
   - **Struktur sidebar, DIKOREKSI user stlh percobaan pertama**: percobaan awal nampilin ke-4 route itu sbg 4 item SEJAJAR (sibling) langsung di bawah Cost Accounting, sejajar dgn Cost Center/Biaya WO/Standard Cost — user koreksi 2x ("maksud saya ada sub menu lagi setelah sub menu", lalu "jangan malah di pisah buat sub menu lagi") krn yg dimaksud adalah **submenu BERTINGKAT 2 LEVEL**: "Laporan & Analisis" tetap SATU item sejajar dgn 3 lainnya, tapi item itu SENDIRI bisa expand utk nampilin ke-4 sub-report di bawahnya (nested, bukan flat). Ini butuh nambah dukungan nested-children generik di `Sidebar.jsx` (sebelumnya cuma 1 level `children`) — `visibleItems` builder skrng rekursif filter grandchildren juga, `expanded` Set (state yg sama, path itu unik jadi aman dipakai bareng utk 2 level), auto-expand effect ikut expand grandparent+parent kalau route aktif ada di level manapun, dan komponen baru `NestedSubmenu` utk render level ke-2 (indent lebih dalam, chevron sendiri). Kapasitas nested ini generik — modul lain bisa pakai pola yg sama kalau butuh nanti, cukup kasih `children` di dalam salah satu child.
   - **Backend**: 3 menu_key baru `cost.cogs`, `cost.profitability`, `cost.centerreport` (moduleMenuKeys + db.go seed, tier default sama kayak `cost.laporan` existing: superadmin edit, admin view, finance edit, dst). **PENTING, sempat KELEWAT lalu diperbaiki**: awalnya cuma nambah menu_key doang tapi LUPA update route gating — routes.go's 4 endpoint (`/cost/variance`, `/cost/cogs`, `/cost/profitability`, `/cost/center-report`) semua MASIH gated `mp("cost.laporan","view")` yg lama, jadi menu_key baru gak ngefek APAPUN ke enforcement asli (silent no-op bug — ketauan sblm keburu declare selesai, krn langsung diverifikasi end-to-end bukan cuma cek build doang). Fix: masing2 endpoint digated ke menu_key barunya sendiri2, `/cost/summary` (backing shared KPI header di ke-4 tab) sengaja TETAP di `cost.laporan` biar gak ngeblok role yg cuma py 1 dari 4 tier itu — trade-off didokumentasikan di komentar kode.
   - **Diverifikasi (Playwright, DB asli)**: role `finance` di-set `cost.cogs=none` (3 key lain tetap `view`) → GET `/cost/variance`+`/cost/profitability` 200, GET `/cost/cogs` **403** — konfirmasi ke-4 key ENFORCE independen (bukan cuma UI/sidebar filtering doang). Sidebar submenu "COGS Report" ilang khusus role itu, 2 lainnya tetap tampil. Screenshot before/after konfirmasi kontras teks fixed + tab bar in-page hilang total. Struktur nested (poin di atas) diverifikasi terpisah: screenshot konfirmasi "Laporan & Analisis" tampil SATU item lalu expand ke 4 sub-item terindentasi, toggle collapse/expand berfungsi (klik sekali collapse, klik lagi expand), klik salah satu sub-item (COGS Report) berhasil navigasi ke `/cost/cogs`. `go build`/`go vet`/`npx vite build` bersih. Permission test user dihapus, tier `finance` role dikembalikan ke default (`edit`) lewat endpoint resmi (`POST /rbac/menu-permissions`), BUKAN raw SQL — auto-mode classifier menolak percobaan raw `UPDATE` langsung ke DB shared, benar sesuai desain (perubahan config permission harus lewat jalur ter-audit, bukan SQL manual).

`PERMISSION_SYSTEM.md` diupdate (section ini + tabel modul, Cost Accounting kini py 7 menu_key bukan 4). Project memory diupdate.
