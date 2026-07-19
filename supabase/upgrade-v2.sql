-- CutFlow v2 Production Core upgrade
-- Run this once after the original schema.sql if your Supabase project already exists.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Barber publishing, processor selection and richer customer preferences
-- ---------------------------------------------------------------------------
alter table public.barber_profiles add column if not exists primary_payment_provider text check (primary_payment_provider in ('stripe','square','paypal'));
alter table public.barber_profiles add column if not exists storefront_published boolean not null default false;
alter table public.barber_profiles add column if not exists setup_completed_at timestamptz;
alter table public.barber_profiles add column if not exists allow_online_balance_payment boolean not null default true;
alter table public.barber_profiles add column if not exists allow_cash_payment boolean not null default true;

alter table public.barber_profiles add column if not exists profile_image_url text not null default '';
alter table public.barber_profiles add column if not exists cover_image_url text not null default '';
alter table public.barber_profiles add column if not exists shop_image_url text not null default '';
alter table public.barber_profiles add column if not exists logo_image_url text not null default '';
alter table public.barber_profiles add column if not exists gallery_image_urls text[] not null default '{}';
alter table public.services add column if not exists image_url text not null default '';
alter table public.products add column if not exists image_url text not null default '';


alter table public.clients add column if not exists hair_density text;
alter table public.clients add column if not exists scalp_sensitivity text;
alter table public.clients add column if not exists preferred_guard text;
alter table public.clients add column if not exists preferred_fade text;
alter table public.clients add column if not exists preferred_lineup text;
alter table public.clients add column if not exists preferred_beard text;
alter table public.clients add column if not exists enhancements_allowed boolean;
alter table public.clients add column if not exists razor_allowed boolean;
alter table public.clients add column if not exists marketing_consent boolean not null default false;
alter table public.clients add column if not exists sms_consent boolean not null default false;

alter table public.bookings add column if not exists payment_provider text check (payment_provider in ('stripe','square','paypal','cash','external'));
alter table public.bookings add column if not exists external_payment_session_id text;
alter table public.bookings add column if not exists reschedule_count integer not null default 0;
alter table public.bookings add column if not exists cancelled_by text;
alter table public.bookings add column if not exists deposit_disposition text not null default 'applied' check (deposit_disposition in ('applied','refundable','retained','refunded'));

alter table public.transactions add column if not exists provider text not null default 'manual';
alter table public.transactions add column if not exists provider_transaction_id text;
alter table public.transactions add column if not exists provider_payment_id text;
alter table public.transactions add column if not exists payment_method_type text;
alter table public.transactions add column if not exists payout_status text;
alter table public.transactions add column if not exists dispute_status text;

alter table public.notification_log add column if not exists manage_url text;
alter table public.notification_log add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.notification_log add column if not exists error_message text;
alter table public.notification_log add column if not exists attempt_count integer not null default 0;

-- ---------------------------------------------------------------------------
-- Booking policies and notification preferences
-- ---------------------------------------------------------------------------
create table if not exists public.booking_policies (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(id) on delete cascade unique,
  minimum_notice_minutes integer not null default 120 check (minimum_notice_minutes between 0 and 43200),
  max_advance_days integer not null default 60 check (max_advance_days between 1 and 365),
  cancellation_window_hours integer not null default 24 check (cancellation_window_hours between 0 and 720),
  reschedule_window_hours integer not null default 12 check (reschedule_window_hours between 0 and 720),
  max_reschedules integer not null default 2 check (max_reschedules between 0 and 10),
  same_day_booking boolean not null default true,
  auto_confirm_after_payment boolean not null default true,
  retain_late_cancellation_deposit boolean not null default true,
  retain_no_show_deposit boolean not null default true,
  require_customer_phone boolean not null default true,
  customer_cancellation_enabled boolean not null default true,
  customer_reschedule_enabled boolean not null default true,
  policy_text text not null default 'Your deposit reserves the appointment and is applied to your total. Please reschedule or cancel before the posted cutoff.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(id) on delete cascade unique,
  customer_confirmation_email boolean not null default true,
  customer_confirmation_sms boolean not null default false,
  reminder_24h_email boolean not null default true,
  reminder_24h_sms boolean not null default false,
  reminder_2h_sms boolean not null default false,
  barber_new_booking_email boolean not null default true,
  barber_new_booking_sms boolean not null default false,
  review_request_email boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Connected payment accounts. Secrets are encrypted by the application before
-- they enter Supabase and are never exposed by public/client queries.
-- ---------------------------------------------------------------------------
create table if not exists public.payment_connections (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(id) on delete cascade,
  provider text not null check (provider in ('stripe','square','paypal')),
  status text not null default 'pending' check (status in ('pending','connected','restricted','disconnected','error')),
  external_account_id text,
  external_merchant_id text,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  verification_status text not null default 'pending',
  capabilities jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barber_id, provider)
);

create table if not exists public.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete cascade,
  provider text not null check (provider in ('stripe','square','paypal')),
  purpose text not null check (purpose in ('deposit','service_balance','product')),
  external_session_id text,
  external_order_id text,
  external_payment_id text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  status text not null default 'created' check (status in ('created','pending','paid','failed','cancelled','expired','refunded')),
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe','square','paypal')),
  external_event_id text not null,
  event_type text not null,
  barber_id uuid references public.barber_profiles(id) on delete set null,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','failed')),
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, external_event_id)
);

create table if not exists public.customer_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '365 days'),
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  barber_id uuid references public.barber_profiles(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- One-time schedule exceptions support vacations, lunch blocks and special hours.
alter table public.blocked_times add column if not exists all_day boolean not null default false;
alter table public.blocked_times add column if not exists recurring_rule text;
alter table public.blocked_times add column if not exists block_type text not null default 'personal' check (block_type in ('personal','vacation','lunch','external_calendar','other'));

-- ---------------------------------------------------------------------------
-- Defaults, triggers and indexes
-- ---------------------------------------------------------------------------
create or replace function public.create_barber_v2_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.booking_policies (barber_id) values (new.id) on conflict (barber_id) do nothing;
  insert into public.notification_preferences (barber_id) values (new.id) on conflict (barber_id) do nothing;
  return new;
end;
$$;

drop trigger if exists barber_profiles_create_v2_defaults on public.barber_profiles;
create trigger barber_profiles_create_v2_defaults
after insert on public.barber_profiles
for each row execute function public.create_barber_v2_defaults();

insert into public.booking_policies (barber_id)
select id from public.barber_profiles
on conflict (barber_id) do nothing;

insert into public.notification_preferences (barber_id)
select id from public.barber_profiles
on conflict (barber_id) do nothing;

-- Keep timestamps fresh.
drop trigger if exists booking_policies_set_updated_at on public.booking_policies;
create trigger booking_policies_set_updated_at before update on public.booking_policies for each row execute function public.set_updated_at();
drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();
drop trigger if exists payment_connections_set_updated_at on public.payment_connections;
create trigger payment_connections_set_updated_at before update on public.payment_connections for each row execute function public.set_updated_at();
drop trigger if exists payment_sessions_set_updated_at on public.payment_sessions;
create trigger payment_sessions_set_updated_at before update on public.payment_sessions for each row execute function public.set_updated_at();

create index if not exists payment_connections_barber_idx on public.payment_connections(barber_id, provider, status);
create index if not exists payment_sessions_booking_idx on public.payment_sessions(booking_id, status);
create unique index if not exists payment_sessions_provider_external_idx on public.payment_sessions(provider, external_session_id) where external_session_id is not null;
create index if not exists portal_tokens_booking_idx on public.customer_portal_tokens(booking_id);
create index if not exists webhook_events_status_idx on public.webhook_events(provider, processing_status, received_at desc);
create unique index if not exists transactions_provider_transaction_idx on public.transactions(provider, provider_transaction_id) where provider_transaction_id is not null;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.booking_policies enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.payment_connections enable row level security;
alter table public.payment_sessions enable row level security;
alter table public.webhook_events enable row level security;
alter table public.customer_portal_tokens enable row level security;
alter table public.audit_log enable row level security;

do $$
declare policy_row record;
begin
  for policy_row in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('booking_policies','notification_preferences','payment_connections','payment_sessions','webhook_events','customer_portal_tokens','audit_log')
  loop
    execute format('drop policy if exists %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end $$;

create policy "Members manage booking policies" on public.booking_policies for all to authenticated
using (public.can_manage_barber(barber_id)) with check (public.can_manage_barber(barber_id));
create policy "Members manage notification preferences" on public.notification_preferences for all to authenticated
using (public.can_manage_barber(barber_id)) with check (public.can_manage_barber(barber_id));
create policy "Members read payment connection status" on public.payment_connections for select to authenticated
using (public.can_manage_barber(barber_id));
create policy "Members read payment sessions" on public.payment_sessions for select to authenticated
using (public.can_manage_barber(barber_id));
create policy "Members read audit logs" on public.audit_log for select to authenticated
using (barber_id is not null and public.can_manage_barber(barber_id));

-- Secret-bearing tables intentionally have no anon policies. Writes happen in
-- server routes through the Supabase service-role client.

notify pgrst, 'reload schema';

-- v2 reminder preferences: email and SMS reminders are only queued when the
-- barber enabled them and the customer consented to SMS.
create or replace function public.queue_booking_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
  current_count integer := 0;
begin
  insert into public.notification_log (barber_id, booking_id, channel, template_code, destination, status)
  select b.barber_id, b.id, 'email', 'customer_reminder_24h', b.customer_email, 'queued'
  from public.bookings b
  left join public.notification_preferences p on p.barber_id = b.barber_id
  where b.status in ('confirmed','checked_in')
    and b.starts_at >= now() + interval '23 hours'
    and b.starts_at < now() + interval '25 hours'
    and b.customer_email <> ''
    and coalesce(p.reminder_24h_email, true) = true
  on conflict (booking_id, template_code, destination) do nothing;
  get diagnostics current_count = row_count;
  inserted_count := inserted_count + current_count;

  insert into public.notification_log (barber_id, booking_id, channel, template_code, destination, status)
  select b.barber_id, b.id, 'sms', 'customer_reminder_24h', b.customer_phone, 'queued'
  from public.bookings b
  join public.clients c on c.id = b.client_id
  join public.notification_preferences p on p.barber_id = b.barber_id
  where b.status in ('confirmed','checked_in')
    and b.starts_at >= now() + interval '23 hours'
    and b.starts_at < now() + interval '25 hours'
    and b.customer_phone <> ''
    and p.reminder_24h_sms = true
    and c.sms_consent = true
  on conflict (booking_id, template_code, destination) do nothing;
  get diagnostics current_count = row_count;
  inserted_count := inserted_count + current_count;

  insert into public.notification_log (barber_id, booking_id, channel, template_code, destination, status)
  select b.barber_id, b.id, 'sms', 'customer_reminder_2h', b.customer_phone, 'queued'
  from public.bookings b
  join public.clients c on c.id = b.client_id
  join public.notification_preferences p on p.barber_id = b.barber_id
  where b.status in ('confirmed','checked_in')
    and b.starts_at >= now() + interval '105 minutes'
    and b.starts_at < now() + interval '135 minutes'
    and b.customer_phone <> ''
    and p.reminder_2h_sms = true
    and c.sms_consent = true
  on conflict (booking_id, template_code, destination) do nothing;
  get diagnostics current_count = row_count;
  inserted_count := inserted_count + current_count;
  return inserted_count;
end;
$$;

notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------------
-- Public storefront media. Uploads are restricted to the authenticated barber
-- whose UUID is the first folder segment in the object path.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cutflow-media', 'cutflow-media', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads CutFlow media" on storage.objects;
drop policy if exists "Barbers upload CutFlow media" on storage.objects;
drop policy if exists "Barbers update CutFlow media" on storage.objects;
drop policy if exists "Barbers delete CutFlow media" on storage.objects;

create policy "Public reads CutFlow media" on storage.objects for select to public
using (bucket_id = 'cutflow-media');

create policy "Barbers upload CutFlow media" on storage.objects for insert to authenticated
with check (
  bucket_id = 'cutflow-media'
  and exists (
    select 1 from public.barber_profiles b
    where b.id::text = (storage.foldername(name))[1]
      and public.can_manage_barber(b.id)
  )
);

create policy "Barbers update CutFlow media" on storage.objects for update to authenticated
using (
  bucket_id = 'cutflow-media'
  and exists (
    select 1 from public.barber_profiles b
    where b.id::text = (storage.foldername(name))[1]
      and public.can_manage_barber(b.id)
  )
)
with check (
  bucket_id = 'cutflow-media'
  and exists (
    select 1 from public.barber_profiles b
    where b.id::text = (storage.foldername(name))[1]
      and public.can_manage_barber(b.id)
  )
);

create policy "Barbers delete CutFlow media" on storage.objects for delete to authenticated
using (
  bucket_id = 'cutflow-media'
  and exists (
    select 1 from public.barber_profiles b
    where b.id::text = (storage.foldername(name))[1]
      and public.can_manage_barber(b.id)
  )
);
