// Hard niche validation layer.
// A niche is a MARKET SEGMENT — not a specific product.
// Returns true only when `name` looks like a valid market segment.

const UNIT_RE = /\b(\d+(?:[.,]\d+)?\s*)?(mm|cm|m²|m2|kwc|kwh|kw|w|hz|°c|°|kg|g|l|v|ml|po|inch|"|places?|voitures?|personnes?|portes?|chambres?|pièces?)\b/i;

const MODEL_HINT_RE = /\b(compact|pro|premium|electrique|électrique|automatique|automatisé|motorise|motorisé|connecté|connectée|portable|pliable|gonflable|infrarouge|bioclimatique|telescopique|télescopique|adossée|adossee|inox|alu|aluminium|carbone|noyer|cèdre|cedre|verre|trempé|trempe)\b/i;

// Generic noun signals it's likely a product model when combined with a hint above.
const PRODUCT_NOUN_RE = /\b(sauna|pergola|carport|rameur|spa|jacuzzi|abri|serre|table|cabine|four|lit|tente|barbecue|piscine|aquarium|raboteuse|tondeuse|scie|perceuse|ventilateur|climatiseur)\b/i;

export function isValidNiche(name?: string | null): boolean {
  if (!name) return false;
  const n = name.trim();
  if (n.length < 3) return false;

  // Rule 1 — length cap
  if (n.length > 35) return false;

  // Rule 2 — numeric contamination
  if (/\d/.test(n)) return false;

  // Rule 3 — unit contamination
  if (UNIT_RE.test(n)) return false;

  // Rule 4 — brand/model contamination: a model adjective combined with a product noun
  if (MODEL_HINT_RE.test(n) && PRODUCT_NOUN_RE.test(n)) return false;

  return true;
}

export function filterValidNiches<T extends { name?: string | null }>(
  rows: T[],
  context = "NicheFilter",
): T[] {
  const kept = rows.filter((r) => isValidNiche(r.name));
  const excluded = rows.length - kept.length;
  if (excluded > 0) {
    // eslint-disable-next-line no-console
    console.log(`[${context}] ${excluded} entries excluded as products`);
  }
  return kept;
}

// Universal opportunity score floor.
export const MIN_OPPORTUNITY_SCORE = 70;
export const MIN_PRODUCT_MARGIN = 100;
