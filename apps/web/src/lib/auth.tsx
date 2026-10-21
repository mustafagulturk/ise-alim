"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, refresh, tokens } from "./api";
import type { Me, Role } from "./types";

interface AuthState {
  me: Me | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: { companyName: string; name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  can: (...roles: Role[]) => boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();
  const router = useRouter();

  const load = useCallback(async () => setMe(await api.get<Me>("/auth/me")), []);

  useEffect(() => {
    tokens.onLogout(() => {
      tokens.set(null);
      setMe(null);
      qc.clear();
      router.replace("/giris?oturum=bitti");
    });
    // Sayfa yenilendiğinde httpOnly çerezle sessizce yeni erişim belirteci alınır.
    refresh()
      .then((t) => (t ? load() : undefined))
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [load, qc, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken } = await api.post<{ accessToken: string }>("/auth/login", { email, password });
      tokens.set(accessToken);
      await load();
    },
    [load],
  );

  const register = useCallback(
    async (body: { companyName: string; name: string; email: string; password: string }) => {
      const { accessToken } = await api.post<{ accessToken: string }>("/auth/register", body);
      tokens.set(accessToken);
      await load();
    },
    [load],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined);
    tokens.set(null);
    setMe(null);
    qc.clear();
    router.replace("/giris");
  }, [qc, router]);

  const can = useCallback((...roles: Role[]) => !!me && roles.includes(me.role), [me]);

  return <Ctx.Provider value={{ me, ready, login, register, logout, can }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthProvider eksik");
  return ctx;
}
