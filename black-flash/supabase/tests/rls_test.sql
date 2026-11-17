-- Run after stub_auth.sql and the migration. Every check raises on failure.
\set ON_ERROR_STOP on
insert into auth.users values ('11111111-1111-1111-1111-111111111111','me@example.com'), ('22222222-2222-2222-2222-222222222222','stranger@example.com');
insert into public.bf_allowlist values ('me@example.com');

-- 1. Allowed owner can write and read their own rows.
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","email":"Me@Example.com"}', false);
insert into public.bf_records (tbl, id, data, changed_at) values ('tasks', 't1', '{"title":"v2"}', '2026-11-17T10:00:00Z');
do $$ begin if (select count(*) from public.bf_records) <> 1 then raise exception 'owner cannot read own row'; end if; end $$;

-- 2. Last write wins: an older change does not overwrite a newer one; a newer one does.
insert into public.bf_records (tbl, id, data, changed_at) values ('tasks', 't1', '{"title":"stale"}', '2026-11-17T09:00:00Z')
  on conflict (user_id, tbl, id) do update set data = excluded.data, changed_at = excluded.changed_at;
do $$ begin if (select data->>'title' from public.bf_records where id = 't1') <> 'v2' then raise exception 'stale write overwrote newer data'; end if; end $$;
insert into public.bf_records (tbl, id, data, changed_at) values ('tasks', 't1', '{"title":"v3"}', '2026-11-17T11:00:00Z')
  on conflict (user_id, tbl, id) do update set data = excluded.data, changed_at = excluded.changed_at;
do $$ begin if (select data->>'title' from public.bf_records where id = 't1') <> 'v3' then raise exception 'newer write was rejected'; end if; end $$;

-- 3. Unknown table names are rejected.
do $$ begin
  begin insert into public.bf_records (tbl, id, data, changed_at) values ('evil', 'x', '{}', now()); raise exception 'bad tbl accepted';
  exception when check_violation then null; end;
end $$;

-- 4. A signed-in user who is NOT on the allowlist can neither read nor write.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","email":"stranger@example.com"}', false);
do $$ begin if (select count(*) from public.bf_records) <> 0 then raise exception 'stranger can read owner data'; end if; end $$;
do $$ begin
  begin insert into public.bf_records (tbl, id, data, changed_at) values ('tasks', 's1', '{}', now()); raise exception 'stranger could insert';
  exception when insufficient_privilege then null; end;
end $$;
update public.bf_records set data = '{"title":"hacked"}' where id = 't1';
delete from public.bf_records where id = 't1';

-- 5. Even an allowed account cannot write rows for another user id.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","email":"me@example.com"}', false);
do $$ begin
  begin insert into public.bf_records (user_id, tbl, id, data, changed_at) values ('22222222-2222-2222-2222-222222222222', 'tasks', 'x', '{}', now()); raise exception 'wrote another users row';
  exception when insufficient_privilege then null; end;
end $$;
do $$ begin if (select data->>'title' from public.bf_records where id = 't1') <> 'v3' then raise exception 'stranger modified owner data'; end if; end $$;

-- 6. Allowlist and push log are not readable by users.
do $$ begin
  begin perform * from public.bf_allowlist; if found then raise exception 'allowlist readable'; end if;
  exception when insufficient_privilege then null; end;
end $$;
do $$ begin
  begin perform * from public.bf_push_log; if found then raise exception 'push log readable'; end if;
  exception when insufficient_privilege then null; end;
end $$;

-- 7. Push subscriptions follow the same rules.
insert into public.bf_push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/1', 'k', 'a');
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","email":"stranger@example.com"}', false);
do $$ begin if (select count(*) from public.bf_push_subscriptions) <> 0 then raise exception 'stranger sees subscriptions'; end if; end $$;
reset role;
select 'ALL RLS CHECKS PASSED';
