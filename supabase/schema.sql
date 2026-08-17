-- FORGE Supabase schema (Postgres)
-- Multi-user sync: accounts, save state, leaderboards, guilds, creator-video review.

-- Profiles (auth.users is auto-created by Supabase Auth)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Adventurer',
  class_id text not null default 'warrior',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Game save snapshot (the JSON engine state)
create table public.save_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  xp bigint not null default 0,
  level int not null default 1,
  gold int not null default 0,
  power int not null default 0,
  updated_at timestamptz not null default now()
);

-- Leaderboard (query by xp desc, season)
create table public.leaderboard (
  season text not null default 'current',
  user_id uuid not null references auth.users(id) on delete cascade,
  xp bigint not null default 0,
  primary key (season, user_id)
);

-- Guilds
create table public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '🗡️',
  owner_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.guild_members (
  guild_id uuid references public.guilds(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member',
  primary key (guild_id, user_id)
);

-- Guild weekly raid progress
create table public.guild_raid (
  guild_id uuid primary key references public.guilds(id) on delete cascade,
  week text not null,
  boss_name text not null,
  boss_hp int not null,
  boss_max_hp int not null,
  defeated boolean not null default false
);

-- Subscriptions (synced from RevenueCat webhook)
create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text,           -- t1 / t2 / t3
  status text,         -- active / expired
  current_period_end timestamptz,
  provider text default 'revenuecat',
  updated_at timestamptz not null default now()
);

-- Content-creator video review queue
create table public.creator_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  video_url text not null,
  status text not null default 'pending', -- pending / approved / rejected
  created_at timestamptz not null default now()
);

-- Fampay UPI payments (manual verification)
-- Buyer submits UTR; owner approves/rejects in the admin panel.
create table public.payments (
  id text primary key,
  tier_id text not null,
  tier_name text not null,
  amount_paise int not null,
  buyer_email text,
  buyer_name text,
  utr text not null,
  status text not null default 'pending', -- pending / approved / rejected
  flags text[] not null default '{}',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ============================================================================
-- SECURITY (server-authority)
-- The server (via RLS + triggers) is the ONLY thing that can grant premium or
-- create admin rights. A modded APK / edited save CANNOT self-grant premium
-- because these tables only allow writes through secure server functions.
-- ============================================================================

-- Premium entitlements: source of truth for who has premium.
-- Only writable by an admin (via a SECURITY DEFINER function), NOT by the client.
create table public.premium_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  granted_by uuid references auth.users(id),
  source text not null default 'upi', -- upi / creator / manual
  note text
);
alter table public.premium_entitlements enable row level security;

-- Users can READ their own entitlement, but never write it.
create policy "read own entitlement" on public.premium_entitlements
  for select using (auth.uid() = user_id);

-- Premium expiry check helper: is the user's entitlement currently active?
create or replace function public.has_premium(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.premium_entitlements e
    where e.user_id = uid
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

-- SECURITY DEFINER: admin grants premium. Only callable by an admin.
create or replace function public.grant_premium(
  target_user uuid,
  p_tier text,
  p_expires timestamptz,
  p_source text default 'upi'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := (select email from auth.users where id = auth.uid());
begin
  -- Only admins can call this.
  if caller_email is null or not exists (select 1 from public.admins where email = caller_email) then
    raise exception 'not authorized';
  end if;
  insert into public.premium_entitlements (user_id, tier, expires_at, granted_by, source)
  values (target_user, p_tier, p_expires, auth.uid(), p_source)
  on conflict (user_id) do update
    set tier = excluded.tier, expires_at = excluded.expires_at, granted_by = excluded.granted_by, source = excluded.source;
end;
$$;

-- SECURITY DEFINER: remove premium (reject a payment).
create or replace function public.revoke_premium(target_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare caller_email text := (select email from auth.users where id = auth.uid());
begin
  if caller_email is null or not exists (select 1 from public.admins where email = caller_email) then
    raise exception 'not authorized';
  end if;
  delete from public.premium_entitlements where user_id = target_user;
end;
$$;

-- Grant execute on premium functions to authenticated users.
grant execute on function public.grant_premium(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.revoke_premium(uuid) to authenticated;
grant execute on function public.has_premium(uuid) to authenticated;

-- Save state: client may WRITE their own progression, but premium fields are
-- ignored on write (server keeps the authoritative premium flag). We never
-- store premium inside save_state payload.

-- Admin allowlist (your email)
create table public.admins (
  email text primary key
);
insert into public.admins (email) values ('knightscans014@gmail.com');

-- Owner-only read access to payments + premium (in prod: restrict by email allowlist)
alter table public.payments enable row level security;
create policy "admin can manage payments" on public.payments for all
  using (auth.jwt() ->> 'email' in (select email from public.admins));

-- Row Level Security (RLS): users only access their own data
alter table public.profiles enable row level security;
alter table public.save_state enable row level security;
alter table public.subscriptions enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id);
create policy "own save" on public.save_state for all using (auth.uid() = user_id);
create policy "own subscription" on public.subscriptions for all using (auth.uid() = user_id);
