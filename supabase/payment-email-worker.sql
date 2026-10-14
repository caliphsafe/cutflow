-- CutFlow Cash App + Venmo payment-email checker
-- Replace both placeholders, then run once in Supabase SQL Editor.
-- CutFlow polls its own inbound email inbox once per minute. No Cash App or
-- Venmo API/webhook is used for this confirmation path.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare job record;
begin
  for job in select jobid from cron.job where jobname = 'cutflow-check-payment-emails'
  loop
    perform cron.unschedule(job.jobid);
  end loop;
end $$;

select cron.schedule(
  'cutflow-check-payment-emails',
  '* * * * *',
  $cutflow$
    select net.http_post(
      url := 'https://YOUR-CUTFLOW-DOMAIN.com/api/payments/email/process',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer REPLACE_WITH_THE_EXACT_CRON_SECRET_FROM_VERCEL'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 15000
    );
  $cutflow$
);
