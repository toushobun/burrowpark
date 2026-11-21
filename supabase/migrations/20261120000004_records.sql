-- 记录更正只更新事实字段；在场车辆和有效长租的到期收款不可删除。
create function public.correct_session_plate(p_session_id uuid, p_plate text)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_plate text;
  v_current public.parking_sessions%rowtype;
  v_other_slot text;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode='42501',detail='FAMILY_REQUIRED';
  end if;
  v_plate := pg_catalog.upper(pg_catalog.regexp_replace(coalesce(p_plate,''),'[·[:space:]]','','g'));
  if p_session_id is null or pg_catalog.char_length(v_plate) not between 2 and 10 then
    raise exception '车牌无效' using errcode='P0001',detail='INVALID_INPUT';
  end if;
  -- 与登记进场共享车牌事务锁，防止改车牌与登记并发。
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-plate:' || v_plate,0));
  select * into v_current from public.parking_sessions
    where id=p_session_id for update;
  if not found then
    raise exception '停车记录不存在' using errcode='P0001',detail='SESSION_UNAVAILABLE';
  end if;
  if v_current.left_at is null then
    select s.name into v_other_slot from public.parking_sessions ps
      join public.slots s on s.code=ps.slot_code
      where ps.plate=v_plate and ps.left_at is null and ps.id <> p_session_id;
    if found then
      raise exception '车牌已在场' using errcode='P0001',
        detail='PLATE_PRESENT',hint=v_other_slot;
    end if;
  end if;
  update public.parking_sessions set plate=v_plate where id=p_session_id;
exception when unique_violation then
  select s.name into v_other_slot from public.parking_sessions ps
    join public.slots s on s.code=ps.slot_code
    where ps.plate=v_plate and ps.left_at is null and ps.id <> p_session_id;
  raise exception '车牌已在场' using errcode='P0001',
    detail='PLATE_PRESENT',hint=coalesce(v_other_slot,'');
end;
$$;
revoke execute on function public.correct_session_plate(uuid,text) from public,anon;
grant execute on function public.correct_session_plate(uuid,text) to authenticated;

create function public.correct_payment(
  p_payment_id uuid, p_amount_cents int, p_method public.payment_method
) returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode='42501',detail='FAMILY_REQUIRED';
  end if;
  if p_payment_id is null or p_amount_cents is null or p_amount_cents <= 0
     or p_method is null then
    raise exception '金额或收款方式无效' using errcode='P0001',detail='INVALID_INPUT';
  end if;
  update public.payments set amount_cents=p_amount_cents,method=p_method
    where id=p_payment_id;
  if not found then
    raise exception '收款不存在' using errcode='P0001',detail='PAYMENT_UNAVAILABLE';
  end if;
end;
$$;
revoke execute on function public.correct_payment(uuid,int,public.payment_method)
  from public,anon;
grant execute on function public.correct_payment(uuid,int,public.payment_method)
  to authenticated;

create function public.delete_payment(p_payment_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode='42501',detail='FAMILY_REQUIRED';
  end if;
  if p_payment_id is null then
    raise exception '收款不存在' using errcode='P0001',detail='PAYMENT_UNAVAILABLE';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('payment-correction:' || p_payment_id::text,0));
  select * into v_payment from public.payments where id=p_payment_id for update;
  if not found then
    raise exception '收款不存在' using errcode='P0001',detail='PAYMENT_UNAVAILABLE';
  end if;
  if v_payment.paid_until is not null and (
    exists(select 1 from public.parking_sessions s
      where s.id=v_payment.session_id and s.left_at is null)
    or exists(select 1 from public.leases l
      where l.id=v_payment.lease_id and l.ended_on is null)
  ) then
    raise exception '到期收款不能删除' using errcode='P0001',detail='PAYMENT_LOCKED';
  end if;
  delete from public.payments where id=p_payment_id;
end;
$$;
revoke execute on function public.delete_payment(uuid) from public,anon;
grant execute on function public.delete_payment(uuid) to authenticated;
