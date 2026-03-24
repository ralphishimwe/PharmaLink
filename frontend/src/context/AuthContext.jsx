import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

/**
 * AuthProvider — single source of truth for authentication state.
 *
 * Holds `role` as React state so every consumer re-renders immediately
 * when the role changes (login / logout / signup), with no page reload needed.
 *
 * Also keeps localStorage in sync so the value survives a manual refresh.
 */
export function AuthProvider({ children }) {
  const [authReady, setAuthReady] = useState(false);
  const [role, setRoleState] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("role") : null
  );

  /**
   * setRole — updates both React state and localStorage together.
   * Always use this instead of calling localStorage.setItem directly.
   */
  const setRole = (newRole) => {
    if (newRole) {
      localStorage.setItem("role", newRole);
    } else {
      localStorage.removeItem("role");
    }
    setRoleState(newRole);
  };

  /**
   * logout — clears all auth state (React + localStorage) and lets the
   * caller handle navigation.
   */
  const logout = () => {
    localStorage.clear();
    setRoleState(null);
  };

  // On first mount, verify the stored token against the server and
  // set the authoritative role. This handles hard refreshes / direct URL access.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        localStorage.removeItem("role");
        if (!cancelled) {
          setRoleState(null);
          setAuthReady(true);
        }
        return;
      }

      try {
        const res = await api.get("/users/me");
        const nextRole = res.data?.data?.data?.role || null;
        if (nextRole) localStorage.setItem("role", nextRole);
        else localStorage.removeItem("role");
        if (!cancelled) {
          setRoleState(nextRole);
          setAuthReady(true);
        }
      } catch {
        // Token invalid or expired — clear everything
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        if (!cancelled) {
          setRoleState(null);
          setAuthReady(true);
        }
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ role, setRole, logout, authReady }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — consume auth state anywhere in the tree.
 *
 * Returns: { role, setRole, logout, authReady }
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
