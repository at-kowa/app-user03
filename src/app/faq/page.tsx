"use client";

// S-08 公開FAQ一覧・検索
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequireUser } from "@/components/require-user";
import { AppSelect, ErrorBox, Loading, TypeBadge } from "@/components/parts";
import { repo } from "@/lib/repository";
import { useLoad } from "@/lib/hooks";
import { formatDate, typeKeys, typeLabel } from "@/lib/labels";
import { useUser } from "@/lib/session";

export default function FaqListPage() {
  return (
    <RequireUser>
      <Suspense fallback={<Loading />}>
        <FaqList />
      </Suspense>
    </RequireUser>
  );
}

function FaqList() {
  const { user, isStaff } = useUser();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState("");
  const [type, setType] = useState("");
  const { data, error } = useLoad(() => Promise.all([repo.listFaqs(user.id), repo.getMasters()]), [user.id]);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  const [faqs, m] = data;

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = faqs
    .filter((f) => !cat || f.categoryId === Number(cat))
    .filter((f) => !type || f.type === type)
    .filter((f) => words.every((w) => `${f.title} ${f.question} ${f.answer}`.toLowerCase().includes(w)))
    .sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">FAQ</h1>
        {isStaff && <Link href="/faq-edit/new" className={buttonVariants({ variant: "outline" })}><PlusIcon /> FAQ を新しく作る</Link>}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input type="search" aria-label="キーワード" placeholder="キーワード（タイトル・質問・回答）" value={q} onChange={(e) => setQ(e.target.value)} />
        <AppSelect ariaLabel="カテゴリ" value={cat} onChange={setCat} placeholder="すべてのカテゴリ"
          options={m.categories.map((c) => ({ value: String(c.id), label: c.name }))} />
        <AppSelect ariaLabel="種別" value={type} onChange={setType} placeholder="すべての種別"
          options={typeKeys.map((k) => ({ value: k, label: typeLabel[k] }))} />
      </div>
      {list.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          見つかりませんでした。
          <div className="mt-4"><Link href="/new" className={buttonVariants()}>質問・要望を送る</Link></div>
        </div>
      ) : (
        <div className="grid gap-2">
          {list.map((f) => (
            <Link key={f.id} href={`/faq/${f.id}`} className="block rounded-lg border p-4 transition-colors hover:bg-muted">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Badge variant="outline">{f.categoryName}</Badge> <TypeBadge type={f.type} />
                {f.published ? `公開日 ${formatDate(f.publishedAt)}` : <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">非公開</Badge>}
              </div>
              <div className="my-1 font-semibold">{f.title}</div>
              <div className="line-clamp-2 text-sm text-muted-foreground">{f.question}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
