import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { PageHeader } from "@/components/ui-custom/Premium";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";

type Niche = { id: string; slug: string; name: string; description: string | null; macro_id: string | null };
type Macro = { id: string; slug: string; name: string; icon: string | null };
type Sub = { id: string; slug: string; name: string; description: string | null };

export default function NicheDetail() {
  const { slug } = useParams();
  const [niche, setNiche] = useState<Niche | null | undefined>(undefined);
  const [macro, setMacro] = useState<Macro | null>(null);
  const [subs, setSubs] = useState<Sub[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      const { data: n } = await supabase
        .from("niches")
        .select("id, slug, name, description, macro_id")
        .eq("slug", slug)
        .maybeSingle();
      if (!n) { if (!cancelled) setNiche(null); return; }
      const [{ data: m }, { data: ss }] = await Promise.all([
        n.macro_id
          ? supabase.from("macro_niches").select("id, slug, name, icon").eq("id", n.macro_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("sub_niches").select("id, slug, name, description").eq("niche_id", n.id).order("name"),
      ]);
      if (!cancelled) {
        setNiche(n as Niche);
        setMacro((m as Macro) ?? null);
        setSubs((ss ?? []) as Sub[]);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (niche === undefined) return <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>;
  if (niche === null) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
        <Link to="/" className="hover:text-foreground">Accueil</Link>
        <span>/</span>
        {macro && <>
          <Link to={`/macro/${macro.slug}`} className="hover:text-foreground">{macro.icon} {macro.name}</Link>
          <span>/</span>
        </>}
        <span className="text-foreground">{niche.name}</span>
      </div>
      <PageHeader
        eyebrow="Niche"
        title={niche.name}
        description={niche.description ?? `Explore les ${subs.length} sous-niches.`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subs.map((s) => (
          <Link
            key={s.id}
            to={`/sub-niche/${s.slug}`}
            className="group rounded-xl border border-border bg-gradient-card p-5 shadow-card-premium hover:border-primary/40 hover:shadow-elegant transition-all flex flex-col"
          >
            <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">{s.name}</h3>
            {s.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{s.description}</p>}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-end text-xs">
              <span className="text-primary flex items-center gap-1 font-medium">Explorer <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></span>
            </div>
          </Link>
        ))}
        {subs.length === 0 && <div className="text-sm text-muted-foreground">Aucune sous-niche disponible.</div>}
      </div>
    </div>
  );
}
