// REQUIRES: LOVABLE_API_KEY (already configured)
// REQUIRES: SERPAPI_KEY (already configured)
// Architecture: 4 parallel AI calls × 25 ideas → dedupe → AI pre-scoring → top 50 → SerpApi validation in chunks of 10 → auto-classification → persist
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { z } from "https://esm.sh/zod@3.23.8";
import { admin, googleSerp, shoppingSerp } from "../_shared/serpapi.ts";

const Body = z.object({ force_new: z.boolean().optional() }).default({});

const AI_MODEL = "openai/gpt-5";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MARKETPLACE_DOMAINS = [
  "amazon.fr", "amazon.com", "cdiscount.com",
  "leroymerlin.fr", "fnac.com", "darty.com",
];

const STOPWORDS = new Set([
  "le", "la", "les", "de", "des", "du", "un", "une", "et", "en", "pour", "par",
  "avec", "sans", "sur", "sous", "dans", "aux", "ses", "son", "sa", "leur",
  "the", "and", "for", "with", "from", "into", "your", "our", "produit", "produits",
]);

const FORBIDDEN_WORDS = ["premium", "haut de gamme", "haut-de-gamme", "luxe"];

function normalize(s: string) {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}
function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t)));
}
function tokenOverlap(a: string, b: string): number {
  const ta = tokens(a); const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}
function stripForbidden(s: string): string {
  let out = s ?? "";
  for (const w of FORBIDDEN_WORDS) {
    out = out.replace(new RegExp(`\\b${w}\\b`, "gi"), " ");
  }
  return out.replace(/\s+/g, " ").trim();
}
function slugify(s: string): string {
  return normalize(stripForbidden(s)).replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

type Macro = { id: string; slug: string; name: string; description: string | null };
type Sub = { id: string; slug: string; name: string; description: string | null; macro_id: string | null; niche_id: string | null };
type Idea = {
  name: string;
  estimated_price_eur: number;
  search_keyword: string;
  angle?: string;
  why?: string;
  suggested_macro_niche?: string;
  suggested_sub_niche?: string;
};

function extractJson(text: string): any {
  let t = (text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("AI response contains no JSON object");
  return JSON.parse(m[0]);
}

async function callAI(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_completion_tokens: 16000,
      reasoning_effort: "minimal",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit dépassé");
    if (res.status === 402) throw new Error("Crédits Lovable AI épuisés");
    throw new Error(`Lovable AI ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  }
  const text = data?.choices?.[0]?.message?.content;
  console.log("[discovery-run] raw:", String(text).substring(0, 200));
  if (typeof text !== "string") throw new Error("Lovable AI returned no text");
  return text;
}

function buildGenPrompt(seedHint: string, exclusions: string[], taxonomyText: string, forceNew: boolean) {
  return `Tu es un expert e-commerce high-ticket France et Google Ads.

Génère exactement 25 idées de produits à vendre en France via Google Ads SANS te limiter à une niche prédéfinie.${forceNew ? "\n\nIMPORTANT: sois ULTRA AGRESSIF sur la nouveauté — propose des produits inattendus, hors des sentiers battus." : ""}

CRITÈRES OBLIGATOIRES POUR CHAQUE PRODUIT:
- Prix de vente France entre 200€ et 5000€
- Produit générique sourceable (Alibaba, fournisseurs FR/EU) — PAS de marques dominantes (Apple, Dyson, Bose, Samsung, Nike, etc.)
- Fort intent d'achat sur Google Search FR (recherche active, pas achat impulsif)
- Marge brute > 40%
- Adapté au marché français

ANTI-PATTERNS À EXCLURE FORMELLEMENT:
- Produits dropshipping classiques sur-vus (massage gun, lampe galaxie, mini-projecteurs, etc.)
- Gadgets viraux TikTok < 50€
- Vêtements et mode (sauf accessoires premium très spécifiques type sacoches cuir pro)
- Produits saisonniers étroits
- Produits trouvables facilement en magasin physique (livres, alimentation)
- Compléments alimentaires, cosmétiques, médicaux régulés
- Produits dont le nom contient "premium", "haut de gamme", "luxe" (NE JAMAIS coller ces mots après un nom de produit)

ANGLE DE GÉNÉRATION POUR CET APPEL: ${seedHint}

PRODUITS DÉJÀ DÉCOUVERTS (à NE PAS reproposer):
${exclusions.slice(0, 50).join(", ")}

TAXONOMIE EXISTANTE (à titre indicatif, tu peux proposer hors taxonomie):
${taxonomyText}

Réponds UNIQUEMENT avec un JSON valide, sans texte avant/après, sans balises markdown:
{
  "products": [
    {
      "name": "nom du produit en français (sans 'premium', 'haut de gamme', 'luxe')",
      "estimated_price_eur": 450,
      "search_keyword": "mot-clé Google FR",
      "angle": "résolution problème | gain de temps | statut | confort | sécurité | performance",
      "why": "raison spécifique en une phrase",
      "suggested_macro_niche": "nom de macro-niche existante OU nouvelle si rien ne colle",
      "suggested_sub_niche": "nom de sous-niche descriptif (sans 'premium')"
    }
  ]
}`;
}

function buildRankPrompt(unique: Idea[]) {
  return `Tu es un expert e-commerce high-ticket France ultra-rigoureux.

Voici ${unique.length} idées de produits candidats:
${JSON.stringify(unique, null, 2)}

MISSION: Sélectionner et classer les 50 MEILLEURES par potentiel décroissant.

CRITÈRES DE SÉLECTION:
- Fort intent d'achat Google FR
- Faible dominance marketplace probable
- Marge défendable (> 40%)
- Audience FR identifiable
- Pas de doublon ni de variante trop proche
- Aucun mot interdit dans le nom (premium, haut de gamme, luxe)

Réponds UNIQUEMENT avec un JSON valide, format identique à l'entrée, exactement 50 produits:
{
  "products": [ { "name": "...", "estimated_price_eur": 450, "search_keyword": "...", "angle": "...", "why": "...", "suggested_macro_niche": "...", "suggested_sub_niche": "..." } ]
}`;
}

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

function bestMatch<T extends { name: string; description: string | null }>(target: string, candidates: T[]): { match: T | null; score: number } {
  let best: T | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const score = Math.max(
      tokenOverlap(target, c.name),
      tokenOverlap(target, `${c.name} ${c.description ?? ""}`),
    );
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return { match: best, score: bestScore };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "BAD_REQUEST", message: parsed.error.message }, 400);
    const forceNew = !!parsed.data.force_new;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "MISSING_LOVABLE_AI_KEY", message: "LOVABLE_API_KEY is not configured." }, 500);
    }

    // STEP 1 — context
    const [{ data: macroRows }, { data: subRows }, { data: exclRows }] = await Promise.all([
      admin.from("macro_niches").select("id, slug, name, description"),
      admin.from("sub_niches").select("id, slug, name, description, macro_id, niche_id"),
      admin.from("products_live").select("name").eq("data_source", "discovery_v1").order("created_at", { ascending: false }).limit(200),
    ]);
    const macroNiches: Macro[] = (macroRows ?? []) as Macro[];
    const subNiches: Sub[] = (subRows ?? []) as Sub[];
    const exclusions: string[] = (exclRows ?? []).map((r: any) => r.name as string);

    const taxonomyText = macroNiches.map((m) => `${m.name}: ${m.description ?? ""}`).join("\n");

    // STEP 2 — 4 parallel AI calls
    const seedHints = [
      "axe résolution problème spécifique",
      "axe statut et différenciation sociale",
      "axe gain de temps et efficacité",
      "axe sécurité, protection ou performance technique",
    ];
    const allBatches = await Promise.all(seedHints.map(async (h) => {
      try {
        const text = await callAI(LOVABLE_API_KEY, buildGenPrompt(h, exclusions, taxonomyText, forceNew));
        const parsed = extractJson(text);
        return Array.isArray(parsed.products) ? (parsed.products as Idea[]) : [];
      } catch (e) {
        console.error(`[discovery-run] batch "${h}" failed:`, (e as Error).message);
        return [];
      }
    }));
    const allIdeas: Idea[] = allBatches.flat();

    // STEP 3 — dedupe + filter forbidden words
    const seen = new Set<string>();
    const exclusionsSet = new Set(exclusions.map(normalize));
    const unique: Idea[] = [];
    for (const idea of allIdeas) {
      if (!idea?.name || !idea?.search_keyword) continue;
      const lname = (idea.name ?? "").toLowerCase();
      if (FORBIDDEN_WORDS.some((w) => lname.includes(w))) continue;
      const n = normalize(idea.name);
      if (!n || seen.has(n) || exclusionsSet.has(n)) continue;
      seen.add(n);
      unique.push(idea);
    }
    if (unique.length < 20) console.warn(`[discovery-run] only ${unique.length} unique ideas`);

    // STEP 4 — pre-scoring (rank to top 50)
    let top: Idea[] = unique;
    if (unique.length > 50) {
      try {
        const text = await callAI(LOVABLE_API_KEY, buildRankPrompt(unique));
        const parsed = extractJson(text);
        if (Array.isArray(parsed.products) && parsed.products.length > 0) {
          top = parsed.products.slice(0, 50) as Idea[];
        } else {
          top = unique.slice(0, 50);
        }
      } catch (e) {
        console.warn(`[discovery-run] ranking failed, using first 50:`, (e as Error).message);
        top = unique.slice(0, 50);
      }
    }

    // STEP 5 — SerpApi validation
    type Validated = { product: Idea; serpData: any; shoppingData: any; error: string | null };
    const validated: Validated[] = [];
    const CHUNK = 10;
    for (let i = 0; i < top.length; i += CHUNK) {
      const chunk = top.slice(i, i + CHUNK);
      const results = await Promise.all(chunk.map(async (product) => {
        try {
          const [serpData, shoppingData] = await Promise.all([
            googleSerp(product.search_keyword),
            shoppingSerp(product.search_keyword),
          ]);
          return { product, serpData, shoppingData, error: null } as Validated;
        } catch (e) {
          console.warn("[discovery-run] serpapi failed for", product.search_keyword, (e as Error).message);
          return { product, serpData: null, shoppingData: null, error: (e as Error).message } as Validated;
        }
      }));
      validated.push(...results);
    }

    let errorCount = 0;
    const enriched = validated.flatMap((v) => {
      if (v.error || !v.serpData || !v.shoppingData) { errorCount++; return []; }
      const signals = computeSignals(v.serpData, v.shoppingData, Number(v.product.estimated_price_eur) || 0);
      const score = scoreProduct(signals);
      return [{ product: v.product, signals, score }];
    });

    // STEP 7 — auto-classify (only score >= 70)
    const newMacroNiches: { slug: string; name: string }[] = [];
    const newSubNiches: { slug: string; name: string; macro_slug: string }[] = [];
    const macroBySlug = new Map(macroNiches.map((m) => [m.slug, m]));
    const subBySlug = new Map(subNiches.map((s) => [s.slug, s]));
    let macroPool: Macro[] = [...macroNiches];
    let subPool: Sub[] = [...subNiches];

    type Row = {
      product: Idea; signals: ReturnType<typeof computeSignals>; score: number;
      macro: Macro; sub: Sub;
    };
    const rows: Row[] = [];

    for (const e of enriched) {
      if (e.score < 70) continue;

      // ---- macro ----
      const targetMacroRaw = stripForbidden(e.product.suggested_macro_niche ?? "");
      let macro: Macro | null = null;
      if (targetMacroRaw) {
        const { match, score } = bestMatch(targetMacroRaw, macroPool);
        if (match && score >= 0.40) macro = match;
      }
      if (!macro) {
        const slug = slugify(targetMacroRaw);
        if (!slug) {
          // fallback to "Divers"
          macro = macroPool.find((m) => m.slug === "divers") ?? null;
          if (!macro) {
            // create Divers
            const { data, error } = await admin.from("macro_niches").insert({
              slug: "divers", name: "Divers", description: "Auto-discovered fallback bucket",
            }).select("id, slug, name, description").maybeSingle();
            if (error || !data) { console.warn("[discovery-run] could not create Divers macro", error?.message); continue; }
            macro = data as Macro;
            macroPool.push(macro);
            macroBySlug.set(macro.slug, macro);
            newMacroNiches.push({ slug: macro.slug, name: macro.name });
          }
        } else if (macroBySlug.has(slug)) {
          macro = macroBySlug.get(slug)!;
        } else {
          const { data, error } = await admin.from("macro_niches").insert({
            slug, name: targetMacroRaw, description: "Auto-discovered from products",
          }).select("id, slug, name, description").maybeSingle();
          if (error || !data) { console.warn("[discovery-run] macro insert failed", error?.message); continue; }
          macro = data as Macro;
          macroPool.push(macro);
          macroBySlug.set(macro.slug, macro);
          newMacroNiches.push({ slug: macro.slug, name: macro.name });
        }
      }

      // ---- sub-niche within macro ----
      const targetSubRaw = stripForbidden(e.product.suggested_sub_niche ?? e.product.name ?? "");
      const macroSubs = subPool.filter((s) => s.macro_id === macro!.id);
      let sub: Sub | null = null;
      if (targetSubRaw) {
        const { match, score } = bestMatch(targetSubRaw, macroSubs);
        if (match && score >= 0.40) sub = match;
      }
      if (!sub) {
        const baseSlug = slugify(targetSubRaw);
        if (!baseSlug) continue;
        const slug = subBySlug.has(baseSlug) ? `${baseSlug}-${macro.slug}` : baseSlug;
        if (subBySlug.has(slug)) {
          sub = subBySlug.get(slug)!;
        } else {
          const { data, error } = await admin.from("sub_niches").insert({
            slug, name: targetSubRaw, description: "Auto-discovered from products",
            macro_id: macro.id, niche_id: null,
          }).select("id, slug, name, description, macro_id, niche_id").maybeSingle();
          if (error || !data) { console.warn("[discovery-run] sub insert failed", error?.message); continue; }
          sub = data as Sub;
          subPool.push(sub);
          subBySlug.set(sub.slug, sub);
          newSubNiches.push({ slug: sub.slug, name: sub.name, macro_slug: macro.slug });
        }
      }

      rows.push({ ...e, macro, sub });
    }

    // STEP 8 — persist
    let persisted = 0;
    if (rows.length) {
      const payload = rows.map((r) => ({
        name: r.product.name,
        niche_slug: r.sub.slug,
        sub_niche_slug: r.sub.slug,
        buy_price_estimate: Math.round(r.signals.realPriceFR * 0.4),
        sell_price_estimate: Math.round(r.signals.realPriceFR),
        margin_potential: r.signals.marginPotential,
        opportunity_score: r.score,
        verdict: verdictOf(r.score),
        cpc: r.signals.cpcEstimate,
        search_volume: r.signals.searchDemand,
        competition_level: r.signals.competitionLevel,
        serp_weakness_score: r.signals.serpWeakness,
        marketplace_dominance_score: r.signals.marketplaceDominance,
        seed_keyword: r.product.search_keyword,
        why: r.product.why ?? null,
        angle: r.product.angle ?? null,
        data_source: "discovery_v1",
        last_signal_at: new Date().toISOString(),
      }));
      const { error } = await admin.from("products_live").upsert(payload, { onConflict: "name,niche_slug" as any, ignoreDuplicates: false });
      if (error) {
        console.error("[discovery-run] upsert error", error);
        return json({ error: "PERSIST_FAILED", message: error.message }, 500);
      }
      persisted = payload.length;
    }

    return json({
      totalGenerated: allIdeas.length,
      uniqueAfterDedupe: unique.length,
      validated: enriched.length,
      scored: persisted,
      newMacroNiches,
      newSubNiches,
      errors: errorCount,
    });
  } catch (e) {
    console.error("[discovery-run] fatal", e);
    return json({ error: "UNKNOWN", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
