begin;
select plan(20);

insert into public.slots(code,name,yard,kind,sort_order,is_active) values
 ('records-1','71号','outer','regular',701,true),
 ('records-2','72号','outer','regular',702,true),
 ('records-3','73号','outer','regular',703,true);
select ok(not has_function_privilege('anon','public.correct_session_plate(uuid,text)','execute'),
 '匿名用户不能改车牌');
select ok(not has_function_privilege('anon','public.correct_payment(uuid,int,public.payment_method)','execute'),
 '匿名用户不能改金额');
select ok(not has_function_privilege('anon','public.delete_payment(uuid)','execute'),
 '匿名用户不能删除收款');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000031';
insert into public.parking_sessions(slot_code,plate,billing_type) values
 ('records-1','粤B71001','hourly'),
 ('records-2','粤B72001','hourly'),
 ('records-3','粤B73001','hourly');
insert into public.payments(session_id,purpose,amount_cents,method,paid_until)
 select id,'prepay',3000,'cash',now()+interval '1 day'
 from public.parking_sessions where slot_code='records-1';
insert into public.payments(session_id,purpose,amount_cents,method)
 select id,'settlement',500,'wechat'
 from public.parking_sessions where slot_code='records-2';
select lives_ok($$select public.correct_session_plate(
 (select id from public.parking_sessions where slot_code='records-1'),'粤B·71002')$$,
 '在场记录可以更正车牌');
select is((select plate from public.parking_sessions where slot_code='records-1'),
 '粤B71002','车牌保留规范值');
select throws_ok($$select public.correct_session_plate(
 (select id from public.parking_sessions where slot_code='records-1'),'粤B72001')$$,
 'P0001','车牌已在场','在场车牌冲突被拒');
update public.parking_sessions set left_at=now() where slot_code='records-2';
select lives_ok($$select public.correct_session_plate(
 (select id from public.parking_sessions where slot_code='records-2'),'粤B71002')$$,
 '已离场记录允许与在场车牌相同');
select lives_ok($$select public.correct_payment(
 (select id from public.payments where purpose='settlement'),100,'alipay')$$,
 '已结算金额和收款方式可更正');
select results_eq($$select amount_cents,method::text from public.payments
 where purpose='settlement'$$,$$select 100,'alipay'::text$$,
 '更正后其余收款事实不变');
select throws_ok($$select public.correct_payment(
 (select id from public.payments where purpose='settlement'),0,'cash')$$,
 'P0001','金额或收款方式无效','零金额被拒');
select throws_ok($$select public.correct_payment(
 (select id from public.payments where purpose='settlement'),-2,'cash')$$,
 'P0001','金额或收款方式无效','负金额被拒');
select throws_ok($$select public.delete_payment(
 (select id from public.payments where purpose='prepay'))$$,
 'P0001','到期收款不能删除','在场到期收款不能删除');
update public.parking_sessions set left_at=now() where slot_code='records-1';
select throws_ok($$select public.delete_payment(
 (select id from public.payments where purpose='prepay'))$$,
 'P0001','到期收款不能删除','已离场的历史到期收款仍不能删除');
select lives_ok($$select public.delete_payment(
 (select id from public.payments where purpose='settlement'))$$,
 '结算收款可以删除');
select is((select count(*) from public.payments where purpose='settlement'),
 0::bigint,'结算收款确已删除');
insert into public.leases(slot_code,tenant_name,starts_on)
 values('records-3','测试租户','2026-01-01');
insert into public.payments(lease_id,purpose,amount_cents,method,paid_until)
 select id,'renewal',5000,'cash',now()+interval '30 days'
 from public.leases where slot_code='records-3';
select throws_ok($$select public.delete_payment(
 (select id from public.payments where lease_id is not null))$$,
 'P0001','到期收款不能删除','在租长租到期收款不能删除');
update public.leases set ended_on='2026-11-21' where slot_code='records-3';
select throws_ok($$select public.delete_payment(
 (select id from public.payments where lease_id is not null))$$,
 'P0001','到期收款不能删除','已退租长租的历史到期收款仍不能删除');
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000099';
select throws_ok($$select public.correct_session_plate(
 (select id from public.parking_sessions limit 1),'粤B00000')$$,
 '42501','无权操作','非家庭账号不能改车牌');
select throws_ok($$select public.correct_payment(
 '00000000-0000-4000-8000-000000000001',100,'cash')$$,
 '42501','无权操作','非家庭账号不能改金额');
select throws_ok($$select public.delete_payment(
 '00000000-0000-4000-8000-000000000001')$$,
 '42501','无权操作','非家庭账号不能删收款');
select * from finish();
rollback;
