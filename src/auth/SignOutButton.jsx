import React, { useState } from "react";
import Modal from "../components/Modal";

export default function SignOutButton({ onSignedOut }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {
      // ignore network errors — still log out locally
    } finally {
      setLoading(false);
      console.log("You have been logged out");
      onSignedOut && onSignedOut();
    }
  }

  const handleConfirm = () => {
    setShowConfirm(false);
    logout();
  };

  return (
    <>
      <button
        className="btn btn-ghost signout-btn"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        title="Log out"
      >
        {loading ? "Logging out…" : "Log out"}
      </button>

      {showConfirm && (
        <Modal onClose={() => setShowConfirm(false)} ariaLabel="Logout Confirmation">
          <div style={{ textAlign: "center", padding: "20px" }}>
            <h2 style={{ marginBottom: "10px", margin: "0 0 10px 0" }}>Logout Confirmation</h2>
            <p style={{ marginBottom: "20px", margin: "0 0 20px 0" }}>Are you sure you want to do logout?</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={loading}
              >
                Confirm
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}