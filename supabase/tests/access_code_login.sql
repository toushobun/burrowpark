begin;
select plan(18);

-- 匿名角色既不可读取两张表，也不能执行三个 RPC。
set local role anon;
select is((select count(*) from public.family_account), 0::bigint, '匿名用户无法读取家庭账号');
select is((select count(*) from public.login_attempts), 0::bigint, '匿名用户无法读取登录尝试');
reset role;

select ok(not has_function_privilege('anon', 'public.is_family_account()', 'execute'), 'anon 不可执行家庭账号判断');
select ok(not has_function_privilege('anon', 'public.consume_login_attempt(text)', 'execute'), 'anon 不可增加登录尝试');
select ok(not has_function_privilege('anon', 'public.reset_login_attempts(text)', 'execute'), 'anon 不可清除登录尝试');
select ok(not has_function_privilege('authenticated', 'public.consume_login_attempt(text)', 'execute'), 'authenticated 不可增加登录尝试');
select ok(not has_function_privilege('authenticated', 'public.reset_login_attempts(text)', 'execute'), 'authenticated 不可清除登录尝试');
select ok(has_function_privilege('service_role', 'public.consume_login_attempt(text)', 'execute'), 'service_role 可执行计数');
select ok(has_function_privilege('service_role', 'public.reset_login_attempts(text)', 'execute'), 'service_role 可执行重置');

-- 模拟有身份的 PostgREST 连接，包含属于家庭以及不属于家庭两种状态。
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000032', true);
select is(public.is_family_account(), false, '非家庭账号不能访问');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000031', true);
select is(public.is_family_account(), true, '家庭账号身份判断为真');
reset role;

-- 第六次同 IP 尝试被锁定；全局第 31 次也被锁定。
truncate public.login_attempts;
select public.consume_login_attempt('ip:' || repeat('a', 64)) from generate_series(1, 5);
select is((select allowed from public.consume_login_attempt('ip:' || repeat('a', 64))), false, '同 IP 第六次尝试被锁定');
select ok((select retry_after_seconds from public.consume_login_attempt('ip:' || repeat('a', 64)) > 0), '锁定返回大于零的秒数');

truncate public.login_attempts;
select public.consume_login_attempt('ip:' || lpad(to_hex(i), 64, '0')) from generate_series(1, 30) as i;
select is((select allowed from public.consume_login_attempt('ip:' || repeat('f', 64))), false, '全局第 31 次尝试被锁定');

-- 窗口过期后重计数。
update public.login_attempts
  set window_started_at = now() - interval '2 hours', locked_until = now() - interval '1 hour';
select is((select allowed from public.consume_login_attempt('ip:' || repeat('f', 64))), true, '窗口过期后允许重试');

-- 重置一个 IP 时不能删除 global 或别的 IP。
truncate public.login_attempts;
select public.consume_login_attempt('ip:' || repeat('a', 64));
select public.consume_login_attempt('ip:' || repeat('b', 64));
select public.reset_login_attempts('ip:' || repeat('a', 64));
select is((select count(*) from public.login_attempts where key = 'ip:' || repeat('a', 64)), 0::bigint, '只删除指定 IP');
select is((select count(*) from public.login_attempts where key = 'global'), 1::bigint, '不清除 global');
select is((select count(*) from public.login_attempts where key = 'ip:' || repeat('b', 64)), 1::bigint, '不删除其他 IP');
select ok((select attempt_count = 2 from public.login_attempts where key = 'global'), 'global 计数没有归零');

select * from finish();
rollback;
