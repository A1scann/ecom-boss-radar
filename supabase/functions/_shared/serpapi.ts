// Shared SerpApi client with Supabase-backed caching.
// Provider-agnostic: keep the surface narrow so another keyword source
// can be plugged in later without touching the engines.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

export type SerpEngine =
  | "google_trends"
  | "google_trends_trending_now"
  | "google_autocomplete"
  | "google"
  | "google_shopping";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function serp(
  engine: SerpEngine,
  params: Record<string, string | number | boolean>,
  opts: { ttlHours?: number; force?: boolean } = {},
) {
  if (!SERPAPI_KEY) throw new Error("SERPAPI_KEY is not configured");
  const ttl = opts.ttlHours ?? 24;
  const ordered = Object.keys(params).sort().reduce((acc, k) => {
    acc[k] = params[k];
    return acc;
  }, {} as Record<string, unknown>);
  const cacheKey = await sha256(`${engine}::${JSON.stringify(ordered)}`);

  if (!opts.force) {
    const { data: cached } = await admin
      .from("serpapi_cache")
      .select("response, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
      return { data: cached.response, cached: true };
    }
  }

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", engine);
  url.searchParams.set("api_key", SERPAPI_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SerpApi ${engine} failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  const data = await res.json();

  await admin.from("serpapi_cache").upsert({
    cache_key: cacheKey,
    engine,
    query: String(params.q ?? params.query ?? ""),
    params: ordered,
    response: data,
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + ttl * 3600 * 1000).toISOString(),
  }, { onConflict: "cache_key" });

  return { data, cached: false };
}

// ---------- High-level helpers ----------

export async function trendsFR(query: string) {
  const { data } = await serp("google_trends", {
    q: query,
    geo: "FR",
    data_type: "TIMESERIES",
    date: "today 12-m",
  });
  // deno-lint-ignore no-explicit-any
  const series: any[] = data?.interest_over_time?.timeline_data ?? [];
  const points = series.map((p) => p?.values?.[0]?.extracted_value ?? 0);
  return { points, raw: data };
}

export async function trendsRelated(query: string) {
  const { data } = await serp("google_trends", {
    q: query,
    geo: "FR",
    data_type: "RELATED_QUERIES",
  });
  const top = data?.related_queries?.top ?? [];
  const rising = data?.related_queries?.rising ?? [];
  return { top, rising };
}

export async function autocomplete(query: string) {
  const { data } = await serp("google_autocomplete", { q: query, gl: "fr", hl: "fr" });
  return (data?.suggestions ?? []).map((s: { value: string }) => s.value);
}

export async function googleSerp(query: string) {
  const { data } = await serp("google", { q: query, gl: "fr", hl: "fr", location: "France" });
  return data;
}

export async function shoppingSerp(query: string) {
  const { data } = await serp("google_shopping", { q: query, gl: "fr", hl: "fr", location: "France" });
  return data;
}
