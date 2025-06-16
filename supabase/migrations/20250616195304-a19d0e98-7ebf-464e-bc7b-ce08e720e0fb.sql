
-- Criar função RPC para atualizar perfil do usuário com enum correto
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id uuid,
  p_profile text,
  p_active boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    profile = p_profile::public.user_profile,
    active = p_active,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user ID %', p_user_id;
  END IF;
END;
$$;
