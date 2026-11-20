-- 续费撤销：仅可撤销十分钟内、且仍为该停车记录或长租最新的续费收款。
create function public.undo_renewal(p_payment_id uuid) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_latest_id uuid;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode = '42501', detail = 'FAMILY_REQUIRED';
  end if;

  select * into v_payment from public.payments
    where id = p_payment_id for update;
  if not found or v_payment.purpose <> 'renewal'
     or v_payment.paid_at < pg_catalog.now() - interval '10 minutes' then
    raise exception '已经不能撤销了' using errcode = 'P0001', detail = 'UNDO_UNAVAILABLE';
  end if;

  -- 锁住收款所属对象，避免撤销与后续收款插入交错执行。
  if v_payment.lease_id is not null then
    perform 1 from public.leases where id = v_payment.lease_id for update;
  else
    perform 1 from public.parking_sessions where id = v_payment.session_id for update;
  end if;

  select id into v_latest_id from public.payments
    where (v_payment.lease_id is not null and lease_id = v_payment.lease_id)
       or (v_payment.session_id is not null and session_id = v_payment.session_id)
    order by paid_at desc, created_at desc, id desc limit 1;
  if v_latest_id is distinct from p_payment_id then
    raise exception '已经不能撤销了' using errcode = 'P0001', detail = 'UNDO_UNAVAILABLE';
  end if;

  delete from public.payments where id = p_payment_id;
end;
$$;

-- 离场与结算收款共用一笔事务，所有时刻由数据库判定。
create function public.check_out_vehicle(
  p_session_id uuid,
  p_amount_cents int default null,
  p_payment_method public.payment_method default null
) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_session public.parking_sessions%rowtype;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode = '42501', detail = 'FAMILY_REQUIRED';
  end if;
  if (p_amount_cents is null) <> (p_payment_method is null)
     or (p_amount_cents is not null and p_amount_cents <= 0) then
    raise exception '离场收款参数无效' using errcode = 'P0001', detail = 'INVALID_INPUT';
  end if;

  -- 先取稳定键，再按登记进场相同顺序加锁，避免行锁与 advisory lock 反转。
  select * into v_session from public.parking_sessions where id = p_session_id;
  if not found then
    raise exception '停车记录不存在' using errcode = 'P0001', detail = 'SESSION_UNAVAILABLE';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-slot:' || v_session.slot_code, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-plate:' || v_session.plate, 0)
  );
  select * into v_session from public.parking_sessions
    where id = p_session_id for update;
  if not found then
    raise exception '停车记录不存在' using errcode = 'P0001', detail = 'SESSION_UNAVAILABLE';
  end if;
  if v_session.left_at is not null then
    raise exception '这辆车已经离场了' using errcode = 'P0001', detail = 'ALREADY_LEFT';
  end if;

  update public.parking_sessions set left_at = pg_catalog.now()
    where id = p_session_id;
  if p_amount_cents is not null then
    insert into public.payments (session_id, purpose, amount_cents, method)
      values (p_session_id, 'settlement', p_amount_cents, p_payment_method);
  end if;
end;
$$;

-- 撤销离场时由唯一索引阻止车位或车牌的冲突，绝不覆盖新登记。
create function public.undo_check_out(p_session_id uuid) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_session public.parking_sessions%rowtype;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode = '42501', detail = 'FAMILY_REQUIRED';
  end if;

  select * into v_session from public.parking_sessions where id = p_session_id;
  if not found then
    raise exception '已经不能撤销了' using errcode = 'P0001', detail = 'UNDO_UNAVAILABLE';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-slot:' || v_session.slot_code, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-plate:' || v_session.plate, 0)
  );
  select * into v_session from public.parking_sessions
    where id = p_session_id for update;
  if not found or v_session.left_at is null
     or v_session.left_at < pg_catalog.now() - interval '10 minutes' then
    raise exception '已经不能撤销了' using errcode = 'P0001', detail = 'UNDO_UNAVAILABLE';
  end if;

  delete from public.payments where session_id = p_session_id
    and purpose = 'settlement';
  update public.parking_sessions set left_at = null where id = p_session_id;
exception when unique_violation then
  raise exception '这个车位已经停了别的车，不能撤销'
    using errcode = 'P0001', detail = 'UNDO_OCCUPIED';
end;
$$;

revoke execute on function public.undo_renewal(uuid) from public, anon;
grant execute on function public.undo_renewal(uuid) to authenticated;
revoke execute on function public.check_out_vehicle(uuid,int,public.payment_method)
  from public, anon;
grant execute on function public.check_out_vehicle(uuid,int,public.payment_method)
  to authenticated;
revoke execute on function public.undo_check_out(uuid) from public, anon;
grant execute on function public.undo_check_out(uuid) to authenticated;
