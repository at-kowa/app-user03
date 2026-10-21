"use client";

// ログインが必要な画面の入れ物。未ログインはログイン画面へ、初回はパスワード変更へ誘導する
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { useHydrated } from "@/lib/hooks";
import { ErrorBox } from "./parts";

export function RequireUser({ staffOnly, allowMustChange, children }: {
  staffOnly?: boolean;
  allowMustChange?: boolean;
  children: React.ReactNode;
}) {
  const { user, ready, isStaff } = useSession();
  const router = useRouter();
  const mustChange = !!user?.mustChangePassword && !allowMustChange;

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (mustChange) router.replace("/password");
  }, [ready, user, mustChange, router]);

  const hydrated = useHydrated();

  if (!hydrated || !ready || !user || mustChange) return null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* 権限のない画面は表示しない（本当の防御はデータベース側で行う） */}
      {staffOnly && !isStaff ? <ErrorBox message="この画面は情シス担当・管理者のみ利用できます。" /> : children}
    </main>
  );
}
