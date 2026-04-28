// Niche Discovery Engine — turn a seed keyword into a sub-niche with
// full scoring (live SerpApi calls + scoring engine).
import { corsHeaders } from "@supabase/supabase-js/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import { admin, trendsFR, trendsRelated, autocomplete, googleSerp, shoppingSerp } from "../_shared/serpapi.ts";
import * as S from "../_shared/scoring.ts";

const Body = z.object({
  seed: z.string().min(2).max(120),
  macroSlug: z.string().optional(),
  persist: z.boolean().default(true),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const { seed, macroSlug, persist } = parsed.data;

    // 1. Pull all SerpApi signals in parallel
    const [trend, related, ac, serp, shop] = await Promise.all([
      trendsFR(seed),
      trendsRelated(seed),
      autocomplete(seed),
      googleSerp(seed),
      shoppingSerp(seed),
    ]);

    // 2. Compute signals
    const series = trend.points;
    const stability = S.trendStability(series);
    const growth = S.demandGrowth90d(series);
    const accel = S.demandAcceleration(series);
    const seasonality = S.seasonalityScore(series);
    const adDensity = S.advertiserDensity(serp);
    const dominance = S.marketplaceDominance(serp);
    const weakness = S.serpWeakness(serp);
    const dispersion = S.priceDispersion(shop);

    const allKeywords = [
      ...ac,
      ...(related.top ?? []).map((r: any) => r.query),
      ...(related.rising ?? []).map((r: any) => r.query),
    ].filter(Boolean);
    const intent = S.commercialIntent(allKeywords);
    const cpc = S.cpcProxy(adDensity, intent);

    // Margin estimate: median shopping price × 0.35 (high-ticket assumption)
    const prices = (shop?.shopping_results ?? [])
      .map((i: any) => Number(i?.extracted_price))
      .filter((n: number) => Number.isFinite(n) && n > 0)
      .sort((a: number, b: number) => a - b);
    const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
    const marginPotential = Math.round(median * 0.35);

    // 3. Composite scores
    const opportunity = S.opportunityScore({
      growth, stability, weakness, intent, dominance,
    });
    const supplier = S.supplierFeasibility(dispersion, marginPotential);
    const hidden = S.hiddenOpportunity({ growth, adDensity, weakness, dominance });
    const alpha = S.alphaScore({ opportunity, acceleration: accel, hidden, supplier });
    const maturity = S.maturityStage(growth, dominance, adDensity);
    const compShift = adDensity - 5; // delta vs assumed baseline of 5 ads
    const watchlist = growth > 20 && opportunity >= 70;
    const mode = hidden >= 70 && opportunity >= 65 ? "hidden" : "validated";

    // 4. Emerging clusters from rising queries
    const risingQueries = (related.rising ?? []).slice(0, 6).map((r: any) => r.query);

    const result = {
      seed,
      signals: {
        searchInterest: series[series.length - 1] ?? 0,
        trendSeries: series,
        stability,
        growth,
        acceleration: accel,
        seasonality,
        adDensity,
        dominance,
        weakness,
        dispersion,
        cpc,
        marginPotential,
        intent,
      },
      scoring: {
        opportunityScore: opportunity,
        alphaScore: alpha,
        hiddenOpportunityScore: hidden,
        serpWeaknessScore: Math.round(weakness),
        marketplaceDominanceScore: Math.round(dominance),
        supplierFeasibilityScore: supplier,
        breakevenRoas: S.breakevenRoas(),
        estimatedCpa: S.estimatedCpa(cpc),
      },
      meta: {
        maturity, mode, watchlist,
        emergingClusters: risingQueries,
        relatedTop: (related.top ?? []).slice(0, 8).map((r: any) => r.query),
        autocomplete: ac.slice(0, 10),
      },
    };

    if (persist) {
      let macroId: string | null = null;
      if (macroSlug) {
        const { data: m } = await admin.from("macro_niches_live").select("id").eq("slug", macroSlug).maybeSingle();
        macroId = m?.id ?? null;
      }
      const slug = seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);
      await admin.from("sub_niches_live").upsert({
        slug,
        name: seed,
        macro_id: macroId,
        seed_keyword: seed,
        mode,
        maturity,
        watchlist,
        hidden_signal: hidden >= 70 ? `Hidden gem: ${hidden}/100 — low ad density (${adDensity}) + ${growth}% growth` : null,
        search_demand: series[series.length - 1] ?? 0,
        demand_growth_90d: growth,
        demand_acceleration: accel,
        trend_series: series,
        seasonality,
        emerging_clusters: risingQueries,
        competition_shift: compShift,
        advertiser_density: adDensity,
        shopping_advertiser_count: (shop?.shopping_results?.length ?? 0),
        marketplace_dominance_score: Math.round(dominance),
        serp_weakness_score: Math.round(weakness),
        cpc,
        margin_potential: marginPotential,
        price_dispersion: Math.round(dispersion),
        opportunity_score: opportunity,
        alpha_score: alpha,
        hidden_opportunity_score: hidden,
        supplier_feasibility_score: supplier,
        breakeven_roas: S.breakevenRoas(),
        estimated_cpa: S.estimatedCpa(cpc),
        data_source: "serpapi",
        last_signal_at: new Date().toISOString(),
      }, { onConflict: "slug" });
    }

    return json(result);
  } catch (e) {
    console.error("niche-discover error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
