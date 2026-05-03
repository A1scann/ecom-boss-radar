## Goal

Split the inverted discovery flow into two stages: cheap AI-only generation (`discovery-run`) and on-demand SerpApi validation (`validate-product`). Update the Discoveries page to surface both stages.

## Part 1 — `supabase/functions/discovery-run/index.ts` (modify)

- Drop the `googleSerp`/`shoppingSerp` import; keep only `admin` from `_shared/serpapi.ts`.
- Remove helpers no longer used: `median`, `computeSignals`, `scoreProduct`, `verdictOf` (still keep `bestMatch`, `slugify`, etc.).
- Keep Steps 1 → 4 unchanged (load context, 4 parallel AI calls, dedupe, optional AI ranking to top 50).
- **Delete Step 5** (SerpApi chunked loop) and **Step 6** (signal scoring).
- **Step 7 (auto-classify)** runs on raw `Idea[]` (the post-rank `top` array). Drop the `if (e.score < 70) continue` gate — every idea is classified. Iterate over `top` instead of `enriched`. For each idea: same macro/sub matching + auto-create logic, push `{ product, macro, sub }` into `rows`.
- **Step 8 (persist)** writes one row per idea with the exact payload spec from the user message:
  - `sell_price_estimate = idea.estimated_price_eur`
  - `buy_price_estimate = round(estimated_price_eur * 0.4)`
  - `margin_potential   = round(estimated_price_eur * 0.35)`
  - `status: 'pending_validation'`
  - all SerpApi-derived fields (`opportunity_score`, `verdict`, `cpc`, `search_volume`, `competition_level`, `serp_weakness_score`, `marketplace_dominance_score`) → `null`.
  - Upsert with `onConflict: 'name,niche_slug'` but **don't overwrite validated rows**: pre-fetch existing names where `status='validated'` for the candidate `(name, niche_slug)` pairs and filter them out before upsert.
- **Step 9 (return)**: `{ totalGenerated, uniqueAfterDedupe, persisted, newMacroNiches, newSubNiches }`.

## Part 2 — `supabase/functions/validate-product/index.ts` (new)

Header comment lists `SERPAPI_KEY` requirement. Standard CORS + zod validation.

```
Body = { productIds: string[].min(1).max(50) }
```

Flow:
1. `select id, name, seed_keyword, sell_price_estimate from products_live where id in (...) and data_source='discovery_v1'`. Return 400 `NO_PRODUCTS_FOUND` if empty.
2. Chunks of 10 → for each product `Promise.all([googleSerp(seed_keyword), shoppingSerp(seed_keyword)])` inside try/catch.
3. Reuse the exact `computeSignals` + `scoreProduct` + `verdictOf` formulas from the old `discovery-run` (copy them into this file — the user said don't touch `_shared/scoring.ts`).
4. For each successful product, `await admin.from('products_live').update({...}).eq('id', id)` with the validated fields and `status: 'validated'`.
5. Return `{ validated, errors, results: [{ id, name, score, verdict }] }`.

## Part 3 — Database migration

```sql
ALTER TABLE public.products_live
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'validated';
```

Default `'validated'` keeps legacy rows visible in the validated grid.

## Part 4 — `src/pages/Discoveries.tsx`

Refactor into two sections + selection state.

State additions:
- Add `status` to `LiveProduct` and to the `select` query.
- `selectedIds: Set<string>`, `validating: boolean`.

Layout:
1. **Top header / hero** — keep existing `PageHeader` + "Lancer une découverte" button. Add helper text below: *"L'IA va générer 100 idées sans appel marché. Vous validerez ensuite manuellement celles qui vous intéressent (chaque validation = ~0.01€ SerpApi)."*
2. **Section A — "Idées à valider"** (`status === 'pending_validation'`):
   - Sticky toolbar: counter, "Tout sélectionner" checkbox (caps at 50), "Valider la sélection (n)" button.
   - Compact row list (not cards): checkbox · name · angle badge · `Prix estimé: Xe` · italic `why` (truncated) · macro/sub tags · right-side "✓ Valider marché" button.
   - Both buttons call `supabase.functions.invoke('validate-product', { body: { productIds } })`. On success, toast `${n} produits validés` and reload.
3. **Section B — "Produits validés"** (`status === 'validated' && data_source === 'discovery_v1'`):
   - Existing grid + `ProductCard` + "Afficher tous (incl. score < 70)" toggle, unchanged.

Run handler updates: toast becomes "100 idées générées, validez-les pour obtenir leur score" using `data.persisted` instead of `data.scored`.

Sidebar badge logic (new niches in last 7d) is unchanged.

## Part 5 — Out of scope

- No changes to `niche-search`, `product-discover`, `niche-discover`, `_shared/serpapi.ts`, `_shared/scoring.ts`.
- No new secrets.
- Deploy both `discovery-run` and `validate-product` after migration.

## Files

- modify `supabase/functions/discovery-run/index.ts`
- create `supabase/functions/validate-product/index.ts`
- create migration adding `products_live.status`
- modify `src/pages/Discoveries.tsx`
