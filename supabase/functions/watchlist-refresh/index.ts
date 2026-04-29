// Weekly watchlist refresher — calls product-discover for each watchlisted product.
// Caps at 20 products per run to control SerpApi costs.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { admin } from "../_shared/serpapi.ts";

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_PER_RUN = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { data: items, error } = await admin
      .from("product_watchlist")
      .select("product_id, products_live:product_id ( id, name, sub_niche_slug )")
      .order("last_refreshed_at", { ascending: true })
      .limit(MAX_PER_RUN);

    if (error) throw error;

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const it of (items ?? []) as any[]) {
      const p = it.products_live;
      if (!p?.id || !p?.name || !p?.sub_niche_slug) continue;
      try {
        const r = await fetch(`${PROJECT_URL}/functions/v1/product-discover`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`,
            "apikey": SERVICE_KEY,
          },
          body: JSON.stringify({
            seed: p.name,
            subNicheSlug: p.sub_niche_slug,
            productId: p.id,
            productName: p.name,
            persist: true,
          }),
        });
        results.push({ id: p.id, ok: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` });
      } catch (e) {
        results.push({ id: p.id, ok: false, error: e instanceof Error ? e.message : "unknown" });
      }
    }

    return new Response(JSON.stringify({ refreshed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("watchlist-refresh error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
