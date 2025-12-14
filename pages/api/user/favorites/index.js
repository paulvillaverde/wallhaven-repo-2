import db from '../../../../src/lib/db'
const { parseTokenFromReq, verifyToken } = require('../../auth/_helpers')

export default async function handler(req, res) {
  const token = parseTokenFromReq(req);
  const payload = token ? verifyToken(token) : null;
  const userId = payload?.id;

  if (req.method === 'GET') {
    if (!userId) return res.status(200).json({ ok: true, favorites: [] });
    await new Promise((resolve) => {
      db.all('SELECT id, image_id, title, url, thumb, dimension_x, dimension_y, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
        if (err) {
          res.status(500).json({ ok: false, error: 'DB error' });
          return resolve();
        }
        res.json({ ok: true, favorites: rows });
        resolve();
      });
    });
    return;
  }

  if (req.method === 'POST') {
    if (!userId) return res.status(401).json({ ok: false, error: 'Not authenticated' });
    const { image_id, title, url, thumb, dimension_x, dimension_y } = req.body || {};
    if (!image_id) return res.status(400).json({ ok: false, error: 'image_id required' });

    const stmt = db.prepare(`INSERT OR IGNORE INTO favorites (user_id, image_id, title, url, thumb, dimension_x, dimension_y) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    await new Promise((resolve) => {
      stmt.run(userId, image_id, title || null, url || null, thumb || null, dimension_x || null, dimension_y || null, function(err) {
        if (err) {
          res.status(500).json({ ok: false, error: 'DB error' });
          return resolve();
        }
        db.get('SELECT id, image_id, title, url, thumb, dimension_x, dimension_y, created_at FROM favorites WHERE user_id = ? AND image_id = ?', [userId, image_id], (e, row) => {
          if (e) {
            res.status(500).json({ ok: false, error: 'DB error' });
            return resolve();
          }
          res.json({ ok: true, favorite: row });
          resolve();
        });
      });
    });
    return;
  }

  res.status(405).end();
}
