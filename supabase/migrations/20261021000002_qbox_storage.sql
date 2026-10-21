-- =====================================================================
-- 情シス質問箱：添付画像（Storage）のアクセス制御
-- 前提：本人が Storage の管理画面で非公開バケット「qbox-attachments」を作成済みであること
--       （Public bucket はオフ。許可する種類 image/jpeg, image/png、上限 5MB を推奨）
-- 保存先のパスは「<投稿ID>/<ランダムな名前>.jpg」とする（先頭のフォルダ名で権限を判定）
-- 適用方法：SQL Editor に貼り付けて Run（本人が実行）
-- ※「must be owner of table objects」と出た場合は、Storage の Policies 画面から
--   同じ条件でポリシーを作成する（その場合は Claude に相談）
-- =====================================================================
begin;

-- 閲覧：情シスはすべて、一般は自分の投稿のフォルダのみ（内部メモの添付は除く）
create policy qbox_attachments_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'qbox-attachments'
    and (
      public.qbox_is_staff()
      or (public.qbox_is_member()
          and exists (
            select 1 from public.qbox_attachments a
            join public.qbox_tickets t on t.id = a.ticket_id
            left join public.qbox_comments c on c.id = a.comment_id
            where a.storage_path = storage.objects.name
              and t.poster_id = auth.uid()
              and (c.id is null or not c.internal)))
    )
  );

-- 登録：情シスはすべて、一般は自分の投稿のフォルダのみ
create policy qbox_attachments_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'qbox-attachments'
    and (
      public.qbox_is_staff()
      or (public.qbox_is_member()
          and exists (
            select 1 from public.qbox_tickets t
            where t.id::text = (storage.foldername(name))[1]
              and t.poster_id = auth.uid()))
    )
  );

-- 更新・削除のポリシーは作らない（＝画面からは変更・削除できない）

commit;
