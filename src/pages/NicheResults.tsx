import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, ScorePill } from "@/components/ui-custom/Premium";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, Bookmark, BookmarkCheck, ExternalLink, RefreshCw, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { useShortlist } from "@/store/shortlist";
import { SubmitToCoach } from "@/components/SubmitToCoach";
import { cn } from "@/lib/utils";

type Niche = { id: string; slug: string; name: string };
type Sub = { id: string; slug: string; name: string };

type LiveProduct = {
  id: string;
  name: string;
  sub_niche_slug: string;
  niche_slug: string | null;
  buy_price_estimate: number;
  sell_price_estimate: number;
  margin_potential: number;
  opportunity_score: number;
  verdict: string;
  competitors: string[] | null;
  source_url: string | null;
  cpc: number | null;
  search_volume: number | null;
  competition_level: string | null;
  serp_weakness_score: number | null;
  marketplace_dominance_score: number | null;
  why: string | null;
  angle: string | null;
};

type Banner = { kind: "error" | "warn"; message: string } | null;

export default function NicheResults() {
  const { nicheSlug } = useParams();
  const { has, toggle } = useShortlist();

  const [niche, setNiche] = useState<Niche | null | undefined>(undefined);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const subBySlug = useMemo(() => {
    const m: Record<string, Sub> = {};
    subs.forEach((s) => { m[s.slug] = s; });
    return m;
  }, [subs]);

  const fetchProducts = async (slug: string) => {
    const { data } = await supabase
      .from("products_live")
      .select("id, name, sub_niche_slug, niche_slug, buy_price_estimate, sell_price_estimate, margin_potential, opportunity_score, verdict, competitors, source_url, cpc, search_volume, competition_level, serp_weakness_score, marketplace_dominance_score, why, angle")
      .eq("niche_slug", slug)
      .order("opportunity_score", { ascending: false });
    setProducts((data ?? []) as any);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!nicheSlug) return;
      setLoading(true);
      const { data: n } = await supabase
        .from("niches").select("id, slug, name").eq("slug", nicheSlug).maybeSingle();
      if (!n) { if (!cancelled) { setNiche(null); setLoading(false); } return; }
      const { data: ss } = await supabase
        .from("sub_niches").select("id, slug, name").eq("niche_id", n.id).order("name");
      if (cancelled) return;
      setNiche(n as Niche);
      setSubs((ss ?? []) as Sub[]);
      await fetchProducts(nicheSlug);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [nicheSlug]);

  const handleErrorPayload = (payload: any) => {
    const code = String(payload?.error ?? "");
    const message = String(payload?.message ?? "");
    if (code === "MISSING_ANTHROPIC_KEY") {
      setBanner({
        kind: "error",
        message: "⚠️ Clé API Anthropic manquante — ajoutez ANTHROPIC_API_KEY dans Supabase Dashboard → Edge Functions → Secrets",
      });
    } else if (code === "AI_GENERATION_FAILED") {
      setBanner({ kind: "warn", message: `⚠️ Erreur de génération IA : ${message}. Réessayez dans quelques secondes.` });
    } else if (code === "SERPAPI_FAILED") {
      setBanner({ kind: "warn", message: `⚠️ Erreur SerpApi : ${message}.` });
    } else {
      setBanner({ kind: "warn", message: `⚠️ ${message || "Erreur inconnue"}` });
    }
  };

  const runSearch = async () => {
    if (!nicheSlug) return;
    setSearching(true);
    setBanner(null);
    try {
      const { data, error } = await supabase.functions.invoke("niche-search", {
        body: { nicheSlug },
      });
      if (error) {
        const ctx: any = (error as any)?.context;
        let payload: any = data;
        try {
          if (ctx && typeof ctx.json === "function") payload = await ctx.json();
          else if (ctx && typeof ctx.text === "function") payload = JSON.parse(await ctx.text());
        } catch { /* ignore */ }
        if (payload?.error) {
          handleErrorPayload(payload);
          return;
        }
        throw error;
      }
      if ((data as any)?.error) {
        handleErrorPayload(data);
        return;
      }
      await fetchProducts(nicheSlug);
      setSearched(true);
      const total = (data as any)?.total ?? 0;
      const scored = (data as any)?.scored ?? 0;
      const subCount = Object.keys((data as any)?.bySubNiche ?? {}).length;
      toast.success(`Recherche terminée — ${scored}/${total} produits qualifiés dans ${subCount} sous-niches`);
    } catch (e) {
      console.error("niche-search error", e);
      setBanner({ kind: "warn", message: "La recherche a échoué — réessayez dans un instant." });
    } finally {
      setSearching(false);
    }
  };

  if (loading || niche === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
      </div>
    );
  }
  if (niche === null) return <Navigate to="/" replace />;

  const visibleProducts = showAll ? products : products.filter((p) => p.opportunity_score >= 70);

  const grouped = new Map<string, LiveProduct[]>();
  visibleProducts.forEach((p) => {
    const slug = p.sub_niche_slug;
    if (!slug) return;
    const arr = grouped.get(slug) ?? [];
    arr.push(p);
    grouped.set(slug, arr);
  });
  const subSectionEntries = Array.from(grouped.entries())
    .map(([slug, items]) => ({
      slug,
      sub: subBySlug[slug] ?? { id: slug, slug, name: slug } as Sub,
      items,
    }))
    .sort((a, b) => a.sub.name.localeCompare(b.sub.name));

  const totalAll = products.length;
  const totalQualified = products.filter((p) => p.opportunity_score >= 70).length;
  const subsWithResults = subSectionEntries.length;
  const hasCache = totalAll > 0;

  return (
    <div className="space-y-6">
      {banner && (
        <div className={cn(
          "rounded-xl border p-4 flex items-start gap-3 text-sm",
          banner.kind === "error"
            ? "bg-destructive/10 border-destructive/30 text-destructive"
            : "bg-warning/10 border-warning/30 text-warning"
        )}>
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{banner.message}</div>
          <button onClick={() => setBanner(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Link to="/" className="hover:text-foreground">Accueil</Link>
        <span>/</span>
        <span className="text-foreground">{niche.name}</span>
      </div>

      <PageHeader
        eyebrow="Recherche produit"
        title={`${niche.name} — Recherche produit`}
        description={`${subs.length} sous-niches · pipeline IA 2 passes + validation SerpApi.`}
        actions={
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={runSearch}
              disabled={searching}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : hasCache ? (
                <RefreshCw className="w-4 h-4 mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {hasCache ? "Relancer la recherche" : "Lancer la recherche"}
            </Button>
            <p className="text-[11px] italic text-muted-foreground max-w-[320px] text-right">
              L'IA va générer 50 idées larges, filtrer les 30 meilleures, puis SerpApi valide chaque idée sur le marché français. Cela peut prendre 60 à 90 secondes.
            </p>
          </div>
        }
      />

      {searching && (
        <div className="rounded-xl border border-border bg-gradient-card p-4 shadow-card-premium">
          <div className="text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyse de la niche en cours… <span className="text-muted-foreground">(60–90 s)</span>
          </div>
        </div>
      )}

      {hasCache && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground font-mono">
            {totalQualified}/{totalAll} produits qualifiés (≥ 70) dans {subsWithResults} sous-niches
          </div>
          <label className="text-xs flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="accent-primary"
            />
            Afficher tous les produits
          </label>
        </div>
      )}

      {!hasCache && !searching ? (
        <div className="rounded-xl border border-dashed border-border bg-gradient-card p-10 text-center">
          <div className="text-sm text-muted-foreground">
            {searched
              ? "Recherche terminée — 0 produits passent le seuil de score (≥ 70). Essayez de relancer la recherche."
              : "Aucun résultat pour le moment — lance la recherche pour analyser la niche."}
          </div>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-gradient-card p-10 text-center text-sm text-muted-foreground">
          Aucun produit ne passe le seuil ≥ 70. Active "Afficher tous les produits" pour voir les autres résultats.
        </div>
      ) : (
        <div className="space-y-8">
          {subSectionEntries.map(({ slug, sub, items }) => (
            <section key={slug} className="space-y-3">
              <h2 className="text-sm font-semibold flex items-baseline gap-2">
                <span>{sub.name}</span>
                <span className="text-xs font-mono text-muted-foreground">— {items.length} produits</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items
                  .sort((a, b) => b.opportunity_score - a.opportunity_score)
                  .map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      subName={sub.name}
                      inShortlist={has(p.id)}
                      onToggle={() => toggle(p.id)}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product: p,
  subName,
  inShortlist,
  onToggle,
}: {
  product: LiveProduct;
  subName: string;
  inShortlist: boolean;
  onToggle: () => void;
}) {
  const verdictClass =
    p.verdict === "Prioritaire"
      ? "bg-success/15 text-success border-success/30"
      : p.verdict === "À tester"
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-muted/40 text-muted-foreground border-border";

  const compClass =
    p.competition_level === "Low"
      ? "bg-success/15 text-success border-success/30"
      : p.competition_level === "Medium"
      ? "bg-warning/15 text-warning border-warning/30"
      : p.competition_level === "High"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : "bg-muted/40 text-muted-foreground border-border";

  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5 shadow-card-premium flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          {p.angle && (
            <span className="inline-block text-[10px] px-2 py-0.5 rounded border border-border bg-muted/30 text-muted-foreground uppercase tracking-wider">
              {p.angle}
            </span>
          )}
          <h3 className="font-semibold text-sm leading-snug break-words">
            {p.name}
            {p.source_url && (
              <a href={p.source_url} target="_blank" rel="noreferrer" className="inline-flex ml-1.5 text-muted-foreground hover:text-primary align-middle">
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </h3>
          {p.why && <p className="text-xs italic text-muted-foreground">{p.why}</p>}
        </div>
        <ScorePill score={Math.round(p.opportunity_score)} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md bg-muted/30 px-2 py-1.5 border border-border/50">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Achat</div>
          <div className="font-mono font-semibold">{Math.round(p.buy_price_estimate)}€</div>
        </div>
        <div className="rounded-md bg-muted/30 px-2 py-1.5 border border-border/50">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Vente FR</div>
          <div className="font-mono font-semibold">{Math.round(p.sell_price_estimate)}€</div>
        </div>
        <div className="rounded-md bg-success/10 px-2 py-1.5 border border-success/20">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Marge</div>
          <div className="font-mono font-semibold text-success">+{Math.round(p.margin_potential)}€</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-muted/30 px-2 py-1.5 border border-border/50">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">CPC estimé</div>
          <div className="font-mono font-semibold">{p.cpc != null ? `${Number(p.cpc).toFixed(2)}€` : "—"}</div>
        </div>
        <div className="rounded-md bg-muted/30 px-2 py-1.5 border border-border/50 flex flex-col justify-center">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Concurrence</div>
          <span className={cn("inline-block w-fit text-[10px] px-1.5 py-0.5 rounded border font-medium mt-0.5", compClass)}>
            {p.competition_level ?? "—"}
          </span>
        </div>
      </div>

      {p.serp_weakness_score != null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
            <span>SERP Weakness</span>
            <span className="font-mono">{Math.round(p.serp_weakness_score)}</span>
          </div>
          <Progress value={Number(p.serp_weakness_score)} className="h-1.5" />
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className={cn("text-[10px] px-2 py-0.5 rounded border font-medium", verdictClass)}>{p.verdict}</span>
      </div>

      <div className="mt-auto pt-3 border-t border-border flex flex-col gap-2">
        <Button size="sm" variant={inShortlist ? "default" : "outline"} className="w-full" onClick={onToggle}>
          {inShortlist ? <BookmarkCheck className="w-3.5 h-3.5 mr-1.5" /> : <Bookmark className="w-3.5 h-3.5 mr-1.5" />}
          {inShortlist ? "Sélectionné" : "Ajouter à ma sélection"}
        </Button>
        <SubmitToCoach
          product={{
            name: p.name,
            niche: subName,
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
}
