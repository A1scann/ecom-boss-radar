import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, ScorePill } from "@/components/ui-custom/Premium";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, Bookmark, BookmarkCheck, ExternalLink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useShortlist } from "@/store/shortlist";
import { SubmitToCoach } from "@/components/SubmitToCoach";
import { cn } from "@/lib/utils";

type Macro = { id: string; slug: string; name: string; created_at?: string };
type Sub = { id: string; slug: string; name: string; macro_id: string | null; created_at?: string };

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
  competitors: any;
  source_url: string | null;
  cpc: number | null;
  search_volume: number | null;
  competition_level: string | null;
  serp_weakness_score: number | null;
  marketplace_dominance_score: number | null;
  why: string | null;
  angle: string | null;
  status: string | null;
};

const SEVEN_DAYS_AGO = () => new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
const MAX_BATCH = 50;

export default function Discoveries() {
  const { has, toggle } = useShortlist();
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [newMacros, setNewMacros] = useState<Macro[]>([]);
  const [newSubs, setNewSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const since = SEVEN_DAYS_AGO();
    const [{ data: p }, { data: m }, { data: s }, { data: nm }, { data: ns }] = await Promise.all([
      supabase
        .from("products_live")
        .select("id, name, sub_niche_slug, niche_slug, buy_price_estimate, sell_price_estimate, margin_potential, opportunity_score, verdict, competitors, source_url, cpc, search_volume, competition_level, serp_weakness_score, marketplace_dominance_score, why, angle, status")
        .eq("data_source", "discovery_v1")
        .order("opportunity_score", { ascending: false, nullsFirst: false })
        .limit(500),
      supabase.from("macro_niches").select("id, slug, name"),
      supabase.from("sub_niches").select("id, slug, name, macro_id"),
      supabase.from("macro_niches").select("id, slug, name, created_at").gte("created_at", since),
      supabase.from("sub_niches").select("id, slug, name, macro_id, created_at").gte("created_at", since),
    ]);
    setProducts((p ?? []) as any);
    setMacros((m ?? []) as Macro[]);
    setSubs((s ?? []) as Sub[]);
    setNewMacros((nm ?? []) as Macro[]);
    setNewSubs((ns ?? []) as Sub[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const run = async () => {
    setRunning(true);
    toast.info("Génération en cours… 30 à 60 s (AI seul, pas d'appel marché)");
    try {
      const { data, error } = await supabase.functions.invoke("discovery-run", { body: {} });
      if (error) throw error;
      const persisted = data?.persisted ?? 0;
      const newCount = (data?.newMacroNiches?.length ?? 0) + (data?.newSubNiches?.length ?? 0);
      toast.success(`${persisted} idées générées · ${newCount} nouvelles niches — validez celles qui vous intéressent`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de la génération");
    } finally {
      setRunning(false);
    }
  };

  const validate = async (ids: string[]) => {
    if (!ids.length) return;
    const batch = ids.slice(0, MAX_BATCH);
    setValidating(true);
    toast.info(`Validation marché de ${batch.length} produit${batch.length > 1 ? "s" : ""}…`);
    try {
      const { data, error } = await supabase.functions.invoke("validate-product", { body: { productIds: batch } });
      if (error) throw error;
      const ok = data?.validated ?? 0;
      const errs = data?.errors ?? 0;
      toast.success(`${ok} produit${ok > 1 ? "s" : ""} validé${ok > 1 ? "s" : ""}${errs ? ` · ${errs} erreur${errs > 1 ? "s" : ""}` : ""}`);
      setSelectedIds(new Set());
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de la validation");
    } finally {
      setValidating(false);
    }
  };

  const subBySlug = useMemo(() => {
    const m: Record<string, Sub> = {};
    subs.forEach((s) => { m[s.slug] = s; });
    return m;
  }, [subs]);
  const macroById = useMemo(() => {
    const m: Record<string, Macro> = {};
    macros.forEach((x) => { m[x.id] = x; });
    return m;
  }, [macros]);

  const pending = useMemo(
    () => products.filter((p) => p.status === "pending_validation"),
    [products],
  );
  const validated = useMemo(
    () => products.filter((p) => p.status !== "pending_validation"),
    [products],
  );

  const visibleValidated = showAll
    ? validated
    : validated.filter((p) => Number(p.opportunity_score ?? 0) >= 70);

  // group validated by macro
  const groups = useMemo(() => {
    const map = new Map<string, { macro: Macro | null; items: LiveProduct[] }>();
    for (const p of visibleValidated) {
      const sub = subBySlug[p.sub_niche_slug];
      const macro = sub?.macro_id ? macroById[sub.macro_id] ?? null : null;
      const key = macro?.slug ?? "_uncat";
      if (!map.has(key)) map.set(key, { macro, items: [] });
      map.get(key)!.items.push(p);
    }
    return Array.from(map.values());
  }, [visibleValidated, subBySlug, macroById]);

  const allPendingSelected = pending.length > 0 && pending.slice(0, MAX_BATCH).every((p) => selectedIds.has(p.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_BATCH) next.add(id);
      else toast.warning(`Maximum ${MAX_BATCH} produits par lot`);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (allPendingSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(pending.slice(0, MAX_BATCH).map((p) => p.id)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Niché · Discovery v1"
        title="Dernières découvertes"
        description="L'IA génère 100 idées de produits high-ticket sans contrainte de niche. Vous validez ensuite manuellement les plus intéressantes via SerpApi."
        actions={
          <Button onClick={run} disabled={running} className="bg-success text-success-foreground hover:bg-success/90">
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {running ? "Génération en cours…" : "Lancer une découverte"}
          </Button>
        }
      />

      <p className="text-xs text-muted-foreground -mt-3">
        L'IA va générer 100 idées sans appel marché. Vous validerez ensuite manuellement celles qui vous intéressent
        (chaque validation = ~0.01€ SerpApi).
      </p>

      {(newMacros.length > 0 || newSubs.length > 0) && (
        <section className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Nouvelles niches découvertes (7 derniers jours)
          </h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {newMacros.map((m) => (
              <span key={m.id} className="px-2 py-1 rounded border border-primary/40 bg-background font-medium">
                Macro · {m.name}
              </span>
            ))}
            {newSubs.map((s) => (
              <span key={s.id} className="px-2 py-1 rounded border border-border bg-background">
                Sous-niche · {s.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* SECTION A — Idées à valider */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      ) : pending.length > 0 ? (
        <section className="space-y-3">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold">
                {pending.length} idée{pending.length > 1 ? "s" : ""} à valider
              </h2>
              <label className="text-xs flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={toggleSelectAll}
                  className="accent-primary"
                />
                Tout sélectionner {pending.length > MAX_BATCH ? `(${MAX_BATCH} max)` : ""}
              </label>
            </div>
            <Button
              size="sm"
              onClick={() => validate(Array.from(selectedIds))}
              disabled={validating || selectedIds.size === 0}
            >
              {validating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
              Valider la sélection ({selectedIds.size})
            </Button>
          </div>

          <div className="rounded-xl border border-border divide-y divide-border bg-gradient-card overflow-hidden">
            {pending.map((p) => {
              const sub = subBySlug[p.sub_niche_slug];
              const macro = sub?.macro_id ? macroById[sub.macro_id] : null;
              const checked = selectedIds.has(p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelect(p.id)}
                    className="accent-primary shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm truncate">{p.name}</span>
                      {p.angle && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground uppercase tracking-wider">
                          {p.angle}
                        </span>
                      )}
                      <span className="text-xs font-mono text-muted-foreground">
                        Prix estimé: {Math.round(p.sell_price_estimate)}€
                      </span>
                    </div>
                    {p.why && (
                      <p className="text-xs italic text-muted-foreground truncate">{p.why}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {macro && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/5 text-primary">
                          {macro.name}
                        </span>
                      )}
                      {sub && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-background text-muted-foreground">
                          {sub.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={validating}
                    onClick={() => validate([p.id])}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Valider marché
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* SECTION B — Produits validés */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold">
            Produits validés
            <span className="ml-2 text-xs font-mono text-muted-foreground">
              {visibleValidated.length} affichés · {validated.length} au total
            </span>
          </h2>
          <label className="text-xs flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="accent-primary"
            />
            Afficher tous (incl. score &lt; 70)
          </label>
        </div>

        {loading ? null : visibleValidated.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-gradient-card p-10 text-center text-sm text-muted-foreground">
            {validated.length === 0
              ? "Aucun produit validé pour le moment — validez des idées ci-dessus."
              : "Aucun produit validé avec un score ≥ 70 — cochez « Afficher tous »."}
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(({ macro, items }) => (
              <section key={macro?.slug ?? "_uncat"} className="space-y-3">
                <h3 className="text-sm font-semibold flex items-baseline gap-2">
                  <span>{macro?.name ?? "Non classé"}</span>
                  <span className="text-xs font-mono text-muted-foreground">— {items.length} produits</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      subName={subBySlug[p.sub_niche_slug]?.name ?? p.sub_niche_slug}
                      inShortlist={has(p.id)}
                      onToggle={() => toggle(p.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProductCard({
  product: p, subName, inShortlist, onToggle,
}: {
  product: LiveProduct; subName: string; inShortlist: boolean; onToggle: () => void;
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
        <ScorePill score={Math.round(Number(p.opportunity_score ?? 0))} />
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
            <span className="font-mono">{Math.round(Number(p.serp_weakness_score))}</span>
          </div>
          <Progress value={Number(p.serp_weakness_score)} className="h-1.5" />
        </div>
      )}

      {p.verdict && (
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] px-2 py-0.5 rounded border font-medium", verdictClass)}>{p.verdict}</span>
        </div>
      )}

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
            competitors: Array.isArray(p.competitors) ? p.competitors : [],
          }}
        />
      </div>
    </div>
  );
}
