import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui-custom/Premium";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Macro = { id: string; slug: string; name: string; description: string | null; icon: string | null };
type Niche = { id: string; slug: string; name: string; description: string | null; macro_id: string | null };

export default function OpportunityUniverse() {
  const navigate = useNavigate();
  const [macros, setMacros] = useState<Macro[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: m }, { data: n }] = await Promise.all([
        supabase.from("macro_niches").select("id, slug, name, description, icon").order("name"),
        supabase.from("niches").select("id, slug, name, description, macro_id").order("name"),
      ]);
      if (cancelled) return;
      const ms = (m ?? []) as Macro[];
      setMacros(ms);
      setNiches((n ?? []) as Niche[]);
      const initial: Record<string, boolean> = {};
      ms.forEach((macro) => { initial[macro.id] = true; });
      setOpenMap(initial);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement des niches…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Niché · Market Intelligence"
        title="Découvrir des niches"
        description="Choisissez une niche et lancez une recherche produit."
      />

      <div className="space-y-3">
        {macros.map((macro) => {
          const inside = niches.filter((n) => n.macro_id === macro.id);
          const isOpen = openMap[macro.id] ?? true;
          return (
            <Collapsible
              key={macro.id}
              open={isOpen}
              onOpenChange={(o) => setOpenMap((s) => ({ ...s, [macro.id]: o }))}
            >
              <div className="rounded-xl border border-border bg-gradient-card shadow-card-premium overflow-hidden">
                <CollapsibleTrigger className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {macro.icon && <span className="text-xl">{macro.icon}</span>}
                    <div className="text-left min-w-0">
                      <div className="font-semibold text-sm truncate">{macro.name}</div>
                      {macro.description && (
                        <div className="text-[11px] text-muted-foreground truncate">{macro.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground border border-border px-2 py-0.5 rounded">
                      {inside.length} niches
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-border p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-background/30">
                    {inside.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic col-span-full px-2 py-3">
                        Aucune niche disponible pour le moment.
                      </div>
                    ) : (
                      inside.map((niche) => (
                        <div
                          key={niche.id}
                          className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-sm break-words">{niche.name}</div>
                            {niche.description && (
                              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{niche.description}</div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="w-full bg-success text-success-foreground hover:bg-success/90"
                            onClick={() => navigate(`/results/${niche.slug}`)}
                          >
                            <Search className="w-3.5 h-3.5 mr-1.5" />
                            Rechercher des produits →
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
