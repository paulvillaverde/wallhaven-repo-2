import React, { useEffect, useMemo, useRef, useState } from "react"; 
import { getWallpaper } from "../services/wallhaven"; 
import SignOutButton from "../auth/SignOutButton";
function getInitials(user) { 
const raw = (user?.name || user?.email || "").trim(); 
if (!raw) return "U"; 
const parts = raw.split(/[\s.@_+-]+/).filter(Boolean); 
if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase(); 
return (parts[0][0] + parts[1][0]).toUpperCase(); 
} 
function formatBytes(bytes) { 
if (!bytes) return ""; 
const u = ["KB", "MB", "GB", "TB"]; 
let i = -1; 
do { bytes /= 1024; i++; } while (bytes >= 1024 && i < u.length - 1); 
return `${bytes.toFixed(1)}${u[i]}`; 
} 
export default function ProfilePage({ user, onClose, apiKey }) { 
const [tab, setTab] = useState("favorites"); // "favorites" | "about" 
const [loading, setLoading] = useState(true); 
const [error, setError]   = useState(""); 
const [items, setItems]   = useState([]);    // enriched favorites 
const [avatarUrl, setAvatarUrl] = useState(null);

// load avatar from localStorage
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
// fetch and enrich favorites with live Wallhaven stats 
  useEffect(() => { 
    let cancelled = false; 
    async function load() { 
      setLoading(true); 
      setError(""); 
      setItems([]); 
      try { 
        const r = await fetch("/api/user/favorites", { 
          credentials: "include", 
        }); 
        if (!r.ok) throw new Error("Failed to load favorites"); 
        const j = await r.json(); 
        const base = Array.isArray(j.favorites) ? j.favorites : []; 
 
        // fetch live details for counts/resolution 
        const ids = base.map(f => f.image_id || f.id).filter(Boolean); 
        const detailed = await Promise.all(ids.map(async (id) => { 
          try { 
            const d = await getWallpaper(id, { apiKey }); 
            return d?.data || null; 
          } catch { 
            return null; 
          } 
        })); 
 
        const merged = base.map((f, i) => { 
          const d = detailed[i]; 
          return { 
            id: d?.id ?? f.image_id ?? f.id, 
            path: d?.path ?? f.url ?? null, 
            thumbs: d?.thumbs ?? (f.thumb ? { small: f.thumb, large: f.thumb } : {}), 
            uploader: d?.uploader ?? null, 
            favorites: d?.favorites ?? 0, 
            views: d?.views ?? 0, 
            resolution: d?.resolution ?? (f.dimension_x && f.dimension_y ? 
`${f.dimension_x}×${f.dimension_y}` : null), 
            dimension_x: d?.dimension_x ?? f.dimension_x ?? null, 
            dimension_y: d?.dimension_y ?? f.dimension_y ?? null, 
            file_size: d?.file_size ?? null, 
            file_type: d?.file_type ?? null, 
            category: d?.category ?? "general", 
            colors: d?.colors ?? [], 
          }; 
        }).filter(Boolean); 
 
        if (!cancelled) setItems(merged); 
      } catch (e) { 
        if (!cancelled) { 
          setError(e.message || "Failed to load favorites"); 
          setItems([]); 
        } 
      } finally { 
        if (!cancelled) setLoading(false); 
      } 
    } 
    load(); 
    return () => { cancelled = true; }; 
  }, [apiKey]); 
 
  // favorite toggle (same behavior as on Home) 
  async function toggleFavorite(img) { 
    const prev = img.isFav ?? true; // favorites page -> assume fav=true 
    img.isFav = !prev; 
    setItems([...items]); 
    try { 
      if (!img.isFav) { 
  const res = await 
fetch(`/api/user/favorites/${encodeURIComponent(img.id)}`, { 
          method: "DELETE", 
          credentials: "include", 
        }); 
        const data = await res.json(); 
        if (!data.ok) throw new Error(data.error || "Failed to remove favorite"); 
        // remove from list 
        setItems((arr) => arr.filter(x => x.id !== img.id)); 
      } else { 
        const res = await fetch("/api/user/favorites", { 
          method: "POST", 
          credentials: "include", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ 
            image_id: img.id, 
            title: img.id, 
            url: img.path ?? null, 
            thumb: img.thumbs?.small || img.thumbs?.large || null, 
            dimension_x: img.dimension_x || null, 
            dimension_y: img.dimension_y || null, 
          }), 
        }); 
        const data = await res.json(); 
        if (!data.ok) throw new Error(data.error || "Failed to add favorite"); 
      } 
    } catch (err) { 
      img.isFav = prev; 
      setItems([...items]); 
      // silent failure 
    } 
  } 
 
  return ( 
    <div className="profile-page"> 
      <header className="profile-header"> 
        <div className="profile-header__top"> 
          <div className="profile-left"> 
            <button className="btn btn-ghost btn-small" onClick={() => onClose && onClose()} aria-label="Back">← Back</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div className="profile-id"> 
              <div className="profile-avatar">{getInitials(user)}</div> 
            </div>
            <div className="profile-meta" style={{ textAlign: "left" }}>
              <div className="profile-name">{user?.name || user?.email || "Guest"}</div> 
              <div className="profile-email">{user?.email || ""}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}> 
            <SignOutButton onSignedOut={() => onClose && onClose()} />
          </div>
        </div>

        <div className="pill-tabs"> 
          <button className={`pill ${tab === "favorites" ? "active" : ""}`} onClick={() => setTab("favorites")}>Favorites</button>
          <button className={`pill ${tab === "about" ? "active" : ""}`} onClick={() => setTab("about")}>About</button>
        </div>
      </header> 
 
      {tab === "about" && ( 
        <section className="profile-about"> 
          <h3>Account</h3> 
          <dl> 
            <dt>Email</dt><dd>{user?.email || "—"}</dd> 
            <dt>Name</dt><dd>{user?.name || "—"}</dd> 
          </dl> 
          <p className="muted">This screen shows your saved favorites in a 4-column grid using 
the same card layout as the home feed.</p> 
        </section> 
      )} 
 
      {tab === "favorites" && ( 
        <section> 
          {loading && <p className="meta-line">Loading favorites…</p>} 
          {error && !loading && <p className="meta-line" style={{ color: "red" }}>{error}</p>} 
          {!loading && !error && items.length === 0 && ( 
            <p className="meta-line">No favorites yet.</p> 
          )} 
 
          <div className="profile-grid"> 
            {items.map((img) => ( 
              <article key={img.id} className="cardv" role="button" tabIndex={0}> 
                <div className="cardv__media"> 
                  {(img.thumbs?.large || img.path) && ( 
                    <img 
                      src={img.thumbs?.large || img.path} 
                      alt="Wallpaper preview" 
                      loading="lazy" 
                    /> 
                  )} 

                  <button 
                    className={`fav-btn ${img.isFav !== false ? "active" : ""}`} 
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(img); }} 
                    title={img.isFav !== false ? "Remove from favorites" : "Add to favorites"} 
                  > 
                    {img.isFav !== false ? "    " : "     "} 
                  </button> 
                </div> 
 
                <div className="cardv__body"> 
                  <h3 className="cardv__title">{img.id || "Wallpaper"}</h3> 
                  <div className="cardv__by"> 
                    by <span>{img.uploader?.username || "Unknown"}</span> 
                  </div> 
 
                  <div className="meta"> 
                    <div className="meta__item" title="Favorites"> 
                      {(img.favorites ?? 0).toLocaleString()}      
                    </div> 
                    <div className="meta__item" title="Views"> 
                      {(img.views ?? 0).toLocaleString()} 👁 
                    </div> 
                    <div className="meta__item" title="Resolution"> 
                      {img.resolution || `${img.dimension_x ?? "—"}×${img.dimension_y ?? "—"}`} 
                    </div> 
                  </div> 
 
                  <div className="tags"> 
                    <span className="tag">{img.category || "general"}</span> 
                    <span className="tag">{(img.file_type || 
"image").toString().toUpperCase()}</span> 
                    {img.file_size ? <span className="tag">{formatBytes(img.file_size)}</span> : null} 
                  </div> 
                </div> 
              </article> 
            ))} 
          </div> 
        </section> 
      )} 
    </div> 
  ); 
} 
 
 