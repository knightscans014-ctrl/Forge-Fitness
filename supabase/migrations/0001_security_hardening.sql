-- ============================================================================
-- MIGRATION 0001 — Security hardening
-- ============================================================================
-- Run this against your EXISTING Supabase project (SQL Editor -> paste -> Run).
-- Idempotent: safe to run more than once.
--
-- WHAT THIS FIXES
--   P0-1  public.admins had no RLS -> any signed-in user could INSERT their own
--         email and become an admin, then call grant_premium on themselves.
--   P0-2  leaderboard / guilds / guild_members / guild_raid / creator_reviews
--         had no RLS -> world-writable to every app user.
--   P0-3  payments had no user_id -> approved payments could not be mapped back
--         to an account, so premium could never actually be granted.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. THE CRITICAL ONE: lock down the admin allowlist.
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;

-- Remove any policy that might grant client access. We want ZERO policies here:
-- RLS on + no policies = no client reads or writes at all. SECURITY DEFINER
-- functions still read the table because they bypass RLS.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='admins'
  loop
    execute format('drop policy %I on public.admins', p.policyname);
  end loop;
end $$;

revoke all on public.admins from anon, authenticated;

-- Make sure your owner account is actually in there.
insert into public.admins (email)
values ('knightscans014@gmail.com')
on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Admin check helper (SECURITY DEFINER so it can read the locked table).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3. Enable RLS on every remaining unprotected table.
-- ---------------------------------------------------------------------------
alter table public.leaderboard     enable row level security;
alter table public.guilds          enable row level security;
alter table public.guild_members   enable row level security;
alter table public.guild_raid      enable row level security;
alter table public.creator_reviews enable row level security;

-- Already enabled previously, but assert it:
alter table public.profiles             enable row level security;
alter table public.save_state           enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.payments             enable row level security;
alter table public.premium_entitlements enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Replace broad "for all" policies with explicit scoped ones.
-- ---------------------------------------------------------------------------
drop policy if exists "own profile"              on public.profiles;
drop policy if exists "own save"                 on public.save_state;
drop policy if exists "own subscription"         on public.subscriptions;
drop policy if exists "admin can manage payments" on public.payments;
drop policy if exists "read own entitlement"     on public.premium_entitlements;

-- profiles
drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- save_state
drop policy if exists "save: read own"   on public.save_state;
drop policy if exists "save: insert own" on public.save_state;
drop policy if exists "save: update own" on public.save_state;
create policy "save: read own"   on public.save_state for select using (auth.uid() = user_id);
create policy "save: insert own" on public.save_state for insert with check (auth.uid() = user_id);
create policy "save: update own" on public.save_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- leaderboard
drop policy if exists "leaderboard: read all"   on public.leaderboard;
drop policy if exists "leaderboard: write own"  on public.leaderboard;
drop policy if exists "leaderboard: update own" on public.leaderboard;
create policy "leaderboard: read all"   on public.leaderboard for select using (auth.role() = 'authenticated');
create policy "leaderboard: write own"  on public.leaderboard for insert with check (auth.uid() = user_id);
create policy "leaderboard: update own" on public.leaderboard for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- guilds
drop policy if exists "guilds: read all"     on public.guilds;
drop policy if exists "guilds: create own"   on public.guilds;
drop policy if exists "guilds: owner update" on public.guilds;
drop policy if exists "guilds: owner delete" on public.guilds;
create policy "guilds: read all"     on public.guilds for select using (auth.role() = 'authenticated');
create policy "guilds: create own"   on public.guilds for insert with check (auth.uid() = owner_id);
create policy "guilds: owner update" on public.guilds for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "guilds: owner delete" on public.guilds for delete using (auth.uid() = owner_id);

-- guild_members
drop policy if exists "members: read all"   on public.guild_members;
drop policy if exists "members: join self"  on public.guild_members;
drop policy if exists "members: leave self" on public.guild_members;
create policy "members: read all"   on public.guild_members for select using (auth.role() = 'authenticated');
create policy "members: join self"  on public.guild_members for insert with check (auth.uid() = user_id);
create policy "members: leave self" on public.guild_members for delete using (
  auth.uid() = user_id
  or exists (select 1 from public.guilds g where g.id = guild_id and g.owner_id = auth.uid())
);

-- guild_raid (read-only to members; writes go through apply_raid_damage)
drop policy if exists "raid: read members" on public.guild_raid;
create policy "raid: read members" on public.guild_raid for select using (
  exists (select 1 from public.guild_members m where m.guild_id = guild_raid.guild_id and m.user_id = auth.uid())
);

-- subscriptions
drop policy if exists "subs: read own" on public.subscriptions;
create policy "subs: read own" on public.subscriptions for select using (auth.uid() = user_id);

-- creator_reviews
drop policy if exists "creator: read own"   on public.creator_reviews;
drop policy if exists "creator: insert own" on public.creator_reviews;
drop policy if exists "creator: admin all"  on public.creator_reviews;
create policy "creator: read own"   on public.creator_reviews for select using (auth.uid() = user_id);
create policy "creator: insert own" on public.creator_reviews for insert with check (auth.uid() = user_id);
create policy "creator: admin all"  on public.creator_reviews for all using (public.is_admin()) with check (public.is_admin());

-- premium_entitlements
drop policy if exists "entitlements: read own"   on public.premium_entitlements;
drop policy if exists "entitlements: admin read" on public.premium_entitlements;
create policy "entitlements: read own"   on public.premium_entitlements for select using (auth.uid() = user_id);
create policy "entitlements: admin read" on public.premium_entitlements for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. payments: add the missing user_id column + correct policies.
-- ---------------------------------------------------------------------------
alter table public.payments
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Backfill from buyer_email where we can, so existing rows aren't orphaned.
update public.payments p
   set user_id = u.id
  from auth.users u
 where p.user_id is null
   and p.buyer_email is not null
   and lower(u.email) = lower(p.buyer_email);

-- Only enforce NOT NULL once nothing is left unmapped (avoids failing on
-- historical rows that can't be resolved).
do $$
begin
  if not exists (select 1 from public.payments where user_id is null) then
    alter table public.payments alter column user_id set not null;
  else
    raise notice 'payments.user_id left nullable: % row(s) could not be mapped to a user',
      (select count(*) from public.payments where user_id is null);
  end if;
end $$;

create index if not exists payments_user_idx   on public.payments (user_id);
create index if not exists payments_status_idx on public.payments (status, created_at desc);

-- Prevent duplicate UTR submissions (only if existing data allows it).
do $$
begin
  if not exists (select utr from public.payments group by utr having count(*) > 1) then
    create unique index if not exists payments_utr_unique on public.payments (utr);
  else
    raise notice 'payments_utr_unique skipped: duplicate UTRs already present';
  end if;
end $$;

drop policy if exists "payments: read own"           on public.payments;
drop policy if exists "payments: insert own pending" on public.payments;
drop policy if exists "payments: admin read"         on public.payments;
drop policy if exists "payments: admin write"        on public.payments;
create policy "payments: read own" on public.payments for select using (auth.uid() = user_id);
create policy "payments: insert own pending" on public.payments for insert with check (
  auth.uid() = user_id and status = 'pending' and reviewed_at is null
);
create policy "payments: admin read"  on public.payments for select using (public.is_admin());
create policy "payments: admin write" on public.payments for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Harden / add the privileged functions.
-- ---------------------------------------------------------------------------
create or replace function public.has_premium(uid uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.premium_entitlements e
    where e.user_id = uid and (e.expires_at is null or e.expires_at > now())
  );
$$;

create or replace function public.my_premium()
returns table (is_premium boolean, tier text, expires_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select (e.expires_at is null or e.expires_at > now()), e.tier, e.expires_at
  from public.premium_entitlements e where e.user_id = auth.uid();
$$;

create or replace function public.grant_premium(
  target_user uuid, p_tier text, p_expires timestamptz default null, p_source text default 'upi'
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if target_user is null then raise exception 'target_user is required'; end if;
  if p_tier not in ('t1','t2','t3') then raise exception 'invalid tier: %', p_tier; end if;
  insert into public.premium_entitlements (user_id, tier, expires_at, granted_by, source)
  values (target_user, p_tier, p_expires, auth.uid(), p_source)
  on conflict (user_id) do update
    set tier = excluded.tier, expires_at = excluded.expires_at,
        granted_by = excluded.granted_by, source = excluded.source, granted_at = now();
end; $$;

create or replace function public.revoke_premium(target_user uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from public.premium_entitlements where user_id = target_user;
end; $$;

create or replace function public.approve_payment(p_payment_id text, p_months int default 1)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare rec public.payments%rowtype;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select * into rec from public.payments where id = p_payment_id for update;
  if not found then raise exception 'payment not found: %', p_payment_id; end if;
  if rec.status <> 'pending' then raise exception 'payment already %', rec.status; end if;
  if rec.user_id is null then raise exception 'payment has no linked user'; end if;

  update public.payments set status = 'approved', reviewed_at = now() where id = p_payment_id;

  insert into public.premium_entitlements (user_id, tier, expires_at, granted_by, source)
  values (rec.user_id, rec.tier_id,
          case when p_months is null or p_months <= 0 then null
               else now() + (p_months || ' months')::interval end,
          auth.uid(), 'upi')
  on conflict (user_id) do update
    set tier = excluded.tier, expires_at = excluded.expires_at,
        granted_by = excluded.granted_by, source = excluded.source, granted_at = now();
end; $$;

create or replace function public.reject_payment(p_payment_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.payments set status = 'rejected', reviewed_at = now()
   where id = p_payment_id and status = 'pending';
end; $$;

create or replace function public.admin_list_payments(p_status text default null)
returns setof public.payments language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query select * from public.payments
    where p_status is null or status = p_status
    order by created_at desc limit 500;
end; $$;

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

create or replace function public.apply_raid_damage(p_guild uuid, p_damage int)
returns int language plpgsql security definer set search_path = public, pg_temp as $$
declare new_hp int;
begin
  if not exists (select 1 from public.guild_members m where m.guild_id = p_guild and m.user_id = auth.uid())
    then raise exception 'not a member of this guild'; end if;
  p_damage := greatest(0, least(coalesce(p_damage, 0), 5000));
  update public.guild_raid
     set boss_hp = greatest(0, boss_hp - p_damage),
         defeated = (greatest(0, boss_hp - p_damage) = 0)
   where guild_id = p_guild
  returning boss_hp into new_hp;
  return coalesce(new_hp, -1);
end; $$;

revoke all on function public.grant_premium(uuid, text, timestamptz, text) from public;
revoke all on function public.revoke_premium(uuid) from public;
revoke all on function public.approve_payment(text, int) from public;
revoke all on function public.reject_payment(text) from public;
revoke all on function public.admin_list_payments(text) from public;
revoke all on function public.apply_raid_damage(uuid, int) from public;
revoke all on function public.has_premium(uuid) from public;
revoke all on function public.my_premium() from public;

grant execute on function public.grant_premium(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.revoke_premium(uuid)         to authenticated;
grant execute on function public.approve_payment(text, int)   to authenticated;
grant execute on function public.reject_payment(text)         to authenticated;
grant execute on function public.admin_list_payments(text)    to authenticated;
grant execute on function public.apply_raid_damage(uuid, int) to authenticated;
grant execute on function public.has_premium(uuid)            to authenticated;
grant execute on function public.my_premium()                 to authenticated;

revoke all on public.admins from anon, authenticated;
revoke all on public.premium_entitlements from anon;
revoke all on public.payments from anon;

commit;

-- ============================================================================
-- VERIFY (run separately, after the migration)
-- ============================================================================
-- Every table should report rowsecurity = true:
--
--   select tablename, rowsecurity from pg_tables
--    where schemaname = 'public' order by tablename;
--
-- admins should have ZERO policies:
--
--   select count(*) from pg_policies
--    where schemaname='public' and tablename='admins';   -- expect 0
--
-- Then, signed in as a NON-admin user in the app, this must fail:
--
--   insert into public.admins (email) values ('attacker@evil.com');
--   -- expected: new row violates row-level security policy
-- ============================================================================
