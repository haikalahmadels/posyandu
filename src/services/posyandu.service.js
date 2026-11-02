const { query } = require('../db/pool');

const COLS = 'id, nama, alamat, desa, kecamatan, kabupaten_kota, created_at, updated_at';

async function get(posyanduId) {
  const { rows } = await query(`SELECT ${COLS} FROM posyandu WHERE id = $1`, [posyanduId]);
  return rows[0];
}

async function update(posyanduId, data) {
  const { rows } = await query(
    `UPDATE posyandu SET nama = $1, alamat = $2, desa = $3, kecamatan = $4, kabupaten_kota = $5, updated_at = NOW()
     WHERE id = $6 RETURNING ${COLS}`,
    [data.nama, data.alamat, data.desa, data.kecamatan, data.kabupaten_kota, posyanduId]
  );
  return rows[0];
}

module.exports = { get, update };
