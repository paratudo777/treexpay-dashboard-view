
-- API Key System
CREATE TABLE public.api_keys (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_prefix text NOT NULL UNIQUE,
    key_hash text NOT NULL,
    status text NOT NULL DEFAULT 'active'::text CHECK (status IN ('active', 'revoked')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    last_used_at timestamp with time zone
);

COMMENT ON TABLE public.api_keys IS 'Stores API keys for users.';
COMMENT ON COLUMN public.api_keys.key_prefix IS 'A unique, non-sensitive prefix for key lookup (e.g., tp_live_...).';
COMMENT ON COLUMN public.api_keys.key_hash IS 'The SHA-256 hash of the API key for secure verification.';

-- Webhook System
CREATE TABLE public.user_webhooks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    url text NOT NULL,
    secret text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_webhooks IS 'Stores webhook configurations for users.';
COMMENT ON COLUMN public.user_webhooks.user_id IS 'Each user can have one webhook configuration.';
COMMENT ON COLUMN public.user_webhooks.secret IS 'A secret key to sign webhook payloads, ensuring authenticity.';

-- RLS Policies for api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys"
ON public.api_keys
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_webhooks
ALTER TABLE public.user_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own webhooks"
ON public.user_webhooks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger to update 'updated_at' on webhook change
CREATE TRIGGER handle_webhook_updated_at
BEFORE UPDATE ON public.user_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
