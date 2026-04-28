import { PageHeader } from "@/components/ui-custom/Premium";
import { products } from "@/data/mockData";
import { Sparkles, Tag, Gift, Crown, Zap } from "lucide-react";

const angleTemplates = (name: string, margin: number) => [
  { icon: Tag, title: "Remise événementielle", text: `-15% jusqu'à dimanche minuit + livraison France offerte` },
  { icon: Gift, title: "Bundle accessoire", text: `${name} + accessoires premium offerts (valeur ${Math.round(margin * 0.15)}€)` },
  { icon: Crown, title: "Angle premium / luxe", text: `Édition limitée — finition haut de gamme, fabrication européenne` },
  { icon: Zap, title: "Pain-point solving", text: `La seule solution conçue pour résoudre [problème] sans compromis` },
  { icon: Sparkles, title: "Extension garantie", text: `Garantie 5 ans offerte (au lieu de 2) + SAV France réactif` },
];

const OfferAngles = () => (
  <>
    <PageHeader
      eyebrow="Module 4"
      title="Offer Angle Generator"
      description="Angles marketing, hooks Google Ads, bundles et USP générés automatiquement pour chaque produit."
    />
    <div className="space-y-6">
      {products.slice(0, 6).map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-gradient-card p-6 shadow-card-premium">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-xs text-muted-foreground">{p.niche} · Marge {p.margin}€</p>
            </div>
            <span className="text-xs font-mono px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/30">Fit {p.fitScore}</span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {angleTemplates(p.name, p.margin).map((a, i) => (
              <div key={i} className="rounded-lg p-4 bg-card border border-border hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <a.icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider">{a.title}</div>
                </div>
                <p className="text-sm text-muted-foreground">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </>
);

export default OfferAngles;
