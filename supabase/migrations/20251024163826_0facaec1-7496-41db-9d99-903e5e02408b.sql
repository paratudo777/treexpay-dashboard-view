-- Criar função para processar pagamentos de checkout com cartão de crédito
CREATE OR REPLACE FUNCTION public.process_checkout_card_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
  _tx_status transaction_status;
  _net_amount numeric;
  _checkout_owner_id uuid;
BEGIN
  -- Somente processar pagamentos com cartão de crédito
  IF NEW.payment_method != 'credit_card' THEN
    RETURN NEW;
  END IF;

  -- Buscar o dono do checkout
  SELECT user_id INTO _checkout_owner_id
  FROM checkouts
  WHERE id = NEW.checkout_id;

  IF _checkout_owner_id IS NULL THEN
    RAISE EXCEPTION 'Checkout owner not found';
  END IF;

  -- Gerar código único para a transação
  _code := 'CHK' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  
  WHILE EXISTS(SELECT 1 FROM public.transactions WHERE transactions.code = _code) LOOP
    _code := 'CHK' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END LOOP;

  -- Determinar status da transação baseado no status do pagamento
  IF NEW.status = 'paid' THEN
    _tx_status := 'approved'::transaction_status;
    _net_amount := NEW.net_amount;
    
    -- Incrementar saldo do dono do checkout
    UPDATE profiles
    SET balance = balance + _net_amount,
        updated_at = NOW()
    WHERE id = _checkout_owner_id;
    
  ELSIF NEW.status = 'failed' THEN
    _tx_status := 'denied'::transaction_status;
    _net_amount := NEW.amount;
  ELSE
    -- Para status pending ou outros, criar como pending
    _tx_status := 'pending'::transaction_status;
    _net_amount := NEW.amount;
  END IF;

  -- Criar transação
  INSERT INTO public.transactions (
    code,
    user_id,
    type,
    description,
    amount,
    status,
    transaction_date
  )
  VALUES (
    _code,
    _checkout_owner_id,
    'deposit'::transaction_type,
    'Pagamento Checkout (Cartão) - ' || NEW.customer_name || ' - R$ ' || NEW.amount::text,
    _net_amount,
    _tx_status,
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Criar trigger para processar pagamentos de checkout com cartão
DROP TRIGGER IF EXISTS trigger_process_checkout_card_payment ON checkout_payments;
CREATE TRIGGER trigger_process_checkout_card_payment
AFTER INSERT ON checkout_payments
FOR EACH ROW
EXECUTE FUNCTION public.process_checkout_card_payment();

-- Criar função para atualizar quando o status do pagamento mudar
CREATE OR REPLACE FUNCTION public.update_checkout_card_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _checkout_owner_id uuid;
  _net_amount numeric;
BEGIN
  -- Somente processar pagamentos com cartão de crédito
  IF NEW.payment_method != 'credit_card' THEN
    RETURN NEW;
  END IF;

  -- Se mudou de outro status para 'paid'
  IF OLD.status != 'paid' AND NEW.status = 'paid' THEN
    -- Buscar o dono do checkout
    SELECT user_id INTO _checkout_owner_id
    FROM checkouts
    WHERE id = NEW.checkout_id;

    _net_amount := NEW.net_amount;
    
    -- Incrementar saldo do dono do checkout
    UPDATE profiles
    SET balance = balance + _net_amount,
        updated_at = NOW()
    WHERE id = _checkout_owner_id;
    
    -- Atualizar transação para approved
    UPDATE transactions
    SET status = 'approved'::transaction_status,
        amount = _net_amount,
        updated_at = NOW()
    WHERE user_id = _checkout_owner_id
      AND description LIKE 'Pagamento Checkout (Cartão) - ' || NEW.customer_name || '%'
      AND status = 'pending'::transaction_status
      AND created_at >= NEW.created_at - INTERVAL '1 minute';
      
  -- Se mudou para 'failed'
  ELSIF OLD.status != 'failed' AND NEW.status = 'failed' THEN
    -- Buscar o dono do checkout
    SELECT user_id INTO _checkout_owner_id
    FROM checkouts
    WHERE id = NEW.checkout_id;
    
    -- Atualizar transação para denied
    UPDATE transactions
    SET status = 'denied'::transaction_status,
        updated_at = NOW()
    WHERE user_id = _checkout_owner_id
      AND description LIKE 'Pagamento Checkout (Cartão) - ' || NEW.customer_name || '%'
      AND status = 'pending'::transaction_status
      AND created_at >= NEW.created_at - INTERVAL '1 minute';
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar quando status mudar
DROP TRIGGER IF EXISTS trigger_update_checkout_card_payment_status ON checkout_payments;
CREATE TRIGGER trigger_update_checkout_card_payment_status
AFTER UPDATE ON checkout_payments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.update_checkout_card_payment_status();