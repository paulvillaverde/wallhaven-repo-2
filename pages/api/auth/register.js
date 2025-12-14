import db from '../../../src/lib/db'
const { bcrypt, signToken, setTokenCookie } = require('./_helpers')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password required' });

  try {
    const hash = await bcrypt.hash(password, 12);
    await new Promise((resolve) => {
      db.run('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [email, hash, name || null], function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            res.status(409).json({ ok: false, error: 'Email already exists' });
            return resolve();
          }
          res.status(500).json({ ok: false, error: 'Database error' });
          return resolve();
        }
        const user = { id: this.lastID, email, name: name || null };
        const token = signToken({ id: user.id });
        setTokenCookie(res, token);
        res.json({ ok: true, user });
        resolve();
      });
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Server error' });
  }
}
