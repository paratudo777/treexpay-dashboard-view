
-- Add visual configuration columns to checkouts
ALTER TABLE public.checkouts
  ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'modern',
  ADD COLUMN IF NOT EXISTS color_theme text NOT NULL DEFAULT 'purple',
  ADD COLUMN IF NOT EXISTS button_text text NOT NULL DEFAULT 'Comprar agora',
  ADD COLUMN IF NOT EXISTS security_message text NOT NULL DEFAULT 'Compra 100% segura',
  ADD COLUMN IF NOT EXISTS enable_pix boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_card boolean NOT NULL DEFAULT false;

-- Update the public_checkouts view to include the new visual fields
CREATE OR REPLACE VIEW public.public_checkouts WITH (security_barrier = true) AS
  SELECT
    id,
    title,
    description,
    amount,
    image_url,
    url_slug,
    active,
    created_at,
    template,
    color_theme,
    button_text,
    security_message,
    enable_pix,
    enable_card
  FROM public.checkouts
  WHERE active = true;

-- Grant access to the view
GRANT SELECT ON public.public_checkouts TO anon, authenticated;
