// EcomBoss scoring engine — pure functions, no I/O.
// Each score in 0–100 unless noted.

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export function trendStability(series: number[]) {
  if (series.length < 4) return 50;
  const m = avg(series);
  if (m === 0) return 0;
  const variance = avg(series.map((v) => (v - m) ** 2));
  const cv = Math.sqrt(variance) / m; // coefficient of variation
  return clamp(100 - cv * 100);
}

export function demandGrowth90d(series: number[]) {
  if (series.length < 8) return 0;
  const recent = avg(series.slice(-3));
  const past = avg(series.slice(-12, -9));
  if (past === 0) return recent > 0 ? 100 : 0;
  return Math.round(((recent - past) / past) * 100);
}

export function demandAcceleration(series: number[]) {
  if (series.length < 9) return 0;
  const last3 = avg(series.slice(-3));
  const prev3 = avg(series.slice(-6, -3));
  const prev6 = avg(series.slice(-9, -6));
  const g1 = prev3 ? (last3 - prev3) / prev3 : 0;
  const g2 = prev6 ? (prev3 - prev6) / prev6 : 0;
  return Math.round((g1 - g2) * 100);
}

export function seasonalityScore(series: number[]) {
  if (series.length < 12) return 0;
  const max = Math.max(...series);
  const min = Math.min(...series);
  if (max === 0) return 0;
  return clamp(((max - min) / max) * 100);
}

const COMMERCIAL = ["acheter", "prix", "meilleur", "meilleure", "comparatif", "avis", "pas cher", "promo", "soldes", "code promo", "boutique", "magasin", "livraison"];
export function commercialIntent(keywords: string[]) {
  if (!keywords.length) return 0;
  const hits = keywords.filter((k) => COMMERCIAL.some((c) => k.toLowerCase().includes(c))).length;
  return clamp((hits / keywords.length) * 100);
}

// ---------- SERP-derived signals ----------
// deno-lint-ignore no-explicit-any
export function advertiserDensity(serp: any) {
  const ads = serp?.ads?.length ?? 0;
  const shoppingAds = serp?.shopping_results?.filter((s: any) => s?.tag === "Sponsored")?.length ?? 0;
  return ads + shoppingAds;
}

const MARKETPLACES = ["amazon.fr", "amazon.com", "manomano", "leroymerlin", "cdiscount", "fnac", "darty", "boulanger", "rakuten"];
// deno-lint-ignore no-explicit-any
export function marketplaceDominance(serp: any) {
  const organic = serp?.organic_results ?? [];
  if (!organic.length) return 0;
  const top10 = organic.slice(0, 10);
  const dominated = top10.filter((r: any) => {
    const link = (r?.link ?? "").toLowerCase();
    return MARKETPLACES.some((m) => link.includes(m));
  }).length;
  return clamp((dominated / top10.length) * 100);
}

// SERP weakness = inverse of authority signals (low marketplace domination + thin top results)
// deno-lint-ignore no-explicit-any
export function serpWeakness(serp: any) {
  const organic = serp?.organic_results ?? [];
  if (!organic.length) return 50;
  const dom = marketplaceDominance(serp);
  const thin = organic.slice(0, 5).filter((r: any) => !r?.snippet || (r.snippet?.length ?? 0) < 80).length;
  const thinScore = (thin / 5) * 100;
  return clamp(100 - dom * 0.7 + thinScore * 0.3);
}

// deno-lint-ignore no-explicit-any
export function priceDispersion(shopping: any) {
  const items = shopping?.shopping_results ?? [];
  const prices = items.map((i: any) => Number(i?.extracted_price)).filter((n: number) => Number.isFinite(n) && n > 0);
  if (prices.length < 4) return 0;
  const m = avg(prices);
  const variance = avg(prices.map((p: number) => (p - m) ** 2));
  return clamp((Math.sqrt(variance) / m) * 100);
}

// CPC proxy from advertiser density × commercial intent (no Semrush)
export function cpcProxy(adDensity: number, commIntent: number) {
  // €0.20 baseline up to ~€6 cap
  return Math.round((0.2 + (adDensity * 0.35) + (commIntent / 100) * 1.8) * 100) / 100;
}

// ---------- Composite scores ----------

export function opportunityScore(p: {
  growth: number; stability: number; weakness: number; intent: number; dominance: number;
}) {
  return Math.round(clamp(
    p.growth * 0.25 + p.stability * 0.15 + p.weakness * 0.25 + p.intent * 0.20 + (100 - p.dominance) * 0.15
  ));
}

export function alphaScore(p: {
  opportunity: number; acceleration: number; hidden: number; supplier: number;
}) {
  return Math.round(clamp(
    p.opportunity * 0.45 + Math.max(0, p.acceleration) * 0.20 + p.hidden * 0.20 + p.supplier * 0.15
  ));
}

export function hiddenOpportunity(p: {
  growth: number; adDensity: number; weakness: number; dominance: number;
}) {
  // High demand growth + low ads + weak SERP + low marketplace = hidden gem
  const adInverse = clamp(100 - p.adDensity * 12);
  return Math.round(clamp(
    Math.max(0, p.growth) * 0.35 + adInverse * 0.25 + p.weakness * 0.20 + (100 - p.dominance) * 0.20
  ));
}

export function supplierFeasibility(priceDisp: number, marginPotential: number) {
  // High dispersion = more supplier room; combine with margin potential (€)
  const margScore = clamp(marginPotential / 3); // 300€ margin → 100
  return Math.round(clamp(priceDisp * 0.4 + margScore * 0.6));
}

export function maturityStage(growth: number, dominance: number, adDensity: number): string {
  if (growth > 40 && dominance < 40) return "Emerging";
  if (growth > 10 && adDensity < 6) return "Growth";
  if (adDensity >= 6 && dominance >= 50) return "Saturated";
  return "Mature";
}

// Breakeven ROAS = 1 / margin_rate (assume 30% net margin baseline)
export function breakevenRoas(marginRate = 0.3) {
  return Math.round((1 / marginRate) * 100) / 100;
}

// Estimated CPA = CPC × clicks-needed (assume 2% CVR baseline)
export function estimatedCpa(cpc: number, cvr = 0.02) {
  return Math.round((cpc / cvr) * 100) / 100;
}

export { clamp, avg };
