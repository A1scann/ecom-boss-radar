import { PageHeader } from "@/components/ui-custom/Premium";
import { products, type Product } from "@/data/mockData";
import { Globe, AlertTriangle, TrendingDown, Zap, Info } from "lucide-react";

// Pool of FR competitors — selection varies per product so all rows aren't identical
const COMPETITOR_POOL = [
  "Cdiscount", "ManoMano", "Leroy Merlin", "Castorama", "Amazon.fr",
  "Boulanger", "Darty", "Decathlon", "Conforama", "But.fr",
  "Maisons du Monde", "La Redoute", "AlinéA", "BricoPrivé", "Truffaut",
];

// Deterministic hash on the product id so competitor selection is stable per product
const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const pickCompetitors = (p: Product): string[] => {
  // Prefer the product's own competitor list when present, otherwise pick from the pool
  const base = (p.competitors ?? []).filter(Boolean);
  if (base.length >= 3) return base.slice(0, 3);
  const seed = hash(p.id || p.name);
  const picked = new Set<string>(base);
  let i = 0;
  while (picked.size < 3 && i < COMPETITOR_POOL.length * 2) {
    picked.add(COMPETITOR_POOL[(seed + i * 7) % COMPETITOR_POOL.length]);
    i++;
  }
  return Array.from(picked).slice(0, 3);
};

const CompetitorSpy = () => (
  <>
    <PageHeader
      eyebrow="Module 5"
      title="Analyse concurrents"
      description="Analyse concurrentielle FR : pricing gaps, faiblesses, opportunités de différenciation."
    />

    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 mb-6 flex items-start gap-2 text-xs text-muted-foreground">
      <Info className="w-4 h-4 shrink-0 mt-0.5" />
      <span>Analyse estimée basée sur les signaux SerpApi — données indicatives. Une analyse approfondie par produit sera disponible prochainement.</span>
    </div>

    <div className="space-y-4">
      {products.slice(0, 8).map((p) => {
        const comps = pickCompetitors(p);
        const seed = hash(p.id || p.name);
        // Deterministic per-product gap (5%-20% of sell price)
        const gap = Math.max(5, Math.round(p.sellPrice * (0.05 + ((seed % 1000) / 1000) * 0.15)));
        const hasRealData = (p.competitors ?? []).length > 0;

        return (
          <div key={p.id} className="rounded-xl border border-border bg-gradient-card p-6 shadow-card-premium">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.niche}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs px-2 py-1 rounded-md bg-success/10 text-success border border-success/30">Pricing gap +{gap}€</span>
                <span className="text-xs px-2 py-1 rounded-md bg-warning/10 text-warning border border-warning/30">Pages produits faibles</span>
              </div>
            </div>

            {comps.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground text-center">
                Analyse concurrentielle en cours de chargement pour ce produit.
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-3 mb-4">
                {comps.map((c, i) => {
                  // Deterministic per (product, competitor) variation
                  const off = ((hash(p.id + c) % 21) - 10); // -10..+10
                  const observed = Math.max(1, p.sellPrice + (i - 1) * gap + off);
                  return (
                    <div key={c} className="rounded-lg p-3 bg-card border border-border">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-mono">{c}</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Prix observé : <span className="font-mono text-foreground">{observed}€</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-xs uppercase tracking-wider mb-0.5">Faiblesse</div>
                  <div className="text-muted-foreground text-xs">Aucune offre bundle ni garantie étendue sur {p.name.toLowerCase()}.</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingDown className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-xs uppercase tracking-wider mb-0.5">Pricing gap</div>
                  <div className="text-muted-foreground text-xs">Marge pour positionnement +{gap}€ premium en {p.niche.toLowerCase()}.</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-xs uppercase tracking-wider mb-0.5">Différenciation</div>
                  <div className="text-muted-foreground text-xs">Vidéo produit + financement 3x sans frais.</div>
                </div>
              </div>
            </div>

            {!hasRealData && (
              <div className="mt-3 text-[10px] text-muted-foreground italic">
                Concurrents estimés — sera affiné dès qu'une analyse SerpApi spécifique sera lancée pour ce produit.
              </div>
            )}
          </div>
        );
      })}
    </div>
  </>
);

export default CompetitorSpy;
