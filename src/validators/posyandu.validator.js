const { z, teks, opsional } = require('./common');

const lokasi = (label) => opsional(z.string().trim().max(100, `${label} maksimal 100 karakter`));

const update = z.object({
  nama: teks('Nama posyandu', 2, 100),
  alamat: opsional(z.string().trim().max(500, 'Alamat maksimal 500 karakter')),
  desa: lokasi('Desa'),
  kecamatan: lokasi('Kecamatan'),
  kabupaten_kota: lokasi('Kabupaten/kota'),
});

module.exports = { update };
