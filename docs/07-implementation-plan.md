# Implementation Plan — Backend Fase 1

Urutan pengerjaan yang disarankan. Setiap milestone diakhiri dengan pemeriksaan yang bisa dijalankan. Centang saat selesai.

## M0 — Setup project
- [x] `npm init`, pasang dependency ([Architecture §2](03-architecture.md#2-teknologi))
- [x] `.gitignore` berisi **`node_modules`** dan **`.env`** (ketentuan tugas)
- [x] `.env.example`, `src/config/env.js` (validasi env dengan zod)
- [x] Struktur folder sesuai [Architecture §3](03-architecture.md#3-struktur-folder) (folder lain dibuat saat file pertamanya ditulis)
- **Cek:** `npm run dev` jalan dan berhenti dengan pesan jelas bila `JWT_SECRET` kosong.

## M1 — Database
- [x] `database/schema.sql` dari [ERD §4](04-erd.md#4-ddl-referensi-databaseschemasql)
- [x] `database/seed.sql`: posyandu, admin (hash bcrypt), data demo ([ERD §6](04-erd.md#6-seed-databaseseedsql))
- [x] `src/db/pool.js` dengan type parser DATE & NUMERIC
- [x] `GET /api/health`
- [ ] Impor `schema.sql` ke dbdiagram, share publik, simpan link *(dikerjakan pengguna)*
- **Cek:** `npm run db:reset` sukses; `GET /api/health` → `database: connected`.

## M2 — Fondasi API
- [x] `utils/ApiError`, `utils/response`, `utils/pagination`, `utils/date`
- [x] Middleware `validate`, `notFound`, `errorHandler` (termasuk pemetaan error pg → [Architecture §8](03-architecture.md#8-penanganan-error))
- [x] `helmet`, `cors`, `express.json()`, `morgan`
- **Cek:** route tak dikenal → 404 berformat amplop; body JSON rusak → 400.

## M3 — Auth & kader
- [x] `POST /auth/login` (+ rate limit), `GET /auth/me`, `PATCH /auth/password`
- [x] Middleware `authenticate`, `authorize`
- [x] CRUD `/kader` + `PATCH /kader/:id/password` dengan aturan admin terakhir
- [x] `GET/PUT /posyandu`
- **Cek:** kader biasa → 403 di `/kader`; kader dinonaktifkan → token lamanya 401.

## M4 — Ibu & balita (5 route tugas)
- [x] CRUD `/ibu` + pencarian `q` + filter `kunjungan_dari/sampai` + filter `hamil=true` + paginasi
- [x] CRUD `/balita` + pencarian + filter
- [x] Aturan: NIK unik → 409; ibu dengan balita aktif tidak bisa dihapus → 409
- **Cek:** 5 route `/balita` lulus di Postman (sudah lulus di `npm test`; screenshot Postman di M7). **Syarat minimum tugas sudah terpenuhi pada titik ini.**

## M5 — Pemeriksaan & riwayat
- [ ] CRUD `/pemeriksaan-balita`, CRUD `/pemeriksaan-ibu-hamil`
- [ ] Validasi service: kepemilikan, tanggal ≥ tanggal lahir, usia < 60 bulan, duplikat tanggal → 409
- [ ] `GET /balita/:id/pemeriksaan`, `GET /ibu/:id/pemeriksaan`
- **Cek:** BB kosong → 400 dengan `errors[].field = "berat_badan"`; input tanggal sama dua kali → 409.

## M6 — Rekap bulanan
- [ ] `GET /laporan/bulanan` untuk `balita` dan `ibu_hamil` ([API Spec §Laporan](05-api-spec.md#laporan))
- **Cek:** angka sesuai data seed; bulan kosong → 200 dengan nol.

## M7 — Postman & penyerahan tugas
- [ ] Koleksi `postman/posyandu-api.postman_collection.json` (variabel `baseUrl`, `token`, login menyimpan token otomatis)
- [ ] Screenshot 5 route (`/balita`: POST, GET semua, GET by ID, PUT, DELETE)
- [ ] `README.md`: prasyarat, setup, `.env`, perintah DB, akun seed, link dbdiagram
- [ ] Push ke repo GitHub publik; pastikan `node_modules` dan `.env` tidak ikut
- [ ] Isi template laporan: link dbdiagram, link repo, screenshot, deskripsi studi kasus Posyandu (ganti contoh "Kegiatan Desa")
- [ ] Di deskripsi laporan, jelaskan: DELETE = soft delete (baris tetap ada di DB, hilang dari API); login + peran admin ditambahkan demi keamanan data NIK; ekspor PDF/Excel ditunda (ADR-013)

## Definition of Done (setiap endpoint)
- Mengikuti kontrak di [API Spec](05-api-spec.md): path, status code, amplop, nama field
- Input divalidasi zod; field server (`kader_id`, `posyandu_id`) tidak diambil dari body
- Di-scope ke posyandu pengguna; data posyandu lain → 404
- Memfilter `deleted_at IS NULL` (termasuk tabel induk)
- Tidak pernah mengembalikan `password_hash`
- Ada request-nya di koleksi Postman
