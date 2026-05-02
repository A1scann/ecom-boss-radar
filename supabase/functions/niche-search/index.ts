// REQUIRES: LOVABLE_API_KEY (auto-provisioned by Lovable Cloud)
// REQUIRES: SERPAPI_KEY (existing)
// Architecture: 2-pass AI via Lovable AI Gateway (broad@T=1.0 → filter@T=0.3) + SerpApi validation in chunks of 10
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { z } from "https://esm.sh/zod@3.23.8";
import { admin, googleSerp, shoppingSerp } from "../_shared/serpapi.ts";

const Body = z.object({ nicheSlug: z.string().min(1).max(160) });

// Lovable AI Gateway — using top-tier reasoning model (Claude Sonnet 4.5 isn't exposed via the gateway,
// Using Claude Sonnet 4.5 via Lovable AI Gateway for reliable long-form JSON output.
const AI_MODEL = "openai/gpt-5";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MARKETPLACE_DOMAINS = [
  "amazon.fr", "amazon.com",
  "cdiscount.com",
  "leroymerlin.fr",
  "fnac.com",
  "darty.com",
];

const STOPWORDS = new Set([
  "le", "la", "les", "de", "des", "du", "un", "une", "et", "en", "pour", "par",
  "avec", "sans", "sur", "sous", "dans", "aux", "ses", "son", "sa", "leur",
  "the", "and", "for", "with", "from", "into", "your", "our", "produit", "produits",
]);

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}
function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t)));
}

type Sub = { id: string; slug: string; name: string; description: string | null };
type Idea = {
  name: string;
  sub_niche: string;
  estimated_price_eur: number;
  search_keyword: string;
  angle?: string;
  why?: string;
};

function extractJson(text: string): any {
  let t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("AI response contains no JSON object");
  return JSON.parse(m[0]);
}

async function callAI(apiKey: string, prompt: string, _temperature?: number) {
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
    if (res.status === 429) throw new Error("Rate limit dépassé, réessayez dans un instant.");
    if (res.status === 402) throw new Error("Crédits Lovable AI épuisés — ajoutez des crédits dans Settings → Workspace → Usage.");
    throw new Error(`Lovable AI ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  }
  const text = data?.choices?.[0]?.message?.content;
  console.log("[callAI] raw output:", text?.substring(0, 300));
  if (typeof text !== "string") throw new Error("Lovable AI returned no text content");
  return text;
}

function pass1Prompt(nicheName: string, subNiches: Sub[]) {
  return `Tu es un expert en e-commerce high-ticket France et Google Ads.

Génère exactement 50 idées de produits à vendre dans la niche: "${nicheName}"
Sous-niches disponibles: ${subNiches.map((s) => s.name).join(", ")}

CRITÈRES OBLIGATOIRES:
- Prix de vente entre 200€ et 5000€
- Produit générique sans marque dominante (sourceable sur Alibaba)
- Fort intent d'achat sur Google Search FR (un produit qu'on cherche activement, pas un achat impulsif)
- Adapté au marché français (régulation, livraison, langue)
- Marge brute possible > 40%

ANTI-PATTERNS À EXCLURE FORMELLEMENT:
- Produits avec marques dominantes (iPhone, Dyson, Apple, Bose, Samsung, Nike, etc.)
- Gadgets viraux TikTok < 50€
- Vêtements et mode (sauf accessoires premium très spécifiques)
- Produits saisonniers étroits (sapins de Noël, costumes Halloween, maillots été)
- Produits trouvables facilement en magasin physique (livres, alimentation, basiques)
- Compléments alimentaires et cosmétiques (réglementaire, retours, marges difficiles)
- Produits soumis à régulation forte (médical, pharmaceutique, armes, alcool)
- Produits "vus et revus" en dropshipping classique (massage gun, lampe galaxie, etc.)

DIVERSITÉ EXIGÉE:
- Couvrir toutes les sous-niches listées
- Varier les angles (résolution problème spécifique, gain de temps, statut, confort, sécurité, performance)
- Privilégier les produits avec forte valeur perçue vs coût de production

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après, sans balises markdown:
{
  "products": [
    {
      "name": "nom du produit en français",
      "sub_niche": "nom de la sous-niche correspondante",
      "estimated_price_eur": 450,
      "search_keyword": "mot-clé principal recherche Google FR",
      "angle": "résolution problème | gain de temps | statut | confort | sécurité | performance",
      "why": "raison spécifique en une phrase"
    }
  ]
}`;
}

function pass2Prompt(nicheName: string, broadIdeas: Idea[]) {
  return `Tu es un expert e-commerce high-ticket France ultra-rigoureux.

Voici 50 idées de produits générées pour la niche "${nicheName}":
${JSON.stringify(broadIdeas, null, 2)}

MISSION: Sélectionner les 30 MEILLEURES idées en éliminant les faibles.

CRITÈRES D'ÉLIMINATION (rejeter si AU MOINS UN s'applique):
- Produit générique trop vu en dropshipping classique
- Intent d'achat Google faible (achat impulsif vs recherche active)
- Concurrence française probablement saturée
- Marge potentielle < 40% au prix de vente proposé
- Produit difficilement défendable face aux marketplaces (Amazon, Cdiscount)
- Doublons ou variantes trop proches d'autres idées de la liste
- Angle marketing peu différenciant

CRITÈRES DE SÉLECTION (favoriser):
- Problème spécifique et chiffrable que le produit résout
- Audience FR clairement identifiable (pas "tout le monde")
- Valeur perçue >> coût production (effet wow)
- Mot-clé Google avec intent commercial clair
- Couverture équilibrée des sous-niches

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après, sans balises markdown.
Format identique à l'entrée, exactement 30 produits, dans l'ordre du plus prometteur au moins prometteur:
{
  "products": [ { "name": "...", "sub_niche": "...", "estimated_price_eur": 450, "search_keyword": "...", "angle": "...", "why": "..." } ]
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

  // serpWeakness proxy: short snippets and lack of rich results = weaker SERP.
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

function classifySubNiche(aiSub: string, productName: string, subs: Sub[]): Sub {
  const target = normalize(aiSub ?? "");
  if (target) {
    const exact = subs.find((s) => normalize(s.name) === target);
    if (exact) return exact;
  }
  const bag = tokens(`${aiSub ?? ""} ${productName ?? ""}`);
  let best: Sub = subs[0];
  let bestHits = 0;
  for (const s of subs) {
    const subBag = tokens(`${s.name} ${s.description ?? ""}`);
    let hits = 0;
    for (const t of bag) if (subBag.has(t)) hits++;
    if (hits > bestHits) { bestHits = hits; best = s; }
  }
  if (bestHits === 0) console.warn(`[niche-search] no sub-niche match for "${aiSub}" / "${productName}", falling back to ${subs[0].slug}`);
  return best;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "BAD_REQUEST", message: parsed.error.message }, 400);
    const { nicheSlug } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({
        error: "MISSING_LOVABLE_AI_KEY",
        message: "LOVABLE_API_KEY is not configured — enable Lovable Cloud for this project.",
      }, 500);
    }

    const { data: niche } = await admin
      .from("niches").select("id, name").eq("slug", nicheSlug).maybeSingle();
    if (!niche) return json({ error: "NICHE_NOT_FOUND", message: "Niche not found" }, 404);

    const { data: subRows } = await admin
      .from("sub_niches").select("id, slug, name, description").eq("niche_id", niche.id);
    const subNiches = (subRows ?? []) as Sub[];
    if (!subNiches.length) return json({ error: "NO_SUB_NICHES", message: "No sub-niches for this niche" }, 400);

    const nicheName = niche.name as string;

    // PASS 1 — broad generation
    let broadIdeas: Idea[];
    try {
      const text1 = await callAI(LOVABLE_API_KEY, pass1Prompt(nicheName, subNiches), 1.0);
      const parsed1 = extractJson(text1);
      broadIdeas = parsed1.products;
      if (!Array.isArray(broadIdeas) || broadIdeas.length < 20) {
        throw new Error(`Pass 1 returned only ${broadIdeas?.length || 0} ideas`);
      }
    } catch (e) {
      console.error("[niche-search] pass1 failed", e);
      return json({ error: "AI_GENERATION_FAILED", message: e instanceof Error ? e.message : String(e) }, 500);
    }

    // PASS 2 — critical filtering
    let productIdeas: Idea[];
    try {
      const text2 = await callAI(LOVABLE_API_KEY, pass2Prompt(nicheName, broadIdeas), 0.3);
      const parsed2 = extractJson(text2);
      productIdeas = parsed2.products;
      if (!Array.isArray(productIdeas) || productIdeas.length === 0) {
        throw new Error("Pass 2 returned no filtered products");
      }
    } catch (e) {
      console.error("[niche-search] pass2 failed", e);
      return json({ error: "AI_GENERATION_FAILED", message: e instanceof Error ? e.message : String(e) }, 500);
    }

    // SERPAPI validation in chunks of 10
    type Validated = { product: Idea; serpData: any; shoppingData: any; error: string | null };
    const validated: Validated[] = [];
    const CHUNK_SIZE = 10;
    try {
      for (let i = 0; i < productIdeas.length; i += CHUNK_SIZE) {
        const chunk = productIdeas.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Promise.all(chunk.map(async (product) => {
          try {
            const [serpData, shoppingData] = await Promise.all([
              googleSerp(product.search_keyword),
              shoppingSerp(product.search_keyword),
            ]);
            return { product, serpData, shoppingData, error: null } as Validated;
          } catch (e) {
            console.warn("[niche-search] serpapi failed for", product.search_keyword, e);
            return { product, serpData: null, shoppingData: null, error: e instanceof Error ? e.message : String(e) } as Validated;
          }
        }));
        validated.push(...chunkResults);
      }
    } catch (e) {
      console.error("[niche-search] serpapi loop failed", e);
      return json({ error: "SERPAPI_FAILED", message: e instanceof Error ? e.message : String(e) }, 500);
    }

    let errorCount = 0;
    const rows = validated
      .filter((v) => {
        if (v.error || !v.serpData || !v.shoppingData) { errorCount++; return false; }
        return true;
      })
      .map((v) => {
        const signals = computeSignals(v.serpData, v.shoppingData, Number(v.product.estimated_price_eur) || 0);
        const score = scoreProduct(signals);
        const sub = classifySubNiche(v.product.sub_niche, v.product.name, subNiches);
        return {
          name: v.product.name,
          niche_slug: nicheSlug,
          sub_niche_slug: sub.slug,
          buy_price_estimate: Math.round(signals.realPriceFR * 0.4),
          sell_price_estimate: Math.round(signals.realPriceFR),
          margin_potential: signals.marginPotential,
          opportunity_score: score,
          verdict: verdictOf(score),
          cpc: signals.cpcEstimate,
          search_volume: signals.searchDemand,
          competition_level: signals.competitionLevel,
          serp_weakness_score: signals.serpWeakness,
          marketplace_dominance_score: signals.marketplaceDominance,
          seed_keyword: v.product.search_keyword,
          why: v.product.why ?? null,
          angle: v.product.angle ?? null,
          data_source: "ai+serpapi",
          last_signal_at: new Date().toISOString(),
        };
      });

    let persisted = 0;
    if (rows.length) {
      const { error } = await admin
        .from("products_live")
        .upsert(rows, { onConflict: "name,niche_slug" as any, ignoreDuplicates: false });
      if (error) {
        console.error("[niche-search] upsert error", error);
        return json({ error: "PERSIST_FAILED", message: error.message }, 500);
      }
      persisted = rows.length;
    }

    const bySubNiche: Record<string, number> = {};
    let scored = 0;
    for (const r of rows) {
      bySubNiche[r.sub_niche_slug] = (bySubNiche[r.sub_niche_slug] ?? 0) + 1;
      if (r.opportunity_score >= 70) scored++;
    }

    return json({ niche: nicheName, total: persisted, scored, bySubNiche, errors: errorCount });
  } catch (e) {
    console.error("[niche-search] fatal", e);
    return json({ error: "UNKNOWN", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
