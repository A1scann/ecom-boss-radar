ALTER TABLE public.products_live
  ADD COLUMN IF NOT EXISTS seed_keyword text;

CREATE INDEX IF NOT EXISTS products_live_seed_keyword_idx
  ON public.products_live (seed_keyword);