// 共通の道具：HTML のエスケープ、日付の表示、画像の縮小など
window.QB = window.QB || {};

(function (QB) {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  // 画面に出す文字はすべてここを通してエスケープする（XSS 対策）
  QB.esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

  // エスケープ済みの HTML であることを示す入れ物
  QB.raw = (str) => ({ __html: String(str) });

  function toHtml(value) {
    if (value === null || value === undefined || value === false) return '';
    if (Array.isArray(value)) return value.map(toHtml).join('');
    if (typeof value === 'object' && '__html' in value) return value.__html;
    return QB.esc(value);
  }

  // html`...${値}...` と書くと、値は自動でエスケープされる
  QB.html = (strings, ...values) =>
    QB.raw(strings.reduce((acc, s, i) => acc + s + (i < values.length ? toHtml(values[i]) : ''), ''));

  QB.pad = (n, len = 2) => String(n).padStart(len, '0');

  QB.formatDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}/${QB.pad(d.getMonth() + 1)}/${QB.pad(d.getDate())} ${QB.pad(d.getHours())}:${QB.pad(d.getMinutes())}`;
  };

  QB.formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}/${QB.pad(d.getMonth() + 1)}/${QB.pad(d.getDate())}`;
  };

  // <input type="datetime-local"> 用の値
  QB.toLocalInput = (date) =>
    `${date.getFullYear()}-${QB.pad(date.getMonth() + 1)}-${QB.pad(date.getDate())}T${QB.pad(date.getHours())}:${QB.pad(date.getMinutes())}`;

  QB.elapsedDays = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

  QB.formData = (form) => Object.fromEntries(new FormData(form).entries());

  // 画像を長辺 1,600px の JPEG に縮小して dataURL で返す
  QB.resizeImage = (file, maxSide = 1600, quality = 0.85) =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ name: file.name.replace(/\.\w+$/, '') + '.jpg', type: 'image/jpeg', size: Math.round(dataUrl.length * 0.75), dataUrl });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('画像を読み込めませんでした')); };
      img.src = url;
    });
})(window.QB);
