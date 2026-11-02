const ApiError = require('../utils/ApiError');

// validate({ params, query, body }) → hasil parse di req.validated (req.query read-only di Express 5).
const validate = (schemas) => (req, res, next) => {
  const validated = {};
  const errors = [];

  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (result.success) {
      validated[key] = result.data;
    } else {
      errors.push(
        ...result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      );
    }
  }

  if (errors.length) throw new ApiError(400, 'Data tidak valid', errors);
  req.validated = validated;
  next();
};

module.exports = validate;
