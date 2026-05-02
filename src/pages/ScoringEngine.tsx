import { PageHeader, ScorePill } from "@/components/ui-custom/Premium";
import { products } from "@/data/mockData";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar as RadarR, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { useState } from "react";
import { cn } from "@/lib/utils";

const weights = [
  { key: "searchDemand", label: "Demande de recherche", max: 20 },
  { key: "buyingIntent", label: "Intention d'achat", max: 20 },
  { key: "margin", label: "Potentiel de marge", max: 20 },
  { key: "competitionWeakness", label: "Faiblesse concurrentielle", max: 15 },
  { key: "offlineScarcity", label: "Rareté offline", max: 10 },
  { key: "offerAngle", label: "Angle d'offre", max: 10 },
  { key: "ecombossFit", label: "Adéquation Niché", max: 5 },
] as const;

const ScoringEngine = () => {
  const sorted = [...products].sort((a, b) => b.fitScore - a.fitScore);
  const [selected, setSelected] = useState(sorted[0]);

  const radarData = weights.map((w) => ({
    metric: w.label,
    value: (selected.scoreBreakdown[w.key] / w.max) * 100,
  }));

  const barData = sorted.slice(0, 10).map((p) => ({
    name: p.name.split(" ").slice(0, 3).join(" "),
    score: p.fitScore,
    id: p.id,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Module 3"
        title="Scoring produit"
        description="Niché Fit Score sur 100, calculé sur 7 dimensions propriétaires. Verdict instantané."
      />

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="rounded-xl border border-border bg-gradient-card p-6 shadow-card-premium">
          <h3 className="font-semibold mb-4">Pondérations Niché</h3>
          <div className="space-y-3">
            {weights.map((w) => (
              <div key={w.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{w.label}</span>
                  <span className="font-mono text-muted-foreground">/{w.max}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary" style={{ width: `${(w.max / 20) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 rounded-lg bg-success/10 border border-success/30">
              <div className="font-bold text-success">80+</div>
              <div className="text-muted-foreground mt-1">Prioritaire</div>
            </div>
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
              <div className="font-bold text-warning">65-80</div>
              <div className="text-muted-foreground mt-1">À tester</div>
            </div>
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="font-bold text-destructive">&lt;65</div>
              <div className="text-muted-foreground mt-1">Rejeter</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-6 shadow-card-premium">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold leading-tight">{selected.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{selected.niche}</p>
            </div>
            <ScorePill score={selected.fitScore} />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <RadarR dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-gradient-card p-6 shadow-card-premium">
        <h3 className="font-semibold mb-4">Heatmap des opportunités</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={barData} margin={{ left: 0, right: 20, top: 10, bottom: 70 }}>
            <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
            <Bar dataKey="score" radius={[6, 6, 0, 0]} onClick={(d: { id: string }) => setSelected(products.find((p) => p.id === d.id)!)}>
              {barData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.score >= 80 ? "hsl(var(--success))" : d.score >= 65 ? "hsl(var(--warning))" : "hsl(var(--destructive))"}
                  cursor="pointer"
                  opacity={d.id === selected.id ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="text-xs text-muted-foreground text-center mt-2">Cliquez une barre pour analyser le radar du produit</div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
        {sorted.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            className={cn(
              "text-left rounded-lg border p-3 transition-all bg-card",
              selected.id === p.id ? "border-primary shadow-elegant" : "border-border hover:border-primary/40"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{p.name}</span>
              <span className="font-mono font-bold text-sm">{p.fitScore}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
};

export default ScoringEngine;
