-- EUNGARAGE 2.0 — guestbook, visit counter, starlight server, admin, audit.
--
-- A NEW Supabase project, separate from LUNAI (user decision 2026-11-19).
-- Nothing here touches existing data: every object is created, none dropped.
--
-- Access model
--   * Tables have RLS on and NO policies for anon/authenticated: the browser
--     cannot read or write a table directly.
--   * The site talks only to the RPC functions below (SECURITY DEFINER, fixed
--     search_path). Each one validates its input and returns only public
--     columns — never ip/visitor hashes, support references or report reasons.
--   * Admin functions check `is_admin()` (auth.uid() listed in `admins`).
--     The service key never ships to the browser; admins sign in with
--     Supabase Auth and their JWT carries auth.uid().
--   * Visitors are counted by a random id the browser keeps, hashed with a
--     secret salt per day. No IP address, cookie or name is stored for it.

create extension if not exists pgcrypto;

-- ── settings (server-only secrets and switches) ──────────────────────────
create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;

-- A random salt for hashing visitor/client ids; created once.
insert into public.site_settings (key, value)
values ('hash_salt', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- Guestbook entries are held for review until an admin approves them.
insert into public.site_settings (key, value)
values ('guestbook_moderation', 'on')
on conflict (key) do nothing;

create or replace function public.setting(p_key text) returns text
language sql stable security definer set search_path = public as $$
  select value from public.site_settings where key = p_key
$$;
revoke all on function public.setting(text) from public, anon, authenticated;

-- ── admins and audit ─────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key,
  note text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  target text,
  detail jsonb,
  at timestamptz not null default now()
);
alter table public.audit_log enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

create or replace function public.audit(p_action text, p_target text, p_detail jsonb default null)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log (actor, action, target, detail) values (auth.uid(), p_action, p_target, p_detail)
$$;
revoke all on function public.audit(text, text, jsonb) from public, anon, authenticated;

-- ── hashing and rate limits ──────────────────────────────────────────────
-- A browser's random id (or, when present, the forwarded address) hashed
-- with the secret salt. Used for de-duplication and limits only.
create or replace function public.client_hash(p_client text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  fwd text;
  src text;
begin
  begin
    fwd := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  exception when others then fwd := '';
  end;
  src := coalesce(nullif(trim(fwd), ''), coalesce(p_client, ''));
  return encode(digest(public.setting('hash_salt') || ':' || src, 'sha256'), 'hex');
end $$;
revoke all on function public.client_hash(text) from public, anon, authenticated;

create table if not exists public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket, window_start)
);
alter table public.rate_limits enable row level security;

-- True when `bucket` has been hit fewer than `p_max` times in the current
-- window of `p_window`; counts this hit either way.
create or replace function public.rate_ok(p_bucket text, p_max int, p_window interval) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window));
  n int;
begin
  insert into public.rate_limits (bucket, window_start, hits) values (p_bucket, w, 1)
  on conflict (bucket, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into n;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  return n <= p_max;
end $$;
revoke all on function public.rate_ok(text, int, interval) from public, anon, authenticated;

-- ── guestbook ────────────────────────────────────────────────────────────
create table if not exists public.guestbook_entries (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(nickname) between 1 and 20),
  message text not null check (char_length(message) between 1 and 200),
  sticker text not null check (sticker in ('heart', 'star', 'moon', 'ribbon', 'flower', 'paw')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  reply text check (reply is null or char_length(reply) between 1 and 300),
  reply_at timestamptz,
  author_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists guestbook_public_idx on public.guestbook_entries (status, id desc);
alter table public.guestbook_entries enable row level security;

create table if not exists public.guestbook_reports (
  id bigint generated always as identity primary key,
  entry_id bigint not null references public.guestbook_entries (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 200),
  reporter_hash text not null,
  created_at timestamptz not null default now(),
  unique (entry_id, reporter_hash)
);
alter table public.guestbook_reports enable row level security;

-- Control characters out, whitespace collapsed, ends trimmed.
create or replace function public.clean_text(p text) returns text
language sql immutable as $$
  select btrim(regexp_replace(regexp_replace(coalesce(p, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'), '\s+', ' ', 'g'))
$$;

-- Approved entries, newest first, `p_limit` at a time before `p_before`.
create or replace function public.guestbook_list(p_before bigint default null, p_limit int default 20)
returns table (id bigint, nickname text, message text, sticker text, reply text, reply_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select e.id, e.nickname, e.message, e.sticker, e.reply, e.reply_at, e.created_at
  from public.guestbook_entries e
  where e.status = 'approved' and (p_before is null or e.id < p_before)
  order by e.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

-- Leave a note. Returns the entry's public state: 'pending' while moderation
-- is on (the default), 'approved' when it is off.
create or replace function public.guestbook_submit(p_nickname text, p_message text, p_sticker text, p_client text)
returns table (id bigint, status text)
language plpgsql security definer set search_path = public as $$
declare
  nick text := public.clean_text(p_nickname);
  msg text := public.clean_text(p_message);
  h text := public.client_hash(p_client);
  st text := case when public.setting('guestbook_moderation') = 'off' then 'approved' else 'pending' end;
  new_id bigint;
begin
  if char_length(nick) < 1 or char_length(nick) > 20 then raise exception 'nickname must be 1-20 characters' using errcode = '22023'; end if;
  if char_length(msg) < 1 or char_length(msg) > 200 then raise exception 'message must be 1-200 characters' using errcode = '22023'; end if;
  if p_sticker not in ('heart', 'star', 'moon', 'ribbon', 'flower', 'paw') then raise exception 'unknown sticker' using errcode = '22023'; end if;
  if msg ~* '(https?://|www\.)' then raise exception 'links are not allowed' using errcode = '22023'; end if;
  if not public.rate_ok('gb:' || h, 3, interval '10 minutes') then raise exception 'too many notes, try later' using errcode = '53400'; end if;
  if not public.rate_ok('gb:all', 120, interval '1 hour') then raise exception 'guestbook is busy, try later' using errcode = '53400'; end if;
  -- The same note twice in a row from the same browser is a double click.
  if exists (select 1 from public.guestbook_entries g where g.author_hash = h and g.message = msg and g.created_at > now() - interval '1 day') then
    raise exception 'duplicate note' using errcode = '23505';
  end if;
  insert into public.guestbook_entries (nickname, message, sticker, status, author_hash)
  values (nick, msg, p_sticker, st, h) returning guestbook_entries.id into new_id;
  return query select new_id, st;
end $$;

-- Report an entry. Three distinct reports hide it until an admin looks.
create or replace function public.guestbook_report(p_id bigint, p_reason text, p_client text)
returns void language plpgsql security definer set search_path = public as $$
declare
  h text := public.client_hash(p_client);
  r text := public.clean_text(p_reason);
begin
  if char_length(r) < 1 then r := '(no reason)'; end if;
  if char_length(r) > 200 then r := left(r, 200); end if;
  if not exists (select 1 from public.guestbook_entries where guestbook_entries.id = p_id and status = 'approved') then
    raise exception 'no such entry' using errcode = 'P0002';
  end if;
  if not public.rate_ok('rep:' || h, 10, interval '1 hour') then raise exception 'too many reports' using errcode = '53400'; end if;
  insert into public.guestbook_reports (entry_id, reason, reporter_hash) values (p_id, r, h)
  on conflict (entry_id, reporter_hash) do nothing;
  if (select count(*) from public.guestbook_reports where entry_id = p_id) >= 3 then
    update public.guestbook_entries set status = 'hidden' where guestbook_entries.id = p_id;
  end if;
end $$;

-- ── visit counter ────────────────────────────────────────────────────────
-- One row per (day in Korea, hashed visitor). TODAY = rows for today;
-- TOTAL = all rows (a visitor counts once per day).
create table if not exists public.visits (
  day date not null,
  visitor_hash text not null,
  primary key (day, visitor_hash)
);
alter table public.visits enable row level security;

create or replace function public.visit_counts()
returns table (today bigint, total bigint)
language sql stable security definer set search_path = public as $$
  select (select count(*) from public.visits where day = (now() at time zone 'Asia/Seoul')::date),
         (select count(*) from public.visits)
$$;

create or replace function public.visit_hit(p_client text)
returns table (today bigint, total bigint)
language plpgsql security definer set search_path = public as $$
declare
  d date := (now() at time zone 'Asia/Seoul')::date;
begin
  if p_client is null or char_length(p_client) not between 8 and 64 then
    raise exception 'bad client id' using errcode = '22023';
  end if;
  if public.rate_ok('visit:all', 20000, interval '1 hour') then
    insert into public.visits (day, visitor_hash)
    values (d, encode(digest(public.setting('hash_salt') || ':' || d::text || ':' || p_client, 'sha256'), 'hex'))
    on conflict do nothing;
  end if;
  return query select * from public.visit_counts();
end $$;

-- ── starlight server ─────────────────────────────────────────────────────
-- Virtual commemorative stars inside EUNGARAGE's sky. Not real celestial
-- objects, not for sale until a support policy and provider are approved.
create table if not exists public.stars (
  id bigint generated always as identity primary key,
  code text not null unique,
  kind text not null default 'supporter' check (kind in ('supporter', 'event')),
  name text not null check (char_length(name) between 1 and 24),
  message text check (message is null or char_length(message) <= 120),
  color text not null default 'gold' check (color in ('gold', 'pink', 'mint', 'sky', 'lavender', 'white')),
  grade smallint not null default 1 check (grade between 1 and 3),
  x real not null check (x between 0 and 1),
  y real not null check (y between 0 and 1),
  is_public boolean not null default true,
  status text not null default 'approved' check (status in ('pending', 'approved', 'hidden')),
  support_ref text,                 -- verification reference; never returned to the site
  created_at timestamptz not null default now()
);
alter table public.stars enable row level security;

create table if not exists public.star_reports (
  id bigint generated always as identity primary key,
  star_id bigint not null references public.stars (id) on delete cascade,
  reason text not null,
  reporter_hash text not null,
  created_at timestamptz not null default now(),
  unique (star_id, reporter_hash)
);
alter table public.star_reports enable row level security;

create or replace function public.stars_list()
returns table (code text, kind text, name text, message text, color text, grade smallint, x real, y real, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.code, s.kind, s.name, s.message, s.color, s.grade, s.x, s.y, s.created_at
  from public.stars s
  where s.status = 'approved' and s.is_public
  order by s.id
$$;

-- Find by exact code or by name (case-insensitive prefix), at most 20.
-- LIKE wildcards are removed first and the query must still have something
-- in it, so '%' or '_' find nothing rather than everything.
create or replace function public.star_find(p_query text)
returns table (code text, kind text, name text, message text, color text, grade smallint, x real, y real, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  with q as (select translate(public.clean_text(p_query), '%_\', '') as t)
  select s.code, s.kind, s.name, s.message, s.color, s.grade, s.x, s.y, s.created_at
  from public.stars s, q
  where s.status = 'approved' and s.is_public
    and char_length(q.t) between 1 and 24
    and (upper(s.code) = upper(q.t) or s.name ilike q.t || '%')
  order by s.id
  limit 20
$$;

create or replace function public.star_report(p_code text, p_reason text, p_client text)
returns void language plpgsql security definer set search_path = public as $$
declare
  h text := public.client_hash(p_client);
  sid bigint;
begin
  select id into sid from public.stars where code = upper(p_code) and status = 'approved' and is_public;
  if sid is null then raise exception 'no such star' using errcode = 'P0002'; end if;
  if not public.rate_ok('srep:' || h, 10, interval '1 hour') then raise exception 'too many reports' using errcode = '53400'; end if;
  insert into public.star_reports (star_id, reason, reporter_hash)
  values (sid, left(coalesce(nullif(public.clean_text(p_reason), ''), '(no reason)'), 200), h)
  on conflict do nothing;
end $$;

-- A place in the sky that is not on top of another star: random points in
-- the upper sky band, keeping at least `gap` from every existing star; the
-- gap shrinks if the sky gets crowded. Fixed once issued.
create or replace function public.star_place(out px real, out py real)
language plpgsql security definer set search_path = public as $$
declare
  gap real := 0.035;
  tries int := 0;
begin
  loop
    px := 0.04 + random() * 0.92;
    py := 0.05 + random() * 0.55;
    exit when not exists (select 1 from public.stars s where (s.x - px) ^ 2 + (s.y - py) ^ 2 < gap ^ 2);
    tries := tries + 1;
    if tries % 200 = 0 then gap := gap * 0.8; end if;
  end loop;
end $$;
revoke all on function public.star_place() from public, anon, authenticated;

create or replace function public.star_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := 'STAR-';
    for i in 1..6 loop c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.stars where code = c);
  end loop;
  return c;
end $$;
revoke all on function public.star_code() from public, anon, authenticated;

-- ── admin ────────────────────────────────────────────────────────────────
create or replace function public.require_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
end $$;

create or replace function public.admin_guestbook(p_status text default 'pending', p_limit int default 50)
returns table (id bigint, nickname text, message text, sticker text, status text, reply text, reports bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query
    select e.id, e.nickname, e.message, e.sticker, e.status, e.reply,
           (select count(*) from public.guestbook_reports r where r.entry_id = e.id), e.created_at
    from public.guestbook_entries e
    where p_status is null or e.status = p_status
    order by e.id desc limit least(greatest(coalesce(p_limit, 50), 1), 200);
end $$;

create or replace function public.admin_guestbook_set(p_id bigint, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if p_status not in ('pending', 'approved', 'hidden') then raise exception 'bad status' using errcode = '22023'; end if;
  update public.guestbook_entries set status = p_status where id = p_id;
  if not found then raise exception 'no such entry' using errcode = 'P0002'; end if;
  perform public.audit('guestbook.status', p_id::text, jsonb_build_object('status', p_status));
end $$;

create or replace function public.admin_guestbook_reply(p_id bigint, p_reply text)
returns void language plpgsql security definer set search_path = public as $$
declare r text := nullif(public.clean_text(p_reply), '');
begin
  perform public.require_admin();
  if r is not null and char_length(r) > 300 then raise exception 'reply too long' using errcode = '22023'; end if;
  update public.guestbook_entries set reply = r, reply_at = case when r is null then null else now() end where id = p_id;
  if not found then raise exception 'no such entry' using errcode = 'P0002'; end if;
  perform public.audit('guestbook.reply', p_id::text, jsonb_build_object('cleared', r is null));
end $$;

create or replace function public.admin_guestbook_delete(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  delete from public.guestbook_entries where id = p_id;
  if not found then raise exception 'no such entry' using errcode = 'P0002'; end if;
  perform public.audit('guestbook.delete', p_id::text, null);
end $$;

create or replace function public.admin_setting(p_key text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if p_key not in ('guestbook_moderation') then raise exception 'not an editable setting' using errcode = '22023'; end if;
  if p_key = 'guestbook_moderation' and p_value not in ('on', 'off') then raise exception 'on or off' using errcode = '22023'; end if;
  update public.site_settings set value = p_value, updated_at = now() where key = p_key;
  perform public.audit('setting', p_key, jsonb_build_object('value', p_value));
end $$;

-- Issue a star by hand (the test path before any payment exists).
create or replace function public.admin_star_issue(p_name text, p_message text, p_color text default 'gold',
  p_grade int default 1, p_kind text default 'supporter', p_public boolean default true, p_support_ref text default null)
returns table (code text, x real, y real)
language plpgsql security definer set search_path = public as $$
declare
  c text;
  px real;
  py real;
  n text := public.clean_text(p_name);
  m text := nullif(public.clean_text(p_message), '');
begin
  perform public.require_admin();
  if char_length(n) not between 1 and 24 then raise exception 'name must be 1-24 characters' using errcode = '22023'; end if;
  if m is not null and char_length(m) > 120 then raise exception 'message too long' using errcode = '22023'; end if;
  if p_support_ref is not null and exists (select 1 from public.stars where support_ref = p_support_ref) then
    raise exception 'this support reference already has a star' using errcode = '23505';
  end if;
  c := public.star_code();
  select sp.px, sp.py into px, py from public.star_place() sp;
  insert into public.stars (code, kind, name, message, color, grade, x, y, is_public, support_ref)
  values (c, p_kind, n, m, p_color, p_grade, px, py, p_public, p_support_ref);
  perform public.audit('star.issue', c, jsonb_build_object('kind', p_kind, 'grade', p_grade));
  return query select c, px, py;
end $$;

create or replace function public.admin_star_update(p_code text, p_name text, p_message text, p_status text, p_public boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if p_status not in ('pending', 'approved', 'hidden') then raise exception 'bad status' using errcode = '22023'; end if;
  update public.stars set name = public.clean_text(p_name), message = nullif(public.clean_text(p_message), ''),
         status = p_status, is_public = p_public
  where code = upper(p_code);
  if not found then raise exception 'no such star' using errcode = 'P0002'; end if;
  perform public.audit('star.update', upper(p_code), jsonb_build_object('status', p_status, 'public', p_public));
end $$;

create or replace function public.admin_star_delete(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  delete from public.stars where code = upper(p_code);
  if not found then raise exception 'no such star' using errcode = 'P0002'; end if;
  perform public.audit('star.delete', upper(p_code), null);
end $$;

create or replace function public.admin_stars()
returns table (code text, kind text, name text, message text, color text, grade smallint, status text, is_public boolean, reports bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query select s.code, s.kind, s.name, s.message, s.color, s.grade, s.status, s.is_public,
    (select count(*) from public.star_reports r where r.star_id = s.id), s.created_at
  from public.stars s order by s.id desc;
end $$;

create or replace function public.admin_audit(p_limit int default 100)
returns table (actor uuid, action text, target text, detail jsonb, at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query select a.actor, a.action, a.target, a.detail, a.at from public.audit_log a
  order by a.id desc limit least(greatest(coalesce(p_limit, 100), 1), 500);
end $$;

-- ── grants: the site may call exactly these ──────────────────────────────
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.guestbook_list(bigint, int), public.guestbook_submit(text, text, text, text), public.guestbook_report(bigint, text, text),
  public.visit_counts(), public.visit_hit(text),
  public.stars_list(), public.star_find(text), public.star_report(text, text, text),
  public.clean_text(text)
to anon, authenticated;
grant execute on function
  public.is_admin(), public.admin_guestbook(text, int), public.admin_guestbook_set(bigint, text),
  public.admin_guestbook_reply(bigint, text), public.admin_guestbook_delete(bigint), public.admin_setting(text, text),
  public.admin_star_issue(text, text, text, int, text, boolean, text), public.admin_star_update(text, text, text, text, boolean),
  public.admin_star_delete(text), public.admin_stars(), public.admin_audit(int)
to authenticated;
