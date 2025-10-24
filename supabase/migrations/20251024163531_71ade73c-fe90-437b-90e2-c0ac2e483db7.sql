-- Adicionar policy para admins poderem atualizar qualquer registro na tabela ranking
CREATE POLICY "Admins can update any ranking record"
ON public.ranking
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Garantir que a tabela ranking está configurada para realtime
ALTER TABLE public.ranking REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação realtime (se ainda não estiver)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'ranking'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ranking;
  END IF;
END $$;