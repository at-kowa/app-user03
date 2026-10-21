-- =====================================================================
-- 利用者の登録（ひな形）
-- 手順：
--   1. Authentication の管理画面で、利用者を「<社員番号>@qbox.example.com」で作成する
--      （Auto Confirm User をオンにする。パスワードはここにもチャットにも書かない）
--   2. 下の < > の部分を書き換えて SQL Editor で実行する（書き換えた内容は保存・commit しない）
--   role は general（一般）／staff（情シス担当）／admin（管理者）
-- =====================================================================
insert into public.qbox_users (id, emp_no, name, dept, site_id, role)
select u.id, '<社員番号>', '<表示名>', '<部署>', s.id, '<general|staff|admin>'
from auth.users u
join public.qbox_sites s on s.name = '<拠点名>'
where u.email = '<社員番号>@qbox.example.com';

-- パスワードを初期化したときは、次回ログイン時に変更を求める
-- update public.qbox_users set must_change_password = true where emp_no = '<社員番号>';
