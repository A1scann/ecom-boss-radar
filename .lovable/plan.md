## 4 precise file changes

### 1. `src/components/layout/Sidebar.tsx` — edit

Replace the `items` array (and trim unused imports `Radar`, `Package`, `Zap`) with exactly 6 entries, in order:

```ts
const items = [
  { to: "/",          label: "Découvrir des niches", icon: Globe },
  { to: "/insights",  label: "Tableau de bord",      icon: LayoutDashboard },
  { to: "/scoring",   label: "Scoring produit",      icon: Target },
  { to: "/angles",    label: "Angles marketing",     icon: Sparkles },
  { to: "/spy",       label: "Analyse concurrents",  icon: Eye },
  { to: "/shortlist", label: "Ma sélection",         icon: Bookmark },
];
```

The dynamic-badge logic for "Signaux live" is preserved in JSX (the `dynamic` field is gone from the items, so the badge simply never renders). Logo, branding block, and footer card stay untouched.

### 2. `src/pages/OpportunityUniverse.tsx` — full rewrite

New niche selector:
- Fetch `macro_niches` (id, slug, name, description, icon) and `niches` (id, slug, name, description, macro_id) in parallel.
- Group niches client-side by `macro_id`.
- Render one `Collapsible` per macro (open by default), header = `{icon} {name}` + niche count.
- Inside, grid of niche cards: bold name, muted description, full-width green button "Rechercher des produits →" → `navigate(/results/{niche.slug})`.
- `PageHeader` title "Découvrir des niches", subtitle "Choisissez une niche et lancez une recherche produit."
- Loading state while fetching.

### 3. `src/App.tsx` — add 1 import + 1 route

```tsx
import NicheResults from "./pages/NicheResults";
// ...
<Route path="/results/:nicheSlug" element={<NicheResults />} />
```

Inserted inside the existing `<Route element={<AppLayout />}>` block, right after `/sub-niche/:slug`. All other routes untouched.

### 4. `src/pages/NicheResults.tsx` — create

Workflow (using the **aggregate-from-micro_niches** seed strategy you chose):

1. Read `nicheSlug` from `useParams`.
2. Fetch `niche` by slug (id, name).
3. Fetch all `sub_niches` for that niche (id, slug, name).
4. For each sub-niche, fetch its `micro_niches` (id, name, seed_keyword); flatten into a list of search jobs:
   ```ts
   { subSlug, subName, microName, seed: micro.seed_keyword }
   ```
   Sub-niches with zero micro_niches are listed in a "Sans recherche disponible" notice (skipped, not searched).
5. **Cache check on mount**: query `products_live` where `sub_niche_slug IN (subSlugs)` AND `opportunity_score >= 70` AND `verdict != 'Rejeter'`. If results exist → render immediately + show "Relancer la recherche" button. If empty → show "Lancer la recherche".
6. **Run search** (sequential, one at a time):
   - For each job: `supabase.functions.invoke("product-discover", { body: { seed: job.seed, subNicheSlug: job.subSlug, persist: true } })`.
   - Progress banner: `Analyse en cours… {microName} ({i}/{total})` + thin progress bar.
   - On completion, re-query `products_live` and group by `sub_niche_slug`.
7. **Display**:
   - Top counter: `{X} produits trouvés dans {Y} sous-niches`.
   - Section per sub-niche (with results): header `{sub.name} — {n} produits`, cards sorted by `opportunity_score` desc.
   - Each card: name + external link icon, Achat / Vente / Marge grid (margin in `text-primary`), `ScorePill` (component already greens ≥80 / oranges 70-79), verdict badge ("Prioritaire" success / "À tester" warning), "Ajouter à ma sélection" (toggles `useShortlist`), `<SubmitToCoach product={…} />`.
8. Empty state after search: "Aucun produit trouvé — réessayez ou choisissez une autre niche".
9. Page title: `{niche.name} — Recherche produit`, with breadcrumb back to `/`.

## Notes

- `/dashboard` link from spec maps to `/insights` (the existing dashboard route per current `App.tsx`). No new redirect needed — `/dashboard` already redirects to `/insights`.
- Sub-niches are searched via their micro_niches' `seed_keyword`. Niches whose sub_niches have no micros yet will show the "Lancer la recherche" button as disabled with a hint, since there is nothing to query. This is the trade-off of the aggregate-from-micros choice.
- No DB schema changes. No edge function changes. No changes to `/scoring`, `/angles`, `/spy`, `SubmitToCoach`, logo, favicon, or branding.

### Files

- Edited: `src/components/layout/Sidebar.tsx`, `src/pages/OpportunityUniverse.tsx`, `src/App.tsx`
- Created: `src/pages/NicheResults.tsx`
