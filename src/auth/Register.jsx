import React, { useState } from "react";

const Register = ({ onSignedIn, onClose, onSwitchToLogin }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!data.ok) throw new Error(data.error || "Registration failed");

      // Fetch current user data after successful registration
      const meRes = await fetch("/api/auth/me", {
        credentials: "include",
      });
      const meData = await meRes.json();
      if (meData.ok && meData.user) {
        onSignedIn?.(meData.user);
      } else {
        throw new Error("Failed to fetch user data");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="modal__close" onClick={onClose} aria-label="Close">
        ✕
      </button>

      <h2 className="auth-modal__title">Create Account</h2>
      <p className="auth-modal__subtitle">Join us today! Fill in the details below.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="auth-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="register-name">Name</label>
          <input
            id="register-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
          />
        </div>

        <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <div className="auth-footer">
        Already have an account?{" "}
        <button
          type="button"
          className="link-btn"
          onClick={onSwitchToLogin}
        >
          Sign in
        </button>
      </div>
    </>
  );
};

export default Register;