# Backend Posyandu — Monitoring Kesehatan Ibu & Anak

REST API (Express.js + PostgreSQL) untuk kader posyandu: mengelola data ibu dan balita, mencatat pemeriksaan, mencari peserta, dan merekap data bulanan. Dokumen desain ada di [`docs/`](docs/).

## Prasyarat
- Node.js ≥ 20
- PostgreSQL ≥ 13

## Setup
```bash
npm install
cp .env.example .env        # lalu isi DATABASE_URL dan JWT_SECRET (min. 32 karakter)
createdb posyandu           # atau buat database "posyandu" lewat pgAdmin
npm run db:reset            # buat tabel + isi data demo
npm run dev                 # http://localhost:3000/api
```

## Akun demo (dari `database/seed.sql`)
| Username | Password | Role |
|---|---|---|
| `admin` | `admin12345` | admin |
| `sri` | `kader12345` | kader |

Ganti password admin setelah login pertama (`PATCH /api/auth/password`).

## Pemakaian singkat
1. `POST /api/auth/login` dengan `{"username":"admin","password":"admin12345"}` → ambil `data.token`.
2. Kirim token di header `Authorization: Bearer <token>` untuk endpoint lain.
3. Contoh CRUD: `GET/POST /api/balita`, `GET/PUT/DELETE /api/balita/:id`.

Daftar lengkap endpoint: [`docs/05-api-spec.md`](docs/05-api-spec.md). Skema database: [`docs/04-erd.md`](docs/04-erd.md).

Catatan: `DELETE` memakai *soft delete* — data hilang dari API tetapi baris tetap tersimpan di database (kolom `deleted_at`).

## Perintah
| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server development (nodemon) |
| `npm start` | Server production |
| `npm run db:schema` / `db:seed` / `db:reset` | Jalankan `schema.sql` / `seed.sql` / keduanya dari nol |
| `npm test` | Tes integrasi (memakai database terpisah `<nama db>_test`) |
