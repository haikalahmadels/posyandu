const ok = (res, data, message = 'Berhasil', meta) =>
  res.status(200).json({ success: true, message, data, ...(meta && { meta }) });

const created = (res, data, message = 'Data berhasil dibuat') =>
  res.status(201).json({ success: true, message, data });

module.exports = { ok, created };
