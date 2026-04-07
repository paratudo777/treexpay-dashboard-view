
-- Adicionar colunas de chaves estilo Stripe
ALTER TABLE public.api_keys 
  ADD COLUMN IF NOT EXISTS public_key text,
  ADD COLUMN IF NOT EXISTS secret_key text;

-- Criar índice único para as chaves
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_public_key ON public.api_keys(public_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_secret_key ON public.api_keys(secret_key);

-- Função para gerar chaves API estilo Stripe
CREATE OR REPLACE FUNCTION public.generate_api_keys_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pk text;
  _sk text;
  _random text;
  _hash text;
BEGIN
  -- Verificar se já existe chave para este usuário
  IF EXISTS (SELECT 1 FROM public.api_keys WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  -- Gerar random string
  _random := encode(gen_random_bytes(24), 'hex');
  _pk := 'pk_live_' || _random;
  
  _random := encode(gen_random_bytes(24), 'hex');
  _sk := 'sk_live_' || _random;

  -- Hash para key_hash (usando prefix da sk)
  INSERT INTO public.api_keys (
    user_id, 
    public_key, 
    secret_key, 
    key_prefix, 
    key_hash, 
    status
  ) VALUES (
    p_user_id,
    _pk,
    _sk,
    substring(_sk from 1 for 16),
    encode(digest(_sk, 'sha256'), 'hex'),
    'active'
  );
END;
$$;

-- Trigger: gerar chaves quando novo perfil é criado
CREATE OR REPLACE FUNCTION public.auto_generate_api_keys()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.generate_api_keys_for_user(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_api_keys ON public.profiles;
CREATE TRIGGER trigger_auto_generate_api_keys
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_api_keys();
