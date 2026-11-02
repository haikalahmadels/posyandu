const { Router } = require('express');
const { query } = require('../db/pool');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT NOW() AS time');
    res.json({ success: true, message: 'OK', data: { database: 'connected', time: rows[0].time } });
  } catch {
    res.status(503).json({ success: false, message: 'Database tidak terjangkau', data: { database: 'disconnected' } });
  }
});

module.exports = router;
