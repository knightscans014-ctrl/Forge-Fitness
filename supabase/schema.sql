-- ============================================================================
-- FORGE — Supabase schema (Postgres)
-- ============================================================================
-- SECURITY MODEL
--
-- Every table below has Row Level Security ENABLED. In Postgres, a table
-- without RLS is fully readable AND writable by any role holding the grant --
-- which for this app is every signed-in user, because the anon key ships
-- inside the APK. RLS is therefore not optional on any table.
--
-- Rules of thumb used throughout:
--   * Clients may write their OWN gameplay rows only.
--   * Clients may NEVER write premium, admin, or payment-status rows.
--   * Privileged mutations go through SECURITY DEFINER functions that
--     re-check authorisation server-side.
--   * `admins` has RLS on with NO policies -> zero client access. SECURITY
--     DEFINER functions bypass RLS, so server-side checks still read it.
--
-- Apply to a fresh project:  psql < schema.sql
-- Apply to a live project:   use supabase/migrations/0001_security_hardening.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Core gameplay tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Adventurer',
  class_id text not null default 'warrior',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Game save snapshot (the JSON engine state).
-- NOTE: premium is deliberately NOT stored here. It lives in
-- premium_entitlements, which the client cannot write.
create table if not exists public.save_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  xp bigint not null default 0,
  level int not null default 1,
  gold int not null default 0,
  power int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.leaderboard (
  season text not null default 'current',
  user_id uuid not null references auth.users(id) on delete cascade,
  xp bigint not null default 0,
  primary key (season, user_id)
);

create table if not exists public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '🗡️',
  owner_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.guild_members (
  guild_id uuid references public.guilds(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member',
  primary key (guild_id, user_id)
);

create table if not exists public.guild_raid (
  guild_id uuid primary key references public.guilds(id) on delete cascade,
  week text not null,
  boss_name text not null,
  boss_hp int not null,
  boss_max_hp int not null,
  defeated boolean not null default false
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text,
  status text,
  current_period_end timestamptz,
  provider text default 'revenuecat',
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  video_url text not null,
  status text not null default 'pending',   -- pending / approved / rejected
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Payments (Fampay UPI, manual UTR verification)
-- ---------------------------------------------------------------------------
-- user_id is REQUIRED: without it there is no way to map an approved payment
-- back to an account, and grant_premium has no target.
create table if not exists public.payments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tier_id text not null,
  tier_name text not null,
  amount_paise int not null,
  buyer_email text,
  buyer_name text,
  utr text not null,
  status text not null default 'pending',   -- pending / approved / rejected
  flags text[] not null default '{}',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists payments_user_idx on public.payments (user_id);
create index if not exists payments_status_idx on public.payments (status, created_at desc);

-- One pending claim per UTR: stops the same reference being submitted twice.
create unique index if not exists payments_utr_unique on public.payments (utr);

-- ---------------------------------------------------------------------------
-- Premium entitlements — the single source of truth for "who has premium"
-- ---------------------------------------------------------------------------
create table if not exists public.premium_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  granted_by uuid references auth.users(id),
  source text not null default 'upi',       -- upi / creator / manual
  note text
);

-- ---------------------------------------------------------------------------
-- Admin allowlist — NO client access whatsoever
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key
);

insert into public.admins (email)
values ('knightscans014@gmail.com')
on conflict (email) do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles             enable row level security;
alter table public.save_state           enable row level security;
alter table public.leaderboard          enable row level security;
alter table public.guilds               enable row level security;
alter table public.guild_members        enable row level security;
alter table public.guild_raid           enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.creator_reviews      enable row level security;
alter table public.payments             enable row level security;
alter table public.premium_entitlements enable row level security;
alter table public.admins               enable row level security;

-- admins: RLS enabled, ZERO policies. No client can read or write it, ever.
-- SECURITY DEFINER functions below still see it (they bypass RLS).

-- --- helper: is the caller an admin? -----------------------------------------
-- SECURITY DEFINER so it can read public.admins under RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- --- profiles ---------------------------------------------------------------
drop policy if exists "own profile" on public.profiles;
create policy "profiles: read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- --- save_state -------------------------------------------------------------
drop policy if exists "own save" on public.save_state;
create policy "save: read own"   on public.save_state for select using (auth.uid() = user_id);
create policy "save: insert own" on public.save_state for insert with check (auth.uid() = user_id);
create policy "save: update own" on public.save_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- leaderboard ------------------------------------------------------------
-- Readable by everyone (it's a leaderboard); writable only for your own row.
create policy "leaderboard: read all"  on public.leaderboard for select using (auth.role() = 'authenticated');
create policy "leaderboard: write own" on public.leaderboard for insert with check (auth.uid() = user_id);
create policy "leaderboard: update own" on public.leaderboard for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- guilds -----------------------------------------------------------------
create policy "guilds: read all"     on public.guilds for select using (auth.role() = 'authenticated');
create policy "guilds: create own"   on public.guilds for insert with check (auth.uid() = owner_id);
create policy "guilds: owner update" on public.guilds for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "guilds: owner delete" on public.guilds for delete using (auth.uid() = owner_id);

-- --- guild_members ----------------------------------------------------------
create policy "members: read all"   on public.guild_members for select using (auth.role() = 'authenticated');
create policy "members: join self"  on public.guild_members for insert with check (auth.uid() = user_id);
create policy "members: leave self" on public.guild_members for delete using (
  auth.uid() = user_id
  or exists (select 1 from public.guilds g where g.id = guild_id and g.owner_id = auth.uid())
);

-- --- guild_raid -------------------------------------------------------------
-- Readable by members; damage is applied through a SECURITY DEFINER function
-- so a client cannot simply zero out the boss HP.
create policy "raid: read members" on public.guild_raid for select using (
  exists (select 1 from public.guild_members m where m.guild_id = guild_raid.guild_id and m.user_id = auth.uid())
);

-- --- subscriptions ----------------------------------------------------------
drop policy if exists "own subscription" on public.subscriptions;
create policy "subs: read own" on public.subscriptions for select using (auth.uid() = user_id);

-- --- creator_reviews --------------------------------------------------------
create policy "creator: read own"   on public.creator_reviews for select using (auth.uid() = user_id);
create policy "creator: insert own" on public.creator_reviews for insert with check (auth.uid() = user_id);
create policy "creator: admin all"  on public.creator_reviews for all using (public.is_admin()) with check (public.is_admin());

-- --- payments ---------------------------------------------------------------
-- A buyer may create their OWN pending payment and read their own rows.
-- They may never update status (that's admin-only, via approve/reject fns).
create policy "payments: read own" on public.payments for select using (auth.uid() = user_id);
create policy "payments: insert own pending" on public.payments for insert with check (
  auth.uid() = user_id
  and status = 'pending'
  and reviewed_at is null
);
create policy "payments: admin read"  on public.payments for select using (public.is_admin());
create policy "payments: admin write" on public.payments for update using (public.is_admin()) with check (public.is_admin());

-- --- premium_entitlements ---------------------------------------------------
-- Read your own. Never write -- only grant_premium/revoke_premium can.
create policy "entitlements: read own"  on public.premium_entitlements for select using (auth.uid() = user_id);
create policy "entitlements: admin read" on public.premium_entitlements for select using (public.is_admin());

-- ============================================================================
-- SECURITY DEFINER FUNCTIONS (privileged mutations)
-- ============================================================================

-- Is a given user's premium currently active?
create or replace function public.has_premium(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.premium_entitlements e
    where e.user_id = uid
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- The caller's own premium status (tier + active flag). Safe for clients.
create or replace function public.my_premium()
returns table (is_premium boolean, tier text, expires_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (e.expires_at is null or e.expires_at > now()) as is_premium,
    e.tier,
    e.expires_at
  from public.premium_entitlements e
  where e.user_id = auth.uid();
$$;

-- Admin: grant premium to a user.
create or replace function public.grant_premium(
  target_user uuid,
  p_tier text,
  p_expires timestamptz default null,
  p_source text default 'upi'
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if target_user is null then
    raise exception 'target_user is required';
  end if;
  if p_tier not in ('t1','t2','t3') then
    raise exception 'invalid tier: %', p_tier;
  end if;

  insert into public.premium_entitlements (user_id, tier, expires_at, granted_by, source)
  values (target_user, p_tier, p_expires, auth.uid(), p_source)
  on conflict (user_id) do update
    set tier       = excluded.tier,
        expires_at = excluded.expires_at,
        granted_by = excluded.granted_by,
        source     = excluded.source,
        granted_at = now();
end;
$$;

create or replace function public.revoke_premium(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  delete from public.premium_entitlements where user_id = target_user;
end;
$$;

-- Admin: approve a payment AND grant the matching entitlement atomically.
-- Doing both in one transaction removes the "approved but not granted" gap.
create or replace function public.approve_payment(p_payment_id text, p_months int default 1)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rec public.payments%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into rec from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment not found: %', p_payment_id;
  end if;
  if rec.status <> 'pending' then
    raise exception 'payment already %', rec.status;
  end if;

  update public.payments
     set status = 'approved', reviewed_at = now()
   where id = p_payment_id;

  insert into public.premium_entitlements (user_id, tier, expires_at, granted_by, source)
  values (
    rec.user_id,
    rec.tier_id,
    case when p_months is null or p_months <= 0
         then null
         else now() + (p_months || ' months')::interval end,
    auth.uid(),
    'upi'
  )
  on conflict (user_id) do update
    set tier       = excluded.tier,
        expires_at = excluded.expires_at,
        granted_by = excluded.granted_by,
        source     = excluded.source,
        granted_at = now();
end;
$$;

create or replace function public.reject_payment(p_payment_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  update public.payments
     set status = 'rejected', reviewed_at = now()
   where id = p_payment_id and status = 'pending';
end;
$$;

-- Admin: list pending payments (bypasses per-user RLS via definer rights).
create or replace function public.admin_list_payments(p_status text default null)
returns setof public.payments
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select * from public.payments
     where p_status is null or status = p_status
     order by created_at desc
     limit 500;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leaderboard integrity: a client may only claim the XP that is actually in
-- their own save_state row. Without this, RLS still permits a user to write
-- an arbitrary score to their OWN leaderboard row (policy checks WHO, not WHAT).
-- ---------------------------------------------------------------------------
create or replace function public.enforce_leaderboard_xp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  real_xp bigint;
begin
  select s.xp into real_xp from public.save_state s where s.user_id = new.user_id;
  if real_xp is null then
    raise exception 'no save_state for user; cannot rank';
  end if;
  -- Clamp rather than trust the submitted value.
  new.xp := real_xp;
  return new;
end;
$$;

drop trigger if exists leaderboard_xp_guard on public.leaderboard;
create trigger leaderboard_xp_guard
  before insert or update on public.leaderboard
  for each row execute function public.enforce_leaderboard_xp();

-- Guild raid damage — server-applied so clients can't set boss_hp directly.
create or replace function public.apply_raid_damage(p_guild uuid, p_damage int)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_hp int;
begin
  if not exists (
    select 1 from public.guild_members m
    where m.guild_id = p_guild and m.user_id = auth.uid()
  ) then
    raise exception 'not a member of this guild';
  end if;

  -- Clamp damage to a sane per-call ceiling to blunt scripted abuse.
  p_damage := greatest(0, least(coalesce(p_damage, 0), 5000));

  update public.guild_raid
     set boss_hp  = greatest(0, boss_hp - p_damage),
         defeated = (greatest(0, boss_hp - p_damage) = 0)
   where guild_id = p_guild
  returning boss_hp into new_hp;

  return coalesce(new_hp, -1);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: authenticated users may CALL these; the functions self-authorise.
-- ---------------------------------------------------------------------------
revoke all on function public.grant_premium(uuid, text, timestamptz, text) from public;
revoke all on function public.revoke_premium(uuid) from public;
revoke all on function public.approve_payment(text, int) from public;
revoke all on function public.reject_payment(text) from public;
revoke all on function public.admin_list_payments(text) from public;
revoke all on function public.apply_raid_damage(uuid, int) from public;
revoke all on function public.has_premium(uuid) from public;
revoke all on function public.my_premium() from public;

grant execute on function public.grant_premium(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.revoke_premium(uuid)        to authenticated;
grant execute on function public.approve_payment(text, int)  to authenticated;
grant execute on function public.reject_payment(text)        to authenticated;
grant execute on function public.admin_list_payments(text)   to authenticated;
grant execute on function public.apply_raid_damage(uuid,int) to authenticated;
grant execute on function public.has_premium(uuid)           to authenticated;
grant execute on function public.my_premium()                to authenticated;

-- ---------------------------------------------------------------------------
-- Belt and braces: no direct table grants to anon.
-- ---------------------------------------------------------------------------
revoke all on public.admins from anon, authenticated;
revoke all on public.premium_entitlements from anon;
revoke all on public.payments from anon;
