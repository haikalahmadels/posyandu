const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const v = require('../validators/auth.validator');
const c = require('../controllers/auth.controller');

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.LOGIN_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ success: false, message: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit' }),
});

router.post('/login', loginLimiter, validate({ body: v.login }), c.login);
router.get('/me', authenticate, c.me);
router.patch('/password', authenticate, validate({ body: v.gantiPassword }), c.gantiPassword);

module.exports = router;
