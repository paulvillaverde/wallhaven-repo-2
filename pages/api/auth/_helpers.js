const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.SESSION_SECRET || 'dev_secret';
const TOKEN_NAME = 'token';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

function setTokenCookie(res, token) {
  const maxAge = 7 * 24 * 3600; // seconds
  // In production we should set Secure; keep SameSite=Lax for basic CSRF protection.
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookie = `${TOKEN_NAME}=${token}; Path=/; HttpOnly; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`;
  // Use append to not overwrite other cookies set in the same response
  const prev = res.getHeader && res.getHeader('Set-Cookie');
  if (prev) {
    const arr = Array.isArray(prev) ? prev.concat(cookie) : [prev, cookie];
    res.setHeader('Set-Cookie', arr);
  } else {
    res.setHeader('Set-Cookie', cookie);
  }
}

function clearTokenCookie(res) {
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookie = `${TOKEN_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax${secureFlag}`;
  const prev = res.getHeader && res.getHeader('Set-Cookie');
  if (prev) {
    const arr = Array.isArray(prev) ? prev.concat(cookie) : [prev, cookie];
    res.setHeader('Set-Cookie', arr);
  } else {
    res.setHeader('Set-Cookie', cookie);
  }
}

function parseTokenFromReq(req) {
  const cookie = req.headers?.cookie || '';
  if (!cookie) return null;
  const re = new RegExp(`${TOKEN_NAME}=([^;]+)`);
  const match = cookie.match(re);
  return match ? match[1] : null;
}

module.exports = { bcrypt, signToken, verifyToken, setTokenCookie, clearTokenCookie, parseTokenFromReq };
