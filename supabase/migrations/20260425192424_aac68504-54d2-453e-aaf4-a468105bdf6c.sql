CREATE OR REPLACE FUNCTION public.create_withdrawal_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _code text;
  _desc text;
BEGIN
  _code := 'WTH' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  WHILE EXISTS(SELECT 1 FROM public.transactions WHERE transactions.code = _code) LOOP
    _code := 'WTH' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END LOOP;

  IF lower(NEW.pix_key_type) = 'btc' THEN
    _desc := 'Saque BTC - ' || NEW.pix_key;
  ELSE
    _desc := 'Saque PIX - ' || NEW.pix_key_type || ': ' || NEW.pix_key;
  END IF;

  INSERT INTO public.transactions (code, user_id, type, description, amount, status)
  VALUES (_code, NEW.user_id, 'withdrawal'::transaction_type,
    _desc, NEW.amount, 'pending'::transaction_status);
  RETURN NEW;
END;
$function$;