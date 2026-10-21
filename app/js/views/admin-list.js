// S-10 受付一覧（管理）。開いている間は一定間隔で新着を取得する
(function (QB) {
  const { html, labels } = QB;

  QB.views.adminList = {
    title: '受付一覧',
    staffOnly: true,
    async render(params) {
      const me = QB.state.user.id;
      const [m, staff] = await Promise.all([QB.repo.getMasters(), QB.repo.listStaff(me)]);
      const opt = (obj) => Object.keys(obj).map((k) => html`<option value="${k}">${obj[k]}</option>`);
      return {
        html: html`
          <div class="page-head"><h1>受付一覧</h1><span class="small muted" id="adm-updated"></span></div>
          <div id="adm-new"></div>
          <div class="filters">
            <input class="input" id="a-q" type="search" placeholder="キーワード（件名・内容・受付番号）" aria-label="キーワード">
            <select class="input" id="a-status" aria-label="ステータス"><option value="open">完了以外</option><option value="">すべてのステータス</option>${opt(labels.status)}</select>
            <select class="input" id="a-assignee" aria-label="担当者"><option value="">すべての担当者</option>
              <option value="me">自分</option><option value="none">未割り当て</option>
              ${staff.map((u) => html`<option value="${u.id}">${u.name}</option>`)}</select>
            <select class="input" id="a-type" aria-label="種別"><option value="">すべての種別</option>${opt(labels.type)}</select>
            <select class="input" id="a-cat" aria-label="カテゴリ"><option value="">すべてのカテゴリ</option>
              ${m.categories.map((c) => html`<option value="${c.id}">${c.name}</option>`)}</select>
            <select class="input" id="a-urg" aria-label="緊急度"><option value="">すべての緊急度</option>${opt(labels.urgency)}</select>
          </div>
          <div id="adm-list"></div>
          <div class="dev-tools">
            <p class="small muted">動作確認用：別の利用者が投稿したことにして、自動更新の表示を確かめられます（次の自動取得、または「今すぐ取得」で表示）。</p>
            <div class="btn-row"><button class="btn btn-outline" id="simulate">架空の新着投稿を1件追加</button>
              <button class="btn btn-ghost" id="poll-now">今すぐ取得</button></div>
          </div>`,
        async mount(root) {
          const f = (id) => root.querySelector(id);
          if (params.query.assignee) f('#a-assignee').value = params.query.assignee;
          let tickets = [];
          let lastSeen = new Date().toISOString();
          const newIds = new Set();

          const load = async () => {
            tickets = await QB.repo.listTickets(me);
            f('#adm-updated').textContent = `${QB.formatDateTime(new Date().toISOString())} 更新`;
            draw();
          };

          const draw = () => {
            const words = f('#a-q').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
            const st = f('#a-status').value, as = f('#a-assignee').value;
            const list = tickets
              .filter((t) => (st === 'open' ? t.status !== 'done' : !st || t.status === st))
              .filter((t) => !as || (as === 'me' ? t.assigneeId === me : as === 'none' ? !t.assigneeId : t.assigneeId === as))
              .filter((t) => !f('#a-type').value || t.type === f('#a-type').value)
              .filter((t) => !f('#a-cat').value || t.categoryId === Number(f('#a-cat').value))
              .filter((t) => !f('#a-urg').value || t.urgency === f('#a-urg').value)
              .filter((t) => words.every((w) => `${t.number} ${t.title} ${t.body}`.toLowerCase().includes(w)))
              // 緊急度が高い順 → 投稿日時が古い順
              .sort((a, b) => labels.urgencyRank[a.urgency] - labels.urgencyRank[b.urgency] || a.createdAt.localeCompare(b.createdAt));
            const rowCls = (t) => [t.urgency === 'stopped' ? 'row-urgent' : '', newIds.has(t.id) ? 'row-new' : ''].join(' ');
            const newMark = (t) => (newIds.has(t.id) ? html`<span class="badge badge-new">NEW</span>` : '');
            f('#adm-list').innerHTML = (list.length === 0 ? html`<div class="empty">該当する投稿はありません。</div>` : html`
              <div class="table-wrap responsive"><table class="table">
                <thead><tr><th>受付番号</th><th>件名</th><th>種別</th><th>カテゴリ</th><th>拠点</th><th>緊急度</th><th>ステータス</th><th>担当者</th><th>投稿日時</th><th>経過</th><th>未読</th></tr></thead>
                <tbody>${list.map((t) => html`<tr class="${rowCls(t)}" data-href="#/admin/${t.id}">
                  <td>${newMark(t)} ${t.number}</td><td><a href="#/admin/${t.id}">${t.title}</a></td><td>${QB.ui.typeBadge(t.type)}</td>
                  <td>${t.categoryName}</td><td>${t.siteName}</td><td>${QB.ui.urgencyBadge(t.urgency)}</td><td>${QB.ui.statusBadge(t)}</td>
                  <td>${t.assigneeName || '未割り当て'}</td><td>${QB.formatDateTime(t.createdAt)}</td><td>${QB.elapsedDays(t.createdAt)}日</td>
                  <td>${QB.ui.unreadBadge(t.unread)}</td></tr>`)}</tbody></table></div>
              <div class="cards-list">${list.map((t) => html`
                <a class="list-card ${rowCls(t)}" href="#/admin/${t.id}">
                  <div class="meta">${newMark(t)} ${t.number} ${QB.ui.typeBadge(t.type)} ${QB.ui.urgencyBadge(t.urgency)} ${QB.ui.statusBadge(t)} ${QB.ui.unreadBadge(t.unread)}</div>
                  <div class="title">${t.title}</div>
                  <div class="meta">${t.categoryName}／${t.siteName}／担当：${t.assigneeName || '未割り当て'}／${QB.formatDateTime(t.createdAt)}（${QB.elapsedDays(t.createdAt)}日経過）</div>
                </a>`)}</div>`).__html;
            QB.bindRowLinks(root);
          };

          // 新着の確認：件数が増えていれば上部に知らせ、タブのタイトルにも件数を出す
          const poll = async () => {
            const count = await QB.repo.countNewSince(me, lastSeen);
            if (count === 0) { f('#adm-updated').textContent = `${QB.formatDateTime(new Date().toISOString())} 確認`; return; }
            const before = new Set(tickets.map((t) => t.id));
            await load();
            tickets.filter((t) => !before.has(t.id)).forEach((t) => newIds.add(t.id));
            lastSeen = new Date().toISOString();
            document.title = `(${newIds.size}) 受付一覧`;
            f('#adm-new').innerHTML = html`<div class="new-arrival" role="status">
              <span>🔔 新しい投稿が ${newIds.size} 件あります（NEW の印が付いています）。</span>
              <button class="btn btn-outline" id="ack">確認した</button></div>`.__html;
            f('#ack').addEventListener('click', () => {
              newIds.clear(); f('#adm-new').innerHTML = ''; document.title = '受付一覧 - 情シス質問箱'; draw();
            });
            draw();
          };

          root.querySelectorAll('.filters input, .filters select').forEach((el) => el.addEventListener('input', draw));
          f('#simulate').addEventListener('click', async () => { await QB.repo.simulateIncoming(); });
          f('#poll-now').addEventListener('click', poll);
          await load();
          return QB.startPolling(poll);
        },
      };
    },
  };
})(window.QB);
