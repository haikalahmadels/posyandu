const { z } = require('zod');
const { todayWIB } = require('../utils/date');

// Pesan "wajib diisi" bila kosong, "tidak valid" bila tipe salah. Pesan min/max ditulis per aturan.
const pesan = (label) => ({
  error: (iss) => (iss.input === undefined || iss.input === null ? `${label} wajib diisi` : `${label} tidak valid`),
});

// Field opsional: tidak dikirim / "" / null → null (PUT = ganti penuh, ADR-007).
const opsional = (schema) =>
  z.preprocess((v) => (v === '' || v === undefined ? null : v), schema.nullable());

const koma = (n) => String(n).replace('.', ',');

function angka(label, min, max, { satuan = '', desimal, bulat = false } = {}) {
  const rentang = `${label} harus antara ${koma(min)} dan ${koma(max)}${satuan && ` ${satuan}`}`;
  let s = z.number(pesan(label));
  if (bulat) s = s.int(`${label} harus bilangan bulat`);
  s = s.min(min, rentang).max(max, rentang);
  if (desimal !== undefined) s = s.multipleOf(10 ** -desimal, `${label} maksimal ${desimal} angka desimal`);
  return s;
}

const teks = (label, min, max) =>
  z.string(pesan(label)).trim().min(min, `${label} minimal ${min} karakter`).max(max, `${label} maksimal ${max} karakter`);

const tanggal = (label) => z.iso.date(pesan(label));

const tanggalLalu = (label) =>
  tanggal(label).refine((v) => v <= todayWIB(), `${label} tidak boleh di masa depan`);

const nik = (label = 'NIK') => z.string(pesan(label)).regex(/^[0-9]{16}$/, `${label} harus 16 digit angka`);

const noHp = opsional(
  z.string().trim().regex(/^(\+62|62|0)8[0-9]{7,12}$/, 'Nomor HP tidak valid (contoh: 081234567890)')
);

const bulatQuery = (msg, min, max = Number.MAX_SAFE_INTEGER) =>
  z.coerce.number({ error: msg }).int(msg).min(min, msg).max(max, msg);

const idParam = z.object({ id: bulatQuery('ID tidak valid', 1) });

const idBody = (label) => z.number(pesan(label)).int(`${label} tidak valid`).positive(`${label} tidak valid`);

const paginasi = {
  page: bulatQuery('page harus bilangan bulat ≥ 1', 1).default(1),
  limit: bulatQuery('limit harus bilangan bulat 1–100', 1, 100).default(10),
};

const q = z.string().trim().min(1).max(100, 'Kata kunci maksimal 100 karakter').optional();

// Rentang tanggal opsional di query; jika keduanya ada, dari ≤ sampai.
function rentangTanggal(schema, dariKey, sampaiKey) {
  return schema
    .extend({ [dariKey]: tanggal(dariKey).optional(), [sampaiKey]: tanggal(sampaiKey).optional() })
    .refine((v) => !v[dariKey] || !v[sampaiKey] || v[dariKey] <= v[sampaiKey], {
      message: `${dariKey} tidak boleh setelah ${sampaiKey}`,
      path: [dariKey],
    });
}

module.exports = {
  z, pesan, opsional, angka, teks, tanggal, tanggalLalu, nik, noHp, bulatQuery, idParam, idBody, paginasi, q,
  rentangTanggal,
};
