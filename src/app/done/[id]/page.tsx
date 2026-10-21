"use client";

// S-05 投稿完了
import Link from "next/link";
import { useParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RequireUser } from "@/components/require-user";
import { ErrorBox, Loading } from "@/components/parts";
import { repo } from "@/lib/repository";
import { useLoad } from "@/lib/hooks";
import { useUser } from "@/lib/session";

export default function DonePage() {
  return (
    <RequireUser>
      <Done />
    </RequireUser>
  );
}

function Done() {
  const { user } = useUser();
  const { id } = useParams<{ id: string }>();
  const { data: t, error } = useLoad(() => repo.getTicket(user.id, id), [user.id, id]);
  if (error) return <ErrorBox message={error} />;
  if (!t) return <Loading />;
  return (
    <Card className="mx-auto max-w-md text-center">
      <CardContent className="grid gap-3">
        <h1 className="text-2xl font-bold">送信しました</h1>
        <p className="text-sm text-muted-foreground">受付番号</p>
        <p className="text-3xl font-bold">{t.number}</p>
        <p>{t.title}</p>
        <p className="text-xs text-muted-foreground">回答やコメントがあると、ヘッダーに未読の件数が表示されます。</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/my" className={buttonVariants()}>自分の投稿一覧へ</Link>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>ホームへ</Link>
        </div>
      </CardContent>
    </Card>
  );
}
