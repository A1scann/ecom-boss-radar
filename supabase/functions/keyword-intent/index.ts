// Keyword Intent Miner — autocomplete + related + PAA → buyer-intent keywords
import { corsHeaders } from "@supabase/supabase-js/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import { autocomplete, trendsRelated, googleSerp } from "../_shared/serpapi.ts";
import { commercialIntent } from "../_shared/scoring.ts";

const Body = z.object({ seed: z.string().min(2).max(120) });

const COMMERCIAL_RE = /(acheter|prix|meilleur|comparatif|avis|pas cher|promo|soldes|boutique|livraison|code promo)/i;

function classifyIntent(kw: string): "transactional" | "commercial" | "informational" {
  if (/(acheter|prix|pas cher|promo|soldes|livraison|boutique)/i.test(kw)) return "transactional";
  if (/(meilleur|comparatif|avis|test|vs|top)/i.test(kw)) return "commercial";
  return "informational";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { seed } = parsed.data;

    const [ac, related, serp] = await Promise.all([
      autocomplete(seed),
      trendsRelated(seed),
      googleSerp(seed),
    ]);

    const paa = (serp?.related_questions ?? []).map((q: any) => q?.question).filter(Boolean);

    const all = [
      ...ac.map((q) => ({ kw: q, src: "autocomplete" })),
      ...(related.top ?? []).map((r: any) => ({ kw: r.query, src: "related" })),
      ...(related.rising ?? []).map((r: any) => ({ kw: r.query, src: "rising", rising: true })),
      ...paa.map((q: string) => ({ kw: q, src: "paa" })),
    ];

    const dedup = new Map<string, any>();
    for (const item of all) {
      if (!item.kw) continue;
      const key = item.kw.toLowerCase().trim();
      if (!dedup.has(key)) {
        dedup.set(key, {
          keyword: item.kw,
          source: item.src,
          rising: !!item.rising,
          intent: classifyIntent(item.kw),
          commercial: COMMERCIAL_RE.test(item.kw),
        });
      }
    }

    const keywords = Array.from(dedup.values());
    const buyerIntentScore = commercialIntent(keywords.map((k) => k.keyword));
    const buyers = keywords.filter((k) => k.commercial || k.intent === "transactional");

    return json({
      seed,
      total: keywords.length,
      buyerIntentScore,
      buyerKeywords: buyers,
      allKeywords: keywords,
    });
  } catch (e) {
    console.error("keyword-intent error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
