import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function AccountModal({ open, onClose, user }) {
  const [tab, setTab] = useState("favorites");
  const [favorites, setFavorites] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  // Inline styles to guarantee fixed centering
  const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(8,10,18,0.45)",
    zIndex: 9999,
    display: "block",
  };
  const modalWrapStyle = {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: 24,
    boxSizing: "border-box",
    pointerEvents: "none",
  };
  const panelStyle = {
    pointerEvents: "auto",
    width: 760,
    maxWidth: "100%",
    maxHeight: "calc(100vh - 80px)",
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 18px 60px rgba(15,20,30,0.18)",
    overflow: "auto",
    boxSizing: "border-box",
  };

  // lock scroll & focus first control (guarded for SSR)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  // keyboard handling + basic focus trap
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes =
          panelRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) || [];
        const focusable = Array.from(nodes).filter(
          (n) => !n.disabled && n.offsetParent !== null
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    if (typeof document === 'undefined') return;
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // load favorites when modal opens
  useEffect(() => {
    if (!open) return;
    setTab("favorites");
    if (!user) {
      setFavorites([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setFavorites(null);

    fetch("/api/user/favorites", {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setFavorites(Array.isArray(data.favorites) ? data.favorites : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Failed to load favorites");
        setFavorites([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  if (!open) return null;

  const modalContent = (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div
        style={modalWrapStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Account"
      >
        <div
          style={panelStyle}
          className="account-modal-panel"
          ref={panelRef}
          onClick={(e) => e.stopPropagation()} /* prevent overlay click when clicking inside */
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(180deg,#f6f7ff,#eef0ff)",
                  color: "#374151",
                  fontWeight: 700,
                  fontSize: 20,
                }}
                aria-hidden="true"
              >
                {(user?.name || user?.email || "U")[0].toUpperCase()}
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "#0f1724",
                  }}
                >
                  {user?.name || user?.email || "Guest"}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  {user?.email || ""}
                </div>
              </div>
            </div>

            <button
              ref={closeRef}
              className="btn btn-ghost"
              onClick={onClose}
              aria-label="Close account modal"
              style={{ cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              paddingTop: 12,
              borderTop: "1px solid rgba(16,22,38,0.04)",
              marginTop: 12,
            }}
          >
            <button
              onClick={() => setTab("favorites")}
              className={`tab ${tab === "favorites" ? "active" : ""}`}
            >
              Favorites
            </button>
            <button
              onClick={() => setTab("about")}
              className={`tab ${tab === "about" ? "active" : ""}`}
            >
              About
            </button>
          </div>

          <div style={{ marginTop: 12, color: "#111827" }}>
            {tab === "favorites" && (
              <div>
                {loading ? (
                  <div style={{ color: "#6b7280" }}>Loading favorites…</div>
                ) : error ? (
                  <div style={{ color: "#b91c1c" }}>{error}</div>
                ) : !favorites || favorites.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>No favorites yet.</div>
                ) : (
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: "8px 0",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    {favorites.map((f) => (
                      <li
                        key={f.id}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          borderRadius: 10,
                          padding: 8,
                          border: "1px solid rgba(16,22,38,0.04)",
                        }}
                      >
                        {f.thumb ? (
                          <img
                            src={f.thumb}
                            alt={f.title || f.image_id || f.id}
                            style={{
                              width: 140,
                              height: 84,
                              objectFit: "cover",
                              borderRadius: 8,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 140,
                              height: 84,
                              background: "#f3f4f6",
                              borderRadius: 8,
                            }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {f.title || f.image_id || f.id}
                          </div>
                          <div style={{ color: "#6b7280" }}>
                            {f.dimension_x && f.dimension_y
                              ? `${f.dimension_x}×${f.dimension_y}`
                              : f.dimensions || ""}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === "about" && (
              <div>
                <h4>Account</h4>
                <dl>
                  <dt>Email</dt>
                  <dd>{user?.email || "—"}</dd>
                  <dt>Name</dt>
                  <dd>{user?.name || "—"}</dd>
                </dl>

                <h4 style={{ marginTop: 12 }}>About</h4>
                <p style={{ color: "#6b7280" }}>
                  This account stores your preferences and favorites.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}