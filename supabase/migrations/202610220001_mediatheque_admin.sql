-- Administration records are accessible only to the server's secret key.
create table if not exists public.mediatheque_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9][a-z0-9._@-]{2,59}$'),
  auth_email text unique not null,
  display_name text not null,
  role text not null check (role in ('owner','admin')),
  enabled boolean not null default true,
  requires_password_change boolean not null default true,
  version integer not null default 1
);
create table if not exists public.mediatheque_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  account_id uuid not null references public.mediatheque_admins(user_id) on delete cascade,
  account_version integer not null,
  created_at timestamptz not null default clock_timestamp(),
  touched_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  check (expires_at > created_at and expires_at <= created_at + interval '8 hours')
);
create index if not exists mediatheque_session_account on public.mediatheque_sessions(account_id);
create table if not exists public.mediatheque_limits (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  attempts integer not null,
  expires_at timestamptz not null
);
create table if not exists public.mediatheque_uploads (
  id uuid primary key,
  account_id uuid not null references public.mediatheque_admins(user_id) on delete cascade,
  object_path text unique not null,
  original_name text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 26214400),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default clock_timestamp()
);

alter table public.mediatheque_admins enable row level security;
alter table public.mediatheque_sessions enable row level security;
alter table public.mediatheque_limits enable row level security;
alter table public.mediatheque_uploads enable row level security;
revoke all on public.mediatheque_admins,public.mediatheque_sessions,public.mediatheque_limits,public.mediatheque_uploads from public,anon,authenticated;
grant all on public.mediatheque_admins,public.mediatheque_sessions,public.mediatheque_limits,public.mediatheque_uploads to service_role;

create or replace function public.mediatheque_allow(p_key text,p_limit integer)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare counter integer;
begin
  if p_key !~ '^[a-f0-9]{64}$' or p_limit < 1 or p_limit > 1000 then return false; end if;
  delete from public.mediatheque_limits where expires_at < clock_timestamp() - interval '1 day';
  insert into public.mediatheque_limits as limits(key_hash,attempts,expires_at)
  values(p_key,1,clock_timestamp()+interval '15 minutes')
  on conflict(key_hash) do update set
    attempts=case when limits.expires_at <= clock_timestamp() then 1 else limits.attempts+1 end,
    expires_at=case when limits.expires_at <= clock_timestamp() then clock_timestamp()+interval '15 minutes' else limits.expires_at end
  returning attempts into counter;
  return counter <= p_limit;
end $$;

create or replace function public.mediatheque_session(p_hash text)
returns setof public.mediatheque_admins language sql security definer set search_path=public,pg_temp as $$
  update public.mediatheque_sessions as sessions set touched_at=clock_timestamp()
  from public.mediatheque_admins as account
  where sessions.token_hash=p_hash and sessions.account_id=account.user_id
    and sessions.account_version=account.version and account.enabled
    and sessions.expires_at > clock_timestamp()
    and sessions.touched_at > clock_timestamp()-interval '30 minutes'
  returning account.*;
$$;

create or replace function public.mediatheque_revoke_account(p_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update public.mediatheque_admins set version=version+1 where user_id=p_id;
  delete from public.mediatheque_sessions where account_id=p_id;
end $$;
revoke all on function public.mediatheque_allow(text,integer),public.mediatheque_session(text),public.mediatheque_revoke_account(uuid) from public,anon,authenticated;
grant execute on function public.mediatheque_allow(text,integer),public.mediatheque_session(text),public.mediatheque_revoke_account(uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit)
values('mediatheque-staging','mediatheque-staging',false,26214400)
on conflict(id) do update set public=false,file_size_limit=26214400;
-- The restrictive policy prevents an unrelated permissive project policy
-- from making these temporary files accessible to browser clients.
drop policy if exists mediatheque_private_staging on storage.objects;
create policy mediatheque_private_staging on storage.objects as restrictive
for all to anon,authenticated
using(bucket_id <> 'mediatheque-staging')
with check(bucket_id <> 'mediatheque-staging');
