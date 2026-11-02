# Decision Log (ADR ringkas)

Catatan keputusan teknis beserta alasannya. Jika keputusan berubah, **jangan hapus entri lama**: tandai sebagai *Digantikan oleh ADR-xxx* dan tambahkan entri baru.

| ID | Keputusan | Status |
|---|---|---|
| ADR-001 | Express 5 + `pg` tanpa ORM | Diterima |
| ADR-002 | Satu posyandu, skema siap multi-posyandu | Diterima |
| ADR-003 | Soft delete untuk data peserta & pemeriksaan | Diterima |
| ADR-004 | Tabel ibu & balita terpisah; pemeriksaan dipisah per kelompok | Diterima |
| ADR-005 | JWT tanpa registrasi publik; akun dibuat admin | Diterima |
| ADR-006 | Belum ada tabel episode kehamilan | Diterima (Fase 1) |
| ADR-007 | PUT = penggantian penuh | Diterima |
| ADR-008 | Validasi dua lapis (zod + constraint DB) | Diterima |
| ADR-009 | Imunisasi & penilaian klinis ditunda | Diterima (Fase 1) |
| ADR-010 | Penamaan Bahasa Indonesia | Diterima |
| ADR-011 | Hapus kader = nonaktifkan | Diterima |
| ADR-012 | `schema.sql` tunggal, tanpa trigger | Diterima (Fase 1) |
| ADR-013 | Ekspor PDF/Excel ditunda ke Fase 2 | Diterima (Fase 1) |
| ADR-014 | Status "sedang hamil" diperkirakan dari pemeriksaan | Diterima (Fase 1) |

---

### ADR-001 — Express 5 + `pg` tanpa ORM
**Konteks:** Tugas mewajibkan Express.js dan PostgreSQL, dan SQL harus ditulis serta diimpor ke dbdiagram.
**Keputusan:** Pakai `pg` dengan SQL langsung. Pakai Express 5 karena error dari handler `async` otomatis diteruskan ke error handler.
**Konsekuensi:** Skema di database sama persis dengan `schema.sql`. Semua query wajib terparameter, dan SQL dikumpulkan di lapis service.

### ADR-002 — Satu posyandu, skema siap multi-posyandu
**Konteks:** Fase 1 hanya untuk satu posyandu, tetapi ada kemungkinan dikembangkan ke banyak posyandu.
**Keputusan:** Tabel `posyandu` ada sejak awal (satu baris dari seed). `kader.posyandu_id` dan `ibu.posyandu_id` wajib diisi. API mengambil `posyandu_id` dari token, bukan dari input. Semua query di-scope ke posyandu tersebut.
**Konsekuensi:** Untuk menjadi multi-posyandu cukup menambah data dan endpoint kelola posyandu, tanpa migrasi kolom. Biaya di Fase 1: satu JOIN/WHERE tambahan per query.

### ADR-003 — Soft delete
**Konteks:** Masalah utama di riset adalah data kesehatan yang hilang (E01, E06). Tugas tetap mewajibkan route DELETE.
**Keputusan:** `DELETE` mengisi `deleted_at`. Semua query membaca hanya baris dengan `deleted_at IS NULL`. Keunikan (NIK, pemeriksaan per tanggal) memakai *partial unique index* agar data terhapus tidak menghalangi input ulang.
**Konsekuensi:** Data dapat dipulihkan secara manual oleh admin DB. Setiap query harus ingat filter `deleted_at`, termasuk pada tabel induk yang di-JOIN. Endpoint restore belum ada.

### ADR-004 — Struktur peserta & pemeriksaan
**Konteks:** Satu ibu bisa sedang hamil sekaligus memiliki balita. Kolom yang diukur pada ibu hamil dan balita berbeda.
**Keputusan:** `ibu` dan `balita` dipisah (balita → ibu). `pemeriksaan_balita` dan `pemeriksaan_ibu_hamil` dipisah, bukan satu tabel dengan banyak kolom nullable atau JSON.
**Konsekuensi:** Constraint `CHECK` bisa spesifik per kelompok dan sesuai dengan UF02 ("pilih formulir ibu hamil atau balita"). Ada dua set endpoint pemeriksaan yang polanya serupa; kode boleh berbagi helper.

### ADR-005 — Autentikasi
**Konteks:** Data berisi NIK dan informasi kesehatan, jadi tidak boleh bisa diakses siapa saja yang mendaftar.
**Keputusan:** Tidak ada registrasi publik. Admin pertama dibuat lewat seed, kader dibuat oleh admin. Autentikasi memakai JWT (8 jam) tanpa refresh token. Middleware memuat ulang status kader dari DB di setiap request.
**Konsekuensi:** Penonaktifan akun langsung berlaku. Ada satu query tambahan per request (dapat diterima untuk skala satu posyandu). Refresh token dipertimbangkan di Fase 2.

### ADR-006 — Belum ada tabel episode kehamilan
**Konteks:** Rekap ibu hamil idealnya menghitung "ibu yang sedang hamil" sebagai sasaran, dan itu memerlukan data HPHT dan status kehamilan.
**Keputusan:** Fase 1 hanya menyimpan `usia_kehamilan_minggu` per kunjungan. Rekap ibu hamil menghitung yang diperiksa, bukan sasaran.
**Konsekuensi:** Cakupan ibu hamil belum tersedia. Fase 2 dapat menambah tabel `kehamilan` dan `pemeriksaan_ibu_hamil.kehamilan_id` (nullable, lalu diisi).

### ADR-007 — PUT = penggantian penuh
**Konteks:** Tugas meminta metode PUT untuk update.
**Keputusan:** PUT memakai skema validasi yang sama dengan POST. Field opsional yang tidak dikirim menjadi `null`. Tidak ada PATCH untuk resource data, kecuali ganti password.
**Konsekuensi:** Perilaku sederhana dan konsisten, dan frontend selalu mengirim seluruh isi formulir. Bisa ditambah PATCH di masa depan bila perlu.

### ADR-008 — Validasi dua lapis
**Konteks:** Fitur A03 (validasi kolom) dan HMW 4 (mengurangi kesalahan catat).
**Keputusan:** zod di API memberi pesan per kolom dalam Bahasa Indonesia. Constraint `CHECK`/`UNIQUE`/`FK` di DB menjadi jaring pengaman, dan pelanggarannya dipetakan ke 400/409 oleh error handler.
**Konsekuensi:** Rentang nilai harus dijaga sinkron antara `validators/` dan `schema.sql`; acuannya [ERD §5](04-erd.md#5-aturan-validasi). Rentang tersebut adalah batas kewajaran input, bukan nilai klinis.

### ADR-009 — Imunisasi & penilaian klinis ditunda
**Konteks:** Laporan UI/UX §6.3 menunda grafik pertumbuhan, indikator risiko, dan panduan tindak lanjut karena memerlukan validasi tenaga kesehatan. Imunisasi tidak termasuk MVP.
**Keputusan:** Fase 1 tidak menghitung status gizi, z-score, risiko kehamilan, atau imunisasi.
**Konsekuensi:** Data mentah (BB, TB, usia, jenis kelamin, tekanan darah) sudah tersimpan, sehingga fitur-fitur tersebut dapat dibangun di atasnya nanti.

### ADR-010 — Penamaan Bahasa Indonesia
**Keputusan:** Tabel, kolom, path endpoint, field JSON, dan pesan error memakai Bahasa Indonesia, sesuai istilah domain (posyandu, kader, balita, LILA). Nama variabel/fungsi JavaScript dan nama file boleh campuran (mis. `balitaService.findById`).
**Konsekuensi:** Field JSON = nama kolom DB (`snake_case`), sehingga tidak perlu pemetaan.

### ADR-011 — Hapus kader = nonaktifkan
**Konteks:** `pemeriksaan_*.kader_id` merujuk kader. Menghapus kader akan memutus riwayat siapa yang mencatat.
**Keputusan:** `DELETE /kader/:id` mengubah `is_active = false`. Kader tidak memiliki `deleted_at`.
**Konsekuensi:** Username kader nonaktif tetap terpakai. Admin bisa mengaktifkan kembali lewat PUT.

### ADR-012 — `schema.sql` tunggal tanpa trigger
**Konteks:** SQL harus bisa diimpor ke dbdiagram, dan importer tidak mendukung `CREATE FUNCTION`/`TRIGGER`.
**Keputusan:** Satu file `schema.sql` berisi tabel, constraint, dan index saja. `updated_at` diisi aplikasi.
**Konsekuensi:** Setelah tugas dikumpulkan, pertimbangkan tool migrasi (mis. `node-pg-migrate`) untuk perubahan skema berikutnya.

### ADR-013 — Ekspor PDF/Excel ditunda ke Fase 2
**Konteks:** Langkah 3 UF04 di laporan UI/UX berakhir dengan "Unduh Laporan (PDF / Excel)", tetapi tugas Backend Development hanya meminta REST API CRUD.
**Keputusan:** Fase 1 menyediakan rekap bulanan dalam JSON (`GET /laporan/bulanan`). Alur UF04 di Fase 1 berhenti di pratinjau rekap.
**Konsekuensi:** Fase 2 menambah `GET /laporan/bulanan/export` yang memakai service rekap yang sama, tanpa perubahan skema.

### ADR-014 — Status "sedang hamil" diperkirakan dari pemeriksaan
**Konteks:** UF01/UF03 menampilkan "ibu hamil" terpisah dari "ibu balita", tetapi Fase 1 belum punya tabel kehamilan (ADR-006).
**Keputusan:** Filter `GET /ibu?hamil=true` menganggap ibu masih hamil jika ada pemeriksaan kehamilan aktif yang, bila usia kehamilannya diteruskan sampai hari ini, belum melewati 42 minggu. Tidak ada kolom baru.
**Konsekuensi:** Ini perkiraan: ibu yang sudah melahirkan masih ikut tersaring sampai batas 42 minggu itu terlewati. Digantikan oleh `kehamilan.status` saat tabel `kehamilan` dibuat di Fase 2.
