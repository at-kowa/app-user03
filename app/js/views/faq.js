// S-08 公開FAQ一覧・検索／S-09 FAQ詳細
(function (QB) {
  const { html, labels } = QB;

  QB.views.faqList = {
    title: 'FAQ',
    async render(params) {
      const [faqs, m] = await Promise.all([QB.repo.listFaqs(QB.state.user.id), QB.repo.getMasters()]);
      const staff = QB.state.isStaff();
      return {
        html: html`
          <div class="page-head"><h1>FAQ</h1>
            ${staff ? html`<a class="btn btn-outline" href="#/faq-edit/new">＋ FAQ を新しく作る</a>` : ''}</div>
          <div class="filters">
            <input class="input" id="f-q" type="search" placeholder="キーワード（タイトル・質問・回答）" value="${params.query.q || ''}" aria-label="キーワード">
            <select class="input" id="f-cat" aria-label="カテゴリ"><option value="">すべてのカテゴリ</option>
              ${m.categories.map((c) => html`<option value="${c.id}">${c.name}</option>`)}</select>
            <select class="input" id="f-type" aria-label="種別"><option value="">すべての種別</option>
              ${Object.keys(labels.type).map((k) => html`<option value="${k}">${labels.type[k]}</option>`)}</select>
          </div>
          <div id="faq-list"></div>`,
        mount(root) {
          const q = root.querySelector('#f-q');
          const cat = root.querySelector('#f-cat');
          const type = root.querySelector('#f-type');
          const draw = () => {
            const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
            const list = faqs
              .filter((f) => !cat.value || f.categoryId === Number(cat.value))
              .filter((f) => !type.value || f.type === type.value)
              .filter((f) => words.every((w) => `${f.title} ${f.question} ${f.answer}`.toLowerCase().includes(w)))
              .sort((a, b) => (b.publishedAt || b.updatedAt).localeCompare(a.publishedAt || a.updatedAt));
            root.querySelector('#faq-list').innerHTML = (list.length === 0
              ? html`<div class="empty">見つかりませんでした。<br><a class="btn" style="margin-top:1rem" href="#/new">質問・要望を送る</a></div>`
              : html`${list.map((f) => html`
                <a class="list-card" href="#/faq/${f.id}">
                  <div class="meta"><span class="badge">${f.categoryName}</span> ${QB.ui.typeBadge(f.type)}
                    ${f.published ? html`公開日 ${QB.formatDate(f.publishedAt)}` : html`<span class="badge badge-progress">非公開</span>`}</div>
                  <div class="title">${f.title}</div>
                  <div class="meta">${f.question}</div>
                </a>`)}`).__html;
          };
          [q, cat, type].forEach((el) => el.addEventListener('input', draw));
          draw();
        },
      };
    },
  };

  QB.views.faqDetail = {
    title: 'FAQ',
    async render(params) {
      const f = await QB.repo.getFaq(QB.state.user.id, params.id);
      const staff = QB.state.isStaff();
      return {
        html: html`
          <p><a href="#/faq">← FAQ 一覧</a></p>
          <article class="card">
            <div class="btn-row small"><span class="badge">${f.categoryName}</span> ${QB.ui.typeBadge(f.type)}
              ${f.published ? html`<span class="muted">公開日 ${QB.formatDate(f.publishedAt)}</span>` : html`<span class="badge badge-progress">非公開</span>`}</div>
            <h1 style="margin-top:0.5rem">${f.title}</h1>
            <h2>質問</h2><div class="body-text">${f.question}</div>
            <h2 style="margin-top:1rem">回答</h2><div class="body-text">${f.answer}</div>
          </article>
          <div class="card card-muted">
            <p>解決しない場合は、この内容で質問してください。</p>
            <div class="btn-row">
              <a class="btn" href="#/new?category=${f.categoryId}">この内容で質問する</a>
              ${staff ? html`<a class="btn btn-outline" href="#/faq-edit/${f.id}">編集する</a>` : ''}
            </div>
          </div>`,
      };
    },
  };
})(window.QB);
