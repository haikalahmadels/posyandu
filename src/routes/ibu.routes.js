const { Router } = require('express');
const validate = require('../middlewares/validate');
const { idParam } = require('../validators/common');
const v = require('../validators/ibu.validator');
const c = require('../controllers/ibu.controller');

const router = Router();

router.get('/', validate({ query: v.list }), c.list);
router.get('/:id', validate({ params: idParam }), c.get);
router.post('/', validate({ body: v.body }), c.create);
router.put('/:id', validate({ params: idParam, body: v.body }), c.update);
router.delete('/:id', validate({ params: idParam }), c.remove);

module.exports = router;
