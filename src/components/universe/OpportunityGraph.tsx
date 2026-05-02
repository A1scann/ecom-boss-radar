import { useMemo, useRef } from "react";
import type { Opportunity, Edge } from "@/hooks/useOpportunities";
import { cn } from "@/lib/utils";
import { isValidNiche, MIN_OPPORTUNITY_SCORE } from "@/lib/nicheFilter";

type Props = {
  nodes: Opportunity[];
  edges: Edge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

// Lightweight radial graph: groups nodes by maturity ring, color by mode.
export function OpportunityGraph({ nodes, edges, selectedId, onSelect }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  const positions = useMemo(() => {
    const W = 600, H = 600, cx = W / 2, cy = H / 2;
    const filtered = nodes.filter((n) => n.opportunity_score >= MIN_OPPORTUNITY_SCORE && isValidNiche(n.name));
    const excluded = nodes.length - filtered.length;
    if (excluded > 0) console.log(`[NicheFilter] ${excluded} graph nodes excluded as products`);
    const sorted = [...filtered].sort((a, b) => b.opportunity_score - a.opportunity_score).slice(0, 80);
    const rings = [
      { min: 80, r: 90 },   // top
      { min: 65, r: 175 },
      { min: 50, r: 240 },
      { min: 0,  r: 285 },
    ];
    const buckets: Opportunity[][] = rings.map(() => []);
    sorted.forEach((n) => {
      const i = rings.findIndex((r) => n.opportunity_score >= r.min);
      buckets[i === -1 ? rings.length - 1 : i].push(n);
    });
    const map = new Map<string, { x: number; y: number; r: number }>();
    buckets.forEach((bucket, ring) => {
      const r = rings[ring].r;
      bucket.forEach((n, i) => {
        const angle = (i / Math.max(1, bucket.length)) * Math.PI * 2 - Math.PI / 2;
        const radius = 6 + Math.min(14, n.opportunity_score / 8);
        map.set(n.id, { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, r: radius });
      });
    });
    return { map, W, H, cx, cy, sorted };
  }, [nodes]);

  const visibleEdges = useMemo(() => edges.filter(
    (e) => positions.map.has(e.source_id) && positions.map.has(e.target_id)
  ), [edges, positions]);

  const colorFor = (n: Opportunity) => {
    if (n.discovery_mode === "hidden") return "hsl(var(--warning))";
    if (n.discovery_mode === "whitespace") return "hsl(var(--primary))";
    if (n.watchlist) return "hsl(var(--success))";
    return "hsl(var(--accent))";
  };

  return (
    <div className="relative w-full h-full bg-gradient-card rounded-xl border border-border overflow-hidden">
      <div className="absolute top-3 left-4 z-10 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Opportunity Graph</div>
      <div className="absolute top-3 right-4 z-10 flex gap-3 text-[10px] font-medium">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Watchlist</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Hidden</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> White space</span>
      </div>
      <svg ref={ref} viewBox={`0 0 ${positions.W} ${positions.H}`} className="w-full h-full">
        {/* concentric rings */}
        {[90, 175, 240, 285].map((r) => (
          <circle key={r} cx={positions.cx} cy={positions.cy} r={r} fill="none" stroke="hsl(var(--border))" strokeDasharray="2 4" opacity={0.4} />
        ))}
        {/* edges */}
        {visibleEdges.map((e, i) => {
          const a = positions.map.get(e.source_id)!;
          const b = positions.map.get(e.target_id)!;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="hsl(var(--primary))" strokeOpacity={0.25} strokeWidth={1} />;
        })}
        {/* nodes */}
        {positions.sorted.map((n) => {
          const p = positions.map.get(n.id)!;
          const sel = n.id === selectedId;
          return (
            <g key={n.id} onClick={() => onSelect(n.id)} className="cursor-pointer">
              <circle cx={p.x} cy={p.y} r={p.r + (sel ? 4 : 0)} fill={colorFor(n)} fillOpacity={sel ? 0.95 : 0.65} stroke={sel ? "hsl(var(--foreground))" : "transparent"} strokeWidth={2} />
              {sel && (
                <text x={p.x} y={p.y - p.r - 6} textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))" className="font-semibold pointer-events-none">{n.name.slice(0, 28)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-3 left-4 right-4 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>{positions.sorted.length} nœuds affichés · {visibleEdges.length} liens</span>
        <span className="font-mono">centre = score le plus élevé</span>
      </div>
    </div>
  );
}
