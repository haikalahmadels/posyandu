const { z, pesan, teks, noHp, paginasi, q } = require('./common');
const { password, username } = require('./auth.validator');

const role = z.enum(['admin', 'kader'], { error: 'Role harus admin atau kader' });

const list = z.object({
  q,
  is_active: z
    .enum(['true', 'false'], { error: 'is_active harus true atau false' })
    .transform((v) => v === 'true')
    .optional(),
  ...paginasi,
});

const create = z.object({
  nama: teks('Nama', 2, 100),
  username,
  password: password('Password'),
  no_hp: noHp,
  role: role.default('kader'),
});

const update = z.object({
  nama: teks('Nama', 2, 100),
  username,
  no_hp: noHp,
  role,
  is_active: z.boolean(pesan('Status aktif')),
});

const resetPassword = z.object({ password_baru: password('Password baru') });

module.exports = { list, create, update, resetPassword };
