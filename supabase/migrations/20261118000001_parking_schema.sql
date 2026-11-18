-- 车位显示状态由事实和当前时间推导，不在数据库保存。
create type public.yard as enum ('inner', 'outer');
create type public.slot_kind as enum ('regular', 'aisle', 'private');
create type public.billing_type as enum ('hotel_daily', 'hourly', 'lease', 'free');
create type public.payment_method as enum ('wechat', 'alipay', 'cash');
create type public.payment_purpose as enum ('prepay', 'renewal', 'settlement');
create type public.reservation_outcome as enum ('arrived', 'cancelled');

create table public.slots (
  code text primary key,
  name text not null,
  yard public.yard not null,
  kind public.slot_kind not null,
  sort_order int not null,
  is_active boolean not null default true
);

create table public.leases (
  id uuid primary key default gen_random_uuid(),
  slot_code text not null references public.slots (code) on delete restrict,
  tenant_name text not null,
  phone text,
  plate text,
  starts_on date not null,
  ended_on date check (ended_on >= starts_on),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index leases_active_slot_idx on public.leases (slot_code)
  where ended_on is null;

create table public.parking_sessions (
  id uuid primary key,
  slot_code text not null references public.slots (code) on delete restrict,
  plate text not null check (char_length(plate) between 2 and 10),
  billing_type public.billing_type not null,
  lease_id uuid references public.leases (id) on delete restrict,
  entered_at timestamptz not null default now(),
  left_at timestamptz check (left_at >= entered_at),
  borrow_until timestamptz,
  photo_path text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parking_sessions_lease_billing_check
    check ((billing_type = 'lease') = (lease_id is not null))
);
create unique index parking_sessions_active_slot_idx on public.parking_sessions (slot_code)
  where left_at is null;
create unique index parking_sessions_active_plate_idx on public.parking_sessions (plate)
  where left_at is null;

create table public.payments (
  id uuid primary key,
  session_id uuid references public.parking_sessions (id) on delete cascade,
  lease_id uuid references public.leases (id) on delete cascade,
  purpose public.payment_purpose not null,
  amount_cents int not null check (amount_cents > 0),
  method public.payment_method not null,
  paid_until timestamptz,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint payments_target_check check (num_nonnulls(session_id, lease_id) = 1)
);
create index payments_session_id_idx on public.payments (session_id);
create index payments_lease_id_idx on public.payments (lease_id);
create index payments_paid_at_idx on public.payments (paid_at);

create table public.reservations (
  id uuid primary key,
  slot_code text not null references public.slots (code) on delete restrict,
  guest_name text,
  note text,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  outcome public.reservation_outcome,
  session_id uuid references public.parking_sessions (id) on delete restrict,
  constraint reservations_close_check
    check ((closed_at is null) = (outcome is null))
);
create unique index reservations_open_slot_idx on public.reservations (slot_code)
  where closed_at is null;

create table public.pricing_settings (
  id boolean primary key default true check (id),
  hotel_daily_price_cents int not null,
  hotel_checkout_hour int not null check (hotel_checkout_hour between 0 and 23),
  hotel_previous_day_before_hour int not null
    check (hotel_previous_day_before_hour between 0 and 23),
  hourly_price_cents int not null,
  updated_at timestamptz not null default now()
);

-- 所有含 updated_at 的业务表复用同一触发器函数。
create function public.set_updated_at() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger leases_updated_at before update on public.leases
  for each row execute function public.set_updated_at();
create trigger parking_sessions_updated_at before update on public.parking_sessions
  for each row execute function public.set_updated_at();
create trigger pricing_settings_updated_at before update on public.pricing_settings
  for each row execute function public.set_updated_at();

insert into public.pricing_settings (
  hotel_daily_price_cents, hotel_checkout_hour,
  hotel_previous_day_before_hour, hourly_price_cents
) values (3000, 12, 6, 500);

-- 显式取消 anon 授权，并限制已登录账号只能执行各表允许的操作。
revoke all on public.slots, public.leases, public.parking_sessions,
  public.payments, public.reservations, public.pricing_settings
  from anon, authenticated;
grant select on public.slots to authenticated;
grant select, insert, update, delete on public.leases, public.parking_sessions,
  public.payments, public.reservations to authenticated;
grant select, update on public.pricing_settings to authenticated;

alter table public.slots enable row level security;
alter table public.leases enable row level security;
alter table public.parking_sessions enable row level security;
alter table public.payments enable row level security;
alter table public.reservations enable row level security;
alter table public.pricing_settings enable row level security;

create policy slots_family_select on public.slots
  for select to authenticated using ((select public.is_family_account()));

create policy leases_family_select on public.leases
  for select to authenticated using ((select public.is_family_account()));
create policy leases_family_insert on public.leases
  for insert to authenticated with check ((select public.is_family_account()));
create policy leases_family_update on public.leases
  for update to authenticated using ((select public.is_family_account()))
  with check ((select public.is_family_account()));
create policy leases_family_delete on public.leases
  for delete to authenticated using ((select public.is_family_account()));

create policy parking_sessions_family_select on public.parking_sessions
  for select to authenticated using ((select public.is_family_account()));
create policy parking_sessions_family_insert on public.parking_sessions
  for insert to authenticated with check ((select public.is_family_account()));
create policy parking_sessions_family_update on public.parking_sessions
  for update to authenticated using ((select public.is_family_account()))
  with check ((select public.is_family_account()));
create policy parking_sessions_family_delete on public.parking_sessions
  for delete to authenticated using ((select public.is_family_account()));

create policy payments_family_select on public.payments
  for select to authenticated using ((select public.is_family_account()));
create policy payments_family_insert on public.payments
  for insert to authenticated with check ((select public.is_family_account()));
create policy payments_family_update on public.payments
  for update to authenticated using ((select public.is_family_account()))
  with check ((select public.is_family_account()));
create policy payments_family_delete on public.payments
  for delete to authenticated using ((select public.is_family_account()));

create policy reservations_family_select on public.reservations
  for select to authenticated using ((select public.is_family_account()));
create policy reservations_family_insert on public.reservations
  for insert to authenticated with check ((select public.is_family_account()));
create policy reservations_family_update on public.reservations
  for update to authenticated using ((select public.is_family_account()))
  with check ((select public.is_family_account()));
create policy reservations_family_delete on public.reservations
  for delete to authenticated using ((select public.is_family_account()));

create policy pricing_settings_family_select on public.pricing_settings
  for select to authenticated using ((select public.is_family_account()));
create policy pricing_settings_family_update on public.pricing_settings
  for update to authenticated using ((select public.is_family_account()))
  with check ((select public.is_family_account()));

-- 照片存储桶为私有，仅家庭账号能访问此桶的对象。
insert into storage.buckets (id, name, public)
values ('plate-photos', 'plate-photos', false);

create policy plate_photos_family_select on storage.objects
  for select to authenticated
  using (bucket_id = 'plate-photos' and (select public.is_family_account()));
create policy plate_photos_family_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'plate-photos' and (select public.is_family_account()));
create policy plate_photos_family_update on storage.objects
  for update to authenticated
  using (bucket_id = 'plate-photos' and (select public.is_family_account()))
  with check (bucket_id = 'plate-photos' and (select public.is_family_account()));
create policy plate_photos_family_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'plate-photos' and (select public.is_family_account()));
