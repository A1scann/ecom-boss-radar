// Ad Arbitrage Detector — flag CPC vs margin opportunities
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { z } from "https://esm.sh/zod@3.23.8";
import { googleSerp, shoppingSerp } from "../_shared/serpapi.ts";
import * as S from "../_shared/scoring.ts";

const Body = z.object({
  seed: z.string().min(2).max(120),
  assumedMarginRate: z.number().min(0.05).max(0.8).default(0.3),
  cvr: z.number().min(0.005).max(0.2).default(0.02),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { seed, assumedMarginRate, cvr } = parsed.data;

    const [serp, shop] = await Promise.all([googleSerp(seed), shoppingSerp(seed)]);

    const adDensity = S.advertiserDensity(serp);
    const shoppingCount = shop?.shopping_results?.length ?? 0;
    const dominance = S.marketplaceDominance(serp);
    const dispersion = S.priceDispersion(shop);

    const prices = (shop?.shopping_results ?? [])
      .map((i: any) => Number(i?.extracted_price))
      .filter((n: number) => Number.isFinite(n) && n > 0)
      .sort((a: number, b: number) => a - b);
    const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
    const grossMargin = Math.round(median * assumedMarginRate);

    const cpc = S.cpcProxy(adDensity, 60); // assume mid commercial intent
    const breakevenRoas = S.breakevenRoas(assumedMarginRate);
    const estimatedCpa = S.estimatedCpa(cpc, cvr);
    const profitPerSale = grossMargin - estimatedCpa;
    const arbitrageScore = S.clamp(
      (profitPerSale > 0 ? Math.min(100, profitPerSale / 2) : 0) * 0.6
        + (100 - dominance) * 0.2
        + (dispersion) * 0.2,
    );

    const verdict =
      profitPerSale > 50 && adDensity < 8 ? "🟢 Strong arbitrage"
        : profitPerSale > 0 ? "🟡 Marginal arbitrage"
          : "🔴 Negative — skip";

    return json({
      seed,
      inputs: { assumedMarginRate, cvr },
      market: {
        adDensity,
        shoppingAdvertiserCount: shoppingCount,
        marketplaceDominance: Math.round(dominance),
        priceDispersion: Math.round(dispersion),
        medianPrice: median,
      },
      arbitrage: {
        cpcProxy: cpc,
        breakevenRoas,
        estimatedCpa,
        grossMarginPerSale: grossMargin,
        profitPerSale,
        arbitrageScore: Math.round(arbitrageScore),
        verdict,
      },
    });
  } catch (e) {
    console.error("ad-arbitrage error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
