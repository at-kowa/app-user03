// 第1版の架空データ（社名・個人名・実データは入れない）
// データベース（supabase）につないだら、このファイルは使わなくなる
import type { Answer, Attachment, Category, Comment, Faq, Location, Settings, Site, Ticket, TicketType, Urgency, User } from "./types";

const now = Date.now();
const ago = (days: number, hours = 0) => new Date(now - days * 86400000 - hours * 3600000).toISOString();

// 添付画像の見本（文字だけの SVG）
const sampleImage = (label: string) =>
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="100%" height="100%" fill="#e4e4e7"/>` +
      `<text x="50%" y="50%" font-size="32" text-anchor="middle" fill="#52525b" font-family="sans-serif">${label}</text></svg>`,
  );

export type MockDb = {
  settings: Settings;
  sites: Site[];
  locations: Location[];
  categories: Category[];
  users: User[];
  ticketSeq: number;
  tickets: Ticket[];
  comments: Comment[];
  answers: Answer[];
  attachments: Attachment[];
  faqs: Faq[];
  readStates: Record<string, Record<string, string>>;
  sampleIncoming: { type: TicketType; categoryId: number; title: string; body: string; urgency: Urgency }[];
};

export const mockDb: MockDb = {
  settings: { autoLogoutMinutes: 60, pollSeconds: 60 },

  sites: [
    { id: 1, name: "拠点A", sort: 1 },
    { id: 2, name: "拠点B", sort: 2 },
    { id: 3, name: "拠点C", sort: 3 },
  ],
  locations: [
    { id: 1, siteId: 1, name: "1階 事務室" },
    { id: 2, siteId: 1, name: "2階 会議室" },
    { id: 3, siteId: 1, name: "製造エリア" },
    { id: 4, siteId: 2, name: "事務室" },
    { id: 5, siteId: 2, name: "倉庫" },
    { id: 6, siteId: 3, name: "事務室" },
  ],
  categories: [
    { id: 1, name: "PC・周辺機器" },
    { id: 2, name: "業務システム" },
    { id: 3, name: "アカウント・権限" },
    { id: 4, name: "ルール・使い方・AI利用" },
    { id: 5, name: "その他" },
  ],

  users: [
    { id: "u1", empNo: "100001", name: "テスト一般A", dept: "テスト部門1", siteId: 1, role: "general", active: true, mustChangePassword: false },
    { id: "u2", empNo: "100002", name: "テスト一般B", dept: "テスト部門2", siteId: 2, role: "general", active: true, mustChangePassword: true },
    { id: "u3", empNo: "200001", name: "テスト担当C", dept: "情報システム", siteId: 1, role: "staff", active: true, mustChangePassword: false },
    { id: "u4", empNo: "200002", name: "テスト担当D", dept: "情報システム", siteId: 1, role: "staff", active: true, mustChangePassword: false },
    { id: "u5", empNo: "300001", name: "テスト管理者E", dept: "情報システム", siteId: 1, role: "admin", active: true, mustChangePassword: false },
    { id: "u6", empNo: "900001", name: "テスト無効F", dept: "テスト部門1", siteId: 1, role: "general", active: false, mustChangePassword: false },
  ],

  ticketSeq: 7,
  tickets: [
    {
      id: "t1", number: "Q-2026-00001", type: "question", categoryId: 1, siteId: 1, locationId: 1, locationText: "",
      title: "プリンタで両面印刷ができない", body: "いつも使っているプリンタで、両面印刷を選んでも片面で出てきます。\n設定のどこを見ればよいですか。",
      occurredAt: null, urgency: "workaround", allowPublish: true, posterId: "u1", assigneeId: "u3",
      status: "done", closeType: "answered", createdAt: ago(20), updatedAt: ago(18), closedAt: ago(18),
      posterActivityAt: ago(18), staffActivityAt: ago(20),
    },
    {
      id: "t2", number: "Q-2026-00002", type: "trouble", categoryId: 2, siteId: 1, locationId: 3, locationText: "",
      title: "業務システムの画面が開かない", body: "朝から業務システムを開くとエラーになります。\n画面の写真を添付します。",
      occurredAt: ago(1, 3), urgency: "stopped", allowPublish: false, posterId: "u1", assigneeId: "u3",
      status: "progress", closeType: null, createdAt: ago(1, 2), updatedAt: ago(0, 5), closedAt: null,
      posterActivityAt: ago(0, 5), staffActivityAt: ago(1, 2),
    },
    {
      id: "t3", number: "Q-2026-00003", type: "request", categoryId: 4, siteId: 2, locationId: 4, locationText: "",
      title: "AI ツールの使い方の説明会をしてほしい", body: "部署内で AI ツールを使いたい人が増えています。\n基本的な使い方とルールの説明会を開いてもらえないでしょうか。",
      occurredAt: null, urgency: "low", allowPublish: true, posterId: "u2", assigneeId: null,
      status: "received", closeType: null, createdAt: ago(2), updatedAt: ago(2), closedAt: null,
      posterActivityAt: ago(2), staffActivityAt: ago(2),
    },
    {
      id: "t4", number: "Q-2026-00004", type: "question", categoryId: 3, siteId: 1, locationId: null, locationText: "",
      title: "共有フォルダの権限を追加したい", body: "新しく配属された人に、部署の共有フォルダを見られるようにしたいです。\n申請の方法を教えてください。",
      occurredAt: null, urgency: "workaround", allowPublish: true, posterId: "u1", assigneeId: null,
      status: "received", closeType: null, createdAt: ago(0, 6), updatedAt: ago(0, 6), closedAt: null,
      posterActivityAt: ago(0, 6), staffActivityAt: ago(0, 6),
    },
    {
      id: "t5", number: "Q-2026-00005", type: "trouble", categoryId: 1, siteId: 2, locationId: 5, locationText: "入口横の端末",
      title: "バーコードリーダーが反応しない", body: "倉庫の端末につないでいるバーコードリーダーが反応しません。\n手入力で回避しています。",
      occurredAt: ago(3, 1), urgency: "workaround", allowPublish: false, posterId: "u2", assigneeId: "u4",
      status: "progress", closeType: null, createdAt: ago(3), updatedAt: ago(1), closedAt: null,
      posterActivityAt: ago(1), staffActivityAt: ago(1),
    },
    {
      id: "t6", number: "Q-2026-00006", type: "question", categoryId: 2, siteId: 3, locationId: 6, locationText: "",
      title: "パスワードの有効期限が切れたときは", body: "パスワードの有効期限が切れるとどうなりますか。",
      occurredAt: null, urgency: "low", allowPublish: true, posterId: "u1", assigneeId: "u4",
      status: "done", closeType: "answered", createdAt: ago(30), updatedAt: ago(28), closedAt: ago(28),
      posterActivityAt: ago(28), staffActivityAt: ago(30),
    },
  ],

  comments: [
    { id: "c1", ticketId: "t2", authorId: "u3", body: "エラーの画面に表示されているメッセージを教えてください。", internal: false, createdAt: ago(0, 20) },
    { id: "c2", ticketId: "t2", authorId: "u1", body: "写真を追加しました。", internal: false, createdAt: ago(0, 18) },
    { id: "c3", ticketId: "t2", authorId: "u3", body: "同じ症状の連絡がほかにもないか確認中。", internal: true, createdAt: ago(0, 17) },
    { id: "c4", ticketId: "t2", authorId: "u3", body: "原因を調べています。もう少しお待ちください。", internal: false, createdAt: ago(0, 5) },
    { id: "c5", ticketId: "t5", authorId: "u4", body: "ケーブルを別の差し込み口に挿し直して試していただけますか。", internal: false, createdAt: ago(1) },
  ],

  answers: [
    { id: "a1", ticketId: "t1", authorId: "u3", body: "印刷画面の「プリンターのプロパティ」で「両面印刷」を選んでください。\nアプリ側の設定だけでは反映されないことがあります。", createdAt: ago(18) },
    { id: "a2", ticketId: "t6", authorId: "u4", body: "期限が切れると、次のログイン時に新しいパスワードの設定を求められます。\n画面の案内に従って変更してください。", createdAt: ago(28) },
  ],

  attachments: [
    { id: "f1", ticketId: "t2", commentId: null, name: "エラー画面.jpg", type: "image/jpeg", size: 120000, dataUrl: sampleImage("添付画像の見本 1"), uploaderId: "u1" },
    { id: "f2", ticketId: "t2", commentId: "c2", name: "エラー画面2.jpg", type: "image/jpeg", size: 98000, dataUrl: sampleImage("添付画像の見本 2"), uploaderId: "u1" },
  ],

  faqs: [
    {
      id: "q1", ticketId: "t1", title: "プリンタで両面印刷ができないとき",
      question: "両面印刷を選んでも片面で印刷されます。",
      answer: "印刷画面の「プリンターのプロパティ」で「両面印刷」を選んでください。\nアプリ側の設定だけでは反映されないことがあります。",
      categoryId: 1, type: "question", published: true, publishedAt: ago(17), updatedAt: ago(17),
    },
    {
      id: "q2", ticketId: "t6", title: "パスワードの有効期限が切れたとき",
      question: "パスワードの有効期限が切れるとどうなりますか。",
      answer: "次のログイン時に新しいパスワードの設定を求められます。画面の案内に従って変更してください。",
      categoryId: 2, type: "question", published: true, publishedAt: ago(27), updatedAt: ago(27),
    },
    {
      id: "q3", ticketId: null, title: "（下書き）会議室のモニターにつなぐ方法",
      question: "ノート PC を会議室のモニターに映すには？",
      answer: "会議室のケーブルを PC の映像出力端子に挿し、画面の切り替えを選んでください。",
      categoryId: 1, type: "question", published: false, publishedAt: null, updatedAt: ago(5),
    },
  ],

  // 既読：利用者ID → { 投稿ID: 最後に読んだ日時 }
  readStates: {
    u1: { t1: ago(17), t6: ago(27) },
    u3: { t1: ago(18), t2: ago(1), t6: ago(28) },
    u4: { t5: ago(1), t6: ago(28) },
  },

  // 「架空の新着投稿を追加」ボタン用
  sampleIncoming: [
    { type: "trouble", categoryId: 1, title: "ノート PC の画面が暗いまま", body: "電源は入っていますが、画面が暗いままです。", urgency: "stopped" },
    { type: "question", categoryId: 3, title: "メールの容量がいっぱいと表示される", body: "容量がいっぱいと出ます。どうすればよいですか。", urgency: "workaround" },
    { type: "request", categoryId: 2, title: "業務システムの帳票を追加してほしい", body: "月末に使う一覧表を出せるようにしてほしいです。", urgency: "low" },
  ],
};
