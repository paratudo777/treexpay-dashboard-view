
-- Add PIX-related columns to api_payments
ALTER TABLE public.api_payments
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS pix_code text,
  ADD COLUMN IF NOT EXISTS qr_code text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'novaera';

-- Index for fast webhook lookup by external_id
CREATE INDEX IF NOT EXISTS idx_api_payments_external_id ON public.api_payments(external_id) WHERE external_id IS NOT NULL;
