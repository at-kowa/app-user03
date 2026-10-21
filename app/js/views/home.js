// S-03 ホーム／未読の一覧
(function (QB) {
  const { html } = QB;

  QB.views.home = {
    title: 'ホーム',
    async render() {
      const s = await QB.repo.countSummary(QB.state.user.id);
      const staff = QB.state.isStaff();
      return {
        html: html`
          <h1>ホーム</h1>
          <a class="btn btn-lg btn-block" href="#/new">✉️ 質問・要望を送る</a>

          <form id="faq-search" class="card" style="margin-top:1rem" role="search">
            <label for="home-q"><strong>送る前に、FAQ で同じ質問がないか探してみましょう</strong></label>
            <div class="btn-row" style="margin-top:0.5rem">
              <input class="input" id="home-q" name="q" placeholder="例：プリンタ　パスワード" style="flex:1;min-width:200px">
              <button class="btn" type="submit">FAQ を検索</button>
            </div>
          </form>

          <h2 style="margin-top:1.5rem">自分の投稿</h2>
          <div class="grid grid-3">
            <a class="card stat" href="#/my"><div class="num">${s.mine}</div><div class="label">対応中・受付の投稿</div></a>
            <a class="card stat" href="#/unread"><div class="num" data-count="unread">${s.unread}</div><div class="label">未読の回答・コメント</div></a>
          </div>

          ${staff ? html`
            <h2 style="margin-top:1.5rem">情シス対応 <span class="small muted" id="home-updated"></span></h2>
            <div class="grid grid-3">
              <a class="card stat" href="#/admin?assignee=none"><div class="num" data-count="unassigned">${s.unassigned}</div><div class="label">未対応（担当なし）</div></a>
              <a class="card stat" href="#/admin?assignee=me"><div class="num" data-count="assignedToMe">${s.assignedToMe}</div><div class="label">自分の担当</div></a>
            </div>` : ''}`,
        mount(root) {
          root.querySelector('#faq-search').addEventListener('submit', (e) => {
            e.preventDefault();
            location.hash = `#/faq?q=${encodeURIComponent(root.querySelector('#home-q').value.trim())}`;
          });
          // 開いている間は一定間隔で件数を取り直す
          return QB.startPolling(async () => {
            const n = await QB.repo.countSummary(QB.state.user.id);
            root.querySelectorAll('[data-count]').forEach((el) => { el.textContent = n[el.dataset.count]; });
            const up = root.querySelector('#home-updated');
            if (up) up.textContent = `（${QB.formatDateTime(new Date().toISOString())} 更新）`;
          });
        },
      };
    },
  };

  QB.views.unread = {
    title: '未読',
    async render() {
      const list = await QB.repo.listUnread(QB.state.user.id);
      const staff = QB.state.isStaff();
      const link = (t) => (staff && t.posterId !== QB.state.user.id ? `#/admin/${t.id}` : `#/tickets/${t.id}`);
      return {
        html: html`
          <h1>未読の投稿</h1>
          ${list.length === 0 ? html`<div class="empty">未読はありません。</div>` : list.map((t) => html`
            <a class="list-card" href="${link(t)}">
              <div class="meta">${t.number} ${QB.ui.statusBadge(t)} ${QB.ui.typeBadge(t.type)}</div>
              <div class="title">${t.title}</div>
              <div class="meta">最終更新 ${QB.formatDateTime(t.updatedAt)}</div>
            </a>`)}`,
      };
    },
  };
})(window.QB);
