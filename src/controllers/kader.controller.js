const kaderService = require('../services/kader.service');
const { ok, created } = require('../utils/response');

exports.list = async (req, res) => {
  const { rows, meta } = await kaderService.list(req.validated.query);
  ok(res, rows, 'Data kader berhasil diambil', meta);
};

exports.get = async (req, res) => {
  ok(res, await kaderService.findById(req.validated.params.id), 'Data kader berhasil diambil');
};

exports.create = async (req, res) => {
  created(res, await kaderService.create(req.validated.body), 'Akun kader berhasil dibuat');
};

exports.update = async (req, res) => {
  ok(res, await kaderService.update(req.user, req.validated.params.id, req.validated.body), 'Data kader berhasil diubah');
};

exports.remove = async (req, res) => {
  ok(res, await kaderService.deactivate(req.user, req.validated.params.id), 'Akun kader berhasil dinonaktifkan');
};

exports.resetPassword = async (req, res) => {
  await kaderService.resetPassword(req.validated.params.id, req.validated.body.password_baru);
  ok(res, null, 'Password kader berhasil direset');
};
