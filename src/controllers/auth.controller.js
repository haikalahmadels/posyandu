const authService = require('../services/auth.service');
const { ok } = require('../utils/response');

exports.login = async (req, res) => {
  const { username, password } = req.validated.body;
  ok(res, await authService.login(username, password), 'Login berhasil');
};

exports.me = async (req, res) => {
  ok(res, await authService.me(req.user.id), 'Profil berhasil diambil');
};

exports.gantiPassword = async (req, res) => {
  const { password_lama, password_baru } = req.validated.body;
  await authService.gantiPassword(req.user.id, password_lama, password_baru);
  ok(res, null, 'Password berhasil diubah');
};
