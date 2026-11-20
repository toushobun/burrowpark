-- 长租创建和预交收款必须原子化，所有撤销时限由数据库时间判定。
create function public.create_lease(
  p_slot_code text, p_tenant_name text, p_phone text, p_plate text,
  p_starts_on date, p_note text, p_paid_until timestamptz,
  p_amount_cents int, p_payment_method public.payment_method
) returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_slot public.slots%rowtype;
  v_lease_id uuid;
  v_constraint text;
  v_paid_date date;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode = '42501', detail = 'FAMILY_REQUIRED';
  end if;
  if p_slot_code is null or pg_catalog.btrim(coalesce(p_tenant_name, '')) = ''
     or p_starts_on is null or p_paid_until is null or p_amount_cents is null
     or p_amount_cents <= 0 or p_payment_method is null
     or pg_catalog.char_length(coalesce(p_plate, '')) > 10 then
    raise exception '长租信息无效' using errcode = 'P0001', detail = 'INVALID_INPUT';
  end if;
  v_paid_date := (p_paid_until at time zone 'Asia/Shanghai')::date;
  if v_paid_date <= p_starts_on or
     p_paid_until is distinct from
       (((v_paid_date + 1)::timestamp at time zone 'Asia/Shanghai') - interval '1 second') then
    raise exception '长租到期日无效' using errcode = 'P0001', detail = 'INVALID_INPUT';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-slot:' || p_slot_code, 0));
  select * into v_slot from public.slots where code = p_slot_code;
  if not found or not v_slot.is_active or v_slot.kind <> 'regular' then
    raise exception '车位不可设长租' using errcode = 'P0001', detail = 'SLOT_UNAVAILABLE';
  end if;
  if exists(select 1 from public.leases where slot_code = p_slot_code and ended_on is null) then
    raise exception '这个车位已经有长租了' using errcode = 'P0001', detail = 'LEASE_EXISTS';
  end if;
  if exists(select 1 from public.parking_sessions where slot_code = p_slot_code and left_at is null)
     or exists(select 1 from public.reservations where slot_code = p_slot_code and closed_at is null) then
    raise exception '车位已被占用' using errcode = 'P0001', detail = 'SLOT_OCCUPIED';
  end if;
  insert into public.leases(slot_code, tenant_name, phone, plate, starts_on, note)
    values (p_slot_code, pg_catalog.btrim(p_tenant_name),
      nullif(pg_catalog.btrim(p_phone), ''),
      nullif(pg_catalog.btrim(p_plate), ''), p_starts_on,
      nullif(pg_catalog.btrim(p_note), ''))
    returning id into v_lease_id;
  insert into public.payments(lease_id,purpose,amount_cents,method,paid_until)
    values(v_lease_id,'prepay',p_amount_cents,p_payment_method,p_paid_until);
  return v_lease_id;
exception when unique_violation then
  get stacked diagnostics v_constraint = constraint_name;
  if v_constraint = 'leases_active_slot_idx' then
    raise exception '这个车位已经有长租了' using errcode = 'P0001', detail = 'LEASE_EXISTS';
  end if;
  raise;
end;
$$;

create function public.undo_create_lease(p_lease_id uuid) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_lease public.leases%rowtype;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode = '42501', detail = 'FAMILY_REQUIRED';
  end if;
  select * into v_lease from public.leases where id=p_lease_id;
  if not found then
    raise exception '已经不能撤销了' using errcode='P0001',detail='UNDO_UNAVAILABLE';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-slot:' || v_lease.slot_code,0));
  select * into v_lease from public.leases where id=p_lease_id for update;
  if not found or v_lease.ended_on is not null or
     v_lease.created_at < pg_catalog.now() - interval '10 minutes'
     or exists(select 1 from public.parking_sessions where lease_id=p_lease_id)
     or (select pg_catalog.count(*) from public.payments where lease_id=p_lease_id) <> 1
     or not exists(select 1 from public.payments where lease_id=p_lease_id and purpose='prepay') then
    raise exception '已经不能撤销了' using errcode='P0001',detail='UNDO_UNAVAILABLE';
  end if;
  delete from public.leases where id=p_lease_id;
end;
$$;

create function public.end_lease(p_lease_id uuid,p_ended_on date) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_lease public.leases%rowtype;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode='42501',detail='FAMILY_REQUIRED';
  end if;
  select * into v_lease from public.leases where id=p_lease_id;
  if not found then
    raise exception '长租不存在' using errcode='P0001',detail='LEASE_UNAVAILABLE';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-slot:' || v_lease.slot_code,0));
  select * into v_lease from public.leases where id=p_lease_id for update;
  if not found or v_lease.ended_on is not null or p_ended_on is null or
     p_ended_on < v_lease.starts_on then
    raise exception '退租日期无效' using errcode='P0001',detail='INVALID_INPUT';
  end if;
  if exists(select 1 from public.parking_sessions
    where lease_id=p_lease_id and left_at is null) then
    raise exception '长租车还在场，请先办离场' using errcode='P0001',detail='LEASE_VEHICLE_PRESENT';
  end if;
  update public.leases set ended_on=p_ended_on where id=p_lease_id;
end;
$$;

create function public.undo_end_lease(p_lease_id uuid) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_lease public.leases%rowtype;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode='42501',detail='FAMILY_REQUIRED';
  end if;
  select * into v_lease from public.leases where id=p_lease_id;
  if not found then
    raise exception '已经不能撤销了' using errcode='P0001',detail='UNDO_UNAVAILABLE';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-slot:' || v_lease.slot_code,0));
  select * into v_lease from public.leases where id=p_lease_id for update;
  if not found or v_lease.ended_on is null
    or v_lease.updated_at < pg_catalog.now() - interval '10 minutes'
    or exists(select 1 from public.leases where slot_code=v_lease.slot_code
      and ended_on is null) then
    raise exception '已经不能撤销了' using errcode='P0001',detail='UNDO_UNAVAILABLE';
  end if;
  update public.leases set ended_on=null where id=p_lease_id;
exception when unique_violation then
  raise exception '已经不能撤销了' using errcode='P0001',detail='UNDO_UNAVAILABLE';
end;
$$;

-- 预留使用单表插入；触发器加同一车位事务锁以防和登记进场竞态。
create function public.guard_open_reservation() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if new.closed_at is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('check-in-slot:' || new.slot_code,0));
    if not exists(select 1 from public.slots
      where code=new.slot_code and is_active and kind='regular')
      or exists(select 1 from public.parking_sessions where slot_code=new.slot_code and left_at is null)
      or exists(select 1 from public.leases where slot_code=new.slot_code and ended_on is null) then
      raise exception '车位不能预留' using errcode='P0001',detail='SLOT_UNAVAILABLE';
    end if;
  end if;
  return new;
end;
$$;
create trigger reservations_guard_open before insert on public.reservations
  for each row execute function public.guard_open_reservation();
revoke execute on function public.guard_open_reservation() from public,anon,authenticated;

create function public.undo_reservation(p_reservation_id uuid) returns void
language plpgsql security invoker set search_path = ''
as $$
declare v_reservation public.reservations%rowtype;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode='42501',detail='FAMILY_REQUIRED';
  end if;
  select * into v_reservation from public.reservations where id=p_reservation_id for update;
  if not found or v_reservation.closed_at is not null or
    v_reservation.created_at < pg_catalog.now()-interval '10 minutes' then
    raise exception '已经不能撤销了' using errcode='P0001',detail='UNDO_UNAVAILABLE';
  end if;
  delete from public.reservations where id=p_reservation_id;
end;
$$;

create function public.cancel_reservation(p_reservation_id uuid) returns void
language plpgsql security invoker set search_path = ''
as $
declare v_reservation public.reservations%rowtype;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode='42501',detail='FAMILY_REQUIRED';
  end if;
  select * into v_reservation from public.reservations where id=p_reservation_id for update;
  if not found or v_reservation.closed_at is not null then
    raise exception '预留已经关闭了' using errcode='P0001',detail='RESERVATION_UNAVAILABLE';
  end if;
  update public.reservations set closed_at=pg_catalog.now(),outcome='cancelled'
    where id=p_reservation_id;
end;
$;

create function public.undo_cancel_reservation(p_reservation_id uuid) returns void
language plpgsql security invoker set search_path = ''
as $$
declare v_reservation public.reservations%rowtype;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode='42501',detail='FAMILY_REQUIRED';
  end if;
  select * into v_reservation from public.reservations where id=p_reservation_id;
  if not found then
    raise exception '已经不能撤销了' using errcode='P0001',detail='UNDO_UNAVAILABLE';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-slot:' || v_reservation.slot_code,0));
  select * into v_reservation from public.reservations where id=p_reservation_id for update;
  if not found or v_reservation.outcome <> 'cancelled'
    or v_reservation.closed_at is null
    or v_reservation.closed_at < pg_catalog.now()-interval '10 minutes'
    or exists(select 1 from public.parking_sessions where slot_code=v_reservation.slot_code and left_at is null)
    or exists(select 1 from public.reservations where slot_code=v_reservation.slot_code
      and closed_at is null and id<>p_reservation_id) then
    raise exception '已经不能撤销了' using errcode='P0001',detail='UNDO_UNAVAILABLE';
  end if;
  update public.reservations set closed_at=null,outcome=null where id=p_reservation_id;
exception when unique_violation then
  raise exception '已经不能撤销了' using errcode='P0001',detail='UNDO_UNAVAILABLE';
end;
$$;

create function public.extend_borrow(p_session_id uuid,p_minutes int)
returns table(previous_borrow_until timestamptz,current_borrow_until timestamptz)
language plpgsql security invoker set search_path = ''
as $$
declare v_session public.parking_sessions%rowtype;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode='42501',detail='FAMILY_REQUIRED';
  end if;
  if p_minutes is null or p_minutes not in (10,30) then
    raise exception '借用时长无效' using errcode='P0001',detail='INVALID_INPUT';
  end if;
  select * into v_session from public.parking_sessions where id=p_session_id;
  if not found then
    raise exception '借用记录无效' using errcode='P0001',detail='SESSION_UNAVAILABLE';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-slot:' || v_session.slot_code,0));
  select ps.* into v_session from public.parking_sessions ps
    join public.slots s on s.code=ps.slot_code
    where ps.id=p_session_id and s.kind='private' and s.is_active and ps.left_at is null
      and ps.borrow_until is not null for update of ps;
  if not found then
    raise exception '借用记录无效' using errcode='P0001',detail='SESSION_UNAVAILABLE';
  end if;
  previous_borrow_until := v_session.borrow_until;
  current_borrow_until := greatest(v_session.borrow_until,pg_catalog.now())
    + pg_catalog.make_interval(mins=>p_minutes);
  update public.parking_sessions set borrow_until=current_borrow_until where id=p_session_id;
  return next;
end;
$$;

create function public.undo_extend_borrow(
  p_session_id uuid,p_previous timestamptz,p_expected_current timestamptz
) returns void language plpgsql security invoker set search_path = ''
as $$
declare v_session public.parking_sessions%rowtype;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode='42501',detail='FAMILY_REQUIRED';
  end if;
  select * into v_session from public.parking_sessions where id=p_session_id;
  if not found then
    raise exception '已经不能撤销了' using errcode='P0001',detail='UNDO_UNAVAILABLE';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-slot:' || v_session.slot_code,0));
  select * into v_session from public.parking_sessions where id=p_session_id for update;
  if not found or v_session.left_at is not null
    or v_session.borrow_until is distinct from p_expected_current
    or v_session.updated_at < pg_catalog.now()-interval '10 minutes'
    or p_previous is null then
    raise exception '已经不能撤销了' using errcode='P0001',detail='UNDO_UNAVAILABLE';
  end if;
  update public.parking_sessions set borrow_until=p_previous where id=p_session_id;
end;
$$;

revoke execute on function public.create_lease(text,text,text,text,date,text,timestamptz,int,public.payment_method) from public,anon;
grant execute on function public.create_lease(text,text,text,text,date,text,timestamptz,int,public.payment_method) to authenticated;
revoke execute on function public.undo_create_lease(uuid) from public,anon;
grant execute on function public.undo_create_lease(uuid) to authenticated;
revoke execute on function public.end_lease(uuid,date) from public,anon;
grant execute on function public.end_lease(uuid,date) to authenticated;
revoke execute on function public.undo_end_lease(uuid) from public,anon;
grant execute on function public.undo_end_lease(uuid) to authenticated;
revoke execute on function public.undo_reservation(uuid) from public,anon;
grant execute on function public.undo_reservation(uuid) to authenticated;
revoke execute on function public.undo_cancel_reservation(uuid) from public,anon;
grant execute on function public.undo_cancel_reservation(uuid) to authenticated;
revoke execute on function public.extend_borrow(uuid,int) from public,anon;
grant execute on function public.extend_borrow(uuid,int) to authenticated;
revoke execute on function public.undo_extend_borrow(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.undo_extend_borrow(uuid,timestamptz,timestamptz) to authenticated;
revoke execute on function public.cancel_reservation(uuid) from public,anon;
grant execute on function public.cancel_reservation(uuid) to authenticated;
