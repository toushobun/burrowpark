-- 仅用于本地开发；凭据与 .env.example 中的本地默认值对应。
begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, recovery_token,
  email_change_token_new, email_change, phone, phone_change,
  phone_change_token, email_change_token_current, email_change_confirm_status,
  reauthentication_token, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  is_sso_user, is_anonymous, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000031',
  'authenticated', 'authenticated',
  'family@burrowpark.local', crypt('BurrowParkLocal!123456', gen_salt('bf')),
  now(), '', '', '', '', null, '', '', '', 0, '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  false, false, false, now(), now()
)
on conflict (id) do update
set email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    updated_at = excluded.updated_at;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values (
  '00000000-0000-4000-8000-000000000131',
  '00000000-0000-4000-8000-000000000031',
  '00000000-0000-4000-8000-000000000031',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000031',
    'email', 'family@burrowpark.local',
    'email_verified', true,
    'phone_verified', false
  ),
  'email', now(), now(), now()
)
on conflict (provider_id, provider) do update
set identity_data = excluded.identity_data, updated_at = excluded.updated_at;

insert into public.family_account (user_id)
values ('00000000-0000-4000-8000-000000000031')
on conflict (user_id) do nothing;

commit;
