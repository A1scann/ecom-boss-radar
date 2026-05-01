import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, StatCard } from "@/components/ui-custom/Premium";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNicheDiscover, useAdArbitrage, useKeywordIntent, useLiveSubNiches } from "@/hooks/useIntelligence";
import { cn } from "@/lib/utils";
import {
  Radar, Search, Loader2, Zap, Target, Eye, TrendingUp, TrendingDown,
  Activity, ArrowRight, Sparkles, Database, Radio, Clock,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis } from "recharts";
import { toast } from "sonner";

const formatRelative = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days}j`;
};

const LiveIntelligence = () => {
  const [seed, setSeed] = useState("");
  const [tab, setTab] = useState<"discover" | "intent" | "arbitrage">("discover");
  const discover = useNicheDiscover();
  const intent = useKeywordIntent();
  const arbitrage = useAdArbitrage();
  const live = useLiveSubNiches(true);

  const run = async () => {
    if (seed.trim().length < 2) {
      toast.error("Entre un mot-clé seed (ex: « sauna infrarouge »)");
      return;
    }
    try {
      if (tab === "discover") {
        await discover.run(seed.trim());
        toast.success("Sub-niche analysée et persistée");
        live.refresh();
      } else if (tab === "intent") {
        await intent.run(seed.trim());
      } else {
        await arbitrage.run(seed.trim());
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const watchlist = live.data
    .filter((n) => n.watchlist || (n.demand_growth_90d ?? 0) > 20)
    .sort((a, b) => Number(b.demand_growth_90d) - Number(a.demand_growth_90d));

  return (
    <>
      <PageHeader
        eyebrow="Live Data Layer · SerpApi"
        title="Live Intelligence"
        description="Données SerpApi temps réel : Google Trends FR, autocomplete, related queries, SERP, Shopping. Discovery → Intent Mining → Ad Arbitrage."
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="w-3 h-3" />
            <span>{live.data.length} sub-niches en base</span>
          </div>
        }
      />

      {/* Live watchlist */}
      {watchlist.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-gradient-radial p-5 mb-6 shadow-card-premium">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative">
              <Radio className="w-4 h-4 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
            <h3 className="font-semibold text-sm">Niche Radar Watchlist — données live</h3>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground ml-2">SerpApi</span>
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
                    <TrendingUp className="w-3 h-3" />+{Math.round(Number(n.demand_growth_90d))}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary text-[10px]">{n.maturity}</span>
                  <span className="font-mono">α {Math.round(Number(n.alpha_score))}</span>
                  <span className="ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(n.last_signal_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Engine selector */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6 shadow-card-premium">
        <div className="inline-flex bg-secondary p-1 rounded-lg border border-border mb-4">
          {([
            { id: "discover", label: "Niche Discovery", icon: Radar },
            { id: "intent", label: "Keyword Intent Miner", icon: Target },
            { id: "arbitrage", label: "Ad Arbitrage Detector", icon: Zap },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                tab === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder="Mot-clé seed FR (ex: sauna infrarouge, pergola bioclimatique...)"
              className="pl-9"
            />
          </div>
          <Button onClick={run} disabled={discover.loading || intent.loading || arbitrage.loading} className="gap-2">
            {(discover.loading || intent.loading || arbitrage.loading)
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Sparkles className="w-4 h-4" />}
            Verify Live
          </Button>
        </div>
        <div className="text-[11px] text-muted-foreground mt-2">
          Géo: France · Cache 24h · Données: Google Trends + SERP + Shopping + Autocomplete
        </div>
      </div>

      {/* Discover output */}
      {tab === "discover" && discover.data && <DiscoverPanel data={discover.data} />}
      {tab === "intent" && intent.data && <IntentPanel data={intent.data} />}
      {tab === "arbitrage" && arbitrage.data && <ArbitragePanel data={arbitrage.data} />}
    </>
  );
};

const DiscoverPanel = ({ data }: { data: NonNullable<ReturnType<typeof useNicheDiscover>["data"]> }) => {
  const { signals, scoring, meta } = data;
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Opportunity Score" value={scoring.opportunityScore} hint={`Maturity: ${meta.maturity}`} accent />
        <StatCard label="EcomBoss Alpha" value={scoring.alphaScore} hint={meta.mode === "hidden" ? "🔍 Hidden" : "✓ Validated"} />
        <StatCard label="Hidden Score" value={scoring.hiddenOpportunityScore} hint={`SERP weakness ${scoring.serpWeaknessScore}`} />
        <StatCard label="Supplier Feasibility" value={scoring.supplierFeasibilityScore} hint={`Margin ${signals.marginPotential}€`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-gradient-card p-5 shadow-card-premium">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Demand FR · 12 mois</h3>
            <div className="flex gap-3 text-xs">
              <span className={cn("flex items-center gap-1 font-mono font-semibold", signals.growth >= 0 ? "text-success" : "text-destructive")}>
                {signals.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {signals.growth}% 90j
              </span>
              <span className="font-mono text-muted-foreground">accel {signals.acceleration}</span>
              <span className="font-mono text-muted-foreground">stab {Math.round(signals.stability)}</span>
            </div>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signals.trendSeries.map((v, i) => ({ i, v }))}>
                <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Competition</h3>
          <Stat label="Ad density" v={signals.adDensity} />
          <Stat label="Marketplace dominance" v={`${Math.round(signals.dominance)}%`} />
          <Stat label="SERP weakness" v={`${Math.round(signals.weakness)}%`} good={signals.weakness > 50} />
          <Stat label="Price dispersion" v={`${Math.round(signals.dispersion)}%`} />
          <Stat label="CPC proxy" v={`${signals.cpc}€`} />
          <Stat label="Breakeven ROAS" v={scoring.breakevenRoas} />
          <Stat label="Estimated CPA" v={`${scoring.estimatedCpa}€`} />
        </div>
      </div>

      {meta.emergingClusters.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-gradient-radial p-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Emerging clusters (rising queries)</h3>
          <div className="flex flex-wrap gap-2">
            {meta.emergingClusters.map((c) => (
              <span key={c} className="text-sm px-3 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {meta.relatedTop.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-sm mb-3">Related queries (top)</h3>
          <div className="flex flex-wrap gap-2">
            {meta.relatedTop.map((c) => (
              <span key={c} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const IntentPanel = ({ data }: { data: NonNullable<ReturnType<typeof useKeywordIntent>["data"]> }) => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
    <div className="grid grid-cols-3 gap-4">
      <StatCard label="Total keywords" value={data.total} hint="autocomplete + related + PAA" />
      <StatCard label="Buyer intent score" value={`${data.buyerIntentScore}%`} hint="commercial modifiers" accent />
      <StatCard label="Buyer keywords" value={data.buyerKeywords.length} hint="transactional + commercial" />
    </div>
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border font-semibold text-sm">Buyer-intent opportunities</div>
      <div className="max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
            <tr><th className="text-left p-3">Keyword</th><th className="text-left p-3">Intent</th><th className="text-left p-3">Source</th></tr>
          </thead>
          <tbody>
            {data.buyerKeywords.map((k) => (
              <tr key={k.keyword} className="border-t border-border hover:bg-muted/20">
                <td className="p-3 font-medium flex items-center gap-2">
                  {k.rising && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">RISING</span>}
                  {k.keyword}
                </td>
                <td className="p-3">
                  <span className={cn(
                    "text-[11px] px-2 py-0.5 rounded border",
                    k.intent === "transactional" ? "bg-success/10 text-success border-success/30" :
                    k.intent === "commercial" ? "bg-primary/10 text-primary border-primary/30" :
                    "bg-muted text-muted-foreground border-border"
                  )}>{k.intent}</span>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{k.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const ArbitragePanel = ({ data }: { data: NonNullable<ReturnType<typeof useAdArbitrage>["data"]> }) => {
  const { market, arbitrage } = data;
  const positive = arbitrage.profitPerSale > 0;
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className={cn(
        "rounded-xl border p-6 text-center",
        positive ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
      )}>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Verdict</div>
        <div className="text-3xl font-bold mb-1">{arbitrage.verdict}</div>
        <div className="text-sm text-muted-foreground">Score d'arbitrage: <span className="font-mono font-bold">{arbitrage.arbitrageScore}/100</span></div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="CPC proxy" value={`${arbitrage.cpcProxy}€`} hint="from ad density" />
        <StatCard label="Breakeven ROAS" value={arbitrage.breakevenRoas} hint={`@ ${Math.round(data.inputs.assumedMarginRate * 100)}% margin`} />
        <StatCard label="Estimated CPA" value={`${arbitrage.estimatedCpa}€`} hint={`@ ${(data.inputs.cvr * 100).toFixed(1)}% CVR`} />
        <StatCard label="Profit / sale" value={`${arbitrage.profitPerSale}€`} hint={`Margin ${arbitrage.grossMarginPerSale}€ - CPA`} accent={positive} />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ad density" value={market.adDensity} hint="paid + sponsored" />
        <StatCard label="Shopping ads" value={market.shoppingAdvertiserCount} hint="advertisers" />
        <StatCard label="Marketplace dom." value={`${market.marketplaceDominance}%`} hint="Amazon/MM/LM/CDi" />
        <StatCard label="Median price" value={`${market.medianPrice}€`} hint={`dispersion ${market.priceDispersion}%`} />
      </div>
    </div>
  );
};

const Stat = ({ label, v, good }: { label: string; v: string | number; good?: boolean }) => (
  <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span className={cn("font-mono font-semibold", good && "text-success")}>{v}</span>
  </div>
);

export default LiveIntelligence;
