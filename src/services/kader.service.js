const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('../db/pool');
const ApiError = require('../utils/ApiError');
const { paged, binder } = require('./sql');

// Kolom eksplisit: password_hash tidak pernah ikut ke respons.
const KADER_COLS = 'id, nama, username, no_hp, role, is_active, created_at, updated_at';

async function list({ q, is_active, page, limit }) {
  const { params, p } = binder();
  const where = [];
  if (q) {
    const pola = p(`%${q}%`);
    where.push(`(nama ILIKE ${pola} OR username ILIKE ${pola})`);
  }
  if (is_active !== undefined) where.push(`is_active = ${p(is_active)}`);
  return paged({ select: KADER_COLS, from: 'kader', where, params, orderBy: 'nama, id' }, { page, limit });
}

async function findById(id, client = { query }) {
  const { rows } = await client.query(`SELECT ${KADER_COLS} FROM kader WHERE id = $1`, [id]);
  if (!rows[0]) throw new ApiError(404, 'Kader tidak ditemukan');
  return rows[0];
}

async function create(data) {
  const { rows } = await query(
    `INSERT INTO kader (nama, username, password_hash, no_hp, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${KADER_COLS}`,
    [data.nama, data.username, await bcrypt.hash(data.password, 10), data.no_hp, data.role]
  );
  return rows[0];
}

// FR-07: admin tidak boleh menonaktifkan/menurunkan dirinya, dan minimal satu admin aktif tersisa.
async function cekAturanAdmin(client, user, target, berikut) {
  const kehilanganAdmin =
    target.role === 'admin' && target.is_active && (berikut.role !== 'admin' || !berikut.is_active);
  if (!kehilanganAdmin) return;
  if (target.id === user.id) {
    throw new ApiError(400, 'Anda tidak dapat menonaktifkan atau menurunkan role akun sendiri');
  }
  const { rows } = await client.query("SELECT id FROM kader WHERE role = 'admin' AND is_active FOR UPDATE");
  if (rows.length <= 1) throw new ApiError(409, 'Minimal harus ada satu admin aktif');
}

function update(user, id, data) {
  return withTransaction(async (client) => {
    const target = await findById(id, client);
    await cekAturanAdmin(client, user, target, data);
    const { rows } = await client.query(
      `UPDATE kader SET nama = $1, username = $2, no_hp = $3, role = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6 RETURNING ${KADER_COLS}`,
      [data.nama, data.username, data.no_hp, data.role, data.is_active, id]
    );
    return rows[0];
  });
}

// ADR-011: hapus kader = nonaktifkan, agar riwayat pencatatan tetap utuh.
function deactivate(user, id) {
  return withTransaction(async (client) => {
    const target = await findById(id, client);
    await cekAturanAdmin(client, user, target, { role: target.role, is_active: false });
    await client.query('UPDATE kader SET is_active = FALSE, updated_at = NOW() WHERE id = $1', [id]);
    return { id };
  });
}

async function resetPassword(id, passwordBaru) {
  const { rowCount } = await query('UPDATE kader SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    await bcrypt.hash(passwordBaru, 10),
    id,
  ]);
  if (!rowCount) throw new ApiError(404, 'Kader tidak ditemukan');
}

module.exports = { KADER_COLS, list, findById, create, update, deactivate, resetPassword };
