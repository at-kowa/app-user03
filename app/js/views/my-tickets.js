// S-06 自分の投稿一覧
(function (QB) {
  const { html, labels } = QB;

  QB.views.myTickets = {
    title: '自分の投稿',
    async render() {
      const all = await QB.repo.listMyTickets(QB.state.user.id);
      return {
        html: html`
          <div class="page-head"><h1>自分の投稿</h1><a class="btn" href="#/new">✉️ 質問・要望を送る</a></div>
          <div class="filters">
            <select class="input" id="my-status" aria-label="ステータスで絞り込み">
              <option value="open">完了以外</option>
              <option value="">すべて</option>
              ${Object.keys(labels.status).map((k) => html`<option value="${k}">${labels.status[k]}</option>`)}
            </select>
          </div>
          <div id="my-list"></div>`,
        mount(root) {
          const sel = root.querySelector('#my-status');
          const draw = () => {
            const v = sel.value;
            const list = all.filter((t) => (v === 'open' ? t.status !== 'done' : !v || t.status === v));
            root.querySelector('#my-list').innerHTML = (list.length === 0
              ? html`<div class="empty">該当する投稿はありません。</div>`
              : html`
                <div class="table-wrap responsive"><table class="table">
                  <thead><tr><th>受付番号</th><th>件名</th><th>種別</th><th>ステータス</th><th>最終更新</th><th>未読</th></tr></thead>
                  <tbody>${list.map((t) => html`<tr data-href="#/tickets/${t.id}">
                    <td>${t.number}</td><td><a href="#/tickets/${t.id}">${t.title}</a></td><td>${QB.ui.typeBadge(t.type)}</td>
                    <td>${QB.ui.statusBadge(t)}</td><td>${QB.formatDateTime(t.updatedAt)}</td><td>${QB.ui.unreadBadge(t.unread)}</td></tr>`)}
                  </tbody></table></div>
                <div class="cards-list">${list.map((t) => html`
                  <a class="list-card" href="#/tickets/${t.id}">
                    <div class="meta">${t.number} ${QB.ui.typeBadge(t.type)} ${QB.ui.statusBadge(t)} ${QB.ui.unreadBadge(t.unread)}</div>
                    <div class="title">${t.title}</div>
                    <div class="meta">最終更新 ${QB.formatDateTime(t.updatedAt)}</div>
                  </a>`)}</div>`).__html;
            QB.bindRowLinks(root);
          };
          sel.addEventListener('change', draw);
          draw();
        },
      };
    },
  };
})(window.QB);
