const { Router } = require('express');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const v = require('../validators/posyandu.validator');
const c = require('../controllers/posyandu.controller');

const router = Router();

router.get('/', c.get);
router.put('/', authorize('admin'), validate({ body: v.update }), c.update);

module.exports = router;
