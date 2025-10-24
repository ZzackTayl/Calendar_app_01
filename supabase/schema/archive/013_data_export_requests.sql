-- Migration 013: data_export_requests table with RLS

create table if not exists public.data_export_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  include_events boolean not null default true,
  include_contacts boolean not null default true,
  include_signals boolean not null default true,
  format text not null default 'json',
  status text not null default 'pending',
  download_url text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

alter table public.data_export_requests enable row level security;

-- Allow users to manage only their own export requests.
create policy data_export_requests_select
  on public.data_export_requests
  for select
  using (auth.uid() = user_id);

create policy data_export_requests_insert
  on public.data_export_requests
  for insert
  with check (auth.uid() = user_id);

create policy data_export_requests_update
  on public.data_export_requests
  for update
  using (auth.uid() = user_id);

create index if not exists data_export_requests_user_idx
  on public.data_export_requests (user_id);

create index if not exists data_export_requests_created_idx
  on public.data_export_requests (created_at);
