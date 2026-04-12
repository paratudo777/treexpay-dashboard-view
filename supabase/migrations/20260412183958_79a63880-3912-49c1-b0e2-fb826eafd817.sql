
-- 1. WEBHOOK_LOGS: Block all writes from regular users
-- Only service_role (edge functions) should write to webhook_logs
CREATE POLICY "Block public insert on webhook_logs"
ON public.webhook_logs
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Block public update on webhook_logs"
ON public.webhook_logs
FOR UPDATE
TO authenticated, anon
USING (false);

CREATE POLICY "Block public delete on webhook_logs"
ON public.webhook_logs
FOR DELETE
TO authenticated, anon
USING (false);

-- 2. RANKING: Replace the open SELECT policy with a restricted one
DROP POLICY IF EXISTS "Users can view all usuarios for ranking" ON public.ranking;

CREATE POLICY "Users can view ranking data"
ON public.ranking
FOR SELECT
TO authenticated
USING (true);

-- 3. Create a safe public ranking view that hides user_id
CREATE OR REPLACE VIEW public.public_ranking
WITH (security_barrier = true)
AS
SELECT apelido, volume_total_mensal, ultima_venda_em
FROM public.ranking
ORDER BY volume_total_mensal DESC NULLS LAST;

GRANT SELECT ON public.public_ranking TO anon, authenticated;

-- 4. Fix search_path on all functions missing it
CREATE OR REPLACE FUNCTION public.approve_withdrawal(withdrawal_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  withdrawal_user_id uuid;
  withdrawal_amount numeric;
  withdrawal_created_at timestamp with time zone;
  user_balance numeric;
BEGIN
  SELECT w.user_id, w.amount, w.created_at, p.balance 
  INTO withdrawal_user_id, withdrawal_amount, withdrawal_created_at, user_balance
  FROM withdrawals w
  JOIN profiles p ON w.user_id = p.id
  WHERE w.id = withdrawal_id AND w.status = 'requested'::withdrawal_status;
  
  IF withdrawal_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada ou já processada');
  END IF;
  
  IF user_balance < withdrawal_amount THEN
    RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;
  
  UPDATE withdrawals SET status = 'processed'::withdrawal_status WHERE id = withdrawal_id;
  
  UPDATE profiles SET balance = balance - withdrawal_amount, updated_at = NOW() WHERE id = withdrawal_user_id;
  
  UPDATE transactions
  SET status = 'approved'::transaction_status, updated_at = NOW()
  WHERE user_id = withdrawal_user_id
    AND type = 'withdrawal'
    AND amount = withdrawal_amount
    AND status = 'pending'
    AND created_at >= withdrawal_created_at - INTERVAL '1 minute';
  
  RETURN json_build_object('success', true, 'message', 'Saque aprovado com sucesso');
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(withdrawal_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  withdrawal_user_id uuid;
  withdrawal_amount numeric;
  withdrawal_created_at timestamp with time zone;
BEGIN
  SELECT user_id, amount, created_at
  INTO withdrawal_user_id, withdrawal_amount, withdrawal_created_at
  FROM withdrawals 
  WHERE id = withdrawal_id AND status = 'requested'::withdrawal_status;
  
  IF withdrawal_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada ou já processada');
  END IF;
  
  UPDATE withdrawals SET status = 'rejected'::withdrawal_status WHERE id = withdrawal_id;
  
  UPDATE transactions
  SET status = 'denied'::transaction_status, updated_at = NOW()
  WHERE user_id = withdrawal_user_id
    AND type = 'withdrawal'
    AND amount = withdrawal_amount
    AND status = 'pending'
    AND created_at >= withdrawal_created_at - INTERVAL '1 minute';
  
  RETURN json_build_object('success', true, 'message', 'Saque rejeitado com sucesso');
END;
$function$;

CREATE OR REPLACE FUNCTION public.incrementar_saldo_usuario(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles 
  SET balance = balance + p_amount, updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário com ID % não encontrado', p_user_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND profile = 'admin'
  );
$function$;

-- 5. Fix public_checkouts view - remove SECURITY DEFINER
DROP VIEW IF EXISTS public.public_checkouts;
CREATE VIEW public.public_checkouts
WITH (security_barrier = true)
AS
SELECT id, title, description, amount, image_url, url_slug, active, created_at,
       button_text, color_theme, security_message, template, enable_pix, enable_card
FROM public.checkouts
WHERE active = true;

GRANT SELECT ON public.public_checkouts TO anon, authenticated;
