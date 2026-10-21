"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BellIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { useHydrated, useLoad } from "@/lib/hooks";
import { repo } from "@/lib/repository";
import { roleLabel } from "@/lib/labels";

export function AppHeader() {
  const { user, isStaff, logout, version } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { data: summary } = useLoad(
    () => (user ? repo.countSummary(user.id) : Promise.resolve(null)),
    [user?.id, pathname, version],
  );

  const hydrated = useHydrated();

  if (!hydrated || !user || user.mustChangePassword || pathname === "/login") return null;

  const links = [
    { href: "/", label: "ホーム" },
    { href: "/new", label: "投稿する" },
    { href: "/my", label: "自分の投稿" },
    { href: "/faq", label: "FAQ" },
    ...(isStaff ? [{ href: "/admin", label: "受付一覧" }] : []),
  ];
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const unread = summary?.unread ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <Link href="/" className="flex h-11 flex-1 items-center font-bold lg:flex-none">
          情シス質問箱
        </Link>
        <nav aria-label="メニュー" className="order-3 flex w-full gap-1 overflow-x-auto lg:order-none lg:w-auto lg:flex-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground", active(l.href) && "bg-muted text-foreground")}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/unread" className={buttonVariants({ variant: "ghost" })} aria-label={`未読 ${unread} 件`}>
            <BellIcon />
            未読
            {unread > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">{unread}</span>
            ) : (
              " 0"
            )}
          </Link>
          <span className="hidden sm:inline">
            {user.name}（{roleLabel[user.role]}）
          </span>
          <Link href="/password" className={buttonVariants({ variant: "ghost" })}>
            パスワード変更
          </Link>
          <Button variant="outline" onClick={() => { logout(); router.replace("/login"); }}>
            ログアウト
          </Button>
        </div>
      </div>
      <p className="border-t border-amber-200 bg-amber-50 px-4 py-1 text-center text-xs text-amber-900">
        第1版：画面確認用の架空データで動いています。入力した内容は再読み込みで元に戻ります。
      </p>
    </header>
  );
}
