CREATE TABLE IF NOT EXISTS public.products_live (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sub_niche_slug text NOT NULL,
  sub_niche_id uuid,
  buy_price_estimate numeric DEFAULT 0,
  sell_price_estimate numeric DEFAULT 0,
  median_price numeric DEFAULT 0,
  min_price numeric DEFAULT 0,
  max_price numeric DEFAULT 0,
  margin_potential numeric DEFAULT 0,
  opportunity_score numeric DEFAULT 0,
  buying_intent numeric DEFAULT 0,
  competition_difficulty numeric DEFAULT 0,
  offline_scarcity numeric DEFAULT 0,
  advertiser_count integer DEFAULT 0,
  verdict text DEFAULT 'À tester',
  competitors jsonb DEFAULT '[]'::jsonb,
  thumbnail text,
  source_url text,
  data_source text DEFAULT 'serpapi',
  last_signal_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_live_slug ON public.products_live(sub_niche_slug);
CREATE INDEX IF NOT EXISTS idx_products_live_score ON public.products_live(opportunity_score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_live_slug_name ON public.products_live(sub_niche_slug, lower(name));

ALTER TABLE public.products_live ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read products_live"
ON public.products_live FOR SELECT
USING (true);

CREATE TRIGGER products_live_touch_updated_at
BEFORE UPDATE ON public.products_live
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();