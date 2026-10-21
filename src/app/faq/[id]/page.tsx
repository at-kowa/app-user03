"use client";

// S-09 FAQ詳細
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequireUser } from "@/components/require-user";
import { ErrorBox, Loading, TypeBadge } from "@/components/parts";
import { repo } from "@/lib/repository";
import { useLoad } from "@/lib/hooks";
import { formatDate } from "@/lib/labels";
import { useUser } from "@/lib/session";

export default function FaqDetailPage() {
  return (
    <RequireUser>
      <FaqDetail />
    </RequireUser>
  );
}

function FaqDetail() {
  const { user, isStaff } = useUser();
  const { id } = useParams<{ id: string }>();
  const { data: f, error } = useLoad(() => repo.getFaq(user.id, id), [user.id, id]);
  if (error) return <ErrorBox message={error} />;
  if (!f) return <Loading />;
  return (
    <div className="grid gap-4">
      <Link href="/faq" className="text-sm underline">← FAQ 一覧</Link>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="outline">{f.categoryName}</Badge> <TypeBadge type={f.type} />
            {f.published ? `公開日 ${formatDate(f.publishedAt)}` : <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">非公開</Badge>}
          </div>
          <CardTitle><h1 className="text-xl font-bold">{f.title}</h1></CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <section><h2 className="mb-1 font-bold">質問</h2><p className="whitespace-pre-wrap break-words">{f.question}</p></section>
          <section><h2 className="mb-1 font-bold">回答</h2><p className="whitespace-pre-wrap break-words">{f.answer}</p></section>
        </CardContent>
      </Card>
      <Card className="bg-muted/50">
        <CardContent className="grid gap-3">
          <p>解決しない場合は、この内容で質問してください。</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/new?category=${f.categoryId}`} className={buttonVariants()}>この内容で質問する</Link>
            {isStaff && <Link href={`/faq-edit/${f.id}`} className={buttonVariants({ variant: "outline" })}>編集する</Link>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
