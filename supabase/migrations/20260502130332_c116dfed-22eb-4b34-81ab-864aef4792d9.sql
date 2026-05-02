ALTER TABLE public.products_live
  ADD COLUMN IF NOT EXISTS niche_slug text;

CREATE INDEX IF NOT EXISTS products_live_niche_slug_idx
  ON public.products_live (niche_slug);