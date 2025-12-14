import db from '../../../src/lib/db'
const { bcrypt, signToken, setTokenCookie } = require('./_helpers')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password required' });
  await new Promise((resolve) => {
    db.get('SELECT id, email, password_hash, name FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        res.status(500).json({ ok: false, error: 'Database error' });
        return resolve();
      }
      if (!row) {
        res.status(401).json({ ok: false, error: 'Invalid credentials' });
        return resolve();
      }
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) {
        res.status(401).json({ ok: false, error: 'Invalid credentials' });
        return resolve();
      }

      const user = { id: row.id, email: row.email, name: row.name };
      const token = signToken({ id: user.id });
      setTokenCookie(res, token);
      res.json({ ok: true, user });
      resolve();
    });
  });
}
