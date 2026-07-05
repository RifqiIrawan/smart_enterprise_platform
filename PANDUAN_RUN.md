# Panduan Menjalankan Smart Enterprise Platform

## Prasyarat

- **Go** 1.21+ sudah terinstall
- **Node.js** 18+ dan **npm** sudah terinstall
- **PostgreSQL** (opsional — tanpa DB berjalan dalam demo mode)

---

## 1. Menjalankan Backend (Go — Port 8080)

Buka terminal, lalu jalankan:

### Menggunakan binary yang sudah ada

```powershell
cd C:\xampp7.4\htdocs\Smart_Enterprise_Platform\backend
.\sep-backend.exe
```

### Build ulang lalu jalankan

```powershell
cd C:\xampp7.4\htdocs\Smart_Enterprise_Platform\backend
go build -o sep-backend.exe ./cmd/server
.\sep-backend.exe
```

Backend siap ketika muncul log:

```
[GIN-debug] Listening and serving HTTP on :8080
```

---

## 2. Menjalankan Frontend (React + Vite — Port 5173)

Buka terminal **baru** (jangan tutup terminal backend), lalu jalankan:

```powershell
cd C:\xampp7.4\htdocs\Smart_Enterprise_Platform\frontend
npm run dev
```

Frontend siap ketika muncul:

```
  VITE ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Buka browser dan akses: **http://localhost:5173**

---

## 3. Urutan yang Benar

```
1. Jalankan Backend  →  port 8080
2. Jalankan Frontend →  port 5173
3. Buka browser      →  http://localhost:5173
```

> Backend harus berjalan lebih dulu sebelum frontend agar API call tidak error.
> Jika backend tidak aktif, aplikasi tetap bisa dibuka tetapi berjalan dalam **demo mode** — data tidak tersimpan ke database.

---

## 4. Login

| Cara | Email | Password |
|------|-------|----------|
| Manual | akun Anda | password Anda |
| Demo (klik tombol) | `admin@sep.id` | `admin123` |

---

## 5. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Port 8080 sudah terpakai | Tutup proses lain yang menggunakan port tersebut |
| Port 5173 sudah terpakai | Vite otomatis pindah ke port berikutnya (5174, dst.) |
| `go: command not found` | Install Go dari https://go.dev/dl/ |
| `npm: command not found` | Install Node.js dari https://nodejs.org/ |
| Frontend tidak bisa konek ke API | Pastikan backend sudah berjalan di port 8080 |
| Database error saat start | Backend akan fallback ke demo mode secara otomatis |
