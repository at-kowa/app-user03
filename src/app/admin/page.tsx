"use client";

// S-10 受付一覧（管理）。開いている間は一定間隔で新着を取得する
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BellIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RequireUser } from "@/components/require-user";
import { AppSelect, ErrorBox, Loading, NewBadge, StatusBadge, TypeBadge, UnreadBadge, UrgencyBadge } from "@/components/parts";
import { TicketCard } from "@/components/ticket-card";
import { repo } from "@/lib/repository";
import { useLoad, usePolling } from "@/lib/hooks";
import {
  elapsedDays, formatDateTime, statusKeys, statusLabel, typeKeys, typeLabel, urgencyKeys, urgencyLabel, urgencyRank,
} from "@/lib/labels";
import { useUser } from "@/lib/session";
import type { TicketView } from "@/lib/types";

export default function AdminListPage() {
  return (
    <RequireUser staffOnly>
      <Suspense fallback={<Loading />}>
        <AdminList />
      </Suspense>
    </RequireUser>
  );
}

function AdminList() {
  const { user, bump } = useUser();
  const params = useSearchParams();
  const { data: base, error } = useLoad(() => Promise.all([repo.getMasters(), repo.listStaff(user.id)]), [user.id]);
  const [tickets, setTickets] = useState<TicketView[] | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [lastSeen, setLastSeen] = useState(() => new Date().toISOString());
  const [checkedAt, setCheckedAt] = useState("");
  const [f, setF] = useState({
    q: "", status: "open", assignee: params.get("assignee") ?? "", type: "", cat: "", urgency: "",
  });

  useEffect(() => {
    repo.listTickets(user.id).then(setTickets);
  }, [user.id]);

  // 新着の確認：件数が増えていれば上部に知らせ、タブのタイトルにも件数を出す
  const poll = async () => {
    setCheckedAt(formatDateTime(new Date().toISOString()));
    if ((await repo.countNewSince(user.id, lastSeen)) === 0) return;
    const before = new Set((tickets ?? []).map((t) => t.id));
    const next = await repo.listTickets(user.id);
    const added = next.filter((t) => !before.has(t.id)).map((t) => t.id);
    setTickets(next);
    setNewIds((s) => new Set([...s, ...added]));
    setLastSeen(new Date().toISOString());
    bump();
  };
  usePolling(poll);

  useEffect(() => {
    document.title = newIds.size > 0 ? `(${newIds.size}) 受付一覧` : "受付一覧 - 情シス質問箱";
  }, [newIds]);

  if (error) return <ErrorBox message={error} />;
  if (!base || !tickets) return <Loading />;
  const [m, staff] = base;
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = tickets
    .filter((t) => (f.status === "open" ? t.status !== "done" : f.status === "all" || t.status === f.status))
    .filter((t) => !f.assignee || (f.assignee === "me" ? t.assigneeId === user.id : f.assignee === "none" ? !t.assigneeId : t.assigneeId === f.assignee))
    .filter((t) => !f.type || t.type === f.type)
    .filter((t) => !f.cat || t.categoryId === Number(f.cat))
    .filter((t) => !f.urgency || t.urgency === f.urgency)
    .filter((t) => words.every((w) => `${t.number} ${t.title} ${t.body}`.toLowerCase().includes(w)))
    // 緊急度が高い順 → 投稿日時が古い順
    .sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">受付一覧</h1>
        {checkedAt && <span className="text-xs text-muted-foreground">{checkedAt} 確認</span>}
      </div>

      {newIds.size > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-blue-800">
          <span className="flex items-center gap-2"><BellIcon className="size-4" /> 新しい投稿が {newIds.size} 件あります（NEW の印が付いています）。</span>
          <Button variant="outline" onClick={() => setNewIds(new Set())}>確認した</Button>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Input type="search" aria-label="キーワード" placeholder="キーワード" value={f.q} onChange={(e) => set("q")(e.target.value)} />
        <AppSelect ariaLabel="ステータス" value={f.status} onChange={(v) => set("status")(v || "open")}
          options={[{ value: "open", label: "完了以外" }, { value: "all", label: "すべてのステータス" }, ...statusKeys.map((k) => ({ value: k, label: statusLabel[k] }))]} />
        <AppSelect ariaLabel="担当者" value={f.assignee} onChange={set("assignee")} placeholder="すべての担当者"
          options={[{ value: "me", label: "自分" }, { value: "none", label: "未割り当て" }, ...staff.map((u) => ({ value: u.id, label: u.name }))]} />
        <AppSelect ariaLabel="種別" value={f.type} onChange={set("type")} placeholder="すべての種別"
          options={typeKeys.map((k) => ({ value: k, label: typeLabel[k] }))} />
        <AppSelect ariaLabel="カテゴリ" value={f.cat} onChange={set("cat")} placeholder="すべてのカテゴリ"
          options={m.categories.map((c) => ({ value: String(c.id), label: c.name }))} />
        <AppSelect ariaLabel="緊急度" value={f.urgency} onChange={set("urgency")} placeholder="すべての緊急度"
          options={urgencyKeys.map((k) => ({ value: k, label: urgencyLabel[k] }))} />
      </div>

      {list.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">該当する投稿はありません。</p>
      ) : (
        <>
          <AdminTable list={list} newIds={newIds} />
          <div className="grid gap-2 xl:hidden pointer-coarse:grid">
            {list.map((t) => (
              <TicketCard key={t.id} t={t} href={`/admin/${t.id}`} isNew={newIds.has(t.id)} showUrgency
                meta={`${t.categoryName}／${t.siteName}／担当：${t.assigneeName || "未割り当て"}／${formatDateTime(t.createdAt)}（${elapsedDays(t.createdAt)}日経過）`} />
            ))}
          </div>
        </>
      )}

      <div className="mt-6 grid gap-2 border-t border-dashed pt-4">
        <p className="text-xs text-muted-foreground">動作確認用：別の利用者が投稿したことにして、自動更新の表示を確かめられます（次の自動取得、または「今すぐ取得」で表示）。</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"
            onClick={async () => { await repo.simulateIncoming(); toast.info("架空の新着投稿を追加しました。"); }}>
            架空の新着投稿を1件追加
          </Button>
          <Button variant="ghost" onClick={poll}>今すぐ取得</Button>
        </div>
      </div>
    </div>
  );
}

function AdminTable({ list, newIds }: { list: TicketView[]; newIds: Set<string> }) {
  const router = useRouter();
  return (
    <div className="hidden rounded-lg border xl:block pointer-coarse:hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {["受付番号", "件名", "種別", "カテゴリ", "拠点", "緊急度", "ステータス", "担当者", "投稿日時", "経過", "未読"].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((t) => (
            <TableRow key={t.id} onClick={() => router.push(`/admin/${t.id}`)}
              className={cn("cursor-pointer", t.urgency === "stopped" && "bg-red-50 shadow-[inset_4px_0_0_var(--color-red-600)]", newIds.has(t.id) && "font-semibold")}>
              <TableCell>{newIds.has(t.id) && <NewBadge />} {t.number}</TableCell>
              <TableCell className="whitespace-normal"><Link href={`/admin/${t.id}`} className="underline">{t.title}</Link></TableCell>
              <TableCell><TypeBadge type={t.type} /></TableCell>
              <TableCell>{t.categoryName}</TableCell>
              <TableCell>{t.siteName}</TableCell>
              <TableCell><UrgencyBadge urgency={t.urgency} /></TableCell>
              <TableCell><StatusBadge status={t.status} closeType={t.closeType} /></TableCell>
              <TableCell>{t.assigneeName || "未割り当て"}</TableCell>
              <TableCell>{formatDateTime(t.createdAt)}</TableCell>
              <TableCell>{elapsedDays(t.createdAt)}日</TableCell>
              <TableCell><UnreadBadge unread={t.unread} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
