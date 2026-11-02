const toOffset = ({ page, limit }) => ({ limit, offset: (page - 1) * limit });

const buildMeta = ({ page, limit }, total) => ({
  page,
  limit,
  total,
  total_pages: Math.ceil(total / limit),
});

module.exports = { toOffset, buildMeta };
