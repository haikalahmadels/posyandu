const { query } = require('../db/pool');
const ApiError = require('../utils/ApiError');
const { HARI_INI, usiaBulan, binder, paged } = require('./sql');

const FROM = 'balita b JOIN ibu i ON i.id = b.ibu_id';
const AKTIF = 'b.deleted_at IS NULL AND i.deleted_at IS NULL';

const KOLOM = `
  b.id, b.ibu_id, b.nik, b.nama, b.jenis_kelamin, b.tanggal_lahir,
  ${usiaBulan(HARI_INI, 'b.tanggal_lahir')} AS usia_bulan,
  b.created_at, b.updated_at`;

async function list({ q, ibu_id, jenis_kelamin, kunjungan_dari, kunjungan_sampai, page, limit }) {
  const { params, p } = binder();
  const where = [AKTIF];

  if (q) {
    const pola = p(`%${q}%`);
    where.push(`(b.nama ILIKE ${pola} OR b.nik LIKE ${p(`${q}%`)} OR i.nama ILIKE ${pola})`);
  }
  if (ibu_id) where.push(`b.ibu_id = ${p(ibu_id)}`);
  if (jenis_kelamin) where.push(`b.jenis_kelamin = ${p(jenis_kelamin)}`);

  if (kunjungan_dari || kunjungan_sampai) {
    const syarat = ['x.balita_id = b.id', 'x.deleted_at IS NULL'];
    if (kunjungan_dari) syarat.push(`x.tanggal_kunjungan >= ${p(kunjungan_dari)}`);
    if (kunjungan_sampai) syarat.push(`x.tanggal_kunjungan <= ${p(kunjungan_sampai)}`);
    where.push(`EXISTS (SELECT 1 FROM pemeriksaan_balita x WHERE ${syarat.join(' AND ')})`);
  }

  const select = `${KOLOM}, json_build_object('id', i.id, 'nama', i.nama) AS ibu`;
  return paged({ select, from: FROM, where, params, orderBy: 'b.nama, b.id' }, { page, limit });
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${KOLOM},
       json_build_object('id', i.id, 'nama', i.nama, 'nik', i.nik, 'no_hp', i.no_hp, 'alamat', i.alamat) AS ibu,
       (SELECT json_build_object(
          'id', pb.id, 'tanggal_kunjungan', pb.tanggal_kunjungan,
          'usia_bulan', ${usiaBulan('pb.tanggal_kunjungan', 'b.tanggal_lahir')},
          'berat_badan', pb.berat_badan, 'tinggi_badan', pb.tinggi_badan,
          'lingkar_kepala', pb.lingkar_kepala, 'lila', pb.lila, 'catatan', pb.catatan)
        FROM pemeriksaan_balita pb
        WHERE pb.balita_id = b.id AND pb.deleted_at IS NULL
        ORDER BY pb.tanggal_kunjungan DESC, pb.id DESC LIMIT 1) AS pemeriksaan_terakhir
     FROM ${FROM}
     WHERE b.id = $1 AND ${AKTIF}`,
    [id]
  );
  if (!rows[0]) throw new ApiError(404, 'Data balita tidak ditemukan');
  return rows[0];
}

// ibu_id berasal dari body, jadi ibu yang tidak valid adalah 400 pada field itu, bukan 404.
async function pastikanIbu(ibuId) {
  const { rowCount } = await query('SELECT 1 FROM ibu WHERE id = $1 AND deleted_at IS NULL', [ibuId]);
  if (!rowCount) {
    throw new ApiError(400, 'Data tidak valid', [{ field: 'ibu_id', message: 'Ibu tidak ditemukan' }]);
  }
}

async function create(d) {
  await pastikanIbu(d.ibu_id);
  const { rows } = await query(
    `INSERT INTO balita (ibu_id, nik, nama, jenis_kelamin, tanggal_lahir)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [d.ibu_id, d.nik, d.nama, d.jenis_kelamin, d.tanggal_lahir]
  );
  return findById(rows[0].id);
}

async function update(id, d) {
  await findById(id);
  await pastikanIbu(d.ibu_id);
  await query(
    `UPDATE balita SET ibu_id = $1, nik = $2, nama = $3, jenis_kelamin = $4, tanggal_lahir = $5, updated_at = NOW()
     WHERE id = $6 AND deleted_at IS NULL`,
    [d.ibu_id, d.nik, d.nama, d.jenis_kelamin, d.tanggal_lahir, id]
  );
  return findById(id);
}

async function remove(id) {
  const { rowCount } = await query(
    `UPDATE balita b SET deleted_at = NOW(), updated_at = NOW()
     FROM ibu i
     WHERE b.id = $1 AND i.id = b.ibu_id AND ${AKTIF}`,
    [id]
  );
  if (!rowCount) throw new ApiError(404, 'Data balita tidak ditemukan');
  return { id };
}

module.exports = { list, findById, create, update, remove };
