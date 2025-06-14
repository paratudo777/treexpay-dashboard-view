
-- Remover qualquer constraint de check que possa estar causando problema
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check;

-- Alterar a coluna para text temporariamente
ALTER TABLE withdrawals ALTER COLUMN status TYPE text;

-- Dropar o enum se existir para recriar limpo
DROP TYPE IF EXISTS withdrawal_status CASCADE;

-- Criar o enum novamente
CREATE TYPE withdrawal_status AS ENUM ('requested', 'processed', 'rejected');

-- Normalizar os valores existentes
UPDATE withdrawals SET status = 'requested' WHERE status NOT IN ('requested', 'processed', 'rejected');

-- Alterar a coluna para usar o enum
ALTER TABLE withdrawals ALTER COLUMN status TYPE withdrawal_status USING status::withdrawal_status;

-- Definir valor padrão
ALTER TABLE withdrawals ALTER COLUMN status SET DEFAULT 'requested'::withdrawal_status;

-- Verificar e adicionar 'denied' ao enum transaction_status se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'transaction_status'::regtype 
    AND enumlabel = 'denied'
  ) THEN
    ALTER TYPE transaction_status ADD VALUE 'denied';
  END IF;
END $$;

-- Recriar as funções com a lógica corrigida
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
  WHERE w.id = withdrawal_id AND w.status = 'requested'::withdrawal_status;
  
  IF withdrawal_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada ou já processada');
  END IF;
  
  -- Verificar saldo do usuário
  IF user_balance < withdrawal_amount THEN
    RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;
  
  -- Atualizar status do saque para processado
  UPDATE withdrawals
  SET status = 'processed'::withdrawal_status
  WHERE id = withdrawal_id;
  
  -- Debitar valor do saldo do usuário
  UPDATE profiles
  SET balance = balance - withdrawal_amount,
      updated_at = NOW()
  WHERE id = withdrawal_user_id;
  
  -- Atualizar transação correspondente se existir
  UPDATE transactions
  SET status = 'approved'::transaction_status,
      updated_at = NOW()
  WHERE user_id = withdrawal_user_id
    AND type = 'withdrawal'
    AND amount = withdrawal_amount
    AND status = 'pending'
    AND created_at >= withdrawal_created_at - INTERVAL '1 minute';
  
  RETURN json_build_object('success', true, 'message', 'Saque aprovado com sucesso');
END;
$$;

-- Recriar função de rejeição
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
  WHERE id = withdrawal_id AND status = 'requested'::withdrawal_status;
  
  IF withdrawal_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada ou já processada');
  END IF;
  
  -- Atualizar status do saque para rejeitado
  UPDATE withdrawals
  SET status = 'rejected'::withdrawal_status
  WHERE id = withdrawal_id;
  
  -- Atualizar transação correspondente se existir
  UPDATE transactions
  SET status = 'denied'::transaction_status,
      updated_at = NOW()
  WHERE user_id = withdrawal_user_id
    AND type = 'withdrawal'
    AND amount = withdrawal_amount
    AND status = 'pending'
    AND created_at >= withdrawal_created_at - INTERVAL '1 minute';
  
  RETURN json_build_object('success', true, 'message', 'Saque rejeitado com sucesso');
END;
$$;
