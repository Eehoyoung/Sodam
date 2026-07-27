"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "./api";
import { fetchCurrentUser, logout as logoutRequest, type WebSessionUser } from "./auth";

interface AuthContextValue {
  user: WebSessionUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 세션 쿠키(sodam_web_sid) 기반 인증 상태 컨텍스트.
 * 마운트 시 /api/web/auth/me 로 세션 유효성을 확인하고, 401(세션 없음/만료) 이면
 * 재로그인 유도를 위해 /login 으로 리다이렉트한다(04_보안정책.md §1 — 만료는 401).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WebSessionUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const current = await fetchCurrentUser();
      setUser(current);
      setStatus("authenticated");
    } catch (err) {
      setUser(null);
      setStatus("unauthenticated");
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
      router.replace("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, status, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth 는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}
