import { NextApiRequest, NextApiResponse } from 'next'

// Proxy route that forwards requests to the Wallhaven API and injects the
// X-API-Key from the environment variable WH_API_KEY. This keeps the API key
// off the client and avoids CORS issues.
export default async function handler(req, res) {
  try {
    const { path } = req.query;
    const pathStr = Array.isArray(path) ? path.join('/') : String(path || '');

    // Reconstruct target URL and keep the original query string
    const originalUrl = req.url || '';
    const query = originalUrl.includes('?') ? originalUrl.slice(originalUrl.indexOf('?')) : '';
    const target = `https://wallhaven.cc/api/v1/${pathStr}${query}`;

    // Forward method, body and headers; attach server-side API key
    const headers = Object.assign({}, req.headers);
    // Remove host header to avoid issues and set a proper accept header
    delete headers.host;
    headers.accept = headers.accept || 'application/json';

    const apiKey = process.env.WH_API_KEY;
    if (apiKey) headers['x-api-key'] = apiKey;

    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Forward body for non-GET requests
    if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
      // req.body is already parsed by Next; if it's an object, stringify it.
      if (req.body && typeof req.body === 'object' && !(req.body instanceof Buffer)) {
        fetchOptions.body = JSON.stringify(req.body);
        fetchOptions.headers = fetchOptions.headers || {};
        fetchOptions.headers['content-type'] = fetchOptions.headers['content-type'] || 'application/json';
      } else if (req.body) {
        fetchOptions.body = req.body;
      }
    }

    const r = await fetch(target, fetchOptions);

    // Forward status and headers
    res.status(r.status);
    r.headers.forEach((value, key) => {
      // Avoid setting hop-by-hop headers
      if (['transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    const arrayBuffer = await r.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('proxy /api/wh error', err);
    res.status(500).json({ ok: false, error: 'Proxy error' });
  }
}
