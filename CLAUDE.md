# CLAUDE.md — Backend Posyandu (Monitoring Kesehatan Ibu & Anak)

REST API untuk kader posyandu: mencatat pemeriksaan ibu hamil & balita, melihat riwayat, mencari peserta, dan membuat rekap bulanan. Fase 1 = tugas modul Backend Development (Express.js + PostgreSQL) yang akan dikembangkan menjadi produk utuh.

## Baca dulu sebelum menulis kode

| Dokumen | Isi | Kapan dibaca |
|---|---|---|
| `docs/07-implementation-plan.md` | Urutan milestone + Definition of Done | Selalu; kerjakan berurutan |
| `docs/05-api-spec.md` | **Kontrak endpoint** (path, body, respons, status) | Saat membuat route/controller/service |
| `docs/04-erd.md` | DDL, kamus data, **aturan validasi** | Saat menulis SQL atau validator |
| `docs/03-architecture.md` | Struktur folder, lapis, auth, error, tanggal | Saat membuat file baru |
| `docs/06-decisions.md` | Alasan keputusan desain | Sebelum mengubah sesuatu yang tampak "aneh" |
| `docs/02-prd.md` | Kebutuhan fungsional (FR-xx) & ruang lingkup | Saat ragu apakah fitur termasuk Fase 1 |

Jika kode dan dokumen bertentangan, **dokumen adalah acuan**. Jika dokumen perlu diubah, ubah dokumennya juga dan tanyakan dulu ke pengguna untuk perubahan kontrak API atau skema.

## Stack
Node.js 22 · Express 5 · `pg` (tanpa ORM) · zod · bcryptjs · jsonwebtoken · helmet · cors · express-rate-limit · morgan · dotenv · nodemon. CommonJS.

## Perintah
```bash
npm run dev          # server development (nodemon)
npm start            # server production
npm run db:schema    # jalankan database/schema.sql
npm run db:seed      # jalankan database/seed.sql
npm run db:reset     # drop + schema + seed (development saja)
npm test             # tes integrasi; memakai DB terpisah <nama db>_test
```

## Aturan wajib
- **Lapis:** routes → controllers → services. SQL **hanya** di `src/services/`. Controller tidak menyentuh `pg`.
- **SQL selalu terparameter** (`$1`, `$2`, ...). Jangan pernah menyambung string input ke SQL.
- **Soft delete:** setiap SELECT pada `ibu`, `balita`, `pemeriksaan_*` memfilter `deleted_at IS NULL`, **termasuk tabel induk yang di-JOIN**. DELETE = `UPDATE ... SET deleted_at = NOW()`.
- **Scoping posyandu:** setiap akses data di-scope ke `req.user.posyandu_id` (lewat `ibu.posyandu_id`). Data posyandu lain → **404**.
- **Field dari server, bukan body:** `kader_id` = `req.user.id`, `posyandu_id` = `req.user.posyandu_id`.
- **Jangan pernah** mengembalikan `password_hash`. Pilih kolom kader secara eksplisit.
- **Amplop respons** selalu `{ success, message, data, meta? }` / `{ success: false, message, errors? }`. Pakai helper di `src/utils/response.js` dan lempar `ApiError` untuk error.
- **Validasi** dengan zod lewat middleware `validate`. Hasilnya dibaca dari `req.validated`. **Jangan menimpa `req.query`** (read-only di Express 5).
- Rentang validasi di `src/validators/` **harus sama** dengan `CHECK` di `database/schema.sql` (acuan: `docs/04-erd.md` §5).
- Setiap `UPDATE` menyertakan `updated_at = NOW()`.
- Pesan untuk pengguna (message, errors) dalam **Bahasa Indonesia**. Nama tabel/kolom/field JSON `snake_case` Bahasa Indonesia.
- `database/schema.sql` tidak boleh berisi `CREATE FUNCTION`/`TRIGGER` (harus bisa diimpor ke dbdiagram).

## Jebakan yang sudah diketahui
- `pg` mengubah `DATE` menjadi `Date` JS dan tanggal bisa bergeser sehari. Sudah ditangani dengan `types.setTypeParser(1082, v => v)` di `src/db/pool.js`.
- `pg` mengembalikan `NUMERIC` dan `COUNT(*)` sebagai string. Pakai type parser 1700 → `parseFloat`, dan `COUNT(*)::int`.
- "Hari ini" harus dalam WIB (`Asia/Jakarta`), bukan `toISOString()` (UTC). Pakai `todayWIB()` di `src/utils/date.js`.
- Kode error pg: `23505` unique → 409, `23503` FK → 409, `23514` check → 400, `22P02` → 400. Pemetaan nama constraint ada di `docs/03-architecture.md` §8.

## Di luar lingkup Fase 1 — jangan dibuat tanpa diminta
Grafik/status gizi WHO, indikator risiko, jadwal/pengingat, imunisasi, ekspor PDF/Excel, dashboard statistik, akun ibu, endpoint multi-posyandu, refresh token.

## Ketentuan tugas yang tidak boleh terlewat
- `.gitignore` memuat `node_modules` dan `.env`.
- 5 route CRUD lengkap diuji di Postman (contoh utama: `/api/balita`).
- `database/schema.sql` bisa diimpor ke dbdiagram (Import → PostgreSQL).
- Repo GitHub publik.
