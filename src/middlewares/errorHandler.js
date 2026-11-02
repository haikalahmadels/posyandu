const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const UNIQUE = {
  uq_ibu_nik_aktif: ['NIK ibu sudah terdaftar', 'nik'],
  uq_balita_nik_aktif: ['NIK balita sudah terdaftar', 'nik'],
  uq_pb_per_tanggal: ['Balita ini sudah memiliki pemeriksaan pada tanggal tersebut', 'tanggal_kunjungan'],
  uq_pih_per_tanggal: ['Ibu ini sudah memiliki pemeriksaan pada tanggal tersebut', 'tanggal_kunjungan'],
  kader_username_key: ['Username sudah digunakan', 'username'],
};

const CHECK_FIELD = {
  chk_kader_role: 'role',
  chk_ibu_nik: 'nik',
  chk_balita_nik: 'nik',
  chk_balita_jk: 'jenis_kelamin',
  chk_pb_bb: 'berat_badan',
  chk_pb_tb: 'tinggi_badan',
  chk_pb_lk: 'lingkar_kepala',
  chk_pb_lila: 'lila',
  chk_pih_usia: 'usia_kehamilan_minggu',
  chk_pih_bb: 'berat_badan',
  chk_pih_sis: 'tekanan_sistolik',
  chk_pih_dia: 'tekanan_diastolik',
  chk_pih_td: 'tekanan_diastolik',
  chk_pih_lila: 'lila',
};

function toApiError(err) {
  if (err instanceof ApiError) return err;

  if (err.type === 'entity.parse.failed') return new ApiError(400, 'Format JSON tidak valid');
  // Error lain dari body parser (mis. body terlalu besar) membawa status 4xx sendiri.
  if (err.type && err.status >= 400 && err.status < 500) {
    return new ApiError(err.status, 'Permintaan tidak dapat diproses');
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return new ApiError(401, 'Sesi tidak valid, silakan login ulang');
  }

  switch (err.code) {
    case '23505': {
      const [message, field] = UNIQUE[err.constraint] || ['Data sudah ada'];
      return new ApiError(409, message, field && [{ field, message }]);
    }
    case '23503':
      return new ApiError(409, 'Data masih digunakan oleh data lain');
    case '23514': {
      const message = 'Nilai di luar rentang yang diizinkan';
      const field = CHECK_FIELD[err.constraint];
      return new ApiError(400, message, field && [{ field, message }]);
    }
    case '22P02':
      return new ApiError(400, 'Format data tidak valid');
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const apiError = toApiError(err);

  if (!apiError) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  res.status(apiError.status).json({
    success: false,
    message: apiError.message,
    ...(apiError.errors && { errors: apiError.errors }),
  });
};
