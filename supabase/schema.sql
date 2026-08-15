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

-- Row Level Security (RLS): users only access their own data
alter table public.profiles enable row level security;
alter table public.save_state enable row level security;
alter table public.subscriptions enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id);
create policy "own save" on public.save_state for all using (auth.uid() = user_id);
create policy "own subscription" on public.subscriptions for all using (auth.uid() = user_id);
