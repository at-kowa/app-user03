"use client";

// S-04 新規投稿（入力 → 確認 → 送信）
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequireUser } from "@/components/require-user";
import { AppSelect, ChoiceButtons, ErrorBox, Field, ImagePicker, Loading, PrivacyNotice, Thumbs } from "@/components/parts";
import { repo } from "@/lib/repository";
import { useLoad } from "@/lib/hooks";
import { formatDateTime, toLocalInput, typeIcon, typeKeys, typeLabel, urgencyKeys, urgencyLabel } from "@/lib/labels";
import { useUser } from "@/lib/session";
import type { Image, Masters, TicketType, Urgency } from "@/lib/types";

const EXAMPLES: Record<TicketType, string> = {
  question: "例）〇〇をするにはどうすればよいですか。いつ・どの画面で困っているかを書いてください。",
  request: "例）〇〇ができるようにしてほしい。今どう困っていて、どうなるとうれしいかを書いてください。",
  trouble: "例）〇〇をしたら、△△というエラーが出た。いつから・何をしたときに起きるか、画面の表示を書いてください。",
};

type Draft = {
  type: TicketType;
  categoryId: string;
  siteId: string;
  locationId: string;
  locationText: string;
  title: string;
  body: string;
  occurredAt: string;
  urgency: Urgency;
  allowPublish: boolean;
  images: Image[];
};

export default function NewTicketPage() {
  return (
    <RequireUser>
      <Suspense fallback={<Loading />}>
        <NewTicket />
      </Suspense>
    </RequireUser>
  );
}

function NewTicket() {
  const { user } = useUser();
  const params = useSearchParams();
  const { data: m, error } = useLoad(() => repo.getMasters(), []);
  if (error) return <ErrorBox message={error} />;
  if (!m) return <Loading />;
  return (
    <TicketForm m={m} initial={{
      type: "question", categoryId: params.get("category") ?? "", siteId: String(user.siteId), locationId: "",
      locationText: "", title: "", body: "", occurredAt: toLocalInput(new Date()), urgency: "low", allowPublish: false, images: [],
    }} />
  );
}

function TicketForm({ m, initial }: { m: Masters; initial: Draft }) {
  const { user, bump } = useUser();
  const router = useRouter();
  const [d, setD] = useState<Draft>(initial);
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const nameOf = (list: { id: number; name: string }[], id: string) => list.find((x) => x.id === Number(id))?.name ?? "";

  const toConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const err: string[] = [];
    if (!d.categoryId) err.push("カテゴリを選んでください。");
    if (!d.title.trim()) err.push("件名を入力してください。");
    if (!d.body.trim()) err.push("内容を入力してください。");
    if (d.type === "trouble" && !d.occurredAt) err.push("不具合のときは発生日時を入力してください。");
    setErrors(err);
    if (err.length === 0) {
      setConfirming(true);
      window.scrollTo(0, 0);
    }
  };

  const send = async () => {
    setSending(true);
    try {
      const t = await repo.createTicket(user.id, {
        type: d.type, categoryId: Number(d.categoryId), siteId: Number(d.siteId),
        locationId: d.locationId ? Number(d.locationId) : null, locationText: d.locationText,
        title: d.title.trim(), body: d.body.trim(), urgency: d.urgency, allowPublish: d.allowPublish, images: d.images,
        occurredAt: d.type === "trouble" && d.occurredAt ? new Date(d.occurredAt).toISOString() : null,
      });
      bump();
      router.push(`/done/${t.id}`);
    } catch (ex) {
      setErrors([(ex as Error).message]);
      setSending(false);
    }
  };

  if (confirming) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-bold">送信内容の確認</h1>
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">この内容で送信します。よろしければ「送信する」を押してください。</AlertDescription>
        </Alert>
        <Card>
          <CardContent>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">種別</dt><dd>{typeIcon[d.type]} {typeLabel[d.type]}</dd>
              <dt className="text-muted-foreground">カテゴリ</dt><dd>{nameOf(m.categories, d.categoryId)}</dd>
              <dt className="text-muted-foreground">工場・拠点</dt><dd>{nameOf(m.sites, d.siteId)}</dd>
              <dt className="text-muted-foreground">場所</dt><dd>{nameOf(m.locations, d.locationId)} {d.locationText}</dd>
              <dt className="text-muted-foreground">件名</dt><dd>{d.title}</dd>
              <dt className="text-muted-foreground">内容</dt><dd className="whitespace-pre-wrap break-words">{d.body}</dd>
              {d.type === "trouble" && (<><dt className="text-muted-foreground">発生日時</dt><dd>{formatDateTime(d.occurredAt)}</dd></>)}
              <dt className="text-muted-foreground">緊急度</dt><dd>{urgencyLabel[d.urgency]}</dd>
              <dt className="text-muted-foreground">FAQ 公開</dt><dd>{d.allowPublish ? "公開されても構わない" : "公開を希望しない"}</dd>
              <dt className="text-muted-foreground">投稿者</dt><dd>{user.name}（{user.dept}）</dd>
            </dl>
            <Thumbs images={d.images} />
          </CardContent>
        </Card>
        {errors.map((e) => <p key={e} role="alert" className="text-sm text-destructive">{e}</p>)}
        <div className="flex flex-wrap gap-2">
          <Button size="lg" onClick={send} disabled={sending}>送信する</Button>
          <Button size="lg" variant="outline" onClick={() => setConfirming(false)}>入力に戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">質問・要望を送る</h1>
      <PrivacyNotice />
      <Card>
        <CardContent>
          <form onSubmit={toConfirm} className="grid gap-5" noValidate>
            <Field label="種別" required>
              <ChoiceButtons label="種別" value={d.type} onChange={(v) => set("type", v)}
                options={typeKeys.map((k) => ({ value: k, label: `${typeIcon[k]} ${typeLabel[k]}` }))} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="カテゴリ" htmlFor="categoryId" required>
                <AppSelect id="categoryId" value={d.categoryId} onChange={(v) => set("categoryId", v)} placeholder="選んでください"
                  options={m.categories.map((c) => ({ value: String(c.id), label: c.name }))} />
              </Field>
              <Field label="工場・拠点" htmlFor="siteId" required>
                <AppSelect id="siteId" value={d.siteId} onChange={(v) => setD((x) => ({ ...x, siteId: v, locationId: "" }))}
                  options={m.sites.map((s) => ({ value: String(s.id), label: s.name }))} />
              </Field>
              <Field label="場所" htmlFor="locationId">
                <AppSelect id="locationId" value={d.locationId} onChange={(v) => set("locationId", v)} placeholder="選ばない"
                  options={m.locations.filter((l) => l.siteId === Number(d.siteId)).map((l) => ({ value: String(l.id), label: l.name }))} />
              </Field>
              <Field label="場所（自由入力）" htmlFor="locationText">
                <Input id="locationText" maxLength={50} value={d.locationText} onChange={(e) => set("locationText", e.target.value)} />
              </Field>
            </div>
            <Field label="件名" htmlFor="title" required hint={`${d.title.length} / 40文字`}>
              <Input id="title" maxLength={40} value={d.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label="内容" htmlFor="body" required hint={<>{EXAMPLES[d.type]}<br />{d.body.length} / 2000文字</>}>
              <Textarea id="body" maxLength={2000} rows={6} value={d.body} onChange={(e) => set("body", e.target.value)} />
            </Field>
            <Field label="発生日時" htmlFor="occurredAt" required={d.type === "trouble"}>
              <Input id="occurredAt" type="datetime-local" value={d.occurredAt} onChange={(e) => set("occurredAt", e.target.value)} />
            </Field>
            <Field label="緊急度" required>
              <ChoiceButtons label="緊急度" value={d.urgency} onChange={(v) => set("urgency", v)}
                options={urgencyKeys.map((k) => ({ value: k, label: urgencyLabel[k] }))} />
            </Field>
            <ImagePicker id="images" images={d.images} onChange={(v) => set("images", v)} />
            <div className="grid gap-1">
              <Label className="flex min-h-11 items-center gap-3">
                <Checkbox checked={d.allowPublish} onCheckedChange={(v) => set("allowPublish", !!v)} />
                FAQ として公開されても構わない
              </Label>
              <p className="text-xs text-muted-foreground">最終的に公開するかは情シスが判断します。公開するときは個人名などを取り除きます。</p>
            </div>
            {errors.map((e) => <p key={e} role="alert" className="text-sm text-destructive">{e}</p>)}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="lg">確認画面へ</Button>
              <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>やめる</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
