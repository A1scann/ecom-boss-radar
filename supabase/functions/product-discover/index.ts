// Product Discovery Engine — turn a sub-niche seed into a list of scored
// high-ticket product candidates (live SerpApi calls + EcomBoss scoring).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { z } from "https://esm.sh/zod@3.23.8";
import { admin, autocomplete, googleSerp, shoppingSerp } from "../_shared/serpapi.ts";

const Body = z.object({
  seed: z.string().min(2).max(120),
  subNicheSlug: z.string().min(1).max(120),
  persist: z.boolean().default(true),
});

const COMMERCIAL_TOKENS = [
  "acheter", "achat", "prix", "pas cher", "promo", "promotion", "soldes",
  "comparatif", "meilleur", "top", "avis", "test", "livraison", "boutique",
  "magasin", "occasion", "neuf", "discount",
];

const PHYSICAL_RETAILERS = [
  "leroymerlin", "castorama", "boulanger", "darty", "fnac", "ikea",
  "conforama", "but.fr", "carrefour", "auchan", "decathlon", "intersport",
  "leclerc", "monoprix", "truffaut", "jardiland",
];

const MARKETPLACES = [
  "amazon", "cdiscount", "ebay", "rakuten", "aliexpress", "wish",
  "manomano", "vinted", "leboncoin",
];

function clean(name: string) {
  return name
    .replace(/\s+/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .trim();
}

function dedupeKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").slice(0, 5).join(" ");
}

function median(arr: number[]) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function domain(url?: string) {
  if (!url) return "";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function verdictOf(score: number) {
  if (score >= 80) return "Prioritaire";
  if (score >= 65) return "À tester";
  return "Rejeter";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { seed, subNicheSlug, persist } = parsed.data;

    // 1. Parallel SerpApi calls
    const [shop, serpBuy, serpPrice, serpCheap, ac] = await Promise.all([
      shoppingSerp(seed),
      googleSerp(`acheter ${seed}`),
      googleSerp(`prix ${seed}`),
      googleSerp(`${seed} pas cher`),
      autocomplete(seed),
    ]);

    // 2. Extract products from Shopping
    const shoppingResults: any[] = shop?.shopping_results ?? [];
    const advertiserCount = shoppingResults.length;

    // Group by deduped name, keep best representative
    const grouped = new Map<string, {
      name: string;
      prices: number[];
      sources: string[];
      thumbnails: string[];
      links: string[];
    }>();

    for (const item of shoppingResults) {
      const rawName = item?.title;
      if (!rawName) continue;
      const name = clean(String(rawName));
      const key = dedupeKey(name);
      if (!key) continue;
      const price = Number(item?.extracted_price);
      const src = String(item?.source ?? domain(item?.product_link) ?? "").toLowerCase();
      const g = grouped.get(key) ?? { name, prices: [], sources: [], thumbnails: [], links: [] };
      if (Number.isFinite(price) && price > 0) g.prices.push(price);
      if (src) g.sources.push(src);
      if (item?.thumbnail) g.thumbnails.push(item.thumbnail);
      if (item?.product_link || item?.link) g.links.push(item.product_link ?? item.link);
      grouped.set(key, g);
    }

    // 3. Aggregate competitor stats
    const allDomains: Record<string, number> = {};
    for (const r of [...(serpBuy?.organic_results ?? []), ...(serpPrice?.organic_results ?? []), ...(serpCheap?.organic_results ?? [])]) {
      const d = domain(r?.link);
      if (d) allDomains[d] = (allDomains[d] ?? 0) + 1;
    }
    const topCompetitors = Object.entries(allDomains)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([d]) => d);

    const physicalPresence = topCompetitors.filter((d) => PHYSICAL_RETAILERS.some((p) => d.includes(p))).length;
    const marketplacePresence = topCompetitors.filter((d) => MARKETPLACES.some((m) => d.includes(m))).length;

    // 4. Buying intent: how many commercial tokens appear in autocomplete + SERP titles
    const corpus = [
      ...ac,
      ...((serpBuy?.organic_results ?? []) as any[]).map((r) => r?.title ?? ""),
      ...((serpPrice?.organic_results ?? []) as any[]).map((r) => r?.title ?? ""),
      ...((serpCheap?.organic_results ?? []) as any[]).map((r) => r?.title ?? ""),
    ].join(" ").toLowerCase();
    const intentHits = COMMERCIAL_TOKENS.filter((t) => corpus.includes(t)).length;
    const buyingIntent = clamp(Math.round((intentHits / COMMERCIAL_TOKENS.length) * 100 + Math.min(advertiserCount, 10) * 2));

    // 5. Score each candidate
    const candidates = Array.from(grouped.values())
      .filter((g) => g.prices.length > 0)
      .map((g) => {
        const med = median(g.prices);
        const min = Math.min(...g.prices);
        const max = Math.max(...g.prices);
        const marginPotential = Math.round(med * 0.35);

        // Competition: proportional to advertiser count + marketplace dominance
        const compFromAds = Math.min(advertiserCount * 4, 60);
        const compFromMarketplaces = Math.min(marketplacePresence * 10, 40);
        const competitionDifficulty = clamp(Math.round(compFromAds + compFromMarketplaces));

        // Offline scarcity: inverse of physical retailer presence
        const offlineScarcity = clamp(100 - physicalPresence * 20);

        // Composite opportunity score
        const opportunityScore = clamp(Math.round(
          buyingIntent * 0.30 +
          (100 - competitionDifficulty) * 0.25 +
          offlineScarcity * 0.20 +
          Math.min(marginPotential / 5, 100) * 0.25
        ));

        const verdict = verdictOf(opportunityScore);
        const competitorDomains = Array.from(new Set(g.sources.map((s) => s.replace(/^www\./, "")))).slice(0, 5);

        return {
          name: g.name,
          buy_price_estimate: Math.round(med * 0.45),
          sell_price_estimate: Math.round(med),
          median_price: med,
          min_price: min,
          max_price: max,
          margin_potential: marginPotential,
          opportunity_score: opportunityScore,
          buying_intent: buyingIntent,
          competition_difficulty: competitionDifficulty,
          offline_scarcity: offlineScarcity,
          advertiser_count: advertiserCount,
          verdict,
          competitors: competitorDomains.length ? competitorDomains : topCompetitors.slice(0, 5),
          thumbnail: g.thumbnails[0] ?? null,
          source_url: g.links[0] ?? null,
        };
      })
      .sort((a, b) => b.opportunity_score - a.opportunity_score)
      .slice(0, 30);

    // 6. Persist
    if (persist && candidates.length) {
      const { data: subNiche } = await admin
        .from("sub_niches_live").select("id").eq("slug", subNicheSlug).maybeSingle();

      const rows = candidates.map((c) => ({
        ...c,
        sub_niche_slug: subNicheSlug,
        sub_niche_id: subNiche?.id ?? null,
        data_source: "serpapi",
        last_signal_at: new Date().toISOString(),
      }));

      const { error } = await admin
        .from("products_live")
        .upsert(rows, { onConflict: "sub_niche_slug,name" as any, ignoreDuplicates: false });
      if (error) console.error("persist error", error);
    }

    return json({
      seed,
      subNicheSlug,
      advertiserCount,
      buyingIntent,
      topCompetitors,
      products: candidates,
      count: candidates.length,
    });
  } catch (e) {
    console.error("product-discover error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
