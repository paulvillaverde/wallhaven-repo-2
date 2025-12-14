import db from '../../../../src/lib/db'
const { parseTokenFromReq, verifyToken } = require('../../auth/_helpers')

export default async function handler(req, res) {
  const token = parseTokenFromReq(req);
  const payload = token ? verifyToken(token) : null;
  const userId = payload?.id;
  console.log('[api/user/favorites/[imageId]] method=', req.method, 'userId=', userId, 'imageId=', req.query.imageId);

  if (req.method === 'DELETE') {
    if (!userId) return res.status(401).json({ ok: false, error: 'Not authenticated' });
    const imageId = req.query.imageId;
    await new Promise((resolve) => {
      db.run('DELETE FROM favorites WHERE user_id = ? AND image_id = ?', [userId, imageId], function(err) {
        if (err) {
          res.status(500).json({ ok: false, error: 'DB error' });
          return resolve();
        }
        res.json({ ok: true, deleted: this.changes });
        resolve();
      });
    });
    return;
  }

  res.status(405).end();
}
