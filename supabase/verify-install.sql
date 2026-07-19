-- CutFlow installation verification
-- Run after schema.sql and cron.sql.

select
  to_regclass('public.organizations') is not null as organizations,
  to_regclass('public.barber_profiles') is not null as barber_profiles,
  to_regclass('public.services') is not null as services,
  to_regclass('public.clients') is not null as clients,
  to_regclass('public.bookings') is not null as bookings,
  to_regclass('public.products') is not null as products,
  to_regclass('public.transactions') is not null as transactions,
  to_regclass('public.notification_log') is not null as notification_log;

select
  to_regprocedure('public.complete_barber_onboarding(text,text,text,text,text,text,text,text,integer,text,jsonb)') is not null as onboarding_function,
  to_regprocedure('public.expire_unpaid_bookings()') is not null as expiry_function,
  to_regprocedure('public.queue_booking_reminders()') is not null as reminder_function;

select jobname, schedule, active
from cron.job
where jobname in ('cutflow-expire-unpaid-bookings','cutflow-queue-booking-reminders')
order by jobname;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('organizations','organization_members','subscriptions','barber_profiles','availability_rules','blocked_times','services','clients','bookings','products','product_reservations','transactions','notification_log')
order by tablename;
