import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { PageHeader, ScorePill } from "@/components/ui-custom/Premium";
import { products } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useShortlist } from "@/store/shortlist";
import { Bookmark, BookmarkCheck, ExternalLink, Check, X, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SubmitToCoach } from "@/components/SubmitToCoach";

type ScorePoint = { date: string; score: number };

type LiveProduct = {
  id: string;
  name: string;
  sub_niche_slug: string;
  buy_price_estimate: number;
  sell_price_estimate: number;
  margin_potential: number;
  opportunity_score: number;
  buying_intent: number;
  competition_difficulty: number;
  offline_scarcity: number;
  verdict: string;
  competitors: string[] | null;
  thumbnail: string | null;
  source_url: string | null;
  score_history: ScorePoint[] | null;
  last_signal_at: string | null;
};

type WatchEntry = {
  id: string;
  product_id: string;
  added_at: string;
  last_refreshed_at: string;
};

type Row = {
  id: string;
  name: string;
  niche: string;
  nicheId?: string;
  buyPrice: number;
  sellPrice: number;
  margin: number;
  semrushSearches: number;
  cpc: number;
  amazonDominated: boolean;
  fitScore: number;
  marketingAngle?: string;
  supplierUrl?: string;
  isLive: boolean;
  verdict?: string;
  scoreHistory?: ScorePoint[];
  lastRefreshedAt?: string | null;
  subNicheSlug?: string;
  competitors?: string[];
  googleTrends?: number | string;
  seasonality?: string;
};

function relativeTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} j`;
}

function Sparkline({ data }: { data: ScorePoint[] }) {
  if (!data || data.length === 0) {
    return <div className="text-xs text-muted-foreground">—</div>;
  }
  const w = 80, h = 24, pad = 2;
  const scores = data.map((d) => d.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = Math.max(1, max - min);
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = pad + i * step;
    const y = h - pad - ((d.score - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");

  let stroke = "hsl(var(--muted-foreground))";
  if (data.length >= 2) {
    const last = scores[scores.length - 1];
    const prev = scores[scores.length - 2];
    stroke = last > prev ? "hsl(var(--success))" : last < prev ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";
  }
  return (
    <svg width={w} height={h} className="inline-block align-middle">
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} />
      {data.length === 1 && (
        <circle cx={pad} cy={h / 2} r="2" fill={stroke} />
      )}
    </svg>
  );
}

const ProductFinder = () => {
  const [params] = useSearchParams();
  const nicheFilter = params.get("niche");
  const slugFilter = params.get("slug") ?? "";
  const seed = params.get("seed") ?? "";
  const { has, toggle } = useShortlist();

  const [minMargin, setMinMargin] = useState(200);
  const [minSearches, setMinSearches] = useState(0);
  const [evergreenOnly, setEvergreenOnly] = useState(false);
  const [excludeAmazon, setExcludeAmazon] = useState(false);

  const [live, setLive] = useState<LiveProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  const [watchlist, setWatchlist] = useState<WatchEntry[]>([]);
  const [watchlistProducts, setWatchlistProducts] = useState<LiveProduct[]>([]);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"discover" | "watchlist">("discover");

  const fetchLive = async (slug: string) => {
    if (!slug) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("products_live")
      .select("*")
      .eq("sub_niche_slug", slug)
      .order("opportunity_score", { ascending: false });
    if (error) console.error("[ProductFinder] products_live error:", error);
    setLive((data ?? []) as any);
    setLoading(false);
    return data ?? [];
  };

  const fetchWatchlist = useCallback(async () => {
    const { data: wl, error: e1 } = await supabase
      .from("product_watchlist")
      .select("*")
      .order("added_at", { ascending: false });
    if (e1) { console.error("[Watchlist] fetch error", e1); return; }
    const entries = (wl ?? []) as WatchEntry[];
    setWatchlist(entries);

    const ids = entries.map((w) => w.product_id);
    if (ids.length === 0) { setWatchlistProducts([]); return; }
    const { data: prods, error: e2 } = await supabase
      .from("products_live").select("*").in("id", ids);
    if (e2) { console.error("[Watchlist] products fetch error", e2); return; }
    setWatchlistProducts((prods ?? []) as any);
  }, []);

  const isWatched = (id: string) => watchlist.some((w) => w.product_id === id);

  const toggleWatch = async (id: string) => {
    if (isWatched(id)) {
      const { error } = await supabase.from("product_watchlist").delete().eq("product_id", id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Retiré de la watchlist" });
    } else {
      const { error } = await supabase.from("product_watchlist").insert({ product_id: id });
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Ajouté à la watchlist" });
    }
    await fetchWatchlist();
  };

  const refreshOne = async (p: LiveProduct) => {
    setRefreshingId(p.id);
    try {
      const { error } = await supabase.functions.invoke("product-discover", {
        body: { seed: p.name, subNicheSlug: p.sub_niche_slug, productId: p.id, productName: p.name, persist: true },
      });
      if (error) throw error;
      toast({ title: "Signaux rafraîchis", description: p.name });
      await fetchWatchlist();
      if (slugFilter === p.sub_niche_slug) await fetchLive(slugFilter);
    } catch (e: any) {
      toast({ title: "Erreur refresh", description: e?.message ?? "Erreur inconnue", variant: "destructive" });
    } finally {
      setRefreshingId(null);
    }
  };

  const runDiscovery = async () => {
    if (!seed || !slugFilter) {
      toast({ title: "Discovery indisponible", description: "Slug ou seed manquant.", variant: "destructive" });
      return;
    }
    setDiscovering(true);
    try {
      const { data, error } = await supabase.functions.invoke("product-discover", {
        body: { seed, subNicheSlug: slugFilter, persist: true },
      });
      if (error) throw error;
      toast({ title: "Discovery terminée", description: `${data?.count ?? 0} produits scorés.` });
      await fetchLive(slugFilter);
    } catch (e: any) {
      toast({ title: "Erreur discovery", description: e?.message ?? "Erreur inconnue", variant: "destructive" });
    } finally {
      setDiscovering(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (!slugFilter) return;
      const rows = await fetchLive(slugFilter);
      if ((rows?.length ?? 0) === 0 && seed) runDiscovery();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugFilter]);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const liveToRow = (p: LiveProduct): Row => ({
    id: p.id,
    name: p.name,
    niche: p.sub_niche_slug,
    nicheId: nicheFilter ?? undefined,
    buyPrice: Math.round(p.buy_price_estimate),
    sellPrice: Math.round(p.sell_price_estimate),
    margin: Math.round(p.margin_potential),
    semrushSearches: 0,
    cpc: 0,
    amazonDominated: (p.competitors ?? []).some((d) => /amazon|cdiscount|fnac/i.test(d)),
    fitScore: Math.round(p.opportunity_score),
    verdict: p.verdict,
    supplierUrl: p.source_url ?? undefined,
    isLive: true,
    scoreHistory: p.score_history ?? [],
    subNicheSlug: p.sub_niche_slug,
    competitors: p.competitors ?? [],
    seasonality: "Evergreen",
  });

  const discoverRows = useMemo<Row[]>(() => {
    if (slugFilter && live.length > 0) return live.map(liveToRow);
    return products
      .filter((p) => !nicheFilter || p.nicheId === nicheFilter)
      .map((p) => ({
        id: p.id, name: p.name, niche: p.niche, nicheId: p.nicheId,
        buyPrice: p.buyPrice, sellPrice: p.sellPrice, margin: p.margin,
        semrushSearches: p.semrushSearches, cpc: p.cpc, amazonDominated: p.amazonDominated,
        fitScore: p.fitScore, marketingAngle: p.marketingAngle, supplierUrl: p.supplierUrl,
        isLive: false,
        competitors: p.competitors,
        googleTrends: p.googleTrends,
        seasonality: p.seasonality,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, slugFilter, nicheFilter]);

  const filtered = useMemo(() => discoverRows.filter((p) => {
    if (p.margin < minMargin) return false;
    if (p.semrushSearches < minSearches) return false;
    if (excludeAmazon && p.amazonDominated) return false;
    return true;
  }).sort((a, b) => b.fitScore - a.fitScore), [discoverRows, minMargin, minSearches, excludeAmazon]);

  const usingLive = slugFilter && live.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Module 2"
        title="Trouver des produits"
        description={
          slugFilter
            ? `Produits high-ticket détectés dans la sous-niche « ${seed || slugFilter} ».`
            : "Tous les produits high-ticket scorés selon la méthode Niché."
        }
        actions={
          <div className="flex gap-2">
            {slugFilter && seed && (
              <Button onClick={runDiscovery} disabled={discovering} variant="default">
                {discovering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {discovering ? "Discovery…" : "Re-scanner via SerpApi"}
              </Button>
            )}
            {(nicheFilter || slugFilter) && (
              <Button asChild variant="outline"><Link to="/products">Effacer filtre niche</Link></Button>
            )}
          </div>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList>
          <TabsTrigger value="discover">Discovery</TabsTrigger>
          <TabsTrigger value="watchlist">
            Watchlist {watchlist.length > 0 && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary">{watchlist.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover">
          {slugFilter && (
            <div className="mb-4 text-xs text-muted-foreground">
              {loading ? "Chargement…" : usingLive
                ? <>Source : <span className="text-success font-medium">données live SerpApi</span> ({live.length} produits)</>
                : <>Aucun produit live trouvé pour cette niche — fallback sur les données mock.</>}
            </div>
          )}

          <div className="rounded-xl border border-border bg-gradient-card p-5 mb-6 shadow-card-premium">
            <div className="grid md:grid-cols-4 gap-5">
              <div>
                <Label className="text-xs">Marge min (€)</Label>
                <Input type="number" value={minMargin} onChange={(e) => setMinMargin(+e.target.value)} className="mt-1.5 font-mono" />
              </div>
              <div>
                <Label className="text-xs">Volume recherches min</Label>
                <Input type="number" value={minSearches} onChange={(e) => setMinSearches(+e.target.value)} className="mt-1.5 font-mono" disabled={!!usingLive} />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch checked={evergreenOnly} onCheckedChange={setEvergreenOnly} disabled={!!usingLive} />
                <Label className="text-sm">Evergreen only</Label>
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch checked={excludeAmazon} onCheckedChange={setExcludeAmazon} />
                <Label className="text-sm">Exclure Amazon dominé</Label>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Blacklist active : gadgets viraux · vêtements · bijoux · consommables · produits commoditisés
            </div>
          </div>

          <ProductTable
            rows={filtered}
            empty={discovering ? "Discovery en cours…" : "Aucun produit ne correspond aux filtres."}
            isWatched={isWatched}
            onToggleWatch={toggleWatch}
            shortlistHas={has}
            onToggleShortlist={toggle}
          />
        </TabsContent>

        <TabsContent value="watchlist">
          <div className="mb-4 text-xs text-muted-foreground">
            {watchlistProducts.length} produit(s) suivi(s). Cliquez sur <RefreshCw className="inline w-3 h-3 mx-0.5" /> pour rafraîchir les signaux SerpApi.
          </div>
          <ProductTable
            rows={watchlistProducts.map(liveToRow).map((r) => ({
              ...r,
              lastRefreshedAt: watchlist.find((w) => w.product_id === r.id)?.last_refreshed_at ?? null,
            }))}
            empty="Aucun produit dans la watchlist. Ajoutez-en depuis l'onglet Discovery."
            isWatched={isWatched}
            onToggleWatch={toggleWatch}
            shortlistHas={has}
            onToggleShortlist={toggle}
            showWatchActions
            refreshingId={refreshingId}
            onRefresh={(id) => {
              const p = watchlistProducts.find((x) => x.id === id);
              if (p) refreshOne(p);
            }}
          />
        </TabsContent>
      </Tabs>
    </>
  );
};

const ProductTable = ({
  rows, empty, isWatched, onToggleWatch, shortlistHas, onToggleShortlist,
  showWatchActions, refreshingId, onRefresh,
}: {
  rows: Row[]; empty: string;
  isWatched: (id: string) => boolean;
  onToggleWatch: (id: string) => void;
  shortlistHas: (id: string) => boolean;
  onToggleShortlist: (id: string) => void;
  showWatchActions?: boolean;
  refreshingId?: string | null;
  onRefresh?: (id: string) => void;
}) => (
  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card-premium">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
            <th className="text-left p-3 font-medium">Produit</th>
            <th className="text-left p-3 font-medium">Niche</th>
            <th className="text-right p-3 font-medium">Achat</th>
            <th className="text-right p-3 font-medium">Vente</th>
            <th className="text-right p-3 font-medium">Marge</th>
            {showWatchActions
              ? <th className="text-center p-3 font-medium">Évolution</th>
              : <th className="text-right p-3 font-medium">Recherches</th>}
            {showWatchActions
              ? <th className="text-left p-3 font-medium">Maj</th>
              : <th className="text-right p-3 font-medium">CPC</th>}
            <th className="text-center p-3 font-medium">Concurrence</th>
            <th className="text-center p-3 font-medium">Verdict</th>
            <th className="text-right p-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-border hover:bg-muted/20 transition-colors">
              <td className="p-3">
                <div className="font-medium leading-tight flex items-center gap-2">
                  {p.name}
                  {p.isLive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/30">LIVE</span>}
                </div>
                {p.marketingAngle && <div className="text-xs text-muted-foreground mt-0.5 italic">{p.marketingAngle}</div>}
              </td>
              <td className="p-3 text-muted-foreground">{p.niche}</td>
              <td className="p-3 text-right font-mono">{p.buyPrice}€</td>
              <td className="p-3 text-right font-mono">{p.sellPrice}€</td>
              <td className="p-3 text-right font-mono font-semibold text-primary">+{p.margin}€</td>
              {showWatchActions
                ? <td className="p-3 text-center"><Sparkline data={p.scoreHistory ?? []} /></td>
                : <td className="p-3 text-right font-mono">{p.semrushSearches ? p.semrushSearches.toLocaleString("fr-FR") : "—"}</td>}
              {showWatchActions
                ? <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{relativeTime(p.lastRefreshedAt)}</td>
                : <td className="p-3 text-right font-mono">{p.cpc ? `${p.cpc}€` : "—"}</td>}
              <td className="p-3 text-center">
                {p.amazonDominated ? <X className="w-4 h-4 text-destructive inline" /> : <Check className="w-4 h-4 text-success inline" />}
              </td>
              <td className="p-3 text-center">
                {p.verdict
                  ? <span className={cn("text-xs px-2 py-1 rounded border font-medium",
                      p.verdict === "Prioritaire" && "bg-success/15 text-success border-success/30",
                      p.verdict === "À tester" && "bg-warning/15 text-warning border-warning/30",
                      p.verdict === "Rejeter" && "bg-destructive/15 text-destructive border-destructive/30",
                    )}>{p.verdict}</span>
                  : <ScorePill score={p.fitScore} />}
              </td>
              <td className="p-3 text-right">
                <div className="flex justify-end gap-1">
                  {showWatchActions && onRefresh && (
                    <Button size="icon" variant="ghost" onClick={() => onRefresh(p.id)} disabled={refreshingId === p.id} title="Rafraîchir les signaux">
                      {refreshingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </Button>
                  )}
                  {p.supplierUrl && (
                    <Button size="icon" variant="ghost" asChild><a href={p.supplierUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a></Button>
                  )}
                  <SubmitToCoach
                    variant="icon"
                    product={{
                      name: p.name,
                      niche: p.niche,
                      supplierUrl: p.supplierUrl,
                      buyPrice: p.buyPrice,
                      sellPrice: p.sellPrice,
                      margin: p.margin,
                      semrushSearches: p.semrushSearches,
                      googleTrends: p.googleTrends,
                      seasonality: p.seasonality,
                      marketingAngle: p.marketingAngle,
                      competitors: p.competitors,
                    }}
                  />
                  {p.isLive && (
                    <Button size="icon" variant="ghost" onClick={() => onToggleWatch(p.id)}
                      className={cn(isWatched(p.id) && "text-primary")}
                      title={isWatched(p.id) ? "Retirer de la watchlist" : "Ajouter à la watchlist"}>
                      {isWatched(p.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </Button>
                  )}
                  {!p.isLive && (
                    <Button size="icon" variant="ghost" onClick={() => onToggleShortlist(p.id)} className={cn(shortlistHas(p.id) && "text-primary")}>
                      {shortlistHas(p.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default ProductFinder;
