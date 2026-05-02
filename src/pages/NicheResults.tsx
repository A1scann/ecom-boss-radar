import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, ScorePill } from "@/components/ui-custom/Premium";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Bookmark, BookmarkCheck, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useShortlist } from "@/store/shortlist";
import { SubmitToCoach } from "@/components/SubmitToCoach";
import { cn } from "@/lib/utils";

type Niche = { id: string; slug: string; name: string };
type Sub = { id: string; slug: string; name: string };
type Micro = { id: string; name: string; seed_keyword: string | null; sub_niche_id: string | null };

type LiveProduct = {
  id: string;
  name: string;
  sub_niche_slug: string;
  seed_keyword: string | null;
  buy_price_estimate: number;
  sell_price_estimate: number;
  margin_potential: number;
  opportunity_score: number;
  verdict: string;
  competitors: string[] | null;
  source_url: string | null;
};

type Job = { subSlug: string; subName: string; microName: string; seed: string };

export default function NicheResults() {
  const { nicheSlug } = useParams();
  const { has, toggle } = useShortlist();

  const [niche, setNiche] = useState<Niche | null | undefined>(undefined);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });

  const subBySlug = useMemo(() => {
    const m: Record<string, Sub> = {};
    subs.forEach((s) => { m[s.slug] = s; });
    return m;
  }, [subs]);

  const fetchProducts = async (seeds: string[]) => {
    if (!seeds.length) { setProducts([]); return; }
    const { data } = await supabase
      .from("products_live")
      .select("id, name, sub_niche_slug, seed_keyword, buy_price_estimate, sell_price_estimate, margin_potential, opportunity_score, verdict, competitors, source_url")
      .in("seed_keyword", seeds)
      .gte("opportunity_score", 70)
      .neq("verdict", "Rejeter")
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
      const subList = (ss ?? []) as Sub[];
      const { data: ms } = subList.length
        ? await supabase
            .from("micro_niches")
            .select("id, name, seed_keyword, sub_niche_id")
            .in("sub_niche_id", subList.map((s) => s.id))
        : { data: [] as Micro[] };
      const microList = (ms ?? []) as Micro[];
      const subById = new Map(subList.map((s) => [s.id, s]));
      const flat: Job[] = microList
        .filter((mi) => mi.seed_keyword && mi.sub_niche_id && subById.has(mi.sub_niche_id))
        .map((mi) => {
          const sub = subById.get(mi.sub_niche_id!)!;
          return { subSlug: sub.slug, subName: sub.name, microName: mi.name, seed: mi.seed_keyword as string };
        });
      if (cancelled) return;
      setNiche(n as Niche);
      setSubs(subList);
      setJobs(flat);
      await fetchProducts(flat.map((j) => j.seed));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [nicheSlug]);

  const runSearch = async () => {
    if (!jobs.length) {
      toast.error("Aucune micro-niche à interroger pour cette niche.");
      return;
    }
    setSearching(true);
    setProgress({ done: 0, total: jobs.length, current: jobs[0]?.microName ?? "" });
    try {
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        setProgress({ done: i, total: jobs.length, current: job.microName });
        try {
          await supabase.functions.invoke("product-discover", {
            body: { seed: job.seed, subNicheSlug: job.subSlug, persist: true },
          });
        } catch (e) {
          console.error("product-discover error", job, e);
        }
      }
      setProgress({ done: jobs.length, total: jobs.length, current: "" });
      await fetchProducts(jobs.map((j) => j.seed));
      setSearched(true);
      toast.success("Recherche terminée");
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

  // group by sub_niche_slug, falling back to the job's subSlug via seed_keyword
  const seedToSub = new Map(jobs.map((j) => [j.seed, j.subSlug]));
  const grouped = new Map<string, LiveProduct[]>();
  products.forEach((p) => {
    const slug =
      p.sub_niche_slug ||
      (p.seed_keyword ? seedToSub.get(p.seed_keyword) : undefined) ||
      "";
    if (!slug) return;
    const arr = grouped.get(slug) ?? [];
    arr.push(p);
    grouped.set(slug, arr);
  });
  const subSectionEntries = Array.from(grouped.entries())
    .map(([slug, items]) => ({ slug, sub: subBySlug[slug], items }))
    .filter((e) => e.sub)
    .sort((a, b) => a.sub.name.localeCompare(b.sub.name));

  const totalProducts = products.length;
  const subsWithResults = subSectionEntries.length;
  const hasCache = totalProducts > 0;

  return (
    <div className="space-y-6">
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Link to="/" className="hover:text-foreground">Accueil</Link>
        <span>/</span>
        <span className="text-foreground">{niche.name}</span>
      </div>

      <PageHeader
        eyebrow="Recherche produit"
        title={`${niche.name} — Recherche produit`}
        description={
          jobs.length
            ? `${subs.length} sous-niches · ${jobs.length} requêtes prêtes à analyser via le moteur de scoring.`
            : `${subs.length} sous-niches · aucune micro-niche n'est disponible pour cette niche.`
        }
        actions={
          <Button
            onClick={runSearch}
            disabled={searching || jobs.length === 0}
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
        }
      />

      {searching && (
        <div className="rounded-xl border border-border bg-gradient-card p-4 space-y-2 shadow-card-premium">
          <div className="text-sm">
            Analyse en cours… <span className="font-semibold">{progress.current}</span>{" "}
            <span className="text-muted-foreground">({progress.done}/{progress.total})</span>
          </div>
          <div className="h-1.5 w-full bg-muted/40 rounded overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {hasCache && (
        <div className="text-xs text-muted-foreground font-mono">
          {totalProducts} produits trouvés dans {subsWithResults} sous-niches
        </div>
      )}

      {!hasCache && !searching ? (
        <div className="rounded-xl border border-dashed border-border bg-gradient-card p-10 text-center">
          <div className="text-sm text-muted-foreground">
            {searched
              ? "Recherche terminée — 0 produits passent le seuil de score (≥ 70). Essayez de relancer la recherche."
              : jobs.length
                ? "Aucun résultat pour le moment — lance la recherche pour analyser les sous-niches."
                : "Aucune micro-niche n'est encore définie pour cette niche, la recherche n'est pas disponible."}
          </div>
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
                  .map((p) => {
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
            </section>
          ))}

          {hasCache && subSectionEntries.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-gradient-card p-10 text-center text-sm text-muted-foreground">
              {searched
                ? "Recherche terminée — 0 produits passent le seuil de score (≥ 70). Essayez de relancer la recherche."
                : "Aucun produit trouvé — réessayez ou choisissez une autre niche."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
