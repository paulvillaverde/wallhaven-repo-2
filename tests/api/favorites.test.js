import { describe, expect, it } from 'vitest'

import favIndex from '../../pages/api/user/favorites/index'
import favById from '../../pages/api/user/favorites/[imageId]'
import registerHandler from '../../pages/api/auth/register'
import loginHandler from '../../pages/api/auth/login'

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

describe('Favorites API', () => {
  const email = `favtest+${Date.now()}@example.com`;
  const password = 'password123';
  let cookie = null;
  let imageId = `img-${Date.now()}`;

  it('setup user (register)', async () => {
    const req = makeReq({ method: 'POST', body: { email, password, name: 'Fav Test' } });
    const res = makeRes();
    await registerHandler(req, res);
    const raw = res.getHeader('Set-Cookie') || res.getHeader('set-cookie');
    const m = String(raw).match(/token=([^;]+)/);
    cookie = m ? `token=${m[1]}` : raw;
  });

  it('add favorite -> POST /api/user/favorites', async () => {
    const ck = Array.isArray(cookie) ? cookie[0] : cookie;
    const req = makeReq({ method: 'POST', body: { image_id: imageId }, headers: { cookie: ck } });
    const res = makeRes();
    await favIndex(req, res);
    expect(res._body.ok).toBe(true);
    expect(res._body.favorite).toBeTruthy();
  });

  it('list favorites -> GET /api/user/favorites', async () => {
    const ck = Array.isArray(cookie) ? cookie[0] : cookie;
    const req = makeReq({ method: 'GET', headers: { cookie: ck } });
    const res = makeRes();
    await favIndex(req, res);
    expect(res._body.ok).toBe(true);
    expect(Array.isArray(res._body.favorites)).toBe(true);
  });

  it('delete favorite -> DELETE /api/user/favorites/[imageId]', async () => {
    const ck = Array.isArray(cookie) ? cookie[0] : cookie;
    const req = makeReq({ method: 'DELETE', headers: { cookie: ck }, query: { imageId } });
    const res = makeRes();
    await favById(req, res);
    expect(res._body.ok).toBe(true);
  });
});
