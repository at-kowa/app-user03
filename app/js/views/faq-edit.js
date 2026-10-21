// S-12 FAQ公開編集（元の投稿から作る／既存の FAQ を編集する）
(function (QB) {
  const { html, labels } = QB;

  QB.views.faqEdit = {
    title: 'FAQ の公開編集',
    staffOnly: true,
    async render(params) {
      const me = QB.state.user.id;
      const m = await QB.repo.getMasters();
      let faq;
      let source = null;
      if (params.id === 'new') {
        source = params.query.ticket ? await QB.repo.getTicket(me, params.query.ticket) : null;
        faq = {
          id: null, ticketId: source?.id ?? null, title: source?.title ?? '', question: source?.body ?? '',
          answer: source?.answers.at(-1)?.body ?? '', categoryId: source?.categoryId ?? '', type: source?.type ?? 'question', published: false,
        };
      } else {
        faq = await QB.repo.getFaq(me, params.id);
        if (faq.ticketId) source = await QB.repo.getTicket(me, faq.ticketId);
      }
      const notAllowed = source && !source.allowPublish;

      return {
        html: html`
          <p><a href="${source ? `#/admin/${source.id}` : '#/faq'}">← 戻る</a></p>
          <h1>FAQ の公開編集</h1>
          ${notAllowed ? html`<div class="alert alert-danger" role="alert">⚠️ 投稿者は「FAQ として公開されても構わない」にチェックしていません。公開する場合は内容に十分注意してください。</div>` : ''}
          <div class="alert alert-info">個人名・部署名・固有の情報を取り除いてください。元の投稿の添付画像は FAQ に引き継ぎません。</div>
          <div class="layout-2col">
            <form class="card" id="faq-form" novalidate>
              ${source ? html`<p class="small muted">元の投稿：${source.number} ${source.title}</p>` : ''}
              <div class="field"><label for="fe-title">公開タイトル<span class="req">必須</span></label>
                <input class="input" id="fe-title" name="title" maxlength="60" value="${faq.title}"></div>
              <div class="grid grid-2">
                <div class="field"><label for="fe-cat">カテゴリ<span class="req">必須</span></label>
                  <select class="input" id="fe-cat" name="categoryId"><option value="">選んでください</option>
                    ${m.categories.map((c) => html`<option value="${c.id}" ${Number(faq.categoryId) === c.id ? 'selected' : ''}>${c.name}</option>`)}</select></div>
                <div class="field"><label for="fe-type">種別</label>
                  <select class="input" id="fe-type" name="type">
                    ${Object.keys(labels.type).map((k) => html`<option value="${k}" ${faq.type === k ? 'selected' : ''}>${labels.type[k]}</option>`)}</select></div>
              </div>
              <div class="field"><label for="fe-q">公開質問文<span class="req">必須</span></label>
                <textarea class="input" id="fe-q" name="question" maxlength="2000">${faq.question}</textarea></div>
              <div class="field"><label for="fe-a">公開回答文<span class="req">必須</span></label>
                <textarea class="input" id="fe-a" name="answer" maxlength="4000">${faq.answer}</textarea></div>
              <label class="checkbox"><input type="checkbox" name="published" ${faq.published ? 'checked' : ''}> 公開する（チェックを外すと非公開）</label>
              <p class="error-text" id="fe-error" role="alert"></p>
              <div class="btn-row">
                <button class="btn" type="submit">保存する</button>
                ${faq.id && QB.state.isAdmin() ? html`<button class="btn btn-destructive" type="button" id="fe-delete">削除する</button>` : ''}
              </div>
            </form>
            <div class="card preview" aria-label="プレビュー">
              <p class="small muted">プレビュー（利用者にはこう見えます）</p>
              <div id="fe-preview"></div>
            </div>
          </div>`,
        mount(root) {
          const form = root.querySelector('#faq-form');
          const el = form.elements;
          const draw = () => {
            const cat = m.categories.find((c) => c.id === Number(el.categoryId.value));
            root.querySelector('#fe-preview').innerHTML = html`
              <div class="btn-row small">${cat ? html`<span class="badge">${cat.name}</span>` : ''} ${QB.ui.typeBadge(el.type.value)}</div>
              <h2 style="margin-top:0.5rem">${el.title.value || '（タイトル未入力）'}</h2>
              <h3>質問</h3><div class="body-text">${el.question.value}</div>
              <h3 style="margin-top:1rem">回答</h3><div class="body-text">${el.answer.value}</div>`.__html;
          };
          form.addEventListener('input', draw);
          draw();

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = { id: faq.id, ticketId: faq.ticketId, title: el.title.value.trim(), question: el.question.value.trim(),
              answer: el.answer.value.trim(), categoryId: el.categoryId.value, type: el.type.value, published: el.published.checked };
            if (!v.title || !v.question || !v.answer || !v.categoryId) {
              root.querySelector('#fe-error').textContent = 'タイトル・カテゴリ・質問文・回答文を入力してください。'; return;
            }
            if (v.published && notAllowed && !confirm('投稿者は公開を希望していません。それでも公開しますか。')) return;
            const saved = await QB.repo.saveFaq(me, v);
            location.hash = `#/faq/${saved.id}`;
          });

          root.querySelector('#fe-delete')?.addEventListener('click', async () => {
            if (!confirm('この FAQ を削除します。元に戻せません。よろしいですか。')) return;
            await QB.repo.deleteFaq(me, faq.id);
            location.hash = '#/faq';
          });
        },
      };
    },
  };
})(window.QB);
