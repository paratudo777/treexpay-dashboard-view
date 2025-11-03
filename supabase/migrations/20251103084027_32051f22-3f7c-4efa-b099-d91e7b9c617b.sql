-- Remover a view anterior
DROP VIEW IF EXISTS public.public_checkouts;

-- Recriar view sem SECURITY DEFINER (mais seguro)
CREATE VIEW public.public_checkouts 
WITH (security_barrier=true) AS
SELECT 
  id,
  title,
  description,
  amount,
  image_url,
  url_slug,
  active,
  created_at
FROM public.checkouts
WHERE active = true;

-- COMMENT para documentar o propósito
COMMENT ON VIEW public.public_checkouts IS 'Public view of checkouts exposing only safe fields for payment pages';

-- Permitir acesso público à view
GRANT SELECT ON public.public_checkouts TO anon;
GRANT SELECT ON public.public_checkouts TO authenticated;