CREATE OR REPLACE FUNCTION public.generate_api_keys_for_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _pk text;
  _sk text;
  _random text;
BEGIN
  -- Verificar se já existe chave ATIVA para este usuário
  IF EXISTS (SELECT 1 FROM public.api_keys WHERE user_id = p_user_id AND status = 'active') THEN
    RETURN;
  END IF;

  _random := encode(extensions.gen_random_bytes(24), 'hex');
  _pk := 'pk_live_' || _random;
  
  _random := encode(extensions.gen_random_bytes(24), 'hex');
  _sk := 'sk_live_' || _random;

  INSERT INTO public.api_keys (
    user_id, public_key, secret_key, key_prefix, key_hash, status
  ) VALUES (
    p_user_id, _pk, _sk,
    substring(_sk from 1 for 16),
    encode(extensions.digest(_sk, 'sha256'), 'hex'),
    'active'
  );
END;
$function$;