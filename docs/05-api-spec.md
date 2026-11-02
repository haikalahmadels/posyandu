# API Specification — Backend Posyandu

Base URL: `http://localhost:3000/api` · Format: JSON (`Content-Type: application/json`) · Autentikasi: `Authorization: Bearer <token>` (kecuali ditandai 🔓)

Aturan validasi tiap field: [ERD §5](04-erd.md#5-aturan-validasi). Arsitektur: [Architecture](03-architecture.md).

## Daftar endpoint

| # | Method | Path | Akses | Fitur |
|---|---|---|---|---|
| 1 | GET | `/health` | 🔓 | Cek server + koneksi DB |
| 2 | POST | `/auth/login` | 🔓 | FR-01 |
| 3 | GET | `/auth/me` | semua | FR-03 |
| 4 | PATCH | `/auth/password` | semua | FR-04 |
| 5 | GET | `/posyandu` | semua | Profil posyandu milik akun |
| 6 | PUT | `/posyandu` | admin | Ubah profil posyandu |
| 7–11 | GET · GET/:id · POST · PUT/:id · DELETE/:id | `/kader` | admin | FR-05 |
| 12 | PATCH | `/kader/:id/password` | admin | Reset password kader |
| 13–17 | GET · GET/:id · POST · PUT/:id · DELETE/:id | `/ibu` | semua | FR-10, UF03 |
| 18 | GET | `/ibu/:id/pemeriksaan` | semua | UF01 (riwayat ibu hamil) |
| 19–23 | GET · GET/:id · POST · PUT/:id · DELETE/:id | `/balita` | semua | FR-11, UF03 |
| 24 | GET | `/balita/:id/pemeriksaan` | semua | UF01 (riwayat balita) |
| 25–29 | GET · GET/:id · POST · PUT/:id · DELETE/:id | `/pemeriksaan-balita` | semua | UF02 |
| 30–34 | GET · GET/:id · POST · PUT/:id · DELETE/:id | `/pemeriksaan-ibu-hamil` | semua | UF02 |
| 35 | GET | `/laporan/bulanan` | semua | UF04 |

---

## Konvensi

### Amplop respons

**Sukses**
```json
{
  "success": true,
  "message": "Data balita berhasil diambil",
  "data": { },
  "meta": { "page": 1, "limit": 10, "total": 42, "total_pages": 5 }
}
```
`meta` hanya ada pada endpoint daftar (list).

**Gagal**
```json
{
  "success": false,
  "message": "Data tidak valid",
  "errors": [
    { "field": "berat_badan", "message": "Berat badan wajib diisi" },
    { "field": "tinggi_badan", "message": "Tinggi badan harus antara 30 dan 130 cm" }
  ]
}
```
`errors` hanya ada bila relevan (400 validasi, 409 duplikat).

### Kode status

| Kode | Kapan |
|---|---|
| 200 | GET, PUT, PATCH, DELETE berhasil |
| 201 | POST berhasil membuat data |
| 400 | Validasi gagal, JSON rusak, nilai di luar rentang |
| 401 | Tidak ada token, token invalid/kedaluwarsa, akun nonaktif, login gagal |
| 403 | Role tidak berhak (kader mengakses `/kader`) |
| 404 | Data tidak ada, sudah dihapus, atau milik posyandu lain; route tidak ada |
| 409 | Duplikat (NIK, username, pemeriksaan di tanggal sama) atau data masih dipakai |
| 429 | Terlalu banyak percobaan login |
| 500 | Kesalahan server |

### Parameter umum

| Parameter | Lokasi | Aturan |
|---|---|---|
| `:id` | path | Bilangan bulat positif; selain itu → 400 |
| `page` | query | Bulat ≥ 1, default 1 |
| `limit` | query | Bulat 1–100, default 10 |
| `q` | query | Kata kunci, 1–100 karakter, di-*trim* |
| tanggal | body/query | String `YYYY-MM-DD` yang valid |

### Penulisan data
- **PUT = penggantian penuh.** Kirim semua field yang bisa diubah; field opsional yang tidak dikirim akan menjadi `null` ([ADR-007](06-decisions.md)).
- **DELETE** = soft delete, mengembalikan 200 dengan `data: { "id": <id> }` (bukan 204, agar pesan terlihat di Postman).
- Respons POST/PUT mengembalikan data lengkap seperti `GET /:id`.

---

## Health

### `GET /health` 🔓
```json
{ "success": true, "message": "OK", "data": { "database": "connected", "time": "2026-11-02T08:00:00.000Z" } }
```
Jika DB tidak terjangkau → 503, `"database": "disconnected"`.

---

## Auth

### `POST /auth/login` 🔓
Rate limit: `LOGIN_RATE_LIMIT` percobaan / 15 menit / IP → 429.

Request
```json
{ "username": "admin", "password": "rahasia123" }
```
Respons 200
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "token": "eyJhbGciOi...",
    "expires_in": "8h",
    "kader": { "id": 1, "nama": "Admin Posyandu", "username": "admin", "role": "admin", "posyandu_id": 1 }
  }
}
```
Gagal (username tidak ada, password salah, atau akun nonaktif) → 401 `"Username atau password salah"`.

### `GET /auth/me`
Respons 200: `data` = objek kader (tanpa `password_hash`) + `posyandu: { id, nama }`.

### `PATCH /auth/password`
```json
{ "password_lama": "rahasia123", "password_baru": "rahasiaBaru456" }
```
- `password_lama` salah → 400, `errors: [{ field: "password_lama", message: "Password lama salah" }]`.
- `password_baru` minimal 8 karakter dan berbeda dari password lama.
- 200 `"Password berhasil diubah"`.

---

## Posyandu

### `GET /posyandu`
Profil posyandu milik akun yang login.
```json
{ "success": true, "message": "Data posyandu berhasil diambil",
  "data": { "id": 1, "nama": "Posyandu Melati", "alamat": "Jl. ...", "desa": "...", "kecamatan": "...", "kabupaten_kota": "...", "created_at": "...", "updated_at": "..." } }
```

### `PUT /posyandu` (admin)
Body: `nama` (wajib), `alamat`, `desa`, `kecamatan`, `kabupaten_kota`.

---

## Kader (admin)

Objek kader (tanpa `password_hash`):
```json
{ "id": 2, "posyandu_id": 1, "nama": "Sri Wahyuni", "username": "sri", "no_hp": "081234567890", "role": "kader", "is_active": true, "created_at": "...", "updated_at": "..." }
```

| Endpoint | Keterangan |
|---|---|
| `GET /kader?q=&is_active=&page=&limit=` | `q` cocok ke nama/username; `is_active` = `true`/`false`; urut nama |
| `GET /kader/:id` | Hanya kader di posyandu yang sama |
| `POST /kader` | Body: `nama`*, `username`*, `password`*, `no_hp`, `role` (default `kader`). `posyandu_id` = posyandu admin. 201 |
| `PUT /kader/:id` | Body: `nama`*, `username`*, `no_hp`, `role`*, `is_active`*. Password **tidak** diubah di sini |
| `DELETE /kader/:id` | Set `is_active = false` (bukan dihapus; riwayat pencatatan tetap utuh) |
| `PATCH /kader/:id/password` | Body: `password_baru`*. Reset oleh admin |

Aturan (FR-07):
- Admin tidak dapat menonaktifkan atau menurunkan role **dirinya sendiri** → 400.
- Operasi yang membuat jumlah admin aktif menjadi 0 → 409 `"Minimal harus ada satu admin aktif"` (dicek dalam transaksi).

---

## Ibu

Objek ibu:
```json
{
  "id": 3, "posyandu_id": 1, "nik": "9999010101950001", "nama": "Siti Aminah",
  "tanggal_lahir": "1995-01-01", "usia_tahun": 31,
  "alamat": "RT 01 / RW 02", "no_hp": "081234567890",
  "jumlah_balita": 1,
  "created_at": "2026-11-02T01:00:00.000Z", "updated_at": "2026-11-02T01:00:00.000Z"
}
```

### `GET /ibu` — daftar & pencarian (UF03)
| Query | Keterangan |
|---|---|
| `q` | `nama ILIKE '%q%'` **atau** `nik LIKE 'q%'` |
| `kunjungan_dari`, `kunjungan_sampai` | Ibu yang punya ≥1 `pemeriksaan_ibu_hamil` aktif di rentang ini (inklusif). Boleh salah satu saja. Jika keduanya ada, `dari` ≤ `sampai` |
| `hamil` | Hanya nilai `true`; nilai lain → 400. Ibu yang **diperkirakan** masih hamil hari ini (FR-44, [ADR-014](06-decisions.md)), lihat aturan di bawah |
| `page`, `limit` | Paginasi |

Aturan `hamil=true`: ibu punya ≥1 `pemeriksaan_ibu_hamil` aktif dengan perkiraan usia kehamilan hari ini ≤ 42 minggu:
```sql
EXISTS (SELECT 1 FROM pemeriksaan_ibu_hamil p
        WHERE p.ibu_id = i.id AND p.deleted_at IS NULL
          AND p.tanggal_kunjungan + (42 - p.usia_kehamilan_minggu) * 7 >= $n)  -- $n = todayWIB()
```
Semua filter dapat digabung (AND). Urutan: `nama ASC, id ASC`. Hasil kosong → 200, `data: []`, `meta.total: 0`.

### `GET /ibu/:id`
Objek ibu + `balita: [{ id, nama, nik, jenis_kelamin, tanggal_lahir, usia_bulan }]` (hanya balita aktif).

### `POST /ibu`
```json
{ "nik": "9999010101950001", "nama": "Siti Aminah", "tanggal_lahir": "1995-01-01", "alamat": "RT 01 / RW 02", "no_hp": "081234567890" }
```
Wajib: `nik`, `nama`, `tanggal_lahir`, `alamat`. 201. NIK sudah dipakai data aktif → 409.

### `PUT /ibu/:id`
Body sama dengan POST.

### `DELETE /ibu/:id`
Masih punya balita aktif → 409 `"Ibu masih memiliki data balita aktif. Hapus data balita terlebih dahulu."` Riwayat pemeriksaan ibu ikut tersembunyi (difilter lewat JOIN), tidak dihapus.

### `GET /ibu/:id/pemeriksaan` — riwayat ibu hamil (UF01)
Query opsional: `dari`, `sampai`, `page`, `limit` (default `limit` 50). Urut `tanggal_kunjungan DESC`.
```json
{
  "success": true,
  "message": "Riwayat pemeriksaan berhasil diambil",
  "data": {
    "ibu": { "id": 3, "nama": "Siti Aminah", "nik": "9999010101950001" },
    "pemeriksaan": [
      { "id": 10, "tanggal_kunjungan": "2026-10-05", "usia_kehamilan_minggu": 20, "berat_badan": 58.5,
        "tekanan_sistolik": 120, "tekanan_diastolik": 80, "lila": 25.0, "keluhan": null, "catatan": null,
        "kader": { "id": 2, "nama": "Sri Wahyuni" } }
    ]
  },
  "meta": { "page": 1, "limit": 50, "total": 1, "total_pages": 1 }
}
```
Belum ada pemeriksaan → 200, `pemeriksaan: []` (FR-33).

---

## Balita

Objek balita:
```json
{
  "id": 1, "ibu_id": 3, "nik": null, "nama": "Ani", "jenis_kelamin": "P",
  "tanggal_lahir": "2025-03-10", "usia_bulan": 19,
  "ibu": { "id": 3, "nama": "Siti Aminah" },
  "created_at": "...", "updated_at": "..."
}
```
`usia_bulan` dihitung terhadap hari ini (WIB).

### `GET /balita` — daftar & pencarian (UF03)
| Query | Keterangan |
|---|---|
| `q` | Nama balita `ILIKE`, awalan NIK balita, **atau** nama ibu `ILIKE` |
| `ibu_id` | Filter per ibu |
| `jenis_kelamin` | `L` / `P` |
| `kunjungan_dari`, `kunjungan_sampai` | Balita dengan ≥1 `pemeriksaan_balita` aktif di rentang ini |
| `page`, `limit` | Paginasi |

Urutan: `nama ASC, id ASC`.

### `GET /balita/:id`
Objek balita + `ibu` lengkap (`id, nama, nik, no_hp, alamat`) + `pemeriksaan_terakhir` (objek atau `null`).

### `POST /balita`
```json
{ "ibu_id": 3, "nik": null, "nama": "Ani", "jenis_kelamin": "P", "tanggal_lahir": "2025-03-10" }
```
Wajib: `ibu_id`, `nama`, `jenis_kelamin`, `tanggal_lahir`.
- `ibu_id` tidak ada / terhapus / beda posyandu → 400, `errors: [{ field: "ibu_id", message: "Ibu tidak ditemukan" }]` (400, bukan 404, karena kesalahan ada di isi body).
- Usia ≥ 60 bulan → 400 pada `tanggal_lahir`.

### `PUT /balita/:id`
Body sama dengan POST (`ibu_id` boleh diganti dengan aturan yang sama).

### `DELETE /balita/:id`
Soft delete. Riwayat pemeriksaan ikut tersembunyi.

### `GET /balita/:id/pemeriksaan` — riwayat balita (UF01, core flow)
Query opsional: `dari`, `sampai`, `page`, `limit` (default 50). Urut `tanggal_kunjungan DESC`.
```json
{
  "success": true,
  "message": "Riwayat pemeriksaan berhasil diambil",
  "data": {
    "balita": { "id": 1, "nama": "Ani", "jenis_kelamin": "P", "tanggal_lahir": "2025-03-10", "usia_bulan": 19,
                "ibu": { "id": 3, "nama": "Siti Aminah" } },
    "pemeriksaan": [
      { "id": 21, "tanggal_kunjungan": "2026-10-20", "usia_bulan": 19, "berat_badan": 9.4, "tinggi_badan": 75.0,
        "lingkar_kepala": null, "lila": null, "catatan": null, "kader": { "id": 2, "nama": "Sri Wahyuni" } },
      { "id": 15, "tanggal_kunjungan": "2026-09-10", "usia_bulan": 17, "berat_badan": 8.9, "tinggi_badan": 73.0,
        "lingkar_kepala": 45.5, "lila": null, "catatan": "Nafsu makan menurun", "kader": { "id": 2, "nama": "Sri Wahyuni" } }
    ]
  },
  "meta": { "page": 1, "limit": 50, "total": 2, "total_pages": 1 }
}
```
`usia_bulan` per baris = usia pada **tanggal kunjungan** tersebut.

---

## Pemeriksaan balita (UF02)

Objek:
```json
{
  "id": 21, "balita_id": 1, "tanggal_kunjungan": "2026-10-20", "usia_bulan": 19,
  "berat_badan": 9.4, "tinggi_badan": 75.0, "lingkar_kepala": null, "lila": null, "catatan": null,
  "balita": { "id": 1, "nama": "Ani" },
  "kader": { "id": 2, "nama": "Sri Wahyuni" },
  "created_at": "...", "updated_at": "..."
}
```

| Endpoint | Keterangan |
|---|---|
| `GET /pemeriksaan-balita?balita_id=&dari=&sampai=&page=&limit=` | Urut `tanggal_kunjungan DESC, id DESC` |
| `GET /pemeriksaan-balita/:id` | |
| `POST /pemeriksaan-balita` | 201 |
| `PUT /pemeriksaan-balita/:id` | Body tanpa `balita_id` (tidak bisa dipindah ke balita lain) |
| `DELETE /pemeriksaan-balita/:id` | Soft delete |

POST body:
```json
{ "balita_id": 1, "tanggal_kunjungan": "2026-10-20", "berat_badan": 9.4, "tinggi_badan": 75, "lingkar_kepala": null, "lila": null, "catatan": null }
```

Validasi di service, setelah zod:
1. Balita ada, aktif, dan satu posyandu, jika tidak → 400 `balita_id` "Balita tidak ditemukan".
2. `tanggal_kunjungan` ≥ `balita.tanggal_lahir` → jika tidak, 400.
3. Usia pada `tanggal_kunjungan` < 60 bulan → jika tidak, 400.
4. `kader_id` = `req.user.id`.
5. Duplikat tanggal → 409 (dari constraint `uq_pb_per_tanggal`).

Contoh 400 (kolom wajib kosong):
```json
{
  "success": false,
  "message": "Data tidak valid",
  "errors": [
    { "field": "berat_badan", "message": "Berat badan wajib diisi" },
    { "field": "tanggal_kunjungan", "message": "Tanggal kunjungan tidak boleh di masa depan" }
  ]
}
```

## Pemeriksaan ibu hamil (UF02)

Sama polanya dengan pemeriksaan balita, dengan `ibu_id` dan field:

POST body:
```json
{ "ibu_id": 3, "tanggal_kunjungan": "2026-10-05", "usia_kehamilan_minggu": 20, "berat_badan": 58.5,
  "tekanan_sistolik": 120, "tekanan_diastolik": 80, "lila": 25, "keluhan": null, "catatan": null }
```
Query daftar: `ibu_id`, `dari`, `sampai`, `page`, `limit`. Validasi service: ibu ada, aktif, dan satu posyandu; `tanggal_kunjungan` ≥ `ibu.tanggal_lahir`; duplikat tanggal → 409.

---

## Laporan

### `GET /laporan/bulanan?bulan=YYYY-MM&kelompok=balita|ibu_hamil` (UF04)

| Query | Aturan |
|---|---|
| `bulan` | Wajib, `^\d{4}-(0[1-9]\|1[0-2])$`, tidak boleh bulan di masa depan |
| `kelompok` | Wajib, `balita` atau `ibu_hamil` |

Periode = tanggal 1 s.d. hari terakhir bulan tersebut (inklusif), disebut `awal` dan `akhir`.

#### Kelompok `balita`

Definisi:
- **Sasaran (`jumlah_terdaftar`)**: balita aktif (ibu juga aktif, posyandu sama) dengan `tanggal_lahir ≤ akhir` dan usia < 60 bulan pada `akhir`, **serta** sudah terdaftar pada periode itu, yaitu `created_at` (WIB) ≤ `akhir` **atau** punya pemeriksaan ≤ `akhir`. Klausa "atau" memastikan data lama yang baru diinput tetap terhitung.
- **`jumlah_diperiksa`**: jumlah balita sasaran yang memiliki ≥1 pemeriksaan aktif di periode.
- **`jumlah_pemeriksaan`**: jumlah baris pemeriksaan aktif balita sasaran di periode.
- **`cakupan_persen`**: `jumlah_diperiksa / jumlah_terdaftar × 100`, dibulatkan 1 desimal; `0` jika sasaran 0.
- **`rincian`**: satu baris per balita yang diperiksa, memakai **pemeriksaan terakhir** di periode itu; urut nama balita.

```json
{
  "success": true,
  "message": "Rekap bulanan berhasil dibuat",
  "data": {
    "periode": { "bulan": "2026-10", "awal": "2026-10-01", "akhir": "2026-10-31" },
    "kelompok": "balita",
    "posyandu": { "id": 1, "nama": "Posyandu Melati" },
    "ringkasan": { "jumlah_terdaftar": 25, "jumlah_diperiksa": 20, "cakupan_persen": 80.0, "jumlah_pemeriksaan": 21 },
    "rincian": [
      { "balita_id": 1, "nama": "Ani", "nik": null, "jenis_kelamin": "P", "nama_ibu": "Siti Aminah",
        "tanggal_kunjungan": "2026-10-20", "usia_bulan": 19,
        "berat_badan": 9.4, "tinggi_badan": 75.0, "lingkar_kepala": null, "lila": null, "catatan": null }
    ],
    "dibuat_pada": "2026-11-02T08:00:00.000Z"
  }
}
```

Referensi SQL (sudah diuji di PostgreSQL 16; `$1` = posyandu_id, `$2` = awal, `$3` = akhir):
```sql
WITH sasaran AS (
  SELECT b.id, b.nama, b.nik, b.jenis_kelamin, b.tanggal_lahir, i.nama AS nama_ibu
  FROM balita b
  JOIN ibu i ON i.id = b.ibu_id
  WHERE b.deleted_at IS NULL AND i.deleted_at IS NULL
    AND i.posyandu_id = $1
    AND b.tanggal_lahir <= $3
    AND b.tanggal_lahir > ($3::date - INTERVAL '60 months')::date
    AND (
      (b.created_at AT TIME ZONE 'Asia/Jakarta')::date <= $3
      OR EXISTS (SELECT 1 FROM pemeriksaan_balita x
                 WHERE x.balita_id = b.id AND x.deleted_at IS NULL AND x.tanggal_kunjungan <= $3)
    )
),
periode AS (
  SELECT pb.* FROM pemeriksaan_balita pb
  JOIN sasaran s ON s.id = pb.balita_id
  WHERE pb.deleted_at IS NULL AND pb.tanggal_kunjungan BETWEEN $2 AND $3
),
terakhir AS (
  SELECT DISTINCT ON (balita_id) * FROM periode
  ORDER BY balita_id, tanggal_kunjungan DESC
)
SELECT
  (SELECT COUNT(*)::int FROM sasaran)  AS jumlah_terdaftar,
  (SELECT COUNT(*)::int FROM terakhir) AS jumlah_diperiksa,
  (SELECT COUNT(*)::int FROM periode)  AS jumlah_pemeriksaan;
-- rincian: SELECT ... FROM terakhir t JOIN sasaran s ON s.id = t.balita_id ORDER BY s.nama
```

#### Kelompok `ibu_hamil`

Fase 1 belum menyimpan status kehamilan aktif ([ADR-006](06-decisions.md)), jadi **sasaran tidak dihitung**.
- **`jumlah_diperiksa`**: jumlah ibu (aktif, posyandu sama) dengan ≥1 pemeriksaan ibu hamil di periode.
- **`jumlah_pemeriksaan`**: jumlah baris pemeriksaan di periode.
- **`rincian`**: pemeriksaan terakhir per ibu di periode; field `ibu_id, nama, nik, usia_tahun, tanggal_kunjungan, usia_kehamilan_minggu, berat_badan, tekanan_sistolik, tekanan_diastolik, lila, keluhan, catatan`; urut nama.

```json
{
  "data": {
    "periode": { "bulan": "2026-10", "awal": "2026-10-01", "akhir": "2026-10-31" },
    "kelompok": "ibu_hamil",
    "posyandu": { "id": 1, "nama": "Posyandu Melati" },
    "ringkasan": { "jumlah_diperiksa": 8, "jumlah_pemeriksaan": 9 },
    "rincian": [ ],
    "dibuat_pada": "..."
  }
}
```

Bulan tanpa data → 200 dengan angka 0 dan `rincian: []` (FR-53). Frontend menampilkan "Belum ada data pada periode ini".

> Ekspor PDF/Excel (Fase 2) akan memakai service yang sama, mis. `GET /laporan/bulanan/export?bulan=&kelompok=&format=xlsx`.

---

## Urutan demo Postman untuk tugas

1. `POST /auth/login` (admin dari seed): token tersimpan otomatis.
2. `POST /ibu`, lalu `POST /balita`: **screenshot POST**.
3. `GET /balita`: **screenshot GET semua**.
4. `GET /balita/:id`: **screenshot GET by ID**.
5. `PUT /balita/:id`: **screenshot PUT**.
6. `DELETE /balita/:id`: **screenshot DELETE**.
7. (Bonus) `POST /pemeriksaan-balita` dengan BB kosong (400), `GET /balita/:id/pemeriksaan`, `GET /laporan/bulanan`.
