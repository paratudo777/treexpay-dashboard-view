-- Garante que o Realtime envie o registro completo (antes/depois) nos eventos UPDATE
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.deposits REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.checkout_payments REPLICA IDENTITY FULL;

-- Adiciona as tabelas à publicação supabase_realtime (idempotente)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.checkout_payments; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Índices para acelerar lookups do webhook (idempotentes)
CREATE INDEX IF NOT EXISTS idx_transactions_deposit_id ON public.transactions(deposit_id) WHERE deposit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deposits_status ON public.deposits(status);