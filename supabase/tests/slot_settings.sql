begin;
select plan(32);

insert into public.slots(code,name,yard,kind,sort_order,is_active) values
 ('test-settings-1','31号','outer','regular',301,true),
 ('test-settings-2','32号','outer','regular',302,true),
 ('test-settings-3','33号','outer','regular',303,true),
 ('test-settings-4','34号','outer','regular',304,true),
 ('test-settings-5','35号','outer','regular',305,true),
 ('test-settings-6','通道','outer','aisle',306,true);

select ok(has_column_privilege('authenticated','public.slots','kind','UPDATE'),
 '已登录用户只能对私人位开关有列级UPDATE权限');
select ok(has_column_privilege('authenticated','public.slots','is_active','UPDATE'),
 '已登录用户对启用开关有列级UPDATE权限');
select ok(not has_column_privilege('authenticated','public.slots','code','UPDATE'),
 '车位编号仍不可修改');
select ok(not has_column_privilege('authenticated','public.slots','name','UPDATE'),
 '车位名仍不可修改');
select ok(not has_column_privilege('authenticated','public.slots','yard','UPDATE'),
 '所在区域仍不可修改');
select ok(not has_column_privilege('authenticated','public.slots','sort_order','UPDATE'),
 '排序位置仍不可修改');
select ok(not has_function_privilege('anon',
 'public.update_slot_settings(text,public.slot_kind,boolean)','execute'),
 '匿名用户不能执行车位设置RPC');

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000031';

select lives_ok($$select public.update_slot_settings('test-settings-1','private',false)$$,
 '空车位可以设为私人位并停用');
select results_eq(
 $$select kind::text,is_active from public.slots where code='test-settings-1'$$,
 $$select 'private'::text,false$$,'修改结果正确持久化');
select lives_ok($$select public.update_slot_settings('test-settings-1','regular',true)$$,
 '空车位可以恢复普通车位并启用');
select lives_ok($$update public.slots set kind='private'
 where code='test-settings-5'$$,'直接修改允许的列遵守RLS');
select ok((select kind='private' from public.slots where code='test-settings-5'),
 '直接合法修改只影响kind');

select throws_ok($$update public.slots set code='test-settings-99'
 where code='test-settings-1'$$,'42501','permission denied for table slots',
 '直接修改车位编号被拒绝');
select throws_ok($$update public.slots set name='改名'
 where code='test-settings-1'$$,'42501','permission denied for table slots',
 '直接修改车位名称被拒绝');
select throws_ok($$update public.slots set yard='inner'
 where code='test-settings-1'$$,'42501','permission denied for table slots',
 '直接修改所在区域被拒绝');
select throws_ok($$update public.slots set sort_order=999
 where code='test-settings-1'$$,'42501','permission denied for table slots',
 '直接修改排序位置被拒绝');

select throws_ok($$select public.update_slot_settings(
 'test-settings-1','aisle',true)$$,'P0001','车位设置参数无效',
 '不允许设置通道类型');
select throws_ok($$select public.update_slot_settings(
 'test-settings-6','regular',true)$$,'P0001','通道车位不能修改',
 'RPC不能把通道改成普通位');
select throws_ok($$update public.slots set kind='regular'
 where code='test-settings-6'$$,'P0001','只允许普通车位或私人位',
 '直接UPDATE不能把通道改成普通位');
select throws_ok($$update public.slots set is_active=false
 where code='test-settings-6'$$,'P0001','只允许普通车位或私人位',
 '直接UPDATE不能修改通道启用状态');
select throws_ok($$select public.update_slot_settings(
 'test-settings-1','regular',null)$$,'P0001','车位设置参数无效',
 '启用参数不能为null');
select throws_ok($$select public.update_slot_settings(
 'test-settings-missing','regular',true)$$,'P0001','车位不存在',
 '不存在的车位不能修改');

insert into public.parking_sessions(slot_code,plate,billing_type)
 values ('test-settings-2','粤B20111','hourly');
insert into public.reservations(slot_code,guest_name)
 values ('test-settings-3','张女士');
insert into public.leases(slot_code,tenant_name,starts_on)
 values ('test-settings-4','李先生',current_date);

select throws_ok($$select public.update_slot_settings(
 'test-settings-2','private',false)$$,'P0001','车位正在使用，不能修改设置',
 '在场车辆阻止两个开关修改');
select throws_ok($$select public.update_slot_settings(
 'test-settings-3','private',false)$$,'P0001','车位正在使用，不能修改设置',
 '未关闭预留阻止两个开关修改');
select throws_ok($$select public.update_slot_settings(
 'test-settings-4','private',false)$$,'P0001','车位正在使用，不能修改设置',
 '在租长租阻止两个开关修改');
select throws_ok($$update public.slots set is_active=false
 where code='test-settings-2'$$,'P0001','车位正在使用，不能修改设置',
 '直接UPDATE也不能在有车时停用');
select throws_ok($$update public.slots set kind='private'
 where code='test-settings-3'$$,'P0001','车位正在使用，不能修改设置',
 '直接UPDATE也不能修改预留中的类型');
select throws_ok($$update public.slots set is_active=false
 where code='test-settings-4'$$,'P0001','车位正在使用，不能修改设置',
 '直接UPDATE也不能停用在租长租');
select ok((select is_active from public.slots where code='test-settings-2'),
 '冲突后原设置未改变');

set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000099';
select throws_ok($$select public.update_slot_settings(
 'test-settings-1','private',false)$$,'42501','无权操作',
 '非家庭账号无法执行RPC');
select is((select count(*) from public.slots where code='test-settings-1'),
 0::bigint,'非家庭账号无法读取车位事实');
-- migration / SQL Editor 使用 postgres 角色时没有 auth.uid()，仍可修改空闲车位。
reset role;
reset request.jwt.claim.sub;
select lives_ok($$update public.slots set kind='private'
 where code='test-settings-1'$$,
 'postgres 无 JWT 身份时可以直接修改空闲车位');

select * from finish();
rollback;
