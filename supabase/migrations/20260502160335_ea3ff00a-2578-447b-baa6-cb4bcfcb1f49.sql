ALTER TABLE public.products_live
  ADD COLUMN IF NOT EXISTS serp_weakness_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketplace_dominance_score NUMERIC DEFAULT 0;