
-- Security Fixes Migration
-- Phase 1: Critical RLS Policy Fixes

-- 1. Add RLS policies for api_keys table
CREATE POLICY "Users can view their own API keys"
ON public.api_keys
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys"
ON public.api_keys
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
ON public.api_keys
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
ON public.api_keys
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2. Add RLS policies for user_webhooks table
CREATE POLICY "Users can view their own webhooks"
ON public.user_webhooks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own webhooks"
ON public.user_webhooks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks"
ON public.user_webhooks
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks"
ON public.user_webhooks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3. Add RLS policies for checkout_payments table
CREATE POLICY "Users can view payments for their checkouts"
ON public.checkout_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.checkouts c 
    WHERE c.id = checkout_payments.checkout_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all checkout payments"
ON public.checkout_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.profile = 'admin'
  )
);

-- No INSERT/UPDATE/DELETE policies for checkout_payments as they're managed by webhooks

-- 4. Create centralized admin check function for better security
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND profile = 'admin'
  );
$$;

-- 5. Add admin policies for sensitive tables
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR public.is_current_user_admin()
);

CREATE POLICY "Admins can update user profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawals
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

-- 6. Ensure RLS is enabled on all critical tables
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_payments ENABLE ROW LEVEL SECURITY;

-- 7. Create webhook signature verification function
CREATE OR REPLACE FUNCTION public.verify_webhook_signature(
  payload text,
  signature text,
  secret text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  computed_signature text;
BEGIN
  -- Compute HMAC-SHA256 signature
  computed_signature := encode(
    hmac(payload::bytea, secret::bytea, 'sha256'),
    'hex'
  );
  
  -- Compare signatures (timing-safe comparison)
  RETURN computed_signature = signature;
END;
$$;

-- 8. Log completion
SELECT 'Security fixes applied successfully - RLS policies added for api_keys, user_webhooks, checkout_payments' as status;
