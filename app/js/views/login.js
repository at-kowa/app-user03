// S-01 ログイン／S-02 パスワード変更
(function (QB) {
  const { html, labels } = QB;

  QB.views.login = {
    title: 'ログイン',
    public: true,
    async render() {
      const accounts = await QB.repo.listTestAccounts();
      return {
        html: html`
          <div class="center-box">
            <div class="card">
              <h1>情シス質問箱</h1>
              <form id="login-form" novalidate>
                <div class="field">
                  <label for="empNo">社員番号</label>
                  <input class="input" id="empNo" name="empNo" inputmode="numeric" autocomplete="username" required>
                </div>
                <div class="field">
                  <label for="password">パスワード</label>
                  <input class="input" id="password" name="password" type="password" autocomplete="current-password" required>
                </div>
                <p class="error-text" id="login-error" role="alert"></p>
                <button class="btn btn-block" type="submit">ログイン</button>
              </form>
            </div>
            <div class="card card-muted">
              <h2>画面確認用のテストアカウント</h2>
              <p class="small muted">第1版ではパスワードは確認しません（何か入力すればログインできます）。</p>
              <ul class="small">
                ${accounts.map((a) => html`<li><button type="button" class="btn btn-ghost" data-emp="${a.empNo}">${a.empNo}</button>
                  ${a.name}（${labels.role[a.role]}${a.active ? '' : '・無効'}${a.mustChangePassword ? '・初回変更あり' : ''}）</li>`)}
              </ul>
            </div>
          </div>`,
        mount(root) {
          const form = root.querySelector('#login-form');
          root.querySelectorAll('[data-emp]').forEach((b) =>
            b.addEventListener('click', () => { form.empNo.value = b.dataset.emp; form.password.focus(); })
          );
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const err = root.querySelector('#login-error');
            const { empNo, password } = QB.formData(form);
            if (!empNo || !password) { err.textContent = '社員番号とパスワードを入力してください。'; return; }
            const user = await QB.repo.login(empNo);
            if (!user) { err.textContent = '社員番号またはパスワードが違うか、利用できないアカウントです。'; return; }
            QB.state.setUser(user);
            location.hash = user.mustChangePassword ? '#/password' : '#/home';
          });
        },
      };
    },
  };

  QB.views.password = {
    title: 'パスワード変更',
    async render() {
      const forced = QB.state.user.mustChangePassword;
      return {
        html: html`
          <div class="center-box">
            <div class="card">
              <h1>パスワード変更</h1>
              ${forced ? html`<div class="alert alert-info">はじめてのログインのため、パスワードを変更してください。</div>` : ''}
              <form id="pw-form" novalidate>
                <div class="field"><label for="pw1">新しいパスワード</label>
                  <input class="input" id="pw1" name="pw1" type="password" autocomplete="new-password" minlength="8">
                  <span class="hint">8文字以上</span></div>
                <div class="field"><label for="pw2">新しいパスワード（確認）</label>
                  <input class="input" id="pw2" name="pw2" type="password" autocomplete="new-password"></div>
                <p class="error-text" id="pw-error" role="alert"></p>
                <div class="btn-row">
                  <button class="btn" type="submit">変更する</button>
                  ${forced ? '' : html`<a class="btn btn-outline" href="#/home">戻る</a>`}
                </div>
              </form>
            </div>
          </div>`,
        mount(root) {
          const form = root.querySelector('#pw-form');
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const err = root.querySelector('#pw-error');
            const { pw1, pw2 } = QB.formData(form);
            if (pw1.length < 8) { err.textContent = 'パスワードは8文字以上にしてください。'; return; }
            if (pw1 !== pw2) { err.textContent = '確認用のパスワードが一致しません。'; return; }
            // 本番では supabase Auth でパスワードを変更する。第1版では保存しない
            await QB.repo.completePasswordChange(QB.state.user.id);
            QB.state.user.mustChangePassword = false;
            alert('パスワードを変更しました。');
            location.hash = '#/home';
          });
        },
      };
    },
  };
})(window.QB);
