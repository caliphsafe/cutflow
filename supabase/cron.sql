-- CutFlow scheduled maintenance
-- Run this after schema.sql.
-- 1. Releases appointment/product holds when the $10 deposit is not completed.
-- 2. Queues 24-hour reminder records for the configured notification provider.

create extension if not exists pg_cron;

do $$
declare
  job record;
begin
  for job in select jobid from cron.job where jobname in ('cutflow-expire-unpaid-bookings','cutflow-queue-booking-reminders')
  loop
    perform cron.unschedule(job.jobid);
  end loop;
end $$;

select cron.schedule(
  'cutflow-expire-unpaid-bookings',
  '* * * * *',
  'select public.expire_unpaid_bookings();'
);

select cron.schedule(
  'cutflow-queue-booking-reminders',
  '*/15 * * * *',
  'select public.queue_booking_reminders();'
);
