begin;
select plan(60);

insert into public.slots(code,name,yard,kind,sort_order,is_active) values
 ('test-lrb-1','31号','outer','regular',301,true),
 ('test-lrb-2','32号','outer','regular',302,true),
 ('test-lrb-3','33号','outer','regular',303,true),
 ('test-lrb-4','34号','outer','private',304,true),
 ('test-lrb-5','35号','outer','regular',305,true),
 ('test-lrb-6','36号','outer','regular',306,true);

select ok(not has_function_privilege('anon',
 'public.create_lease(text,text,text,text,date,text,timestamptz,int,public.payment_method)',
 'execute'),'匿名账号不能创建长租');
select ok(not has_function_privilege('anon','public.undo_create_lease(uuid)','execute'),'匿名账号不能撤销长租');
select ok(not has_function_privilege('anon','public.end_lease(uuid,date)','execute'),'匿名账号不能退租');
select ok(not has_function_privilege('anon','public.undo_end_lease(uuid)','execute'),'匿名账号不能撤销退租');
select ok(not has_function_privilege('anon','public.cancel_reservation(uuid)','execute'),'匿名账号不能取消预留');
select ok(not has_function_privilege('anon','public.undo_reservation(uuid)','execute'),'匿名账号不能撤销预留');
select ok(not has_function_privilege('anon','public.undo_cancel_reservation(uuid)','execute'),'匿名账号不能撤销取消预留');
select ok(not has_function_privilege('anon','public.extend_borrow(uuid,int)','execute'),'匿名账号不能延长借用');
select ok(not has_function_privilege('anon',
 'public.undo_extend_borrow(uuid,timestamptz,timestamptz)','execute'),'匿名账号不能撤销延长借用');

set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000031';

select lives_ok($$select public.create_lease(
 'test-lrb-1','王先生','13800000000','粤B10001',current_date,'每月缴费',
 (((current_date+31)::timestamp at time zone 'Asia/Shanghai')-interval '1 second'),
 20000,'wechat')$$,'建立长租与首笔预交成功');
select is((select count(*) from public.payments where purpose='prepay' and lease_id =
 (select id from public.leases where slot_code='test-lrb-1')),1::bigint,
 '创建时原子插入一笔预交');
select ok((select paid_until at time zone 'Asia/Shanghai' =
  ((current_date+31)::timestamp - interval '1 second')
 from public.payments where lease_id =
 (select id from public.leases where slot_code='test-lrb-1')),
 '预交截至上海时间23:59:59');
select throws_ok($$select public.create_lease(
 'test-lrb-1','李先生',null,null,current_date,null,
 (((current_date+31)::timestamp at time zone 'Asia/Shanghai')-interval '1 second'),
 10000,'cash')$$,'P0001','这个车位已经有长租了','重复长租拒绝');
select throws_ok($$select public.create_lease(
 'test-lrb-4','私人租户',null,null,current_date,null,
 (((current_date+31)::timestamp at time zone 'Asia/Shanghai')-interval '1 second'),
 10000,'cash')$$,'P0001','车位不可设长租','私人位不能设长租');
select throws_ok($$select public.create_lease(
 'test-lrb-2','未付款',null,null,current_date,null,null,10000,'cash')$$,
 'P0001','长租信息无效','首笔交到日必须填写');
select throws_ok($$select public.create_lease(
 'test-lrb-2','日期无效',null,null,current_date,null,
 (((current_date+1)::timestamp at time zone 'Asia/Shanghai')-interval '1 second'),
 10000,'cash')$$,'P0001','长租到期日无效','交到日期必须晚于起租日');
select throws_ok($$select public.end_lease(
 (select id from public.leases where slot_code='test-lrb-1'),current_date-1)$$,
 'P0001','退租日期无效','退租日期不得早于起租日');

insert into public.parking_sessions(slot_code,plate,billing_type,lease_id)
select 'test-lrb-1','粤B10001','lease',id from public.leases where slot_code='test-lrb-1';
select throws_ok($$select public.end_lease(
 (select id from public.leases where slot_code='test-lrb-1'),current_date)$$,
 'P0001','长租车还在场，请先办离场','在场长租车禁止退租');
select throws_ok($$select public.undo_create_lease(
 (select id from public.leases where slot_code='test-lrb-1'))$$,
 'P0001','已经不能撤销了','关联停车记录后禁止撤销建立长租');
update public.parking_sessions set left_at=now() where slot_code='test-lrb-1';
select lives_ok($$select public.end_lease(
 (select id from public.leases where slot_code='test-lrb-1'),current_date)$$,'办理退租成功');
select ok((select ended_on is not null from public.leases where slot_code='test-lrb-1'),
 '退租日期已记录');
select lives_ok($$select public.undo_end_lease(
 (select id from public.leases where slot_code='test-lrb-1'))$$,'十分钟内可以撤销退租');
select ok((select ended_on is null from public.leases where slot_code='test-lrb-1'),
 '撤销退租后恢复在租');

select lives_ok($$select public.create_lease(
 'test-lrb-2','新租户',null,null,current_date,null,
 (((current_date+31)::timestamp at time zone 'Asia/Shanghai')-interval '1 second'),
 3000,'cash')$$,'另一车位建立长租成功');
select lives_ok($$select public.undo_create_lease(
 (select id from public.leases where slot_code='test-lrb-2'))$$,'十分钟内撤销没有后续记录的长租');
select is((select count(*) from public.payments where lease_id in
 (select id from public.leases where slot_code='test-lrb-2')),0::bigint,
 '撤销建立后收款级联删除');
select is((select count(*) from public.leases where slot_code='test-lrb-2'),0::bigint,
 '撤销建立后长租硬删除');

select lives_ok($$select public.create_lease(
 'test-lrb-6','旧租户',null,null,current_date,null,
 (((current_date+31)::timestamp at time zone 'Asia/Shanghai')-interval '1 second'),
 3000,'cash')$$,'准备建立超过撤销时限的长租');
update public.leases set created_at=now()-interval '11 minutes'
 where slot_code='test-lrb-6';
select throws_ok($$select public.undo_create_lease(
 (select id from public.leases where slot_code='test-lrb-6'))$$,
 'P0001','已经不能撤销了','超过十分钟不能撤销建立长租');


insert into public.reservations(slot_code,guest_name,note)
values ('test-lrb-2','张女士','晚上到');
select throws_ok($$insert into public.reservations(slot_code)
 values('test-lrb-2')$$,'23505',
 'duplicate key value violates unique constraint "reservations_open_slot_idx"',
 '同车位第二个未关闭预留被唯一索引拒绝');
select throws_ok($$insert into public.reservations(slot_code)
 values('test-lrb-1')$$,'P0001','车位不能预留','有长租不能预留');
select lives_ok($$select public.cancel_reservation(
 (select id from public.reservations where slot_code='test-lrb-2'))$$,'取消预留');
select is((select outcome::text from public.reservations where slot_code='test-lrb-2'),
 'cancelled','取消时标记 cancelled');
select throws_ok($$select public.cancel_reservation(
 (select id from public.reservations where slot_code='test-lrb-2'))$$,
 'P0001','预留已经关闭了','已经关闭的预留不能重复取消');

select lives_ok($$select public.create_lease(
 'test-lrb-2','新承租人',null,null,current_date,null,
 (((current_date+31)::timestamp at time zone 'Asia/Shanghai')-interval '1 second'),
 3000,'cash')$$,'预留取消后可以建立新长租');
select throws_ok($$select public.undo_cancel_reservation(
 (select id from public.reservations where slot_code='test-lrb-2'))$$,
 'P0001','已经不能撤销了','新长租生效后不能恢复已取消预留');
select lives_ok($$select public.undo_create_lease(
 (select id from public.leases where slot_code='test-lrb-2'))$$,
 '撤销新长租后可以重新恢复预留');
select lives_ok($$select public.undo_cancel_reservation(
 (select id from public.reservations where slot_code='test-lrb-2'))$$,'十分钟内撤销取消预留');
select ok((select closed_at is null from public.reservations where slot_code='test-lrb-2'),
 '撤销取消后预留重新开放');
select lives_ok($$select public.undo_reservation(
 (select id from public.reservations where slot_code='test-lrb-2'))$$,'十分钟内可撤销刚建的预留');
select is((select count(*) from public.reservations where slot_code='test-lrb-2'),
 0::bigint,'撤销预留后硬删除');

insert into public.reservations(slot_code,created_at) values
 ('test-lrb-2',now()-interval '11 minutes');
select throws_ok($$select public.undo_reservation(
 (select id from public.reservations where slot_code='test-lrb-2'))$$,
 'P0001','已经不能撤销了','预留建立超过十分钟不能撤销');
select lives_ok($$select public.cancel_reservation(
 (select id from public.reservations where slot_code='test-lrb-2'))$$,'过期预留仍可取消');
update public.reservations set closed_at=now()-interval '11 minutes'
 where slot_code='test-lrb-2';
select throws_ok($$select public.undo_cancel_reservation(
 (select id from public.reservations where slot_code='test-lrb-2'))$$,
 'P0001','已经不能撤销了','取消超过十分钟不能撤销');

insert into public.parking_sessions(slot_code,plate,billing_type,borrow_until)
values ('test-lrb-4','粤B40004','free',now()+interval '5 minutes');
select results_eq($$select previous_borrow_until < current_borrow_until
  from public.extend_borrow((select id from public.parking_sessions
  where slot_code='test-lrb-4'),10)$$,
 $$select true$$,'未超时借用延长十分钟');
select ok((select borrow_until > now()+interval '14 minutes'
 from public.parking_sessions where slot_code='test-lrb-4'),'从原结束时刻顺延');
select lives_ok($$select public.undo_extend_borrow(
 (select id from public.parking_sessions where slot_code='test-lrb-4'),
 (select borrow_until - interval '10 minutes' from public.parking_sessions where slot_code='test-lrb-4'),
 (select borrow_until from public.parking_sessions where slot_code='test-lrb-4'))$$,
 '借用延长十分钟内可撤销');
update public.parking_sessions set borrow_until=now()-interval '5 minutes'
 where slot_code='test-lrb-4';
select results_eq($$select current_borrow_until > now()+interval '29 minutes'
  from public.extend_borrow((select id from public.parking_sessions
  where slot_code='test-lrb-4'),30)$$,
 $$select true$$,'已经超时后从数据库当前时间重新借三十分钟');
select throws_ok($$select public.undo_extend_borrow(
 (select id from public.parking_sessions where slot_code='test-lrb-4'),
 now()-interval '5 minutes',now()+interval '15 minutes')$$,
 'P0001','已经不能撤销了','当前借到时间不匹配不能撤销');
select throws_ok($$select * from public.extend_borrow(
 (select id from public.parking_sessions where slot_code='test-lrb-4'),20)$$,
 'P0001','借用时长无效','不支持20分钟');
select throws_ok($$select * from public.extend_borrow(
 (select id from public.parking_sessions where slot_code='test-lrb-1'),10)$$,
 'P0001','借用记录无效','普通车位不能再借');

set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000099';
select throws_ok($$select public.create_lease(
 'test-lrb-6','无权',null,null,current_date,null,
 (((current_date+31)::timestamp at time zone 'Asia/Shanghai')-interval '1 second'),
 10000,'cash')$$,'42501','无权操作','非家庭账号不能创建长租');
select throws_ok($$select public.undo_create_lease(
 '00000000-0000-4000-8000-000000000001'::uuid)$$,'42501','无权操作',
 '非家庭账号不能撤销创建长租');
select throws_ok($$select public.end_lease(
 '00000000-0000-4000-8000-000000000001'::uuid,current_date)$$,'42501','无权操作',
 '非家庭账号不能退租');
select throws_ok($$select public.undo_end_lease(
 '00000000-0000-4000-8000-000000000001'::uuid)$$,'42501','无权操作',
 '非家庭账号不能撤销退租');
select throws_ok($$select public.cancel_reservation(
 '00000000-0000-4000-8000-000000000001'::uuid)$$,'42501','无权操作',
 '非家庭账号不能取消预留');
select throws_ok($$select public.undo_reservation(
 '00000000-0000-4000-8000-000000000001'::uuid)$$,'42501','无权操作',
 '非家庭账号不能撤销预留');
select throws_ok($$select public.undo_cancel_reservation(
 '00000000-0000-4000-8000-000000000001'::uuid)$$,'42501','无权操作',
 '非家庭账号不能撤销取消预留');
select throws_ok($$select * from public.extend_borrow(
 '00000000-0000-4000-8000-000000000001'::uuid,10)$$,'42501','无权操作',
 '非家庭账号不能再借');
select throws_ok($$select public.undo_extend_borrow(
 '00000000-0000-4000-8000-000000000001'::uuid,now(),now())$$,
 '42501','无权操作','非家庭账号不能撤销再借');

select * from finish();
rollback;
