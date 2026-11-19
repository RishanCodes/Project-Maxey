-- BLACK FLASH cloud schema (Supabase / Postgres).
-- One private account: every table is protected by row-level security that requires
--   (a) the row to belong to the signed-in user, and
--   (b) the signed-in email to be on bf_allowlist.
-- Add your email once in the SQL editor:  insert into public.bf_allowlist(email) values ('you@example.com');

create table if not exists public.bf_allowlist (
  email text primary key check (email = lower(email))
);
alter table public.bf_allowlist enable row level security; -- no policies: only the SQL editor / service role can read or change it

create or replace function public.bf_is_allowed() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bf_allowlist
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.bf_is_allowed() from public;
grant execute on function public.bf_is_allowed() to authenticated;

-- Every synced record, one row per (user, table, id). `data` is the record as stored on the device.
create table if not exists public.bf_records (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tbl text not null check (tbl in ('prefs','answers','tasks','taskCompletions','habits','habitCompletions','routines','routineCompletions','goals','milestones','training','checkins','meals','focus','journal','xp','achievements','coach','programs','programLogs','benchmarks')),
  id text not null check (char_length(id) between 1 and 200),
  data jsonb check (data is null or octet_length(data::text) < 262144),
  deleted boolean not null default false,
  changed_at timestamptz not null,           -- when the device changed it (last-write-wins clock)
  server_updated_at timestamptz not null default clock_timestamp(), -- pull cursor
  primary key (user_id, tbl, id)
);
create index if not exists bf_records_pull on public.bf_records (user_id, server_updated_at);
-- Keep the allowed table list current when this file is re-run on an existing project
-- (the 90-day program tables were added later).
alter table public.bf_records drop constraint if exists bf_records_tbl_check;
alter table public.bf_records add constraint bf_records_tbl_check check (tbl in ('prefs','answers','tasks','taskCompletions','habits','habitCompletions','routines','routineCompletions','goals','milestones','training','checkins','meals','focus','journal','xp','achievements','coach','programs','programLogs','benchmarks'));

-- Last write wins, enforced by the database: an older change never overwrites a newer one.
create or replace function public.bf_records_lww() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.changed_at < old.changed_at then
    return null; -- keep the newer row
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;
drop trigger if exists bf_records_lww on public.bf_records;
create trigger bf_records_lww before insert or update on public.bf_records
for each row execute function public.bf_records_lww();

alter table public.bf_records enable row level security;
drop policy if exists bf_records_select on public.bf_records;
drop policy if exists bf_records_insert on public.bf_records;
drop policy if exists bf_records_update on public.bf_records;
drop policy if exists bf_records_delete on public.bf_records;
create policy bf_records_select on public.bf_records for select to authenticated using (user_id = auth.uid() and public.bf_is_allowed());
create policy bf_records_insert on public.bf_records for insert to authenticated with check (user_id = auth.uid() and public.bf_is_allowed());
create policy bf_records_update on public.bf_records for update to authenticated using (user_id = auth.uid() and public.bf_is_allowed()) with check (user_id = auth.uid() and public.bf_is_allowed());
create policy bf_records_delete on public.bf_records for delete to authenticated using (user_id = auth.uid() and public.bf_is_allowed());
grant select, insert, update, delete on public.bf_records to authenticated;

-- Web Push subscriptions (one per device).
create table if not exists public.bf_push_subscriptions (
  endpoint text primary key check (char_length(endpoint) < 1000),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.bf_push_subscriptions enable row level security;
drop policy if exists bf_push_own on public.bf_push_subscriptions;
create policy bf_push_own on public.bf_push_subscriptions for all to authenticated
  using (user_id = auth.uid() and public.bf_is_allowed()) with check (user_id = auth.uid() and public.bf_is_allowed());
grant select, insert, update, delete on public.bf_push_subscriptions to authenticated;

-- Which reminders were already sent (written only by the server's reminder job with the service role).
create table if not exists public.bf_push_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.bf_push_log enable row level security; -- no policies: service role only
