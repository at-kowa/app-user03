// 起動・画面の切り替え（URL の # 以降で画面を決める）・ヘッダー
(function (QB) {
  const { html } = QB;
  const appEl = document.getElementById('app');
  const headerEl = document.getElementById('app-header');
  let cleanup = null;

  const routes = [
    [/^\/login$/, 'login'],
    [/^\/password$/, 'password'],
    [/^\/home$/, 'home'],
    [/^\/unread$/, 'unread'],
    [/^\/new$/, 'ticketNew'],
    [/^\/done\/(?<id>[\w-]+)$/, 'ticketDone'],
    [/^\/my$/, 'myTickets'],
    [/^\/tickets\/(?<id>[\w-]+)$/, 'ticketDetail'],
    [/^\/faq$/, 'faqList'],
    [/^\/faq\/(?<id>[\w-]+)$/, 'faqDetail'],
    [/^\/admin$/, 'adminList'],
    [/^\/admin\/(?<id>[\w-]+)$/, 'adminDetail'],
    [/^\/faq-edit\/(?<id>[\w-]+)$/, 'faqEdit'],
  ];

  // 一定間隔での取得（自動更新）。画面を離れると止まる
  QB.startPolling = (fn) => {
    let timer = null;
    let stopped = false;
    QB.repo.getSettings().then((s) => {
      if (!stopped) timer = setInterval(() => fn().catch(() => {}), s.pollSeconds * 1000);
    });
    return () => { stopped = true; clearInterval(timer); };
  };

  // 表の行をクリックしても詳細へ移動できるようにする
  QB.bindRowLinks = (root) => {
    root.querySelectorAll('tr[data-href]').forEach((tr) =>
      tr.addEventListener('click', (e) => { if (!e.target.closest('a')) location.hash = tr.dataset.href; })
    );
  };

  QB.rerender = () => route();

  async function drawHeader(path) {
    const u = QB.state.user;
    if (!u || path === '/login' || u.mustChangePassword) { headerEl.hidden = true; return; }
    const { unread } = await QB.repo.countSummary(u.id);
    const links = [['#/home', 'ホーム'], ['#/new', '投稿する'], ['#/my', '自分の投稿'], ['#/faq', 'FAQ']];
    if (QB.state.isStaff()) links.push(['#/admin', '受付一覧']);
    headerEl.hidden = false;
    headerEl.innerHTML = html`
      <a class="brand" href="#/home">情シス質問箱</a>
      <nav aria-label="メニュー">${links.map(([href, label]) =>
        html`<a href="${href}" class="${path.startsWith(href.slice(1)) ? 'active' : ''}">${label}</a>`)}</nav>
      <div class="user">
        <a class="btn btn-ghost" href="#/unread" aria-label="未読 ${unread} 件">🔔 未読 ${unread > 0 ? html`<span class="count-badge">${unread}</span>` : '0'}</a>
        <span>${u.name}（${QB.labels.role[u.role]}）</span>
        <a class="btn btn-ghost" href="#/password">パスワード変更</a>
        <button class="btn btn-outline" id="logout">ログアウト</button>
      </div>`.__html;
    headerEl.querySelector('#logout').addEventListener('click', () => {
      QB.state.logout();
      location.hash = '#/login';
    });
  }

  async function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    const hash = location.hash.slice(1) || '/home';
    const [path, qs = ''] = hash.split('?');
    const query = Object.fromEntries(new URLSearchParams(qs));

    let name = null;
    let match = null;
    for (const [re, viewName] of routes) {
      match = path.match(re);
      if (match) { name = viewName; break; }
    }
    const view = QB.views[name];
    const user = QB.state.user;

    // 未ログインはすべてログイン画面へ。初回はパスワード変更を必須にする
    if (!view) { location.hash = user ? '#/home' : '#/login'; return; }
    if (!view.public && !user) { location.hash = '#/login'; return; }
    if (user && user.mustChangePassword && name !== 'password') { location.hash = '#/password'; return; }
    if (name === 'login' && user) { location.hash = '#/home'; return; }

    await drawHeader(path);
    document.title = `${view.title} - 情シス質問箱`;

    // 権限のない画面は表示しない（本当の防御はデータベース側で行う）
    if (view.staffOnly && !QB.state.isStaff()) {
      appEl.innerHTML = QB.ui.errorBox('この画面は情シス担当・管理者のみ利用できます。').__html;
      return;
    }
    try {
      const result = await view.render({ ...(match.groups || {}), query });
      appEl.innerHTML = result.html.__html;
      window.scrollTo(0, 0);
      const c = result.mount ? await result.mount(appEl) : null;
      if (typeof c === 'function') cleanup = c;
      await drawHeader(path); // 画面を開いて既読になった分を未読件数に反映する
    } catch (ex) {
      appEl.innerHTML = QB.ui.errorBox(ex.message).__html;
    }
  }

  window.addEventListener('hashchange', route);
  (async () => {
    await QB.state.restore();
    await QB.startIdleWatch();
    route();
  })();
})(window.QB);
