"use client";

// 投稿詳細で共通に使う部品（投稿の内容、回答・やり取りの時系列、コメント欄）
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/labels";
import type { Image, TicketDetail } from "@/lib/types";
import { Field, ImagePicker, StatusBadge, Thumbs, TypeBadge, UrgencyBadge } from "./parts";

export function TicketSummary({ t }: { t: TicketDetail }) {
  const rows: [string, React.ReactNode][] = [
    ["カテゴリ", t.categoryName],
    ["工場・拠点", `${t.siteName} ${t.locationName} ${t.locationText}`],
    ...(t.occurredAt ? [["発生日時", formatDateTime(t.occurredAt)] as [string, string]] : []),
    ["投稿者", t.posterName],
    ["担当者", t.assigneeName || "未割り当て"],
    ["投稿日時", formatDateTime(t.createdAt)],
    ["FAQ 公開", t.allowPublish ? "公開されても構わない" : "公開を希望しない"],
  ];
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {t.number} <TypeBadge type={t.type} /> <StatusBadge status={t.status} closeType={t.closeType} /> <UrgencyBadge urgency={t.urgency} />
        </div>
        <CardTitle><h1 className="text-xl font-bold">{t.title}</h1></CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <h3 className="mb-1 font-semibold">内容</h3>
          <p className="whitespace-pre-wrap break-words">{t.body}</p>
          <Thumbs images={t.attachments} />
        </div>
      </CardContent>
    </Card>
  );
}

// 回答・コメントを時系列に並べる（内部メモは情シスのときだけデータに含まれる）
export function Timeline({ t }: { t: TicketDetail }) {
  const items = [
    ...t.answers.map((a) => ({ kind: "answer" as const, at: a.createdAt, who: a.authorName, body: a.body, files: [] as Image[] })),
    ...t.comments.map((c) => ({ kind: c.internal ? ("internal" as const) : ("comment" as const), at: c.createdAt, who: c.authorName, body: c.body, files: c.attachments })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const head = { answer: "✅ 回答", comment: "💬 コメント", internal: "🔒 内部メモ（投稿者には見えません）" };

  return (
    <Card>
      <CardHeader><CardTitle className="font-bold">回答・やり取り</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground">まだやり取りはありません。</p>
        ) : (
          <ol className="grid gap-3">
            {items.map((i, n) => (
              <li key={n} className={cn("border-l-2 py-1 pl-4",
                i.kind === "answer" && "border-green-600",
                i.kind === "internal" && "rounded-r-lg border-amber-400 bg-amber-50 py-2")}>
                <div className="text-xs text-muted-foreground">{head[i.kind]}　{i.who}　{formatDateTime(i.at)}</div>
                <p className="whitespace-pre-wrap break-words">{i.body}</p>
                <Thumbs images={i.files} />
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// コメント欄（情シスは内部メモも選べる）
export function CommentForm({ title, allowInternal, note, onSubmit }: {
  title: string;
  allowInternal?: boolean;
  note?: React.ReactNode;
  onSubmit: (v: { body: string; internal: boolean; images: Image[] }) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return setError("本文を入力してください。");
    setBusy(true);
    await onSubmit({ body: body.trim(), internal, images });
    setBody("");
    setImages([]);
    setInternal(false);
    setError("");
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="font-bold">{title}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          {note}
          <Field label="本文" htmlFor={`${title}-body`}>
            <Textarea id={`${title}-body`} maxLength={2000} rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <ImagePicker id={`${title}-images`} images={images} onChange={setImages} />
          {allowInternal && (
            <Label className="flex min-h-11 items-center gap-3">
              <Checkbox checked={internal} onCheckedChange={(v) => setInternal(!!v)} />
              🔒 内部メモにする（投稿者には表示しません）
            </Label>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div><Button type="submit" disabled={busy}>送る</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
