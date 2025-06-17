
-- Primeiro, vamos dropar o trigger e a função existentes para recriá-los corretamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recriar a função handle_new_user() com correções
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile_value public.user_profile;
  user_name text;
BEGIN
  -- Log para debug
  RAISE LOG 'handle_new_user: Starting for user %', NEW.id;
  
  -- Extrair o nome dos metadados ou usar email como fallback
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  
  -- Determinar o perfil baseado no email
  IF NEW.email IN ('manomassa717@gmail.com', 'admin@treexpay.com') THEN
    user_profile_value := 'admin'::public.user_profile;
  ELSE
    user_profile_value := 'user'::public.user_profile;
  END IF;
  
  -- Log para debug
  RAISE LOG 'handle_new_user: Inserting profile for user % with profile %', NEW.id, user_profile_value;
  
  -- Inserir na tabela profiles com cast explícito
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    profile,
    active,
    balance,
    notifications_enabled,
    two_fa_enabled
  )
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    user_profile_value,
    true,
    0.00,
    true,
    false
  );
  
  -- Log de sucesso
  RAISE LOG 'handle_new_user: Profile created successfully for user %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log detalhado do erro
    RAISE LOG 'handle_new_user: Error for user %: % %', NEW.id, SQLSTATE, SQLERRM;
    -- Re-raise o erro para que seja tratado adequadamente
    RAISE;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Verificar se o enum user_profile existe e tem os valores corretos
DO $$
BEGIN
  -- Verificar se o tipo existe
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_profile') THEN
    CREATE TYPE public.user_profile AS ENUM ('admin', 'user');
  END IF;
END $$;

-- Garantir que a tabela profiles tenha a estrutura correta
ALTER TABLE public.profiles 
  ALTER COLUMN profile SET DEFAULT 'user'::public.user_profile;

-- Adicionar constraint para garantir que o profile seja válido
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_profile_check;

-- Log de finalização
SELECT 'Função handle_new_user() e trigger recriados com sucesso' as status;
