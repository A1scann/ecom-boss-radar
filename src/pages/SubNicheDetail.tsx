import { useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { PageHeader, StatCard, ScorePill } from "@/components/ui-custom/Premium";
import { subNiches, products, macroNiches, MaturityStage } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from "recharts";
import {
  ArrowLeft, TrendingUp, TrendingDown, Eye, Flame, Clock,
  ExternalLink, Bookmark, BookmarkCheck, Check, X, Package,
} from "lucide-react";
import { useShortlist } from "@/store/shortlist";

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

const SubNicheDetail = () => {
  const { id } = useParams();
  const { has, toggle } = useShortlist();
  const niche = subNiches.find((n) => n.id === id);
  const macro = niche ? macroNiches.find((m) => m.id === niche.macroId) : null;
  const candidates = useMemo(
    () => products.filter((p) => p.nicheId === id).sort((a, b) => b.fitScore - a.fitScore),
    [id]
  );

  if (!niche) return <Navigate to="/niches" replace />;

  const growthPos = niche.demandGrowth90d > 0;
  const compFav = niche.competitionShift < 0;

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/niches" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Niche Radar
        </Link>
        <span>/</span>
        {macro && <span>{macro.icon} {macro.name}</span>}
        <span>/</span>
        <span className="text-foreground">{niche.name}</span>
      </div>

      <PageHeader
        eyebrow={`Sub-niche · ${niche.category}`}
        title={niche.name}
        description={niche.hiddenSignal || `Sub-niche surveillée en continu — stade ${niche.maturity.toLowerCase()}, mode ${niche.mode === "hidden" ? "Hidden Opportunity" : "Validated Winner"}.`}
        actions={
          <Button asChild variant="outline">
            <Link to={`/products?niche=${niche.id}`}>Tous les filtres produits →</Link>
          </Button>
        }
      />

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className={cn("text-xs px-2 py-1 rounded border font-medium", maturityColor[niche.maturity])}>
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
        <span className="text-xs px-2 py-1 rounded border border-border text-muted-foreground flex items-center gap-1 ml-auto">
          <Clock className="w-3 h-3" /> Dernier signal {formatRelative(niche.lastSignalAt)}
        </span>
      </div>

      {/* Continuous monitoring KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Opportunity Score" value={niche.opportunityScore} hint={`Stabilité: ${niche.stability}`} accent />
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

      {/* Trend chart */}
      <div className="rounded-xl border border-border bg-gradient-card p-5 mb-6 shadow-card-premium">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Demande FR — 12 dernières périodes</h3>
          <span className="text-xs text-muted-foreground">Source: Search volume index</span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={niche.trend.map((v, i) => ({ i: `T-${12 - i}`, v }))}>
              <XAxis dataKey="i" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

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

      {/* Level 3 — candidate products */}
      <div className="mb-3 flex items-center gap-2">
        <Package className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Niveau 3 — Produits candidats ({candidates.length})
        </h2>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card-premium">
        {candidates.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Aucun produit shortlisté pour cette sub-niche pour le moment.
          </div>
        ) : (
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
        )}
      </div>
    </>
  );
};

export default SubNicheDetail;
