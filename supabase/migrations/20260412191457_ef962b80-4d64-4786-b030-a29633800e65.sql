
-- 1. Fix views with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.public_checkouts;
CREATE VIEW public.public_checkouts
WITH (security_invoker = true)
AS
SELECT id, title, description, amount, image_url, url_slug, active, created_at,
       button_text, color_theme, security_message, template, enable_pix, enable_card
FROM public.checkouts
WHERE active = true;

GRANT SELECT ON public.public_checkouts TO anon, authenticated;

DROP VIEW IF EXISTS public.public_ranking;
CREATE VIEW public.public_ranking
WITH (security_invoker = true)
AS
SELECT apelido, volume_total_mensal, ultima_venda_em
FROM public.ranking
ORDER BY volume_total_mensal DESC NULLS LAST;

GRANT SELECT ON public.public_ranking TO anon, authenticated;

-- 2. Fix remaining functions without search_path
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND profile = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_profile(p_user_id uuid, p_profile text, p_active boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles
  SET 
    profile = p_profile::public.user_profile,
    active = p_active,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user ID %', p_user_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_ranking(p_start_date timestamp with time zone, p_end_date timestamp with time zone)
RETURNS TABLE(user_id uuid, total_volume numeric, last_sale_date timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    WITH all_sales AS (
        SELECT d.user_id, d.amount, d.created_at AS sale_date
        FROM public.deposits AS d
        WHERE d.status = 'completed'::public.deposit_status
          AND d.created_at BETWEEN p_start_date AND p_end_date
        UNION ALL
        SELECT c.user_id, cp.amount, cp.created_at AS sale_date
        FROM public.checkout_payments AS cp
        JOIN public.checkouts AS c ON cp.checkout_id = c.id
        WHERE cp.status = 'paid'
          AND cp.created_at BETWEEN p_start_date AND p_end_date
    )
    SELECT s.user_id, SUM(s.amount) AS total_volume, MAX(s.sale_date) AS last_sale_date
    FROM all_sales s
    WHERE s.user_id IS NOT NULL
    GROUP BY s.user_id;
END;
$function$;
