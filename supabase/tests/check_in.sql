begin;
select plan(41);

-- 专用测试数据在事务内创建，不影响其他 pgTAP 文件。
insert into public.slots (code, name, yard, kind, sort_order, is_active) values
  ('test-ci-1', '1号', 'outer', 'regular', 101, true),
  ('test-ci-2', '2号', 'outer', 'regular', 102, true),
  ('test-ci-3', '3号', 'outer', 'private', 103, true),
  ('test-ci-4', '4号', 'inner', 'regular', 104, true),
  ('test-ci-5', '5号', 'inner', 'regular', 105, true),
  ('test-ci-6', '6号', 'outer', 'regular', 106, true),
  ('test-ci-7', '7号', 'outer', 'private', 107, true),
  ('test-ci-8', '8号', 'outer', 'private', 108, true),
  ('test-ci-9', '9号', 'outer', 'regular', 109, false);

select ok(not has_function_privilege('anon',
  'public.check_in_vehicle(text,text,public.billing_type,timestamptz,int,int,public.payment_method)',
  'execute'), '匿名用户没有登记权限');
select ok(not has_function_privilege('anon', 'public.undo_check_in(uuid)', 'execute'),
  '匿名用户没有撤销权限');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000031';

insert into public.leases (slot_code, tenant_name, starts_on)
  values ('test-ci-4', '在租用户', '2026-01-01');
insert into public.reservations (slot_code, guest_name)
  values ('test-ci-5', '预留客人');

select lives_ok(
  $$select public.check_in_vehicle('test-ci-1', '粤B·11111', 'hourly')$$,
  '临停成功登记');
select is((select plate from public.parking_sessions where slot_code = 'test-ci-1'),
  '粤B11111', '车牌标准化后存储');
select lives_ok(
  $$select public.check_in_vehicle('test-ci-2', '粤B22222', 'free')$$,
  '免费成功登记');
select lives_ok(
  $$select public.check_in_vehicle('test-ci-3', '粤B33333', 'hourly',
    p_borrow_minutes => 10)$$,
  '私人位临停十分钟成功');
select ok((select borrow_until is not null from public.parking_sessions
  where slot_code = 'test-ci-3'), '私人位记录了借用期限');
select ok((select borrow_until from public.parking_sessions
  where slot_code = 'test-ci-3') between now() + interval '9 minutes 59 seconds'
  and now() + interval '10 minutes 1 second', '私人位十分钟由数据库计算截止时间');
select lives_ok(
  $$select public.check_in_vehicle('test-ci-8', '粤B88888', 'free',
    p_borrow_minutes => 30)$$,
  '私人位免费借用三十分钟成功');
select ok((select borrow_until from public.parking_sessions
  where slot_code = 'test-ci-8') between now() + interval '29 minutes 59 seconds'
  and now() + interval '30 minutes 1 second', '私人位三十分钟由数据库计算截止时间');
select lives_ok(
  $$select public.check_in_vehicle('test-ci-4', '粤B44444', 'lease')$$,
  '有在租长租的车位登记成功');
select ok((select ps.lease_id = l.id from public.parking_sessions ps
  join public.leases l on l.slot_code = ps.slot_code
  where ps.slot_code = 'test-ci-4'), 'RPC 自动在数据库关联 lease_id');
select lives_ok(
  $$select public.check_in_vehicle('test-ci-5', '粤B55555', 'hotel_daily',
    p_paid_until => now() + interval '1 day',
    p_amount_cents => 3000, p_payment_method => 'wechat')$$,
  '酒店客一次完成登记及预交');
select results_eq(
  $$select purpose::text, amount_cents, method::text from public.payments
    where session_id = (select id from public.parking_sessions
      where slot_code = 'test-ci-5')$$,
  $$values ('prepay'::text, 3000, 'wechat'::text)$$,
  '酒店客收款用途、方式和实收金额正确');
select ok((select paid_until is not null from public.payments
  where session_id = (select id from public.parking_sessions
    where slot_code = 'test-ci-5')), '酒店客预交记录包含交到时间');

select ok((select closed_at is not null and outcome = 'arrived' and session_id is not null
  from public.reservations where slot_code = 'test-ci-5'),
  '登记自动关闭预留并关联停车记录');

select throws_ok(
  $$select public.check_in_vehicle('test-ci-1', '粤B00001', 'free')$$,
  'P0001', '车位已被登记', '占用车位冲突');
select throws_ok(
  $$select public.check_in_vehicle('test-ci-6', '粤B11111', 'hourly')$$,
  'P0001', '车牌已在场', '同一车牌冲突');
select throws_ok(
  $$select public.check_in_vehicle('test-ci-7', '粤B77777', 'hourly')$$,
  'P0001', '私人位只允许限时借用', '私人位缺少借用时长被拒绝');
select throws_ok(
  $$select public.check_in_vehicle('test-ci-7', '粤B77777', 'hourly',
    p_borrow_minutes => 20)$$,
  'P0001', '私人位只允许限时借用', '私人位不接受 20 分钟借用时长');
select throws_ok(
  $$select public.check_in_vehicle('test-ci-7', '粤B77777', 'free',
    p_borrow_minutes => 60)$$,
  'P0001', '私人位只允许限时借用', '私人位不接受 60 分钟借用时长');
select throws_ok(
  $$select public.check_in_vehicle('test-ci-6', '粤B60001', 'hourly',
    p_borrow_minutes => 10)$$,
  'P0001', '普通车位没有借用时长', '非私人位不允许设置借用期限');
select throws_ok(
  $$select public.check_in_vehicle('test-ci-7', '粤B77777', 'hotel_daily',
    p_paid_until => now() + interval '1 day',
    p_amount_cents => 3000, p_payment_method => 'cash')$$,
  'P0001', '私人位只允许限时借用', '私人位拒绝酒店客');
select throws_ok(
  $$select public.check_in_vehicle('test-ci-7', '粤B77777', 'lease')$$,
  'P0001', '私人位只允许限时借用', '私人位拒绝长租');
select throws_ok(
  $$select public.check_in_vehicle('test-ci-6', '粤B60001', 'lease')$$,
  'P0001', '车位没有在租长租', '没有在租长租时拒绝长租');
select throws_ok(
  $$select public.check_in_vehicle('test-ci-6', '粤B60001', 'hotel_daily',
    p_paid_until => now() + interval '1 day',
    p_amount_cents => 0, p_payment_method => 'cash')$$,
  'P0001', '酒店客收款参数无效', '酒店客金额为零被拒绝');
select throws_ok(
  $$select public.check_in_vehicle('test-ci-6', '粤B60001', 'free',
    p_amount_cents => 200, p_payment_method => 'cash')$$,
  'P0001', '该计费方式不可预交收款', '临停免费不能携带收款字段');
select throws_ok(
  $$select public.check_in_vehicle('test-ci-9', '粤B99999', 'free')$$,
  'P0001', '车位不可用', '停用车位不能登记');

-- 撤销必须先恢复预留，再删除 session 和级联收款。
select lives_ok(
  $$select public.undo_check_in(
    (select id from public.parking_sessions where slot_code = 'test-ci-5'))$$,
  '酒店客可撤销刚登记的进场');
select ok((select closed_at is null and outcome is null and session_id is null
  from public.reservations where slot_code = 'test-ci-5'),
  '撤销后原预留恢复为未关闭');
select is((select count(*) from public.parking_sessions where slot_code = 'test-ci-5'),
  0::bigint, '撤销后原停车记录已删除');
select is((select count(*) from public.payments p
  where p.session_id not in (select id from public.parking_sessions)),
  0::bigint, '撤销后不会残留孤立收款');

insert into public.payments (session_id, purpose, amount_cents, method)
  select id, 'renewal', 500, 'cash' from public.parking_sessions where slot_code = 'test-ci-1';
select throws_ok(
  $$select public.undo_check_in(
    (select id from public.parking_sessions where slot_code = 'test-ci-1'))$$,
  'P0001', '已经不能撤销了', '登记后有续费收款不能撤销');

update public.parking_sessions set entered_at = now() - interval '11 minutes'
  where slot_code = 'test-ci-2';
select throws_ok(
  $$select public.undo_check_in(
    (select id from public.parking_sessions where slot_code = 'test-ci-2'))$$,
  'P0001', '已经不能撤销了', '超过十分钟不能撤销');

update public.parking_sessions set left_at = now() where slot_code = 'test-ci-4';
select throws_ok(
  $$select public.undo_check_in(
    (select id from public.parking_sessions where slot_code = 'test-ci-4'))$$,
  'P0001', '已经不能撤销了', '车辆已经离场不能撤销');

-- 已进场车位不能新增预留；被拒绝的新预留不妨碍进场撤销。
select lives_ok(
  $$select public.check_in_vehicle('test-ci-5', '粤B55556', 'hourly')$$,
  '预留重新到场后可再次登记');
select throws_ok(
  $$insert into public.reservations (slot_code, guest_name)
    values ('test-ci-5', '新的预留')$$,
  'P0001', '车位不能预留', '有车在场时不能新增预留');
select lives_ok(
  $$select public.undo_check_in(
    (select id from public.parking_sessions where slot_code = 'test-ci-5'))$$,
  '没有新预留时撤销登记成功');
select is((select count(*) from public.parking_sessions
  where slot_code = 'test-ci-5'), 0::bigint, '撤销成功后停车记录删除');

-- 更换非家庭账号，RLS 与 RPC 双重限制。
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000099';
select throws_ok(
  $$select public.check_in_vehicle('test-ci-6', '粤B60001', 'free')$$,
  '42501', '无权操作', '非家庭账号无法登记');
select throws_ok(
  $$select public.undo_check_in(
    '00000000-0000-4000-8000-000000000001'::uuid)$$,
  '42501', '无权操作', '非家庭账号无法撤销');

select * from finish();
rollback;
