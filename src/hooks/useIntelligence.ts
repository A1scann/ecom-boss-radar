// React hooks for the SerpApi-powered intelligence layer.
// Demo mode = use mockData. Live mode = call edge functions.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { filterValidNiches, MIN_OPPORTUNITY_SCORE } from "@/lib/nicheFilter";

export type DataMode = "demo" | "live";

const MODE_KEY = "ecomboss-data-mode";

export function useDataMode(): [DataMode, (m: DataMode) => void] {
  const [mode, setMode] = useState<DataMode>(() => {
    if (typeof window === "undefined") return "demo";
    return (localStorage.getItem(MODE_KEY) as DataMode) ?? "demo";
  });
  const update = (m: DataMode) => {
    setMode(m);
    localStorage.setItem(MODE_KEY, m);
  };
  return [mode, update];
}

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw error;
  if (data?.error) throw new Error(JSON.stringify(data.error));
  return data as T;
}

export type DiscoverResponse = {
  seed: string;
  signals: {
    searchInterest: number;
    trendSeries: number[];
    stability: number;
    growth: number;
    acceleration: number;
    seasonality: number;
    adDensity: number;
    dominance: number;
    weakness: number;
    dispersion: number;
    cpc: number;
    marginPotential: number;
    intent: number;
  };
  scoring: {
    opportunityScore: number;
    alphaScore: number;
    hiddenOpportunityScore: number;
    serpWeaknessScore: number;
    marketplaceDominanceScore: number;
    supplierFeasibilityScore: number;
    breakevenRoas: number;
    estimatedCpa: number;
  };
  meta: {
    maturity: string;
    mode: "validated" | "hidden";
    watchlist: boolean;
    emergingClusters: string[];
    relatedTop: string[];
    autocomplete: string[];
  };
};

export function useNicheDiscover() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DiscoverResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (seed: string, macroSlug?: string) => {
    setLoading(true); setError(null);
    try {
      const res = await invoke<DiscoverResponse>("niche-discover", { seed, macroSlug, persist: true });
      setData(res);
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      throw e;
    } finally { setLoading(false); }
  }, []);
  return { run, loading, data, error };
}

export type IntentResponse = {
  seed: string;
  total: number;
  buyerIntentScore: number;
  buyerKeywords: Array<{ keyword: string; intent: string; rising: boolean; source: string; commercial: boolean }>;
  allKeywords: Array<{ keyword: string; intent: string; rising: boolean; source: string; commercial: boolean }>;
};

export function useKeywordIntent() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IntentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (seed: string) => {
    setLoading(true); setError(null);
    try {
      const res = await invoke<IntentResponse>("keyword-intent", { seed });
      setData(res); return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error"); throw e;
    } finally { setLoading(false); }
  }, []);
  return { run, loading, data, error };
}

export type ArbitrageResponse = {
  seed: string;
  inputs: { assumedMarginRate: number; cvr: number };
  market: {
    adDensity: number; shoppingAdvertiserCount: number;
    marketplaceDominance: number; priceDispersion: number; medianPrice: number;
  };
  arbitrage: {
    cpcProxy: number; breakevenRoas: number; estimatedCpa: number;
    grossMarginPerSale: number; profitPerSale: number;
    arbitrageScore: number; verdict: string;
  };
};

export function useAdArbitrage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ArbitrageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (seed: string, opts: { assumedMarginRate?: number; cvr?: number } = {}) => {
    setLoading(true); setError(null);
    try {
      const res = await invoke<ArbitrageResponse>("ad-arbitrage", { seed, ...opts });
      setData(res); return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error"); throw e;
    } finally { setLoading(false); }
  }, []);
  return { run, loading, data, error };
}

export type LiveSubNiche = {
  id: string;
  slug: string;
  name: string;
  seed_keyword: string;
  mode: "validated" | "hidden";
  maturity: string;
  watchlist: boolean;
  hidden_signal: string | null;
  search_demand: number;
  demand_growth_90d: number;
  demand_acceleration: number;
  trend_series: number[];
  emerging_clusters: string[];
  competition_shift: number;
  advertiser_density: number;
  marketplace_dominance_score: number;
  serp_weakness_score: number;
  cpc: number;
  margin_potential: number;
  opportunity_score: number;
  alpha_score: number;
  hidden_opportunity_score: number;
  supplier_feasibility_score: number;
  breakeven_roas: number;
  estimated_cpa: number;
  data_source: string;
  last_signal_at: string;
};

export function useLiveSubNiches(enabled: boolean) {
  const [data, setData] = useState<LiveSubNiche[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase
        .from("sub_niches_live")
        .select("*")
        .order("opportunity_score", { ascending: false });
      if (error) throw error;
      setData((data ?? []) as LiveSubNiche[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally { setLoading(false); }
  }, [enabled]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
