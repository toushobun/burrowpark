-- 家庭账号是唯一允许访问后续业务表的身份。
create table public.family_account (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.family_account enable row level security;

create function public.is_family_account() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.family_account where user_id = (select auth.uid())
  );
$$;
revoke execute on function public.is_family_account() from public, anon;
grant execute on function public.is_family_account() to authenticated;

-- 不建立 RLS policy；只有 service_role 的 SECURITY DEFINER RPC 能访问计数。
create table public.login_attempts (
  key text primary key,
  attempt_count int not null,
  window_started_at timestamptz not null,
  locked_until timestamptz
);
alter table public.login_attempts enable row level security;

-- 单一事务级锁串行化所有尝试，避免在不同 IP 的全局计数上发生并发漏算。
create function public.consume_login_attempt(p_ip_key text)
  returns table (allowed boolean, retry_after_seconds int)
  language plpgsql security definer set search_path = ''
as $$
declare
  v_now timestamptz;
  v_key text;
  v_count int;
  v_started timestamptz;
  v_locked_until timestamptz;
  v_window interval;
  v_limit int;
  v_retry int := 0;
begin
  if p_ip_key is null or p_ip_key !~ '^ip:[0-9a-f]{64}$' then
    raise exception 'invalid ip key' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731205::bigint);
  v_now := pg_catalog.clock_timestamp();

  -- 阈值：同 IP 15 分钟 5 次锁 15 分钟；全局 1 小时 30 次锁 1 小时。
  -- 先处理 IP，已锁定的 IP 不消耗全局额度。
  foreach v_key in array array[p_ip_key, 'global'] loop
    if v_key = 'global' then
      v_window := interval '1 hour';
      v_limit := 30;
    else
      v_window := interval '15 minutes';
      v_limit := 5;
    end if;

    insert into public.login_attempts (key, attempt_count, window_started_at)
      values (v_key, 0, v_now)
      on conflict (key) do nothing;

    select attempt_count, window_started_at, locked_until
      into v_count, v_started, v_locked_until
      from public.login_attempts
      where key = v_key
      for update;

    if v_started + v_window <= v_now
       and (v_locked_until is null or v_locked_until <= v_now) then
      v_count := 0;
      v_started := v_now;
      v_locked_until := null;
    end if;

    v_count := v_count + 1;
    if v_locked_until is null or v_locked_until <= v_now then
      v_locked_until := case
        when v_count > v_limit then v_now + v_window
        else null
      end;
    end if;

    update public.login_attempts
      set attempt_count = v_count,
          window_started_at = v_started,
          locked_until = v_locked_until
      where key = v_key;

    if v_locked_until > v_now then
      v_retry := greatest(
        v_retry,
        pg_catalog.ceil(
          extract(epoch from (v_locked_until - v_now))
        )::int
      );
    end if;

    if v_key = p_ip_key and v_retry > 0 then
      return query select false, v_retry;
      return;
    end if;
  end loop;

  return query select (v_retry = 0), v_retry;
end;
$$;

create function public.reset_login_attempts(p_ip_key text)
  returns void
  language plpgsql security definer set search_path = ''
as $$
begin
  if p_ip_key is null or p_ip_key !~ '^ip:[0-9a-f]{64}$' then
    raise exception 'invalid ip key' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731205::bigint);
  delete from public.login_attempts where key = p_ip_key;
end;
$$;

revoke execute on function public.consume_login_attempt(text) from public, anon, authenticated;
revoke execute on function public.reset_login_attempts(text) from public, anon, authenticated;
grant execute on function public.consume_login_attempt(text) to service_role;
grant execute on function public.reset_login_attempts(text) to service_role;
