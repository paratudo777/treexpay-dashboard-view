
-- CRITICAL FIX: Users can currently set their own balance to any value!
-- Replace the update policy to block balance and active modifications

DROP POLICY IF EXISTS "Users can update their own profile safely" ON public.profiles;

CREATE POLICY "Users can update their own profile safely"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND profile = (SELECT p.profile FROM public.profiles p WHERE p.id = auth.uid())
  AND balance = (SELECT p.balance FROM public.profiles p WHERE p.id = auth.uid())
  AND active = (SELECT p.active FROM public.profiles p WHERE p.id = auth.uid())
);
