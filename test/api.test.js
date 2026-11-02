// Tes integrasi M1–M4 terhadap database terpisah `<nama db>_test` (di-reset setiap run).
// Jalankan: npm test
require('dotenv').config({ quiet: true });
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { Client } = require('pg');

const url = new URL(process.env.DATABASE_URL);
const namaDb = `${url.pathname.slice(1)}_test`;
url.pathname = `/${namaDb}`;
process.env.DATABASE_URL = url.toString();
process.env.NODE_ENV = 'test';

let server;
let base;
let db;
const token = {};

async function api(method, pathname, { body, as = 'admin', raw } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (as) headers.Authorization = `Bearer ${token[as]}`;
  const res = await fetch(`${base}/api${pathname}`, {
    method,
    headers,
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  return { status: res.status, body: await res.json() };
}

const login = async (username, password) =>
  (await api('POST', '/auth/login', { body: { username, password }, as: null })).body.data?.token;

before(async () => {
  const admin = new Client({ connectionString: process.env.DATABASE_URL.replace(`/${namaDb}`, '/postgres') });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [namaDb]);
  if (!rowCount) await admin.query(`CREATE DATABASE "${namaDb}"`);
  await admin.end();

  const reset = spawnSync(process.execPath, [path.join(__dirname, '..', 'database', 'run.js'), 'reset'], {
    env: process.env,
    encoding: 'utf8',
  });
  assert.equal(reset.status, 0, reset.stderr);

  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const app = require('../src/app');
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  token.admin = await login('admin', 'admin12345');
  token.sri = await login('sri', 'kader12345');
});

after(async () => {
  server?.close();
  await db?.end();
  await require('../src/db/pool').pool.end();
});

// ---------- M1 / M2 ----------

test('GET /health tanpa token → database connected', async () => {
  const r = await api('GET', '/health', { as: null });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.database, 'connected');
});

test('route tidak dikenal → 404 beramplop', async () => {
  const r = await api('GET', '/tidak-ada');
  assert.equal(r.status, 404);
  assert.equal(r.body.success, false);
});

test('JSON rusak → 400', async () => {
  const r = await api('POST', '/ibu', { raw: '{"nama":' });
  assert.equal(r.status, 400);
  assert.equal(r.body.message, 'Format JSON tidak valid');
});

test('id bukan angka → 400', async () => {
  const r = await api('GET', '/balita/abc');
  assert.equal(r.status, 400);
  assert.equal(r.body.errors[0].field, 'id');
});

// ---------- M3 ----------

test('login: password salah dan username tidak ada → 401 dengan pesan sama', async () => {
  const a = await api('POST', '/auth/login', { body: { username: 'admin', password: 'salah12345' }, as: null });
  const b = await api('POST', '/auth/login', { body: { username: 'tidakada', password: 'salah12345' }, as: null });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(a.body.message, b.body.message);
});

test('tanpa token → 401; /auth/me tidak membocorkan password_hash', async () => {
  assert.equal((await api('GET', '/ibu', { as: null })).status, 401);
  const r = await api('GET', '/auth/me');
  assert.equal(r.status, 200);
  assert.equal(r.body.data.username, 'admin');
  assert.equal(r.body.data.posyandu.nama, 'Posyandu Melati');
  assert.ok(!('password_hash' in r.body.data));
});

test('kader biasa → 403 di /kader dan PUT /posyandu', async () => {
  assert.equal((await api('GET', '/kader', { as: 'sri' })).status, 403);
  assert.equal((await api('PUT', '/posyandu', { as: 'sri', body: { nama: 'X' } })).status, 403);
  assert.equal((await api('GET', '/posyandu', { as: 'sri' })).status, 200);
});

test('kader dinonaktifkan → token lamanya 401, login 401', async () => {
  const buat = await api('POST', '/kader', {
    body: { nama: 'Kader Sementara', username: 'sementara', password: 'sementara123' },
  });
  assert.equal(buat.status, 201);
  assert.ok(!('password_hash' in buat.body.data));
  token.sementara = await login('sementara', 'sementara123');
  assert.equal((await api('GET', '/ibu', { as: 'sementara' })).status, 200);

  assert.equal((await api('DELETE', `/kader/${buat.body.data.id}`)).status, 200);
  assert.equal((await api('GET', '/ibu', { as: 'sementara' })).status, 401);
  assert.equal(await login('sementara', 'sementara123'), undefined);
});

test('username duplikat → 409 pada field username', async () => {
  const r = await api('POST', '/kader', { body: { nama: 'Sri Lain', username: 'sri', password: 'password123' } });
  assert.equal(r.status, 409);
  assert.equal(r.body.errors[0].field, 'username');
});

test('admin tidak bisa menonaktifkan dirinya sendiri → 400', async () => {
  const r = await api('DELETE', '/kader/1');
  assert.equal(r.status, 400);
});

test('ganti password: password lama salah → 400 pada password_lama', async () => {
  const r = await api('PATCH', '/auth/password', {
    as: 'sri',
    body: { password_lama: 'bukan-ini', password_baru: 'kaderBaru123' },
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.errors[0].field, 'password_lama');
});

// ---------- M4: ibu ----------

test('GET /ibu?hamil=true → hanya ibu yang diperkirakan masih hamil', async () => {
  const r = await api('GET', '/ibu?hamil=true');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.map((i) => i.nama), ['Dewi Lestari']);
  assert.equal((await api('GET', '/ibu?hamil=false')).status, 400);
});

test('GET /ibu: pencarian q (nama & awalan NIK), filter kunjungan, paginasi', async () => {
  const byNama = await api('GET', '/ibu?q=siti');
  assert.deepEqual(byNama.body.data.map((i) => i.nama), ['Siti Aminah']);
  const byNik = await api('GET', '/ibu?q=99990101019800');
  assert.deepEqual(byNik.body.data.map((i) => i.nama), ['Dewi Lestari']);
  const kunjungan = await api('GET', '/ibu?kunjungan_dari=2026-10-01&kunjungan_sampai=2026-10-31');
  assert.deepEqual(kunjungan.body.data.map((i) => i.nama), ['Dewi Lestari']);
  const hal = await api('GET', '/ibu?limit=2&page=2');
  assert.deepEqual(hal.body.meta, { page: 2, limit: 2, total: 3, total_pages: 2 });
  assert.equal((await api('GET', '/ibu?kunjungan_dari=2026-10-31&kunjungan_sampai=2026-10-01')).status, 400);
  const kosong = await api('GET', '/ibu?q=zzz');
  assert.equal(kosong.status, 200);
  assert.deepEqual(kosong.body.data, []);
});

test('ibu: NIK duplikat → 409; validasi per kolom → 400', async () => {
  const dup = await api('POST', '/ibu', {
    body: { nik: '9999010101950001', nama: 'Siti Lain', tanggal_lahir: '1990-01-01', alamat: 'RT 05' },
  });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.errors[0].field, 'nik');

  const salah = await api('POST', '/ibu', { body: { nik: '123', tanggal_lahir: '2020-01-01' } });
  assert.equal(salah.status, 400);
  const fields = salah.body.errors.map((e) => e.field).sort();
  assert.deepEqual(fields, ['alamat', 'nama', 'nik', 'tanggal_lahir']);
});

test('ibu yang masih punya balita aktif tidak bisa dihapus → 409', async () => {
  const r = await api('DELETE', '/ibu/1');
  assert.equal(r.status, 409);
});

test('data posyandu lain → 404', async () => {
  const { rows: [p] } = await db.query("INSERT INTO posyandu (nama) VALUES ('Posyandu Lain') RETURNING id");
  const { rows: [i] } = await db.query(
    `INSERT INTO ibu (posyandu_id, nik, nama, tanggal_lahir, alamat)
     VALUES ($1, '9999888877776666', 'Ibu Lain', '1990-01-01', 'Desa lain') RETURNING id`,
    [p.id]
  );
  assert.equal((await api('GET', `/ibu/${i.id}`)).status, 404);
  assert.equal((await api('DELETE', `/ibu/${i.id}`)).status, 404);
  const tambahBalita = await api('POST', '/balita', {
    body: { ibu_id: i.id, nama: 'Anak Lain', jenis_kelamin: 'L', tanggal_lahir: '2025-01-01' },
  });
  assert.equal(tambahBalita.status, 400);
  assert.equal(tambahBalita.body.errors[0].field, 'ibu_id');
  assert.ok(!(await api('GET', '/ibu?q=Lain')).body.data.length);
});

// ---------- M4: 5 route /balita (syarat tugas) ----------

test('balita: POST → GET semua → GET by ID → PUT → DELETE', async () => {
  const post = await api('POST', '/balita', {
    body: { ibu_id: 2, nik: null, nama: 'Eka', jenis_kelamin: 'L', tanggal_lahir: '2026-01-15' },
  });
  assert.equal(post.status, 201);
  const id = post.body.data.id;
  assert.equal(post.body.data.ibu.nama, 'Dewi Lestari');
  assert.equal(post.body.data.tanggal_lahir, '2026-01-15');
  assert.equal(post.body.data.pemeriksaan_terakhir, null);

  const semua = await api('GET', '/balita');
  assert.equal(semua.status, 200);
  assert.ok(semua.body.data.some((b) => b.id === id));
  assert.equal(semua.body.meta.total, 5);

  const satu = await api('GET', '/balita/1');
  assert.equal(satu.status, 200);
  assert.equal(satu.body.data.pemeriksaan_terakhir.tanggal_kunjungan, '2026-10-20');
  assert.equal(satu.body.data.pemeriksaan_terakhir.berat_badan, 9.4);
  assert.equal(satu.body.data.ibu.nik, '9999010101950001');

  const put = await api('PUT', `/balita/${id}`, {
    body: { ibu_id: 2, nama: 'Eka Saputra', jenis_kelamin: 'L', tanggal_lahir: '2026-01-15' },
  });
  assert.equal(put.status, 200);
  assert.equal(put.body.data.nama, 'Eka Saputra');
  assert.equal(put.body.data.nik, null);

  const del = await api('DELETE', `/balita/${id}`);
  assert.equal(del.status, 200);
  assert.deepEqual(del.body.data, { id });
  assert.equal((await api('GET', `/balita/${id}`)).status, 404);
  assert.equal((await api('DELETE', `/balita/${id}`)).status, 404);
  // Soft delete: baris tetap ada di database
  const { rows } = await db.query('SELECT deleted_at FROM balita WHERE id = $1', [id]);
  assert.ok(rows[0].deleted_at);
});

test('balita: usia ≥ 60 bulan, tanggal masa depan, jenis kelamin salah → 400', async () => {
  const tua = await api('POST', '/balita', {
    body: { ibu_id: 1, nama: 'Tua', jenis_kelamin: 'X', tanggal_lahir: '2020-01-01' },
  });
  assert.equal(tua.status, 400);
  assert.deepEqual(tua.body.errors.map((e) => e.field).sort(), ['jenis_kelamin', 'tanggal_lahir']);
  const depan = await api('POST', '/balita', {
    body: { ibu_id: 1, nama: 'Depan', jenis_kelamin: 'P', tanggal_lahir: '2099-01-01' },
  });
  assert.equal(depan.status, 400);
});

test('GET /balita: q cocok ke nama ibu, filter kunjungan & jenis kelamin', async () => {
  const q = await api('GET', '/balita?q=aminah');
  assert.deepEqual(q.body.data.map((b) => b.nama), ['Ani', 'Budi']);
  const okt = await api('GET', '/balita?kunjungan_dari=2026-10-01');
  assert.deepEqual(okt.body.data.map((b) => b.nama), ['Ani', 'Budi', 'Citra']);
  const lk = await api('GET', '/balita?jenis_kelamin=L');
  assert.deepEqual(lk.body.data.map((b) => b.nama), ['Budi', 'Dimas']);
});
