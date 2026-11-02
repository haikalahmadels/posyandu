const posyanduService = require('../services/posyandu.service');
const { ok } = require('../utils/response');

exports.get = async (req, res) => {
  ok(res, await posyanduService.get(req.user.posyandu_id), 'Data posyandu berhasil diambil');
};

exports.update = async (req, res) => {
  ok(res, await posyanduService.update(req.user.posyandu_id, req.validated.body), 'Data posyandu berhasil diubah');
};
