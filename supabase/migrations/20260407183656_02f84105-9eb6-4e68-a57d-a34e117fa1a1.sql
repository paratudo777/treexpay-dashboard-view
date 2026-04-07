
-- Tabela de pagamentos criados via API pública
CREATE TABLE public.api_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  description text,
  customer_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'canceled', 'expired')),
  webhook_url text,
  webhook_sent boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_api_payments_user_id ON public.api_payments(user_id);
CREATE INDEX idx_api_payments_api_key_id ON public.api_payments(api_key_id);
CREATE INDEX idx_api_payments_status ON public.api_payments(status);

-- RLS
ALTER TABLE public.api_payments ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios pagamentos
CREATE POLICY "Users can view their own api payments"
  ON public.api_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins podem ver todos
CREATE POLICY "Admins can view all api payments"
  ON public.api_payments FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins podem atualizar todos
CREATE POLICY "Admins can update all api payments"
  ON public.api_payments FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- Trigger para updated_at
CREATE TRIGGER update_api_payments_updated_at
  BEFORE UPDATE ON public.api_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
