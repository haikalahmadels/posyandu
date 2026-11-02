const { z, teks, tanggalLalu, nik, opsional, idBody, bulatQuery, paginasi, q, rentangTanggal } = require('./common');
const { todayWIB, kurangiTahun } = require('../utils/date');

const jenisKelamin = z.enum(['L', 'P'], { error: 'Jenis kelamin harus L atau P' });

const list = rentangTanggal(
  z.object({
    q,
    ibu_id: bulatQuery('ibu_id tidak valid', 1).optional(),
    jenis_kelamin: jenisKelamin.optional(),
    ...paginasi,
  }),
  'kunjungan_dari',
  'kunjungan_sampai'
);

const body = z.object({
  ibu_id: idBody('Ibu'),
  nik: opsional(nik('NIK balita')),
  nama: teks('Nama', 2, 100),
  jenis_kelamin: jenisKelamin,
  tanggal_lahir: tanggalLalu('Tanggal lahir').refine(
    (v) => v > kurangiTahun(todayWIB(), 5),
    'Usia balita harus di bawah 60 bulan'
  ),
});

module.exports = { list, body };
