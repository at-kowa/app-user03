-- =====================================================================
-- 情シス質問箱：テーブル・DB関数・RLS（要件定義書 13章）
-- 適用方法：supabase の SQL Editor に全文を貼り付けて Run（本人が実行）
-- 共有プロジェクトのため、作るものはすべて qbox_ で始め、他のテーブルや
-- プロジェクト全体の設定（Auth の設定を含む）には触れない。
-- 全体を1つのトランザクションにしているので、途中で失敗したら何も作られない。
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. マスタ・設定
-- ---------------------------------------------------------------------
create table public.qbox_sites (
  id bigint generated always as identity primary key,
  name text not null,
  sort integer not null default 0,
  active boolean not null default true
);

create table public.qbox_locations (
  id bigint generated always as identity primary key,
  site_id bigint not null references public.qbox_sites (id),
  name text not null,
  sort integer not null default 0,
  active boolean not null default true
);

create table public.qbox_categories (
  id bigint generated always as identity primary key,
  name text not null,
  sort integer not null default 0,
  active boolean not null default true
);

create table public.qbox_settings (
  key text primary key,
  value text not null
);

-- ---------------------------------------------------------------------
-- 2. 利用者（Auth のユーザーと1対1。登録は SQL で行う）
-- ---------------------------------------------------------------------
create table public.qbox_users (
  id uuid primary key references auth.users (id) on delete cascade,
  emp_no text not null unique,
  name text not null,
  dept text not null default '',
  site_id bigint references public.qbox_sites (id),
  role text not null default 'general' check (role in ('general', 'staff', 'admin')),
  active boolean not null default true,
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. 権限判定用の関数（RLS から使う）
--    security definer：qbox_users の RLS を通さずに本人の権限を引くため
-- ---------------------------------------------------------------------
create function public.qbox_current_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select u.role from public.qbox_users u
  where u.id = auth.uid() and u.active
$$;

create function public.qbox_is_member()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.qbox_current_role() is not null
$$;

create function public.qbox_is_staff()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(public.qbox_current_role() in ('staff', 'admin'), false)
$$;

create function public.qbox_is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(public.qbox_current_role() = 'admin', false)
$$;

-- ---------------------------------------------------------------------
-- 4. 投稿
-- ---------------------------------------------------------------------
create table public.qbox_ticket_counters (
  year integer primary key,
  last_no integer not null
);

create table public.qbox_tickets (
  id bigint generated always as identity primary key,
  number text not null unique,
  type text not null check (type in ('question', 'request', 'trouble')),
  category_id bigint not null references public.qbox_categories (id),
  site_id bigint not null references public.qbox_sites (id),
  location_id bigint references public.qbox_locations (id),
  location_text text not null default '' check (char_length(location_text) <= 50),
  title text not null check (char_length(title) between 1 and 40),
  body text not null check (char_length(body) between 1 and 2000),
  occurred_at timestamptz,
  urgency text not null default 'low' check (urgency in ('stopped', 'workaround', 'low')),
  allow_publish boolean not null default false,
  poster_id uuid not null references public.qbox_users (id),
  assignee_id uuid references public.qbox_users (id),
  status text not null default 'received' check (status in ('received', 'progress', 'done')),
  close_type text check (close_type in ('answered', 'handled', 'declined', 'withdrawn')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  -- 未読判定用：投稿者に知らせる更新／情シスに知らせる更新の日時
  poster_activity_at timestamptz not null default now(),
  staff_activity_at timestamptz not null default now(),
  constraint qbox_tickets_trouble_needs_occurred check (type <> 'trouble' or occurred_at is not null),
  constraint qbox_tickets_done_needs_close_type check ((status = 'done') = (close_type is not null))
);
create index qbox_tickets_poster_idx on public.qbox_tickets (poster_id);
create index qbox_tickets_assignee_idx on public.qbox_tickets (assignee_id);
create index qbox_tickets_status_created_idx on public.qbox_tickets (status, created_at);

-- 投稿時：受付番号の採番（Q-年-5桁）、投稿者・初期状態の固定
create function public.qbox_tickets_before_insert()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  y integer := extract(year from (now() at time zone 'Asia/Tokyo'))::integer;
  n integer;
begin
  insert into public.qbox_ticket_counters as c (year, last_no) values (y, 1)
  on conflict (year) do update set last_no = c.last_no + 1
  returning last_no into n;

  new.number := format('Q-%s-%s', y, lpad(n::text, 5, '0'));
  new.poster_id := auth.uid();
  new.assignee_id := null;
  new.status := 'received';
  new.close_type := null;
  new.closed_at := null;
  new.created_at := now();
  new.updated_at := now();
  new.poster_activity_at := now();
  new.staff_activity_at := now();
  return new;
end;
$$;

create trigger qbox_tickets_before_insert
  before insert on public.qbox_tickets
  for each row execute function public.qbox_tickets_before_insert();

-- 更新時：変えてはいけない項目の保護、担当割り当てで「対応中」、完了日時など
create function public.qbox_tickets_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.number := old.number;
  new.poster_id := old.poster_id;
  new.created_at := old.created_at;

  if new.assignee_id is not null and new.assignee_id is distinct from old.assignee_id
     and not exists (select 1 from public.qbox_users u
                     where u.id = new.assignee_id and u.active and u.role in ('staff', 'admin')) then
    raise exception '担当者には有効な情シス担当・管理者を指定してください';
  end if;

  if new.assignee_id is not null and old.assignee_id is distinct from new.assignee_id
     and new.status = 'received' then
    new.status := 'progress';
  end if;

  if new.status = 'done' and old.status <> 'done' then
    new.closed_at := now();
  elsif new.status <> 'done' then
    new.close_type := null;
    new.closed_at := null;
  end if;

  -- 投稿者に知らせる変更（担当・ステータス）
  if new.status is distinct from old.status or new.assignee_id is distinct from old.assignee_id then
    new.poster_activity_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger qbox_tickets_before_update
  before update on public.qbox_tickets
  for each row execute function public.qbox_tickets_before_update();

-- ---------------------------------------------------------------------
-- 5. コメント・回答・添付画像
-- ---------------------------------------------------------------------
create table public.qbox_comments (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.qbox_tickets (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.qbox_users (id),
  body text not null check (char_length(body) between 1 and 2000),
  internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index qbox_comments_ticket_idx on public.qbox_comments (ticket_id);

create table public.qbox_answers (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.qbox_tickets (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.qbox_users (id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index qbox_answers_ticket_idx on public.qbox_answers (ticket_id);

-- ticket_id は投稿・コメントどちらの添付でも必ず入れる（権限判定に使う）
create table public.qbox_attachments (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.qbox_tickets (id) on delete cascade,
  comment_id bigint references public.qbox_comments (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  uploader_id uuid not null default auth.uid() references public.qbox_users (id),
  created_at timestamptz not null default now()
);
create index qbox_attachments_ticket_idx on public.qbox_attachments (ticket_id);

-- コメント・回答が付いたら投稿の更新日時と未読判定用の日時を進める
create function public.qbox_touch_ticket_on_reply()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  is_poster boolean;
begin
  if tg_table_name = 'qbox_comments' and new.internal then
    update public.qbox_tickets set updated_at = now() where id = new.ticket_id;
    return new;
  end if;

  select t.poster_id = new.author_id into is_poster
  from public.qbox_tickets t where t.id = new.ticket_id;

  if is_poster then
    update public.qbox_tickets set staff_activity_at = now() where id = new.ticket_id;
  else
    update public.qbox_tickets set poster_activity_at = now() where id = new.ticket_id;
  end if;
  return new;
end;
$$;

create trigger qbox_comments_after_insert
  after insert on public.qbox_comments
  for each row execute function public.qbox_touch_ticket_on_reply();

create trigger qbox_answers_after_insert
  after insert on public.qbox_answers
  for each row execute function public.qbox_touch_ticket_on_reply();

-- ---------------------------------------------------------------------
-- 6. FAQ・反応・既読・変更履歴
-- ---------------------------------------------------------------------
create table public.qbox_faqs (
  id bigint generated always as identity primary key,
  ticket_id bigint references public.qbox_tickets (id) on delete set null,
  title text not null check (char_length(title) between 1 and 60),
  question text not null check (char_length(question) between 1 and 2000),
  answer text not null check (char_length(answer) between 1 and 4000),
  category_id bigint not null references public.qbox_categories (id),
  type text not null default 'question' check (type in ('question', 'request', 'trouble')),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.qbox_faqs_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) then
    new.published_at := now();
  elsif not new.published then
    new.published_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger qbox_faqs_before_write
  before insert or update on public.qbox_faqs
  for each row execute function public.qbox_faqs_before_write();

-- 【あれば良い】FAQへの反応（1人1回まで）
create table public.qbox_reactions (
  faq_id bigint not null references public.qbox_faqs (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.qbox_users (id),
  kind text not null check (kind in ('solved', 'same')),
  created_at timestamptz not null default now(),
  primary key (faq_id, user_id, kind)
);

create table public.qbox_read_states (
  user_id uuid not null default auth.uid() references public.qbox_users (id) on delete cascade,
  ticket_id bigint not null references public.qbox_tickets (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, ticket_id)
);

-- 【あれば良い】変更履歴（担当者・ステータス・期限）
create table public.qbox_histories (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.qbox_tickets (id) on delete cascade,
  changed_by uuid references public.qbox_users (id),
  field text not null,
  before_value text,
  after_value text,
  changed_at timestamptz not null default now()
);
create index qbox_histories_ticket_idx on public.qbox_histories (ticket_id);

create function public.qbox_tickets_after_update()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.assignee_id is distinct from old.assignee_id then
    insert into public.qbox_histories (ticket_id, changed_by, field, before_value, after_value)
    values (new.id, auth.uid(), 'assignee_id', old.assignee_id::text, new.assignee_id::text);
  end if;
  if new.status is distinct from old.status or new.close_type is distinct from old.close_type then
    insert into public.qbox_histories (ticket_id, changed_by, field, before_value, after_value)
    values (new.id, auth.uid(), 'status',
            concat_ws(':', old.status, old.close_type), concat_ws(':', new.status, new.close_type));
  end if;
  if new.due_date is distinct from old.due_date then
    insert into public.qbox_histories (ticket_id, changed_by, field, before_value, after_value)
    values (new.id, auth.uid(), 'due_date', old.due_date::text, new.due_date::text);
  end if;
  return new;
end;
$$;

create trigger qbox_tickets_after_update
  after update on public.qbox_tickets
  for each row execute function public.qbox_tickets_after_update();

-- ---------------------------------------------------------------------
-- 7. 画面から呼ぶ DB 関数（一般の利用者に直接の UPDATE を許さないための窓口）
-- ---------------------------------------------------------------------

-- 投稿者による取り下げ（「受付」のときだけ）
create function public.qbox_withdraw_ticket(p_ticket_id bigint)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.qbox_is_member() then
    raise exception 'この操作をする権限がありません';
  end if;
  update public.qbox_tickets
     set status = 'done', close_type = 'withdrawn', staff_activity_at = now()
   where id = p_ticket_id and poster_id = auth.uid() and status = 'received';
  if not found then
    raise exception '「受付」の状態の自分の投稿だけ取り下げられます';
  end if;
end;
$$;

-- パスワード変更後に「変更が必要」フラグを外す（本人のみ）
create function public.qbox_complete_password_change()
returns void
language sql security definer
set search_path = ''
as $$
  update public.qbox_users set must_change_password = false
  where id = auth.uid() and active
$$;

-- ログイン日時の記録（本人のみ）
create function public.qbox_touch_login()
returns void
language sql security definer
set search_path = ''
as $$
  update public.qbox_users set last_login_at = now()
  where id = auth.uid() and active
$$;

-- ---------------------------------------------------------------------
-- 8. 権限（GRANT）：未ログイン（anon）には何も許可しない
-- ---------------------------------------------------------------------
revoke all on
  public.qbox_sites, public.qbox_locations, public.qbox_categories, public.qbox_settings,
  public.qbox_users, public.qbox_ticket_counters, public.qbox_tickets, public.qbox_comments,
  public.qbox_answers, public.qbox_attachments, public.qbox_faqs, public.qbox_reactions,
  public.qbox_read_states, public.qbox_histories
from anon, authenticated;

grant select on public.qbox_sites, public.qbox_locations, public.qbox_categories,
  public.qbox_settings, public.qbox_users, public.qbox_histories to authenticated;
grant select, insert, update on public.qbox_tickets to authenticated;
grant select, insert on public.qbox_comments, public.qbox_answers, public.qbox_attachments to authenticated;
grant select, insert, update, delete on public.qbox_faqs to authenticated;
grant select, insert, delete on public.qbox_reactions to authenticated;
grant select, insert, update on public.qbox_read_states to authenticated;
-- qbox_ticket_counters は採番関数（security definer）からだけ使う

revoke execute on function
  public.qbox_current_role(), public.qbox_is_member(), public.qbox_is_staff(), public.qbox_is_admin(),
  public.qbox_withdraw_ticket(bigint), public.qbox_complete_password_change(), public.qbox_touch_login(),
  public.qbox_tickets_before_insert(), public.qbox_tickets_before_update(), public.qbox_tickets_after_update(),
  public.qbox_touch_ticket_on_reply(), public.qbox_faqs_before_write()
from public, anon;

grant execute on function
  public.qbox_current_role(), public.qbox_is_member(), public.qbox_is_staff(), public.qbox_is_admin(),
  public.qbox_withdraw_ticket(bigint), public.qbox_complete_password_change(), public.qbox_touch_login()
to authenticated;

-- ---------------------------------------------------------------------
-- 9. RLS（行ごとのアクセス制御）
-- ---------------------------------------------------------------------
alter table public.qbox_sites enable row level security;
alter table public.qbox_locations enable row level security;
alter table public.qbox_categories enable row level security;
alter table public.qbox_settings enable row level security;
alter table public.qbox_users enable row level security;
alter table public.qbox_ticket_counters enable row level security;
alter table public.qbox_tickets enable row level security;
alter table public.qbox_comments enable row level security;
alter table public.qbox_answers enable row level security;
alter table public.qbox_attachments enable row level security;
alter table public.qbox_faqs enable row level security;
alter table public.qbox_reactions enable row level security;
alter table public.qbox_read_states enable row level security;
alter table public.qbox_histories enable row level security;

-- マスタ・設定：閲覧のみ（一般は有効なものだけ）
create policy qbox_sites_select on public.qbox_sites for select to authenticated
  using (public.qbox_is_member() and (active or public.qbox_is_staff()));
create policy qbox_locations_select on public.qbox_locations for select to authenticated
  using (public.qbox_is_member() and (active or public.qbox_is_staff()));
create policy qbox_categories_select on public.qbox_categories for select to authenticated
  using (public.qbox_is_member() and (active or public.qbox_is_staff()));
create policy qbox_settings_select on public.qbox_settings for select to authenticated
  using (public.qbox_is_member());

-- 利用者：一般は自分だけ、情シスは全員（担当者選択のため）
create policy qbox_users_select on public.qbox_users for select to authenticated
  using (public.qbox_is_member() and (id = auth.uid() or public.qbox_is_staff()));

-- 投稿
create policy qbox_tickets_select on public.qbox_tickets for select to authenticated
  using (public.qbox_is_staff() or (public.qbox_is_member() and poster_id = auth.uid()));
create policy qbox_tickets_insert on public.qbox_tickets for insert to authenticated
  with check (public.qbox_is_member());
create policy qbox_tickets_update on public.qbox_tickets for update to authenticated
  using (public.qbox_is_staff()) with check (public.qbox_is_staff());

-- コメント：一般は自分の投稿の、内部メモ以外のみ
create policy qbox_comments_select on public.qbox_comments for select to authenticated
  using (
    public.qbox_is_staff()
    or (public.qbox_is_member() and not internal
        and exists (select 1 from public.qbox_tickets t where t.id = ticket_id and t.poster_id = auth.uid()))
  );
create policy qbox_comments_insert on public.qbox_comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and (public.qbox_is_staff()
         or (public.qbox_is_member() and not internal
             and exists (select 1 from public.qbox_tickets t where t.id = ticket_id and t.poster_id = auth.uid())))
  );

-- 回答：一般は自分の投稿のもののみ閲覧。登録は情シスのみ
create policy qbox_answers_select on public.qbox_answers for select to authenticated
  using (
    public.qbox_is_staff()
    or (public.qbox_is_member()
        and exists (select 1 from public.qbox_tickets t where t.id = ticket_id and t.poster_id = auth.uid()))
  );
create policy qbox_answers_insert on public.qbox_answers for insert to authenticated
  with check (public.qbox_is_staff() and author_id = auth.uid());

-- 添付画像の情報：一般は自分の投稿・コメントのもののみ（内部メモの添付は見えない）
create policy qbox_attachments_select on public.qbox_attachments for select to authenticated
  using (
    public.qbox_is_staff()
    or (public.qbox_is_member()
        and exists (select 1 from public.qbox_tickets t where t.id = ticket_id and t.poster_id = auth.uid())
        and (comment_id is null
             or exists (select 1 from public.qbox_comments c where c.id = comment_id and not c.internal)))
  );
create policy qbox_attachments_insert on public.qbox_attachments for insert to authenticated
  with check (
    uploader_id = auth.uid()
    and (comment_id is null
         or exists (select 1 from public.qbox_comments c where c.id = comment_id and c.ticket_id = qbox_attachments.ticket_id))
    and (public.qbox_is_staff()
         or (public.qbox_is_member()
             and exists (select 1 from public.qbox_tickets t where t.id = ticket_id and t.poster_id = auth.uid())))
  );

-- FAQ：一般は公開中のみ閲覧。情シスは閲覧・登録・更新。削除は管理者のみ
create policy qbox_faqs_select on public.qbox_faqs for select to authenticated
  using (public.qbox_is_staff() or (public.qbox_is_member() and published));
create policy qbox_faqs_insert on public.qbox_faqs for insert to authenticated
  with check (public.qbox_is_staff());
create policy qbox_faqs_update on public.qbox_faqs for update to authenticated
  using (public.qbox_is_staff()) with check (public.qbox_is_staff());
create policy qbox_faqs_delete on public.qbox_faqs for delete to authenticated
  using (public.qbox_is_admin());

-- 反応：公開中の FAQ に、自分の分だけ
create policy qbox_reactions_select on public.qbox_reactions for select to authenticated
  using (public.qbox_is_member());
create policy qbox_reactions_insert on public.qbox_reactions for insert to authenticated
  with check (
    public.qbox_is_member() and user_id = auth.uid()
    and exists (select 1 from public.qbox_faqs f where f.id = faq_id and f.published)
  );
create policy qbox_reactions_delete on public.qbox_reactions for delete to authenticated
  using (public.qbox_is_member() and user_id = auth.uid());

-- 既読：自分の分だけ（見られる投稿に限る）
create policy qbox_read_states_select on public.qbox_read_states for select to authenticated
  using (public.qbox_is_member() and user_id = auth.uid());
create policy qbox_read_states_insert on public.qbox_read_states for insert to authenticated
  with check (
    public.qbox_is_member() and user_id = auth.uid()
    and exists (select 1 from public.qbox_tickets t where t.id = ticket_id
                and (t.poster_id = auth.uid() or public.qbox_is_staff()))
  );
create policy qbox_read_states_update on public.qbox_read_states for update to authenticated
  using (public.qbox_is_member() and user_id = auth.uid())
  with check (user_id = auth.uid());

-- 変更履歴：情シスのみ閲覧
create policy qbox_histories_select on public.qbox_histories for select to authenticated
  using (public.qbox_is_staff());

-- qbox_ticket_counters にはポリシーを作らない（＝画面からは読み書きできない）

-- ---------------------------------------------------------------------
-- 10. 設定値の初期値
-- ---------------------------------------------------------------------
insert into public.qbox_settings (key, value) values
  ('auto_logout_minutes', '60'),
  ('poll_seconds', '60');

commit;
