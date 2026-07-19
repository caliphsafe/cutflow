-- CutFlow 43 Build
-- Multi-tenant booking, client memory, direct payment records, retail pickup,
-- SaaS subscriptions and tax-ready reporting for barbers.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Core tenant and subscription records
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','manager','barber','front_desk','accountant')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade unique,
  plan_code text not null default 'pro' check (plan_code in ('starter','pro','studio')),
  status text not null default 'trialing',
  trial_ends_at timestamptz default (now() + interval '14 days'),
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Barber profiles and booking configuration
-- ---------------------------------------------------------------------------
create table if not exists public.barber_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  assigned_user_id uuid references auth.users(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null,
  shop_name text not null,
  headline text not null default 'Precision cuts. Clear booking. Your preferences remembered.',
  bio text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  city text not null default '',
  timezone text not null default 'America/New_York',
  accent_color text not null default '#d8ff5f',
  booking_deposit_cents integer not null default 1000 check (booking_deposit_cents >= 0),
  cancellation_window_hours integer not null default 24 check (cancellation_window_hours >= 0),
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 120),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 120),
  accepting_bookings boolean not null default true,
  active boolean not null default true,
  stripe_account_id text unique,
  stripe_connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time,
  end_time time,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((active = false) or (start_time is not null and end_time is not null and start_time < end_time)),
  unique (barber_id, weekday)
);

create table if not exists public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default 'Blocked',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  category text not null default 'Haircut',
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_add_ons (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null,
  duration_minutes integer not null default 0,
  price_cents integer not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Clients, preference memory and appointment records
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null default '',
  phone_normalized text not null default '',
  hair_texture text,
  preferred_style text,
  allergies text not null default '',
  private_notes text not null default '',
  communication_preference text not null default 'email' check (communication_preference in ('email','sms','both','none')),
  last_haircut_request jsonb not null default '{}'::jsonb,
  visit_count integer not null default 0,
  lifetime_value_cents integer not null default 0,
  last_visit_at timestamptz,
  first_visit_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barber_id, email)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  booking_code text not null unique,
  appointment_date date not null,
  appointment_time time not null,
  starts_at timestamptz,
  ends_at timestamptz,
  deposit_expires_at timestamptz not null default (now() + interval '15 minutes'),
  timezone text not null default 'America/New_York',
  duration_minutes integer not null check (duration_minutes > 0),
  status text not null default 'pending_deposit' check (status in ('pending_deposit','confirmed','checked_in','completed','cancelled','no_show')),
  payment_status text not null default 'deposit_due' check (payment_status in ('deposit_due','deposit_paid','paid','partially_refunded','refunded')),
  service_total_cents integer not null default 0,
  product_total_cents integer not null default 0,
  tip_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null default 0,
  deposit_cents integer not null default 1000,
  balance_cents integer not null default 0,
  refund_total_cents integer not null default 0,
  haircut_request jsonb not null default '{}'::jsonb,
  product_ids uuid[] not null default '{}',
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null default '',
  customer_notes text not null default '',
  barber_notes text not null default '',
  cancellation_reason text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  deposit_paid_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pickup retail and recommendations
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  taxable boolean not null default true,
  inventory_quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  texture_tags text[] not null default '{}',
  service_tags uuid[] not null default '{}',
  style_tags text[] not null default '{}',
  pickup_only boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_reservations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null,
  status text not null default 'reserved' check (status in ('reserved','picked_up','cancelled','refunded')),
  created_at timestamptz not null default now(),
  unique (booking_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Unified financial ledger
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references public.barber_profiles(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  stripe_account_id text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_event_id text unique,
  type text not null check (type in ('deposit','service_balance','product','tip','cash','refund','adjustment')),
  status text not null default 'paid' check (status in ('pending','paid','failed','refunded','partially_refunded')),
  gross_cents integer not null default 0,
  tax_cents integer not null default 0,
  processor_fee_cents integer not null default 0,
  platform_fee_cents integer not null default 0 check (platform_fee_cents = 0),
  refund_cents integer not null default 0,
  net_cents integer not null default 0,
  payment_method_label text not null default '',
  description text not null default '',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references public.barber_profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  channel text not null check (channel in ('email','sms','push')),
  template_code text not null,
  destination text not null,
  status text not null default 'queued' check (status in ('queued','sent','delivered','failed')),
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- Reserve pickup inventory while the deposit checkout holds the appointment.
create or replace function public.adjust_product_inventory_for_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'reserved' then
    update public.products
    set inventory_quantity = inventory_quantity - new.quantity,
        updated_at = now()
    where id = new.product_id
      and inventory_quantity >= new.quantity;
    if not found then
      raise exception 'Product is out of stock';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'reserved' and new.status in ('cancelled','refunded') then
    update public.products
    set inventory_quantity = inventory_quantity + old.quantity,
        updated_at = now()
    where id = old.product_id;
    return new;
  end if;

  if tg_op = 'DELETE' and old.status = 'reserved' then
    update public.products
    set inventory_quantity = inventory_quantity + old.quantity,
        updated_at = now()
    where id = old.product_id;
    return old;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists product_reservations_adjust_inventory on public.product_reservations;
create trigger product_reservations_adjust_inventory
after insert or update or delete on public.product_reservations
for each row execute function public.adjust_product_inventory_for_reservation();

-- ---------------------------------------------------------------------------
-- Helpers and automated bookkeeping
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_organization_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and active = true
  );
$$;

create or replace function public.can_manage_barber(p_barber_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.barber_profiles b
    join public.organization_members m on m.organization_id = b.organization_id
    where b.id = p_barber_id
      and m.user_id = auth.uid()
      and m.active = true
      and m.role in ('owner','manager','barber','front_desk','accountant')
  );
$$;

-- Keep reruns compatible with earlier CutFlow schema versions.
alter table public.clients add column if not exists phone_normalized text not null default '';
alter table public.transactions add column if not exists stripe_event_id text;
alter table public.bookings add column if not exists starts_at timestamptz;
alter table public.bookings add column if not exists ends_at timestamptz;
alter table public.bookings add column if not exists deposit_expires_at timestamptz not null default (now() + interval '15 minutes');
alter table public.bookings add column if not exists refund_total_cents integer not null default 0;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_stripe_checkout_session_id_key') then
    alter table public.transactions add constraint transactions_stripe_checkout_session_id_key unique (stripe_checkout_session_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_stripe_event_id_key') then
    alter table public.transactions add constraint transactions_stripe_event_id_key unique (stripe_event_id);
  end if;
end $$;

create or replace function public.complete_booking_accounting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at = coalesce(new.completed_at, now());
    update public.clients
    set visit_count = visit_count + 1,
        lifetime_value_cents = lifetime_value_cents + greatest(new.total_cents - new.refund_total_cents, 0),
        last_visit_at = now(),
        first_visit_at = coalesce(first_visit_at, now()),
        last_haircut_request = new.haircut_request,
        updated_at = now()
    where id = new.client_id;
  end if;
  return new;
end;
$$;

-- Build exact appointment timestamps in the barber's configured timezone.
create or replace function public.set_booking_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.starts_at = ((new.appointment_date + new.appointment_time) at time zone new.timezone);
  new.ends_at = new.starts_at + make_interval(mins => new.duration_minutes);
  return new;
end;
$$;

-- Release unpaid reservations after the checkout hold expires.
create or replace function public.expire_unpaid_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.bookings
  set status = 'cancelled',
      cancellation_reason = 'Deposit checkout expired',
      cancelled_at = now(),
      updated_at = now()
  where status = 'pending_deposit'
    and payment_status = 'deposit_due'
    and deposit_expires_at < now();
  get diagnostics v_count = row_count;

  update public.product_reservations pr
  set status = 'cancelled'
  where pr.status = 'reserved'
    and exists (
      select 1 from public.bookings b
      where b.id = pr.booking_id
        and b.status = 'cancelled'
        and b.cancellation_reason = 'Deposit checkout expired'
    );

  return v_count;
end;
$$;

-- Prevent two active appointments from occupying the same chair time.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_no_active_overlap') then
    alter table public.bookings
      add constraint bookings_no_active_overlap
      exclude using gist (
        barber_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status in ('pending_deposit','confirmed','checked_in'));
  end if;
end $$;

-- Updated-at triggers

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
drop trigger if exists barber_profiles_set_updated_at on public.barber_profiles;
create trigger barber_profiles_set_updated_at before update on public.barber_profiles for each row execute function public.set_updated_at();
drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at before update on public.services for each row execute function public.set_updated_at();
drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
drop trigger if exists bookings_set_timestamps on public.bookings;
create trigger bookings_set_timestamps before insert or update of appointment_date, appointment_time, duration_minutes, timezone on public.bookings for each row execute function public.set_booking_timestamps();
drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at before update on public.bookings for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists bookings_complete_accounting on public.bookings;
create trigger bookings_complete_accounting before update on public.bookings for each row execute function public.complete_booking_accounting();

-- ---------------------------------------------------------------------------
-- Onboarding RPC: one authenticated owner, one organization, one barber page,
-- weekly hours, starter services and a 14-day subscription trial.
-- ---------------------------------------------------------------------------
create or replace function public.complete_barber_onboarding(
  p_display_name text,
  p_shop_name text,
  p_slug text,
  p_phone text,
  p_address text,
  p_city text,
  p_bio text,
  p_accent_color text,
  p_deposit_cents integer,
  p_plan_code text,
  p_services jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_barber_id uuid;
  v_service jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Invalid booking slug'; end if;

  insert into public.organizations (owner_user_id, name, slug)
  values (v_user_id, p_shop_name, p_slug)
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_user_id, 'owner');

  insert into public.subscriptions (organization_id, owner_user_id, plan_code, status)
  values (v_org_id, v_user_id, case when p_plan_code in ('starter','pro','studio') then p_plan_code else 'pro' end, 'trialing');

  insert into public.barber_profiles (
    organization_id, owner_user_id, assigned_user_id, slug, display_name,
    shop_name, phone, email, address, city, bio, accent_color,
    booking_deposit_cents, timezone
  ) values (
    v_org_id, v_user_id, v_user_id, p_slug, p_display_name,
    p_shop_name, coalesce(p_phone,''), coalesce((select email from auth.users where id = v_user_id),''),
    coalesce(p_address,''), coalesce(p_city,''), coalesce(p_bio,''), coalesce(p_accent_color,'#d8ff5f'),
    greatest(coalesce(p_deposit_cents,1000),0), 'America/New_York'
  ) returning id into v_barber_id;

  insert into public.availability_rules (barber_id, weekday, start_time, end_time, active)
  values
    (v_barber_id,0,null,null,false),
    (v_barber_id,1,'09:00','18:00',true),
    (v_barber_id,2,'09:00','18:00',true),
    (v_barber_id,3,'10:00','19:00',true),
    (v_barber_id,4,'10:00','20:00',true),
    (v_barber_id,5,'09:00','20:00',true),
    (v_barber_id,6,'08:00','17:00',true);

  for v_service in select * from jsonb_array_elements(coalesce(p_services,'[]'::jsonb))
  loop
    insert into public.services (barber_id, name, description, category, duration_minutes, price_cents, active)
    values (
      v_barber_id,
      coalesce(v_service->>'name','Service'),
      coalesce(v_service->>'description',''),
      coalesce(v_service->>'category','Haircut'),
      greatest(coalesce((v_service->>'duration_minutes')::integer,45),5),
      greatest(coalesce((v_service->>'price_cents')::integer,0),0),
      true
    );
  end loop;

  return v_barber_id;
end;
$$;

grant execute on function public.complete_barber_onboarding(text,text,text,text,text,text,text,text,integer,text,jsonb) to authenticated;

-- Queue reminder records without coupling CutFlow to a specific email/SMS vendor.
create unique index if not exists notification_log_dedupe_idx
on public.notification_log(booking_id, template_code, destination);

create or replace function public.queue_booking_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  insert into public.notification_log (barber_id, booking_id, channel, template_code, destination, status)
  select b.barber_id, b.id, 'email', 'customer_reminder_24h', b.customer_email, 'queued'
  from public.bookings b
  where b.status in ('confirmed','checked_in')
    and b.starts_at >= now() + interval '23 hours'
    and b.starts_at < now() + interval '25 hours'
    and b.customer_email <> ''
  on conflict (booking_id, template_code, destination) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reporting views
-- ---------------------------------------------------------------------------
create or replace view public.transaction_reporting as
select
  t.id,
  t.barber_id,
  t.booking_id,
  t.client_id,
  t.type,
  t.status,
  t.gross_cents,
  t.tax_cents,
  t.processor_fee_cents,
  t.platform_fee_cents,
  t.refund_cents,
  t.net_cents,
  t.payment_method_label,
  t.occurred_at,
  date_trunc('month', t.occurred_at) as report_month,
  date_trunc('quarter', t.occurred_at) as report_quarter,
  date_trunc('year', t.occurred_at) as report_year
from public.transactions t;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists barber_profiles_org_idx on public.barber_profiles(organization_id);
create index if not exists services_barber_active_idx on public.services(barber_id, active, sort_order);
create index if not exists clients_barber_name_idx on public.clients(barber_id, full_name);
create index if not exists clients_barber_phone_idx on public.clients(barber_id, phone);
create index if not exists bookings_barber_date_idx on public.bookings(barber_id, appointment_date, appointment_time);
create index if not exists bookings_client_idx on public.bookings(client_id, appointment_date desc);
create index if not exists bookings_status_idx on public.bookings(barber_id, status, appointment_date);
create index if not exists bookings_deposit_expiry_idx on public.bookings(status, deposit_expires_at) where status = 'pending_deposit';
create index if not exists products_barber_active_idx on public.products(barber_id, active, sort_order);
create index if not exists transactions_barber_date_idx on public.transactions(barber_id, occurred_at desc);
create index if not exists transactions_booking_idx on public.transactions(booking_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Public visitors can read only active storefront data. All private data is
-- restricted to members of the owning organization. Customer booking writes
-- go through server routes using the service-role key.
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.barber_profiles enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blocked_times enable row level security;
alter table public.services enable row level security;
alter table public.service_add_ons enable row level security;
alter table public.clients enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.products enable row level security;
alter table public.product_reservations enable row level security;
alter table public.transactions enable row level security;
alter table public.notification_log enable row level security;

-- Make policy creation repeatable when the setup script is re-run.
do $$
declare policy_row record;
begin
  for policy_row in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'organizations','organization_members','subscriptions','barber_profiles',
        'availability_rules','blocked_times','services','service_add_ons','clients',
        'bookings','booking_events','products','product_reservations','transactions',
        'notification_log'
      )
  loop
    execute format('drop policy if exists %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end $$;

create policy "Members read organizations" on public.organizations for select to authenticated using (public.is_organization_member(id));
create policy "Owners update organizations" on public.organizations for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "Members read memberships" on public.organization_members for select to authenticated using (public.is_organization_member(organization_id));
create policy "Owners manage memberships" on public.organization_members for all to authenticated using (exists(select 1 from public.organizations o where o.id = organization_id and o.owner_user_id = auth.uid())) with check (exists(select 1 from public.organizations o where o.id = organization_id and o.owner_user_id = auth.uid()));
create policy "Owners read subscriptions" on public.subscriptions for select to authenticated using (owner_user_id = auth.uid() or (organization_id is not null and public.is_organization_member(organization_id)));

create policy "Public reads active barbers" on public.barber_profiles for select to anon, authenticated using (active = true or public.is_organization_member(organization_id));
create policy "Members update barbers" on public.barber_profiles for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id));
create policy "Members create barbers" on public.barber_profiles for insert to authenticated with check (public.is_organization_member(organization_id));
create policy "Members delete barbers" on public.barber_profiles for delete to authenticated using (public.is_organization_member(organization_id));

create policy "Public reads active availability" on public.availability_rules for select to anon, authenticated using (active = true or public.can_manage_barber(barber_id));
create policy "Members manage availability" on public.availability_rules for all to authenticated using (public.can_manage_barber(barber_id)) with check (public.can_manage_barber(barber_id));
create policy "Members manage blocked time" on public.blocked_times for all to authenticated using (public.can_manage_barber(barber_id)) with check (public.can_manage_barber(barber_id));

create policy "Public reads active services" on public.services for select to anon, authenticated using (active = true or public.can_manage_barber(barber_id));
create policy "Members manage services" on public.services for all to authenticated using (public.can_manage_barber(barber_id)) with check (public.can_manage_barber(barber_id));
create policy "Public reads active add-ons" on public.service_add_ons for select to anon, authenticated using (exists(select 1 from public.services s where s.id = service_id and (s.active = true or public.can_manage_barber(s.barber_id))));
create policy "Members manage add-ons" on public.service_add_ons for all to authenticated using (exists(select 1 from public.services s where s.id = service_id and public.can_manage_barber(s.barber_id))) with check (exists(select 1 from public.services s where s.id = service_id and public.can_manage_barber(s.barber_id)));

create policy "Members manage clients" on public.clients for all to authenticated using (public.can_manage_barber(barber_id)) with check (public.can_manage_barber(barber_id));
create policy "Members manage bookings" on public.bookings for all to authenticated using (public.can_manage_barber(barber_id)) with check (public.can_manage_barber(barber_id));
create policy "Members read booking events" on public.booking_events for select to authenticated using (exists(select 1 from public.bookings b where b.id = booking_id and public.can_manage_barber(b.barber_id)));
create policy "Members create booking events" on public.booking_events for insert to authenticated with check (exists(select 1 from public.bookings b where b.id = booking_id and public.can_manage_barber(b.barber_id)));

create policy "Public reads active products" on public.products for select to anon, authenticated using (active = true or public.can_manage_barber(barber_id));
create policy "Members manage products" on public.products for all to authenticated using (public.can_manage_barber(barber_id)) with check (public.can_manage_barber(barber_id));
create policy "Members manage reservations" on public.product_reservations for all to authenticated using (exists(select 1 from public.bookings b where b.id = booking_id and public.can_manage_barber(b.barber_id))) with check (exists(select 1 from public.bookings b where b.id = booking_id and public.can_manage_barber(b.barber_id)));

create policy "Members manage transactions" on public.transactions for all to authenticated using (barber_id is not null and public.can_manage_barber(barber_id)) with check (barber_id is not null and public.can_manage_barber(barber_id));
create policy "Members manage notification logs" on public.notification_log for all to authenticated using (barber_id is not null and public.can_manage_barber(barber_id)) with check (barber_id is not null and public.can_manage_barber(barber_id));

notify pgrst, 'reload schema';
