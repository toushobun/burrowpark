begin;
select plan(123);

-- 测试车位只在事务内创建，不进入 migration 或 seed。
insert into public.slots (code, name, yard, kind, sort_order) values
  ('test-in-1', '测试内场1', 'inner', 'regular', 1),
  ('test-in-2', '测试内场2', 'inner', 'regular', 2),
  ('test-out-1', '测试外场1', 'outer', 'private', 3);

select is((select count(*) from public.slots where code like 'test-%'), 3::bigint, '测试事务内生成三条车位');
select is((select count(*) from public.pricing_settings), 1::bigint, '收费配置只有一行');
select results_eq(
  $$select hotel_daily_price_cents, hotel_checkout_hour, hotel_previous_day_before_hour, hourly_price_cents from public.pricing_settings$$,
  $$values (3000, 12, 6, 500)$$,
  '收费初始配置正确'
);
select is((select public from storage.buckets where id = 'plate-photos'), false, '进场照片桶为私有桶');

-- anon 没有任何业务表的读写授权，防止仅靠 RLS 漏配挡板。
select ok(not has_table_privilege('anon', 'public.slots', 'select'), 'anon 不可读取 slots');
select ok(not has_table_privilege('anon', 'public.slots', 'insert'), 'anon 不可插入 slots');
select ok(not has_table_privilege('anon', 'public.slots', 'update'), 'anon 不可更新 slots');
select ok(not has_table_privilege('anon', 'public.slots', 'delete'), 'anon 不可删除 slots');
select ok(not has_table_privilege('anon', 'public.leases', 'select'), 'anon 不可读取 leases');
select ok(not has_table_privilege('anon', 'public.leases', 'insert'), 'anon 不可插入 leases');
select ok(not has_table_privilege('anon', 'public.leases', 'update'), 'anon 不可更新 leases');
select ok(not has_table_privilege('anon', 'public.leases', 'delete'), 'anon 不可删除 leases');
select ok(not has_table_privilege('anon', 'public.parking_sessions', 'select'), 'anon 不可读取 parking_sessions');
select ok(not has_table_privilege('anon', 'public.parking_sessions', 'insert'), 'anon 不可插入 parking_sessions');
select ok(not has_table_privilege('anon', 'public.parking_sessions', 'update'), 'anon 不可更新 parking_sessions');
select ok(not has_table_privilege('anon', 'public.parking_sessions', 'delete'), 'anon 不可删除 parking_sessions');
select ok(not has_table_privilege('anon', 'public.payments', 'select'), 'anon 不可读取 payments');
select ok(not has_table_privilege('anon', 'public.payments', 'insert'), 'anon 不可插入 payments');
select ok(not has_table_privilege('anon', 'public.payments', 'update'), 'anon 不可更新 payments');
select ok(not has_table_privilege('anon', 'public.payments', 'delete'), 'anon 不可删除 payments');
select ok(not has_table_privilege('anon', 'public.reservations', 'select'), 'anon 不可读取 reservations');
select ok(not has_table_privilege('anon', 'public.reservations', 'insert'), 'anon 不可插入 reservations');
select ok(not has_table_privilege('anon', 'public.reservations', 'update'), 'anon 不可更新 reservations');
select ok(not has_table_privilege('anon', 'public.reservations', 'delete'), 'anon 不可删除 reservations');
select ok(not has_table_privilege('anon', 'public.pricing_settings', 'select'), 'anon 不可读取 pricing_settings');
select ok(not has_table_privilege('anon', 'public.pricing_settings', 'insert'), 'anon 不可插入 pricing_settings');
select ok(not has_table_privilege('anon', 'public.pricing_settings', 'update'), 'anon 不可更新 pricing_settings');
select ok(not has_table_privilege('anon', 'public.pricing_settings', 'delete'), 'anon 不可删除 pricing_settings');

-- 正常表权限：车位只读，收费设置只读可改，其余业务表可增删改查。
select ok(has_table_privilege('authenticated', 'public.slots', 'select'), '登录用户具有 slots 查询授权');
select ok(not has_table_privilege('authenticated', 'public.slots', 'insert'), '登录用户不能创建车位');
select ok(not has_table_privilege('authenticated', 'public.slots', 'update'), '登录用户不能修改车位');
select ok(not has_table_privilege('authenticated', 'public.slots', 'delete'), '登录用户不能删除车位');
select ok(has_table_privilege('authenticated', 'public.pricing_settings', 'select'), '登录用户具有收费设置查询授权');
select ok(has_table_privilege('authenticated', 'public.pricing_settings', 'update'), '登录用户具有收费设置修改授权');
select ok(not has_table_privilege('authenticated', 'public.pricing_settings', 'insert'), '登录用户不能创建收费设置');
select ok(not has_table_privilege('authenticated', 'public.pricing_settings', 'delete'), '登录用户不能删除收费设置');

-- 使用本地 seed 中的家庭账号写入业务记录；权限由 RLS 而非管理员角色决定。
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000031';

select is((select count(*) from public.slots where code like 'test-%'), 3::bigint, '家庭账号能查询车位');
select is((select hotel_daily_price_cents from public.pricing_settings), 3000, '家庭账号可查询收费设置');
select throws_ok(
  $$insert into public.slots (code, name, yard, kind, sort_order) values ('test-denied', '不能写', 'inner', 'regular', 9)$$,
  '42501', null, '家庭账号也不能新增车位'
);
select throws_ok(
  $$update public.slots set name = '不能改' where code = 'test-in-1'$$,
  '42501', null, '家庭账号也不能修改车位'
);
select throws_ok(
  $$delete from public.slots where code = 'test-in-2'$$,
  '42501', null, '家庭账号也不能删除车位'
);
select throws_ok(
  $$insert into public.pricing_settings (hotel_daily_price_cents, hotel_checkout_hour, hotel_previous_day_before_hour, hourly_price_cents) values (1, 12, 6, 1)$$,
  '42501', null, '家庭账号不能新增收费设置'
);
select throws_ok(
  $$delete from public.pricing_settings$$,
  '42501', null, '家庭账号不能删除收费设置'
);
select lives_ok(
  $$update public.pricing_settings set hourly_price_cents = 600$$,
  '家庭账号可以修改收费设置'
);
select is((select hourly_price_cents from public.pricing_settings), 600, '收费设置修改后可查询');
select throws_ok(
  $$update public.pricing_settings set hourly_price_cents = 0$$,
  '23514', null, '家庭账号不能将每小时收费设置为零'
);

select ok((select updated_at >= now() from public.pricing_settings), '收费设置 updated_at 有值');

select lives_ok(
  $$insert into public.leases (id, slot_code, tenant_name, starts_on)
    values ('00000000-0000-4000-8000-000000000041', 'test-out-1', '张先生', '2026-11-01')$$,
  '家庭账号可新增长租'
);
select is((select tenant_name from public.leases where id = '00000000-0000-4000-8000-000000000041'), '张先生', '家庭账号可读取长租');
select lives_ok(
  $$update public.leases set tenant_name = '李先生' where id = '00000000-0000-4000-8000-000000000041'$$,
  '家庭账号可修改长租'
);
select is((select tenant_name from public.leases where id = '00000000-0000-4000-8000-000000000041'), '李先生', '长租修改生效');
select lives_ok(
  $$insert into public.leases (id, slot_code, tenant_name, starts_on)
    values ('00000000-0000-4000-8000-000000000042', 'test-in-2', '临时测试', '2026-11-01')$$,
  '家庭账号可新增第二条长租'
);
select lives_ok(
  $$delete from public.leases where id = '00000000-0000-4000-8000-000000000042'$$,
  '家庭账号可删除长租'
);
select is((select count(*) from public.leases where id = '00000000-0000-4000-8000-000000000042'), 0::bigint, '长租删除生效');

select lives_ok(
  $$insert into public.parking_sessions (id, slot_code, plate, billing_type)
    values ('00000000-0000-4000-8000-000000000051', 'test-in-1', 'ABC12', 'hotel_daily')$$,
  '家庭账号可新增停车记录'
);
select is((select plate from public.parking_sessions where id = '00000000-0000-4000-8000-000000000051'), 'ABC12', '家庭账号可读取停车记录');
select lives_ok(
  $$update public.parking_sessions set note = '测试备注' where id = '00000000-0000-4000-8000-000000000051'$$,
  '家庭账号可修改停车记录'
);
select is((select note from public.parking_sessions where id = '00000000-0000-4000-8000-000000000051'), '测试备注', '停车记录修改生效');
select lives_ok(
  $$insert into public.parking_sessions (id, slot_code, plate, billing_type)
    values ('00000000-0000-4000-8000-000000000052', 'test-in-2', 'TMP88', 'hourly')$$,
  '家庭账号可创建第二条停车记录'
);
select lives_ok(
  $$delete from public.parking_sessions where id = '00000000-0000-4000-8000-000000000052'$$,
  '家庭账号可删除停车记录'
);
select is((select count(*) from public.parking_sessions where id = '00000000-0000-4000-8000-000000000052'), 0::bigint, '停车记录删除生效');
select lives_ok(
  $$insert into public.parking_sessions (slot_code, plate, billing_type)
    values ('test-in-2', 'GEN01', 'hourly')$$,
  '家庭账号可省略停车记录 id，由数据库生成 UUID'
);
delete from public.parking_sessions where plate = 'GEN01';


select lives_ok(
  $$insert into public.payments (id, session_id, purpose, amount_cents, method, paid_until)
    values ('00000000-0000-4000-8000-000000000061', '00000000-0000-4000-8000-000000000051',
            'prepay', 3000, 'wechat', '2026-11-20T12:00:00+08:00')$$,
  '家庭账号可新增收款'
);
select is((select amount_cents from public.payments where id = '00000000-0000-4000-8000-000000000061'), 3000, '家庭账号可读取收款');
select lives_ok(
  $$update public.payments set amount_cents = 4000 where id = '00000000-0000-4000-8000-000000000061'$$,
  '家庭账号可修改收款'
);
select is((select amount_cents from public.payments where id = '00000000-0000-4000-8000-000000000061'), 4000, '收款修改生效');
select lives_ok(
  $$delete from public.payments where id = '00000000-0000-4000-8000-000000000061'$$,
  '家庭账号可删除收款'
);
select is((select count(*) from public.payments where id = '00000000-0000-4000-8000-000000000061'), 0::bigint, '收款删除生效');
select lives_ok(
  $$insert into public.payments (session_id, purpose, amount_cents, method)
    values ('00000000-0000-4000-8000-000000000051', 'prepay', 100, 'cash')$$,
  '家庭账号可省略收款 id，由数据库生成 UUID'
);
delete from public.payments where session_id = '00000000-0000-4000-8000-000000000051'
  and amount_cents = 100;


select lives_ok(
  $$insert into public.reservations (id, slot_code, guest_name)
    values ('00000000-0000-4000-8000-000000000071', 'test-in-2', '王女士')$$,
  '家庭账号可新增预留'
);
select is((select guest_name from public.reservations where id = '00000000-0000-4000-8000-000000000071'), '王女士', '家庭账号可读取预留');
select lives_ok(
  $$update public.reservations set guest_name = '赵女士' where id = '00000000-0000-4000-8000-000000000071'$$,
  '家庭账号可修改预留'
);
select is((select guest_name from public.reservations where id = '00000000-0000-4000-8000-000000000071'), '赵女士', '预留修改生效');
select lives_ok(
  $$insert into public.reservations (id, slot_code, guest_name)
    values ('00000000-0000-4000-8000-000000000072', 'test-out-1', '临时预留')$$,
  '家庭账号可创建第二条预留'
);
select lives_ok(
  $$delete from public.reservations where id = '00000000-0000-4000-8000-000000000072'$$,
  '家庭账号可删除预留'
);
select is((select count(*) from public.reservations where id = '00000000-0000-4000-8000-000000000072'), 0::bigint, '预留删除生效');
select lives_ok(
  $$insert into public.reservations (slot_code, guest_name)
    values ('test-out-1', '默认主键测试')$$,
  '家庭账号可省略预留 id，由数据库生成 UUID'
);
delete from public.reservations where guest_name = '默认主键测试';


select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('plate-photos', 'test/family.jpg')$$,
  '家庭账号可写入进场照片对象'
);
select is((select count(*) from storage.objects where bucket_id = 'plate-photos' and name = 'test/family.jpg'), 1::bigint, '家庭账号可读取照片对象');
select lives_ok(
  $$update storage.objects set name = 'test/renamed.jpg' where bucket_id = 'plate-photos' and name = 'test/family.jpg'$$,
  '家庭账号可修改照片对象'
);
select is((select count(*) from storage.objects where bucket_id = 'plate-photos' and name = 'test/renamed.jpg'), 1::bigint, '照片对象修改生效');
-- Storage 自带保护触发器拒绝直接 SQL 删除，删除必须经过 Storage API。
select throws_ok(
  $$delete from storage.objects where bucket_id = 'plate-photos' and name = 'test/renamed.jpg'$$,
  '42501', null, 'Storage 禁止直接 SQL 删除照片对象'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'plate_photos_family_delete' and cmd = 'DELETE'
  ),
  '照片删除的家庭账号 RLS 策略已创建，供 Storage API 使用'
);

reset role;

-- 约束错误码稳定，且关闭/离场/退租后允许同位置再建。
select throws_ok(
  $$insert into public.parking_sessions (id, slot_code, plate, billing_type)
    values ('00000000-0000-4000-8000-000000000053', 'test-in-1', 'NEW56', 'hourly')$$,
  '23505', null, '同车位不能有两条在场记录'
);
select throws_ok(
  $$insert into public.parking_sessions (id, slot_code, plate, billing_type)
    values ('00000000-0000-4000-8000-000000000053', 'test-in-2', 'ABC12', 'hourly')$$,
  '23505', null, '同车牌不能有两条在场记录'
);
update public.parking_sessions set left_at = entered_at + interval '1 hour'
  where id = '00000000-0000-4000-8000-000000000051';
select lives_ok(
  $$insert into public.parking_sessions (id, slot_code, plate, billing_type)
    values ('00000000-0000-4000-8000-000000000053', 'test-in-1', 'ABC12', 'hourly')$$,
  '离场后同车位与同车牌可以再次进场'
);

select throws_ok(
  $$insert into public.leases (slot_code, tenant_name, starts_on)
    values ('test-out-1', '重复租户', '2026-11-01')$$,
  '23505', null, '同车位不能有两份在租长租'
);
update public.leases set ended_on = '2026-11-15'
  where id = '00000000-0000-4000-8000-000000000041';
select lives_ok(
  $$insert into public.leases (slot_code, tenant_name, starts_on)
    values ('test-out-1', '新租户', '2026-11-16')$$,
  '退租后可创建新的在租长租'
);
select throws_ok(
  $$insert into public.leases (slot_code, tenant_name, starts_on, ended_on)
    values ('test-in-2', '非法日期', '2026-11-16', '2026-11-15')$$,
  '23514', null, '退租日期不能早于起租日期'
);

select throws_ok(
  $$insert into public.reservations (id, slot_code)
    values ('00000000-0000-4000-8000-000000000073', 'test-in-2')$$,
  '23505', null, '同车位不能有两条未关闭预留'
);
update public.reservations set closed_at = now(), outcome = 'arrived'
  where id = '00000000-0000-4000-8000-000000000071';
select lives_ok(
  $$insert into public.reservations (id, slot_code)
    values ('00000000-0000-4000-8000-000000000073', 'test-in-2')$$,
  '关闭预留后可重新预留该车位'
);
select throws_ok(
  $$insert into public.reservations (id, slot_code, outcome)
    values ('00000000-0000-4000-8000-000000000074', 'test-out-1', 'cancelled')$$,
  '23514', null, '预留结束状态和关闭时间必须同时存在'
);

select throws_ok(
  $$insert into public.payments (id, purpose, amount_cents, method)
    values ('00000000-0000-4000-8000-000000000062', 'prepay', 100, 'cash')$$,
  '23514', null, '收款必须指定一项所属对象'
);
select throws_ok(
  $$insert into public.payments (id, session_id, lease_id, purpose, amount_cents, method)
    values ('00000000-0000-4000-8000-000000000062',
            '00000000-0000-4000-8000-000000000053',
            '00000000-0000-4000-8000-000000000041', 'prepay', 100, 'cash')$$,
  '23514', null, '收款不能同时绑定停车记录和长租'
);
select throws_ok(
  $$insert into public.payments (id, session_id, purpose, amount_cents, method)
    values ('00000000-0000-4000-8000-000000000062',
            '00000000-0000-4000-8000-000000000053', 'prepay', 0, 'cash')$$,
  '23514', null, '收款金额必须大于零'
);
select lives_ok(
  $$insert into public.payments (id, lease_id, purpose, amount_cents, method)
    values ('00000000-0000-4000-8000-000000000062',
            '00000000-0000-4000-8000-000000000041', 'renewal', 100, 'cash')$$,
  '收款允许只绑定长租'
);
select throws_ok(
  $$insert into public.parking_sessions (id, slot_code, plate, billing_type)
    values ('00000000-0000-4000-8000-000000000054', 'test-in-2', 'TRY88', 'lease')$$,
  '23514', null, '长租停车记录必须绑定 lease_id'
);
select throws_ok(
  $$insert into public.parking_sessions (id, slot_code, plate, billing_type, lease_id)
    values ('00000000-0000-4000-8000-000000000054', 'test-in-2', 'TRY88', 'hourly',
            '00000000-0000-4000-8000-000000000041')$$,
  '23514', null, '非长租停车记录不能绑定 lease_id'
);
select lives_ok(
  $$insert into public.parking_sessions (id, slot_code, plate, billing_type, lease_id)
    values ('00000000-0000-4000-8000-000000000054', 'test-out-1', 'TRY88', 'lease',
            '00000000-0000-4000-8000-000000000041')$$,
  '长租停车记录可以绑定 lease_id'
);
select throws_ok(
  $$insert into public.parking_sessions (id, slot_code, plate, billing_type)
    values ('00000000-0000-4000-8000-000000000055', 'test-in-2', 'X', 'free')$$,
  '23514', null, '车牌长度不允许小于两个字符'
);
select throws_ok(
  $$insert into public.pricing_settings (
      id, hotel_daily_price_cents, hotel_checkout_hour,
      hotel_previous_day_before_hour, hourly_price_cents
    ) values (false, 3000, 12, 6, 500)$$,
  '23514', null, '收费设置 id 必须为 true'
);
select throws_ok(
  $$update public.pricing_settings set hotel_checkout_hour = 24$$,
  '23514', null, '结算小时不得超出 0 到 23'
);
select throws_ok(
  $$update public.pricing_settings set hotel_previous_day_before_hour = -1$$,
  '23514', null, '前一天计算小时不得超出 0 到 23'
);

-- 先创建一条真实对象，再用非家庭账号模拟 PostgREST JWT。
insert into storage.objects (bucket_id, name) values ('plate-photos', 'test/hidden.jpg');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000032';

select is((select count(*) from public.slots), 0::bigint, '非家庭账号不可读取车位');
select is((select count(*) from public.leases), 0::bigint, '非家庭账号不可读取长租');
select is((select count(*) from public.parking_sessions), 0::bigint, '非家庭账号不可读取停车记录');
select is((select count(*) from public.payments), 0::bigint, '非家庭账号不可读取收款');
select is((select count(*) from public.reservations), 0::bigint, '非家庭账号不可读取预留');
select is((select count(*) from public.pricing_settings), 0::bigint, '非家庭账号不可读取收费配置');
select is((select count(*) from storage.objects where bucket_id = 'plate-photos'), 0::bigint, '非家庭账号不可读取进场照片');

select throws_ok(
  $$insert into public.leases (slot_code, tenant_name, starts_on)
    values ('test-in-2', '越权', '2026-11-01')$$,
  '42501', null, '非家庭账号不可新增长租'
);
select throws_ok(
  $$insert into public.parking_sessions (id, slot_code, plate, billing_type)
    values ('00000000-0000-4000-8000-000000000059', 'test-in-2', 'XTEST', 'free')$$,
  '42501', null, '非家庭账号不可新增停车记录'
);
select throws_ok(
  $$insert into public.payments (id, session_id, purpose, amount_cents, method)
    values ('00000000-0000-4000-8000-000000000069',
            '00000000-0000-4000-8000-000000000053', 'prepay', 100, 'cash')$$,
  '42501', null, '非家庭账号不可新增收款'
);
select throws_ok(
  $$insert into public.reservations (id, slot_code)
    values ('00000000-0000-4000-8000-000000000079', 'test-out-1')$$,
  '42501', null, '非家庭账号不可新增预留'
);
select is((select count(*) from public.leases where tenant_name = '越权'), 0::bigint, '越权写入不会留下长租');
select is((select count(*) from public.pricing_settings), 0::bigint, '非家庭账号无法通过 update 的读取条件');
select lives_ok(
  $$update public.pricing_settings set hourly_price_cents = 999$$,
  'RLS 允许执行但非家庭账号无法修改任何收费行'
);
select lives_ok(
  $$delete from public.reservations$$,
  'RLS 允许执行但非家庭账号无法删除任何预留行'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('plate-photos', 'test/denied.jpg')$$,
  '42501', null, '非家庭账号不可写入进场照片'
);
reset role;

select is((select hourly_price_cents from public.pricing_settings), 600, '非家庭账号更新未改变收费设置');
select is((select count(*) from public.reservations where id = '00000000-0000-4000-8000-000000000073'), 1::bigint, '非家庭账号删除未影响预留');

set local role anon;
select is((select count(*) from storage.objects where bucket_id = 'plate-photos'), 0::bigint, '匿名用户无法读取进场照片');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('plate-photos', 'test/anon.jpg')$$,
  '42501', null, '匿名用户无法写入进场照片'
);
reset role;

select * from finish();
rollback;
