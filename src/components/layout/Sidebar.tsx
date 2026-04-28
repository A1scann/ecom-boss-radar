import { LayoutDashboard, Radar, Package, Target, Sparkles, Eye, Bookmark } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/niches", label: "Niche Radar", icon: Radar },
  { to: "/products", label: "Product Finder", icon: Package },
  { to: "/scoring", label: "Scoring Engine", icon: Target },
  { to: "/angles", label: "Offer Angles", icon: Sparkles },
  { to: "/spy", label: "Competitor Spy", icon: Eye },
  { to: "/shortlist", label: "Shortlist", icon: Bookmark },
];

export const Sidebar = () => {
  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <span className="font-bold text-primary-foreground text-sm">E</span>
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">EcomBoss</div>
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Intelligence Engine</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
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
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <div className="rounded-lg p-3 bg-gradient-card border border-border">
          <div className="text-xs font-semibold mb-1">Méthode ECOM BOSS</div>
          <div className="text-[11px] text-muted-foreground leading-relaxed">High-ticket FR · Google Ads · Intent-driven research</div>
        </div>
      </div>
    </aside>
  );
};
