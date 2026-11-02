const ApiError = require('../utils/ApiError');

module.exports = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) throw new ApiError(403, 'Anda tidak memiliki akses ke fitur ini');
  next();
};
