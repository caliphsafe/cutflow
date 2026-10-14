-- CutFlow v2.7 — Cash App + Venmo deposit confirmation
-- Run once after the existing CutFlow v2 upgrade(s). Safe to run if the v2.6
-- external-payment tables were already created.

create extension if not exists pgcrypto;

-- Columns used by CutFlow's unified transaction ledger.
alter table public.transactions add column if not exists payment_method_label text not null default '';
alter table public.transactions add column if not exists occurred_at timestamptz not null default now();

create table if not exists public.external_payment_methods (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(id) on delete cascade,
  provider text not null check (provider in ('cash_app','venmo')),
  label text not null,
  account_handle text not null default '',
  payment_url text not null default '',
  notification_email text not null default '',
  forwarding_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  enabled boolean not null default true,
  email_confirmation_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barber_id, provider)
);

create table if not exists public.external_payment_intents (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_method_id uuid not null references public.external_payment_methods(id) on delete restrict,
  provider text not null,
  booking_code text not null,
  amount_cents integer not null check (amount_cents > 0),
  manage_url text not null default '',
  status text not null default 'pending' check (status in ('pending','paid','needs_review','expired','cancelled')),
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id)
);

create table if not exists public.external_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  inbound_email_id text not null unique,
  barber_id uuid not null references public.barber_profiles(id) on delete cascade,
  payment_method_id uuid references public.external_payment_methods(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  provider text not null,
  sender_email text not null default '',
  subject text not null default '',
  amount_cents integer,
  payer_name text,
  booking_code text,
  status text not null default 'received' check (status in ('received','matched','needs_review','ignored','rejected')),
  confidence integer not null default 0 check (confidence between 0 and 100),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- If the broader v2.6 prototype was tried, older provider rows are left intact for
-- historical records, but the v2.7 application exposes only Cash App and Venmo.

create index if not exists external_payment_methods_barber_idx on public.external_payment_methods(barber_id, enabled);
create index if not exists external_payment_intents_pending_idx on public.external_payment_intents(barber_id, status, expires_at);
create index if not exists external_payment_receipts_barber_idx on public.external_payment_receipts(barber_id, received_at desc);

alter table public.external_payment_methods enable row level security;
alter table public.external_payment_intents enable row level security;
alter table public.external_payment_receipts enable row level security;
