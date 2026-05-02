ALTER TABLE public.products_live
  ADD COLUMN IF NOT EXISTS search_volume integer,
  ADD COLUMN IF NOT EXISTS competition_level text,
  ADD COLUMN IF NOT EXISTS why text,
  ADD COLUMN IF NOT EXISTS angle text;

DELETE FROM public.products_live a
USING public.products_live b
WHERE a.ctid < b.ctid
  AND a.name = b.name
  AND a.niche_slug IS NOT DISTINCT FROM b.niche_slug
  AND a.niche_slug IS NOT NULL;

DELETE FROM public.products_live a
USING public.products_live b
WHERE a.ctid < b.ctid
  AND a.name = b.name
  AND a.sub_niche_slug = b.sub_niche_slug;

CREATE UNIQUE INDEX IF NOT EXISTS products_live_name_niche_slug_uniq
  ON public.products_live (name, niche_slug)
  WHERE niche_slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_live_name_sub_niche_slug_uniq
  ON public.products_live (name, sub_niche_slug);