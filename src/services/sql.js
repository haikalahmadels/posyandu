const { query } = require('../db/pool');
const { toOffset, buildMeta } = require('../utils/pagination');

// "Hari ini" dalam WIB, dihitung di database (lihat docs/03-architecture.md §9).
const HARI_INI = "(NOW() AT TIME ZONE 'Asia/Jakarta')::date";

const usiaBulan = (ref, lahir) =>
  `(EXTRACT(YEAR FROM AGE(${ref}, ${lahir})) * 12 + EXTRACT(MONTH FROM AGE(${ref}, ${lahir})))::int`;

// Pembuat placeholder: const { params, p } = binder(); where.push(`x = ${p(nilai)}`)
function binder() {
  const params = [];
  return { params, p: (v) => (params.push(v), `$${params.length}`) };
}

// Daftar berpaginasi: hitung total lalu ambil satu halaman dengan kondisi yang sama.
async function paged({ select, from, where, params, orderBy }, pg) {
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows: [{ total }] } = await query(`SELECT COUNT(*)::int AS total FROM ${from} ${w}`, params);
  const { limit, offset } = toOffset(pg);
  const n = params.length;
  const { rows } = await query(
    `SELECT ${select} FROM ${from} ${w} ORDER BY ${orderBy} LIMIT $${n + 1} OFFSET $${n + 2}`,
    [...params, limit, offset]
  );
  return { rows, meta: buildMeta(pg, total) };
}

module.exports = { HARI_INI, usiaBulan, binder, paged };
