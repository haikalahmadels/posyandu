const balitaService = require('../services/balita.service');
const { ok, created } = require('../utils/response');

exports.list = async (req, res) => {
  const { rows, meta } = await balitaService.list(req.user.posyandu_id, req.validated.query);
  ok(res, rows, 'Data balita berhasil diambil', meta);
};

exports.get = async (req, res) => {
  ok(res, await balitaService.findById(req.user.posyandu_id, req.validated.params.id), 'Data balita berhasil diambil');
};

exports.create = async (req, res) => {
  created(res, await balitaService.create(req.user.posyandu_id, req.validated.body), 'Data balita berhasil ditambahkan');
};

exports.update = async (req, res) => {
  const { params, body } = req.validated;
  ok(res, await balitaService.update(req.user.posyandu_id, params.id, body), 'Data balita berhasil diubah');
};

exports.remove = async (req, res) => {
  ok(res, await balitaService.remove(req.user.posyandu_id, req.validated.params.id), 'Data balita berhasil dihapus');
};
