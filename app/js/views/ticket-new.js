// S-04 新規投稿（入力 → 確認 → 送信）／S-05 投稿完了
(function (QB) {
  const { html, labels } = QB;

  const EXAMPLES = {
    question: '例）〇〇をするにはどうすればよいですか。いつ・どの画面で困っているかを書いてください。',
    request: '例）〇〇ができるようにしてほしい。今どう困っていて、どうなるとうれしいかを書いてください。',
    trouble: '例）〇〇をしたら、△△というエラーが出た。いつから・何をしたときに起きるか、画面の表示を書いてください。',
  };

  QB.views.ticketNew = {
    title: '質問・要望を送る',
    async render(params) {
      const m = await QB.repo.getMasters();
      const user = QB.state.user;
      const presetCategory = Number(params.query.category) || '';
      let draft = null; // 確認画面から戻ったときの入力内容

      const radio = (name, value, label, checked) =>
        html`<label class="choice"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''} required><span>${label}</span></label>`;

      return {
        html: html`
          <h1>質問・要望を送る</h1>
          <div id="new-root"></div>`,
        mount(root) {
          const box = root.querySelector('#new-root');
          let picker;

          const drawForm = () => {
            const d = draft || { type: 'question', categoryId: presetCategory, siteId: user.siteId, urgency: 'low', occurredAt: QB.toLocalInput(new Date()) };
            box.innerHTML = html`
              ${QB.ui.privacyNotice()}
              <form id="new-form" class="card" novalidate>
                <div class="field"><span class="label">種別<span class="req">必須</span></span>
                  <div class="choices">${Object.keys(labels.type).map((k) => radio('type', k, `${labels.typeIcon[k]} ${labels.type[k]}`, d.type === k))}</div>
                </div>
                <div class="grid grid-2">
                  <div class="field"><label for="categoryId">カテゴリ<span class="req">必須</span></label>
                    <select class="input" id="categoryId" name="categoryId" required>
                      <option value="">選んでください</option>
                      ${m.categories.map((c) => html`<option value="${c.id}" ${Number(d.categoryId) === c.id ? 'selected' : ''}>${c.name}</option>`)}
                    </select></div>
                  <div class="field"><label for="siteId">工場・拠点<span class="req">必須</span></label>
                    <select class="input" id="siteId" name="siteId" required>
                      ${m.sites.map((s) => html`<option value="${s.id}" ${Number(d.siteId) === s.id ? 'selected' : ''}>${s.name}</option>`)}
                    </select></div>
                  <div class="field"><label for="locationId">場所</label>
                    <select class="input" id="locationId" name="locationId"></select></div>
                  <div class="field"><label for="locationText">場所（自由入力）</label>
                    <input class="input" id="locationText" name="locationText" maxlength="50" value="${d.locationText || ''}"></div>
                </div>
                <div class="field"><label for="title">件名<span class="req">必須</span></label>
                  <input class="input" id="title" name="title" maxlength="40" required value="${d.title || ''}">
                  <span class="hint" data-len="title"></span></div>
                <div class="field"><label for="body">内容<span class="req">必須</span></label>
                  <textarea class="input" id="body" name="body" maxlength="2000" required>${d.body || ''}</textarea>
                  <span class="hint" id="body-example"></span><span class="hint" data-len="body"></span></div>
                <div class="field" id="occurred-field"><label for="occurredAt">発生日時<span class="req" id="occurred-req">必須</span></label>
                  <input class="input" id="occurredAt" name="occurredAt" type="datetime-local" value="${d.occurredAt || ''}"></div>
                <div class="field"><span class="label">緊急度<span class="req">必須</span></span>
                  <div class="choices">${Object.keys(labels.urgency).map((k) => radio('urgency', k, labels.urgency[k], d.urgency === k))}</div>
                </div>
                ${QB.ui.imagePickerField('images')}
                <label class="checkbox"><input type="checkbox" name="allowPublish" ${d.allowPublish ? 'checked' : ''}> FAQ として公開されても構わない</label>
                <p class="hint">最終的に公開するかは情シスが判断します。公開するときは個人名などを取り除きます。</p>
                <p class="error-text" id="new-error" role="alert"></p>
                <div class="btn-row"><button class="btn btn-lg" type="submit">確認画面へ</button>
                  <a class="btn btn-outline" href="#/home">やめる</a></div>
              </form>`.__html;

            const form = box.querySelector('#new-form');
            picker = QB.ui.imagePicker(box, 'images');
            (draft?.images || []).forEach((img) => picker.get().push(img));
            if (draft?.images?.length) box.querySelector('[data-preview="images"]').innerHTML =
              draft.images.map((img) => html`<div class="thumb-item"><img src="${img.dataUrl}" alt="${img.name}"></div>`.__html).join('');

            const drawLocations = () => {
              const siteId = Number(form.elements.siteId.value);
              form.elements.locationId.innerHTML = html`<option value="">選ばない</option>${m.locations
                .filter((l) => l.siteId === siteId)
                .map((l) => html`<option value="${l.id}" ${Number(d.locationId) === l.id ? 'selected' : ''}>${l.name}</option>`)}`.__html;
            };
            const onType = () => {
              const type = form.elements.type.value;
              box.querySelector('#body-example').textContent = EXAMPLES[type];
              box.querySelector('#occurred-req').hidden = type !== 'trouble';
            };
            const onLen = (name, max) => {
              box.querySelector(`[data-len="${name}"]`).textContent = `${form.elements[name].value.length} / ${max}文字`;
            };
            form.elements.siteId.addEventListener('change', drawLocations);
            form.querySelectorAll('input[name="type"]').forEach((r) => r.addEventListener('change', onType));
            form.elements.title.addEventListener('input', () => onLen('title', 40));
            form.elements.body.addEventListener('input', () => onLen('body', 2000));
            drawLocations(); onType(); onLen('title', 40); onLen('body', 2000);

            form.addEventListener('submit', (e) => {
              e.preventDefault();
              const v = QB.formData(form);
              v.allowPublish = !!form.elements.allowPublish.checked;
              const err = [];
              if (!v.categoryId) err.push('カテゴリを選んでください。');
              if (!v.title.trim()) err.push('件名を入力してください。');
              if (!v.body.trim()) err.push('内容を入力してください。');
              if (v.type === 'trouble' && !v.occurredAt) err.push('不具合のときは発生日時を入力してください。');
              if (err.length) { box.querySelector('#new-error').textContent = err.join(' '); return; }
              draft = { ...v, images: picker.get().slice() };
              drawConfirm();
              window.scrollTo(0, 0);
            });
          };

          const drawConfirm = () => {
            const d = draft;
            const name = (list, id) => list.find((x) => x.id === Number(id))?.name ?? '';
            box.innerHTML = html`
              <div class="alert alert-info">この内容で送信します。よろしければ「送信する」を押してください。</div>
              <div class="card">
                <dl class="dl">
                  <dt>種別</dt><dd>${labels.typeIcon[d.type]} ${labels.type[d.type]}</dd>
                  <dt>カテゴリ</dt><dd>${name(m.categories, d.categoryId)}</dd>
                  <dt>工場・拠点</dt><dd>${name(m.sites, d.siteId)}</dd>
                  <dt>場所</dt><dd>${name(m.locations, d.locationId)} ${d.locationText}</dd>
                  <dt>件名</dt><dd>${d.title}</dd>
                  <dt>内容</dt><dd class="body-text">${d.body}</dd>
                  ${d.type === 'trouble' ? html`<dt>発生日時</dt><dd>${QB.formatDateTime(d.occurredAt)}</dd>` : ''}
                  <dt>緊急度</dt><dd>${labels.urgency[d.urgency]}</dd>
                  <dt>FAQ 公開</dt><dd>${d.allowPublish ? '公開されても構わない' : '公開を希望しない'}</dd>
                  <dt>投稿者</dt><dd>${user.name}（${user.dept}）</dd>
                </dl>
                ${QB.ui.thumbs(d.images)}
              </div>
              <p class="error-text" id="send-error" role="alert"></p>
              <div class="btn-row" style="margin-top:1rem">
                <button class="btn btn-lg" id="send">送信する</button>
                <button class="btn btn-outline" id="back">入力に戻る</button>
              </div>`.__html;
            box.querySelector('#back').addEventListener('click', drawForm);
            box.querySelector('#send').addEventListener('click', async (e) => {
              e.target.disabled = true;
              try {
                const t = await QB.repo.createTicket(user.id, {
                  ...d, occurredAt: d.type === 'trouble' && d.occurredAt ? new Date(d.occurredAt).toISOString() : null,
                });
                location.hash = `#/done/${t.id}`;
              } catch (ex) {
                box.querySelector('#send-error').textContent = ex.message;
                e.target.disabled = false;
              }
            });
          };

          drawForm();
        },
      };
    },
  };

  QB.views.ticketDone = {
    title: '送信しました',
    async render(params) {
      const t = await QB.repo.getTicket(QB.state.user.id, params.id);
      return {
        html: html`
          <div class="center-box card" style="text-align:center">
            <h1>送信しました</h1>
            <p class="muted">受付番号</p>
            <p style="font-size:1.75rem;font-weight:700">${t.number}</p>
            <p>${t.title}</p>
            <p class="small muted">回答やコメントがあると、ヘッダーに未読の件数が表示されます。</p>
            <div class="btn-row" style="justify-content:center">
              <a class="btn" href="#/my">自分の投稿一覧へ</a>
              <a class="btn btn-outline" href="#/home">ホームへ</a>
            </div>
          </div>`,
      };
    },
  };
})(window.QB);
