// One-shot seeder: inserts 240 high-ticket FR sub-niches into sub_niches_live.
// Idempotent (ON CONFLICT slug DO NOTHING). Safe to re-call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import rowsData from "./rows.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Resolve macro slugs -> ids
    const { data: macros } = await admin.from("macro_niches_live").select("id,slug");
    const macroMap = new Map((macros ?? []).map((m: any) => [m.slug, m.id]));

    const rows = (rowsData as any[]).map((r) => {
      const { macroSlug, ...rest } = r;
      return { ...rest, macro_id: macroMap.get(macroSlug) ?? null };
    });

    // Upsert in batches of 60
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 60) {
      const batch = rows.slice(i, i + 60);
      const { error, count } = await admin
        .from("sub_niches_live")
        .upsert(batch, { onConflict: "slug", ignoreDuplicates: true, count: "exact" });
      if (error) throw error;
      inserted += count ?? batch.length;
    }

    return new Response(JSON.stringify({ ok: true, inserted, total: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
