
ALTER TABLE public.sub_niches_live
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.sub_niches_live(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS depth integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discovery_mode text NOT NULL DEFAULT 'validated',
  ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text;

CREATE INDEX IF NOT EXISTS idx_sub_niches_parent ON public.sub_niches_live(parent_id);
CREATE INDEX IF NOT EXISTS idx_sub_niches_macro ON public.sub_niches_live(macro_id);
CREATE INDEX IF NOT EXISTS idx_sub_niches_mode ON public.sub_niches_live(discovery_mode);
CREATE INDEX IF NOT EXISTS idx_sub_niches_opp ON public.sub_niches_live(opportunity_score DESC);

CREATE TABLE IF NOT EXISTS public.opportunity_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sub_niches_live(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.sub_niches_live(id) ON DELETE CASCADE,
  edge_type text NOT NULL DEFAULT 'adjacent',
  weight numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, target_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_edges_source ON public.opportunity_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON public.opportunity_edges(target_id);

ALTER TABLE public.opportunity_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read opportunity_edges"
  ON public.opportunity_edges FOR SELECT USING (true);
