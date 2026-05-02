# 2-pass AI niche-search — implementation plan

All 4 parts deploy together in one go.

## Part 1 — Migration (`products_live`)

New file `supabase/migrations/<ts>_niche_search_fields.sql`:

```sql
ALTER TABLE public.products_live
  ADD COLUMN IF NOT EXISTS search_volume integer,
  ADD COLUMN IF NOT EXISTS competition_level text,
  ADD COLUMN IF NOT EXISTS why text,
  ADD COLUMN IF NOT EXISTS angle text;

-- Dedupe before adding unique indexes
DELETE FROM public.products_live a USING public.products_live b
WHERE a.ctid < b.ctid AND a.name = b.name
  AND a.niche_slug IS NOT DISTINCT FROM b.niche_slug
  AND a.niche_slug IS NOT NULL;

DELETE FROM public.products_live a USING public.products_live b
WHERE a.ctid < b.ctid AND a.name = b.name AND a.sub_niche_slug = b.sub_niche_slug;

CREATE UNIQUE INDEX IF NOT EXISTS products_live_name_niche_slug_uniq
  ON public.products_live (name, niche_slug) WHERE niche_slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_live_name_sub_niche_slug_uniq
  ON public.products_live (name, sub_niche_slug);
```

This unblocks `onConflict: "name,niche_slug"` (new) and keeps `onConflict: "name,sub_niche_slug"` (used by `product-discover`) working.

## Part 2 — `supabase/functions/niche-search/index.ts` (full rewrite)

Header comment:
```
// REQUIRES: ANTHROPIC_API_KEY in Supabase Dashboard → Edge Functions → Secrets
// REQUIRES: SERPAPI_KEY (existing)
// Architecture: 2-pass AI (broad@T=1.0 → filter@T=0.3) + SerpApi validation in chunks of 10
```

Flow:
1. Validate `{ nicheSlug }` (zod). CORS preflight.
2. Check `ANTHROPIC_API_KEY` env → if missing return `500 { error: "MISSING_ANTHROPIC_KEY", message }`.
3. Load niche by slug (404 `NICHE_NOT_FOUND`) and its sub_niches (400 `NO_SUB_NICHES`).
4. **Pass 1**: POST `https://api.anthropic.com/v1/messages` model `claude-sonnet-4-5-20250929`, temp 1.0, max_tokens 4000, exact 50-ideas prompt from spec. Strip ``` fences, regex-extract `{...}`, JSON.parse. Require ≥20 ideas else throw → `AI_GENERATION_FAILED`.
5. **Pass 2**: same endpoint, temp 0.3, exact filtering prompt with `JSON.stringify(broadIdeas, null, 2)` interpolated. Same robust parse. Require ≥1 product else throw.
6. **SerpApi validation**: chunks of 10 via `Promise.all([googleSerp(kw), shoppingSerp(kw)])` per product, per-product try/catch. Failures counted, not fatal.
7. **Compute signals** per product:
   - `adDensity` = ads + shopping_ads count from serpData
   - `searchDemand` = clamp(0..100, organic*5 + adDensity*4)
   - `cpcEstimate` = `adDensity * 0.8` (rounded 2dp)
   - `competitionLevel` = High / Medium / Low at thresholds 8, 4
   - `marketplaceDominance` = % of organic links from amazon.fr, cdiscount.com, leroymerlin.fr, fnac.com, darty.com
   - `serpWeakness` = 100 minus snippet-length penalty, knowledge_graph penalty, related_questions penalty, marketplace penalty (clamped 0..100)
   - `realPriceFR` = median of `shopping_results[].extracted_price`, fallback `estimated_price_eur`
   - `marginPotential` = round(realPriceFR * 0.35)
8. **Score** exactly per spec (5 × 20-pt bonuses), verdict at 80 / 70.
9. **Classify** AI's `sub_niche` string → exact name match (normalized) → token-overlap fallback → first sub-niche fallback (with console.warn).
10. **Persist all** (incl. <70) via upsert on `(name, niche_slug)` with full field set including `search_volume`, `competition_level`, `why`, `angle`, `cpc`, `serp_weakness_score`, `marketplace_dominance_score`, `seed_keyword`, `data_source: "ai+serpapi"`, `last_signal_at`.
11. Return `{ niche, total, scored, bySubNiche, errors }`.

All Anthropic/SerpApi failures wrapped to return structured `{ error, message }` with status 500.

## Part 3 — `src/pages/NicheResults.tsx` (rewrite)

- Extend `LiveProduct` type with `cpc`, `search_volume`, `competition_level`, `serp_weakness_score`, `marketplace_dominance_score`, `why`, `angle`.
- `fetchProducts`: SELECT all new columns. **Drop** `.gte("opportunity_score", 70)` and `.neq("verdict","Rejeter")` from the query — fetch everything, filter client-side.
- New state: `showAll: boolean` (default false), `banner: { kind: "error" | "warn", message } | null`.
- `runSearch`: invoke function; if `data.error` or function returns structured error, parse via `error.context` and route to `handleErrorPayload` mapping codes:
  - `MISSING_ANTHROPIC_KEY` → red banner: *"⚠️ Clé API Anthropic manquante — ajoutez ANTHROPIC_API_KEY dans Supabase Dashboard → Edge Functions → Secrets"*
  - `AI_GENERATION_FAILED` → orange banner with message
  - `SERPAPI_FAILED` → orange banner with message
  - other → orange banner with message
- Banner rendered above PageHeader, dismissible (X button).
- Below the search button: italic muted helper *"L'IA va générer 50 idées larges, filtrer les 30 meilleures, puis SerpApi valide chaque idée sur le marché français. Cela peut prendre 60 à 90 secondes."*
- Loader hint upgraded to *"(60–90 s)"*.
- Header row above sections: count `{qualified}/{total} produits qualifiés (≥ 70)` + checkbox *Afficher tous les produits*.
- New `<ProductCard>` subcomponent per spec:
  - Top: `angle` outline badge (if any), then `<h3>` name + external link, then italic muted `why`.
  - Right: `ScorePill` (existing component already color-codes).
  - Three-up grid: Achat / Vente FR / Marge (green).
  - Two-up: CPC estimé (€) + Concurrence colored badge (Low=green, Medium=orange, High=red).
  - SERP Weakness label + `<Progress value={...} className="h-1.5" />` from `@/components/ui/progress`.
  - Verdict badge (Prioritaire green / À tester orange / Rejeter gray).
  - Existing shortlist + `<SubmitToCoach />` buttons preserved.

## Part 4 — Post-deploy reminder

After deploy you must add `ANTHROPIC_API_KEY` in **Connectors → Lovable Cloud → Edge Function Secrets**. Until then, clicking "Lancer la recherche" surfaces the red MISSING_ANTHROPIC_KEY banner with the exact instructions. SerpApi key is already configured.

## Files touched

- `supabase/migrations/<ts>_niche_search_fields.sql` (new)
- `supabase/functions/niche-search/index.ts` (rewrite)
- `src/pages/NicheResults.tsx` (rewrite)
- `src/integrations/supabase/types.ts` (auto-regenerated)
