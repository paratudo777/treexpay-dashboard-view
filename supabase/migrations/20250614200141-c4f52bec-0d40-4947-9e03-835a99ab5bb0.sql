
-- Remover as funções antigas se existirem
DROP FUNCTION IF EXISTS public.aprovar_saque(uuid, numeric);
DROP FUNCTION IF EXISTS public.rejeitar_saque(uuid);

-- Criar função para aprovar saques
CREATE OR REPLACE FUNCTION public.approve_withdrawal(withdrawal_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  withdrawal_user_id uuid;
  withdrawal_amount numeric;
  withdrawal_created_at timestamp with time zone;
  user_balance numeric;
BEGIN
  -- Buscar o saque e verificar se existe e está pendente
  SELECT w.user_id, w.amount, w.created_at, p.balance 
  INTO withdrawal_user_id, withdrawal_amount, withdrawal_created_at, user_balance
  FROM withdrawals w
  JOIN profiles p ON w.user_id = p.id
  WHERE w.id = withdrawal_id AND w.status = 'requested';
  
  IF withdrawal_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada ou já processada');
  END IF;
  
  -- Verificar saldo do usuário
  IF user_balance < withdrawal_amount THEN
    RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;
  
  -- Atualizar status do saque para processado
  UPDATE withdrawals
  SET status = 'processed'
  WHERE id = withdrawal_id;
  
  -- Debitar valor do saldo do usuário
  UPDATE profiles
  SET balance = balance - withdrawal_amount,
      updated_at = NOW()
  WHERE id = withdrawal_user_id;
  
  -- Atualizar transação correspondente se existir
  UPDATE transactions
  SET status = 'approved',
      updated_at = NOW()
  WHERE user_id = withdrawal_user_id
    AND type = 'withdrawal'
    AND amount = withdrawal_amount
    AND status = 'pending'
    AND created_at >= withdrawal_created_at - INTERVAL '1 minute';
  
  RETURN json_build_object('success', true, 'message', 'Saque aprovado com sucesso');
END;
$$;

-- Criar função para rejeitar saques
CREATE OR REPLACE FUNCTION public.reject_withdrawal(withdrawal_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  withdrawal_user_id uuid;
  withdrawal_amount numeric;
  withdrawal_created_at timestamp with time zone;
BEGIN
  -- Buscar o saque e verificar se existe e está pendente
  SELECT user_id, amount, created_at
  INTO withdrawal_user_id, withdrawal_amount, withdrawal_created_at
  FROM withdrawals 
  WHERE id = withdrawal_id AND status = 'requested';
  
  IF withdrawal_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada ou já processada');
  END IF;
  
  -- Atualizar status do saque para rejeitado
  UPDATE withdrawals
  SET status = 'rejected'
  WHERE id = withdrawal_id;
  
  -- Atualizar transação correspondente se existir
  UPDATE transactions
  SET status = 'denied',
      updated_at = NOW()
  WHERE user_id = withdrawal_user_id
    AND type = 'withdrawal'
    AND amount = withdrawal_amount
    AND status = 'pending'
    AND created_at >= withdrawal_created_at - INTERVAL '1 minute';
  
  RETURN json_build_object('success', true, 'message', 'Saque rejeitado com sucesso');
END;
$$;

-- Criar função para criar transação quando saque é criado
CREATE OR REPLACE FUNCTION public.create_withdrawal_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _code text;
BEGIN
  -- Gerar código único para a transação
  _code := 'WTH' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  
  -- Verificar se o código já existe e gerar novo se necessário
  WHILE EXISTS(SELECT 1 FROM public.transactions WHERE transactions.code = _code) LOOP
    _code := 'WTH' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END LOOP;

  -- Inserir transação correspondente ao saque
  INSERT INTO public.transactions (
    code,
    user_id,
    type,
    description,
    amount,
    status
  )
  VALUES (
    _code,
    NEW.user_id,
    'withdrawal'::transaction_type,
    'Saque PIX - ' || NEW.pix_key_type || ': ' || NEW.pix_key,
    NEW.amount,
    'pending'::transaction_status
  );

  RETURN NEW;
END;
$$;

-- Criar trigger para criar transação automaticamente quando saque é inserido
DROP TRIGGER IF EXISTS create_transaction_on_withdrawal ON public.withdrawals;
CREATE TRIGGER create_transaction_on_withdrawal
  AFTER INSERT ON public.withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_withdrawal_transaction();
