-- Create security definer function to check checkout ownership
CREATE OR REPLACE FUNCTION public.owns_checkout(_user_id uuid, _checkout_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.checkouts
    WHERE id = _checkout_id
      AND user_id = _user_id
  )
$$;

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Checkout owners can view their payments" ON public.checkout_payments;

-- Create a new, more secure SELECT policy
CREATE POLICY "Authenticated checkout owners can view their payments"
ON public.checkout_payments
FOR SELECT
TO authenticated
USING (public.owns_checkout(auth.uid(), checkout_id));

-- Ensure RLS is enabled
ALTER TABLE public.checkout_payments ENABLE ROW LEVEL SECURITY;