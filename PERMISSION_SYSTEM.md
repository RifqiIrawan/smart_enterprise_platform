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
| 7 halaman lainnya (Approval Center, Executive Dashboard, Integration, Customer Portal, Vendor Portal, Print Center, Supply Chain) | — | ⏳ Belum — masih pakai tab lama |

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
