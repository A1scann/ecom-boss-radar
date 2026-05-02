import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { PageHeader } from "@/components/ui-custom/Premium";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";

type Macro = { id: string; slug: string; name: string; icon: string | null; description: string | null };
type Niche = { id: string; slug: string; name: string; description: string | null; sub_count?: number };

export default function MacroDetail() {
  const { slug } = useParams();
  const [macro, setMacro] = useState<Macro | null | undefined>(undefined);
  const [niches, setNiches] = useState<Niche[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      const { data: m } = await supabase
        .from("macro_niches")
        .select("id, slug, name, icon, description")
        .eq("slug", slug)
        .maybeSingle();
      if (!m) { if (!cancelled) setMacro(null); return; }
      const { data: ns } = await supabase
        .from("niches")
        .select("id, slug, name, description")
        .eq("macro_id", m.id)
        .order("name");
      const nicheIds = (ns ?? []).map((n: any) => n.id);
      const { data: subs } = nicheIds.length
        ? await supabase.from("sub_niches").select("niche_id").in("niche_id", nicheIds)
        : { data: [] as any[] };
      const counts = new Map<string, number>();
      (subs ?? []).forEach((s: any) => counts.set(s.niche_id, (counts.get(s.niche_id) ?? 0) + 1));
      if (!cancelled) {
        setMacro(m as Macro);
        setNiches((ns ?? []).map((n: any) => ({ ...n, sub_count: counts.get(n.id) ?? 0 })));
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (macro === undefined) return <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>;
  if (macro === null) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Link to="/" className="hover:text-foreground">Accueil</Link>
        <span>/</span>
        <span className="text-foreground">{macro.name}</span>
      </div>
      <PageHeader
        eyebrow={`${macro.icon ?? "🌐"} Macro-niche`}
        title={macro.name}
        description={macro.description ?? `Explore les ${niches.length} niches de ${macro.name}.`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {niches.map((n) => (
          <Link
            key={n.id}
            to={`/niche/${n.slug}`}
            className="group rounded-xl border border-border bg-gradient-card p-5 shadow-card-premium hover:border-primary/40 hover:shadow-elegant transition-all flex flex-col"
          >
            <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">{n.name}</h3>
            {n.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{n.description}</p>}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="font-mono text-muted-foreground">{n.sub_count} sous-niche{(n.sub_count ?? 0) > 1 ? "s" : ""}</span>
              <span className="text-primary flex items-center gap-1 font-medium">Explorer <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></span>
            </div>
          </Link>
        ))}
        {niches.length === 0 && <div className="text-sm text-muted-foreground">Aucune niche pour cette macro.</div>}
      </div>
    </div>
  );
}
