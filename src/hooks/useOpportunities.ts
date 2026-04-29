import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Opportunity = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  macro_id: string | null;
  parent_id: string | null;
  depth: number;
  discovery_mode: "validated" | "hidden" | "whitespace" | "adjacent" | "micro" | string;
  maturity: string;
  watchlist: boolean;
  is_seed: boolean;
  search_demand: number;
  demand_growth_90d: number;
  trend_series: number[];
  advertiser_density: number;
  marketplace_dominance_score: number;
  serp_weakness_score: number;
  cpc: number;
  margin_potential: number;
  opportunity_score: number;
  alpha_score: number;
  hidden_opportunity_score: number;
  supplier_feasibility_score: number;
  breakeven_roas: number | null;
  estimated_cpa: number | null;
  data_source: string;
};

export type Macro = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  sub_niche_count: number;
  momentum: number;
  total_demand: number;
  avg_opportunity: number;
};

export type Edge = { source_id: string; target_id: string; edge_type: string };

export type Mode = "validated" | "hidden" | "whitespace" | "all";

export type Filters = {
  macroId: string | null;
  mode: Mode;
  minOpportunity: number;
  minMargin: number;
  maxCompetition: number;
  minIntent: number;
  maturity: string | null;
  search: string;
};

export const defaultFilters: Filters = {
  macroId: null,
  mode: "all",
  minOpportunity: 0,
  minMargin: 0,
  maxCompetition: 12,
  minIntent: 0,
  maturity: null,
  search: "",
};

export function useMacros() {
  const [data, setData] = useState<Macro[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("macro_niches_live").select("*").order("momentum", { ascending: false })
      .then(({ data }) => { setData((data ?? []) as Macro[]); setLoading(false); });
  }, []);
  return { data, loading };
}

export function useOpportunities(filters: Filters) {
  const [data, setData] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("sub_niches_live").select("*", { count: "exact" });
    if (filters.macroId) q = q.eq("macro_id", filters.macroId);
    if (filters.mode !== "all") q = q.eq("discovery_mode", filters.mode);
    if (filters.minOpportunity > 0) q = q.gte("opportunity_score", filters.minOpportunity);
    if (filters.minMargin > 0) q = q.gte("margin_potential", filters.minMargin);
    if (filters.maxCompetition < 12) q = q.lte("advertiser_density", filters.maxCompetition);
    if (filters.maturity) q = q.eq("maturity", filters.maturity);
    if (filters.search.trim()) q = q.ilike("name", `%${filters.search.trim()}%`);
    q = q.order("opportunity_score", { ascending: false }).limit(2000);
    const { data, count } = await q;
    setData((data ?? []) as Opportunity[]);
    setCount(count ?? 0);
    setLoading(false);
  }, [filters]);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, count, refresh };
}

export function useEdges() {
  const [edges, setEdges] = useState<Edge[]>([]);
  const refresh = useCallback(async () => {
    const { data } = await supabase.from("opportunity_edges").select("source_id,target_id,edge_type").limit(2000);
    setEdges((data ?? []) as Edge[]);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { edges, refresh };
}

export type ExpandMode = "adjacent" | "hidden" | "whitespace" | "micro";

export async function expandNiche(opts: { mode: ExpandMode; parentId?: string; macroSlug?: string; n?: number }) {
  const { data, error } = await supabase.functions.invoke("niche-expand", { body: { n: 20, ...opts } });
  if (error) throw error;
  if (data?.error) throw new Error(JSON.stringify(data.error));
  return data;
}
