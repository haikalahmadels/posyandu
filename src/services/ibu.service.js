const { query } = require('../db/pool');
const ApiError = require('../utils/ApiError');
const { HARI_INI, usiaBulan, binder, paged } = require('./sql');

const SELECT = `
  i.id, i.posyandu_id, i.nik, i.nama, i.tanggal_lahir,
  EXTRACT(YEAR FROM AGE(${HARI_INI}, i.tanggal_lahir))::int AS usia_tahun,
  i.alamat, i.no_hp,
  (SELECT COUNT(*)::int FROM balita b WHERE b.ibu_id = i.id AND b.deleted_at IS NULL) AS jumlah_balita,
  i.created_at, i.updated_at`;

async function list(posyanduId, { q, kunjungan_dari, kunjungan_sampai, hamil, page, limit }) {
  const { params, p } = binder();
  const where = [`i.posyandu_id = ${p(posyanduId)}`, 'i.deleted_at IS NULL'];

  if (q) where.push(`(i.nama ILIKE ${p(`%${q}%`)} OR i.nik LIKE ${p(`${q}%`)})`);

  if (kunjungan_dari || kunjungan_sampai) {
    const syarat = ['x.ibu_id = i.id', 'x.deleted_at IS NULL'];
    if (kunjungan_dari) syarat.push(`x.tanggal_kunjungan >= ${p(kunjungan_dari)}`);
    if (kunjungan_sampai) syarat.push(`x.tanggal_kunjungan <= ${p(kunjungan_sampai)}`);
    where.push(`EXISTS (SELECT 1 FROM pemeriksaan_ibu_hamil x WHERE ${syarat.join(' AND ')})`);
  }

  // ADR-014: diperkirakan masih hamil jika usia kehamilan diteruskan sampai hari ini belum lewat 42 minggu.
  if (hamil) {
    where.push(`EXISTS (SELECT 1 FROM pemeriksaan_ibu_hamil h
      WHERE h.ibu_id = i.id AND h.deleted_at IS NULL
        AND h.tanggal_kunjungan + (42 - h.usia_kehamilan_minggu) * 7 >= ${HARI_INI})`);
  }

  return paged({ select: SELECT, from: 'ibu i', where, params, orderBy: 'i.nama, i.id' }, { page, limit });
}

async function findById(posyanduId, id) {
  const { rows } = await query(
    `SELECT ${SELECT},
       COALESCE((
         SELECT json_agg(json_build_object(
           'id', b.id, 'nama', b.nama, 'nik', b.nik, 'jenis_kelamin', b.jenis_kelamin,
           'tanggal_lahir', b.tanggal_lahir, 'usia_bulan', ${usiaBulan(HARI_INI, 'b.tanggal_lahir')}
         ) ORDER BY b.tanggal_lahir)
         FROM balita b WHERE b.ibu_id = i.id AND b.deleted_at IS NULL
       ), '[]') AS balita
     FROM ibu i
     WHERE i.id = $1 AND i.posyandu_id = $2 AND i.deleted_at IS NULL`,
    [id, posyanduId]
  );
  if (!rows[0]) throw new ApiError(404, 'Data ibu tidak ditemukan');
  return rows[0];
}

async function create(posyanduId, d) {
  const { rows } = await query(
    `INSERT INTO ibu (posyandu_id, nik, nama, tanggal_lahir, alamat, no_hp)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [posyanduId, d.nik, d.nama, d.tanggal_lahir, d.alamat, d.no_hp]
  );
  return findById(posyanduId, rows[0].id);
}

async function update(posyanduId, id, d) {
  const { rowCount } = await query(
    `UPDATE ibu SET nik = $1, nama = $2, tanggal_lahir = $3, alamat = $4, no_hp = $5, updated_at = NOW()
     WHERE id = $6 AND posyandu_id = $7 AND deleted_at IS NULL`,
    [d.nik, d.nama, d.tanggal_lahir, d.alamat, d.no_hp, id, posyanduId]
  );
  if (!rowCount) throw new ApiError(404, 'Data ibu tidak ditemukan');
  return findById(posyanduId, id);
}

// FR-15: satu statement agar balita yang baru ditambahkan bersamaan tetap menghalangi penghapusan.
async function remove(posyanduId, id) {
  const { rowCount } = await query(
    `UPDATE ibu SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND posyandu_id = $2 AND deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM balita WHERE ibu_id = $1 AND deleted_at IS NULL)`,
    [id, posyanduId]
  );
  if (!rowCount) {
    await findById(posyanduId, id); // 404 jika memang tidak ada
    throw new ApiError(409, 'Ibu masih memiliki data balita aktif. Hapus data balita terlebih dahulu.');
  }
  return { id };
}

module.exports = { list, findById, create, update, remove };
