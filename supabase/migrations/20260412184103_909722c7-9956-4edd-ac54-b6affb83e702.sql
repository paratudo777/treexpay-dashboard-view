
-- 1. Fix views - remove security_barrier to resolve SECURITY DEFINER warning
DROP VIEW IF EXISTS public.public_checkouts;
CREATE VIEW public.public_checkouts AS
SELECT id, title, description, amount, image_url, url_slug, active, created_at,
       button_text, color_theme, security_message, template, enable_pix, enable_card
FROM public.checkouts
WHERE active = true;

GRANT SELECT ON public.public_checkouts TO anon, authenticated;

DROP VIEW IF EXISTS public.public_ranking;
CREATE VIEW public.public_ranking AS
SELECT apelido, volume_total_mensal, ultima_venda_em
FROM public.ranking
ORDER BY volume_total_mensal DESC NULLS LAST;

GRANT SELECT ON public.public_ranking TO anon, authenticated;

-- 2. checkout_payments: Add admin SELECT policy
CREATE POLICY "Admins can view all checkout payments"
ON public.checkout_payments
FOR SELECT
TO authenticated
USING (is_admin());

-- 3. checkout_payments: Restrict INSERT to valid checkout_ids only
DROP POLICY IF EXISTS "Anyone can create checkout payments" ON public.checkout_payments;
CREATE POLICY "Valid checkout payments only"
ON public.checkout_payments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.checkouts WHERE id = checkout_id AND active = true)
);

-- 4. Admins can update checkout payments (for webhook status updates via service_role)
CREATE POLICY "Admins can update checkout payments"
ON public.checkout_payments
FOR UPDATE
TO authenticated
USING (is_admin());

-- 5. Create secure profile update function to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.safe_update_profile(
  p_user_id uuid,
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_cpf text DEFAULT NULL,
  p_notifications_enabled boolean DEFAULT NULL,
  p_onesignal_player_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE profiles SET
    name = COALESCE(p_name, name),
    phone = COALESCE(p_phone, phone),
    cpf = COALESCE(p_cpf, cpf),
    notifications_enabled = COALESCE(p_notifications_enabled, notifications_enabled),
    onesignal_player_id = COALESCE(p_onesignal_player_id, onesignal_player_id),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$function$;
