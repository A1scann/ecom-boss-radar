# Option B — Native seed_keyword filtering

## 1. Database migration

Add a nullable `seed_keyword` column to `products_live` plus a supporting index for the new query path.

```sql
ALTER TABLE public.products_live
  ADD COLUMN IF NOT EXISTS seed_keyword text;

CREATE INDEX IF NOT EXISTS products_live_seed_keyword_idx
  ON public.products_live (seed_keyword);
```

No RLS changes required (existing public-read policy already covers the column).

## 2. `supabase/functions/product-discover/index.ts`

Two small edits — both in the BULK DISCOVERY persist block (around lines 213–230):

- Include `seed_keyword: seed` on every upserted row (alongside `sub_niche_slug`, `sub_niche_id`, etc.).
- Keep the existing `onConflict: "sub_niche_slug,name"` unchanged so behavior is stable; the seed value is refreshed on each upsert.

(Single-refresh mode is untouched — it doesn't insert new rows.)

## 3. `src/pages/NicheResults.tsx`

### a. Refactor `fetchProducts` to take seeds, not slugs

```ts
const fetchProducts = async (seeds: string[]) => {
  if (!seeds.length) { setProducts([]); return; }
  const { data } = await supabase
    .from("products_live")
    .select("id, name, sub_niche_slug, seed_keyword, buy_price_estimate, sell_price_estimate, margin_potential, opportunity_score, verdict, competitors, source_url")
    .in("seed_keyword", seeds)
    .gte("opportunity_score", 70)
    .neq("verdict", "Rejeter")
    .order("opportunity_score", { ascending: false });
  setProducts((data ?? []) as any);
};
```

Add `seed_keyword: string | null` to the `LiveProduct` type.

### b. Cache check on mount

Replace `await fetchProducts(subList.map(s => s.slug))` with `await fetchProducts(flat.map(j => j.seed))` so the initial cache hit uses the same seed-based filter as post-search.

### c. Post-search re-query

Replace `await fetchProducts(subs.map(s => s.slug))` after the loop with `await fetchProducts(jobs.map(j => j.seed))`.

### d. Grouping with subSlug fallback

Build a `seed → subSlug` lookup from `jobs`, then assign each product to a slug:

```ts
const seedToSub = new Map(jobs.map(j => [j.seed, j.subSlug]));
const slugFor = (p: LiveProduct) =>
  p.sub_niche_slug || (p.seed_keyword ? seedToSub.get(p.seed_keyword) : undefined) || "_unknown";
```

Use `slugFor(p)` when populating `grouped`. Entries whose slug is unknown are filtered out (same behavior as today — they have no `sub` to render).

### e. Improved empty-state copy after a search run

Track whether a search has been completed in this session (`const [searched, setSearched] = useState(false)`; set to `true` in `runSearch` after the loop). Use it for the empty branch:

```tsx
{searched
  ? "Recherche terminée — 0 produits passent le seuil de score (≥ 70). Essayez de relancer la recherche."
  : jobs.length
    ? "Aucun résultat pour le moment — lance la recherche pour analyser les sous-niches."
    : "Aucune micro-niche n'est encore définie pour cette niche, la recherche n'est pas disponible."}
```

Also update the bottom fallback (`hasCache && subSectionEntries.length === 0`) to the same "Recherche terminée — 0 produits passent…" message when `searched` is true.

## Files

- Migration: new (adds column + index)
- Edited: `supabase/functions/product-discover/index.ts`, `src/pages/NicheResults.tsx`

## Notes

- No changes to `OpportunityUniverse`, `Sidebar`, `App.tsx`, `SubmitToCoach`, or other functions.
- Existing rows in `products_live` will have `seed_keyword = NULL` until re-discovered; the cache check will simply miss them and the user can click "Lancer la recherche" to repopulate. This is acceptable because the prior cache was already broken.
- The edge function will be redeployed automatically after the file change.
