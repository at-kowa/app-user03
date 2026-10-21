// データアクセス（Repository）
// 第1版は架空データ（mock-data.ts）をブラウザのメモリ上で操作する。
// supabase につなぐときは、このファイルの中身だけを supabase-js の呼び出しに差し替える。
// 権限のチェックは、本番では RLS で行う。ここでは同じ考え方を真似している。
import { mockDb as db } from "./mock-data";
import type {
  Faq, FaqInput, FaqView, Masters, NewTicketInput, Settings, Summary, Ticket, TicketDetail, TicketView, User,
} from "./types";

const clone = <T,>(v: T): T => structuredClone(v);
const nowIso = () => new Date().toISOString();
const delay = () => new Promise((r) => setTimeout(r, 50)); // 通信の待ち時間の代わり
let seq = 1000;
const newId = (p: string) => `${p}${++seq}`;
const pad5 = (n: number) => String(n).padStart(5, "0");

const isStaffUser = (u: User | undefined) => !!u && (u.role === "staff" || u.role === "admin");
const findUser = (id: string | null) => db.users.find((u) => u.id === id);
const userName = (id: string | null) => findUser(id)?.name ?? "";

// qbox_users に登録され、かつ有効な人だけが読み書きできる
function requireUser(userId: string) {
  const u = findUser(userId);
  if (!u || !u.active) throw new Error("この操作をする権限がありません");
  return u;
}
function requireStaff(userId: string) {
  const u = requireUser(userId);
  if (!isStaffUser(u)) throw new Error("この操作をする権限がありません");
  return u;
}
const canSeeTicket = (u: User, t: Ticket) => isStaffUser(u) || t.posterId === u.id;
function getTicketOrThrow(id: string) {
  const t = db.tickets.find((x) => x.id === id);
  if (!t) throw new Error("投稿が見つかりません");
  return t;
}

function decorate(t: Ticket): TicketView {
  return {
    ...clone(t),
    posterName: userName(t.posterId),
    assigneeName: userName(t.assigneeId),
    categoryName: db.categories.find((c) => c.id === t.categoryId)?.name ?? "",
    siteName: db.sites.find((s) => s.id === t.siteId)?.name ?? "",
    locationName: db.locations.find((l) => l.id === t.locationId)?.name ?? "",
  };
}

function isUnread(u: User, t: Ticket) {
  const readAt = db.readStates[u.id]?.[t.id];
  if (t.posterId === u.id) {
    return t.posterActivityAt > t.createdAt && (!readAt || t.posterActivityAt > readAt);
  }
  if (isStaffUser(u) && (t.assigneeId === null || t.assigneeId === u.id)) {
    return !readAt || t.staffActivityAt > readAt;
  }
  return false;
}

function markReadNow(userId: string, ticketId: string, at = nowIso()) {
  db.readStates[userId] = db.readStates[userId] || {};
  db.readStates[userId][ticketId] = at;
}

const withCategory = (f: Faq): FaqView => ({
  ...clone(f),
  categoryName: db.categories.find((c) => c.id === f.categoryId)?.name ?? "",
});

export const repo = {
  // ---- ログイン・利用者 ----
  async login(empNo: string): Promise<User | null> {
    await delay();
    const u = db.users.find((x) => x.empNo === empNo.trim());
    return u && u.active ? clone(u) : null;
  },
  async getUser(userId: string): Promise<User | null> {
    const u = findUser(userId);
    return u && u.active ? clone(u) : null;
  },
  async completePasswordChange(userId: string) {
    await delay();
    requireUser(userId).mustChangePassword = false;
  },
  async listStaff(actorId: string): Promise<User[]> {
    requireStaff(actorId);
    return clone(db.users.filter((u) => u.active && isStaffUser(u)));
  },
  listTestAccounts() {
    return db.users.map(({ empNo, name, role, active, mustChangePassword }) => ({ empNo, name, role, active, mustChangePassword }));
  },

  // ---- マスタ・設定 ----
  async getMasters(): Promise<Masters> {
    return clone({ sites: db.sites, locations: db.locations, categories: db.categories });
  },
  async getSettings(): Promise<Settings> {
    return clone(db.settings);
  },

  // ---- 投稿 ----
  async createTicket(actorId: string, input: NewTicketInput): Promise<TicketView> {
    await delay();
    const u = requireUser(actorId);
    const at = nowIso();
    const id = newId("t");
    const t: Ticket = {
      id,
      number: `Q-${new Date().getFullYear()}-${pad5(db.ticketSeq++)}`,
      type: input.type, categoryId: input.categoryId, siteId: input.siteId,
      locationId: input.locationId, locationText: input.locationText,
      title: input.title, body: input.body, occurredAt: input.occurredAt, urgency: input.urgency,
      allowPublish: input.allowPublish, posterId: u.id, assigneeId: null,
      status: "received", closeType: null, createdAt: at, updatedAt: at, closedAt: null,
      posterActivityAt: at, staffActivityAt: at,
    };
    db.tickets.push(t);
    input.images.forEach((img) => db.attachments.push({ id: newId("f"), ticketId: id, commentId: null, ...img, uploaderId: u.id }));
    markReadNow(u.id, id, at);
    return decorate(t);
  },

  async listMyTickets(actorId: string): Promise<TicketView[]> {
    await delay();
    const u = requireUser(actorId);
    return db.tickets
      .filter((t) => t.posterId === u.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((t) => ({ ...decorate(t), unread: isUnread(u, t) }));
  },

  async listTickets(actorId: string): Promise<TicketView[]> {
    await delay();
    const u = requireStaff(actorId);
    return db.tickets.map((t) => ({ ...decorate(t), unread: isUnread(u, t) }));
  },

  async getTicket(actorId: string, ticketId: string): Promise<TicketDetail> {
    await delay();
    const u = requireUser(actorId);
    const t = getTicketOrThrow(ticketId);
    if (!canSeeTicket(u, t)) throw new Error("この投稿を見る権限がありません");
    const staff = isStaffUser(u);
    return {
      ...decorate(t),
      comments: db.comments
        .filter((c) => c.ticketId === t.id && (staff || !c.internal)) // 内部メモは一般には返さない
        .map((c) => ({ ...clone(c), authorName: userName(c.authorId), attachments: clone(db.attachments.filter((f) => f.commentId === c.id)) })),
      answers: db.answers.filter((a) => a.ticketId === t.id).map((a) => ({ ...clone(a), authorName: userName(a.authorId) })),
      attachments: clone(db.attachments.filter((f) => f.ticketId === t.id && !f.commentId)),
      faq: staff ? clone(db.faqs.find((f) => f.ticketId === t.id) ?? null) : null,
    };
  },

  async addComment(actorId: string, ticketId: string, input: { body: string; internal: boolean; images: NewTicketInput["images"] }) {
    await delay();
    const u = requireUser(actorId);
    const t = getTicketOrThrow(ticketId);
    if (!canSeeTicket(u, t)) throw new Error("この投稿にコメントする権限がありません");
    if (input.internal && !isStaffUser(u)) throw new Error("内部メモは情シスのみ書けます");
    const at = nowIso();
    const c = { id: newId("c"), ticketId, authorId: u.id, body: input.body, internal: input.internal, createdAt: at };
    db.comments.push(c);
    input.images.forEach((img) => db.attachments.push({ id: newId("f"), ticketId, commentId: c.id, ...img, uploaderId: u.id }));
    t.updatedAt = at;
    if (!input.internal) {
      if (t.posterId === u.id) t.staffActivityAt = at;
      else t.posterActivityAt = at;
    }
    markReadNow(u.id, ticketId, at);
  },

  async withdraw(actorId: string, ticketId: string) {
    await delay();
    const u = requireUser(actorId);
    const t = getTicketOrThrow(ticketId);
    if (t.posterId !== u.id || t.status !== "received") throw new Error("「受付」の状態の自分の投稿だけ取り下げられます");
    const at = nowIso();
    Object.assign(t, { status: "done", closeType: "withdrawn", closedAt: at, updatedAt: at, staffActivityAt: at });
  },

  async assign(actorId: string, ticketId: string, assigneeId: string | null) {
    await delay();
    requireStaff(actorId);
    const t = getTicketOrThrow(ticketId);
    const at = nowIso();
    t.assigneeId = assigneeId || null;
    if (assigneeId && t.status === "received") t.status = "progress"; // 割り当てたら自動で「対応中」
    Object.assign(t, { updatedAt: at, posterActivityAt: at });
  },

  async setStatus(actorId: string, ticketId: string, status: Ticket["status"], closeType: Ticket["closeType"]) {
    await delay();
    requireStaff(actorId);
    const t = getTicketOrThrow(ticketId);
    if (status === "done" && !closeType) throw new Error("完了区分を選んでください");
    const at = nowIso();
    Object.assign(t, {
      status,
      closeType: status === "done" ? closeType : null,
      closedAt: status === "done" ? at : null,
      updatedAt: at,
      posterActivityAt: at,
    });
  },

  async addAnswer(actorId: string, ticketId: string, body: string) {
    await delay();
    const u = requireStaff(actorId);
    const t = getTicketOrThrow(ticketId);
    const at = nowIso();
    db.answers.push({ id: newId("a"), ticketId, authorId: u.id, body, createdAt: at });
    Object.assign(t, { updatedAt: at, posterActivityAt: at });
    markReadNow(u.id, ticketId, at);
  },

  // ---- 既読・未読 ----
  async markRead(actorId: string, ticketId: string) {
    requireUser(actorId);
    markReadNow(actorId, ticketId);
  },
  async listUnread(actorId: string): Promise<TicketView[]> {
    await delay();
    const u = requireUser(actorId);
    return db.tickets.filter((t) => canSeeTicket(u, t) && isUnread(u, t)).map(decorate);
  },
  async countSummary(actorId: string): Promise<Summary> {
    const u = requireUser(actorId);
    const summary: Summary = {
      mine: db.tickets.filter((t) => t.posterId === u.id && t.status !== "done").length,
      unread: db.tickets.filter((t) => canSeeTicket(u, t) && isUnread(u, t)).length,
    };
    if (isStaffUser(u)) {
      summary.unassigned = db.tickets.filter((t) => t.status !== "done" && !t.assigneeId).length;
      summary.assignedToMe = db.tickets.filter((t) => t.status !== "done" && t.assigneeId === u.id).length;
    }
    return summary;
  },
  // 一定間隔の取得で使う：指定時刻より後に作られた投稿の件数
  async countNewSince(actorId: string, sinceIso: string) {
    requireStaff(actorId);
    return db.tickets.filter((t) => t.createdAt > sinceIso).length;
  },

  // 動作確認用：別の利用者が投稿したことにする
  async simulateIncoming() {
    const s = db.sampleIncoming[db.ticketSeq % db.sampleIncoming.length];
    const posters = db.users.filter((u) => u.active && u.role === "general");
    const poster = posters[db.ticketSeq % posters.length];
    return this.createTicket(poster.id, {
      ...s, siteId: poster.siteId, locationId: null, locationText: "", allowPublish: false, images: [],
      occurredAt: s.type === "trouble" ? nowIso() : null,
    });
  },

  // ---- FAQ ----
  async listFaqs(actorId: string): Promise<FaqView[]> {
    await delay();
    const u = requireUser(actorId);
    return db.faqs.filter((f) => f.published || isStaffUser(u)).map(withCategory); // 一般は公開中のものだけ
  },
  async getFaq(actorId: string, faqId: string): Promise<FaqView> {
    await delay();
    const u = requireUser(actorId);
    const f = db.faqs.find((x) => x.id === faqId);
    if (!f || (!f.published && !isStaffUser(u))) throw new Error("FAQ が見つかりません");
    return withCategory(f);
  },
  async saveFaq(actorId: string, input: FaqInput): Promise<Faq> {
    await delay();
    requireStaff(actorId);
    const at = nowIso();
    let f = input.id ? db.faqs.find((x) => x.id === input.id) : undefined;
    if (!f) {
      f = { id: newId("q"), ticketId: input.ticketId, publishedAt: null } as Faq;
      db.faqs.push(f);
    }
    Object.assign(f, {
      title: input.title, question: input.question, answer: input.answer,
      categoryId: input.categoryId, type: input.type, published: input.published, updatedAt: at,
    });
    if (f.published && !f.publishedAt) f.publishedAt = at;
    if (!f.published) f.publishedAt = null;
    return clone(f);
  },
  async deleteFaq(actorId: string, faqId: string) {
    await delay();
    const u = requireUser(actorId);
    if (u.role !== "admin") throw new Error("FAQ の削除は管理者のみできます");
    db.faqs = db.faqs.filter((f) => f.id !== faqId);
  },
};
