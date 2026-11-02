const { z, teks, tanggal, nik, noHp, paginasi, q, rentangTanggal } = require('./common');
const { todayWIB, kurangiTahun } = require('../utils/date');

const list = rentangTanggal(
  z.object({
    q,
    hamil: z.literal('true', { error: 'hamil hanya menerima nilai true' }).optional(),
    ...paginasi,
  }),
  'kunjungan_dari',
  'kunjungan_sampai'
);

// Usia 10–60 tahun pada hari ini (batas kewajaran input, docs/04-erd.md §5).
const body = z.object({
  nik: nik('NIK ibu'),
  nama: teks('Nama', 2, 100),
  tanggal_lahir: tanggal('Tanggal lahir').refine((v) => {
    const hariIni = todayWIB();
    return v <= kurangiTahun(hariIni, 10) && v > kurangiTahun(hariIni, 61);
  }, 'Usia ibu harus antara 10 dan 60 tahun'),
  alamat: teks('Alamat', 3, 500),
  no_hp: noHp,
});

module.exports = { list, body };
