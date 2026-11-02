# Architecture — Backend Posyandu

Dokumen ini menjelaskan **bagaimana** backend dibangun: teknologi, struktur, alur request, autentikasi, penanganan error, dan konvensi kode. Kebutuhan ada di [PRD](02-prd.md), skema di [ERD](04-erd.md), kontrak endpoint di [API Spec](05-api-spec.md).

## 1. Gambaran sistem

```mermaid
flowchart LR
    FE["Frontend web<br/>(Fase 2)"] -- "HTTPS + JWT" --> API
    PM["Postman<br/>(Fase 1)"] -- "HTTP + JWT" --> API
    subgraph API["Express.js REST API"]
      direction TB
      MW["Middleware<br/>helmet · cors · json · auth · validate"] --> R["Routes"] --> C["Controllers"] --> S["Services<br/>(logika + SQL)"]
    end
    S -- "pg Pool<br/>query terparameter" --> DB[("PostgreSQL")]
```

Monolit sederhana dengan **tiga lapis** (routes → controllers → services). Tidak ada ORM: SQL ditulis langsung dengan `pg`, sesuai ketentuan tugas dan agar skema tetap persis seperti `schema.sql`.

## 2. Teknologi

| Kebutuhan | Pilihan | Catatan |
|---|---|---|
| Runtime | Node.js 22 LTS (minimal 20) | |
| Framework | Express **5.x** | Error dari handler `async` otomatis diteruskan ke error handler, tanpa `try/catch` di setiap controller |
| Database driver | `pg` (Pool) | |
| Validasi | `zod` | Skema per endpoint di `src/validators/` |
| Hash password | `bcryptjs` | Pure JS, tanpa kompilasi native (aman di Windows) |
| Token | `jsonwebtoken` | HS256 |
| Keamanan HTTP | `helmet`, `cors`, `express-rate-limit` | Rate limit hanya di `/api/auth/login` |
| Log request | `morgan` | Format `dev` di development |
| Konfigurasi | `dotenv` | |
| Dev | `nodemon` | |
| Modul | CommonJS (`require`) | Paling umum di materi Express; tidak perlu konfigurasi tambahan |

## 3. Struktur folder

```
./                             # root repo
├── CLAUDE.md
├── README.md
├── .env.example
├── .gitignore                 # node_modules, .env  (ketentuan tugas)
├── package.json
├── database/
│   ├── schema.sql             # DDL — lihat docs/04-erd.md §4
│   ├── seed.sql               # posyandu + admin + data demo
│   └── run.js                 # runner db:schema / db:seed / db:reset (lihat §11)
├── postman/
│   └── posyandu-api.postman_collection.json
├── docs/                      # dokumen ini
└── src/
    ├── server.js              # baca env, app.listen()
    ├── app.js                 # rakit middleware + routes; diekspor untuk testing
    ├── config/
    │   └── env.js             # baca & validasi env (zod); gagal → proses berhenti
    ├── db/
    │   └── pool.js            # new Pool(), type parser, helper query & transaksi
    ├── middlewares/
    │   ├── authenticate.js    # verifikasi JWT, muat kader aktif → req.user
    │   ├── authorize.js       # authorize('admin')
    │   ├── validate.js        # validate({ body, params, query }) → req.validated
    │   ├── notFound.js
    │   └── errorHandler.js
    ├── routes/
    │   ├── index.js           # pasang semua router di /api
    │   ├── auth.routes.js
    │   ├── kader.routes.js
    │   ├── posyandu.routes.js
    │   ├── ibu.routes.js
    │   ├── balita.routes.js
    │   ├── pemeriksaanBalita.routes.js
    │   ├── pemeriksaanIbuHamil.routes.js
    │   └── laporan.routes.js
    ├── controllers/           # satu file per resource; tipis: ambil input → panggil service → kirim respons
    ├── services/              # satu file per resource; logika bisnis + SQL
    ├── validators/            # skema zod per resource + skema umum (id, paginasi, tanggal)
    └── utils/
        ├── ApiError.js        # class ApiError(status, message, errors?)
        ├── response.js        # ok(res, data, message, meta), created(...)
        ├── pagination.js      # parse page/limit → { limit, offset }, buat meta
        └── date.js            # todayWIB(), usiaBulan(), rentang bulan
```

**Aturan lapis:**
- **Routes:** hanya mendefinisikan path, middleware (`authenticate`, `authorize`, `validate`), dan controller.
- **Controllers:** tidak berisi SQL. Membaca `req.validated` dan `req.user`, memanggil service, lalu mengirim respons lewat `utils/response.js`.
- **Services:** satu-satunya tempat SQL. Menerima `posyanduId` sebagai parameter eksplisit (jangan membaca `req`). Melempar `ApiError` untuk kasus bisnis (404, 409).

## 4. Alur request

```mermaid
sequenceDiagram
    participant K as Klien
    participant A as authenticate
    participant V as validate(zod)
    participant C as Controller
    participant S as Service
    participant D as PostgreSQL
    K->>A: POST /api/pemeriksaan-balita (Bearer token)
    A->>D: SELECT kader aktif by id (dari token)
    A-->>K: 401 jika token invalid / kader nonaktif
    A->>V: req.user = {id, role, posyandu_id}
    V-->>K: 400 + errors[] jika body tidak valid
    V->>C: req.validated.body
    C->>S: create(posyanduId, kaderId, data)
    S->>D: cek balita milik posyandu + tanggal ≥ tgl lahir
    S-->>K: 404 / 400 lewat ApiError
    S->>D: INSERT ... RETURNING *
    D-->>S: row (atau 23505 → 409)
    S->>C: data
    C->>K: 201 { success, message, data }
```

## 5. Autentikasi & otorisasi

- **Login:** `POST /api/auth/login` → cari `kader` by `username` → `bcrypt.compare`. Username tidak ada, password salah, dan akun nonaktif semuanya menghasilkan **401 dengan pesan yang sama** ("Username atau password salah") agar tidak membocorkan username yang valid.
- **Token:** JWT HS256, payload `{ sub: kader.id, role, posyandu_id }`, masa berlaku `JWT_EXPIRES_IN` (default `8h`, satu hari kegiatan posyandu). Tidak ada refresh token di Fase 1.
- **Middleware `authenticate`:** membaca header `Authorization: Bearer <token>`, memverifikasi token, lalu **memuat ulang kader dari DB** dan menolak (401) jika sudah tidak ada atau `is_active = false`. Dengan cara ini penonaktifan akun langsung berlaku tanpa daftar hitam token. `req.user = { id, nama, username, role, posyandu_id }`.
- **Middleware `authorize(...roles)`:** 403 jika `req.user.role` tidak termasuk.
- **Scoping posyandu:** setiap query ke `ibu` menyertakan `WHERE posyandu_id = $n`. `balita` dan pemeriksaan di-scope lewat JOIN ke `ibu`. Data milik posyandu lain diperlakukan sebagai **404**, bukan 403.

| Resource | `kader` | `admin` |
|---|---|---|
| `/auth/*` | ✅ | ✅ |
| `/ibu`, `/balita`, `/pemeriksaan-*`, `/laporan` | ✅ | ✅ |
| `GET /posyandu` | ✅ | ✅ |
| `PUT /posyandu` | ❌ 403 | ✅ |
| `/kader` | ❌ 403 | ✅ |

## 6. Database access

`src/db/pool.js`:

```js
const { Pool, types } = require('pg');

// DATE (OID 1082) → string 'YYYY-MM-DD' apa adanya.
// Tanpa ini, pg mengubahnya menjadi Date JS pada tengah malam waktu lokal,
// dan tanggal bisa bergeser satu hari saat diserialisasi ke JSON (UTC).
types.setTypeParser(1082, (v) => v);

// NUMERIC (OID 1700) → number. Default pg mengembalikan string.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
```

Aturan:
- **Selalu query terparameter** (`$1, $2, ...`). Jangan menyusun SQL dari string input. Untuk filter dinamis, susun array kondisi + array nilai.
- `COUNT(*)` mengembalikan `bigint` (string di pg). Cast dengan `COUNT(*)::int`.
- Setiap `UPDATE` menyertakan `updated_at = NOW()`.
- Setiap `SELECT` pada tabel ber-`deleted_at` menyertakan `deleted_at IS NULL`, termasuk pada tabel induk yang di-JOIN.
- **Soft delete:** `UPDATE ... SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`.
- Operasi multi-statement (mis. cek admin terakhir lalu nonaktifkan) memakai transaksi: `client = await pool.connect(); BEGIN ... COMMIT/ROLLBACK; client.release()`.
- Jangan pernah `SELECT *` dari `kader` ke respons. Pilih kolom eksplisit tanpa `password_hash`.

## 7. Validasi

- Middleware `validate({ body, params, query })` menjalankan `schema.safeParse()` dan menyimpan hasilnya di **`req.validated`**. Jangan menimpa `req.query`, karena di Express 5 properti itu *read-only getter*.
- Gagal → `ApiError(400, 'Data tidak valid', errors)`, di mana `errors = issues.map(i => ({ field: i.path.join('.'), message: i.message }))`.
- Pesan error zod ditulis dalam Bahasa Indonesia (mis. `"Berat badan wajib diisi"`, `"Berat badan harus antara 0,5 dan 40 kg"`).
- Body POST memakai skema *create* (kolom wajib = required). Body PUT memakai skema yang sama (PUT = ganti penuh; lihat [ADR-007](06-decisions.md)).
- Field yang tidak dikenal dibuang (`.strip()`, default zod). Field yang diisi server (`kader_id`, `posyandu_id`, `id`, timestamp) tidak pernah diambil dari body.
- String kosong pada field opsional (`""`) diperlakukan sebagai `null`.
- Validasi yang butuh database (tanggal kunjungan vs tanggal lahir, kepemilikan posyandu, usia < 60 bulan) dilakukan di **service**.

## 8. Penanganan error

`errorHandler` adalah satu-satunya tempat yang membentuk respons error:

| Sumber | Status | `message` |
|---|---|---|
| `ApiError` | sesuai `status` | sesuai |
| JSON body rusak (`SyntaxError` dengan `type === 'entity.parse.failed'`) | 400 | "Format JSON tidak valid" |
| pg `23505` unique_violation | 409 | Dipetakan dari nama constraint (tabel di bawah) |
| pg `23503` foreign_key_violation | 409 | "Data masih digunakan oleh data lain" |
| pg `23514` check_violation | 400 | "Nilai di luar rentang yang diizinkan" + `errors[].field` dari nama constraint bila bisa |
| pg `22P02` invalid_text_representation | 400 | "Format data tidak valid" |
| JWT invalid/expired | 401 | "Sesi tidak valid, silakan login ulang" |
| Lainnya | 500 | "Terjadi kesalahan pada server" (detail hanya di log; `stack` hanya ditampilkan bila `NODE_ENV=development`) |

Pemetaan constraint unik:

| Constraint | Pesan | `field` |
|---|---|---|
| `uq_ibu_nik_aktif` | "NIK ibu sudah terdaftar" | `nik` |
| `uq_balita_nik_aktif` | "NIK balita sudah terdaftar" | `nik` |
| `uq_pb_per_tanggal` | "Balita ini sudah memiliki pemeriksaan pada tanggal tersebut" | `tanggal_kunjungan` |
| `uq_pih_per_tanggal` | "Ibu ini sudah memiliki pemeriksaan pada tanggal tersebut" | `tanggal_kunjungan` |
| `kader_username_key` | "Username sudah digunakan" | `username` |

## 9. Tanggal & zona waktu

- Kolom bisnis bertipe `DATE` dan dikirim/diterima sebagai string `YYYY-MM-DD`.
- "Hari ini" dihitung dalam WIB: `new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())`. Jangan memakai `new Date().toISOString().slice(0,10)` (UTC: salah antara pukul 00.00–07.00 WIB).
- Usia dalam bulan dihitung di SQL: `(EXTRACT(YEAR FROM AGE(ref, tanggal_lahir)) * 12 + EXTRACT(MONTH FROM AGE(ref, tanggal_lahir)))::int`.
- Timestamp (`created_at`, dll.) bertipe `TIMESTAMPTZ` dan dikirim sebagai ISO 8601.

## 10. Konfigurasi (`.env.example`)

```dotenv
NODE_ENV=development
PORT=3000

# PostgreSQL
DATABASE_URL=postgres://postgres:postgres@localhost:5432/posyandu

# JWT — wajib diganti; minimal 32 karakter acak
JWT_SECRET=ganti-dengan-string-acak-minimal-32-karakter
JWT_EXPIRES_IN=8h

# Origin frontend yang diizinkan (pisahkan dengan koma)
CORS_ORIGIN=http://localhost:5173

# Rate limit login: maksimal percobaan per 15 menit per IP
LOGIN_RATE_LIMIT=10
```

`config/env.js` memvalidasi variabel ini dengan zod saat start. Jika `JWT_SECRET` kosong atau kurang dari 32 karakter, aplikasi berhenti dengan pesan yang jelas.

## 11. Skrip npm

| Skrip | Perintah |
|---|---|
| `npm run dev` | `nodemon src/server.js` |
| `npm start` | `node src/server.js` |
| `npm run db:schema` | `node database/run.js schema` |
| `npm run db:seed` | `node database/run.js seed` |
| `npm run db:reset` | `node database/run.js reset`: drop & buat ulang schema `public`, lalu schema + seed (**ditolak bila `NODE_ENV=production`**) |

`database/run.js` memuat `.env` (dotenv), membaca file SQL, dan menjalankannya dengan satu `client.query()` lewat `pg`. Skrip ini tidak memakai `psql` karena `"$DATABASE_URL"` tidak terbaca di cmd Windows (shell bawaan npm di Windows) dan `psql` sering tidak ada di PATH.

## 12. Pengujian

- **Fase 1 (wajib tugas):** koleksi Postman di `postman/`, dengan variabel koleksi `baseUrl` dan `token`. Request login menyimpan token otomatis lewat *Tests script* (`pm.collectionVariables.set('token', ...)`). Setiap resource punya folder berisi 5 request CRUD + minimal satu contoh gagal validasi (400) dan satu contoh duplikat (409).
- **Tes otomatis (`npm test`):** `node:test` bawaan Node di `test/`, memanggil `app.js` lewat `fetch` (tanpa dependency tambahan). Memakai database terpisah `<nama db>_test` yang dibuat otomatis lalu di-reset setiap run, sehingga database kerja tidak tersentuh.

## 13. Deployment (Fase 2, garis besar)

API dan PostgreSQL di layanan terkelola (mis. Railway / Render / VPS), HTTPS wajib, `NODE_ENV=production`, `JWT_SECRET` unik, `CORS_ORIGIN` diisi domain frontend, backup database harian.
