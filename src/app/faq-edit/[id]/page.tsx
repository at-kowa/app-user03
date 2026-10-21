"use client";

// S-12 FAQ公開編集（元の投稿から作る／既存の FAQ を編集する）
import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequireUser } from "@/components/require-user";
import { AppSelect, ErrorBox, Field, Loading, TypeBadge } from "@/components/parts";
import { repo } from "@/lib/repository";
import { useLoad } from "@/lib/hooks";
import { typeKeys, typeLabel } from "@/lib/labels";
import { useUser } from "@/lib/session";
import type { FaqInput, Masters, TicketDetail, TicketType } from "@/lib/types";

export default function FaqEditPage() {
  return (
    <RequireUser staffOnly>
      <Suspense fallback={<Loading />}>
        <FaqEditLoader />
      </Suspense>
    </RequireUser>
  );
}

function FaqEditLoader() {
  const { user } = useUser();
  const { id } = useParams<{ id: string }>();
  const ticketId = useSearchParams().get("ticket");
  const { data, error } = useLoad(async () => {
    const m = await repo.getMasters();
    if (id === "new") {
      const source = ticketId ? await repo.getTicket(user.id, ticketId) : null;
      const faq: FaqInput = {
        id: null, ticketId: source?.id ?? null, title: source?.title ?? "", question: source?.body ?? "",
        answer: source?.answers.at(-1)?.body ?? "", categoryId: source?.categoryId ?? 0, type: source?.type ?? "question", published: false,
      };
      return { m, source, faq };
    }
    const f = await repo.getFaq(user.id, id);
    const source = f.ticketId ? await repo.getTicket(user.id, f.ticketId) : null;
    return { m, source, faq: { ...f } as FaqInput };
  }, [user.id, id, ticketId]);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  return <FaqEditForm {...data} />;
}

function FaqEditForm({ m, source, faq }: { m: Masters; source: TicketDetail | null; faq: FaqInput }) {
  const { user, isAdmin } = useUser();
  const router = useRouter();
  const [v, setV] = useState(faq);
  const [error, setError] = useState("");
  const set = <K extends keyof FaqInput>(k: K, val: FaqInput[K]) => setV((x) => ({ ...x, [k]: val }));
  const notAllowed = !!source && !source.allowPublish;
  const category = m.categories.find((c) => c.id === v.categoryId);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.title.trim() || !v.question.trim() || !v.answer.trim() || !v.categoryId) {
      return setError("タイトル・カテゴリ・質問文・回答文を入力してください。");
    }
    if (v.published && notAllowed && !confirm("投稿者は公開を希望していません。それでも公開しますか。")) return;
    const saved = await repo.saveFaq(user.id, { ...v, title: v.title.trim(), question: v.question.trim(), answer: v.answer.trim() });
    toast.success("保存しました。");
    router.push(`/faq/${saved.id}`);
  };

  const remove = async () => {
    if (!v.id || !confirm("この FAQ を削除します。元に戻せません。よろしいですか。")) return;
    await repo.deleteFaq(user.id, v.id);
    toast.success("削除しました。");
    router.push("/faq");
  };

  return (
    <div className="grid gap-4">
      <Link href={source ? `/admin/${source.id}` : "/faq"} className="text-sm underline">← 戻る</Link>
      <h1 className="text-2xl font-bold">FAQ の公開編集</h1>
      {notAllowed && (
        <ErrorBox message="⚠️ 投稿者は「FAQ として公開されても構わない」にチェックしていません。公開する場合は内容に十分注意してください。" />
      )}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-800">個人名・部署名・固有の情報を取り除いてください。元の投稿の添付画像は FAQ に引き継ぎません。</AlertDescription>
      </Alert>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <form onSubmit={save} className="grid gap-4" noValidate>
              {source && <p className="text-xs text-muted-foreground">元の投稿：{source.number} {source.title}</p>}
              <Field label="公開タイトル" htmlFor="fe-title" required>
                <Input id="fe-title" maxLength={60} value={v.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="カテゴリ" htmlFor="fe-cat" required>
                  <AppSelect id="fe-cat" value={v.categoryId ? String(v.categoryId) : ""} onChange={(x) => set("categoryId", Number(x))} placeholder="選んでください"
                    options={m.categories.map((c) => ({ value: String(c.id), label: c.name }))} />
                </Field>
                <Field label="種別" htmlFor="fe-type">
                  <AppSelect id="fe-type" value={v.type} onChange={(x) => set("type", (x || "question") as TicketType)}
                    options={typeKeys.map((k) => ({ value: k, label: typeLabel[k] }))} />
                </Field>
              </div>
              <Field label="公開質問文" htmlFor="fe-q" required>
                <Textarea id="fe-q" rows={4} maxLength={2000} value={v.question} onChange={(e) => set("question", e.target.value)} />
              </Field>
              <Field label="公開回答文" htmlFor="fe-a" required>
                <Textarea id="fe-a" rows={6} maxLength={4000} value={v.answer} onChange={(e) => set("answer", e.target.value)} />
              </Field>
              <Label className="flex min-h-11 items-center gap-3">
                <Checkbox checked={v.published} onCheckedChange={(x) => set("published", !!x)} />
                公開する（チェックを外すと非公開）
              </Label>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit">保存する</Button>
                {v.id && isAdmin && <Button type="button" variant="destructive" onClick={remove}>削除する</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed ring-0" aria-label="プレビュー">
          <CardHeader>
            <p className="text-xs text-muted-foreground">プレビュー（利用者にはこう見えます）</p>
            <div className="flex flex-wrap gap-1.5">
              {category && <Badge variant="outline">{category.name}</Badge>} <TypeBadge type={v.type} />
            </div>
            <CardTitle className="text-xl font-bold">{v.title || "（タイトル未入力）"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <section><h3 className="mb-1 font-bold">質問</h3><p className="whitespace-pre-wrap break-words">{v.question}</p></section>
            <section><h3 className="mb-1 font-bold">回答</h3><p className="whitespace-pre-wrap break-words">{v.answer}</p></section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
