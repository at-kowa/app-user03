"use client";

// S-11 投稿詳細（対応用）
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RequireUser } from "@/components/require-user";
import { AppSelect, ErrorBox, Field, Loading } from "@/components/parts";
import { CommentForm, TicketSummary, Timeline } from "@/components/ticket-parts";
import { repo } from "@/lib/repository";
import { useLoad } from "@/lib/hooks";
import { closeTypeKeys, closeTypeLabel, statusKeys, statusLabel } from "@/lib/labels";
import { useUser } from "@/lib/session";
import type { CloseType, Status, TicketDetail, User } from "@/lib/types";

export default function AdminDetailPage() {
  return (
    <RequireUser staffOnly>
      <AdminDetail />
    </RequireUser>
  );
}

function AdminDetail() {
  const { user, bump } = useUser();
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useLoad(async () => {
    const [t, staff] = await Promise.all([repo.getTicket(user.id, id), repo.listStaff(user.id)]);
    await repo.markRead(user.id, id);
    return { t, staff };
  }, [user.id, id]);

  useEffect(() => {
    if (data) bump();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  const { t, staff } = data;

  return (
    <div className="grid gap-4">
      <Link href="/admin" className="text-sm underline">← 受付一覧</Link>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="grid gap-4">
          <TicketSummary t={t} />
          <Timeline t={t} />
          <AnswerForm t={t} onDone={reload} />
          <CommentForm title="コメント・内部メモ" allowInternal
            onSubmit={async (v) => {
              await repo.addComment(user.id, t.id, v);
              toast.success(v.internal ? "内部メモを保存しました。" : "コメントを送りました。");
              reload();
            }} />
        </div>
        <aside className="grid gap-4">
          {/* key：担当者が変わったら選択欄を最新の値で作り直す */}
          <AssignCard key={t.assigneeId ?? "none"} t={t} staff={staff} onDone={reload} />
          <StatusCard key={`${t.status}-${t.closeType}`} t={t} onDone={reload} />
          <Card>
            <CardHeader><CardTitle className="font-bold">FAQ 公開設定</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              {t.faq ? (
                <>
                  <p>FAQ：{t.faq.published ? <Badge className="bg-green-600 text-white">公開中</Badge> : <Badge variant="outline">非公開</Badge>}</p>
                  <Link href={`/faq-edit/${t.faq.id}`} className={buttonVariants({ variant: "outline" })}>FAQ を編集する</Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">非公開（初期値）</p>
                  <Link href={`/faq-edit/new?ticket=${t.id}`} className={buttonVariants({ variant: "outline" })}>公開する（FAQ を作る）</Link>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function AssignCard({ t, staff, onDone }: { t: TicketDetail; staff: User[]; onDone: () => void }) {
  const { user } = useUser();
  const [assignee, setAssignee] = useState(t.assigneeId ?? "");
  const assign = async (id: string) => {
    await repo.assign(user.id, t.id, id || null);
    toast.success("担当者を変更しました。");
    onDone();
  };
  return (
    <Card>
      <CardHeader><CardTitle className="font-bold">担当者</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <AppSelect ariaLabel="担当者" value={assignee} onChange={setAssignee} placeholder="未割り当て"
          options={staff.map((u) => ({ value: u.id, label: u.name }))} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => assign(assignee)}>割り当てる</Button>
          <Button variant="outline" onClick={() => assign(user.id)}>自分にする</Button>
        </div>
        <p className="text-xs text-muted-foreground">割り当てると、ステータスが自動で「対応中」になります。</p>
      </CardContent>
    </Card>
  );
}

function StatusCard({ t, onDone }: { t: TicketDetail; onDone: () => void }) {
  const { user } = useUser();
  const [status, setStatus] = useState<Status>(t.status);
  const [closeType, setCloseType] = useState(t.closeType ?? "");
  const [error, setError] = useState("");
  const save = async () => {
    try {
      await repo.setStatus(user.id, t.id, status, (closeType || null) as CloseType | null);
      toast.success("ステータスを変更しました。");
      onDone();
    } catch (ex) {
      setError((ex as Error).message);
    }
  };
  return (
    <Card>
      <CardHeader><CardTitle className="font-bold">ステータス</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <AppSelect ariaLabel="ステータス" value={status} onChange={(v) => setStatus((v || "received") as Status)}
          options={statusKeys.map((k) => ({ value: k, label: statusLabel[k] }))} />
        {status === "done" && (
          <Field label="完了区分" required>
            <AppSelect ariaLabel="完了区分" value={closeType} onChange={setCloseType} placeholder="選んでください"
              options={closeTypeKeys.map((k) => ({ value: k, label: closeTypeLabel[k] }))} />
          </Field>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div><Button onClick={save}>ステータスを変更</Button></div>
      </CardContent>
    </Card>
  );
}

function AnswerForm({ t, onDone }: { t: TicketDetail; onDone: () => void }) {
  const { user } = useUser();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return setError("回答を入力してください。");
    await repo.addAnswer(user.id, t.id, body.trim());
    if (t.status !== "done" && confirm("回答を登録しました。ステータスを「完了（回答済み）」にしますか。")) {
      await repo.setStatus(user.id, t.id, "done", "answered");
    }
    toast.success("回答を登録しました。");
    setBody("");
    setError("");
    onDone();
  };
  return (
    <Card>
      <CardHeader><CardTitle className="font-bold">回答を登録する</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3" noValidate>
          <Field label="回答" htmlFor="answer">
            <Textarea id="answer" rows={5} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div><Button type="submit">回答を登録</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
