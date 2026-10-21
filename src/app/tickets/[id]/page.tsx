"use client";

// S-07 投稿詳細（投稿者用）
import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequireUser } from "@/components/require-user";
import { ErrorBox, Loading, PrivacyNotice } from "@/components/parts";
import { CommentForm, TicketSummary, Timeline } from "@/components/ticket-parts";
import { repo } from "@/lib/repository";
import { useLoad } from "@/lib/hooks";
import { useUser } from "@/lib/session";

export default function TicketDetailPage() {
  return (
    <RequireUser>
      <TicketDetail />
    </RequireUser>
  );
}

function TicketDetail() {
  const { user, bump } = useUser();
  const { id } = useParams<{ id: string }>();
  const { data: t, error, reload } = useLoad(async () => {
    const t = await repo.getTicket(user.id, id);
    if (t.posterId !== user.id) throw new Error("この投稿を見る権限がありません");
    await repo.markRead(user.id, id); // 開いた時点で既読にする
    return t;
  }, [user.id, id]);

  useEffect(() => {
    if (t) bump(); // ヘッダーの未読件数に反映する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  if (error) return <ErrorBox message={error} />;
  if (!t) return <Loading />;

  const withdraw = async () => {
    if (!confirm("この投稿を取り下げます。よろしいですか。")) return;
    await repo.withdraw(user.id, t.id);
    toast.success("取り下げました。");
    reload();
  };

  return (
    <div className="grid gap-4">
      <Link href="/my" className="text-sm underline">← 自分の投稿一覧</Link>
      <TicketSummary t={t} />
      <Timeline t={t} />
      <CommentForm
        title="コメントする"
        note={<>
          {t.status === "done" && <p className="text-xs text-muted-foreground">完了した投稿にコメントすると、情シスが確認して対応を再開するか判断します。</p>}
          <PrivacyNotice />
        </>}
        onSubmit={async (v) => {
          await repo.addComment(user.id, t.id, { ...v, internal: false });
          toast.success("コメントを送りました。");
          reload();
        }}
      />
      {t.status === "received" && (
        <Card>
          <CardHeader><CardTitle className="font-bold">取り下げ</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">「受付」のあいだだけ、この投稿を取り下げられます。</p>
            <div><Button variant="destructive" onClick={withdraw}>この投稿を取り下げる</Button></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
