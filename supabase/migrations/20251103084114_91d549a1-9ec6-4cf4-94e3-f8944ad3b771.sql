-- Remover view anterior
DROP VIEW IF EXISTS public.public_checkouts;

-- Criar view simples (sem SECURITY DEFINER) que expõe apenas campos seguros
CREATE VIEW public.public_checkouts 
WITH (security_invoker=true)
AS
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

-- Permitir acesso à view
GRANT SELECT ON public.public_checkouts TO anon;
GRANT SELECT ON public.public_checkouts TO authenticated;