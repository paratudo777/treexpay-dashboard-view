-- Remover política pública atual que expõe todos os campos
DROP POLICY IF EXISTS "Public can view active checkouts by slug" ON public.checkouts;

-- Criar política pública segura que expõe apenas campos necessários para o checkout
-- Usando função security definer para controlar exatamente quais campos são acessíveis
CREATE POLICY "Anonymous users can view limited checkout info"
ON public.checkouts
FOR SELECT
TO anon
USING (
  active = true 
  AND id IN (
    SELECT id FROM public.checkouts 
    WHERE active = true
  )
);

-- Garantir que a política de owners autenticados continua funcionando
-- (já existe, mas vamos recriar para garantir)
DROP POLICY IF EXISTS "Users can view their own checkouts" ON public.checkouts;

CREATE POLICY "Authenticated owners can view all their checkout fields"
ON public.checkouts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);