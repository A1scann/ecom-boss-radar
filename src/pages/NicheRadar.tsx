import { useState } from "react";
import { PageHeader } from "@/components/ui-custom/Premium";
import { subNiches, adjacentNiches } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Radar as RadarIcon } from "lucide-react";
import { ResponsiveContainer, LineChart, Line } from "recharts";

const NicheRadar = () => {
  const [mode, setMode] = useState<"validated" | "hidden">("validated");
  const [showAdjacent, setShowAdjacent] = useState(false);
  const list = subNiches.filter((n) => n.mode === mode).sort((a, b) => b.opportunityScore - a.opportunityScore);

  return (
    <>
      <PageHeader
        eyebrow="Module 1"
        title="Niche Radar"
        description="Sous-niches FR compatibles Google Ads, high-ticket, intention d'achat élevée. Toggle Validated / Hidden."
        actions={
          <Button onClick={() => setShowAdjacent((v) => !v)} variant="outline" className="gap-2">
            <Sparkles className="w-4 h-4" /> Find adjacent sub-niches
          </Button>
        }
      />

      <div className="inline-flex bg-secondary p-1 rounded-lg mb-6 border border-border">
        {(["validated", "hidden"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all",
              mode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "validated" ? "✓ Validated Winners" : "🔍 Hidden Opportunities"}
          </button>
        ))}
      </div>

      {showAdjacent && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-gradient-radial p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Sous-niches adjacentes — Blue Ocean</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {adjacentNiches.map((a) => (
              <div key={a.name} className="p-4 rounded-lg bg-card border border-border">
                <div className="font-medium text-sm">{a.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{a.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((n) => (
          <Link
            key={n.id}
            to={`/products?niche=${n.id}`}
            className="group rounded-xl border border-border bg-gradient-card p-5 shadow-card-premium hover:border-primary/40 hover:shadow-elegant transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{n.category}</div>
                <h3 className="font-semibold mt-1 leading-tight group-hover:text-primary transition-colors">{n.name}</h3>
              </div>
              <div className={cn(
                "text-xs font-mono font-bold px-2 py-1 rounded-md border",
                n.opportunityScore >= 85 ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"
              )}>{n.opportunityScore}</div>
            </div>

            <div className="h-12 -mx-1 mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={n.trend.map((v, i) => ({ i, v }))}>
                  <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
              <div><span className="text-muted-foreground">Recherches FR </span><span className="font-mono font-semibold">{n.searchDemand.toLocaleString("fr-FR")}</span></div>
              <div><span className="text-muted-foreground">CPC </span><span className="font-mono font-semibold">{n.cpc}€</span></div>
              <div><span className="text-muted-foreground">Marge </span><span className="font-mono font-semibold">{n.marginPotential}€</span></div>
              <div><span className="text-muted-foreground">Concurrence </span><span className="font-semibold">{n.competition}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Stabilité </span><span className="font-semibold">{n.stability}</span></div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-primary font-medium">
              <span className="flex items-center gap-1"><RadarIcon className="w-3 h-3" /> Voir produits</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
};

export default NicheRadar;
