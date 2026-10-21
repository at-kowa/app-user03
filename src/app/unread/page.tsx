"use client";

// 未読の一覧（ヘッダーの未読件数から開く）
import { RequireUser } from "@/components/require-user";
import { ErrorBox, Loading } from "@/components/parts";
import { TicketCard } from "@/components/ticket-card";
import { repo } from "@/lib/repository";
import { useLoad } from "@/lib/hooks";
import { useUser } from "@/lib/session";

export default function UnreadPage() {
  return (
    <RequireUser>
      <Unread />
    </RequireUser>
  );
}

function Unread() {
  const { user, isStaff } = useUser();
  const { data, error } = useLoad(() => repo.listUnread(user.id), [user.id]);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">未読の投稿</h1>
      {data.length === 0 && <p className="py-8 text-center text-muted-foreground">未読はありません。</p>}
      <div className="grid gap-2">
        {data.map((t) => (
          <TicketCard key={t.id} t={t} href={isStaff && t.posterId !== user.id ? `/admin/${t.id}` : `/tickets/${t.id}`} />
        ))}
      </div>
    </div>
  );
}
