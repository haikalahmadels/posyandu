const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../db/pool');
const ApiError = require('../utils/ApiError');

// Status kader dimuat ulang dari DB tiap request, jadi penonaktifan akun langsung berlaku (ADR-005).
module.exports = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Token tidak ditemukan, silakan login');

  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  const { rows } = await query(
    'SELECT id, nama, username, role FROM kader WHERE id = $1 AND is_active',
    [Number(payload.sub)]
  );
  if (!rows[0]) throw new ApiError(401, 'Sesi tidak valid, silakan login ulang');

  req.user = rows[0];
  next();
};
