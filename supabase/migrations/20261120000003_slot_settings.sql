-- 只向家庭账号开放车位类型与启用标志两列，不赋予修改车位主数据的权限。
grant update (kind, is_active) on public.slots to authenticated;
create policy slots_family_update on public.slots
  for update to authenticated using ((select public.is_family_account()))
  with check ((select public.is_family_account()));

-- 单表直接 UPDATE 和 RPC 必须遵守相同业务状态限制。
create function public.guard_slot_settings_change() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if new.kind is not distinct from old.kind and
     new.is_active is not distinct from old.is_active then
    return new;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-slot:' || old.code,0));
  if old.kind='aisle' or new.kind not in ('regular','private') then
    raise exception '只允许普通车位或私人位' using errcode='P0001',detail='INVALID_KIND';
  end if;
  if exists(select 1 from public.parking_sessions
      where slot_code=old.code and left_at is null)
     or exists(select 1 from public.reservations
      where slot_code=old.code and closed_at is null)
     or exists(select 1 from public.leases
      where slot_code=old.code and ended_on is null) then
    raise exception '车位正在使用，不能修改设置' using errcode='P0001',detail='SLOT_BUSY';
  end if;
  return new;
end;
$$;

create trigger slots_guard_settings before update of kind,is_active on public.slots
  for each row execute function public.guard_slot_settings_change();
revoke execute on function public.guard_slot_settings_change() from public,anon,authenticated;

-- 和登记进场、预留、建长租使用相同车位 advisory lock。
create function public.update_slot_settings(
  p_code text,
  p_kind public.slot_kind,
  p_is_active boolean
) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_slot public.slots%rowtype;
begin
  if not public.is_family_account() then
    raise exception '无权操作' using errcode='42501',detail='FAMILY_REQUIRED';
  end if;
  if p_code is null or p_kind is null or p_is_active is null
     or p_kind not in ('regular','private') then
    raise exception '车位设置参数无效' using errcode='P0001',detail='INVALID_KIND';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('check-in-slot:' || p_code,0));
  select * into v_slot from public.slots where code=p_code;
  if not found then
    raise exception '车位不存在' using errcode='P0001',detail='SLOT_UNAVAILABLE';
  end if;
  if v_slot.kind='aisle' then
    raise exception '通道车位不能修改' using errcode='P0001',detail='INVALID_KIND';
  end if;
  if v_slot.kind is not distinct from p_kind and
     v_slot.is_active is not distinct from p_is_active then
    return;
  end if;
  if exists(select 1 from public.parking_sessions
      where slot_code=p_code and left_at is null)
     or exists(select 1 from public.reservations
      where slot_code=p_code and closed_at is null)
     or exists(select 1 from public.leases
      where slot_code=p_code and ended_on is null) then
    raise exception '车位正在使用，不能修改设置' using errcode='P0001',detail='SLOT_BUSY';
  end if;
  update public.slots set kind=p_kind,is_active=p_is_active where code=p_code;
end;
$$;
revoke execute on function public.update_slot_settings(text,public.slot_kind,boolean)
  from public,anon;
grant execute on function public.update_slot_settings(text,public.slot_kind,boolean)
  to authenticated;
