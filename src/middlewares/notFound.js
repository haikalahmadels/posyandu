const ApiError = require('../utils/ApiError');

module.exports = (req, res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} tidak ditemukan`));
};
