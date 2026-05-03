// REQUIRES: SERPAPI_KEY (already configured)
// Triggered manually per-product or per-batch from the Discoveries page.
// Validates 1-50 already-discovered (pending_validation) products via SerpApi and scores them.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { z } from "https://esm.sh/zod@3.23.8";
import { admin, googleSerp, shoppingSerp } from "../_shared/serpapi.ts";

const Body = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(50),
});

const MARKETPLACE_DOMAINS = [
  "amazon.fr", "amazon.com", "cdiscount.com",
  "leroymerlin.fr", "fnac.com", "darty.com",
];

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function computeSignals(serpData: any, shoppingData: any, fallbackPrice: number) {
  const ads: any[] = [
    ...(serpData?.ads ?? []),
    ...(serpData?.shopping_ads ?? []),
    ...(serpData?.shopping_results ?? []),
  ];
  const adDensity = ads.length;
  const organic: any[] = serpData?.organic_results ?? [];
  const organicCount = organic.length;
  const searchDemand = Math.max(0, Math.min(100, organicCount * 5 + adDensity * 4));
  const cpcEstimate = Math.round(adDensity * 0.8 * 100) / 100;
  const competitionLevel = adDensity > 8 ? "High" : adDensity > 4 ? "Medium" : "Low";

  let mpHits = 0;
  for (const r of organic) {
    const link = String(r?.link ?? r?.displayed_link ?? "").toLowerCase();
    if (MARKETPLACE_DOMAINS.some((d) => link.includes(d))) mpHits++;
  }
  const marketplaceDominance = organicCount > 0 ? Math.round((mpHits / organicCount) * 100) : 0;

  let weakness = 100;
  if (organicCount > 0) {
    const avgSnippet = organic.reduce((acc, r) => acc + String(r?.snippet ?? "").length, 0) / organicCount;
    weakness -= Math.min(40, avgSnippet / 5);
  }
  if (serpData?.knowledge_graph) weakness -= 15;
  if ((serpData?.related_questions?.length ?? 0) > 3) weakness -= 10;
  weakness -= Math.min(20, marketplaceDominance / 5);
  const serpWeakness = Math.max(0, Math.min(100, Math.round(weakness)));

  const prices: number[] = (shoppingData?.shopping_results ?? [])
    .map((r: any) => Number(r?.extracted_price))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  const realPriceFR = prices.length ? median(prices) : fallbackPrice;
  const marginPotential = Math.round(realPriceFR * 0.35);

  console.log('[validate-product] computed signals:', { adDensity, searchDemand, cpcEstimate, competitionLevel, marketplaceDominance, serpWeakness, realPriceFR, marginPotential });
  return { adDensity, searchDemand, cpcEstimate, competitionLevel, marketplaceDominance, serpWeakness, realPriceFR, marginPotential };
}

function scoreProduct(s: ReturnType<typeof computeSignals>) {
  let score = 0;
  if (s.realPriceFR > 200) score += 20;
  if (s.marginPotential > 150) score += 20;
  if (s.serpWeakness > 50) score += 20;
  if (s.marketplaceDominance < 50) score += 20;
  if (s.cpcEstimate > 0.5) score += 20;
  return score;
}

function verdictOf(score: number) {
  if (score >= 80) return "Prioritaire";
  if (score >= 70) return "À tester";
  return "Rejeter";
}

type ProductRow = {
  id: string;
  name: string;
  seed_keyword: string | null;
  sell_price_estimate: number | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "BAD_REQUEST", message: parsed.error.message }, 400);
    const { productIds } = parsed.data;

    // STEP 1 — load products
    const { data: rows, error: loadErr } = await admin
      .from("products_live")
      .select("id, name, seed_keyword, sell_price_estimate")
      .in("id", productIds)
      .eq("data_source", "discovery_v1");

    if (loadErr) return json({ error: "LOAD_FAILED", message: loadErr.message }, 500);
    const products = (rows ?? []) as ProductRow[];
    if (!products.length) {
      return json({ error: "NO_PRODUCTS_FOUND", message: "Aucun produit discovery_v1 correspondant." }, 400);
    }

    // STEP 2 — chunked SerpApi validation
    type Validated = {
      product: ProductRow;
      serpData: any;
      shoppingData: any;
      error: string | null;
    };
    const validated: Validated[] = [];
    const CHUNK = 10;
    for (let i = 0; i < products.length; i += CHUNK) {
      const chunk = products.slice(i, i + CHUNK);
      const results = await Promise.all(chunk.map(async (product) => {
        try {
          const kw = product.seed_keyword || product.name;
          const [serpData, shoppingData] = await Promise.all([
            googleSerp(kw),
            shoppingSerp(kw),
          ]);
          console.log('[validate-product] googleSerp response keys:', Object.keys(serpData || {}));
          console.log('[validate-product] googleSerp ads count:', serpData?.ads?.length, 'shopping_ads count:', serpData?.shopping_ads?.length, 'organic count:', serpData?.organic_results?.length);
          console.log('[validate-product] googleSerp first 3 ads sample:', JSON.stringify(serpData?.ads?.slice(0, 3) || []));
          console.log('[validate-product] googleSerp first 3 organic domains:', (serpData?.organic_results || []).slice(0, 3).map((r: any) => r.link || r.displayed_link));
          console.log('[validate-product] shoppingSerp response keys:', Object.keys(shoppingData || {}));
          console.log('[validate-product] shoppingSerp shopping_results count:', shoppingData?.shopping_results?.length);
          console.log('[validate-product] shoppingSerp first 3 prices:', (shoppingData?.shopping_results || []).slice(0, 3).map((r: any) => r.extracted_price));
          return { product, serpData, shoppingData, error: null } as Validated;
        } catch (e) {
          console.warn("[validate-product] serpapi failed for", product.name, (e as Error).message);
          return { product, serpData: null, shoppingData: null, error: (e as Error).message } as Validated;
        }
      }));
      validated.push(...results);
    }

    // STEP 3-5 — compute signals, score, update
    let errorCount = 0;
    const results: { id: string; name: string; score: number; verdict: string }[] = [];

    for (const v of validated) {
      if (v.error || !v.serpData || !v.shoppingData) {
        errorCount++;
        continue;
      }
      const fallback = Number(v.product.sell_price_estimate) || 0;
      const signals = computeSignals(v.serpData, v.shoppingData, fallback);
      const score = scoreProduct(signals);
      const verdict = verdictOf(score);

      const { error: updErr } = await admin
        .from("products_live")
        .update({
          sell_price_estimate: Math.round(signals.realPriceFR),
          buy_price_estimate: Math.round(signals.realPriceFR * 0.4),
          margin_potential: signals.marginPotential,
          opportunity_score: score,
          verdict,
          cpc: signals.cpcEstimate,
          search_volume: signals.searchDemand,
          competition_level: signals.competitionLevel,
          serp_weakness_score: signals.serpWeakness,
          marketplace_dominance_score: signals.marketplaceDominance,
          status: "validated",
          last_signal_at: new Date().toISOString(),
        })
        .eq("id", v.product.id);

      if (updErr) {
        console.warn("[validate-product] update failed for", v.product.id, updErr.message);
        errorCount++;
        continue;
      }

      results.push({ id: v.product.id, name: v.product.name, score, verdict });
    }

    return json({ validated: results.length, errors: errorCount, results });
  } catch (e) {
    console.error("[validate-product] fatal", e);
    return json({ error: "UNKNOWN", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
