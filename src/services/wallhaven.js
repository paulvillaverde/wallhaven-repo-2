// services/wallhaven.js
// In Next.js use process.env.NODE_ENV to detect development. Keep compatibility
// with older Vite code which used import.meta.env.
const isDev =
  (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development") ||
  (typeof import.meta !== "undefined" && import.meta.env?.DEV);
const PROD_BASE = "https://wallhaven.cc/api/v1";
// Match Vite dev behavior: client calls /wh/api/v1/* which the Next rewrite
// will proxy to https://wallhaven.cc/api/v1/* during development.
const DEV_BASE = "/wh/api/v1";

// Use DEV_BASE in development and the real PROD_BASE otherwise.
const BASE = isDev ? DEV_BASE : PROD_BASE;

export async function searchWallpapers({
  q = "",
  page = 1,
  per_page = 24,
  // Client should not send an API key; the server proxy attaches WH_API_KEY.
  apiKey,
  apikey,
  sorting = "toplist",
  order = "asc",
  topRange = "1M",
  purity = "100", // SFW only
  categories = "100", // General only
  ratios, atleast, colors,
} = {}) {
  const url = new URL(`${BASE}/search`, window.location.origin);
  url.searchParams.set("q", q);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(per_page));
  url.searchParams.set("sorting", sorting);
  url.searchParams.set("purity", String(purity));
  url.searchParams.set("categories", String(categories));
  // Only include order and topRange if sorting by toplist
  if (sorting === "toplist") {
    url.searchParams.set("order", order);
    url.searchParams.set("topRange", topRange);
  }
  if (ratios)  url.searchParams.set("ratios", ratios);
  if (atleast) url.searchParams.set("atleast", atleast);
  if (colors)  url.searchParams.set("colors", colors);

  // ❌ DO NOT append ?apikey=... (401 if empty/invalid)
  // Client -> server proxy; server will attach the key. Send a plain request.
  console.log("[wallhaven.js] Fetching URL:", url.toString());
  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`[wallhaven.js] HTTP Error ${res.status}`);
    throw new Error(`HTTP ${res.status}`);
  }

  const text = await res.text();
  let data = JSON.parse(text);
  if (data && data.contents) data = JSON.parse(data.contents); // proxy wrapper tolerance

  if (!data || !data.data) {
    console.error("[wallhaven.js] Unexpected API response:", data);
    throw new Error("Unexpected API response.");
  }
  console.log(`[wallhaven.js] Success: ${data.data.length} images found`);
  return data; // { data, meta }
}

export async function getWallpaper(id, { apiKey } = {}) {
  if (!id) throw new Error('id required');
  const url = new URL(`${BASE}/w/${encodeURIComponent(id)}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const headers = {};
  if (apiKey && String(apiKey).trim().length > 0) headers['X-API-Key'] = String(apiKey).trim();

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let data = JSON.parse(text);
  if (data && data.contents) data = JSON.parse(data.contents);
  if (!data || !data.data) throw new Error('Unexpected API response.');
  return data;
}


