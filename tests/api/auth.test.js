import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import registerHandler from '../../pages/api/auth/register'
import loginHandler from '../../pages/api/auth/login'
import meHandler from '../../pages/api/auth/me'

function makeReq({ method = 'GET', body = undefined, headers = {}, query = {} } = {}) {
  return { method, body, headers, query };
}

function makeRes() {
  const headers = {};
  return {
    status(code) { this._status = code; return this; },
    json(payload) { this._json = payload; return this; },
    get _body() { return this._json; },
    setHeader(name, value) { headers[name] = value; },
    getHeader(name) { return headers[name]; },
  };
}

describe('Auth API', () => {
  const email = `test+${Date.now()}@example.com`;
  const password = 'password123';
  let cookie = null;

  it('register -> should create a user and set cookie', async () => {
    const req = makeReq({ method: 'POST', body: { email, password, name: 'Test User' } });
    const res = makeRes();
    await registerHandler(req, res);
    expect(res._body.ok).toBe(true);
    const raw = res.getHeader('Set-Cookie') || res.getHeader('set-cookie');
    expect(raw).toBeDefined();
    const m = String(raw).match(/token=([^;]+)/);
    cookie = m ? `token=${m[1]}` : raw;
  });

  it('login -> should authenticate and set cookie', async () => {
    const req = makeReq({ method: 'POST', body: { email, password } });
    const res = makeRes();
    await loginHandler(req, res);
    expect(res._body.ok).toBe(true);
    const raw = res.getHeader('Set-Cookie') || res.getHeader('set-cookie');
    expect(raw).toBeDefined();
    const m = String(raw).match(/token=([^;]+)/);
    cookie = cookie || (m ? `token=${m[1]}` : raw);
  });

  it('me -> should return current user when cookie present', async () => {
    const ck = Array.isArray(cookie) ? cookie[0] : cookie;
    const req = makeReq({ method: 'GET', headers: { cookie: ck } });
    const res = makeRes();
    await meHandler(req, res);
    expect(res._body.ok).toBe(true);
    expect(res._body.user).toBeTruthy();
    expect(res._body.user.email).toBe(email);
  });
});
