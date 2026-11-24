-- 已离场的照片可按原有保留期限清理；在场记录始终至少保留一种识别信息。
alter table public.parking_sessions
  alter column plate drop not null,
  add column phone text check (phone ~ '^\+?[0-9]{6,20}$'),
  add constraint parking_sessions_active_identity_check
    check (left_at is not null or plate is not null or phone is not null or photo_path is not null);

drop function public.check_in_vehicle(
  text, text, public.billing_type, timestamptz, int, int, public.payment_method
);

-- 一次登记同时写入停车记录、酒店客预交收款与预留到场状态。
create function public.check_in_vehicle(
  p_slot_code text,
  p_plate text,
  p_billing_type public.billing_type,
  p_paid_until timestamptz default null,
  p_borrow_minutes int default null,
  p_amount_cents int default null,
  p_payment_method public.payment_method default null,
  p_phone text default null,
  p_photo_path text default null,
  p_session_id uuid default null
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_kind public.slot_kind;
  v_active boolean;
  v_plate text;
  v_phone text;
  v_lease_id uuid;
  v_session_id uuid;
  v_borrow_until timestamptz;
  v_other_slot text;
  v_constraint text;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode = '42501', detail = 'FAMILY_REQUIRED';
  end if;

  v_plate := nullif(pg_catalog.upper(pg_catalog.regexp_replace(
    coalesce(p_plate, ''), '[·[:space:]]', '', 'g'
  )), '');
  v_phone := nullif(pg_catalog.btrim(coalesce(p_phone, '')), '');
  if p_slot_code is null or p_billing_type is null
     or (v_plate is not null and pg_catalog.char_length(v_plate) not between 2 and 10)
     or (v_phone is not null and v_phone !~ '^\+?[0-9]{6,20}$')
     or (v_plate is null and v_phone is null and p_photo_path is null) then
    raise exception '登记参数无效' using errcode = 'P0001', detail = 'INVALID_INPUT';
  end if;

  -- 仅照片登记必须绑定已上传的私有存储对象，避免空白停车记录。
  if p_photo_path is not null and (
    p_session_id is null
    or p_photo_path !~ ('^[0-9]{4}/[0-9]{2}/' || p_session_id::text || '\.jpg$')
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'plate-photos' and name = p_photo_path
    )
  ) then
    raise exception '登记参数无效' using errcode = 'P0001', detail = 'INVALID_INPUT';
  end if;

  -- 同一车位与同一车牌的事务级锁，避免并发下先查后写的竞态。
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-slot:' || p_slot_code, 0)
  );
  if v_plate is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('check-in-plate:' || v_plate, 0)
    );
  end if;

  select kind, is_active into v_kind, v_active
    from public.slots where code = p_slot_code;
  if not found or not v_active then
    raise exception '车位不可用' using errcode = 'P0001', detail = 'SLOT_UNAVAILABLE';
  end if;

  if exists (select 1 from public.parking_sessions
             where slot_code = p_slot_code and left_at is null) then
    raise exception '车位已被登记' using errcode = 'P0001', detail = 'SLOT_OCCUPIED';
  end if;

  select s.name into v_other_slot
    from public.parking_sessions ps
    join public.slots s on s.code = ps.slot_code
    where ps.plate = v_plate and ps.left_at is null;
  if found then
    raise exception '车牌已在场' using errcode = 'P0001',
      detail = 'PLATE_PRESENT', hint = v_other_slot;
  end if;

  if v_kind = 'private' then
    if p_billing_type not in ('hourly', 'free')
       or p_borrow_minutes is null
       or p_borrow_minutes not in (10, 30) then
      raise exception '私人位只允许限时借用' using errcode = 'P0001',
        detail = 'INVALID_INPUT';
    end if;
    v_borrow_until := pg_catalog.now()
      + pg_catalog.make_interval(mins => p_borrow_minutes);
  elsif p_borrow_minutes is not null then
    raise exception '普通车位没有借用时长' using errcode = 'P0001',
      detail = 'INVALID_INPUT';
  end if;

  if p_billing_type = 'lease' then
    select id into v_lease_id from public.leases
      where slot_code = p_slot_code and ended_on is null;
    if not found then
      raise exception '车位没有在租长租' using errcode = 'P0001',
        detail = 'LEASE_UNAVAILABLE';
    end if;
  end if;

  if p_billing_type = 'hotel_daily' then
    if p_paid_until is null or p_paid_until <= pg_catalog.now()
       or p_amount_cents is null or p_amount_cents <= 0
       or p_payment_method is null then
      raise exception '酒店客收款参数无效' using errcode = 'P0001',
        detail = 'INVALID_INPUT';
    end if;
  elsif p_paid_until is not null or p_amount_cents is not null
        or p_payment_method is not null then
    raise exception '该计费方式不可预交收款' using errcode = 'P0001',
      detail = 'INVALID_INPUT';
  end if;

  insert into public.parking_sessions (
    id, slot_code, plate, phone, photo_path, billing_type, lease_id, borrow_until
  ) values (
    coalesce(p_session_id, gen_random_uuid()), p_slot_code, v_plate, v_phone,
    p_photo_path, p_billing_type, v_lease_id, v_borrow_until
  ) returning id into v_session_id;

  if p_billing_type = 'hotel_daily' then
    insert into public.payments (
      session_id, purpose, amount_cents, method, paid_until
    ) values (
      v_session_id, 'prepay', p_amount_cents, p_payment_method, p_paid_until
    );
  end if;

  update public.reservations
    set closed_at = pg_catalog.now(), outcome = 'arrived',
        session_id = v_session_id
    where slot_code = p_slot_code and closed_at is null;

  return v_session_id;
exception when unique_violation then
  get stacked diagnostics v_constraint = constraint_name;
  if v_constraint = 'parking_sessions_active_slot_idx' then
    raise exception '车位已被登记' using errcode = 'P0001', detail = 'SLOT_OCCUPIED';
  elsif v_constraint = 'parking_sessions_active_plate_idx' then
    select s.name into v_other_slot from public.parking_sessions ps
      join public.slots s on s.code = ps.slot_code
      where ps.plate = v_plate and ps.left_at is null;
    raise exception '车牌已在场' using errcode = 'P0001',
      detail = 'PLATE_PRESENT', hint = coalesce(v_other_slot, '');
  else
    raise;
  end if;
end;
$$;

revoke execute on function public.check_in_vehicle(
  text, text, public.billing_type, timestamptz, int, int,
  public.payment_method, text, text, uuid
) from public, anon;
grant execute on function public.check_in_vehicle(
  text, text, public.billing_type, timestamptz, int, int,
  public.payment_method, text, text, uuid
) to authenticated;
