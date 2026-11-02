# PRD — Backend Sistem Monitoring Kesehatan Ibu & Anak (Posyandu)

| | |
|---|---|
| Versi | 1.0 (Fase 1: Backend MVP) |
| Status | Disepakati untuk implementasi |
| Dokumen terkait | [Product Brief](01-product-brief.md) · [Architecture](03-architecture.md) · [ERD](04-erd.md) · [API Spec](05-api-spec.md) · [Decisions](06-decisions.md) · [Implementation Plan](07-implementation-plan.md) |

## 1. Tujuan

Menyediakan REST API yang memungkinkan kader posyandu **mencatat, menyimpan, menemukan kembali, dan merekap** data kesehatan ibu hamil dan balita dari satu tempat. API ini harus:

1. memenuhi seluruh ketentuan tugas Backend Development (§8);
2. menjadi fondasi yang dapat dikembangkan menjadi produk utuh tanpa merombak skema.

## 2. Ruang lingkup Fase 1

**Termasuk:** autentikasi kader, manajemen akun kader (admin), data posyandu, CRUD ibu, CRUD balita, CRUD pemeriksaan balita, CRUD pemeriksaan ibu hamil, riwayat pemeriksaan, pencarian + filter tanggal kunjungan, rekap bulanan (JSON).

**Tidak termasuk:** lihat §7.

## 3. Pengguna & peran

| Role | Kemampuan |
|---|---|
| `admin` | Semua kemampuan `kader` + kelola akun kader + ubah data posyandu |
| `kader` | Kelola data ibu, balita, pemeriksaan; lihat riwayat; buat rekap |

- Tidak ada registrasi publik. Akun `admin` pertama dibuat lewat seed; akun kader dibuat oleh admin.
- Setiap akun terikat ke satu posyandu. Semua data yang dapat diakses dibatasi pada posyandu milik akun yang login.

## 4. Kebutuhan fungsional

Prioritas: **P0** = wajib Fase 1, **P1** = sebaiknya ada di Fase 1.

### 4.1 Autentikasi & akun

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-01 | Kader/admin login dengan `username` + `password`, menerima JWT. | P0 |
| FR-02 | Semua endpoint selain `POST /auth/login` dan `GET /health` wajib JWT valid. | P0 |
| FR-03 | Pengguna dapat melihat profilnya sendiri (`/auth/me`). | P0 |
| FR-04 | Pengguna dapat mengganti password sendiri (wajib menyertakan password lama). | P1 |
| FR-05 | Admin dapat membuat, melihat, mengubah, dan menonaktifkan akun kader. | P0 |
| FR-06 | Akun nonaktif tidak dapat login, dan token lamanya ditolak. | P0 |
| FR-07 | Admin tidak dapat menonaktifkan dirinya sendiri, dan sistem selalu menyisakan minimal satu admin aktif. | P1 |
| FR-08 | Password disimpan sebagai hash bcrypt dan tidak pernah dikembalikan di respons. | P0 |
| FR-09 | Login dibatasi percobaannya (rate limit) untuk mencegah tebak password. | P1 |

### 4.2 Data peserta (ibu & balita) — mendukung UF02, UF03

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-10 | CRUD data ibu: NIK, nama, tanggal lahir, alamat, no. HP. | P0 |
| FR-11 | CRUD data balita: terhubung ke satu ibu; NIK (opsional), nama, jenis kelamin, tanggal lahir. | P0 |
| FR-12 | NIK ibu wajib, 16 digit, unik di antara data aktif. NIK balita opsional; jika diisi juga 16 digit dan unik. | P0 |
| FR-13 | Detail ibu menyertakan daftar balitanya. Detail balita menyertakan ringkasan data ibunya. | P0 |
| FR-14 | Hapus data peserta = *soft delete* (lihat [ADR-003](06-decisions.md)). Data terhapus tidak muncul di daftar, detail, riwayat, maupun rekap. | P0 |
| FR-15 | Ibu yang masih memiliki balita aktif tidak dapat dihapus (409). | P0 |

### 4.3 Pencatatan pemeriksaan — UF02

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-20 | CRUD pemeriksaan balita: tanggal kunjungan, BB, TB (wajib); lingkar kepala, LILA, catatan (opsional). | P0 |
| FR-21 | CRUD pemeriksaan ibu hamil: tanggal kunjungan, usia kehamilan, BB, tekanan darah sistolik/diastolik (wajib); LILA, keluhan, catatan (opsional). | P0 |
| FR-22 | Validasi kolom wajib dan rentang nilai wajar. Jika gagal, API mengembalikan **400** dengan daftar kesalahan **per kolom** agar frontend dapat menandai kolom yang salah. | P0 |
| FR-23 | `kader_id` (pencatat) diisi otomatis dari akun yang login, bukan dari body request. | P0 |
| FR-24 | Satu peserta hanya boleh memiliki satu pemeriksaan per tanggal kunjungan (cegah input ganda); pelanggaran → **409**. | P0 |
| FR-25 | Tanggal kunjungan tidak boleh di masa depan dan tidak boleh sebelum tanggal lahir peserta. | P0 |

### 4.4 Riwayat — UF01

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-30 | Lihat riwayat pemeriksaan satu balita, diurutkan dari kunjungan terbaru. | P0 |
| FR-31 | Lihat riwayat pemeriksaan ibu hamil satu ibu, diurutkan dari kunjungan terbaru. | P0 |
| FR-32 | Setiap baris riwayat balita menyertakan usia balita (bulan) pada tanggal kunjungan serta nama kader pencatat. | P0 |
| FR-33 | Jika belum ada pemeriksaan, kembalikan 200 dengan daftar kosong (frontend menampilkan tombol "Catat Pemeriksaan"). | P0 |

### 4.5 Pencarian — UF03

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-40 | Cari ibu/balita berdasarkan kata kunci `q` (cocok ke nama, tidak peka huruf besar/kecil, atau awalan NIK). | P0 |
| FR-41 | Filter peserta berdasarkan rentang tanggal kunjungan (`kunjungan_dari`, `kunjungan_sampai`): tampilkan peserta yang punya ≥1 pemeriksaan di rentang itu. | P0 |
| FR-42 | Semua daftar mendukung paginasi (`page`, `limit`) dan mengembalikan metadata total. | P0 |
| FR-43 | Hasil kosong → 200 dengan daftar kosong. | P0 |
| FR-44 | Filter daftar ibu yang diperkirakan sedang hamil (`hamil=true`), agar UF01/UF03 dapat menampilkan "ibu hamil" terpisah dari "ibu balita". Aturan perkiraan: [API Spec §Ibu](05-api-spec.md#get-ibu--daftar--pencarian-uf03), [ADR-014](06-decisions.md). | P0 |

### 4.6 Rekap bulanan — UF04

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-50 | Rekap per bulan (`YYYY-MM`) per kelompok (`balita` / `ibu_hamil`) dalam format JSON. | P0 |
| FR-51 | Rekap balita berisi ringkasan (jumlah balita terdaftar, jumlah diperiksa, cakupan %) dan rincian per balita (pemeriksaan terakhir di bulan itu). | P0 |
| FR-52 | Rekap ibu hamil berisi ringkasan (jumlah ibu diperiksa, jumlah pemeriksaan) dan rincian per ibu (pemeriksaan terakhir di bulan itu). | P0 |
| FR-53 | Bulan tanpa data → 200 dengan angka 0 dan rincian kosong. | P0 |

Definisi perhitungan rekap ada di [API Spec §Laporan](05-api-spec.md#laporan).

## 5. User stories utama

- **US-01 (UF02)** Sebagai kader, saya ingin mencatat BB dan TB balita saat posyandu agar tersimpan di riwayatnya. Jika saya lupa mengisi kolom wajib, saya ingin tahu kolom mana yang salah.
- **US-02 (UF01)** Sebagai kader, saya ingin membuka riwayat pemeriksaan seorang balita meski ibunya tidak membawa KMS.
- **US-03 (UF03)** Sebagai kader, saya ingin mencari peserta dengan mengetik sebagian nama, atau melihat siapa saja yang datang pada rentang tanggal tertentu.
- **US-04 (UF04)** Sebagai kader, saya ingin melihat rekap pemeriksaan bulan lalu agar laporan ke puskesmas tidak perlu disusun manual.
- **US-05** Sebagai admin, saya ingin membuatkan akun untuk kader baru dan menonaktifkan akun kader yang sudah tidak bertugas.

## 6. Kebutuhan non-fungsional

| ID | Kebutuhan |
|---|---|
| NFR-01 | **Keamanan:** hash bcrypt (cost ≥ 10), JWT dengan masa berlaku terbatas, `helmet`, CORS dibatasi ke origin frontend, query SQL selalu terparameter. |
| NFR-02 | **Privasi:** NIK dan data kesehatan hanya dapat diakses pengguna login di posyandu yang sama. Data posyandu lain → 404 (tidak membocorkan keberadaan data). |
| NFR-03 | **Integritas data:** validasi di dua lapis (API dengan zod + constraint `CHECK`/`FK`/`UNIQUE` di database). |
| NFR-04 | **Konsistensi respons:** semua respons memakai format amplop yang sama ([API Spec §Konvensi](05-api-spec.md#konvensi)). |
| NFR-05 | **Zona waktu:** tanggal bisnis memakai WIB (`Asia/Jakarta`); kolom `DATE` dikirim sebagai string `YYYY-MM-DD` tanpa konversi zona waktu. |
| NFR-06 | **Performa:** daftar dan riwayat < 500 ms untuk ±1.000 peserta dan ±20.000 pemeriksaan (skala satu posyandu beberapa tahun). |
| NFR-07 | **Dapat dikembangkan:** skema sudah memuat `posyandu_id` agar dapat menjadi multi-posyandu tanpa migrasi besar. |
| NFR-08 | **Dokumentasi:** koleksi Postman mencakup seluruh endpoint, termasuk contoh kasus gagal validasi. |

## 7. Di luar lingkup Fase 1

| Item | Alasan / rencana |
|---|---|
| Grafik pertumbuhan & status gizi (standar WHO) | Butuh tabel acuan WHO dan validasi tenaga kesehatan (laporan §6.3). Data BB/TB/usia sudah tersedia untuk fitur ini nanti. |
| Indikator risiko & panduan tindak lanjut | Penilaian klinis; perlu validasi bidan. |
| Jadwal & pengingat posyandu | Fase berikutnya; kemungkinan tabel `jadwal_posyandu`. |
| Ekspor laporan PDF/Excel | Fase 1 cukup JSON; ekspor ditambahkan di atas endpoint rekap yang sama. Menyimpang dari langkah 3 UF04 di laporan UI/UX (lihat [ADR-013](06-decisions.md)). |
| Imunisasi | Banyak jenis vaksin dan jadwal; akan dibuat tabel tersendiri. |
| Format SKDN penuh (N/T/O/B) | Perlu aturan kenaikan berat minimal per usia; divalidasi dulu. |
| Multi-posyandu | Skema sudah siap (ADR-002); endpoint pengelolaan posyandu belum dibuat. |
| Akun ibu | Fase berikutnya. |
| Data kehamilan per episode (HPHT, taksiran persalinan) | Fase 1 cukup `usia_kehamilan_minggu` per kunjungan; lihat ADR-006. |

## 8. Keterlacakan ke ketentuan tugas

| Ketentuan tugas | Dipenuhi oleh |
|---|---|
| Database PostgreSQL + file SQL | `database/schema.sql`, `database/seed.sql` ([ERD](04-erd.md)) |
| Import ke dbdiagram & share publik | SQL kompatibel importer dbdiagram ([ERD §Import](04-erd.md#7-import-ke-dbdiagram)) |
| Express.js + Postgres | [Architecture](03-architecture.md) |
| GET semua / GET by ID / POST / PUT / DELETE | Semua resource. Contoh utama untuk screenshot: `/api/balita` |
| Tes di Postman + screenshot | `postman/` collection |
| `.gitignore` berisi `node_modules` dan `.env` | [Architecture §Struktur](03-architecture.md#3-struktur-folder) |

**Resource yang disarankan untuk screenshot tugas:** `balita` (POST → GET semua → GET by ID → PUT → DELETE), karena paling dekat dengan core flow.

## 9. Pertanyaan terbuka

1. Rentang nilai validasi (lihat [ERD §Aturan](04-erd.md#5-aturan-validasi)) adalah batas kewajaran input, bukan nilai klinis. Sebaiknya dikonfirmasi ke bidan/kader saat riset lapangan.
2. Format laporan bulanan resmi puskesmas setempat belum diketahui. Struktur rekap mungkin perlu disesuaikan.
3. Batas usia balita: dipakai < 60 bulan pada tanggal kunjungan. Perlu dikonfirmasi apakah posyandu juga melayani anak usia 5–6 tahun.
