// 画面で共通に使う部品（バッジ、画像一覧、画像の選択など）
window.QB = window.QB || {};
QB.views = QB.views || {};

(function (QB) {
  const { html, labels } = QB;

  QB.ui = {
    statusBadge(t) {
      const cls = { received: 'badge-received', progress: 'badge-progress', done: 'badge-done' }[t.status];
      const extra = t.status === 'done' && t.closeType ? `（${labels.closeType[t.closeType]}）` : '';
      return html`<span class="badge ${cls}">${labels.status[t.status]}${extra}</span>`;
    },
    typeBadge(type) {
      return html`<span class="badge">${labels.typeIcon[type]} ${labels.type[type]}</span>`;
    },
    urgencyBadge(urgency) {
      if (urgency === 'stopped') return html`<span class="badge badge-urgent">🚨 ${labels.urgency[urgency]}</span>`;
      return html`<span class="badge">${labels.urgency[urgency]}</span>`;
    },
    unreadBadge(unread) {
      return unread ? html`<span class="badge badge-unread">● 未読</span>` : '';
    },

    thumbs(list) {
      if (!list || !list.length) return '';
      return html`<div class="thumbs">${list.map((f) => html`<img src="${f.dataUrl}" alt="${f.name}" data-zoom>`)}</div>`;
    },

    // 画像をクリックすると拡大表示する
    bindZoom(root) {
      root.querySelectorAll('[data-zoom]').forEach((img) =>
        img.addEventListener('click', () => {
          const box = document.createElement('div');
          box.className = 'lightbox';
          box.setAttribute('role', 'dialog');
          box.innerHTML = html`<img src="${img.src}" alt="${img.alt}">`.__html;
          box.addEventListener('click', () => box.remove());
          document.body.appendChild(box);
        })
      );
    },

    // 画像の選択欄（最大3枚・縮小・プレビュー）。選んだ画像の配列を返す関数を戻す
    imagePicker(root, name, max = 3) {
      const input = root.querySelector(`input[name="${name}"]`);
      const preview = root.querySelector(`[data-preview="${name}"]`);
      const error = root.querySelector(`[data-error="${name}"]`);
      let images = [];
      const draw = () => {
        preview.innerHTML = images
          .map((img, i) => html`<div class="thumb-item"><img src="${img.dataUrl}" alt="${img.name}">
            <button type="button" class="btn btn-outline" data-remove="${i}" aria-label="${img.name} を外す">✕</button></div>`.__html)
          .join('');
        preview.querySelectorAll('[data-remove]').forEach((b) =>
          b.addEventListener('click', () => { images.splice(Number(b.dataset.remove), 1); draw(); })
        );
      };
      input.addEventListener('change', async () => {
        error.textContent = '';
        const files = [...input.files].filter((f) => /^image\/(jpeg|png)$/.test(f.type));
        if (files.length < input.files.length) error.textContent = 'jpg・png の画像だけ添付できます。';
        for (const file of files) {
          if (images.length >= max) { error.textContent = `画像は${max}枚までです。`; break; }
          images.push(await QB.resizeImage(file));
        }
        input.value = '';
        draw();
      });
      return { get: () => images, clear: () => { images = []; draw(); } };
    },

    imagePickerField(name, label = '画像を添付（jpg・png、3枚まで）') {
      return html`<div class="field">
        <label for="${name}">${label}</label>
        <input class="input" id="${name}" type="file" name="${name}" accept="image/jpeg,image/png" multiple>
        <span class="hint">iPad ではカメラで撮影できます。送信前に自動で小さくします。</span>
        <span class="error-text" data-error="${name}"></span>
        <div class="thumbs" data-preview="${name}"></div>
      </div>`;
    },

    privacyNotice() {
      return html`<div class="alert alert-warning" role="note">
        パスワード・口座番号・マイナンバーなどの個人情報や、図面・お客様からお預かりした資料は書かない・添付しないでください。
      </div>`;
    },

    errorBox(message) {
      return html`<div class="alert alert-danger" role="alert">${message}</div>`;
    },
  };
})(window.QB);
