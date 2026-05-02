// Niche-wide product discovery — broad SerpApi sweep, fuzzy dedupe,
// keyword-based sub-niche classification, and bulk persist into products_live.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { z } from "https://esm.sh/zod@3.23.8";
import { admin, shoppingSerp } from "../_shared/serpapi.ts";

const Body = z.object({
  nicheSlug: z.string().min(1).max(160),
});

const STOPWORDS = new Set([
  "le", "la", "les", "de", "des", "du", "un", "une", "et", "en", "pour", "par",
  "avec", "sans", "sur", "sous", "dans", "aux", "ses", "son", "sa", "leur",
  "the", "and", "for", "with", "from", "into", "your", "our",
  "produit", "produits",
]);

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function verdictOf(score: number) {
  if (score >= 80) return "Prioritaire";
  if (score >= 70) return "À tester";
  return "Rejeter";
}

type Sub = { id: string; slug: string; name: string; description: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { nicheSlug } = parsed.data;

    // 1. Load niche
    const { data: niche } = await admin
      .from("niches")
      .select("id, name")
      .eq("slug", nicheSlug)
      .maybeSingle();
    if (!niche) return json({ error: "niche_not_found" }, 404);

    // 2. Load sub-niches
    const { data: subRows } = await admin
      .from("sub_niches")
      .select("id, slug, name, description")
      .eq("niche_id", niche.id);
    const subs = (subRows ?? []) as Sub[];
    if (!subs.length) return json({ error: "no_sub_niches", niche: niche.name }, 400);

    // 3. Build queries (max 5)
    const queries: string[] = [`${niche.name} produit high ticket france`];
    for (const s of subs.slice(0, 4)) queries.push(`${s.name} acheter prix`);

    // Lookup sub_niches_live ids by slug for sub_niche_id population
    const { data: liveSubs } = await admin
      .from("sub_niches_live")
      .select("id, slug")
      .in("slug", subs.map((s) => s.slug));
    const liveIdBySlug = new Map((liveSubs ?? []).map((r: any) => [r.slug, r.id]));

    // Pre-compute classification token bags per sub-niche
    const subTokens = subs.map((s) => ({
      sub: s,
      bag: new Set(tokens(`${s.name} ${s.description ?? ""}`)),
    }));

    type Cand = {
      title: string;
      titleTokens: Set<string>;
      price: number;
      source: string;
      thumbnail: string | null;
      link: string | null;
      seedQuery: string;
    };

    // 4. Run queries + collect
    const allCandidates: Cand[] = [];
    let amazonInTopByQuery: boolean[] = [];
    let totalAdvertisers = 0;

    for (const q of queries) {
      try {
        const data = await shoppingSerp(q);
        const results: any[] = data?.shopping_results ?? [];
        totalAdvertisers += results.length;
        const top5 = results.slice(0, 5);
        const hasAmazon = top5.some((r) => {
          const src = String(r?.source ?? "").toLowerCase();
          const link = String(r?.product_link ?? r?.link ?? "").toLowerCase();
          return src.includes("amazon") || link.includes("amazon.");
        });
        amazonInTopByQuery.push(hasAmazon);

        for (const item of results) {
          const rawTitle = item?.title;
          const price = Number(item?.extracted_price);
          if (!rawTitle || !Number.isFinite(price) || price <= 0) continue;
          const title = String(rawTitle).replace(/\s+/g, " ").trim();
          allCandidates.push({
            title,
            titleTokens: new Set(tokens(title)),
            price,
            source: String(item?.source ?? "").toLowerCase(),
            thumbnail: item?.thumbnail ?? null,
            link: item?.product_link ?? item?.link ?? null,
            seedQuery: q,
          });
        }
      } catch (e) {
        console.error("shoppingSerp error", q, e);
        amazonInTopByQuery.push(false);
      }
    }

    // 5. Fuzzy dedupe by title (Jaccard > 0.8)
    const kept: Cand[] = [];
    for (const c of allCandidates) {
      const dup = kept.find((k) => jaccard(k.titleTokens, c.titleTokens) > 0.8);
      if (!dup) kept.push(c);
      // else: skip (keep first occurrence which had its query's signal already)
    }

    // Aggregate flags for scoring
    const noAmazonAcrossAllTops = amazonInTopByQuery.length > 0 && amazonInTopByQuery.every((v) => !v);
    const fewAdvertisers = totalAdvertisers < 5;

    // 6 + 7. Classify + score
    type Persisted = {
      name: string;
      sub_niche_slug: string;
      sub_niche_id: string | null;
      niche_slug: string;
      buy_price_estimate: number;
      sell_price_estimate: number;
      margin_potential: number;
      opportunity_score: number;
      verdict: string;
      seed_keyword: string;
      data_source: string;
      last_signal_at: string;
      source_url: string | null;
      thumbnail: string | null;
    };

    const fallbackSub = subs[0];
    const rows: Persisted[] = kept.map((c) => {
      // classify
      let bestSub: Sub = fallbackSub;
      let bestScore = 0;
      let bestNameLen = 0;
      for (const { sub, bag } of subTokens) {
        let hits = 0;
        for (const t of bag) if (c.titleTokens.has(t)) hits++;
        if (hits > bestScore || (hits === bestScore && hits > 0 && sub.name.length > bestNameLen)) {
          bestScore = hits;
          bestSub = sub;
          bestNameLen = sub.name.length;
        }
      }

      // score
      const price = c.price;
      const margin = Math.round(price * 0.35);
      let score = 60;
      if (price > 200) score += 10;
      if (margin > 150) score += 10;
      if (noAmazonAcrossAllTops) score += 10;
      if (fewAdvertisers) score += 10;

      return {
        name: c.title,
        sub_niche_slug: bestSub.slug,
        sub_niche_id: liveIdBySlug.get(bestSub.slug) ?? null,
        niche_slug: nicheSlug,
        buy_price_estimate: Math.round(price * 0.4),
        sell_price_estimate: Math.round(price),
        margin_potential: margin,
        opportunity_score: score,
        verdict: verdictOf(score),
        seed_keyword: c.seedQuery,
        data_source: "serpapi",
        last_signal_at: new Date().toISOString(),
        source_url: c.link,
        thumbnail: c.thumbnail,
      };
    });

    // 8. Persist
    let persisted = 0;
    if (rows.length) {
      const { error } = await admin
        .from("products_live")
        .upsert(rows, { onConflict: "name,sub_niche_slug" as any, ignoreDuplicates: false });
      if (error) {
        console.error("upsert error", error);
        return json({ error: "persist_failed", message: error.message }, 500);
      }
      persisted = rows.length;
    }

    const bySubNiche: Record<string, number> = {};
    for (const r of rows) bySubNiche[r.sub_niche_slug] = (bySubNiche[r.sub_niche_slug] ?? 0) + 1;

    return json({ niche: niche.name, total: persisted, bySubNiche });
  } catch (e) {
    console.error("niche-search error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
