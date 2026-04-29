DROP INDEX IF EXISTS public.uq_products_live_slug_name;
CREATE UNIQUE INDEX uq_products_live_slug_name ON public.products_live (sub_niche_slug, name);