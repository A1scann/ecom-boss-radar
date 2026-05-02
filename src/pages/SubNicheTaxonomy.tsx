import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { PageHeader, ScorePill } from "@/components/ui-custom/Premium";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useShortlist } from "@/store/shortlist";
import { SubmitToCoach } from "@/components/SubmitToCoach";
import { cn } from "@/lib/utils";

type Sub = { id: string; slug: string; name: string; description: string | null; macro_id: string | null; niche_id: string | null };
type Macro = { id: string; slug: string; name: string; icon: string | null };
type Niche = { id: string; slug: string; name: string };
type Micro = { id: string; slug: string; name: string; seed_keyword: string | null };

type LiveProduct = {
  id: string;
  name: string;
  sub_niche_slug: string;
  buy_price_estimate: number;
  sell_price_estimate: number;
  margin_potential: number;
  opportunity_score: number;
  verdict: string;
  competitors: string[] | null;
  source_url: string | null;
};

export default function SubNicheTaxonomy() {
  const { slug } = useParams();
  const { has, toggle } = useShortlist();
  const [sub, setSub] = useState<Sub | null | undefined>(undefined);
  const [macro, setMacro] = useState<Macro | null>(null);
  const [niche, setNiche] = useState<Niche | null>(null);
  const [micros, setMicros] = useState<Micro[]>([]);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [searchingId, setSearchingId] = useState<string | null>(null);

  const fetchProducts = async (subSlug: string) => {
    const { data } = await supabase
      .from("products_live")
      .select("id, name, sub_niche_slug, buy_price_estimate, sell_price_estimate, margin_potential, opportunity_score, verdict, competitors, source_url")
      .eq("sub_niche_slug", subSlug)
      .gte("opportunity_score", 70)
      .neq("verdict", "Rejeter")
      .order("opportunity_score", { ascending: false });
    setProducts((data ?? []) as any);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      const { data: s } = await supabase
        .from("sub_niches")
        .select("id, slug, name, description, macro_id, niche_id")
        .eq("slug", slug)
        .maybeSingle();
      if (!s) { if (!cancelled) setSub(null); return; }
      const [{ data: m }, { data: n }, { data: ms }] = await Promise.all([
        s.macro_id ? supabase.from("macro_niches").select("id, slug, name, icon").eq("id", s.macro_id).maybeSingle() : Promise.resolve({ data: null }),
        s.niche_id ? supabase.from("niches").select("id, slug, name").eq("id", s.niche_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("micro_niches").select("id, slug, name, seed_keyword").eq("sub_niche_id", s.id).order("name"),
      ]);
      if (cancelled) return;
      setSub(s as Sub);
      setMacro((m as Macro) ?? null);
      setNiche((n as Niche) ?? null);
      setMicros((ms ?? []) as Micro[]);
      await fetchProducts(s.slug);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const runDiscover = async (micro: Micro) => {
    if (!sub || !micro.seed_keyword) return;
    setSearchingId(micro.id);
    try {
      const { data, error } = await supabase.functions.invoke("product-discover", {
        body: { seed: micro.seed_keyword, subNicheSlug: sub.slug, persist: true },
      });
      if (error) throw error;
      await fetchProducts(sub.slug);
      toast.success(`Recherche terminée — ${data?.count ?? 0} produits scorés pour « ${micro.seed_keyword} »`);
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de la recherche");
    } finally {
      setSearchingId(null);
    }
  };

  if (sub === undefined) return <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>;
  if (sub === null) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
        <Link to="/" className="hover:text-foreground">Accueil</Link>
        <span>/</span>
        {macro && <><Link to={`/macro/${macro.slug}`} className="hover:text-foreground">{macro.icon} {macro.name}</Link><span>/</span></>}
        {niche && <><Link to={`/niche/${niche.slug}`} className="hover:text-foreground">{niche.name}</Link><span>/</span></>}
        <span className="text-foreground">{sub.name}</span>
      </div>

      <PageHeader
        eyebrow="Sous-niche"
        title={sub.name}
        description={sub.description ?? "Explore les micro-niches et lance une recherche de produits scorés."}
      />

      <div>
        <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-3">Micro-niches</h2>
        {micros.length === 0 ? (
          <div className="text-sm text-muted-foreground rounded-xl border border-border bg-card p-6">Aucune micro-niche pour cette sous-niche.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {micros.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-gradient-card p-4 flex flex-col gap-3 shadow-card-premium">
                <div className="font-medium text-sm leading-snug break-words">{m.name}</div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => runDiscover(m)}
                  disabled={!m.seed_keyword || searchingId === m.id}
                >
                  {searchingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Search className="w-3.5 h-3.5 mr-1.5" />}
                  Rechercher des produits →
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-3">
          Produits scorés ({products.length})
        </h2>
        {products.length === 0 ? (
          <div className="text-sm text-muted-foreground rounded-xl border border-border bg-card p-6">
            Aucun produit pour le moment. Lance une recherche depuis une micro-niche ci-dessus.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => {
              const inShortlist = has(p.id);
              return (
                <div key={p.id} className="rounded-xl border border-border bg-gradient-card p-5 shadow-card-premium flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-snug flex-1 break-words">
                      {p.name}
                      {p.source_url && (
                        <a href={p.source_url} target="_blank" rel="noreferrer" className="inline-flex ml-1.5 text-muted-foreground hover:text-primary align-middle">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </h3>
                    <ScorePill score={Math.round(p.opportunity_score)} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-muted/30 px-2 py-1.5 border border-border/50">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Achat</div>
                      <div className="font-mono font-semibold">{Math.round(p.buy_price_estimate)}€</div>
                    </div>
                    <div className="rounded-md bg-muted/30 px-2 py-1.5 border border-border/50">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Vente</div>
                      <div className="font-mono font-semibold">{Math.round(p.sell_price_estimate)}€</div>
                    </div>
                    <div className="rounded-md bg-primary/10 px-2 py-1.5 border border-primary/20">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Marge</div>
                      <div className="font-mono font-semibold text-primary">+{Math.round(p.margin_potential)}€</div>
                    </div>
                  </div>
                  <div>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded border font-medium",
                      p.verdict === "Prioritaire" ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"
                    )}>{p.verdict}</span>
                  </div>
                  <div className="mt-auto pt-3 border-t border-border flex flex-col gap-2">
                    <Button size="sm" variant={inShortlist ? "default" : "outline"} className="w-full" onClick={() => toggle(p.id)}>
                      {inShortlist ? <BookmarkCheck className="w-3.5 h-3.5 mr-1.5" /> : <Bookmark className="w-3.5 h-3.5 mr-1.5" />}
                      {inShortlist ? "Sélectionné" : "Ajouter à ma sélection"}
                    </Button>
                    <SubmitToCoach
                      product={{
                        name: p.name,
                        niche: sub.name,
                        supplierUrl: p.source_url ?? undefined,
                        buyPrice: Math.round(p.buy_price_estimate),
                        sellPrice: Math.round(p.sell_price_estimate),
                        margin: Math.round(p.margin_potential),
                        competitors: p.competitors ?? [],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
