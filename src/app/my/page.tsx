"use client";

// S-06 自分の投稿一覧（PC は表、iPad・狭い画面はカード）
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RequireUser } from "@/components/require-user";
import { AppSelect, ErrorBox, Loading, StatusBadge, TypeBadge, UnreadBadge } from "@/components/parts";
import { TicketCard } from "@/components/ticket-card";
import { repo } from "@/lib/repository";
import { useLoad } from "@/lib/hooks";
import { formatDateTime, statusKeys, statusLabel } from "@/lib/labels";
import { useUser } from "@/lib/session";

export default function MyTicketsPage() {
  return (
    <RequireUser>
      <MyTickets />
    </RequireUser>
  );
}

function MyTickets() {
  const { user } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState("open");
  const { data, error } = useLoad(() => repo.listMyTickets(user.id), [user.id]);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  const list = data.filter((t) => (status === "open" ? t.status !== "done" : status === "all" || t.status === status));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">自分の投稿</h1>
        <Link href="/new" className={buttonVariants()}><MailIcon /> 質問・要望を送る</Link>
      </div>
      <AppSelect ariaLabel="ステータスで絞り込み" className="sm:w-60" value={status} onChange={(v) => setStatus(v || "open")}
        options={[{ value: "open", label: "完了以外" }, { value: "all", label: "すべて" }, ...statusKeys.map((k) => ({ value: k, label: statusLabel[k] }))]} />

      {list.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">該当する投稿はありません。</p>
      ) : (
        <>
          <div className="hidden rounded-lg border xl:block pointer-coarse:hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>受付番号</TableHead><TableHead>件名</TableHead><TableHead>種別</TableHead>
                  <TableHead>ステータス</TableHead><TableHead>最終更新</TableHead><TableHead>未読</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => router.push(`/tickets/${t.id}`)}>
                    <TableCell>{t.number}</TableCell>
                    <TableCell><Link href={`/tickets/${t.id}`} className="underline">{t.title}</Link></TableCell>
                    <TableCell><TypeBadge type={t.type} /></TableCell>
                    <TableCell><StatusBadge status={t.status} closeType={t.closeType} /></TableCell>
                    <TableCell>{formatDateTime(t.updatedAt)}</TableCell>
                    <TableCell><UnreadBadge unread={t.unread} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-2 xl:hidden pointer-coarse:grid">
            {list.map((t) => <TicketCard key={t.id} t={t} href={`/tickets/${t.id}`} />)}
          </div>
        </>
      )}
    </div>
  );
}
