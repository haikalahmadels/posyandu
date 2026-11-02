const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../db/pool');
const ApiError = require('../utils/ApiError');
const { KADER_COLS } = require('./kader.service');

// Dipakai saat username tidak ada, agar waktu respons tidak membocorkan username yang valid.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

async function login(username, password) {
  const { rows } = await query(
    'SELECT id, nama, username, role, posyandu_id, is_active, password_hash FROM kader WHERE username = $1',
    [username]
  );
  const kader = rows[0];
  const cocok = await bcrypt.compare(password, kader ? kader.password_hash : DUMMY_HASH);
  if (!kader || !cocok || !kader.is_active) throw new ApiError(401, 'Username atau password salah');

  const token = jwt.sign({ role: kader.role, posyandu_id: kader.posyandu_id }, env.JWT_SECRET, {
    subject: String(kader.id),
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
  const { id, nama, role, posyandu_id } = kader;
  return { token, expires_in: env.JWT_EXPIRES_IN, kader: { id, nama, username: kader.username, role, posyandu_id } };
}

async function me(kaderId) {
  const { rows } = await query(
    `SELECT ${KADER_COLS},
            (SELECT json_build_object('id', p.id, 'nama', p.nama) FROM posyandu p WHERE p.id = kader.posyandu_id) AS posyandu
     FROM kader WHERE id = $1`,
    [kaderId]
  );
  return rows[0];
}

async function gantiPassword(kaderId, passwordLama, passwordBaru) {
  const { rows } = await query('SELECT password_hash FROM kader WHERE id = $1', [kaderId]);
  if (!(await bcrypt.compare(passwordLama, rows[0].password_hash))) {
    throw new ApiError(400, 'Data tidak valid', [{ field: 'password_lama', message: 'Password lama salah' }]);
  }
  await query('UPDATE kader SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
    await bcrypt.hash(passwordBaru, 10),
    kaderId,
  ]);
}

module.exports = { login, me, gantiPassword };
