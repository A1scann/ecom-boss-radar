import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { PageHeader, ScorePill } from "@/components/ui-custom/Premium";
import { products, Product } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useShortlist } from "@/store/shortlist";
import { Bookmark, BookmarkCheck, ExternalLink, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ProductFinder = () => {
  const [params] = useSearchParams();
  const nicheFilter = params.get("niche");
  const { has, toggle } = useShortlist();

  const [minMargin, setMinMargin] = useState(200);
  const [minSearches, setMinSearches] = useState(5000);
  const [evergreenOnly, setEvergreenOnly] = useState(false);
  const [excludeAmazon, setExcludeAmazon] = useState(true);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (nicheFilter && p.nicheId !== nicheFilter) return false;
      if (p.margin < minMargin) return false;
      if (p.semrushSearches < minSearches) return false;
      if (evergreenOnly && p.seasonality !== "Evergreen") return false;
      if (excludeAmazon && p.amazonDominated) return false;
      return true;
    }).sort((a, b) => b.fitScore - a.fitScore);
  }, [nicheFilter, minMargin, minSearches, evergreenOnly, excludeAmazon]);

  return (
    <>
      <PageHeader
        eyebrow="Module 2"
        title="Product Finder"
        description={nicheFilter ? `Produits filtrés sur la sous-niche sélectionnée.` : "Tous les produits high-ticket scorés selon la méthode EcomBoss."}
        actions={nicheFilter ? <Button asChild variant="outline"><Link to="/products">Effacer filtre niche</Link></Button> : null}
      />

      {/* Filters */}
      <div className="rounded-xl border border-border bg-gradient-card p-5 mb-6 shadow-card-premium">
        <div className="grid md:grid-cols-4 gap-5">
          <div>
            <Label className="text-xs">Marge min (€)</Label>
            <Input type="number" value={minMargin} onChange={(e) => setMinMargin(+e.target.value)} className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label className="text-xs">Volume recherches min</Label>
            <Input type="number" value={minSearches} onChange={(e) => setMinSearches(+e.target.value)} className="mt-1.5 font-mono" />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <Switch checked={evergreenOnly} onCheckedChange={setEvergreenOnly} />
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
                <th className="text-center p-3 font-medium">Amazon</th>
                <th className="text-center p-3 font-medium">Verdict</th>
                <th className="text-right p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <ProductRow key={p.id} p={p} saved={has(p.id)} onToggle={() => toggle(p.id)} />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Aucun produit ne correspond aux filtres.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

const ProductRow = ({ p, saved, onToggle }: { p: Product; saved: boolean; onToggle: () => void }) => (
  <tr className="border-b border-border hover:bg-muted/20 transition-colors">
    <td className="p-3">
      <div className="font-medium leading-tight">{p.name}</div>
      <div className="text-xs text-muted-foreground mt-0.5 italic">{p.marketingAngle}</div>
    </td>
    <td className="p-3 text-muted-foreground">{p.niche}</td>
    <td className="p-3 text-right font-mono">{p.buyPrice}€</td>
    <td className="p-3 text-right font-mono">{p.sellPrice}€</td>
    <td className="p-3 text-right font-mono font-semibold text-primary">+{p.margin}€</td>
    <td className="p-3 text-right font-mono">{p.semrushSearches.toLocaleString("fr-FR")}</td>
    <td className="p-3 text-right font-mono">{p.cpc}€</td>
    <td className="p-3 text-center">
      {p.amazonDominated
        ? <X className="w-4 h-4 text-destructive inline" />
        : <Check className="w-4 h-4 text-success inline" />}
    </td>
    <td className="p-3 text-center"><ScorePill score={p.fitScore} /></td>
    <td className="p-3 text-right">
      <div className="flex justify-end gap-1">
        <Button size="icon" variant="ghost" asChild><a href={p.supplierUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a></Button>
        <Button size="icon" variant="ghost" onClick={onToggle} className={cn(saved && "text-primary")}>
          {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </Button>
      </div>
    </td>
  </tr>
);

export default ProductFinder;
