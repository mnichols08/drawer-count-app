create table if not exists public.drawer_kv (
  key text primary key check (char_length(key) between 1 and 200),
  value text not null,
  updated_at bigint not null
);

alter table public.drawer_kv enable row level security;

revoke all on table public.drawer_kv from anon, authenticated;
grant select, insert, update on table public.drawer_kv to service_role;

comment on table public.drawer_kv is
  'Shared Drawer Count sync values; accessed only by the Netlify Function.';
