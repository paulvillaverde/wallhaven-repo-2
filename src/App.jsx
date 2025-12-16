// App.jsx
import React, { useEffect, useRef, useState } from "react";
import { searchWallpapers } from "./services/wallhaven";
import { useAuth } from "./hooks/useAuth";
import Modal from "./components/Modal";
import Register from "./auth/Register";
import Login from "./auth/Login";
import SignOutButton from "./auth/SignOutButton";

/* ===================== Constants ===================== */

const TOP_CATS = [
  "All Wallpapers",
  "Nature",
  "Abstract",
  "Minimal",
  "Space",
  "Anime",
  "Games",
  "Technology",
];

const SORT = [
  { label: "Latest", value: "date_added" },
  { label: "Most Popular", value: "toplist" },
  { label: "Most Viewed", value: "views" },
  { label: "Most Favorited", value: "favorites" },
  { label: "Random", value: "random" },
];
const LAYOUT = ["All Orientations", "Landscape", "Portrait", "Square"];
const QUALITY = ["All Resolutions", "4K & Above", "HD (1080p)", "Mobile Ready"];
const COLORS = [
  { name: "All Colors", hex: null },
  { name: "Red", hex: "cc0000" },
  { name: "Blue", hex: "0066cc" },
  { name: "Green", hex: "669900" },
  { name: "Purple", hex: "663399" },
  { name: "Orange", hex: "ff6600" },
  { name: "Pink", hex: "ea4c88" },
  { name: "Black", hex: "000000" },
  { name: "White", hex: "999999" },
  { name: "Yellow", hex: "ffcc33" },
  { name: "Brown", hex: "996633" },
];

// Wallhaven base
const PROD_BASE = "https://wallhaven.cc/api/v1";
const DEV_BASE = "/wh/api/v1";
const WH_BASE =
  typeof import.meta !== "undefined" && import.meta.env?.DEV
    ? DEV_BASE
    : PROD_BASE;

/* ===================== Utils ===================== */

function formatBytes(bytes) {
  if (!bytes) return "";
  const u = ["KB", "MB", "GB", "TB"];
  let i = -1;
  do {
    bytes /= 1024;
    i++;
  } while (bytes >= 1024 && i < u.length - 1);
  return `${bytes.toFixed(1)}${u[i]}`;
}
const toNum = (v, d = 0) =>
  (typeof v === "number" && !Number.isNaN(v) ? v : Number(v ?? d) || d);

async function fetchWithRetry(url, options = {}, tries = 3, baseDelay = 400) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i)));
        continue;
      }
      throw new Error(`${res.status} ${res.statusText}`);
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }
}

/* ===================== Modal ===================== */

function ImageModal({ image, onClose, onNext, onPrev, query }) {
  if (!image) return null;

  const isPortrait = (image?.dimension_y ?? 0) > (image?.dimension_x ?? 0);
  const is4k =
    (image?.dimension_x ?? 0) >= 3840 || (image?.dimension_y ?? 0) >= 2160;
  const category = (image?.category || "general").replace(/^\w/, (c) =>
    c.toUpperCase()
  );

  const handleDownload = async () => {
    try {
      const downloadUrl = image.path || image.url;
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Extract proper file extension
      let ext = 'jpg';
      if (image.file_type) {
        // Handle MIME types like "image/jpeg" or plain extensions like "png"
        ext = image.file_type.includes('/') 
          ? image.file_type.split('/')[1].replace('jpeg', 'jpg')
          : image.file_type;
      } else if (downloadUrl) {
        // Extract from URL
        const urlExt = downloadUrl.split('.').pop()?.split('?')[0];
        if (urlExt) ext = urlExt;
      }
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `wallhaven-${image.id || 'image'}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(image.path || image.url, '_blank');
    }
  };

  const onKey = React.useCallback(
    (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") onNext?.();
      if (e.key === "ArrowLeft") onPrev?.();
    },
    [onClose, onNext, onPrev]
  );

  React.useEffect(() => {
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__backdrop" onClick={onClose} />

      <div className="modal__panel">
        <div className="detail__left" style={{ position: "relative" }}>
          <button
            className="nav-btn nav-btn--left"
            onClick={(e) => {
              e.stopPropagation();
              onPrev?.();
            }}
            aria-label="Previous"
          >
            ◀
          </button>

          <img
            className="detail__image"
            src={image.path || image.thumbs?.large || image.url}
            alt=""
          />

          <button
            className="nav-btn nav-btn--right"
            onClick={(e) => {
              e.stopPropagation();
              onNext?.();
            }}
            aria-label="Next"
          >
            ▶
          </button>
        </div>

        <div className="modal__actions">
          <button className="btn btn--primary">Save</button>
          <button
            className="btn btn--ghost"
            onClick={() => {
              const url = image.path || image.url || image.short_url;
              if (navigator.share) {
                navigator.share({ url }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(url);
              }
            }}
            aria-label="Share / copy link"
          >
            ⤴
          </button>
          <button className="btn btn--ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <aside className="detail__right">
          <h2 className="detail__title">
            {image.id ? `#${image.id}` : "Wallpaper"}
          </h2>

          <div className="detail__chips">
            {query && <span className="chip">{query}</span>}
            <span className="chip">{category}</span>
            {is4k && <span className="chip chip--blue">4K</span>}
            <span className="chip">{isPortrait ? "Portrait" : "Landscape"}</span>
          </div>

          <div className="detail__stats">
            <div>
              <div className="stat__value">
                {(image.views ?? 0).toLocaleString()}
              </div>
              <div className="stat__label">Views</div>
            </div>
            <div>
              <div className="stat__value">
                {(image.favorites ?? 0).toLocaleString()}
              </div>
              <div className="stat__label">Favorites</div>
            </div>
          </div>

          <div className="detail__section">
            <h3>About this wallpaper</h3>
            <p>
              Resolution:{" "}
              {image.resolution ||
                `${image.dimension_x}×${image.dimension_y}`}
              {image.file_type ? ` • ${image.file_type.toUpperCase()}` : ""}
            </p>
          </div>

          <div className="detail__section">
            <h3>Download Options</h3>
            <button
              className="btn btn--download"
              onClick={handleDownload}
            >
              <span className="btn__icon">⬇</span>
              Download {is4k ? "4K" : "Full"}
              <span className="btn__meta">{formatBytes(image.file_size)}</span>
            </button>
          </div>

          {image.colors?.length ? (
            <div className="detail__section">
              <h3>Palette</h3>
              <div className="palette">
                {image.colors.slice(0, 6).map((c) => (
                  <span
                    key={c}
                    className="swatch"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/* ===================== App ===================== */

const App = () => {
  // categories
  const [activeCat, setActiveCat] = useState("All Wallpapers");

  const [query, setQuery] = useState("");
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // modal state
  const [selected, setSelected] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);

  // header controls
  const [safeMode, setSafeMode] = useState(true);

  // filters
  const [openDD, setOpenDD] = useState(false);
  const [sortBy, setSortBy] = useState("date_added"); // Default to Latest
  const [layout, setLayout] = useState(LAYOUT[0]);
  const [quality, setQuality] = useState(QUALITY[0]);
  const [color, setColor] = useState(COLORS[0]);

  const [totalPages, setTotalPages] = useState(1);

  const { user, setUser } = useAuth();

  // auth modals
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // profile screen
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState("favorites"); // "favorites" | "about"
  const [favImages, setFavImages] = useState([]);
  const [loadingFavs, setLoadingFavs] = useState(false);
  const [favError, setFavError] = useState("");

  // avatar
  const [avatarUrl, setAvatarUrl] = useState(null);
  const avatarFileRef = useRef(null);

  // live metadata cache (keeps counts stable)
  const metaCacheRef = useRef(new Map());

  const apiKey = "JKtOMDLrvv6sLV5C0GYxyRLUlpPGWAry";

  const buildParams = () => {
    let ratios;
    if (layout === "Landscape") ratios = "16x9,21x9,16x10,4x3,3x2";
    else if (layout === "Portrait") ratios = "9x16,10x16,2x3,3x4";
    else if (layout === "Square") ratios = "1x1";

    let atleast;
    if (quality === "4K & Above") atleast = "3840x2160";
    else if (quality === "HD (1080p)") atleast = "1920x1080";
    else if (quality === "Mobile Ready") atleast = "1080x1920";

    const params = {
      sorting: sortBy,
      ratios,
      atleast,
      purity: safeMode ? "100" : "110",
    };
    
    // Only add colors parameter if a color is selected
    if (color.hex) {
      params.colors = color.hex;
    }
    
    console.log("[App] buildParams:", params);
    return params;
  };

  async function fetchWallpapersFeed(searchQuery, currentPage) {
    setLoading(true);
    setError("");
    try {
      const params = buildParams();
      console.log("[App] Fetching with params:", { q: searchQuery, page: currentPage, ...params });
      const data = await searchWallpapers({
        q: searchQuery,
        page: currentPage,
        per_page: 24,
        apikey: apiKey,
        ...params,
      });

      const list = Array.isArray(data?.data) ? data.data : [];
      console.log("[App] Received images:", list.length);
      
      if (list.length === 0) {
        console.warn("[App] No images found with current filters. Try different filters.");
      }
      
      if (list.length) {
        const cache = metaCacheRef.current;
        for (const it of list) {
          if (!it?.id) continue;
          const prev = cache.get(it.id) || {};
          cache.set(it.id, {
            ...prev,
            favorites: toNum(it.favorites, prev.favorites),
            views: toNum(it.views, prev.views),
            uploader: it.uploader || prev.uploader,
            dimension_x: it.dimension_x ?? prev.dimension_x,
            dimension_y: it.dimension_y ?? prev.dimension_y,
            resolution:
              it.resolution ||
              prev.resolution ||
              (it.dimension_x && it.dimension_y
                ? `${it.dimension_x}×${it.dimension_y}`
                : undefined),
            category: it.category ?? prev.category,
            file_type: it.file_type ?? prev.file_type,
            thumbs: it.thumbs || prev.thumbs,
            path: it.path || prev.path,
          });
        }
      }

      setImages(list);
      setTotalPages(data?.meta?.last_page || 1);
    } catch (err) {
      setImages([]);
      setError(err?.message || "Failed to fetch wallpapers. Please try again.");
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWallpapersFeed("", 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialPageLoad = useRef(true);
  useEffect(() => {
    if (initialPageLoad.current) {
      initialPageLoad.current = false;
      return;
    }
    fetchWallpapersFeed(query, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const applyFilters = () => {
    setPage(1);
    fetchWallpapersFeed(query, 1);
    setOpenDD(false);
  };

  const handleSearch = async () => {
    setPage(1);
    await fetchWallpapersFeed(query, 1);
  };

  const resetFilters = () => {
    setSortBy("date_added");
    setLayout(LAYOUT[0]);
    setQuality(QUALITY[0]);
    setColor(COLORS[0]);
  };

  useEffect(() => {
    if (!openDD) return;
    const close = (e) => {
      const panel = document.querySelector(".filters-dd");
      const btn = document.querySelector(".filters__btn");
      if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target))
        setOpenDD(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openDD]);

  const openModal = (img, index) => {
    setSelected(img);
    setSelectedIndex(index);
  };

  const closeModal = () => {
    setSelected(null);
    setSelectedIndex(null);
  };

  const showNext = () => {
    if (selectedIndex === null || images.length === 0) return;
    const nextIndex = (selectedIndex + 1) % images.length;
    setSelected(images[nextIndex]);
    setSelectedIndex(nextIndex);
  };

  const showPrev = () => {
    if (selectedIndex === null || images.length === 0) return;
    const prevIndex = (selectedIndex - 1 + images.length) % images.length;
    setSelected(images[prevIndex]);
    setSelectedIndex(prevIndex);
  };

  // keep isFav in sync across main gallery and favorites page
  function setIsFavEverywhere(id, value) {
    setImages((prev) =>
      prev.map((it) => (it?.id === id ? { ...it, isFav: value } : it))
    );
    setFavImages((prev) =>
      prev.map((it) => (it?.id === id ? { ...it, isFav: value } : it))
    );
  }

  // favorites toggle (shared)
  async function toggleFavorite(img) {
    const id = img.id;
    const prevVal = Boolean(img.isFav);
    const nextVal = !prevVal;

    // optimistic UI for both lists
    setIsFavEverywhere(id, nextVal);

    try {
      if (!nextVal) {
        const res = await fetch(
          `/api/user/favorites/${encodeURIComponent(id)}`,
          { method: "DELETE", credentials: "include" }
        );
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Failed to remove favorite");

        // remove from favorites screen list
        setFavImages((cur) => cur.filter((x) => x.id !== id));
      } else {
        const res = await fetch("/api/user/favorites", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_id: id,
            title: id,
            url: img.path || img.url || img.short_url || null,
            thumb: img.thumbs?.small || img.thumbs?.large || null,
            dimension_x: img.dimension_x || null,
            dimension_y: img.dimension_y || null,
          }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "Failed to add favorite");
      }
    } catch (err) {
      // rollback
      setIsFavEverywhere(id, prevVal);
    }
  }

  // profile helpers
  function getInitials(u) {
    const raw = (u?.name || u?.email || "").trim();
    if (!raw) return "U";
    const parts = raw.split(/[\s.@_+-]+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // avatar persistence (localStorage per-email)
  useEffect(() => {
    if (!user?.email) {
      setAvatarUrl(null);
      return;
    }
    try {
      const saved = localStorage.getItem(`avatar:${user.email}`);
      setAvatarUrl(saved || null);
    } catch {
      setAvatarUrl(null);
    }
  }, [user]);

  function handlePickAvatar(e) {
    const file = e.target.files?.[0];
    if (!file || !user?.email) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setAvatarUrl(dataUrl);
      try {
        localStorage.setItem(`avatar:${user.email}`, dataUrl);
      } catch {}
    };
    reader.readAsDataURL(file);
  }

  async function fetchWHDetails(id) {
    const headers = {};
    if (apiKey && String(apiKey).trim()) headers["X-API-Key"] = apiKey;
    const res = await fetchWithRetry(`${WH_BASE}/w/${id}`, { headers }, 3, 500);
    const json = await res.json();
    return json?.data || {};
  }

  function mergeWithCache(id, baseObj = {}, detail = {}) {
    const cache = metaCacheRef.current.get(id) || {};
    const dimension_x =
      detail.dimension_x ?? baseObj.dimension_x ?? cache.dimension_x ?? null;
    const dimension_y =
      detail.dimension_y ?? baseObj.dimension_y ?? cache.dimension_y ?? null;

    return {
      ...baseObj,
      ...detail,
      id,
      isFav: true,
      thumbs: detail.thumbs || baseObj.thumbs || cache.thumbs,
      path: detail.path || baseObj.path || cache.path || baseObj.url || null,
      dimension_x,
      dimension_y,
      resolution:
        detail.resolution ||
        baseObj.resolution ||
        cache.resolution ||
        (dimension_x && dimension_y ? `${dimension_x}×${dimension_y}` : undefined),
      favorites: toNum(
        detail.favorites,
        toNum(baseObj.favorites, toNum(cache.favorites, 0))
      ),
      views: toNum(detail.views, toNum(baseObj.views, toNum(cache.views, 0))),
      uploader:
        detail.uploader || baseObj.uploader || cache.uploader || {
          username: "Unknown",
        },
      file_type: detail.file_type ?? baseObj.file_type ?? cache.file_type,
      category: detail.category ?? baseObj.category ?? cache.category,
    };
  }

  async function hydrateFavorites(rawFavs) {
    const out = [];
    const step = 6;
    for (let i = 0; i < rawFavs.length; i += step) {
      const chunk = rawFavs.slice(i, i + step);
      const details = await Promise.all(
        chunk.map(async (f) => {
          const id = f.image_id || f.id;
          try {
            const d = await fetchWHDetails(id);
            const cache = metaCacheRef.current.get(id) || {};
            metaCacheRef.current.set(id, {
              ...cache,
              favorites: toNum(d.favorites, cache.favorites),
              views: toNum(d.views, cache.views),
              uploader: d.uploader || cache.uploader,
              dimension_x: d.dimension_x ?? cache.dimension_x,
              dimension_y: d.dimension_y ?? cache.dimension_y,
              resolution:
                d.resolution ||
                cache.resolution ||
                (d.dimension_x && d.dimension_y
                  ? `${d.dimension_x}×${d.dimension_y}`
                  : undefined),
              category: d.category ?? cache.category,
              file_type: d.file_type ?? cache.file_type,
              thumbs: d.thumbs || cache.thumbs,
              path: d.path || cache.path,
            });
            return mergeWithCache(id, f, d);
          } catch {
            return mergeWithCache(id, f, {});
          }
        })
      );
      out.push(...details);
    }
    return out;
  }

  async function loadFavoritesScreen() {
    if (!user) return;
    setProfileTab("favorites");
    setFavError("");
    setLoadingFavs(true);
    let cancelled = false;
    try {
      const r = await fetch("/api/user/favorites", {
        credentials: "include",
      });
      const j = await r.json();
      const list = Array.isArray(j?.favorites) ? j.favorites : [];
      const hydrated = await hydrateFavorites(list);
      if (!cancelled) setFavImages(hydrated);
    } catch (e) {
      if (!cancelled) {
        setFavImages([]);
        setFavError(e?.message || "Failed to load favorites.");
      }
    } finally {
      if (!cancelled) setLoadingFavs(false);
    }
    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    if (showProfile) loadFavoritesScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showProfile]);

  // profile screen (full page)
  if (showProfile) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-header">
            <div className="profile-header__top">
              <button
                className="btn btn-outline btn-small"
                onClick={() => setShowProfile(false)}
                title="Back to feed"
              >
                ← Back
              </button>
              <SignOutButton
                onSignedOut={() => {
                  setUser(null);
                  setShowProfile(false);
                }}
              />
            </div>

            <div className="avatar-wrap" aria-hidden="false">
              {avatarUrl ? (
                <img className="avatar-img" src={avatarUrl} alt="Avatar" />
              ) : (
                <div className="avatar-fallback">{getInitials(user)}</div>
              )}
              <button
                type="button"
                className="avatar-edit"
                aria-label="Edit avatar"
                onClick={() => avatarFileRef.current?.click()}
                title="Edit avatar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </button>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                onChange={handlePickAvatar}
                hidden
              />
            </div>

            <div className="profile-name">
              {user?.name || user?.email || "Account"}
            </div>
            <div className="profile-email">{user?.email || ""}</div>

            <div className="pill-tabs">
              <button
                className={`pill ${profileTab === "favorites" ? "active" : ""}`}
                onClick={() => setProfileTab("favorites")}
              >
                Favorites
              </button>
              <button
                className={`pill ${profileTab === "about" ? "active" : ""}`}
                onClick={() => setProfileTab("about")}
              >
                About
              </button>
            </div>
          </div>

          {profileTab === "about" && (
            <div className="about-card">
              <h3>Account</h3>
              <div className="about-row">
                <strong>Email</strong>
                <span>{user?.email || "—"}</span>
              </div>
              <div className="about-row">
                <strong>Name</strong>
                <span>{user?.name || "—"}</span>
              </div>
              <p className="about-note">
                Your saved favorites appear below. Click a card to preview.
              </p>
            </div>
          )}

          {profileTab === "favorites" && (
            <>
              {loadingFavs && <p className="meta-line">Loading favorites…</p>}
              {favError && (
                <p className="meta-line" style={{ color: "red" }}>
                  {favError}
                </p>
              )}
              {!loadingFavs && favImages.length === 0 && (
                <p className="meta-line">No favorites yet.</p>
              )}

              <section className="profile-grid">
                {favImages.map((img, idx) => (
                  <div
                    key={img.id ?? `${img.url}-${idx}`}
                    className="cardv"
                    onClick={() => openModal(img, idx)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="cardv__media">
                      {(img.thumbs?.large || img.url || img.path) && (
                        <img
                          src={img.thumbs?.large || img.url || img.path}
                          alt="Wallpaper preview"
                          loading="lazy"
                        />
                      )}
                      <div className="cardv__overlay">
                        <button
                          className={`fav-btn ${img.isFav ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) return;
                            toggleFavorite(img);
                          }}
                          title={img.isFav ? "Remove favorite" : "Add favorite"}
                        >
                          {img.isFav ? "❤️" : "🤍"}
                        </button>
                      </div>
                    </div>

                    <div className="cardv__body">
                      <h3 className="cardv__title">{img.id || "Wallpaper"}</h3>
                      <div className="cardv__by">
                        by <span>{img.uploader?.username || "Unknown"}</span>
                      </div>

                      <div className="meta">
                        <div className="meta__item" title="Favorites">
                          <span className="meta__num">
                            {toNum(img.favorites).toLocaleString()}
                          </span>
                          <span className="meta__icon" aria-hidden="true">❤️</span>
                        </div>
                        <div className="meta__item" title="Views">
                          <span className="meta__num">
                            {toNum(img.views).toLocaleString()}
                          </span>
                          <span className="meta__icon" aria-hidden="true">👁</span>
                        </div>
                        <div className="meta__item" title="Resolution">
                          <span className="meta__num">
                            {img.resolution ||
                              `${img.dimension_x ?? "—"}×${img.dimension_y ?? "—"}`}
                          </span>
                        </div>
                      </div>

                      <div className="tags">
                        {(img.tags || []).slice(0, 3).map((t) => (
                          <span key={t?.id || t?.name} className="tag">
                            {t?.name || "tag"}
                          </span>
                        ))}
                        {Array.isArray(img.tags) && img.tags.length > 3 && (
                          <span className="tag tag--muted">
                            +{img.tags.length - 3}
                          </span>
                        )}
                        {!img.tags && (
                          <>
                            <span className="tag">
                              {img.category || "general"}
                            </span>
                            <span className="tag">
                              {img.file_type?.toUpperCase() || "IMAGE"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}

          {selected && (
            <ImageModal
              image={selected}
              onClose={closeModal}
              onNext={showNext}
              onPrev={showPrev}
              query={query}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* NAV */}
      <div className="nav">
        <div className="nav__left">
          <div className="logo-badge">W</div>
          <div className="nav__brand">
            <div className="nav__title">WallHaven</div>
            <div className="nav__subtitle">Premium wallpapers</div>
          </div>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {user ? (
            <>
              <button
                className="account-btn"
                onClick={() => setShowProfile(true)}
                aria-haspopup="dialog"
                title="Open profile"
              >
                {avatarUrl ? (
                  <img className="account-avatar-img" src={avatarUrl} alt="Avatar" />
                ) : (
                  <span className="account-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      width="28"
                      height="28"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <circle cx="12" cy="12" r="10" fill="none" />
                      <circle cx="12" cy="8" r="3" fill="currentColor" />
                      <path
                        d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                )}
              </button>
              <SignOutButton onSignedOut={() => setUser(null)} />
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setShowLogin((v) => !v);
                  setShowRegister(false);
                }}
                className="btn btn-outline"
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  setShowRegister((v) => !v);
                  setShowLogin(false);
                }}
                className="btn btn-primary"
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>

      {showLogin && (
        <Modal onClose={() => setShowLogin(false)} ariaLabel="Sign In">
          <Login
            onSignedIn={(user) => {
              setUser(user);
              setShowLogin(false);
            }}
            onClose={() => setShowLogin(false)}
            onSwitchToRegister={() => {
              setShowLogin(false);
              setShowRegister(true);
            }}
          />
        </Modal>
      )}

      {showRegister && (
        <Modal onClose={() => setShowRegister(false)} ariaLabel="Register">
          <Register
            onSignedIn={(user) => {
              setUser(user);
              setShowRegister(false);
            }}
            onClose={() => setShowRegister(false)}
            onSwitchToLogin={() => {
              setShowRegister(false);
              setShowLogin(true);
            }}
          />
        </Modal>
      )}

      {/* Categories */}
      <div className="cats">
        {TOP_CATS.map((c) => (
          <button
            key={c}
            className={`cat ${activeCat === c ? "cat--active" : ""}`}
            onClick={() => {
              setActiveCat(c);
              setPage(1);
              fetchWallpapersFeed(c === "All Wallpapers" ? "" : c, 1);
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar wallify">
        <button className="filters__btn" onClick={() => setOpenDD((v) => !v)}>
          <span className="filters__icon">⏷</span> Filters
        </button>

        <div className="safe">
          <span>Safe Mode</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={safeMode}
              onChange={(e) => setSafeMode(e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        {openDD && (
          <div className="filters-dd">
            <div className="filters-dd__row">
              <label className="filters-dd__label">Sort by:</label>
              <div className="select">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {SORT.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="select__chev">▾</span>
              </div>
            </div>

            <div className="filters-dd__row">
              <span className="filters-dd__label">Layout:</span>
              <div className="chiprow">
                {LAYOUT.map((v) => (
                  <button
                    key={v}
                    className={`chip2 ${layout === v ? "chip2--active" : ""}`}
                    onClick={() => setLayout(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="filters-dd__row">
              <span className="filters-dd__label">Quality:</span>
              <div className="chiprow">
                {QUALITY.map((v) => (
                  <button
                    key={v}
                    className={`chip2 ${quality === v ? "chip2--active" : ""}`}
                    onClick={() => setQuality(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="filters-dd__row">
              <span className="filters-dd__label">Color:</span>
              <div className="chiprow">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    className={`chip2 ${color.name === c.name ? "chip2--active" : ""}`}
                    onClick={() => setColor(c)}
                  >
                    <span
                      className="dot"
                      style={{
                        background: c.hex
                          ? `#${c.hex}`
                          : "linear-gradient(90deg,#ff6b6b,#ffd93d,#6bcBef)",
                      }}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="filters-dd__actions">
              <button className="btn btn--ghost" onClick={resetFilters}>
                Reset
              </button>
              <button className="btn btn--primary" onClick={applyFilters}>
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* States */}
      {loading && <p className="meta-line">Loading wallpapers...</p>}
      {error && (
        <p className="meta-line" style={{ color: "red" }}>
          {error}
        </p>
      )}
      {!loading && !error && images.length === 0 && (
        <p className="meta-line" style={{ color: "var(--muted)", fontSize: "16px", padding: "40px 20px" }}>
          No wallpapers found with the selected filters. Try different color or filters.
        </p>
      )}

      {/* Gallery */}
      <section className="gallery">
        {images.map((img, idx) => (
          <div
            key={img.id ?? `${img.url}-${idx}`}
            className="cardv"
            onClick={() => openModal(img, idx)}
            role="button"
            tabIndex={0}
          >
            <div className="cardv__media">
              {(img.thumbs?.large || img.url) && (
                <img
                  src={img.thumbs?.large || img.url}
                  alt="Wallpaper preview"
                  loading="lazy"
                />
              )}

              <div className="cardv__overlay">
                <button
                  className={`fav-btn ${img.isFav ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!user) {
                      setShowLogin(true);
                      return;
                    }
                    toggleFavorite(img);
                  }}
                  title={img.isFav ? "Remove favorite" : "Add favorite"}
                >
                  {img.isFav ? "❤️" : "🤍"}
                </button>
              </div>
            </div>

            <div className="cardv__body">
              <h3 className="cardv__title">{img.id || "Wallpaper"}</h3>
              <div className="cardv__by">
                by <span>{img.uploader?.username || "Unknown"}</span>
              </div>

              <div className="meta">
                <div className="meta__item" title="Favorites">
                  <span className="meta__num">
                    {toNum(img.favorites).toLocaleString()}
                  </span>
                  <span className="meta__icon" aria-hidden="true">❤️</span>
                </div>
                <div className="meta__item" title="Views">
                  <span className="meta__num">
                    {toNum(img.views).toLocaleString()}
                  </span>
                  <span className="meta__icon" aria-hidden="true">👁</span>
                </div>
                <div className="meta__item" title="Resolution">
                  <span className="meta__num">
                    {img.resolution ||
                      `${img.dimension_x ?? "—"}×${img.dimension_y ?? "—"}`}
                  </span>
                </div>
              </div>

              <div className="tags">
                {(img.tags || []).slice(0, 3).map((t) => (
                  <span key={t?.id || t?.name} className="tag">
                    {t?.name || "tag"}
                  </span>
                ))}
                {Array.isArray(img.tags) && img.tags.length > 3 && (
                  <span className="tag tag--muted">+{img.tags.length - 3}</span>
                )}
                {!img.tags && (
                  <>
                    <span className="tag">{img.category || "general"}</span>
                    <span className="tag">
                      {img.file_type?.toUpperCase() || "IMAGE"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      {images.length > 0 && (
        <div className="pagination">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            style={{
              margin: "0 8px",
              borderRadius: "6px",
              border: "none",
              padding: "6px 12px",
              cursor: page <= 1 ? "not-allowed" : "pointer",
              background: "transparent",
            }}
          >
            ◀ Prev
          </button>

          {(() => {
            const maxButtons = 5;
            let start = Math.max(1, page - Math.floor(maxButtons / 2));
            let end = start + maxButtons - 1;
            if (end > totalPages) {
              end = totalPages;
              start = Math.max(1, end - maxButtons + 1);
            }
            return Array.from({ length: end - start + 1 }, (_, i) => (
              <button
                key={start + i}
                onClick={() => setPage(start + i)}
                className={page === start + i ? "active" : ""}
                style={{
                  margin: "0 4px",
                  fontWeight: page === start + i ? "bold" : "normal",
                  background: page === start + i ? "#eee" : "transparent",
                  borderRadius: "6px",
                  border: "none",
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                {start + i}
              </button>
            ));
          })()}

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            style={{
              margin: "0 8px",
              borderRadius: "6px",
              border: "none",
              padding: "6px 12px",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              background: "transparent",
            }}
          >
            Next ▶
          </button>
        </div>
      )}

      <footer>Built with Wallhaven API</footer>

      {selected && (
        <ImageModal
          image={selected}
          onClose={closeModal}
          onNext={showNext}
          onPrev={showPrev}
          query={query}
        />
      )}
    </div>
  );
};

export default App;
