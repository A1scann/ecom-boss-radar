import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { Sparkles, TrendingUp, EyeOff, Zap, Loader2, Search } from "lucide-react";
import { PageHeader, ScorePill, StatCard } from "@/components/ui-custom/Premium";
import { OpportunityGraph } from "@/components/universe/OpportunityGraph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMacros, useOpportunities, useEdges, expandNiche, discoverNiche, defaultFilters, type Filters, type Mode, type ExpandMode } from "@/hooks/useOpportunities";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MATURITIES = ["Emerging", "Growth", "Mature", "Saturated", "White Space"];

export default function OpportunityUniverse() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const { data: macros } = useMacros();
  const { data: opportunities, loading, count, refresh } = useOpportunities(filters);
  const { edges, refresh: refreshEdges } = useEdges();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanding, setExpanding] = useState<ExpandMode | null>(null);
  const [seed, setSeed] = useState("");
  const [discovering, setDiscovering] = useState(false);

  const tableRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: opportunities.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  const stats = useMemo(() => {
    const watchlist = opportunities.filter((o) => o.watchlist).length;
    const hidden = opportunities.filter((o) => o.discovery_mode === "hidden" || o.hidden_opportunity_score >= 70).length;
    const emerging = opportunities.filter((o) => o.maturity === "Emerging" || o.maturity === "White Space").length;
    return { total: count, watchlist, hidden, emerging };
  }, [opportunities, count]);

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const runExpand = async (mode: ExpandMode) => {
    setExpanding(mode);
    try {
      const macroSlug = filters.macroId
        ? macros.find((m) => m.id === filters.macroId)?.slug
        : macros[Math.floor(Math.random() * Math.max(macros.length, 1))]?.slug;
      // For non-whitespace modes, use selection or fall back to a top opportunity in scope
      let parentId: string | undefined;
      if (mode !== "whitespace") {
        parentId = selectedId ?? opportunities[0]?.id;
        if (!parentId) {
          toast.error("Aucune niche disponible — lance d'abord une découverte.");
          return;
        }
      }
      const res = await expandNiche({ mode, macroSlug, parentId, n: 20 });
      toast.success(`+${res.generated} opportunités générées (${mode})`);
      await Promise.all([refresh(), refreshEdges()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'expansion");
    } finally {
      setExpanding(null);
    }
  };

  const runDiscover = async () => {
    const s = seed.trim();
    if (s.length < 2) { toast.error("Saisis un mot-clé seed (≥ 2 caractères)"); return; }
    setDiscovering(true);
    try {
      const macroSlug = filters.macroId ? macros.find((m) => m.id === filters.macroId)?.slug : undefined;
      const res = await discoverNiche({ seed: s, macroSlug });
      toast.success(`Niche découverte : ${res?.subNiche?.name ?? s}`);
      setSeed("");
      await Promise.all([refresh(), refreshEdges()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la découverte");
    } finally {
      setDiscovering(false);
    }
  };

  const macroName = (id: string | null) => macros.find((m) => m.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Opportunity Universe"
        title="Moteur de découverte infinie"
        description="Marché → Macro-niches → Sous-niches → Micro-niches. Explore l'arbre d'opportunités haut-ticket FR."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => runExpand("adjacent")} disabled={!!expanding}>
              {expanding === "adjacent" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span className="ml-1.5">+20 adjacentes</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => runExpand("hidden")} disabled={!!expanding}>
              {expanding === "hidden" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="ml-1.5">+20 cachées</span>
            </Button>
            <Button variant="default" size="sm" onClick={() => runExpand("whitespace")} disabled={!!expanding}>
              {expanding === "whitespace" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span className="ml-1.5">+20 white space</span>
            </Button>
          </div>
        }
      />

      {/* Seed discovery bar — calls niche-discover */}
      <div className="rounded-xl border border-primary/30 bg-gradient-radial p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Découverte live</span>
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Découvrir une nouvelle niche… (ex : pergola bioclimatique, vélo cargo électrique)"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runDiscover(); }}
            className="pl-9 h-10 bg-background/60"
            disabled={discovering}
          />
        </div>
        <Button onClick={runDiscover} disabled={discovering || seed.trim().length < 2} className="shrink-0">
          {discovering ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
          Analyser & scorer
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Opportunités totales" value={stats.total.toLocaleString("fr-FR")} hint={`${opportunities.length} affichées`} accent />
        <StatCard label="Watchlist FR" value={stats.watchlist} hint="momentum confirmé" />
        <StatCard label="Hidden gems" value={stats.hidden} hint="hidden score ≥ 70" />
        <StatCard label="Emerging / White space" value={stats.emerging} hint="à fort potentiel" />
      </div>

      {/* Mode tabs + filters */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <Tabs value={filters.mode} onValueChange={(v) => setFilter("mode", v as Mode)}>
            <TabsList>
              <TabsTrigger value="all">Tout</TabsTrigger>
              <TabsTrigger value="validated"><TrendingUp className="w-3 h-3 mr-1" />Validated Winners</TabsTrigger>
              <TabsTrigger value="hidden"><EyeOff className="w-3 h-3 mr-1" />Hidden Opportunities</TabsTrigger>
              <TabsTrigger value="whitespace"><Zap className="w-3 h-3 mr-1" />White Space</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher une niche…" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} className="pl-9 h-9" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Macro</label>
            <Select value={filters.macroId ?? "all"} onValueChange={(v) => setFilter("macroId", v === "all" ? null : v)}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes ({macros.length})</SelectItem>
                {macros.map((m) => <SelectItem key={m.id} value={m.id}>{m.icon} {m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Maturité</label>
            <Select value={filters.maturity ?? "any"} onValueChange={(v) => setFilter("maturity", v === "any" ? null : v)}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Toutes</SelectItem>
                {MATURITIES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Opportunity ≥ {filters.minOpportunity}</label>
            <Slider value={[filters.minOpportunity]} onValueChange={([v]) => setFilter("minOpportunity", v)} min={0} max={100} step={5} className="mt-3" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Marge ≥ {filters.minMargin}€</label>
            <Slider value={[filters.minMargin]} onValueChange={([v]) => setFilter("minMargin", v)} min={0} max={600} step={20} className="mt-3" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Concurrence ≤ {filters.maxCompetition}</label>
            <Slider value={[filters.maxCompetition]} onValueChange={([v]) => setFilter("maxCompetition", v)} min={0} max={12} step={1} className="mt-3" />
          </div>
        </div>
      </div>

      {/* Split view: graph left, virtualized table right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4 h-[640px]">
        <OpportunityGraph nodes={opportunities} edges={edges} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} />

        <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Opportunity Database · {opportunities.length}</div>
            <Button variant="ghost" size="sm" onClick={() => setFilters(defaultFilters)}>Reset</Button>
          </div>
          <div className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-2 px-4 py-2 text-[10px] font-mono uppercase text-muted-foreground border-b border-border bg-muted/30">
            <div>Niche</div><div className="text-right">Opp</div><div className="text-right">Hid</div><div className="text-right">Alpha</div><div className="text-right">€/CPA</div>
          </div>
          <div ref={tableRef} className="flex-1 overflow-auto">
            {loading && <div className="p-8 text-center text-sm text-muted-foreground">Chargement…</div>}
            {!loading && opportunities.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aucune opportunité. Essaie d'étendre via les boutons en haut.
              </div>
            )}
            <div style={{ height: virt.getTotalSize(), position: "relative" }}>
              {virt.getVirtualItems().map((vi) => {
                const o = opportunities[vi.index];
                const sel = o.id === selectedId;
                return (
                  <div
                    key={o.id}
                    onClick={() => { setSelectedId(o.id); navigate(`/niches/${o.id}`); }}
                    className={cn(
                      "grid grid-cols-[1fr_60px_60px_60px_60px] gap-2 px-4 items-center border-b border-border/60 cursor-pointer hover:bg-accent/30 transition-colors",
                      sel && "bg-primary/10"
                    )}
                    style={{ position: "absolute", top: 0, left: 0, right: 0, height: vi.size, transform: `translateY(${vi.start}px)` }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{o.name}</div>
                      <div className="text-[10px] text-muted-foreground flex gap-2 mt-0.5">
                        <span>{macroName(o.macro_id)}</span>
                        <span>· {o.maturity}</span>
                        {o.watchlist && <span className="text-success">· watch</span>}
                        {o.discovery_mode === "hidden" && <span className="text-warning">· hidden</span>}
                        {o.discovery_mode === "whitespace" && <span className="text-primary">· white</span>}
                      </div>
                    </div>
                    <div className="text-right"><ScorePill score={o.opportunity_score} /></div>
                    <div className="text-right text-xs font-mono">{o.hidden_opportunity_score}</div>
                    <div className="text-right text-xs font-mono">{o.alpha_score}</div>
                    <div className="text-right text-xs font-mono text-muted-foreground">{o.estimated_cpa ?? "–"}€</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border-t border-border p-3 flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => runExpand("adjacent")} disabled={!selectedId || !!expanding}>
              {expanding === "adjacent" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              + Étendre la sélection
            </Button>
            <Button variant="default" size="sm" onClick={() => runExpand("whitespace")} disabled={!!expanding}>
              {expanding === "whitespace" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              + Charger 20 nouvelles
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
