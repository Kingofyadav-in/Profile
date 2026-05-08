// Protect all /api/hi/* routes with HI_API_KEY env var
module.exports = function auth(req, res) {
  const key = process.env.HI_API_KEY;
  if (!key) return true; // no key set = open (dev only)
  const header = req.headers['authorization'] || '';
  if (header === `Bearer ${key}`) return true;
  res.status(401).json({ ok: false, error: 'Unauthorized' });
  return false;
};
