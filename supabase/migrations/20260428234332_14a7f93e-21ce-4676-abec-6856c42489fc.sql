
-- Cache for raw SerpApi responses
CREATE TABLE public.serpapi_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  engine TEXT NOT NULL,
  query TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  response JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX idx_serpapi_cache_key ON public.serpapi_cache(cache_key);
CREATE INDEX idx_serpapi_cache_expires ON public.serpapi_cache(expires_at);

-- Per-keyword metrics
CREATE TABLE public.keyword_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  geo TEXT NOT NULL DEFAULT 'FR',
  search_interest INT,
  trend_stability NUMERIC,
  seasonality_score NUMERIC,
  is_rising BOOLEAN DEFAULT false,
  is_breakout BOOLEAN DEFAULT false,
  related_queries JSONB DEFAULT '[]'::jsonb,
  related_topics JSONB DEFAULT '[]'::jsonb,
  rising_queries JSONB DEFAULT '[]'::jsonb,
  paa_questions JSONB DEFAULT '[]'::jsonb,
  autocomplete JSONB DEFAULT '[]'::jsonb,
  commercial_intent_score NUMERIC,
  advertiser_density INT,
  shopping_advertiser_count INT,
  marketplace_dominance_score NUMERIC,
  serp_weakness_score NUMERIC,
  cpc_proxy NUMERIC,
  price_dispersion NUMERIC,
  regional_demand JSONB DEFAULT '{}'::jsonb,
  trend_series JSONB DEFAULT '[]'::jsonb,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(keyword, geo)
);
CREATE INDEX idx_keyword_metrics_keyword ON public.keyword_metrics(keyword);

-- Macro niches (Level 1)
CREATE TABLE public.macro_niches_live (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  momentum NUMERIC DEFAULT 0,
  total_demand BIGINT DEFAULT 0,
  sub_niche_count INT DEFAULT 0,
  avg_opportunity NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sub niches (Level 2) — full scoring engine outputs
CREATE TABLE public.sub_niches_live (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  macro_id UUID REFERENCES public.macro_niches_live(id) ON DELETE CASCADE,
  category TEXT,
  seed_keyword TEXT NOT NULL,
  mode TEXT DEFAULT 'validated',
  maturity TEXT DEFAULT 'Emerging',
  watchlist BOOLEAN DEFAULT false,
  hidden_signal TEXT,
  -- Demand signals
  search_demand INT DEFAULT 0,
  demand_growth_90d NUMERIC DEFAULT 0,
  demand_acceleration NUMERIC DEFAULT 0,
  trend_series JSONB DEFAULT '[]'::jsonb,
  seasonality NUMERIC DEFAULT 0,
  emerging_clusters JSONB DEFAULT '[]'::jsonb,
  -- Competition signals
  competition_shift NUMERIC DEFAULT 0,
  advertiser_density INT DEFAULT 0,
  shopping_advertiser_count INT DEFAULT 0,
  marketplace_dominance_score NUMERIC DEFAULT 0,
  serp_weakness_score NUMERIC DEFAULT 0,
  -- Pricing
  cpc NUMERIC DEFAULT 0,
  margin_potential NUMERIC DEFAULT 0,
  price_dispersion NUMERIC DEFAULT 0,
  -- Scoring engine
  opportunity_score NUMERIC DEFAULT 0,
  alpha_score NUMERIC DEFAULT 0,
  hidden_opportunity_score NUMERIC DEFAULT 0,
  supplier_feasibility_score NUMERIC DEFAULT 0,
  breakeven_roas NUMERIC,
  estimated_cpa NUMERIC,
  -- Meta
  data_source TEXT DEFAULT 'mock',
  last_signal_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sub_niches_macro ON public.sub_niches_live(macro_id);
CREATE INDEX idx_sub_niches_watchlist ON public.sub_niches_live(watchlist);
CREATE INDEX idx_sub_niches_opportunity ON public.sub_niches_live(opportunity_score DESC);

-- Keywords clustered into sub-niches
CREATE TABLE public.niche_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_niche_id UUID REFERENCES public.sub_niches_live(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  cluster_label TEXT,
  intent TEXT,
  search_interest INT,
  is_rising BOOLEAN DEFAULT false,
  is_breakout BOOLEAN DEFAULT false,
  commercial_intent_score NUMERIC,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sub_niche_id, keyword)
);
CREATE INDEX idx_niche_keywords_sub ON public.niche_keywords(sub_niche_id);

-- Enable RLS
ALTER TABLE public.serpapi_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_niches_live ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_niches_live ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niche_keywords ENABLE ROW LEVEL SECURITY;

-- Public read policies (market intelligence is shared)
CREATE POLICY "Public read keyword_metrics" ON public.keyword_metrics FOR SELECT USING (true);
CREATE POLICY "Public read macro_niches" ON public.macro_niches_live FOR SELECT USING (true);
CREATE POLICY "Public read sub_niches" ON public.sub_niches_live FOR SELECT USING (true);
CREATE POLICY "Public read niche_keywords" ON public.niche_keywords FOR SELECT USING (true);
-- Cache: no client read (only edge functions via service role)

-- Updated-at trigger function
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_macro_niches_updated BEFORE UPDATE ON public.macro_niches_live
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_sub_niches_updated BEFORE UPDATE ON public.sub_niches_live
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
