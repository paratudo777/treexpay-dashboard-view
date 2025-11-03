-- Criar view pública que expõe apenas campos seguros do checkout
CREATE OR REPLACE VIEW public.public_checkouts AS
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

-- Permitir acesso público à view
GRANT SELECT ON public.public_checkouts TO anon;
GRANT SELECT ON public.public_checkouts TO authenticated;

-- Remover a política pública atual da tabela checkouts
DROP POLICY IF EXISTS "Anonymous users can view limited checkout info" ON public.checkouts;

-- Garantir que a tabela checkouts só é acessível por owners autenticados
-- (a política "Authenticated owners can view all their checkout fields" já existe)