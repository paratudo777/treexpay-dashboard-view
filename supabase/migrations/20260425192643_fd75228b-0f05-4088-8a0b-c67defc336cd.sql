-- Remove o constraint antigo que bloqueava 'btc'
ALTER TABLE public.withdrawals
  DROP CONSTRAINT IF EXISTS withdrawals_pix_key_type_check;

-- Recria aceitando 'btc' além dos tipos PIX já existentes
ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_pix_key_type_check
  CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random_key', 'btc'));