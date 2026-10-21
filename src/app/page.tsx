"use client";

// S-03 ホーム。開いている間は一定間隔で件数を取り直す
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequireUser } from "@/components/require-user";
import { repo } from "@/lib/repository";
import { useLoad, usePolling } from "@/lib/hooks";
import { formatDateTime } from "@/lib/labels";
import { useUser } from "@/lib/session";

export default function HomePage() {
  return (
    <RequireUser>
      <Home />
    </RequireUser>
  );
}

function Stat({ href, num, label }: { href: string; num: number | undefined; label: string }) {
  return (
    <Link href={href} className="rounded-xl ring-1 ring-foreground/10 transition-colors hover:bg-muted">
      <div className="p-4">
        <div className="text-3xl font-bold">{num ?? "－"}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </Link>
  );
}

function Home() {
  const { user, isStaff, bump } = useUser();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const { data: s, reload } = useLoad(() => repo.countSummary(user.id), [user.id]);

  usePolling(() => {
    reload();
    bump();
    setUpdatedAt(formatDateTime(new Date().toISOString()));
  });

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">ホーム</h1>
      <Link href="/new" className={cn(buttonVariants({ size: "lg" }), "h-16 w-full text-lg")}>
        <MailIcon /> 質問・要望を送る
      </Link>

      <Card>
        <CardContent>
          <form role="search" className="grid gap-2"
            onSubmit={(e) => { e.preventDefault(); router.push(`/faq?q=${encodeURIComponent(q.trim())}`); }}>
            <Label htmlFor="home-q" className="font-semibold">送る前に、FAQ で同じ質問がないか探してみましょう</Label>
            <div className="flex gap-2">
              <Input id="home-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="例：プリンタ　パスワード" />
              <Button type="submit"><SearchIcon /> FAQ を検索</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-2">
        <h2 className="font-bold">自分の投稿</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat href="/my" num={s?.mine} label="対応中・受付の投稿" />
          <Stat href="/unread" num={s?.unread} label="未読の回答・コメント" />
        </div>
      </section>

      {isStaff && (
        <section className="grid gap-2">
          <h2 className="font-bold">
            情シス対応 {updatedAt && <span className="text-xs font-normal text-muted-foreground">（{updatedAt} 更新）</span>}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat href="/admin?assignee=none" num={s?.unassigned} label="未対応（担当なし）" />
            <Stat href="/admin?assignee=me" num={s?.assignedToMe} label="自分の担当" />
          </div>
        </section>
      )}
    </div>
  );
}
