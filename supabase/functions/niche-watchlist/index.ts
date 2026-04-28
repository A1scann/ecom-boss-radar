// Niche Watchlist refresher — re-scores all persisted sub-niches and
// returns those gaining traction in France.
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { admin } from "../_shared/serpapi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { data, error } = await admin
      .from("sub_niches_live")
      .select("*")
      .order("last_signal_at", { ascending: false });
    if (error) throw error;

    const watchlist = (data ?? [])
      .filter((n) => n.watchlist || (n.demand_growth_90d ?? 0) > 20)
      .sort((a, b) => (b.demand_growth_90d ?? 0) - (a.demand_growth_90d ?? 0));

    return json({
      total: data?.length ?? 0,
      watchlist,
      stats: {
        emerging: (data ?? []).filter((n) => n.maturity === "Emerging").length,
        hidden: (data ?? []).filter((n) => n.mode === "hidden").length,
        avgGrowth: data?.length
          ? Math.round((data.reduce((s, n) => s + Number(n.demand_growth_90d ?? 0), 0) / data.length))
          : 0,
      },
    });
  } catch (e) {
    console.error("niche-watchlist error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
