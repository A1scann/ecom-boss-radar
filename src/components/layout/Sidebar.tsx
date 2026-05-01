import { useEffect, useState } from "react";
import { LayoutDashboard, Radar, Package, Target, Sparkles, Eye, Bookmark, Zap, Globe } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { to: "/", label: "🔍 Découvrir des niches", icon: Globe },
  { to: "/insights", label: "📊 Tableau de bord", icon: LayoutDashboard },
  { to: "/niches", label: "📡 Radar de niches", icon: Radar },
  { to: "/live", label: "⚡ Signaux live", icon: Zap, dynamic: true as const },
  { to: "/products", label: "🎯 Trouver des produits", icon: Package },
  { to: "/scoring", label: "⚖️ Scoring produit", icon: Target },
  { to: "/angles", label: "💡 Angles marketing", icon: Sparkles },
  { to: "/spy", label: "🕵️ Analyse concurrents", icon: Eye },
  { to: "/shortlist", label: "⭐ Ma sélection", icon: Bookmark },
];

const formatLastSignal = (iso: string | null): { text: string; tone: "ok" | "warn" } => {
  if (!iso) return { text: "—", tone: "warn" };
  const ms = Date.now() - new Date(iso).getTime();
  const hours = ms / 3_600_000;
  if (hours < 1) return { text: "< 1h", tone: "ok" };
  if (hours < 24) return { text: `${Math.floor(hours)}h`, tone: "ok" };
  const days = Math.floor(hours / 24);
  return { text: `${days}j`, tone: "warn" };
};

export const Sidebar = () => {
  const [lastSignal, setLastSignal] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("sub_niches_live")
      .select("last_signal_at")
      .order("last_signal_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLastSignal(data?.last_signal_at ?? null);
      });
    return () => { cancelled = true; };
  }, []);

  const signal = formatLastSignal(lastSignal);

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <span className="font-bold text-primary-foreground text-sm">N</span>
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">Niché</div>
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Market Intelligence</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ to, label, icon: Icon, dynamic }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )
            }
          >
            <Icon className="w-4 h-4" />
            <span className="flex-1">{label}</span>
            {dynamic && (
              <span
                className={cn(
                  "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border",
                  signal.tone === "ok"
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-warning/15 text-warning border-warning/30"
                )}
                title={lastSignal ? `Dernier signal: ${new Date(lastSignal).toLocaleString("fr-FR")}` : "Aucun signal"}
              >
                {signal.text}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <div className="rounded-lg p-3 bg-gradient-card border border-border">
          <div className="text-xs font-semibold mb-1">Niché</div>
          <div className="text-[11px] text-muted-foreground leading-relaxed">High-ticket FR · Google Ads · Market Intelligence</div>
        </div>
      </div>
    </aside>
  );
};
