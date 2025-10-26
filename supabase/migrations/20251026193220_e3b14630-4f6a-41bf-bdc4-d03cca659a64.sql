-- Adicionar política para admins poderem inserir registros no ranking
CREATE POLICY "Admins can insert any ranking record"
ON public.ranking
FOR INSERT
TO authenticated
WITH CHECK (is_admin());