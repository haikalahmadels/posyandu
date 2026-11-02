const ibuService = require('../services/ibu.service');
const { ok, created } = require('../utils/response');

exports.list = async (req, res) => {
  const { rows, meta } = await ibuService.list(req.validated.query);
  ok(res, rows, 'Data ibu berhasil diambil', meta);
};

exports.get = async (req, res) => {
  ok(res, await ibuService.findById(req.validated.params.id), 'Data ibu berhasil diambil');
};

exports.create = async (req, res) => {
  created(res, await ibuService.create(req.validated.body), 'Data ibu berhasil ditambahkan');
};

exports.update = async (req, res) => {
  const { params, body } = req.validated;
  ok(res, await ibuService.update(params.id, body), 'Data ibu berhasil diubah');
};

exports.remove = async (req, res) => {
  ok(res, await ibuService.remove(req.validated.params.id), 'Data ibu berhasil dihapus');
};
