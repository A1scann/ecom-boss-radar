import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, ScorePill } from "@/components/ui-custom/Premium";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
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
};

const SEVEN_DAYS_AGO = () => new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

export default function Discoveries() {
  const { has, toggle } = useShortlist();
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [newMacros, setNewMacros] = useState<Macro[]>([]);
  const [newSubs, setNewSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = async () => {
    setLoading(true);
    const since = SEVEN_DAYS_AGO();
    const [{ data: p }, { data: m }, { data: s }, { data: nm }, { data: ns }] = await Promise.all([
      supabase
        .from("products_live")
        .select("id, name, sub_niche_slug, niche_slug, buy_price_estimate, sell_price_estimate, margin_potential, opportunity_score, verdict, competitors, source_url, cpc, search_volume, competition_level, serp_weakness_score, marketplace_dominance_score, why, angle")
        .eq("data_source", "discovery_v1")
        .order("opportunity_score", { ascending: false })
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
    toast.info("Découverte en cours… 60 à 120 s");
    try {
      const { data, error } = await supabase.functions.invoke("discovery-run", { body: {} });
      if (error) throw error;
      const scored = data?.scored ?? 0;
      const newCount = (data?.newMacroNiches?.length ?? 0) + (data?.newSubNiches?.length ?? 0);
      toast.success(`${scored} produits découverts, ${newCount} nouvelles niches`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de la découverte");
    } finally {
      setRunning(false);
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

  const visible = showAll ? products : products.filter((p) => p.opportunity_score >= 70);

  // group by macro
  const groups = useMemo(() => {
    const map = new Map<string, { macro: Macro | null; items: LiveProduct[] }>();
    for (const p of visible) {
      const sub = subBySlug[p.sub_niche_slug];
      const macro = sub?.macro_id ? macroById[sub.macro_id] ?? null : null;
      const key = macro?.slug ?? "_uncat";
      if (!map.has(key)) map.set(key, { macro, items: [] });
      map.get(key)!.items.push(p);
    }
    return Array.from(map.values());
  }, [visible, subBySlug, macroById]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Niché · Discovery v1"
        title="Dernières découvertes"
        description="L'IA génère des produits à fort potentiel sans contrainte de niche, valide via SerpApi et auto-classe en macro/sous-niches."
        actions={
          <Button onClick={run} disabled={running} className="bg-success text-success-foreground hover:bg-success/90">
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {running ? "Découverte en cours…" : "Lancer une découverte"}
          </Button>
        }
      />

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

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-muted-foreground font-mono">
          {visible.length} produits affichés · {products.length} au total
        </div>
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

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-gradient-card p-10 text-center text-sm text-muted-foreground">
          Aucune découverte pour le moment — clique sur "Lancer une découverte".
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ macro, items }) => (
            <section key={macro?.slug ?? "_uncat"} className="space-y-3">
              <h2 className="text-sm font-semibold flex items-baseline gap-2">
                <span>{macro?.name ?? "Non classé"}</span>
                <span className="text-xs font-mono text-muted-foreground">— {items.length} produits</span>
              </h2>
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
            competitors: Array.isArray(p.competitors) ? p.competitors : [],
          }}
        />
      </div>
    </div>
  );
}
