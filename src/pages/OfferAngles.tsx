import { PageHeader } from "@/components/ui-custom/Premium";
import { products, type Product } from "@/data/mockData";
import { Sparkles, Tag, Gift, Crown, Zap, ShieldCheck } from "lucide-react";

const seasonalHook = (p: Product) => {
  if (p.seasonality === "Saisonnier") return `pour profiter de ${p.name.toLowerCase()} dès cette saison`;
  if (p.seasonality === "Trending") return `surfez sur la tendance ${p.niche.toLowerCase()}`;
  return `un investissement durable pour votre ${p.niche.toLowerCase()}`;
};

const intentTone = (intent: number) =>
  intent >= 80 ? "acheteurs prêts à passer commande" : intent >= 60 ? "prospects en phase de comparaison" : "audience en phase de découverte";

const angleTemplates = (p: Product) => {
  const accessoryValue = Math.max(40, Math.round(p.margin * 0.15));
  return [
    {
      icon: Tag,
      title: "Remise événementielle",
      text: `-15% sur ${p.name} jusqu'à dimanche minuit · livraison France offerte — ciblage ${intentTone(p.buyingIntent)}.`,
    },
    {
      icon: Gift,
      title: "Bundle accessoire",
      text: `${p.name} + accessoires premium dédiés ${p.niche.toLowerCase()} offerts (valeur ${accessoryValue}€).`,
    },
    {
      icon: Crown,
      title: "Angle premium / luxe",
      text: `Édition limitée ${p.name} — finition haut de gamme, ${seasonalHook(p)}.`,
    },
    {
      icon: Zap,
      title: "Pain-point solving",
      text: `La seule ${p.name.toLowerCase()} pensée pour ${p.niche.toLowerCase()} sans compromis sur la qualité ni le SAV.`,
    },
    {
      icon: ShieldCheck,
      title: "Extension garantie",
      text: `Garantie 5 ans offerte sur ${p.name} (au lieu de 2) + SAV France réactif sous 24h.`,
    },
    {
      icon: Sparkles,
      title: "Financement 3x sans frais",
      text: `${p.name} en 3x sans frais — paiement sécurisé, idéal pour ${intentTone(p.buyingIntent)}.`,
    },
  ];
};

const OfferAngles = () => (
  <>
    <PageHeader
      eyebrow="Module 4"
      title="Angles marketing"
      description="Angles marketing, hooks Google Ads, bundles et USP générés automatiquement pour chaque produit."
    />
    <div className="space-y-6">
      {products.slice(0, 6).map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-gradient-card p-6 shadow-card-premium">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-xs text-muted-foreground">
                {p.niche} · Marge {p.margin}€ · Intent {p.buyingIntent}/100 · {p.seasonality}
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/30">Fit {p.fitScore}</span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {angleTemplates(p).map((a, i) => (
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
