CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove qualquer agendamento anterior com o mesmo nome (idempotente)
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'verify-pending-payments';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END$$;

SELECT cron.schedule(
  'verify-pending-payments',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fhwfonispezljglrclia.supabase.co/functions/v1/cron-verify-payments',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZod2ZvbmlzcGV6bGpnbHJjbGlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NjMzNTYsImV4cCI6MjA1OTEzOTM1Nn0.tLXi1DUINNeKyLEA0lDKF8vGiTR8AXxliKOZRVmtW6s"}'::jsonb,
    body := concat('{"trigger":"cron","at":"', now(), '"}')::jsonb
  );
  $$
);