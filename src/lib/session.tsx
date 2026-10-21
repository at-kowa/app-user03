"use client";

// 状態管理：ログイン中の利用者、自動ログアウト、ヘッダーの再読み込みのきっかけ
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { repo } from "./repository";
import type { User } from "./types";

const KEY = "qbox.mock.userId";

type Session = {
  user: User | null;
  ready: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  // 未読件数などを取り直すための合図。データを変えたら bump() を呼ぶ
  version: number;
  bump: () => void;
  login: (user: User) => void;
  logout: () => void;
  update: (patch: Partial<User>) => void;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);

  // 再読み込みしてもログインを保つ（第1版は sessionStorage に利用者IDだけ置く）
  useEffect(() => {
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(KEY);
    } catch {
      // 保存できない環境では毎回ログイン
    }
    (id ? repo.getUser(id) : Promise.resolve(null)).then((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  const login = useCallback((u: User) => {
    setUser(u);
    try {
      sessionStorage.setItem(KEY, u.id);
    } catch {}
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
  }, []);

  // 一定時間操作がなければ自動でログアウトする（初期値60分）
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let minutes = 60;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
        toast.info("一定時間操作がなかったため、ログアウトしました。");
        router.replace("/login");
      }, minutes * 60000);
    };
    repo.getSettings().then((s) => {
      minutes = s.autoLogoutMinutes;
      reset();
    });
    const events = ["click", "keydown", "touchstart"] as const;
    events.forEach((ev) => document.addEventListener(ev, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((ev) => document.removeEventListener(ev, reset));
    };
  }, [user, logout, router]);

  const value = useMemo<Session>(
    () => ({
      user,
      ready,
      isStaff: !!user && (user.role === "staff" || user.role === "admin"),
      isAdmin: user?.role === "admin",
      version,
      bump: () => setVersion((v) => v + 1),
      login,
      logout,
      update: (patch) => setUser((u) => (u ? { ...u, ...patch } : u)),
    }),
    [user, ready, version, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error("SessionProvider の外では使えません");
  return s;
}

// ログイン済みの画面（RequireUser の内側）で使う
export function useUser() {
  const s = useSession();
  if (!s.user) throw new Error("ログインしていません");
  return { ...s, user: s.user };
}
