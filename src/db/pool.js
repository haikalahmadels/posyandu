const { Pool, types } = require('pg');
const env = require('../config/env');

// DATE (OID 1082) → string 'YYYY-MM-DD' apa adanya.
// Tanpa ini, pg mengubahnya menjadi Date JS pada tengah malam waktu lokal,
// dan tanggal bisa bergeser satu hari saat diserialisasi ke JSON (UTC).
types.setTypeParser(1082, (v) => v);

// NUMERIC (OID 1700) → number. Default pg mengembalikan string.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));

const pool = new Pool({ connectionString: env.DATABASE_URL });

const query = (text, params) => pool.query(text, params);

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
