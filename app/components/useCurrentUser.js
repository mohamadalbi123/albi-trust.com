"use client";

import { useEffect, useState } from "react";

export function useCurrentUser() {
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);

  async function refresh() {
    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      const data = await response.json();
      setUser(data.user || null);
      setStatus("ready");
      return data.user || null;
    } catch {
      setUser(null);
      setStatus("ready");
      return null;
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return {
    status,
    user,
    isAuthenticated: Boolean(user),
    refresh,
  };
}
