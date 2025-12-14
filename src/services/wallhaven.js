// services/wallhaven.js
const PROD_BASE = "https://wallhaven.cc/api/v1";
const DEV_BASE = "/wh/api/v1";
// In Next.js use process.env.NODE_ENV to detect development. Keep compatibility
// with older Vite code which used import.meta.env.
const isDev =
  (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development") ||
  (typeof import.meta !== "undefined" && import.meta.env?.DEV);
const BASE = isDev ? DEV_BASE : PROD_BASE;

export async function searchWallpapers({
  q = "",
  page = 1,
  per_page = 24,
  // Accept either `apiKey` (camelCase) or legacy `apikey` (lowercase) to be resilient
  apiKey,
  apikey,
  sorting = "toplist",
  order = "asc",
  topRange = "3M",
  purity = "100", // SFW only
  categories = "100", // General only
  ratios, atleast, colors,
} = {}) {
  const key = apiKey || apikey;
  const url = new URL(`${BASE}/search`, window.location.origin);
  url.searchParams.set("q", q);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(per_page));
  url.searchParams.set("sorting", sorting);
  url.searchParams.set("order", order);
  url.searchParams.set("topRange", topRange);
  url.searchParams.set("purity", String(purity));
  url.searchParams.set("categories", String(categories));
  if (ratios)  url.searchParams.set("ratios", ratios);
  if (atleast) url.searchParams.set("atleast", atleast);
  if (colors)  url.searchParams.set("colors", colors);

  // ❌ DO NOT append ?apikey=... (401 if empty/invalid)
  const headers = {};
  if (key && String(key).trim().length > 0) {
    headers["X-API-Key"] = String(key).trim(); // ✅ header-based auth
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const text = await res.text();
  let data = JSON.parse(text);
  if (data && data.contents) data = JSON.parse(data.contents); // proxy wrapper tolerance

  if (!data || !data.data) throw new Error("Unexpected API response.");
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


