-- =====================================================================
-- マスタの登録（テスト用の見本）
-- リポジトリは Public のため、実際の拠点名・場所名はここに書かない。
-- 実データは、このファイルを SQL Editor に貼り付けてから名前を書き換えて実行する
-- （書き換えた内容は保存・commit しない）。
-- =====================================================================
insert into public.qbox_categories (name, sort) values
  ('PC・周辺機器', 1),
  ('業務システム', 2),
  ('アカウント・権限', 3),
  ('ルール・使い方・AI利用', 4),
  ('その他', 5);

insert into public.qbox_sites (name, sort) values
  ('拠点A', 1),
  ('拠点B', 2);

insert into public.qbox_locations (site_id, name, sort)
select s.id, v.name, v.sort
from (values
  ('拠点A', '事務室', 1),
  ('拠点A', '製造エリア', 2),
  ('拠点B', '事務室', 1)
) as v(site_name, name, sort)
join public.qbox_sites s on s.name = v.site_name;
