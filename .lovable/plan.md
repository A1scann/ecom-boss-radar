## Goal

Add an inverted discovery flow: AI generates 100 high-ticket FR product ideas without niche constraint, SerpApi validates the best ones, and qualifying products auto-classify into existing macro/sub-niches or create new ones. Existing `niche-search` flow is left untouched.

## Part 1 — New edge function `supabase/functions/discovery-run/index.ts`

Single-file Deno function, mirroring conventions in `niche-search/index.ts` (CORS, zod input, `_shared/serpapi.ts` reuse, `computeSignals`-style scoring, chunked SerpApi calls).

Pipeline:

```text
Input { force_new? }
  └─ Step 1: load macro_niches, sub_niches, last 200 product names (data_source='discovery_v1')
  └─ Step 2: 4 parallel AI calls (gpt-5, max_completion_tokens 16000,
              reasoning_effort minimal, response_format json_object)
              · 25 ideas each, 4 angle hints (problème / statut / temps / sécurité)
              · prompt enforces 200-5000€, no dominant brands, no premium-stuffed names,
                excludes already-discovered names + same anti-patterns as niche-search
  └─ Step 3: normalize + dedupe (case/accents/punct), drop names already in exclusions
  └─ Step 4: if >50 unique → 1 AI ranking call returns top 50; else use unique
  └─ Step 5: SerpApi validation in chunks of 10 (googleSerp + shoppingSerp,
              per-product try/catch; failures counted not fatal)
  └─ Step 6: same scoring as niche-search (5×20 bonuses → verdict)
  └─ Step 7: AUTO-CLASSIFY (only score ≥ 70)
              · token-overlap match against macro_niches (≥0.40 → reuse,
                else insert new macro with slugified name + "Auto-discovered…"
                description, track in newMacroNiches[])
              · same logic for sub_niches within chosen macro,
                inserting with macro_id + niche_id null
              · strip "premium / haut de gamme / luxe" before slugify;
                fall back to "Divers" macro (or skip product) if name empties
  └─ Step 8: upsert into products_live on (name, niche_slug),
              data_source='discovery_v1', niche_slug=sub.slug, full signal payload
  └─ Step 9: return { totalGenerated, uniqueAfterDedupe, validated, scored,
              newMacroNiches[], newSubNiches[], errors }
```

Helper `callAI` is local to the file (own copy; do not modify niche-search). Slugify helper handles accents + non-alphanumeric collapse.

## Part 2 — Frontend

1. **`src/pages/Discoveries.tsx` (new, route `/discoveries`)**
   - Top button "🔍 Lancer une découverte" → `supabase.functions.invoke('discovery-run')` with loading state ("Découverte en cours… 60 à 120s") and sonner toast on success ("X produits découverts, Y nouvelles niches").
   - Section "Nouvelles niches découvertes" — only render if there are macro/sub niches with `created_at > now() - 7d`.
   - Main grid: `products_live` filtered by `data_source='discovery_v1'` and `opportunity_score >= 70`, ordered by score, grouped per macro (joined via sub_niche_slug → sub_niches → macro_id → macro_niches).
   - Toggle "Afficher tous (incl. score < 70)" defaults off — when on, removes the score filter (still keeps `data_source='discovery_v1'`).
   - Each card reuses the shortlist + SubmitToCoach + ScorePill UX from `NicheResults.tsx` (extract a small `ProductCard` inline — no shared refactor of NicheResults to keep blast radius small).

2. **`src/App.tsx`** — register `<Route path="/discoveries" element={<Discoveries />} />`.

3. **`src/components/layout/Sidebar.tsx`** — add "Dernières découvertes" entry (Sparkles/Compass icon) at the top of `items`. Reuse the same dynamic-badge mechanism: query `count` of `macro_niches` + `sub_niches` rows with `created_at > now()-7d`, show as a chip badge (e.g. `+3`) when > 0.

4. **Filter consistency** — only the new `Discoveries` page filters on `data_source='discovery_v1'`. All other pages (NicheResults etc.) continue to read products as today; existing 127 legacy rows stay invisible on Discoveries.

## Part 3 — Out of scope (do not touch)

- `niche-search/index.ts`, `product-discover/index.ts`, `niche-discover/index.ts`
- `_shared/scoring.ts`, `_shared/serpapi.ts`
- No DB migration needed (all required columns already exist on `products_live`, `macro_niches`, `sub_niches`)
- No new secrets

## Deployment

Deploy `discovery-run` (the only new edge function); frontend rebuilds automatically.
