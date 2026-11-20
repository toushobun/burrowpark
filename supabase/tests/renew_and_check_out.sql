begin;
select plan(30);

insert into public.slots (code,name,yard,kind,sort_order,is_active) values
  ('test-co-1','1号','outer','regular',201,true),
  ('test-co-2','2号','outer','regular',202,true),
  ('test-co-3','3号','outer','regular',203,true),
  ('test-co-4','4号','outer','regular',204,true),
  ('test-co-5','5号','outer','regular',205,true);

select ok(not has_function_privilege('anon','public.undo_renewal(uuid)','execute'),
  '匿名用户不能撤销续费');
select ok(not has_function_privilege('anon',
  'public.check_out_vehicle(uuid,int,public.payment_method)','execute'),
  '匿名用户不能办理离场');
select ok(not has_function_privilege('anon','public.undo_check_out(uuid)','execute'),
  '匿名用户不能撤销离场');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000031';

insert into public.parking_sessions (slot_code,plate,billing_type) values
  ('test-co-1','粤B00111','hourly'),
  ('test-co-2','粤B00222','free'),
  ('test-co-3','粤B00333','hourly'),
  ('test-co-4','粤B00444','hourly');

select throws_ok($select public.check_out_vehicle(
  '00000000-0000-4000-8000-000000000999'::uuid)$,
  'P0001','停车记录不存在','不存在的停车记录不能离场');
select throws_ok($select public.undo_check_out(
  '00000000-0000-4000-8000-000000000999'::uuid)$,
  'P0001','已经不能撤销了','不存在的停车记录不能撤销离场');

select lives_ok($select public.check_out_vehicle(
  (select id from public.parking_sessions where slot_code = 'test-co-1'),
  1200, 'wechat')$,'正常离场并结算');
select ok((select left_at is not null from public.parking_sessions
  where slot_code = 'test-co-1'),'离场记录了数据库时间');
select results_eq(
  $$select purpose::text,amount_cents,method::text from public.payments
    where session_id = (select id from public.parking_sessions
      where slot_code = 'test-co-1')$$,
  $$values ('settlement'::text,1200,'wechat'::text)$$,
  '结算收款记在本次停车记录上');
select lives_ok($$select public.check_out_vehicle(
  (select id from public.parking_sessions where slot_code = 'test-co-2'))$$,
  '直接不收钱离场');
select is((select count(*) from public.payments where session_id =
  (select id from public.parking_sessions where slot_code = 'test-co-2')),
  0::bigint,'不收钱离场不插入收款');
select throws_ok($$select public.check_out_vehicle(
  (select id from public.parking_sessions where slot_code = 'test-co-1'))$$,
  'P0001','这辆车已经离场了','重复离场拒绝');
select throws_ok($$select public.check_out_vehicle(
  (select id from public.parking_sessions where slot_code = 'test-co-3'),100)$$,
  'P0001','离场收款参数无效','只有金额时拒绝');
select throws_ok($$select public.check_out_vehicle(
  (select id from public.parking_sessions where slot_code = 'test-co-3'),
  p_payment_method => 'cash')$$,
  'P0001','离场收款参数无效','只有方式时拒绝');
select lives_ok($$select public.undo_check_out(
  (select id from public.parking_sessions where slot_code = 'test-co-1'))$$,
  '十分钟内撤销离场');
select ok((select left_at is null from public.parking_sessions
  where slot_code = 'test-co-1'),'撤销离场恢复在场');
select is((select count(*) from public.payments where session_id =
  (select id from public.parking_sessions where slot_code = 'test-co-1')),
  0::bigint,'撤销离场删掉结算收款');

update public.parking_sessions set entered_at = now() - interval '1 day',
  left_at = now() - interval '11 minutes' where slot_code = 'test-co-2';
select throws_ok($$select public.undo_check_out(
  (select id from public.parking_sessions where slot_code = 'test-co-2'))$$,
  'P0001','已经不能撤销了','离场超过十分钟不可撤销');

select lives_ok($$select public.check_out_vehicle(
  (select id from public.parking_sessions where slot_code = 'test-co-3'))$$,
  '为车位冲突准备离场记录');
insert into public.parking_sessions (slot_code,plate,billing_type)
  values ('test-co-3','粤B00334','free');
select throws_ok($$select public.undo_check_out(
  (select id from public.parking_sessions where plate = '粤B00333'))$$,
  'P0001','这个车位已经停了别的车，不能撤销',
  '车位已被其他车占用不能撤销');

select lives_ok($$select public.check_out_vehicle(
  (select id from public.parking_sessions where slot_code = 'test-co-4'))$$,
  '为车牌冲突准备离场记录');
insert into public.parking_sessions (slot_code,plate,billing_type)
  values ('test-co-5','粤B00444','free');
select throws_ok($$select public.undo_check_out(
  (select id from public.parking_sessions where slot_code = 'test-co-4'))$$,
  'P0001','这个车位已经停了别的车，不能撤销',
  '同车牌已经在其他车位不能撤销');

insert into public.payments (session_id,purpose,amount_cents,method,paid_until)
  select id,'renewal',3000,'cash',now()+interval '1 day'
  from public.parking_sessions where slot_code = 'test-co-1';
select lives_ok($$select public.undo_renewal(
  (select id from public.payments where purpose = 'renewal'
    and session_id = (select id from public.parking_sessions
      where slot_code = 'test-co-1')))$$,'十分钟内最新续费可以撤销');
select is((select count(*) from public.payments where session_id =
  (select id from public.parking_sessions where slot_code = 'test-co-1')),
  0::bigint,'撤销续费硬删除');

insert into public.payments (session_id,purpose,amount_cents,method,paid_until,paid_at)
  select id,'renewal',3000,'cash',now()+interval '1 day',now()-interval '11 minutes'
  from public.parking_sessions where slot_code = 'test-co-1';
select throws_ok($$select public.undo_renewal(
  (select id from public.payments where purpose = 'renewal'
   and session_id = (select id from public.parking_sessions
     where slot_code = 'test-co-1')))$$,
  'P0001','已经不能撤销了','续费超过十分钟不可撤销');

insert into public.payments (session_id,purpose,amount_cents,method,paid_until,paid_at)
  select id,'renewal',4000,'cash',now()+interval '2 day',now()-interval '1 minute'
  from public.parking_sessions where slot_code = 'test-co-1';
insert into public.payments (session_id,purpose,amount_cents,method,paid_until,paid_at)
  select id,'renewal',5000,'wechat',now()+interval '3 day',now()
  from public.parking_sessions where slot_code = 'test-co-1';
select throws_ok($$select public.undo_renewal(
  (select id from public.payments where amount_cents = 4000
    and session_id = (select id from public.parking_sessions
      where slot_code = 'test-co-1')))$$,
  'P0001','已经不能撤销了','有更新一笔收款不可撤销旧续费');

insert into public.leases (slot_code,tenant_name,starts_on)
  values ('test-co-2','租户','2026-01-01');
insert into public.payments (lease_id,purpose,amount_cents,method,paid_until)
  select id,'renewal',8000,'alipay',now()+interval '1 month'
  from public.leases where slot_code = 'test-co-2';
select lives_ok($$select public.undo_renewal(
  (select id from public.payments where lease_id =
    (select id from public.leases where slot_code = 'test-co-2')))$$,
  '长租收款也可撤销');
select is((select count(*) from public.payments where lease_id =
  (select id from public.leases where slot_code = 'test-co-2')),
  0::bigint,'长租续费删掉长租名下收款');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000099';
select throws_ok($$select public.check_out_vehicle(
  (select id from public.parking_sessions where slot_code = 'test-co-1'))$$,
  '42501','无权操作','非家庭账号不能离场');
select throws_ok($$select public.undo_check_out(
  (select id from public.parking_sessions where slot_code = 'test-co-2'))$$,
  '42501','无权操作','非家庭账号不能撤销离场');
select throws_ok($$select public.undo_renewal(
  '00000000-0000-4000-8000-000000000001'::uuid)$$,
  '42501','无权操作','非家庭账号不能撤销续费');
select * from finish();
rollback;
