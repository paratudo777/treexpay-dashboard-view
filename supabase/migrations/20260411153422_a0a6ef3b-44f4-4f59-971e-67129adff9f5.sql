
-- Global acquirer config (singleton row)
CREATE TABLE public.acquirer_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_provider text NOT NULL DEFAULT 'novaera',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.acquirer_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view acquirer config"
  ON public.acquirer_config FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update acquirer config"
  ON public.acquirer_config FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert acquirer config"
  ON public.acquirer_config FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Seed default row
INSERT INTO public.acquirer_config (default_provider) VALUES ('novaera');

-- Per-user acquirer override
CREATE TABLE public.user_acquirer_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_acquirer_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user acquirer config"
  ON public.user_acquirer_config FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can view own acquirer config"
  ON public.user_acquirer_config FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Helper function to resolve provider for a user
CREATE OR REPLACE FUNCTION public.resolve_user_provider(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT provider FROM public.user_acquirer_config WHERE user_id = p_user_id),
    (SELECT default_provider FROM public.acquirer_config LIMIT 1),
    'novaera'
  );
$$;
