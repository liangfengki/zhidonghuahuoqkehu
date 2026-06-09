"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiPost, apiGet } from "@/lib/api";

interface User { id: string; email: string; name: string; role: string; tenantId: string; }
interface AuthState { user: User | null; token: string | null; loading: boolean; }

const AuthContext = createContext<{
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; companyName?: string }) => Promise<void>;
  logout: () => void;
}>({ auth: { user: null, token: null, loading: true }, login: async () => {}, register: async () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null, loading: true });

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      apiGet("/auth/me").then((user: any) => {
        setAuth({ user, token, loading: false });
      }).catch(() => { localStorage.removeItem("auth_token"); setAuth({ user: null, token: null, loading: false }); });
    } else setAuth({ user: null, token: null, loading: false });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res: any = await apiPost("/auth/login", { email, password });
    localStorage.setItem("auth_token", res.accessToken);
    setAuth({ user: res.user, token: res.accessToken, loading: false });
  }, []);

  const register = useCallback(async (data: { email: string; password: string; name: string; companyName?: string }) => {
    const res: any = await apiPost("/auth/register", data);
    localStorage.setItem("auth_token", res.accessToken);
    setAuth({ user: res.user, token: res.accessToken, loading: false });
  }, []);

  const logout = useCallback(() => { localStorage.removeItem("auth_token"); setAuth({ user: null, token: null, loading: false }); }, []);
  return <AuthContext.Provider value={{ auth, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
