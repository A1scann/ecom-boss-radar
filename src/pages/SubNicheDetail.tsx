import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { PageHeader, StatCard, ScorePill } from "@/components/ui-custom/Premium";
import { subNiches, products, macroNiches, MaturityStage } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from "recharts";
import {
  ArrowLeft, TrendingUp, TrendingDown, Eye, Flame, Clock,
  ExternalLink, Bookmark, BookmarkCheck, Check, X, Package, Search, Sparkles,
} from "lucide-react";
import { useShortlist } from "@/store/shortlist";
import { supabase } from "@/integrations/supabase/client";

const maturityColor: Record<string, string> = {
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

// Unified shape used by the detail view (works for both mock and live rows)
type DetailNiche = {
  id: string;
  slug?: string | null;
  name: string;
  category: string;
  macroName?: string | null;
  macroIcon?: string | null;
  maturity: string;
  mode: string;
  watchlist: boolean;
  hiddenSignal?: string | null;
  description?: string | null;
  lastSignalAt: string;
  searchDemand: number;
  cpc: number;
  marginPotential: number;
  demandGrowth90d: number;
  competitionShift: number;
  emergingClusters: string[];
  trend: number[];
  // scoring
  opportunityScore: number;
  alphaScore?: number;
  hiddenOpportunityScore?: number;
  serpWeaknessScore?: number;
  marketplaceDominanceScore?: number;
  supplierFeasibilityScore?: number;
  advertiserDensity?: number;
  breakevenRoas?: number | null;
  estimatedCpa?: number | null;
  // monitoring
  stability?: string;
  isLive: boolean;
};

type RelatedKeyword = {
  id: string;
  keyword: string;
  cluster_label: string | null;
  intent: string | null;
  search_interest: number | null;
  is_rising: boolean | null;
  is_breakout: boolean | null;
};

const fromMock = (id: string): DetailNiche | null => {
  const n = subNiches.find((s) => s.id === id);
  if (!n) return null;
  const macro = macroNiches.find((m) => m.id === n.macroId);
  return {
    id: n.id,
    name: n.name,
    category: n.category,
    macroName: macro?.name ?? null,
    macroIcon: macro?.icon ?? null,
    maturity: n.maturity,
    mode: n.mode,
    watchlist: n.watchlist,
    hiddenSignal: n.hiddenSignal,
    lastSignalAt: n.lastSignalAt,
    searchDemand: n.searchDemand,
    cpc: n.cpc,
    marginPotential: n.marginPotential,
    demandGrowth90d: n.demandGrowth90d,
    competitionShift: n.competitionShift,
    emergingClusters: n.emergingClusters,
    trend: n.trend,
    opportunityScore: n.opportunityScore,
    stability: n.stability,
    isLive: false,
  };
};

const fromLive = (row: any, macro: any): DetailNiche => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  category: row.category ?? macro?.name ?? "—",
  macroName: macro?.name ?? null,
  macroIcon: macro?.icon ?? null,
  maturity: row.maturity ?? "Emerging",
  mode: row.discovery_mode ?? row.mode ?? "validated",
  watchlist: !!row.watchlist,
  hiddenSignal: row.hidden_signal,
  description: row.description,
  lastSignalAt: row.last_signal_at ?? row.updated_at ?? new Date().toISOString(),
  searchDemand: Number(row.search_demand ?? 0),
  cpc: Number(row.cpc ?? 0),
  marginPotential: Number(row.margin_potential ?? 0),
  demandGrowth90d: Number(row.demand_growth_90d ?? 0),
  competitionShift: Number(row.competition_shift ?? 0),
  emergingClusters: Array.isArray(row.emerging_clusters) ? row.emerging_clusters : [],
  trend: Array.isArray(row.trend_series) ? row.trend_series.map((v: any) => Number(v)) : [],
  opportunityScore: Number(row.opportunity_score ?? 0),
  alphaScore: Number(row.alpha_score ?? 0),
  hiddenOpportunityScore: Number(row.hidden_opportunity_score ?? 0),
  serpWeaknessScore: Number(row.serp_weakness_score ?? 0),
  marketplaceDominanceScore: Number(row.marketplace_dominance_score ?? 0),
  supplierFeasibilityScore: Number(row.supplier_feasibility_score ?? 0),
  advertiserDensity: Number(row.advertiser_density ?? 0),
  breakevenRoas: row.breakeven_roas != null ? Number(row.breakeven_roas) : null,
  estimatedCpa: row.estimated_cpa != null ? Number(row.estimated_cpa) : null,
  isLive: true,
});

const ScoreBar = ({ label, value, hint }: { label: string; value: number; hint?: string }) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const tone = pct >= 75 ? "bg-success" : pct >= 50 ? "bg-primary" : pct >= 30 ? "bg-warning" : "bg-destructive";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{pct}</span>
      </div>
      <div className="h-1.5 rounded bg-muted overflow-hidden">
        <div className={cn("h-full rounded", tone)} style={{ width: `${pct}%` }} />
      </div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
};

const SubNicheDetail = () => {
  const { id } = useParams();
  const { has, toggle } = useShortlist();
  const [niche, setNiche] = useState<DetailNiche | null | undefined>(undefined); // undefined = loading
  const [keywords, setKeywords] = useState<RelatedKeyword[]>([]);

  const candidates = useMemo(
    () => products.filter((p) => p.nicheId === id).sort((a, b) => b.fitScore - a.fitScore),
    [id]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) { setNiche(null); return; }
      // 1) try mock first (fast, no roundtrip)
      const mock = fromMock(id);
      if (mock) { if (!cancelled) setNiche(mock); return; }
      // 2) fallback to live Supabase
      const { data: row } = await supabase
        .from("sub_niches_live")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!row) {
        // try by slug
        const { data: bySlug } = await supabase
          .from("sub_niches_live")
          .select("*")
          .eq("slug", id)
          .maybeSingle();
        if (!bySlug) { if (!cancelled) setNiche(null); return; }
        const macro = bySlug.macro_id
          ? (await supabase.from("macro_niches_live").select("*").eq("id", bySlug.macro_id).maybeSingle()).data
          : null;
        if (!cancelled) setNiche(fromLive(bySlug, macro));
        return;
      }
      const macro = row.macro_id
        ? (await supabase.from("macro_niches_live").select("*").eq("id", row.macro_id).maybeSingle()).data
        : null;
      if (!cancelled) setNiche(fromLive(row, macro));
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  // Load related keywords (live only)
  useEffect(() => {
    if (!niche?.isLive) { setKeywords([]); return; }
    let cancelled = false;
    supabase
      .from("niche_keywords")
      .select("id,keyword,cluster_label,intent,search_interest,is_rising,is_breakout")
      .eq("sub_niche_id", niche.id)
      .order("search_interest", { ascending: false, nullsFirst: false })
      .limit(40)
      .then(({ data }) => { if (!cancelled) setKeywords((data ?? []) as RelatedKeyword[]); });
    return () => { cancelled = true; };
  }, [niche?.id, niche?.isLive]);

  if (niche === undefined) {
    return <div className="text-sm text-muted-foreground">Chargement de la sub-niche…</div>;
  }
  if (niche === null) return <Navigate to="/niches" replace />;

  const growthPos = niche.demandGrowth90d > 0;
  const compFav = niche.competitionShift < 0;
  const matCls = maturityColor[niche.maturity] ?? maturityColor.Emerging;

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/niches" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Niche Radar
        </Link>
        <span>/</span>
        {niche.macroName && <span>{niche.macroIcon} {niche.macroName}</span>}
        {niche.macroName && <span>/</span>}
        <span className="text-foreground">{niche.name}</span>
      </div>

      <PageHeader
        eyebrow={`Sub-niche · ${niche.category}`}
        title={niche.name}
        description={
          niche.hiddenSignal ||
          niche.description ||
          `Sub-niche surveillée en continu — stade ${niche.maturity.toLowerCase()}, mode ${niche.mode === "hidden" ? "Hidden Opportunity" : "Validated Winner"}.`
        }
        actions={
          <div className="flex gap-2">
            <Button asChild>
              <Link to={`/products?niche=${niche.id}&slug=${niche.slug ?? ""}&seed=${encodeURIComponent(niche.name)}`}>
                <Package className="w-4 h-4 mr-2" /> Trouver des produits
              </Link>
            </Button>
          </div>
        }
      />

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className={cn("text-xs px-2 py-1 rounded border font-medium", matCls)}>
          Maturité: {niche.maturity}
        </span>
        {niche.mode === "hidden" && (
          <span className="text-xs px-2 py-1 rounded border bg-primary/10 text-primary border-primary/30 flex items-center gap-1">
            <Eye className="w-3 h-3" /> Hidden Opportunity
          </span>
        )}
        {niche.watchlist && (
          <span className="text-xs px-2 py-1 rounded border bg-success/10 text-success border-success/30 flex items-center gap-1">
            <Flame className="w-3 h-3" /> Gaining traction FR
          </span>
        )}
        {niche.isLive && (
          <span className="text-xs px-2 py-1 rounded border bg-primary/5 text-primary border-primary/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Live data
          </span>
        )}
        <span className="text-xs px-2 py-1 rounded border border-border text-muted-foreground flex items-center gap-1 ml-auto">
          <Clock className="w-3 h-3" /> Dernier signal {formatRelative(niche.lastSignalAt)}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Opportunity Score" value={niche.opportunityScore} hint={niche.stability ? `Stabilité: ${niche.stability}` : "score global"} accent />
        <StatCard
          label="Demand 90j"
          value={
            <span className={cn("flex items-center gap-1", growthPos ? "text-success" : "text-destructive")}>
              {growthPos ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {growthPos ? "+" : ""}{niche.demandGrowth90d}%
            </span>
          }
          hint="évolution recherches FR"
        />
        <StatCard
          label="Competition shift"
          value={
            <span className={cn("flex items-center gap-1", compFav ? "text-success" : "text-destructive")}>
              {compFav ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
              {niche.competitionShift > 0 ? "+" : ""}{niche.competitionShift}
            </span>
          }
          hint={compFav ? "concurrents quittent — fenêtre" : "concurrents arrivent"}
        />
        <StatCard label="Marge potentielle" value={`${niche.marginPotential}€`} hint={`CPC ${niche.cpc}€ · ${niche.searchDemand.toLocaleString("fr-FR")}/mo`} />
      </div>

      {/* Full scoring breakdown */}
      {niche.isLive && (
        <div className="rounded-xl border border-border bg-gradient-card p-5 mb-6 shadow-card-premium">
          <h3 className="font-semibold text-sm mb-4">Scoring breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <ScoreBar label="Opportunity Score" value={niche.opportunityScore} hint="score composite global" />
            <ScoreBar label="Alpha Score" value={niche.alphaScore ?? 0} hint="avantage compétitif" />
            <ScoreBar label="Hidden Opportunity" value={niche.hiddenOpportunityScore ?? 0} hint="potentiel sous-radar" />
            <ScoreBar label="SERP Weakness" value={niche.serpWeaknessScore ?? 0} hint="facilité à se positionner" />
            <ScoreBar label="Marketplace Dominance" value={niche.marketplaceDominanceScore ?? 0} hint="présence Amazon/Cdiscount" />
            <ScoreBar label="Supplier Feasibility" value={niche.supplierFeasibilityScore ?? 0} hint="facilité d'approvisionnement" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-border text-xs">
            <div>
              <div className="text-muted-foreground">Advertiser density</div>
              <div className="font-mono font-semibold text-sm">{niche.advertiserDensity ?? 0}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Breakeven ROAS</div>
              <div className="font-mono font-semibold text-sm">{niche.breakevenRoas != null ? `${niche.breakevenRoas.toFixed(2)}x` : "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Estimated CPA</div>
              <div className="font-mono font-semibold text-sm">{niche.estimatedCpa != null ? `${niche.estimatedCpa.toFixed(0)}€` : "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">CPC</div>
              <div className="font-mono font-semibold text-sm">{niche.cpc}€</div>
            </div>
          </div>
        </div>
      )}

      {/* Trend chart */}
      {niche.trend.length > 1 && (
        <div className="rounded-xl border border-border bg-gradient-card p-5 mb-6 shadow-card-premium">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Demande FR — évolution</h3>
            <span className="text-xs text-muted-foreground">Source: Search volume index</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={niche.trend.map((v, i) => ({ i: `T-${niche.trend.length - i}`, v }))}>
                <XAxis dataKey="i" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Emerging clusters */}
      {niche.emergingClusters.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <h3 className="font-semibold text-sm mb-3">Search clusters émergents détectés</h3>
          <div className="flex flex-wrap gap-2">
            {niche.emergingClusters.map((c) => (
              <span key={c} className="text-sm px-3 py-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
                {c}
              </span>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-3 italic">
            Ces requêtes apparaissent dans les recherches associées avec une croissance &gt; 30% sur 90j.
          </div>
        </div>
      )}

      {/* Related keywords (live) */}
      {keywords.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Search className="w-4 h-4" /> Mots-clés associés ({keywords.length})</h3>
            <span className="text-xs text-muted-foreground">Autocomplete + related queries</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span
                key={k.id}
                className={cn(
                  "text-xs px-2.5 py-1 rounded border font-medium flex items-center gap-1",
                  k.is_breakout
                    ? "bg-success/10 text-success border-success/30"
                    : k.is_rising
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted text-foreground border-border"
                )}
              >
                {k.keyword}
                {k.search_interest != null && (
                  <span className="text-[10px] text-muted-foreground font-mono">{k.search_interest}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA — find products in this niche */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm mb-1">Niveau 3 — Produits candidats</h3>
          <p className="text-xs text-muted-foreground">Explorer les produits à fort potentiel détectés dans cette sub-niche.</p>
        </div>
        <Button asChild>
          <Link to={`/products?niche=${niche.id}&slug=${niche.slug ?? ""}&seed=${encodeURIComponent(niche.name)}`}>
            <Package className="w-4 h-4 mr-2" /> Trouver des produits dans cette niche
          </Link>
        </Button>
      </div>

      {/* Mock candidate products (only when present) */}
      {candidates.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card-premium">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left p-3 font-medium">Produit</th>
                  <th className="text-right p-3 font-medium">Achat</th>
                  <th className="text-right p-3 font-medium">Vente</th>
                  <th className="text-right p-3 font-medium">Marge</th>
                  <th className="text-center p-3 font-medium">Amazon</th>
                  <th className="text-center p-3 font-medium">Verdict</th>
                  <th className="text-right p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((p) => {
                  const saved = has(p.id);
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="font-medium leading-tight">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 italic">{p.marketingAngle}</div>
                      </td>
                      <td className="p-3 text-right font-mono">{p.buyPrice}€</td>
                      <td className="p-3 text-right font-mono">{p.sellPrice}€</td>
                      <td className="p-3 text-right font-mono font-semibold text-primary">+{p.margin}€</td>
                      <td className="p-3 text-center">
                        {p.amazonDominated
                          ? <X className="w-4 h-4 text-destructive inline" />
                          : <Check className="w-4 h-4 text-success inline" />}
                      </td>
                      <td className="p-3 text-center"><ScorePill score={p.fitScore} /></td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" asChild>
                            <a href={p.supplierUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => toggle(p.id)} className={cn(saved && "text-primary")}>
                            {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default SubNicheDetail;
