// S-11 投稿詳細（対応用）
(function (QB) {
  const { html, labels } = QB;

  QB.views.adminDetail = {
    title: '投稿の対応',
    staffOnly: true,
    async render(params) {
      const me = QB.state.user.id;
      const [t, staff] = await Promise.all([QB.repo.getTicket(me, params.id), QB.repo.listStaff(me)]);
      await QB.repo.markRead(me, t.id);
      return {
        html: html`
          <p><a href="#/admin">← 受付一覧</a></p>
          <div class="layout-2col">
            <div class="stack">
              ${QB.ui.ticketSummary(t)}
              <div class="card"><h2>回答・やり取り</h2>${QB.ui.timeline(t)}</div>

              <form class="card" id="answer-form" novalidate>
                <h2>回答を登録する</h2>
                <div class="field"><label for="ans-body">回答</label>
                  <textarea class="input" id="ans-body" name="body" maxlength="4000"></textarea></div>
                <p class="error-text" id="ans-error" role="alert"></p>
                <button class="btn" type="submit">回答を登録</button>
              </form>

              <form class="card" id="comment-form" novalidate>
                <h2>コメント・内部メモ</h2>
                <div class="field"><label for="cm-body">本文</label>
                  <textarea class="input" id="cm-body" name="body" maxlength="2000"></textarea></div>
                ${QB.ui.imagePickerField('cm-images')}
                <label class="checkbox"><input type="checkbox" name="internal"> 🔒 内部メモにする（投稿者には表示しません）</label>
                <p class="error-text" id="cm-error" role="alert"></p>
                <button class="btn" type="submit">送る</button>
              </form>
            </div>

            <aside class="stack">
              <div class="card">
                <h2>担当者</h2>
                <div class="field"><select class="input" id="assignee" aria-label="担当者">
                  <option value="">未割り当て</option>
                  ${staff.map((u) => html`<option value="${u.id}" ${t.assigneeId === u.id ? 'selected' : ''}>${u.name}</option>`)}
                </select></div>
                <div class="btn-row"><button class="btn" id="assign">割り当てる</button>
                  <button class="btn btn-outline" id="assign-me">自分にする</button></div>
                <p class="hint">割り当てると、ステータスが自動で「対応中」になります。</p>
              </div>

              <div class="card">
                <h2>ステータス</h2>
                <div class="field"><select class="input" id="status" aria-label="ステータス">
                  ${Object.keys(labels.status).map((k) => html`<option value="${k}" ${t.status === k ? 'selected' : ''}>${labels.status[k]}</option>`)}
                </select></div>
                <div class="field" id="close-field"><label for="closeType">完了区分<span class="req">必須</span></label>
                  <select class="input" id="closeType"><option value="">選んでください</option>
                    ${Object.keys(labels.closeType).map((k) => html`<option value="${k}" ${t.closeType === k ? 'selected' : ''}>${labels.closeType[k]}</option>`)}
                  </select></div>
                <p class="error-text" id="st-error" role="alert"></p>
                <button class="btn" id="save-status">ステータスを変更</button>
              </div>

              <div class="card">
                <h2>FAQ 公開設定</h2>
                ${t.faq
                  ? html`<p>FAQ：${t.faq.published ? html`<span class="badge badge-done">公開中</span>` : html`<span class="badge">非公開</span>`}</p>
                      <a class="btn btn-outline btn-block" href="#/faq-edit/${t.faq.id}">FAQ を編集する</a>`
                  : html`<p class="small muted">非公開（初期値）</p>
                      <a class="btn btn-outline btn-block" href="#/faq-edit/new?ticket=${t.id}">公開する（FAQ を作る）</a>`}
              </div>
            </aside>
          </div>`,
        mount(root) {
          const f = (id) => root.querySelector(id);
          QB.ui.bindZoom(root);
          const picker = QB.ui.imagePicker(root, 'cm-images');
          const toggleClose = () => { f('#close-field').hidden = f('#status').value !== 'done'; };
          f('#status').addEventListener('change', toggleClose);
          toggleClose();

          const assign = async (id) => { await QB.repo.assign(me, t.id, id); QB.rerender(); };
          f('#assign').addEventListener('click', () => assign(f('#assignee').value));
          f('#assign-me').addEventListener('click', () => assign(me));

          f('#save-status').addEventListener('click', async () => {
            try {
              await QB.repo.setStatus(me, t.id, f('#status').value, f('#closeType').value);
              QB.rerender();
            } catch (ex) { f('#st-error').textContent = ex.message; }
          });

          f('#answer-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = e.target.elements.body.value.trim();
            if (!body) { f('#ans-error').textContent = '回答を入力してください。'; return; }
            await QB.repo.addAnswer(me, t.id, body);
            if (t.status !== 'done' && confirm('回答を登録しました。ステータスを「完了（回答済み）」にしますか。')) {
              await QB.repo.setStatus(me, t.id, 'done', 'answered');
            }
            QB.rerender();
          });

          f('#comment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = e.target.elements.body.value.trim();
            if (!body) { f('#cm-error').textContent = '本文を入力してください。'; return; }
            await QB.repo.addComment(me, t.id, { body, internal: e.target.elements.internal.checked, images: picker.get() });
            QB.rerender();
          });
        },
      };
    },
  };
})(window.QB);
