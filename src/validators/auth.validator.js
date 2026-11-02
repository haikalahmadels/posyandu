const { z, pesan } = require('./common');

// bcrypt hanya memakai 72 byte pertama, jadi batas atas mencegah password panjang "terpotong" diam-diam.
const password = (label) =>
  z.string(pesan(label)).min(8, `${label} minimal 8 karakter`).max(72, `${label} maksimal 72 karakter`);

const username = z
  .string(pesan('Username'))
  .regex(/^[a-z0-9_]{3,30}$/, 'Username 3–30 karakter: huruf kecil, angka, atau _');

const login = z.object({
  username: z.string(pesan('Username')).min(1, 'Username wajib diisi'),
  password: z.string(pesan('Password')).min(1, 'Password wajib diisi'),
});

const gantiPassword = z
  .object({
    password_lama: z.string(pesan('Password lama')).min(1, 'Password lama wajib diisi'),
    password_baru: password('Password baru'),
  })
  .refine((v) => v.password_baru !== v.password_lama, {
    message: 'Password baru harus berbeda dari password lama',
    path: ['password_baru'],
  });

module.exports = { password, username, login, gantiPassword };
