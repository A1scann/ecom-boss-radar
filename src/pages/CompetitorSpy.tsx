import { PageHeader } from "@/components/ui-custom/Premium";
import { products } from "@/data/mockData";
import { Globe, AlertTriangle, TrendingDown, Zap } from "lucide-react";

const CompetitorSpy = () => (
  <>
    <PageHeader
      eyebrow="Module 5"
      title="Competitor Spy"
      description="Analyse concurrentielle FR : pricing gaps, faiblesses, opportunités de différenciation."
    />
    <div className="space-y-4">
      {products.slice(0, 8).map((p) => {
        const gap = Math.round(p.sellPrice * (0.05 + Math.random() * 0.15));
        return (
          <div key={p.id} className="rounded-xl border border-border bg-gradient-card p-6 shadow-card-premium">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.niche}</p>
              </div>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-1 rounded-md bg-success/10 text-success border border-success/30">Pricing gap +{gap}€</span>
                <span className="text-xs px-2 py-1 rounded-md bg-warning/10 text-warning border border-warning/30">Pages produits faibles</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3 mb-4">
              {p.competitors.map((c, i) => (
                <div key={c} className="rounded-lg p-3 bg-card border border-border">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-mono">{c}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Prix observé : <span className="font-mono text-foreground">{p.sellPrice + (i - 1) * gap}€</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-xs uppercase tracking-wider mb-0.5">Faiblesse</div>
                  <div className="text-muted-foreground text-xs">Aucune offre bundle ni garantie étendue</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingDown className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-xs uppercase tracking-wider mb-0.5">Pricing gap</div>
                  <div className="text-muted-foreground text-xs">Marge pour positionnement +{gap}€ premium</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-xs uppercase tracking-wider mb-0.5">Différenciation</div>
                  <div className="text-muted-foreground text-xs">Vidéo produit + financement 3x sans frais</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </>
);

export default CompetitorSpy;
