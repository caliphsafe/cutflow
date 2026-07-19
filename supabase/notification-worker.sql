-- CutFlow notification delivery worker
-- Run this AFTER the application is deployed and CRON_SECRET is added in Vercel.
-- Before running, replace BOTH placeholders below:
--   https://YOUR-CUTFLOW-DOMAIN.com
--   REPLACE_WITH_THE_EXACT_CRON_SECRET_FROM_VERCEL
--
-- This uses Supabase pg_cron + pg_net to call the secure CutFlow notification
-- route every five minutes. It works independently of Vercel Cron plan limits.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  job record;
begin
  for job in select jobid from cron.job where jobname = 'cutflow-deliver-notifications'
  loop
    perform cron.unschedule(job.jobid);
  end loop;
end $$;

select cron.schedule(
  'cutflow-deliver-notifications',
  '*/5 * * * *',
  $cutflow$
    select net.http_post(
      url := 'https://YOUR-CUTFLOW-DOMAIN.com/api/notifications/process',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer REPLACE_WITH_THE_EXACT_CRON_SECRET_FROM_VERCEL'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $cutflow$
);
