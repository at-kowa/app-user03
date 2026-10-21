import type { CloseType, Role, Status, TicketType, Urgency } from "./types";

export const roleLabel: Record<Role, string> = { general: "一般", staff: "情シス担当", admin: "管理者" };
export const typeLabel: Record<TicketType, string> = { question: "質問", request: "要望", trouble: "不具合" };
export const typeIcon: Record<TicketType, string> = { question: "❓", request: "💡", trouble: "⚠️" };
export const statusLabel: Record<Status, string> = { received: "受付", progress: "対応中", done: "完了" };
export const closeTypeLabel: Record<CloseType, string> = {
  answered: "回答済み",
  handled: "対応済み",
  declined: "見送り",
  withdrawn: "取り下げ",
};
export const urgencyLabel: Record<Urgency, string> = {
  stopped: "業務が止まっている",
  workaround: "困っているが回避できる",
  low: "急がない",
};
export const urgencyRank: Record<Urgency, number> = { stopped: 0, workaround: 1, low: 2 };

export const typeKeys = Object.keys(typeLabel) as TicketType[];
export const statusKeys = Object.keys(statusLabel) as Status[];
export const urgencyKeys = Object.keys(urgencyLabel) as Urgency[];
export const closeTypeKeys = Object.keys(closeTypeLabel) as CloseType[];

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

// <input type="datetime-local"> 用の値
export function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function elapsedDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
