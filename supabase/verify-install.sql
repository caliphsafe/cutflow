-- CutFlow v2.2 installation verification
-- Fresh project: run after schema.sql and cron.sql.
-- Existing v1 project: run after upgrade-v2.sql and cron.sql.

select
  to_regclass('public.organizations') is not null as organizations,
  to_regclass('public.barber_profiles') is not null as barber_profiles,
  to_regclass('public.services') is not null as services,
  to_regclass('public.clients') is not null as clients,
  to_regclass('public.bookings') is not null as bookings,
  to_regclass('public.products') is not null as products,
  to_regclass('public.transactions') is not null as transactions,
  to_regclass('public.notification_log') is not null as notification_log,
  to_regclass('public.booking_policies') is not null as booking_policies,
  to_regclass('public.payment_connections') is not null as payment_connections,
  to_regclass('public.payment_sessions') is not null as payment_sessions,
  to_regclass('public.webhook_events') is not null as webhook_events,
  to_regclass('public.customer_portal_tokens') is not null as customer_portal_tokens;

select
  to_regprocedure('public.complete_barber_onboarding(text,text,text,text,text,text,text,text,integer,text,jsonb)') is not null as onboarding_function,
  to_regprocedure('public.expire_unpaid_bookings()') is not null as expiry_function,
  to_regprocedure('public.queue_booking_reminders()') is not null as reminder_function;

select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='barber_profiles' and column_name='profile_image_url') as barber_media_columns,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='image_url') as service_images,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='image_url') as product_images,
  exists(select 1 from storage.buckets where id='cutflow-media' and public=true) as public_media_bucket;

select jobname, schedule, active
from cron.job
where jobname in ('cutflow-expire-unpaid-bookings','cutflow-queue-booking-reminders')
order by jobname;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'organizations','organization_members','subscriptions','barber_profiles',
    'availability_rules','blocked_times','services','clients','bookings','products',
    'product_reservations','transactions','notification_log','booking_policies',
    'notification_preferences','payment_connections','payment_sessions',
    'webhook_events','customer_portal_tokens','audit_log'
  )
order by tablename;
