const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');

const router = Router();

// Tanpa token
router.use('/health', require('./health.routes'));
router.use('/auth', require('./auth.routes'));

// Semua route di bawah ini wajib JWT (FR-02)
router.use(authenticate);
router.use('/kader', require('./kader.routes'));
router.use('/ibu', require('./ibu.routes'));
router.use('/balita', require('./balita.routes'));

module.exports = router;
