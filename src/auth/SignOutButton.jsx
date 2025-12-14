import React, { useState } from "react";

export default function SignOutButton({ onSignedOut }) {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {
      // ignore network errors — still sign out locally
    } finally {
      setLoading(false);
      onSignedOut && onSignedOut();
    }
  }

  return (
    <button
      className="btn btn-ghost signout-btn"
      onClick={logout}
      disabled={loading}
      title="Sign out"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}