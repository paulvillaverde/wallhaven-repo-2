import { useEffect, useState } from "react";

export function useAuth() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setUser(data.user);
      })
      .catch(() => {});
  }, []);
  return { user, setUser };
}