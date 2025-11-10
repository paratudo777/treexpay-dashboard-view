-- Schema do Ledger (Sistema de Contabilidade)

-- Tabela principal de merchants
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  document VARCHAR(14) NOT NULL, -- CPF ou CNPJ
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, closed
  kyc_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabela de saldos (denormalizada para performance)
CREATE TABLE merchant_balances (
  merchant_id UUID PRIMARY KEY REFERENCES merchants(id),
  available BIGINT NOT NULL DEFAULT 0, -- Valor em centavos disponível para saque
  pending BIGINT NOT NULL DEFAULT 0,   -- Valor em centavos pendente (ainda não disponível)
  total BIGINT NOT NULL DEFAULT 0,     -- Total = available + pending
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabela de transações do ledger (imutável, append-only)
CREATE TABLE ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  type VARCHAR(20) NOT NULL, -- credit, debit, fee, refund, chargeback, payout
  amount BIGINT NOT NULL, -- Sempre positivo (centavos)
  balance_impact VARCHAR(10) NOT NULL, -- increase, decrease
  balance_type VARCHAR(10) NOT NULL, -- available, pending
  reference_type VARCHAR(50), -- payment, payout, refund, adjustment
  reference_id UUID, -- ID do recurso relacionado
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CHECK (amount > 0),
  CHECK (balance_impact IN ('increase', 'decrease')),
  CHECK (balance_type IN ('available', 'pending'))
);

-- Índices para performance
CREATE INDEX idx_ledger_merchant ON ledger_transactions(merchant_id, created_at DESC);
CREATE INDEX idx_ledger_reference ON ledger_transactions(reference_type, reference_id);
CREATE INDEX idx_ledger_type ON ledger_transactions(type, created_at DESC);

-- Tabela de payouts
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount BIGINT NOT NULL, -- Centavos
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  destination_type VARCHAR(20) NOT NULL, -- pix
  destination_data JSONB NOT NULL,
  failure_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CHECK (amount > 0)
);

CREATE INDEX idx_payouts_merchant ON payouts(merchant_id, created_at DESC);
CREATE INDEX idx_payouts_status ON payouts(status);

-- Tabela de idempotência
CREATE TABLE idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  endpoint VARCHAR(100) NOT NULL,
  request_hash VARCHAR(64) NOT NULL, -- SHA256 do payload
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- Função para atualizar saldo atomicamente
CREATE OR REPLACE FUNCTION update_merchant_balance(
  p_merchant_id UUID,
  p_balance_type VARCHAR(10),
  p_amount BIGINT,
  p_operation VARCHAR(10)
)
RETURNS VOID AS $$
BEGIN
  IF p_balance_type = 'available' THEN
    IF p_operation = 'increase' THEN
      UPDATE merchant_balances
      SET available = available + p_amount,
          total = total + p_amount,
          last_updated = NOW()
      WHERE merchant_id = p_merchant_id;
    ELSE
      UPDATE merchant_balances
      SET available = available - p_amount,
          total = total - p_amount,
          last_updated = NOW()
      WHERE merchant_id = p_merchant_id;
      
      -- Verificar saldo não ficou negativo
      IF (SELECT available FROM merchant_balances WHERE merchant_id = p_merchant_id) < 0 THEN
        RAISE EXCEPTION 'Saldo insuficiente';
      END IF;
    END IF;
  ELSIF p_balance_type = 'pending' THEN
    IF p_operation = 'increase' THEN
      UPDATE merchant_balances
      SET pending = pending + p_amount,
          total = total + p_amount,
          last_updated = NOW()
      WHERE merchant_id = p_merchant_id;
    ELSE
      UPDATE merchant_balances
      SET pending = pending - p_amount,
          total = total - p_amount,
          last_updated = NOW()
      WHERE merchant_id = p_merchant_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Exemplo de fluxo: Pagamento aprovado com cartão
-- 1. Criar ledger transaction (pending)
-- 2. Atualizar saldo pending
-- 3. Após período de retenção, mover para available

-- Exemplo de fluxo: Pagamento PIX
-- PIX não tem chargeback, então vai direto para available
INSERT INTO ledger_transactions (
  merchant_id,
  type,
  amount,
  balance_impact,
  balance_type,
  reference_type,
  reference_id,
  description
) VALUES (
  'merchant_uuid',
  'credit',
  10000, -- R$ 100,00
  'increase',
  'available', -- PIX vai direto para available
  'payment',
  'payment_uuid',
  'Pagamento PIX - R$ 100,00'
);

-- Atualizar saldo
SELECT update_merchant_balance('merchant_uuid', 'available', 10000, 'increase');

-- Exemplo: Cobrar taxa da plataforma
INSERT INTO ledger_transactions (
  merchant_id,
  type,
  amount,
  balance_impact,
  balance_type,
  reference_type,
  reference_id,
  description
) VALUES (
  'merchant_uuid',
  'fee',
  500, -- R$ 5,00 (5% de R$ 100)
  'decrease',
  'available',
  'payment',
  'payment_uuid',
  'Taxa de processamento - 5%'
);

-- Debitar taxa
SELECT update_merchant_balance('merchant_uuid', 'available', 500, 'decrease');

-- Exemplo: Criar payout
BEGIN;

-- Criar payout
INSERT INTO payouts (
  merchant_id,
  amount,
  destination_type,
  destination_data
) VALUES (
  'merchant_uuid',
  50000,
  'pix',
  '{"pix_key": "email@example.com", "pix_key_type": "email"}'::jsonb
) RETURNING id INTO payout_id;

-- Criar transação no ledger
INSERT INTO ledger_transactions (
  merchant_id,
  type,
  amount,
  balance_impact,
  balance_type,
  reference_type,
  reference_id,
  description
) VALUES (
  'merchant_uuid',
  'payout',
  50000,
  'decrease',
  'available',
  'payout',
  payout_id,
  'Saque PIX - R$ 500,00'
);

-- Debitar do saldo (vai falhar se insuficiente)
SELECT update_merchant_balance('merchant_uuid', 'available', 50000, 'decrease');

COMMIT;

-- Exemplo: Estorno (refund)
INSERT INTO ledger_transactions (
  merchant_id,
  type,
  amount,
  balance_impact,
  balance_type,
  reference_type,
  reference_id,
  description
) VALUES (
  'merchant_uuid',
  'refund',
  10000,
  'decrease',
  'available',
  'payment',
  'payment_uuid',
  'Estorno - Pagamento #12345'
);

SELECT update_merchant_balance('merchant_uuid', 'available', 10000, 'decrease');

-- Exemplo: Mover de pending para available (após período de retenção)
BEGIN;

-- Debitar de pending
INSERT INTO ledger_transactions (
  merchant_id,
  type,
  amount,
  balance_impact,
  balance_type,
  reference_type,
  reference_id,
  description
) VALUES (
  'merchant_uuid',
  'debit',
  9500,
  'decrease',
  'pending',
  'payment',
  'payment_uuid',
  'Liberação de saldo retido'
);

SELECT update_merchant_balance('merchant_uuid', 'pending', 9500, 'decrease');

-- Creditar em available
INSERT INTO ledger_transactions (
  merchant_id,
  type,
  amount,
  balance_impact,
  balance_type,
  reference_type,
  reference_id,
  description
) VALUES (
  'merchant_uuid',
  'credit',
  9500,
  'increase',
  'available',
  'payment',
  'payment_uuid',
  'Saldo liberado após retenção'
);

SELECT update_merchant_balance('merchant_uuid', 'available', 9500, 'increase');

COMMIT;

-- Query para calcular saldo (auditoria)
SELECT 
  merchant_id,
  SUM(CASE 
    WHEN balance_type = 'available' AND balance_impact = 'increase' THEN amount
    WHEN balance_type = 'available' AND balance_impact = 'decrease' THEN -amount
    ELSE 0
  END) as calculated_available,
  SUM(CASE 
    WHEN balance_type = 'pending' AND balance_impact = 'increase' THEN amount
    WHEN balance_type = 'pending' AND balance_impact = 'decrease' THEN -amount
    ELSE 0
  END) as calculated_pending
FROM ledger_transactions
WHERE merchant_id = 'merchant_uuid'
GROUP BY merchant_id;

-- Política de Retenção:
-- - PIX: sem retenção (0 dias)
-- - Boleto: sem retenção (0 dias)
-- - Cartão de Crédito: 30 dias de retenção (risco de chargeback)
