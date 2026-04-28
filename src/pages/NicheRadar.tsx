import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, StatCard } from "@/components/ui-custom/Premium";
import { macroNiches, subNiches, adjacentNiches, MaturityStage, SubNiche } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import {
  Sparkles, ArrowRight, TrendingUp, TrendingDown, Activity,
  Flame, Eye, Layers, Radio, Clock,
} from "lucide-react";

const maturityColor: Record<MaturityStage, string> = {
  Emerging: "bg-primary/15 text-primary border-primary/30",
  Growth: "bg-success/15 text-success border-success/30",
  Mature: "bg-warning/15 text-warning border-warning/30",
  Saturated: "bg-destructive/15 text-destructive border-destructive/30",
};

const formatRelative = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days}j`;
};

const NicheRadar = () => {
  const [macroFilter, setMacroFilter] = useState<string | null>(null);
  const [mode, setMode] = useState<"all" | "validated" | "hidden">("all");
  const [showAdjacent, setShowAdjacent] = useState(false);

  const watchlist = useMemo(
    () => subNiches.filter((n) => n.watchlist).sort((a, b) => b.demandGrowth90d - a.demandGrowth90d),
    []
  );

  const filtered = useMemo(() => {
    return subNiches
      .filter((n) => (macroFilter ? n.macroId === macroFilter : true))
      .filter((n) => (mode === "all" ? true : n.mode === mode))
      .sort((a, b) => b.opportunityScore - a.opportunityScore);
  }, [macroFilter, mode]);

  const emergingCount = subNiches.filter((n) => n.maturity === "Emerging").length;
  const hiddenCount = subNiches.filter((n) => n.mode === "hidden").length;
  const avgGrowth = Math.round(
    subNiches.reduce((s, n) => s + n.demandGrowth90d, 0) / subNiches.length
  );

  return (
    <>
      <PageHeader
        eyebrow="Module 1 · Market Intelligence"
        title="Niche Radar"
        description="Couche d'intelligence continue sur le marché FR. Macro-niches → sous-niches surveillées en temps réel. Pas de produits — opportunités de marché."
        actions={
          <Button onClick={() => setShowAdjacent((v) => !v)} variant="outline" className="gap-2">
            <Sparkles className="w-4 h-4" /> Adjacent sub-niches
          </Button>
        }
      />

      {/* Continuous monitoring KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Sub-niches suivies" value={subNiches.length} hint={`${macroNiches.length} macro-niches`} />
        <StatCard label="Watchlist FR" value={watchlist.length} hint="gagnent de la traction" accent />
        <StatCard label="Émergentes" value={emergingCount} hint="stade Emerging" />
        <StatCard label="Croissance moyenne 90j" value={`${avgGrowth > 0 ? "+" : ""}${avgGrowth}%`} hint={`${hiddenCount} hidden détectées`} />
      </div>

      {/* Watchlist — gaining traction */}
      <div className="rounded-xl border border-primary/30 bg-gradient-radial p-5 mb-8 shadow-card-premium">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Radio className="w-4 h-4 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
            <h3 className="font-semibold text-sm">Sub-niches gagnant de la traction en France</h3>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground ml-2">live monitoring</span>
          </div>
          <span className="text-xs text-muted-foreground">Mis à jour en continu</span>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {watchlist.slice(0, 6).map((n) => (
            <Link
              key={n.id}
              to={`/niches/${n.id}`}
              className="group rounded-lg border border-border bg-card/60 backdrop-blur p-3 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-medium text-sm leading-tight group-hover:text-primary transition-colors">{n.name}</div>
                <span className="flex items-center gap-1 text-xs font-mono font-bold text-success shrink-0">
                  <TrendingUp className="w-3 h-3" />+{n.demandGrowth90d}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className={cn("px-1.5 py-0.5 rounded border text-[10px]", maturityColor[n.maturity])}>{n.maturity}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(n.lastSignalAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Macro-niches — Level 1 */}
      <div className="mb-2 flex items-center gap-2">
        <Layers className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">Niveau 1 — Macro-niches</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <button
          onClick={() => setMacroFilter(null)}
          className={cn(
            "text-left rounded-xl border p-4 transition-all",
            macroFilter === null ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-card hover:border-primary/40"
          )}
        >
          <div className="text-2xl mb-1">🌐</div>
          <div className="font-semibold text-sm">Toutes les macro-niches</div>
          <div className="text-xs text-muted-foreground mt-0.5">{subNiches.length} sub-niches</div>
        </button>
        {macroNiches.map((m) => (
          <button
            key={m.id}
            onClick={() => setMacroFilter(m.id === macroFilter ? null : m.id)}
            className={cn(
              "text-left rounded-xl border p-4 transition-all",
              macroFilter === m.id ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-card hover:border-primary/40"
            )}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="text-2xl">{m.icon}</div>
              <span className={cn(
                "text-[10px] font-mono font-bold flex items-center gap-0.5",
                m.momentum > 25 ? "text-success" : m.momentum > 0 ? "text-warning" : "text-destructive"
              )}>
                {m.momentum > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {m.momentum > 0 ? "+" : ""}{m.momentum}
              </span>
            </div>
            <div className="font-semibold text-sm leading-tight">{m.name}</div>
            <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{m.description}</div>
            <div className="flex items-center gap-3 mt-3 text-[11px]">
              <span className="font-mono text-muted-foreground">{m.subNicheCount} sub</span>
              <span className="font-mono text-muted-foreground">{(m.totalDemand / 1000).toFixed(0)}k/mo</span>
              <span className="font-mono font-semibold text-primary ml-auto">{m.avgOpportunity}</span>
            </div>
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

      {/* Sub-niches — Level 2 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
            Niveau 2 — Sub-niches monitorées ({filtered.length})
          </h2>
        </div>
        <div className="inline-flex bg-secondary p-1 rounded-lg border border-border">
          {(["all", "validated", "hidden"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                mode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "all" ? "Toutes" : m === "validated" ? "✓ Validated" : "🔍 Hidden"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((n) => (
          <SubNicheCard key={n.id} n={n} />
        ))}
      </div>
    </>
  );
};

const SubNicheCard = ({ n }: { n: SubNiche }) => {
  const growthPos = n.demandGrowth90d > 0;
  const compFav = n.competitionShift < 0;
  return (
    <Link
      to={`/niches/${n.id}`}
      className="group rounded-xl border border-border bg-gradient-card p-5 shadow-card-premium hover:border-primary/40 hover:shadow-elegant transition-all flex flex-col"
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{n.category}</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", maturityColor[n.maturity])}>{n.maturity}</span>
            {n.mode === "hidden" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-primary/10 text-primary border-primary/30 flex items-center gap-1">
                <Eye className="w-2.5 h-2.5" /> Hidden
              </span>
            )}
            {n.watchlist && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-success/10 text-success border-success/30 flex items-center gap-1">
                <Flame className="w-2.5 h-2.5" /> Hot
              </span>
            )}
          </div>
          <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">{n.name}</h3>
        </div>
        <div className={cn(
          "text-xs font-mono font-bold px-2 py-1 rounded-md border shrink-0",
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

      {/* Continuous monitoring signals */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-md bg-muted/30 px-2 py-1.5 border border-border/50">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Demand 90j</div>
          <div className={cn("font-mono text-sm font-semibold flex items-center gap-1", growthPos ? "text-success" : "text-destructive")}>
            {growthPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {growthPos ? "+" : ""}{n.demandGrowth90d}%
          </div>
        </div>
        <div className="rounded-md bg-muted/30 px-2 py-1.5 border border-border/50">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Concurrence</div>
          <div className={cn("font-mono text-sm font-semibold flex items-center gap-1", compFav ? "text-success" : "text-destructive")}>
            {compFav ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {n.competitionShift > 0 ? "+" : ""}{n.competitionShift}
          </div>
        </div>
      </div>

      {n.emergingClusters.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Search clusters émergents</div>
          <div className="flex flex-wrap gap-1">
            {n.emergingClusters.slice(0, 2).map((c) => (
              <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {n.hiddenSignal && (
        <div className="text-[11px] text-primary/90 italic mb-3 line-clamp-2">💡 {n.hiddenSignal}</div>
      )}

      <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground mb-3">
        <div><span className="font-mono font-semibold text-foreground">{n.searchDemand.toLocaleString("fr-FR")}</span>/mo</div>
        <div>CPC <span className="font-mono font-semibold text-foreground">{n.cpc}€</span></div>
        <div>Marge <span className="font-mono font-semibold text-foreground">{n.marginPotential}€</span></div>
      </div>

      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Signal {formatRelative(n.lastSignalAt)}</span>
        <span className="text-primary font-medium flex items-center gap-1">
          Explorer <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </Link>
  );
};

export default NicheRadar;
