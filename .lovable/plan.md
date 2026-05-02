# Niche-wide product search

Today, `NicheResults` loops over every micro-niche seed and invokes `product-discover` once per seed. That is slow, wastes SerpApi credits, and only finds products tied to a pre-defined seed. The new `niche-search` function does one broad sweep over the niche, classifies each result into a sub-niche, and persists everything in a single call.

## 1. New edge function — `supabase/functions/niche-search/index.ts`

**Input** (zod-validated): `{ nicheSlug: string }`

**Steps:**

1. Load the niche: `SELECT id, name FROM niches WHERE slug = nicheSlug` (404 if missing).
2. Load all sub-niches: `SELECT id, slug, name, description FROM sub_niches WHERE niche_id = niche.id`.
3. Build up to 5 broad Google Shopping queries:
   - `"{niche.name} produit high ticket france"`
   - For each sub-niche (capped to 4): `"{sub_niche.name} acheter prix"`
4. Call `shoppingSerp(query)` for each (already cached + admin client wired in `_shared/serpapi.ts`).
5. Flatten `shopping_results`, then dedupe by fuzzy title:
   - Normalize titles (lowercase, strip punctuation, collapse spaces).
   - Use a token-overlap ratio (Jaccard on word sets); skip a candidate if ratio > 0.8 with any kept candidate. Keep the one with the most signal (price present, more sources).
6. **Classify each candidate** into a sub-niche:
   - For every sub-niche, build a keyword bag from `name` + `description` (lowercased tokens, length ≥ 3, stopwords removed).
   - Score = count of sub-niche tokens appearing in the product title.
   - Pick the highest-scoring sub-niche; ties broken by sub-niche name length (longer = more specific). If no token matches, fallback to the first sub-niche.
7. **Score each candidate** (matches the spec):
   - `price = extracted_price` (skip candidate if no price)
   - `margin_potential = round(price * 0.35)`
   - `opportunity_score = 60`
     - `+10` if `price > 200`
     - `+10` if `margin_potential > 150`
     - `+10` if no domain in the query's shopping_results contains "amazon" within the top 5
     - `+10` if total advertisers across queries < 5
   - `verdict = score>=80 ? "Prioritaire" : score>=70 ? "À tester" : "Rejeter"`
8. **Upsert** into `products_live` with `onConflict: "name,sub_niche_slug"`:
   - `name`, `sub_niche_slug`, `niche_slug`, `sub_niche_id` (looked up from `sub_niches_live` by slug, nullable),
   - `buy_price_estimate = round(price * 0.4)`, `sell_price_estimate = round(price)`, `margin_potential`,
   - `opportunity_score`, `verdict`, `seed_keyword = query`,
   - `data_source: "serpapi"`, `last_signal_at: now()`, `source_url`, `thumbnail`.
9. **Response:** `{ niche: niche.name, total: <persisted count>, bySubNiche: { [slug]: count } }`.

CORS + JSON helper copied from `product-discover`. No JWT required (matches sibling functions). Uses `admin` client from `_shared/serpapi.ts`.

## 2. Schema migration

`products_live` is missing the `niche_slug` column the spec requires:

```sql
ALTER TABLE public.products_live
  ADD COLUMN IF NOT EXISTS niche_slug text;

CREATE INDEX IF NOT EXISTS products_live_niche_slug_idx
  ON public.products_live (niche_slug);
```

No RLS changes (existing public-read policy already covers new columns).

## 3. `src/pages/NicheResults.tsx` rewrite of `runSearch`

Replace the per-seed loop with a single invocation:

- Drop the `progress`/`jobs` per-seed UI; replace with a single indeterminate spinner ("Analyse de la niche en cours…").
- `runSearch` calls `supabase.functions.invoke("niche-search", { body: { nicheSlug } })`.
- After the call, refetch products by `niche_slug`:
  ```ts
  await supabase.from("products_live")
    .select("...")
    .eq("niche_slug", nicheSlug)
    .gte("opportunity_score", 70)
    .neq("verdict", "Rejeter")
    .order("opportunity_score", { ascending: false });
  ```
- Update the cache check on mount to use the same `niche_slug` filter (replaces the `seed_keyword IN (...)` query, which depended on micro-niches existing).
- Grouping stays by `sub_niche_slug` — products now always have it set by `niche-search`.
- Keep the existing empty-state copy (already covers the "0 produits ≥ 70" case via `searched`).
- The "Lancer la recherche" button is enabled whenever a niche is loaded — micro-niches are no longer required.
- Show the result toast using the function's `total` and number of sub-niches in `bySubNiche`.

## 4. Files

- **New:** `supabase/functions/niche-search/index.ts`
- **New migration:** add `niche_slug` column + index to `products_live`
- **Edited:** `src/pages/NicheResults.tsx` (runSearch, cache fetch, header copy, button enable rule)

## 5. Notes

- Existing rows without `niche_slug` won't appear in the cache view; the user can re-run the search to backfill.
- The 5-query cap means very broad niches with many sub-niches won't get one query per sub-niche — sub-niche assignment falls back to keyword classification on the broad query results, which is the intended behavior.
- `product-discover` is left untouched (still used by the watchlist refresh flow).
