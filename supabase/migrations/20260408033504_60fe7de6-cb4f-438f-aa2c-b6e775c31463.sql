
CREATE OR REPLACE FUNCTION public.check_webhook_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.webhooks WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 webhooks per account';
  END IF;
  RETURN NEW;
END;
$$;
