// S-07 投稿詳細（投稿者用）
(function (QB) {
  const { html } = QB;

  // 投稿・回答・コメントを時系列に並べる（内部メモは staff のときだけ渡ってくる）
  QB.ui.timeline = (t) => {
    const items = [
      ...t.answers.map((a) => ({ kind: 'answer', at: a.createdAt, who: a.authorName, body: a.body, files: [] })),
      ...t.comments.map((c) => ({ kind: c.internal ? 'internal' : 'comment', at: c.createdAt, who: c.authorName, body: c.body, files: c.attachments })),
    ].sort((a, b) => a.at.localeCompare(b.at));
    if (!items.length) return html`<p class="muted">まだやり取りはありません。</p>`;
    const head = { answer: '✅ 回答', comment: '💬 コメント', internal: '🔒 内部メモ（投稿者には見えません）' };
    return html`<ol class="timeline">${items.map((i) => html`
      <li class="${i.kind}">
        <div class="who">${head[i.kind]}　${i.who}　${QB.formatDateTime(i.at)}</div>
        <div class="body-text">${i.body}</div>
        ${QB.ui.thumbs(i.files)}
      </li>`)}</ol>`;
  };

  QB.ui.ticketSummary = (t) => html`
    <div class="card">
      <div class="btn-row small">${t.number} ${QB.ui.typeBadge(t.type)} ${QB.ui.statusBadge(t)} ${QB.ui.urgencyBadge(t.urgency)}</div>
      <h1 style="margin-top:0.5rem">${t.title}</h1>
      <dl class="dl">
        <dt>カテゴリ</dt><dd>${t.categoryName}</dd>
        <dt>工場・拠点</dt><dd>${t.siteName} ${t.locationName} ${t.locationText}</dd>
        ${t.occurredAt ? html`<dt>発生日時</dt><dd>${QB.formatDateTime(t.occurredAt)}</dd>` : ''}
        <dt>投稿者</dt><dd>${t.posterName}</dd>
        <dt>担当者</dt><dd>${t.assigneeName || '未割り当て'}</dd>
        <dt>投稿日時</dt><dd>${QB.formatDateTime(t.createdAt)}</dd>
        <dt>FAQ 公開</dt><dd>${t.allowPublish ? '公開されても構わない' : '公開を希望しない'}</dd>
      </dl>
      <h3 style="margin-top:1rem">内容</h3>
      <div class="body-text">${t.body}</div>
      ${QB.ui.thumbs(t.attachments)}
    </div>`;

  QB.views.ticketDetail = {
    title: '投稿の詳細',
    async render(params) {
      const userId = QB.state.user.id;
      const t = await QB.repo.getTicket(userId, params.id);
      if (t.posterId !== userId) throw new Error('この投稿を見る権限がありません');
      await QB.repo.markRead(userId, t.id); // 開いた時点で既読にする
      return {
        html: html`
          <p><a href="#/my">← 自分の投稿一覧</a></p>
          ${QB.ui.ticketSummary(t)}
          <div class="card">
            <h2>回答・やり取り</h2>
            ${QB.ui.timeline(t)}
          </div>
          <form class="card" id="comment-form" novalidate>
            <h2>コメントする</h2>
            ${t.status === 'done' ? html`<p class="hint">完了した投稿にコメントすると、情シスが確認して対応を再開するか判断します。</p>` : ''}
            ${QB.ui.privacyNotice()}
            <div class="field"><label for="c-body">コメント</label>
              <textarea class="input" id="c-body" name="body" maxlength="2000"></textarea></div>
            ${QB.ui.imagePickerField('c-images')}
            <p class="error-text" id="c-error" role="alert"></p>
            <button class="btn" type="submit">コメントを送る</button>
          </form>
          ${t.status === 'received' ? html`
            <div class="card">
              <h2>取り下げ</h2>
              <p class="small muted">「受付」のあいだだけ、この投稿を取り下げられます。</p>
              <button class="btn btn-destructive" id="withdraw">この投稿を取り下げる</button>
            </div>` : ''}`,
        mount(root) {
          QB.ui.bindZoom(root);
          const picker = QB.ui.imagePicker(root, 'c-images');
          root.querySelector('#comment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = e.target.elements.body.value.trim();
            if (!body) { root.querySelector('#c-error').textContent = 'コメントを入力してください。'; return; }
            await QB.repo.addComment(userId, t.id, { body, internal: false, images: picker.get() });
            QB.rerender();
          });
          root.querySelector('#withdraw')?.addEventListener('click', async () => {
            if (!confirm('この投稿を取り下げます。よろしいですか。')) return;
            await QB.repo.withdraw(userId, t.id);
            QB.rerender();
          });
        },
      };
    },
  };
})(window.QB);
