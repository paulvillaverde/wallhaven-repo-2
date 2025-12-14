require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5174';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret';

app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from localhost on any port
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: __dirname }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 3600 * 1000,
    sameSite: 'lax',
    secure: false
  }
}));

function authRequired(req, res, next) {
  if (!req.session.user) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  next();
}

// Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password required' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const stmt = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)');
    stmt.run(email, hash, name || null, function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ ok: false, error: 'Email already exists' });
        return res.status(500).json({ ok: false, error: 'Database error' });
      }
      const user = { id: this.lastID, email, name: name || null };
      req.session.user = { id: user.id, email: user.email, name: user.name };
      res.json({ ok: true, user });
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ ok: false, error: 'Email and password required' });

  db.get('SELECT id, email, password_hash, name FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) return res.status(500).json({ ok: false, error: 'Database error' });
    if (!row) return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    req.session.user = { id: row.id, email: row.email, name: row.name };
    res.json({ ok: true, user: req.session.user });
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    res.clearCookie('connect.sid');
    if (err) return res.status(500).json({ ok: false, error: 'Failed to destroy session' });
    res.json({ ok: true });
  });
});

// current user
app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) return res.json({ ok: true, user: null });
  const id = req.session.user.id;
  db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ ok: false, error: 'Database error' });
    if (!row) return res.json({ ok: true, user: null });
    res.json({ ok: true, user: row });
  });
});

// Add endpoints for favorites (requires auth/session)
app.get('/api/user/favorites', (req, res) => {
  if (!req.session?.user) return res.status(200).json({ ok: true, favorites: [] });
  const userId = req.session.user.id;
  db.all(
    `SELECT id, image_id, title, url, thumb, dimension_x, dimension_y, created_at
     FROM favorites WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ ok: false, error: 'DB error' });
      return res.json({ ok: true, favorites: rows });
    }
  );
});

// Add favorite
app.post('/api/user/favorites', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  const userId = req.session.user.id;
  const { image_id, title, url, thumb, dimension_x, dimension_y } = req.body;
  if (!image_id) return res.status(400).json({ ok: false, error: 'image_id required' });

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO favorites
     (user_id, image_id, title, url, thumb, dimension_x, dimension_y)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(userId, image_id, title || null, url || null, thumb || null, dimension_x || null, dimension_y || null, function (err) {
    if (err) return res.status(500).json({ ok: false, error: 'DB error' });
    // return created/ignored row
    db.get('SELECT id, image_id, title, url, thumb, dimension_x, dimension_y, created_at FROM favorites WHERE user_id = ? AND image_id = ?', [userId, image_id], (e, row) => {
      if (e) return res.status(500).json({ ok: false, error: 'DB error' });
      return res.json({ ok: true, favorite: row });
    });
  });
});

// Remove favorite
app.delete('/api/user/favorites/:imageId', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ ok: false, error: 'Not authenticated' });
  const userId = req.session.user.id;
  const imageId = req.params.imageId;
  db.run('DELETE FROM favorites WHERE user_id = ? AND image_id = ?', [userId, imageId], function (err) {
    if (err) return res.status(500).json({ ok: false, error: 'DB error' });
    return res.json({ ok: true, deleted: this.changes });
  });
});

app.listen(PORT, () => console.log(`Auth server running on ${PORT}`));