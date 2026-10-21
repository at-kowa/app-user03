"use client";

// 投稿の一覧をカード形式で表示する（iPad・狭い画面用、未読の一覧など）
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/labels";
import type { TicketView } from "@/lib/types";
import { NewBadge, StatusBadge, TypeBadge, UnreadBadge, UrgencyBadge } from "./parts";

export function TicketCard({ t, href, isNew, showUrgency, meta }: {
  t: TicketView;
  href: string;
  isNew?: boolean;
  showUrgency?: boolean;
  meta?: React.ReactNode;
}) {
  return (
    <Link href={href}
      className={cn("block rounded-lg border p-4 transition-colors hover:bg-muted",
        t.urgency === "stopped" && showUrgency && "border-l-4 border-l-red-600 bg-red-50")}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {isNew && <NewBadge />}
        {t.number} <TypeBadge type={t.type} />
        {showUrgency && <UrgencyBadge urgency={t.urgency} />}
        <StatusBadge status={t.status} closeType={t.closeType} />
        <UnreadBadge unread={t.unread} />
      </div>
      <div className="my-1 font-semibold">{t.title}</div>
      <div className="text-xs text-muted-foreground">{meta ?? `最終更新 ${formatDateTime(t.updatedAt)}`}</div>
    </Link>
  );
}
