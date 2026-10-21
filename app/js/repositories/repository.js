// データアクセス（Repository）
// 第1版は架空データ（mock-data.js）をメモリ上で操作する。
// supabase につなぐときは、このファイルの中身だけを supabase-js の呼び出しに差し替える。
// 権限のチェックは、本番では RLS で行う。ここでは同じ考え方を真似している。
window.QB = window.QB || {};

(function (QB) {
  const db = QB.mockData;
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const nowIso = () => new Date().toISOString();
  const delay = () => new Promise((r) => setTimeout(r, 50)); // 通信の待ち時間の代わり
  let seq = 1000;
  const newId = (p) => `${p}${++seq}`;

  const isStaff = (u) => u && (u.role === 'staff' || u.role === 'admin');
  const findUser = (id) => db.users.find((u) => u.id === id);
  const userName = (id) => findUser(id)?.name ?? '';

  // qbox_users に登録され、かつ有効な人だけが読み書きできる
  function requireUser(userId) {
    const u = findUser(userId);
    if (!u || !u.active) throw new Error('この操作をする権限がありません');
    return u;
  }
  function requireStaff(userId) {
    const u = requireUser(userId);
    if (!isStaff(u)) throw new Error('この操作をする権限がありません');
    return u;
  }
  function canSeeTicket(u, t) {
    return isStaff(u) || t.posterId === u.id;
  }
  function getTicketOrThrow(id) {
    const t = db.tickets.find((x) => x.id === id);
    if (!t) throw new Error('投稿が見つかりません');
    return t;
  }

  function decorateTicket(t) {
    return {
      ...clone(t),
      posterName: userName(t.posterId),
      assigneeName: userName(t.assigneeId),
      categoryName: db.categories.find((c) => c.id === t.categoryId)?.name ?? '',
      siteName: db.sites.find((s) => s.id === t.siteId)?.name ?? '',
      locationName: db.locations.find((l) => l.id === t.locationId)?.name ?? '',
    };
  }

  function isUnread(u, t) {
    const readAt = db.readStates[u.id]?.[t.id];
    if (t.posterId === u.id && (!readAt || t.posterActivityAt > readAt) && t.posterActivityAt > t.createdAt) return true;
    if (isStaff(u) && t.posterId !== u.id && (t.assigneeId === null || t.assigneeId === u.id)) {
      return !readAt || t.staffActivityAt > readAt;
    }
    return false;
  }

  QB.repo = {
    // ---- ログイン・利用者 ----
    async login(empNo) {
      await delay();
      const u = db.users.find((x) => x.empNo === String(empNo).trim());
      if (!u || !u.active) return null;
      return clone(u);
    },
    async getUser(userId) {
      await delay();
      const u = findUser(userId);
      return u && u.active ? clone(u) : null;
    },
    async completePasswordChange(userId) {
      await delay();
      requireUser(userId).mustChangePassword = false;
    },
    async listStaff(actorId) {
      await delay();
      requireStaff(actorId);
      return clone(db.users.filter((u) => u.active && isStaff(u)));
    },
    async listTestAccounts() {
      return clone(db.users.map(({ empNo, name, role, active, mustChangePassword }) => ({ empNo, name, role, active, mustChangePassword })));
    },

    // ---- マスタ・設定 ----
    async getMasters() {
      await delay();
      return clone({ sites: db.sites, locations: db.locations, categories: db.categories });
    },
    async getSettings() {
      return clone(db.settings);
    },

    // ---- 投稿 ----
    async createTicket(actorId, input) {
      await delay();
      const u = requireUser(actorId);
      const at = nowIso();
      const id = newId('t');
      const t = {
        id, number: `Q-${new Date().getFullYear()}-${QB.pad(db.ticketSeq++, 5)}`,
        type: input.type, categoryId: Number(input.categoryId), siteId: Number(input.siteId),
        locationId: input.locationId ? Number(input.locationId) : null, locationText: input.locationText || '',
        title: input.title, body: input.body, occurredAt: input.occurredAt || null, urgency: input.urgency,
        allowPublish: !!input.allowPublish, posterId: u.id, assigneeId: null,
        status: 'received', closeType: null, createdAt: at, updatedAt: at, closedAt: null,
        posterActivityAt: at, staffActivityAt: at,
      };
      db.tickets.push(t);
      (input.images || []).forEach((img) =>
        db.attachments.push({ id: newId('f'), ticketId: id, commentId: null, ...img, uploaderId: u.id })
      );
      this._markRead(u.id, id, at);
      return decorateTicket(t);
    },

    async listMyTickets(actorId) {
      await delay();
      const u = requireUser(actorId);
      return db.tickets
        .filter((t) => t.posterId === u.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((t) => ({ ...decorateTicket(t), unread: isUnread(u, t) }));
    },

    async listTickets(actorId) {
      await delay();
      const u = requireStaff(actorId);
      return db.tickets.map((t) => ({ ...decorateTicket(t), unread: isUnread(u, t) }));
    },

    async getTicket(actorId, ticketId) {
      await delay();
      const u = requireUser(actorId);
      const t = getTicketOrThrow(ticketId);
      if (!canSeeTicket(u, t)) throw new Error('この投稿を見る権限がありません');
      const staff = isStaff(u);
      const comments = db.comments
        .filter((c) => c.ticketId === t.id && (staff || !c.internal)) // 内部メモは一般には返さない
        .map((c) => ({ ...clone(c), authorName: userName(c.authorId), attachments: clone(db.attachments.filter((f) => f.commentId === c.id)) }));
      const answers = db.answers.filter((a) => a.ticketId === t.id).map((a) => ({ ...clone(a), authorName: userName(a.authorId) }));
      const attachments = clone(db.attachments.filter((f) => f.ticketId === t.id && !f.commentId));
      const faq = staff ? clone(db.faqs.find((f) => f.ticketId === t.id) ?? null) : null;
      return { ...decorateTicket(t), comments, answers, attachments, faq };
    },

    async addComment(actorId, ticketId, { body, internal, images }) {
      await delay();
      const u = requireUser(actorId);
      const t = getTicketOrThrow(ticketId);
      if (!canSeeTicket(u, t)) throw new Error('この投稿にコメントする権限がありません');
      if (internal && !isStaff(u)) throw new Error('内部メモは情シスのみ書けます');
      const at = nowIso();
      const c = { id: newId('c'), ticketId, authorId: u.id, body, internal: !!internal, createdAt: at };
      db.comments.push(c);
      (images || []).forEach((img) => db.attachments.push({ id: newId('f'), ticketId, commentId: c.id, ...img, uploaderId: u.id }));
      t.updatedAt = at;
      if (!internal) {
        if (t.posterId === u.id) t.staffActivityAt = at;
        else t.posterActivityAt = at;
      }
      this._markRead(u.id, ticketId, at);
    },

    async withdraw(actorId, ticketId) {
      await delay();
      const u = requireUser(actorId);
      const t = getTicketOrThrow(ticketId);
      if (t.posterId !== u.id || t.status !== 'received') throw new Error('「受付」の状態の自分の投稿だけ取り下げられます');
      const at = nowIso();
      Object.assign(t, { status: 'done', closeType: 'withdrawn', closedAt: at, updatedAt: at, staffActivityAt: at });
    },

    async assign(actorId, ticketId, assigneeId) {
      await delay();
      requireStaff(actorId);
      const t = getTicketOrThrow(ticketId);
      const at = nowIso();
      t.assigneeId = assigneeId || null;
      if (assigneeId && t.status === 'received') t.status = 'progress'; // 割り当てたら自動で「対応中」
      Object.assign(t, { updatedAt: at, posterActivityAt: at });
    },

    async setStatus(actorId, ticketId, status, closeType) {
      await delay();
      requireStaff(actorId);
      const t = getTicketOrThrow(ticketId);
      if (status === 'done' && !closeType) throw new Error('完了区分を選んでください');
      const at = nowIso();
      Object.assign(t, {
        status, closeType: status === 'done' ? closeType : null, closedAt: status === 'done' ? at : null,
        updatedAt: at, posterActivityAt: at,
      });
    },

    async addAnswer(actorId, ticketId, body) {
      await delay();
      const u = requireStaff(actorId);
      const t = getTicketOrThrow(ticketId);
      const at = nowIso();
      db.answers.push({ id: newId('a'), ticketId, authorId: u.id, body, createdAt: at });
      Object.assign(t, { updatedAt: at, posterActivityAt: at });
      this._markRead(u.id, ticketId, at);
    },

    // ---- 既読・未読 ----
    _markRead(userId, ticketId, at = nowIso()) {
      db.readStates[userId] = db.readStates[userId] || {};
      db.readStates[userId][ticketId] = at;
    },
    async markRead(actorId, ticketId) {
      requireUser(actorId);
      this._markRead(actorId, ticketId);
    },
    async listUnread(actorId) {
      await delay();
      const u = requireUser(actorId);
      return db.tickets.filter((t) => canSeeTicket(u, t) && isUnread(u, t)).map(decorateTicket);
    },
    async countSummary(actorId) {
      await delay();
      const u = requireUser(actorId);
      const visible = db.tickets.filter((t) => canSeeTicket(u, t));
      const summary = {
        mine: db.tickets.filter((t) => t.posterId === u.id && t.status !== 'done').length,
        unread: visible.filter((t) => isUnread(u, t)).length,
      };
      if (isStaff(u)) {
        summary.unassigned = db.tickets.filter((t) => t.status !== 'done' && !t.assigneeId).length;
        summary.assignedToMe = db.tickets.filter((t) => t.status !== 'done' && t.assigneeId === u.id).length;
      }
      return summary;
    },
    // 一定間隔の取得で使う：指定時刻より後に作られた投稿の件数
    async countNewSince(actorId, sinceIso) {
      requireStaff(actorId);
      return db.tickets.filter((t) => t.createdAt > sinceIso).length;
    },

    // 動作確認用：別の利用者が投稿したことにする
    async simulateIncoming() {
      const s = db.sampleIncoming[db.ticketSeq % db.sampleIncoming.length];
      const posters = db.users.filter((u) => u.active && u.role === 'general');
      const poster = posters[db.ticketSeq % posters.length];
      return this.createTicket(poster.id, { ...s, siteId: poster.siteId, allowPublish: false });
    },

    // ---- FAQ ----
    async listFaqs(actorId) {
      await delay();
      const u = requireUser(actorId);
      return db.faqs
        .filter((f) => f.published || isStaff(u)) // 一般は公開中のものだけ
        .map((f) => ({ ...clone(f), categoryName: db.categories.find((c) => c.id === f.categoryId)?.name ?? '' }));
    },
    async getFaq(actorId, faqId) {
      await delay();
      const u = requireUser(actorId);
      const f = db.faqs.find((x) => x.id === faqId);
      if (!f || (!f.published && !isStaff(u))) throw new Error('FAQ が見つかりません');
      return { ...clone(f), categoryName: db.categories.find((c) => c.id === f.categoryId)?.name ?? '' };
    },
    async saveFaq(actorId, input) {
      await delay();
      requireStaff(actorId);
      const at = nowIso();
      let f = input.id ? db.faqs.find((x) => x.id === input.id) : null;
      if (!f) {
        f = { id: newId('q'), ticketId: input.ticketId || null, publishedAt: null };
        db.faqs.push(f);
      }
      Object.assign(f, {
        title: input.title, question: input.question, answer: input.answer,
        categoryId: Number(input.categoryId), type: input.type, published: !!input.published, updatedAt: at,
      });
      if (f.published && !f.publishedAt) f.publishedAt = at;
      if (!f.published) f.publishedAt = null;
      return clone(f);
    },
    async deleteFaq(actorId, faqId) {
      await delay();
      const u = requireUser(actorId);
      if (u.role !== 'admin') throw new Error('FAQ の削除は管理者のみできます');
      db.faqs = db.faqs.filter((f) => f.id !== faqId);
    },
  };
})(window.QB);
