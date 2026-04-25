CREATE OR REPLACE FUNCTION public.create_transaction_after_deposit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _code text;
  _tx_status transaction_status;
  _user_fee_percent numeric;
  _provider_fee numeric := 1.50;
  _percentage_fee_amount numeric;
  _total_fees numeric;
  _net_amount numeric;
BEGIN
  _code := 'TXN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  WHILE EXISTS(SELECT 1 FROM public.transactions WHERE transactions.code = _code) LOOP
    _code := 'TXN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END LOOP;

  CASE NEW.status::text
    WHEN 'waiting'   THEN _tx_status := 'pending';
    WHEN 'completed' THEN _tx_status := 'approved';
    WHEN 'expired'   THEN _tx_status := 'cancelled';
    ELSE                  _tx_status := 'pending';
  END CASE;

  SELECT COALESCE(deposit_fee, 11.99) INTO _user_fee_percent
  FROM public.settings WHERE user_id = NEW.user_id;
  
  IF _user_fee_percent IS NULL THEN
    _user_fee_percent := 11.99;
  END IF;

  _percentage_fee_amount := (NEW.amount * _user_fee_percent) / 100;
  _total_fees := _percentage_fee_amount + _provider_fee;
  _net_amount := NEW.amount - _total_fees;

  INSERT INTO public.transactions (code, user_id, type, description, amount, status, deposit_id)
  VALUES (
    _code, NEW.user_id, 'deposit'::transaction_type,
    CASE 
      WHEN NEW.status::text = 'waiting' THEN 'Depósito PIX - Aguardando pagamento'
      ELSE 'Depósito PIX - R$ ' || to_char(NEW.amount, 'FM999999990.00') || ' (Líquido: R$ ' || to_char(_net_amount, 'FM999999990.00') || ')'
    END,
    CASE WHEN NEW.status::text = 'waiting' THEN NEW.amount ELSE _net_amount END,
    _tx_status::transaction_status, NEW.id
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_transaction_on_deposit_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_fee_percent numeric;
  _provider_fee numeric := 1.50;
  _percentage_fee_amount numeric;
  _total_fees numeric;
  _net_amount numeric;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT COALESCE(deposit_fee, 11.99) INTO _user_fee_percent
    FROM public.settings WHERE user_id = NEW.user_id;
    IF _user_fee_percent IS NULL THEN _user_fee_percent := 11.99; END IF;
    _percentage_fee_amount := (NEW.amount * _user_fee_percent) / 100;
    _total_fees := _percentage_fee_amount + _provider_fee;
    _net_amount := NEW.amount - _total_fees;
    UPDATE public.transactions
    SET status = 'approved', amount = _net_amount,
        description = 'Depósito PIX - R$ ' || to_char(NEW.amount, 'FM999999990.00') || ' (Líquido: R$ ' || to_char(_net_amount, 'FM999999990.00') || ')',
        updated_at = NOW()
    WHERE deposit_id = NEW.id;
  ELSIF NEW.status = 'expired' AND OLD.status != 'expired' THEN
    UPDATE public.transactions
    SET status = 'cancelled', description = 'Depósito PIX - Expirado', updated_at = NOW()
    WHERE deposit_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Limpa descrições antigas já gravadas com excesso de casas decimais
UPDATE public.transactions
SET description = regexp_replace(
  description,
  'R\$ ([0-9]+)\.([0-9]{2})[0-9]+',
  'R$ \1.\2',
  'g'
)
WHERE type = 'deposit'
  AND description ~ 'R\$ [0-9]+\.[0-9]{3,}';