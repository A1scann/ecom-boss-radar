import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui-custom/Premium";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";

type Macro = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  niche_count?: number;
};

export default function OpportunityUniverse() {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: macrosData } = await supabase
        .from("macro_niches")
        .select("id, slug, name, description, icon")
        .order("name");
      const { data: nichesData } = await supabase
        .from("niches")
        .select("macro_id");

      const counts = new Map<string, number>();
      (nichesData ?? []).forEach((n: any) => {
        if (!n.macro_id) return;
        counts.set(n.macro_id, (counts.get(n.macro_id) ?? 0) + 1);
      });

      if (!cancelled) {
        setMacros(
          (macrosData ?? []).map((m: any) => ({
            ...m,
            niche_count: counts.get(m.id) ?? 0,
          }))
        );
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Découverte"
        title="Découvrir des niches"
        description="Explore les 10 macro-niches premium françaises. Clique sur une carte pour révéler les niches puis les sous-niches."
      />

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {macros.map((m) => (
            <Link
              key={m.id}
              to={`/macro/${m.slug}`}
              className="group rounded-xl border border-border bg-gradient-card p-5 shadow-card-premium hover:border-primary/40 hover:shadow-elegant transition-all flex flex-col"
            >
              <div className="text-3xl mb-2">{m.icon ?? "🌐"}</div>
              <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                {m.name}
              </h3>
              {m.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
              )}
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">
                  {m.niche_count} niche{(m.niche_count ?? 0) > 1 ? "s" : ""}
                </span>
                <span className="text-primary flex items-center gap-1 font-medium">
                  Explorer <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
