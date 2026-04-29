-- Add score_history to products_live
ALTER TABLE public.products_live
  ADD COLUMN IF NOT EXISTS score_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Watchlist table (public app, no auth model — public read/write for now)
CREATE TABLE IF NOT EXISTS public.product_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products_live(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  last_refreshed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_watchlist_product UNIQUE (product_id)
);

ALTER TABLE public.product_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product_watchlist"
  ON public.product_watchlist FOR SELECT TO public USING (true);

CREATE POLICY "Public insert product_watchlist"
  ON public.product_watchlist FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public update product_watchlist"
  ON public.product_watchlist FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Public delete product_watchlist"
  ON public.product_watchlist FOR DELETE TO public USING (true);

CREATE INDEX IF NOT EXISTS idx_product_watchlist_product ON public.product_watchlist(product_id);