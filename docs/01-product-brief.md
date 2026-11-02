# Product Brief — Sistem Monitoring Kesehatan Ibu & Anak (Posyandu)

> Ringkasan produk. Sumber utama: *Laporan Mini Project UI/UX — Kelompok 5* (riset desk research E01–E10, insight I01–I04).
> Detail kebutuhan ada di [`02-prd.md`](02-prd.md).

## Masalah

Kader posyandu masih mencatat data kesehatan ibu hamil dan balita secara manual di buku register, lembar formulir, KMS, dan buku KIA. Akibatnya data yang sama tersebar di banyak media sehingga:

- **sulit dicari kembali**, terutama ketika ibu lupa membawa KMS (E05);
- **mudah hilang atau tidak lengkap** sehingga riwayat tumbuh kembang tidak bisa ditelusuri (E01, E06);
- **lama direkap** menjadi laporan bulanan untuk puskesmas (E05, E07);
- **rawan salah catat** saat kegiatan posyandu ramai (E07).

## Pengguna

| Pengguna | Peran | Status di MVP |
|---|---|---|
| **Kader posyandu** | Mencatat pemeriksaan, mengelola data peserta, membuat rekap bulanan | Pengguna utama |
| **Admin** (ketua kader / bidan desa) | Semua akses kader + mengelola akun kader | Pengguna utama |
| Ibu hamil & ibu balita | Penerima layanan; datanya dicatat | Belum punya akun (fase berikutnya) |

## Solusi

Aplikasi web pengelolaan data posyandu yang menyatukan pencatatan, riwayat, pencarian, dan rekap dalam satu tempat.

## Fitur inti (MVP)

| Kode | Fitur | Insight |
|---|---|---|
| UF01 | Melihat riwayat pemeriksaan per peserta, urut tanggal | I01 |
| UF02 | Formulir digital pencatatan pemeriksaan + validasi kolom wajib | I01, I02 |
| UF03 | Pencarian peserta (nama/NIK) + filter tanggal kunjungan | I01 |
| UF04 | Rekap data bulanan per kelompok (balita / ibu hamil) | I01, I02 |
| — | Login kader + manajemen akun kader oleh admin | Prasyarat keamanan data kesehatan |

## Di luar MVP (direncanakan)

Grafik pertumbuhan berstandar WHO, indikator risiko & panduan tindak lanjut, jadwal & pengingat posyandu, dashboard statistik, ekspor laporan PDF/Excel, pencatatan imunisasi, dukungan banyak posyandu, akun untuk ibu. Alasan penundaan ada di laporan UI/UX §6.3 dan [`06-decisions.md`](06-decisions.md).

## Ukuran keberhasilan (hipotesis, perlu divalidasi)

Mengacu pada E07 (penelitian di lokasi lain, bukan target kita):

- waktu pencatatan per peserta lebih singkat dibanding manual;
- kesalahan pencatatan berkurang (data wajib tidak bisa kosong / tidak masuk akal);
- rekap bulanan dapat dibuat tanpa menyalin ulang data.

## Konteks proyek

- **Fase 1 (sekarang):** Backend REST API untuk tugas modul Backend Development: Express.js + PostgreSQL, 5 route CRUD diuji di Postman, SQL diimpor ke dbdiagram.
- **Fase 2+:** Frontend web dan fitur di luar MVP; produk dikembangkan hingga dapat dipakai.

## Batasan & asumsi

- Seluruh evidence berasal dari desk research; belum ada wawancara dengan kader di lokasi sasaran.
- Diasumsikan kader memiliki perangkat dan internet yang cukup (asumsi belum tervalidasi, laporan UI/UX §8.2).
- Sistem ini **alat pencatatan**, bukan alat diagnosis. Penilaian status gizi atau risiko kehamilan tidak dilakukan otomatis di MVP.
