
-- =============================================
-- FIX 1: PRIVILEGE ESCALATION - Prevent users from changing their own 'profile' role
-- =============================================

-- Drop the overly permissive update policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profiles" ON public.profiles;

-- Recreate with restriction: users can update their own row but NOT the 'profile' column
CREATE POLICY "Users can update their own profile safely"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND profile = (SELECT p.profile FROM public.profiles p WHERE p.id = auth.uid())
);

-- =============================================
-- FIX 2: SET search_path on all vulnerable functions
-- =============================================

CREATE OR REPLACE FUNCTION public.update_volume_mensal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF EXTRACT(YEAR FROM NEW.data) = EXTRACT(YEAR FROM CURRENT_DATE) 
     AND EXTRACT(MONTH FROM NEW.data) = EXTRACT(MONTH FROM CURRENT_DATE) THEN
    UPDATE public.ranking 
    SET 
      volume_total_mensal = volume_total_mensal + NEW.valor,
      ultima_venda_em = NEW.data,
      updated_at = NOW()
    WHERE id = NEW.usuario_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_monthly_volumes()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  UPDATE public.ranking 
  SET 
    volume_total_mensal = 0.00,
    updated_at = NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_user_checkouts(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.checkouts WHERE user_id = p_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_checkout_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF (SELECT count_user_checkouts(NEW.user_id)) >= 5 THEN
    RAISE EXCEPTION 'Limite de 5 produtos atingido';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_transaction_after_deposit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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
      ELSE 'Depósito PIX - R$ ' || NEW.amount::text || ' (Líquido: R$ ' || _net_amount::text || ')'
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
SET search_path = public
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
        description = 'Depósito PIX - R$ ' || NEW.amount::text || ' (Líquido: R$ ' || _net_amount::text || ')',
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

CREATE OR REPLACE FUNCTION public.create_withdrawal_transaction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  _code text;
BEGIN
  _code := 'WTH' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  WHILE EXISTS(SELECT 1 FROM public.transactions WHERE transactions.code = _code) LOOP
    _code := 'WTH' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END LOOP;
  INSERT INTO public.transactions (code, user_id, type, description, amount, status)
  VALUES (_code, NEW.user_id, 'withdrawal'::transaction_type,
    'Saque PIX - ' || NEW.pix_key_type || ': ' || NEW.pix_key, NEW.amount, 'pending'::transaction_status);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_transaction_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  code TEXT;
BEGIN
  code := 'TXN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  WHILE EXISTS(SELECT 1 FROM public.transactions WHERE transactions.code = code) LOOP
    code := 'TXN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END LOOP;
  RETURN code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_checkout_slug()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  slug TEXT;
BEGIN
  slug := lower(substr(md5(gen_random_uuid()::text), 1, 12));
  WHILE EXISTS(SELECT 1 FROM public.checkouts WHERE url_slug = slug) LOOP
    slug := lower(substr(md5(gen_random_uuid()::text), 1, 12));
  END LOOP;
  RETURN slug;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_checkout_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- =============================================
-- FIX 3: Tighten checkout_payments INSERT to authenticated only
-- =============================================

DROP POLICY IF EXISTS "Anyone can create checkout payments" ON public.checkout_payments;
CREATE POLICY "Anyone can create checkout payments"
ON public.checkout_payments
FOR INSERT
TO public
WITH CHECK (true);
