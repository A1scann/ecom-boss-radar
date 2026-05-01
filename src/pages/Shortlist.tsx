import { PageHeader, ScorePill } from "@/components/ui-custom/Premium";
import { products } from "@/data/mockData";
import { useShortlist } from "@/store/shortlist";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Bookmark, Compass, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const Shortlist = () => {
  const { shortlist, toggle, clear } = useShortlist();
  const items = products.filter((p) => shortlist.includes(p.id));
  const totalMargin = items.reduce((a, p) => a + p.margin, 0);

  const exportCSV = () => {
    const headers = ["Nom", "Niche", "Achat", "Vente", "Marge", "Recherches", "CPC", "Fit Score", "Verdict", "Angle"];
    const rows = items.map((p) =>
      [p.name, p.niche, p.buyPrice, p.sellPrice, p.margin, p.semrushSearches, p.cpc, p.fitScore, p.verdict, p.marketingAngle]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `niche-shortlist-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Shortlist exportée en CSV");
  };

  return (
    <>
      <PageHeader
        eyebrow="Workflow"
        title="Ma Shortlist"
        description="Vos produits sélectionnés à analyser et tester en priorité."
        actions={
          <div className="flex gap-2">
            {items.length > 0 && (
              <>
                <Button variant="outline" onClick={clear}><Trash2 className="w-4 h-4 mr-2" /> Vider</Button>
                <Button onClick={exportCSV} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                  <Download className="w-4 h-4 mr-2" /> Exporter CSV
                </Button>
              </>
            )}
          </div>
        }
      />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center bg-gradient-card">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Compass className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Aucun produit dans votre sélection pour l'instant.</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Explorez le Niche Radar et ajoutez les produits qui vous intéressent.
          </p>
          <Button asChild className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Link to="/niches">→ Explorer les niches <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-border bg-gradient-card p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Produits</div>
              <div className="text-2xl font-bold mt-1">{items.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-gradient-card p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Marge cumulée / vente</div>
              <div className="text-2xl font-bold mt-1 text-primary">{totalMargin.toLocaleString("fr-FR")}€</div>
            </div>
            <div className="rounded-xl border border-border bg-gradient-card p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Score moyen</div>
              <div className="text-2xl font-bold mt-1">{Math.round(items.reduce((a, p) => a + p.fitScore, 0) / items.length)}/100</div>
            </div>
          </div>
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.niche} · Marge {p.margin}€ · CPC {p.cpc}€</div>
                </div>
                <div className="flex items-center gap-3">
                  <ScorePill score={p.fitScore} />
                  <Button size="sm" variant="ghost" onClick={() => toggle(p.id)}>Retirer</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default Shortlist;
