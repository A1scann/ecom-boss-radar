// Niche Expand Engine — AI-powered recursive opportunity discovery.
// Modes:
//  - adjacent:   given a parent niche, generate N adjacent sub-niches
//  - hidden:     find under-exploited sub-niches in a parent's space
//  - whitespace: generate completely unexplored white-space niches in a macro
//  - micro:      drill from a sub-niche into micro-niches
// Persists results into sub_niches_live + opportunity_edges.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mode = "adjacent" | "hidden" | "whitespace" | "micro";

const PROMPTS: Record<Mode, (ctx: any) => string> = {
  adjacent: (c) => `Tu es un expert en recherche de niches dropshipping high-ticket pour le marché FRANÇAIS (méthode ECOM BOSS: demande existante + intent d'achat + opportunité Google Ads).

NICHE PARENTE: "${c.parentName}" (catégorie: ${c.macroName})

Génère ${c.n} sous-niches ADJACENTES haut de gamme (>200€), produits réels achetables sur Google Shopping FR.
- pas de gadgets TikTok
- vocabulaire d'achat français naturel
- diversifier les angles (matériaux, usages, niveaux d'expertise)`,

  hidden: (c) => `Tu es un expert ECOM BOSS (dropshipping high-ticket FR via Google Ads).

NICHE PARENTE: "${c.parentName}" (${c.macroName})

Génère ${c.n} sous-niches CACHÉES / sous-exploitées dans cet espace:
- demande réelle FR mais peu d'annonceurs Google
- micro-segments négligés (cas d'usage spécifiques, profils précis)
- marges >30%, panier >250€
- évite l'évident, va dans les angles morts`,

  whitespace: (c) => `Tu es un expert ECOM BOSS détectant les WHITE SPACES sur le marché FR.

CATÉGORIE MACRO: "${c.macroName}"

Génère ${c.n} opportunités WHITE SPACE — sous-niches qu'aucun gros acteur français ne couvre bien:
- demande émergente non saturée
- problèmes spécifiques sans solution dominante
- intersections inattendues (ex: solaire × van, senior × design)
- haut potentiel high-ticket`,

  micro: (c) => `Tu es un expert ECOM BOSS.

SOUS-NICHE PARENTE: "${c.parentName}" (${c.macroName})

Génère ${c.n} MICRO-NICHES (variantes ultra-spécifiques) à l'intérieur:
- segments de prix, taille, usage, public
- chacune doit être un keyword Google FR avec intent d'achat clair`,
};

async function expandWithAI(mode: Mode, ctx: any): Promise<any[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Tu génères des sous-niches dropshipping high-ticket FR. Réponse en JSON uniquement via l'outil." },
        { role: "user", content: PROMPTS[mode](ctx) },
      ],
      tools: [{
        type: "function",
        function: {
          name: "emit_niches",
          description: "Emit candidate sub-niches.",
          parameters: {
            type: "object",
            properties: {
              niches: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Nom court FR (keyword Google)" },
                    description: { type: "string", description: "1 phrase: angle + intent" },
                    growthHint: { type: "string", enum: ["high", "medium", "low"] },
                    competitionHint: { type: "string", enum: ["low", "medium", "high"] },
                    marginHint: { type: "string", enum: ["low", "medium", "high"] },
                  },
                  required: ["name", "description", "growthHint", "competitionHint", "marginHint"],
                  additionalProperties: false,
                },
              },
            },
            required: ["niches"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "emit_niches" } },
    }),
  });

  if (res.status === 429) throw new Error("Rate limit AI Gateway");
  if (res.status === 402) throw new Error("Crédits AI épuisés");
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No tool call in AI response");
  const parsed = typeof args === "string" ? JSON.parse(args) : args;
  return parsed.niches ?? [];
}

// Hash-based deterministic synthetic scoring (consistent across calls)
function hashNum(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h = (h ^ s.charCodeAt(i)) * 16777619; h >>>= 0; }
  return h;
}
function rng(seed: number) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

function scoreNiche(name: string, hints: { growthHint: string; competitionHint: string; marginHint: string }, mode: Mode) {
  const r = rng(hashNum(name));
  const growthBase = hints.growthHint === "high" ? 50 : hints.growthHint === "medium" ? 20 : 0;
  const compBase = hints.competitionHint === "low" ? 2 : hints.competitionHint === "medium" ? 5 : 10;
  const marginBase = hints.marginHint === "high" ? 450 : hints.marginHint === "medium" ? 250 : 120;

  const growth = Math.round(growthBase + r() * 30 - 10);
  const ad_density = Math.max(0, Math.round(compBase + r() * 4 - 2));
  const dominance = Math.round(20 + r() * 70);
  const weakness = Math.max(0, Math.min(100, 100 - dominance + Math.round(r() * 30 - 15)));
  const intent = Math.round(45 + r() * 50);
  const cpc = Math.round((0.2 + ad_density * 0.35 + (intent / 100) * 1.8) * 100) / 100;
  const margin = Math.round(marginBase + r() * 200 - 100);
  const dispersion = Math.round(20 + r() * 60);
  const series = Array.from({ length: 12 }, () => Math.round(40 + r() * 60));
  const opp = Math.max(0, Math.min(100, Math.round(growth * 0.25 + 60 * 0.15 + weakness * 0.25 + intent * 0.20 + (100 - dominance) * 0.15)));
  const hidden = Math.max(0, Math.min(100, Math.round(Math.max(0, growth) * 0.35 + Math.max(0, 100 - ad_density * 12) * 0.25 + weakness * 0.20 + (100 - dominance) * 0.20)));
  const alpha = Math.round(opp * 0.5 + hidden * 0.3 + Math.min(100, dispersion + margin / 6) * 0.2);

  let maturity = "Mature";
  if (mode === "whitespace") maturity = "White Space";
  else if (growth > 25 && ad_density < 4) maturity = "Emerging";
  else if (growth > 10 && ad_density < 6) maturity = "Growth";
  else if (ad_density >= 6 && dominance >= 50) maturity = "Saturated";

  return {
    search_demand: series[series.length - 1] * Math.round(80 + r() * 320),
    demand_growth_90d: growth,
    demand_acceleration: Math.round(r() * 30 - 10),
    trend_series: series,
    seasonality: Math.round(10 + r() * 60),
    competition_shift: ad_density - 5,
    advertiser_density: ad_density,
    shopping_advertiser_count: Math.round(r() * 8),
    marketplace_dominance_score: dominance,
    serp_weakness_score: weakness,
    cpc, margin_potential: margin, price_dispersion: dispersion,
    opportunity_score: opp, alpha_score: alpha, hidden_opportunity_score: hidden,
    supplier_feasibility_score: Math.min(100, dispersion + Math.round(margin / 6)),
    breakeven_roas: 3.33, estimated_cpa: Math.round((cpc / 0.02) * 100) / 100,
    maturity,
    watchlist: growth > 25 && opp >= 65,
  };
}

function slugify(s: string, suffix: string) {
  return (s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 70) + "-" + suffix.slice(0, 6) + "-" + Math.random().toString(36).slice(2, 6));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const mode = (body.mode ?? "adjacent") as Mode;
    const n = Math.min(50, Math.max(5, body.n ?? 20));
    const parentId: string | null = body.parentId ?? null;
    const macroSlug: string | null = body.macroSlug ?? null;

    if (!["adjacent", "hidden", "whitespace", "micro"].includes(mode)) {
      return json({ error: "invalid mode" }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve context
    let parent: any = null;
    let macro: any = null;
    if (parentId) {
      const { data } = await admin.from("sub_niches_live").select("id,name,macro_id,depth").eq("id", parentId).maybeSingle();
      parent = data;
      if (parent?.macro_id) {
        const { data: m } = await admin.from("macro_niches_live").select("id,slug,name").eq("id", parent.macro_id).maybeSingle();
        macro = m;
      }
    }
    if (!macro && macroSlug) {
      const { data: m } = await admin.from("macro_niches_live").select("id,slug,name").eq("slug", macroSlug).maybeSingle();
      macro = m;
    }
    if (mode !== "whitespace" && !parent) return json({ error: "parentId required for this mode" }, 400);
    if (mode === "whitespace" && !macro) return json({ error: "macroSlug required for whitespace mode" }, 400);

    const candidates = await expandWithAI(mode, {
      n,
      parentName: parent?.name ?? "",
      macroName: macro?.name ?? "Marché FR high-ticket",
    });

    const depth = (parent?.depth ?? 0) + 1;
    const macro_id = macro?.id ?? parent?.macro_id ?? null;

    const PRODUCT_RE = /[0-9]|raboteuse|dégauchisseuse|amplificateur|thunderbolt|stairlift|aquarium|midi|graveur|trancheuse|déshydrateur|tondeuse|tapis de course|tapis roulant|arbre à chat|scie sur table|tablette|démonte|mécanicien|ventilateur toit|cnc bois|laser/i;
    const validCandidates = candidates.filter((c: any) => {
      const name = String(c?.name ?? "");
      return name.length <= 38 && !PRODUCT_RE.test(name);
    });
    const skipped = candidates.length - validCandidates.length;

    const rows = validCandidates.map((c: any) => {
      const scores = scoreNiche(c.name, c, mode);
      return {
        slug: slugify(c.name, mode),
        name: c.name,
        description: c.description,
        seed_keyword: c.name,
        macro_id,
        parent_id: parent?.id ?? null,
        depth,
        mode,
        discovery_mode: mode,
        is_seed: false,
        data_source: "ai-expand",
        last_signal_at: new Date().toISOString(),
        ...scores,
      };
    });

    if (rows.length === 0) {
      return json({ ok: true, mode, generated: 0, skipped, reason: "all_candidates_were_products" });
    }

    // Insert
    const { data: inserted, error } = await admin
      .from("sub_niches_live")
      .insert(rows)
      .select("id,name,parent_id");
    if (error) throw error;

    // Edges
    if (parent?.id && inserted?.length) {
      const edgeType = mode === "hidden" ? "hidden-branch" : mode === "micro" ? "micro" : "adjacent";
      const edges = inserted.map((r: any) => ({ source_id: parent.id, target_id: r.id, edge_type: edgeType }));
      await admin.from("opportunity_edges").insert(edges);
    }

    return json({ ok: true, mode, generated: inserted?.length ?? 0, niches: inserted });
  } catch (e) {
    console.error("niche-expand", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
