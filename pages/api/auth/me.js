import db from '../../../src/lib/db'
const { parseTokenFromReq, verifyToken } = require('./_helpers')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const token = parseTokenFromReq(req);
  if (!token) return res.json({ ok: true, user: null });
  const payload = verifyToken(token);
  if (!payload) return res.json({ ok: true, user: null });
  const id = payload.id;
  // wait for DB query to complete before returning
  await new Promise((resolve) => {
    db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [id], (err, row) => {
      if (err) {
        res.status(500).json({ ok: false, error: 'Database error' });
        return resolve();
      }
      if (!row) {
        res.json({ ok: true, user: null });
        return resolve();
      }
      res.json({ ok: true, user: row });
      resolve();
    });
  });
}
