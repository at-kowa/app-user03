# app-user03（情シス質問箱・技術検証）

要件は [docs/requirements.md](docs/requirements.md) を参照。以前の README は [README.old.md](README.old.md)。

## 第1版（画面のみ・架空データ）

- Next.js（App Router）＋ shadcn/ui で作っている
- データは `src/lib/mock-data.ts` の架空データで、ブラウザのメモリ上にある。再読み込みすると元に戻る
- データベース（supabase）につなぐときは `src/lib/repository.ts` の中身だけを差し替える

## 開発の準備（この PC の場合）

この PC では、npm が Windows の証明書を使うように設定しないと、パッケージを取得できない。

1. ユーザー環境変数 `NODE_USE_SYSTEM_CA` に `1` を登録し、Cursor を開き直す
2. `npm ci` を実行する
3. `npm run dev` を実行し、Edge で http://localhost:3000 を開く

## 画面の確かめ方

ログイン画面の「画面確認用のテストアカウント」から社員番号を選ぶ（第1版ではパスワードを確認しないので、何か入力すればログインできる）。

| 社員番号 | 権限 | 確かめられること |
|---|---|---|
| 100001 | 一般 | 投稿・自分の投稿・FAQ |
| 100002 | 一般 | 初回ログイン時のパスワード変更 |
| 200001 / 200002 | 情シス担当 | 受付一覧・対応・FAQ 公開編集 |
| 300001 | 管理者 | 上記＋FAQ の削除 |
| 900001 | 無効 | ログインできないこと |

架空データはブラウザのメモリにあるため、画面の移動はリンクやボタンで行う（URL を直接入力すると初期状態に戻る）。

## フォルダ構成

```
src/
├─ app/                 … 画面（URL ごとのフォルダ）
│   ├─ login/ password/ … S-01・S-02
│   ├─ page.tsx         … S-03 ホーム
│   ├─ new/ done/       … S-04・S-05
│   ├─ my/ tickets/     … S-06・S-07
│   ├─ faq/             … S-08・S-09
│   ├─ admin/           … S-10・S-11
│   └─ faq-edit/        … S-12
├─ components/
│   ├─ ui/              … shadcn/ui の部品（ボタン等は iPad 向けに高さ 44px 以上へ調整済み）
│   └─ *.tsx            … 画面で共通に使う部品
└─ lib/
    ├─ repository.ts    … データアクセス（第1版は架空データ）
    ├─ mock-data.ts     … 架空データ
    ├─ session.tsx      … ログイン状態・自動ログアウト
    └─ labels.ts        … 表示名・日付の表示
supabase/               … DB の SQL（別のプルリクエスト）
```
