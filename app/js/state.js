// 状態管理：ログイン中の利用者、表示用の名前、自動ログアウト
window.QB = window.QB || {};

(function (QB) {
  const KEY = 'qbox.mock.userId';

  QB.labels = {
    role: { general: '一般', staff: '情シス担当', admin: '管理者' },
    type: { question: '質問', request: '要望', trouble: '不具合' },
    typeIcon: { question: '❓', request: '💡', trouble: '⚠️' },
    status: { received: '受付', progress: '対応中', done: '完了' },
    closeType: { answered: '回答済み', handled: '対応済み', declined: '見送り', withdrawn: '取り下げ' },
    urgency: { stopped: '業務が止まっている', workaround: '困っているが回避できる', low: '急がない' },
    urgencyRank: { stopped: 0, workaround: 1, low: 2 },
  };

  QB.state = {
    user: null,
    isStaff() { return !!this.user && (this.user.role === 'staff' || this.user.role === 'admin'); },
    isAdmin() { return !!this.user && this.user.role === 'admin'; },

    async restore() {
      let id = null;
      try { id = sessionStorage.getItem(KEY); } catch { /* 保存できない環境では毎回ログイン */ }
      this.user = id ? await QB.repo.getUser(id) : null;
      return this.user;
    },
    setUser(user) {
      this.user = user;
      try { sessionStorage.setItem(KEY, user.id); } catch { /* 無視 */ }
    },
    logout() {
      this.user = null;
      try { sessionStorage.removeItem(KEY); } catch { /* 無視 */ }
    },
  };

  // 一定時間操作がなければ自動でログアウトする（初期値60分）
  let idleTimer = null;
  QB.startIdleWatch = async () => {
    const { autoLogoutMinutes } = await QB.repo.getSettings();
    const reset = () => {
      clearTimeout(idleTimer);
      if (!QB.state.user) return;
      idleTimer = setTimeout(() => {
        QB.state.logout();
        alert('一定時間操作がなかったため、ログアウトしました。');
        location.hash = '#/login';
      }, autoLogoutMinutes * 60000);
    };
    ['click', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, reset, { passive: true }));
    reset();
  };
})(window.QB);
