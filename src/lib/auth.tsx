import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
  requireAuth: (action?: string) => boolean;
  authPrompt: string | null;
  openAuth: (msg?: string) => void;
  closeAuth: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);

  useEffect(() => {
    const t = window.localStorage.getItem("kritiq_token");
    const u = window.localStorage.getItem("kritiq_user");
    if (t) setToken(t);
    if (u) {
      try {
        setUserState(JSON.parse(u));
      } catch {}
    }
  }, []);

  const persist = (t: string, u: User) => {
    window.localStorage.setItem("kritiq_token", t);
    window.localStorage.setItem("kritiq_user", JSON.stringify(u));
    setToken(t);
    setUserState(u);
  };

  const login = useCallback(async (username: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { username, password },
    });
    persist(res.token, res.user);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: { username, email, password },
    });
    persist(res.token, res.user);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem("kritiq_token");
    window.localStorage.removeItem("kritiq_user");
    setToken(null);
    setUserState(null);
  }, []);

  const setUser = useCallback((u: User) => {
    setUserState(u);
    window.localStorage.setItem("kritiq_user", JSON.stringify(u));
  }, []);

  const openAuth = useCallback((msg?: string) => {
    setAuthPrompt(msg ?? "Connecte-toi pour continuer.");
  }, []);
  const closeAuth = useCallback(() => setAuthPrompt(null), []);

  const requireAuth = useCallback(
    (action?: string) => {
      if (token) return true;
      setAuthPrompt(action ?? "Connecte-toi pour continuer.");
      return false;
    },
    [token],
  );

  return (
    <Ctx.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        setUser,
        requireAuth,
        authPrompt,
        openAuth,
        closeAuth,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
