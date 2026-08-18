-- ============================================================================
-- LEGITIMATE FLOW: the real owner must still be able to run the business.
-- ============================================================================
\set ON_ERROR_STOP 1
\pset pager off

-- schema.sql no longer seeds an admin (it ships public, so it must not hardcode
-- one). Seed the test owner here, as superuser, before dropping to a role.
insert into public.admins (email) values ('owner@example.com')
on conflict (email) do nothing;

-- ---- Buyer submits their own pending payment -------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub',  '33333333-3333-3333-3333-333333333333', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","email":"victim@buyer.com","role":"authenticated"}', false);

\echo ''
\echo '>>> Buyer submits a pending payment for their own account'
insert into public.payments (id, user_id, tier_id, tier_name, amount_paise, buyer_email, buyer_name, utr)
values ('p_2', '33333333-3333-3333-3333-333333333333', 't3', 'Monarch', 29900, 'victim@buyer.com', 'Victim', '999888777666');

\echo '>>> Buyer can read their own payments'
select id, tier_id, status from public.payments order by id;

\echo '>>> Buyer has NO premium yet (correct - not approved)'
select count(*) as entitlements from public.premium_entitlements where user_id='33333333-3333-3333-3333-333333333333';

-- ---- Owner signs in and approves ------------------------------------------
select set_config('request.jwt.claim.sub',  '11111111-1111-1111-1111-111111111111', false);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","email":"owner@example.com","role":"authenticated"}', false);

\echo ''
\echo '>>> Owner is recognised as admin'
select public.is_admin() as owner_is_admin;

\echo '>>> Owner lists ALL pending payments (across users)'
select id, buyer_email, tier_id, amount_paise, status from public.admin_list_payments('pending');

\echo '>>> Owner approves payment p_2 for 1 month'
select public.approve_payment('p_2', 1);

\echo '>>> Payment is now approved'
select id, status, reviewed_at is not null as reviewed from public.payments where id='p_2';

\echo '>>> Buyer now HAS premium, tier t3, expiring in ~1 month'
select user_id, tier, source, (expires_at > now()) as active,
       date_trunc('day', expires_at - now()) as remaining
  from public.premium_entitlements where user_id='33333333-3333-3333-3333-333333333333';

\echo ''
\echo '>>> Double-approval is rejected'
\set ON_ERROR_STOP 0
select public.approve_payment('p_2', 1);
\set ON_ERROR_STOP 1

-- ---- Buyer sees their own premium via my_premium() -------------------------
select set_config('request.jwt.claim.sub',  '33333333-3333-3333-3333-333333333333', false);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","email":"victim@buyer.com","role":"authenticated"}', false);

\echo ''
\echo '>>> Buyer''s own my_premium() call returns their entitlement'
select * from public.my_premium();

\echo '>>> Buyer still cannot see the admin list or other users'' payments'
select count(*) as admin_rows_visible from public.admins;

-- ---- Owner revokes ---------------------------------------------------------
select set_config('request.jwt.claim.sub',  '11111111-1111-1111-1111-111111111111', false);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","email":"owner@example.com","role":"authenticated"}', false);
\echo ''
\echo '>>> Owner revokes premium'
select public.revoke_premium('33333333-3333-3333-3333-333333333333');
select count(*) as entitlements_after_revoke from public.premium_entitlements where user_id='33333333-3333-3333-3333-333333333333';

reset role;
\echo ''
\echo '=== LEGITIMATE OWNER FLOW: ALL STEPS PASSED ==='
