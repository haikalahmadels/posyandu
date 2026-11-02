const { Router } = require('express');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { idParam } = require('../validators/common');
const v = require('../validators/kader.validator');
const c = require('../controllers/kader.controller');

const router = Router();

router.use(authorize('admin'));

router.get('/', validate({ query: v.list }), c.list);
router.get('/:id', validate({ params: idParam }), c.get);
router.post('/', validate({ body: v.create }), c.create);
router.put('/:id', validate({ params: idParam, body: v.update }), c.update);
router.delete('/:id', validate({ params: idParam }), c.remove);
router.patch('/:id/password', validate({ params: idParam, body: v.resetPassword }), c.resetPassword);

module.exports = router;
