-- Adicionar novos campos na tabela checkouts
ALTER TABLE public.checkouts
ADD COLUMN description TEXT,
ADD COLUMN image_url TEXT,
ADD COLUMN notification_email TEXT;

-- Adicionar campos para controle de pagamento e expiração em checkout_payments
ALTER TABLE public.checkout_payments
ADD COLUMN payment_method TEXT DEFAULT 'pix' CHECK (payment_method IN ('pix', 'credit_card')),
ADD COLUMN card_data JSONB,
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;

-- Criar função para contar checkouts ativos do usuário
CREATE OR REPLACE FUNCTION count_user_checkouts(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.checkouts WHERE user_id = p_user_id);
END;
$$;

-- Criar trigger para limitar 5 checkouts por usuário
CREATE OR REPLACE FUNCTION check_checkout_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT count_user_checkouts(NEW.user_id)) >= 5 THEN
    RAISE EXCEPTION 'Limite de 5 produtos atingido';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_checkout_limit
BEFORE INSERT ON public.checkouts
FOR EACH ROW
EXECUTE FUNCTION check_checkout_limit();

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_checkouts_notification_email ON public.checkouts(notification_email);
CREATE INDEX IF NOT EXISTS idx_checkout_payments_expires_at ON public.checkout_payments(expires_at);
CREATE INDEX IF NOT EXISTS idx_checkout_payments_payment_method ON public.checkout_payments(payment_method);