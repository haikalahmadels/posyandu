-- Data awal + data demo. Aman dijalankan ulang (ON CONFLICT (id) DO NOTHING).
-- Akun:  admin / admin12345  (role admin)  ·  sri / kader12345  (role kader)
-- Ganti password admin setelah login pertama: PATCH /api/auth/password
-- NIK diawali 9999 = fiktif.

INSERT INTO kader (id, nama, username, password_hash, no_hp, role) VALUES
  (1, 'Admin Posyandu', 'admin', '$2b$10$b8PbxsguW3IOP8sJ3cM4UuRu6V7wOyCStHOYyaUdciQMSbM96WZrO', NULL, 'admin'),
  (2, 'Sri Wahyuni', 'sri', '$2b$10$GQxKzi6q.0svrdH0zOf6yO2Snnm/R8oHnwdRJg.gNyjSzLth543Lq', '081234567890', 'kader')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ibu (id, nik, nama, tanggal_lahir, alamat, no_hp, created_at) VALUES
  (1, '9999010101950001', 'Siti Aminah', '1995-01-01', 'RT 01 / RW 02', '081234567801', '2026-08-01'),
  (2, '9999010101980002', 'Dewi Lestari', '1998-05-12', 'RT 03 / RW 02', '081234567802', '2026-08-01'),
  (3, '9999010101920003', 'Rina Marlina', '1992-11-20', 'RT 02 / RW 02', NULL, '2026-08-01')
ON CONFLICT (id) DO NOTHING;

-- Dewi: sedang hamil (hamil=true) dan punya satu balita.
-- Rina: pernah diperiksa hamil tahun lalu, sekarang tidak lagi (hamil=true tidak menampilkannya).
INSERT INTO balita (id, ibu_id, nik, nama, jenis_kelamin, tanggal_lahir, created_at) VALUES
  (1, 1, NULL, 'Ani', 'P', '2025-03-10', '2026-08-01'),
  (2, 1, '9999012003230004', 'Budi', 'L', '2023-03-20', '2026-08-01'),
  (3, 2, NULL, 'Citra', 'P', '2024-07-15', '2026-08-01'),
  (4, 3, NULL, 'Dimas', 'L', '2025-09-02', '2026-08-01')
ON CONFLICT (id) DO NOTHING;

-- Dua bulan data (September & Oktober 2026). Dimas tidak datang Oktober (cakupan < 100%).
INSERT INTO pemeriksaan_balita (id, balita_id, kader_id, tanggal_kunjungan, berat_badan, tinggi_badan, lingkar_kepala, lila, catatan) VALUES
  (1, 1, 2, '2026-09-10', 8.9, 73.0, 45.5, NULL, 'Nafsu makan menurun'),
  (2, 2, 2, '2026-09-10', 13.2, 96.0, NULL, NULL, NULL),
  (3, 3, 2, '2026-09-10', 10.8, 82.5, NULL, NULL, NULL),
  (4, 4, 2, '2026-09-10', 7.4, 67.0, 43.0, NULL, NULL),
  (5, 1, 2, '2026-10-20', 9.4, 75.0, NULL, NULL, NULL),
  (6, 2, 2, '2026-10-20', 13.5, 97.0, NULL, NULL, NULL),
  (7, 3, 1, '2026-10-20', 11.1, 83.5, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pemeriksaan_ibu_hamil (id, ibu_id, kader_id, tanggal_kunjungan, usia_kehamilan_minggu, berat_badan, tekanan_sistolik, tekanan_diastolik, lila, keluhan, catatan) VALUES
  (1, 2, 2, '2026-09-07', 16, 56.0, 110, 70, 24.5, 'Mual pagi hari', NULL),
  (2, 2, 2, '2026-10-05', 20, 58.5, 120, 80, 25.0, NULL, NULL),
  (3, 3, 2, '2025-06-10', 30, 62.0, 115, 75, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert dengan id eksplisit tidak memajukan sequence; samakan agar POST berikutnya tidak bentrok.
SELECT setval(pg_get_serial_sequence('kader', 'id'), (SELECT MAX(id) FROM kader));
SELECT setval(pg_get_serial_sequence('ibu', 'id'), (SELECT MAX(id) FROM ibu));
SELECT setval(pg_get_serial_sequence('balita', 'id'), (SELECT MAX(id) FROM balita));
SELECT setval(pg_get_serial_sequence('pemeriksaan_balita', 'id'), (SELECT MAX(id) FROM pemeriksaan_balita));
SELECT setval(pg_get_serial_sequence('pemeriksaan_ibu_hamil', 'id'), (SELECT MAX(id) FROM pemeriksaan_ibu_hamil));
