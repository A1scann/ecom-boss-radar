import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { PageHeader, ScorePill } from "@/components/ui-custom/Premium";
import { products, Product } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useShortlist } from "@/store/shortlist";
import { Bookmark, BookmarkCheck, ExternalLink, Check, X, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
};

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

  const fetchLive = async (slug: string) => {
    if (!slug) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("products_live")
      .select("*")
      .eq("sub_niche_slug", slug)
      .order("opportunity_score", { ascending: false });
    if (error) console.error(error);
    setLive((data ?? []) as LiveProduct[]);
    setLoading(false);
    return data ?? [];
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

  // Auto-fetch on mount, and auto-discover if empty and we have a seed
  useEffect(() => {
    (async () => {
      if (!slugFilter) return;
      const rows = await fetchLive(slugFilter);
      if ((rows?.length ?? 0) === 0 && seed) {
        runDiscovery();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugFilter]);

  const rows = useMemo<Row[]>(() => {
    if (slugFilter && live.length > 0) {
      return live.map((p) => ({
        id: p.id,
        name: p.name,
        niche: slugFilter,
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
      }));
    }
    // Fallback to mock products
    return products
      .filter((p) => !nicheFilter || p.nicheId === nicheFilter)
      .map((p) => ({
        id: p.id,
        name: p.name,
        niche: p.niche,
        nicheId: p.nicheId,
        buyPrice: p.buyPrice,
        sellPrice: p.sellPrice,
        margin: p.margin,
        semrushSearches: p.semrushSearches,
        cpc: p.cpc,
        amazonDominated: p.amazonDominated,
        fitScore: p.fitScore,
        marketingAngle: p.marketingAngle,
        supplierUrl: p.supplierUrl,
        isLive: false,
      }));
  }, [live, slugFilter, nicheFilter]);

  const filtered = useMemo(() => {
    return rows.filter((p) => {
      if (p.margin < minMargin) return false;
      if (p.semrushSearches < minSearches) return false;
      if (excludeAmazon && p.amazonDominated) return false;
      return true;
    }).sort((a, b) => b.fitScore - a.fitScore);
  }, [rows, minMargin, minSearches, excludeAmazon]);

  const usingLive = slugFilter && live.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Module 2"
        title="Product Finder"
        description={
          slugFilter
            ? `Produits high-ticket détectés dans la sous-niche « ${seed || slugFilter} ».`
            : "Tous les produits high-ticket scorés selon la méthode EcomBoss."
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

      {slugFilter && (
        <div className="mb-4 text-xs text-muted-foreground">
          {loading ? "Chargement…" : usingLive
            ? <>Source : <span className="text-success font-medium">données live SerpApi</span> ({live.length} produits)</>
            : <>Aucun produit live trouvé pour cette niche — fallback sur les données mock.</>}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-border bg-gradient-card p-5 mb-6 shadow-card-premium">
        <div className="grid md:grid-cols-4 gap-5">
          <div>
            <Label className="text-xs">Marge min (€)</Label>
            <Input type="number" value={minMargin} onChange={(e) => setMinMargin(+e.target.value)} className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label className="text-xs">Volume recherches min</Label>
            <Input type="number" value={minSearches} onChange={(e) => setMinSearches(+e.target.value)} className="mt-1.5 font-mono" disabled={usingLive} />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <Switch checked={evergreenOnly} onCheckedChange={setEvergreenOnly} disabled={usingLive} />
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
                <th className="text-right p-3 font-medium">Recherches</th>
                <th className="text-right p-3 font-medium">CPC</th>
                <th className="text-center p-3 font-medium">Concurrence</th>
                <th className="text-center p-3 font-medium">Verdict</th>
                <th className="text-right p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <ProductRow key={p.id} p={p} saved={has(p.id)} onToggle={() => toggle(p.id)} />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">
                  {discovering ? "Discovery en cours…" : "Aucun produit ne correspond aux filtres."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

const ProductRow = ({ p, saved, onToggle }: { p: Row; saved: boolean; onToggle: () => void }) => (
  <tr className="border-b border-border hover:bg-muted/20 transition-colors">
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
    <td className="p-3 text-right font-mono">{p.semrushSearches ? p.semrushSearches.toLocaleString("fr-FR") : "—"}</td>
    <td className="p-3 text-right font-mono">{p.cpc ? `${p.cpc}€` : "—"}</td>
    <td className="p-3 text-center">
      {p.amazonDominated
        ? <X className="w-4 h-4 text-destructive inline" />
        : <Check className="w-4 h-4 text-success inline" />}
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
        {p.supplierUrl && (
          <Button size="icon" variant="ghost" asChild><a href={p.supplierUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a></Button>
        )}
        <Button size="icon" variant="ghost" onClick={onToggle} className={cn(saved && "text-primary")}>
          {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </Button>
      </div>
    </td>
  </tr>
);

export default ProductFinder;
