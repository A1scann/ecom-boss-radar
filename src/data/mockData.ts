// Mock data — high-ticket FR Google Ads opportunities
// Aligned with EcomBoss methodology: high intent, evergreen, offline-scarce, marge >200€

export type SubNiche = {
  id: string;
  name: string;
  category: string;
  searchDemand: number; // monthly FR searches
  cpc: number; // estimated CPC €
  competition: "Low" | "Medium" | "High";
  stability: "Evergreen" | "Saisonnier" | "Trending";
  marginPotential: number; // € avg
  opportunityScore: number; // 0-100
  mode: "validated" | "hidden";
  trend: number[]; // sparkline 12 pts
};

export type Product = {
  id: string;
  name: string;
  nicheId: string;
  niche: string;
  supplierUrl: string;
  buyPrice: number;
  sellPrice: number;
  margin: number;
  semrushSearches: number;
  googleTrends: number; // 0-100
  seasonality: "Evergreen" | "Saisonnier" | "Trending";
  marketingAngle: string;
  competitors: string[];
  cpc: number;
  buyingIntent: number; // 0-100
  competitionDifficulty: number; // 0-100 (lower = easier)
  offlineScarcity: number; // 0-100 (higher = better)
  problemSolving: number; // 0-100
  amazonDominated: boolean;
  fitScore: number; // 0-100
  verdict: "Prioritaire" | "À tester" | "Rejeter";
  scoreBreakdown: {
    searchDemand: number;
    buyingIntent: number;
    margin: number;
    competitionWeakness: number;
    offlineScarcity: number;
    offerAngle: number;
    ecombossFit: number;
  };
};

const spark = (base: number) =>
  Array.from({ length: 12 }, (_, i) => Math.round(base * (0.7 + Math.random() * 0.6 + i * 0.02)));

export const subNiches: SubNiche[] = [
  { id: "sauna-infra", name: "Saunas infrarouges domestiques", category: "Wellness", searchDemand: 27000, cpc: 1.8, competition: "Medium", stability: "Evergreen", marginPotential: 850, opportunityScore: 92, mode: "validated", trend: spark(70) },
  { id: "spa-gonfla", name: "Spas gonflables haut de gamme", category: "Wellness", searchDemand: 49500, cpc: 2.1, competition: "High", stability: "Saisonnier", marginPotential: 420, opportunityScore: 78, mode: "validated", trend: spark(60) },
  { id: "pergola-bio", name: "Pergolas bioclimatiques", category: "Outdoor", searchDemand: 33100, cpc: 2.6, competition: "Medium", stability: "Saisonnier", marginPotential: 1200, opportunityScore: 89, mode: "validated", trend: spark(65) },
  { id: "abri-spa", name: "Abris de spa & jacuzzi", category: "Outdoor", searchDemand: 8100, cpc: 1.4, competition: "Low", stability: "Evergreen", marginPotential: 680, opportunityScore: 86, mode: "hidden", trend: spark(45) },
  { id: "rameur-pro", name: "Rameurs eau pro maison", category: "Fitness", searchDemand: 14800, cpc: 1.2, competition: "Medium", stability: "Evergreen", marginPotential: 380, opportunityScore: 81, mode: "validated", trend: spark(55) },
  { id: "cryo-home", name: "Cabines cryothérapie maison", category: "Wellness", searchDemand: 5400, cpc: 2.4, competition: "Low", stability: "Evergreen", marginPotential: 1500, opportunityScore: 88, mode: "hidden", trend: spark(40) },
  { id: "carport-solaire", name: "Carports solaires résidentiels", category: "Outdoor", searchDemand: 12100, cpc: 3.2, competition: "Low", stability: "Evergreen", marginPotential: 2200, opportunityScore: 94, mode: "hidden", trend: spark(50) },
  { id: "bain-nordique", name: "Bains nordiques bois", category: "Wellness", searchDemand: 9900, cpc: 1.6, competition: "Medium", stability: "Saisonnier", marginPotential: 950, opportunityScore: 84, mode: "validated", trend: spark(48) },
  { id: "serre-jardin", name: "Serres de jardin premium", category: "Outdoor", searchDemand: 22200, cpc: 1.1, competition: "Medium", stability: "Saisonnier", marginPotential: 520, opportunityScore: 76, mode: "validated", trend: spark(58) },
  { id: "mobilier-tera", name: "Mobilier de terrasse design", category: "Outdoor", searchDemand: 18100, cpc: 1.5, competition: "High", stability: "Saisonnier", marginPotential: 480, opportunityScore: 71, mode: "validated", trend: spark(62) },
  { id: "lit-massage", name: "Tables de massage électriques pro", category: "B2B Wellness", searchDemand: 6600, cpc: 1.3, competition: "Low", stability: "Evergreen", marginPotential: 420, opportunityScore: 83, mode: "hidden", trend: spark(38) },
  { id: "abri-velo", name: "Abris vélo électrique sécurisés", category: "Outdoor", searchDemand: 5400, cpc: 1.7, competition: "Low", stability: "Evergreen", marginPotential: 380, opportunityScore: 80, mode: "hidden", trend: spark(35) },
];

const verdictFor = (s: number): Product["verdict"] =>
  s >= 80 ? "Prioritaire" : s >= 65 ? "À tester" : "Rejeter";

const makeProduct = (
  id: string,
  name: string,
  nicheId: string,
  niche: string,
  buy: number,
  sell: number,
  searches: number,
  trends: number,
  intent: number,
  compDiff: number,
  offline: number,
  problem: number,
  amazon: boolean,
  cpc: number,
  angle: string,
  seasonality: Product["seasonality"] = "Evergreen"
): Product => {
  const margin = sell - buy;
  // Scoring engine — EcomBoss weights
  const sd = Math.min(20, (searches / 30000) * 20);
  const bi = (intent / 100) * 20;
  const mg = Math.min(20, (margin / 1500) * 20);
  const cw = ((100 - compDiff) / 100) * 15;
  const os = (offline / 100) * 10;
  const oa = (problem / 100) * 10;
  const ef = amazon ? 1 : 5;
  const fit = Math.round(sd + bi + mg + cw + os + oa + ef);
  return {
    id, name, nicheId, niche,
    supplierUrl: "https://alibaba.com/...",
    buyPrice: buy, sellPrice: sell, margin,
    semrushSearches: searches, googleTrends: trends, seasonality,
    marketingAngle: angle,
    competitors: ["cdiscount.com", "manomano.fr", "leroy-merlin.fr"],
    cpc, buyingIntent: intent, competitionDifficulty: compDiff,
    offlineScarcity: offline, problemSolving: problem, amazonDominated: amazon,
    fitScore: fit, verdict: verdictFor(fit),
    scoreBreakdown: {
      searchDemand: Math.round(sd), buyingIntent: Math.round(bi),
      margin: Math.round(mg), competitionWeakness: Math.round(cw),
      offlineScarcity: Math.round(os), offerAngle: Math.round(oa), ecombossFit: ef,
    },
  };
};

export const products: Product[] = [
  makeProduct("p1", "Sauna infrarouge 3 places cèdre rouge", "sauna-infra", "Saunas infrarouges domestiques", 890, 2490, 27000, 78, 88, 45, 85, 90, false, 1.8, "Garantie 5 ans + livraison gratuite + montage offert"),
  makeProduct("p2", "Sauna infrarouge solo carbone", "sauna-infra", "Saunas infrarouges domestiques", 520, 1490, 14800, 72, 82, 50, 80, 85, false, 1.6, "Bundle thérapie chromothérapie offert"),
  makeProduct("p3", "Pergola bioclimatique alu 4x3m", "pergola-bio", "Pergolas bioclimatiques", 1450, 3990, 33100, 85, 92, 55, 90, 88, false, 2.6, "Devis personnalisé + pose en option + LED offertes"),
  makeProduct("p4", "Spa gonflable 6 places jets pro", "spa-gonfla", "Spas gonflables haut de gamme", 380, 990, 49500, 90, 78, 70, 60, 70, true, 2.1, "Pack démarrage produits chimiques offert"),
  makeProduct("p5", "Cabine cryothérapie azote -110°C", "cryo-home", "Cabines cryothérapie maison", 4500, 12900, 5400, 65, 90, 30, 95, 92, false, 2.4, "Programme récupération athlète + formation"),
  makeProduct("p6", "Carport solaire 2 voitures 6kWc", "carport-solaire", "Carports solaires résidentiels", 5800, 14500, 12100, 88, 95, 35, 95, 95, false, 3.2, "Étude personnalisée + aide MaPrimeRénov incluse"),
  makeProduct("p7", "Bain nordique bois 6 places poêle inox", "bain-nordique", "Bains nordiques bois", 1850, 4290, 9900, 70, 84, 48, 88, 82, false, 1.6, "Couverture thermique + kit entretien offert"),
  makeProduct("p8", "Rameur eau noyer professionnel", "rameur-pro", "Rameurs eau pro maison", 480, 1290, 14800, 75, 80, 60, 70, 78, false, 1.2, "Programme coach 12 semaines offert"),
  makeProduct("p9", "Abri spa thermique télescopique", "abri-spa", "Abris de spa & jacuzzi", 1200, 3290, 8100, 68, 86, 35, 92, 88, false, 1.4, "Mesure sur-mesure + livraison France entière"),
  makeProduct("p10", "Serre adossée verre trempé 8m²", "serre-jardin", "Serres de jardin premium", 680, 1790, 22200, 80, 75, 65, 75, 72, false, 1.1, "Kit ventilation auto + étagères offertes"),
  makeProduct("p11", "Table massage électrique 3 moteurs pro", "lit-massage", "Tables de massage électriques pro", 420, 1190, 6600, 62, 88, 40, 90, 85, false, 1.3, "Pack pro kiné — housse + tabouret offerts"),
  makeProduct("p12", "Abri vélo cargo verrouillable inox", "abri-velo", "Abris vélo électrique sécurisés", 380, 990, 5400, 72, 82, 38, 90, 90, false, 1.7, "Cadenas U haute sécurité offert"),
];

export const adjacentNiches = [
  { name: "Studios de yoga modulaires extérieur", reason: "Wellness premium + outdoor — peu exploité FR" },
  { name: "Hammams compacts résidentiels", reason: "Adjacent saunas, demande croissante <10k/mois" },
  { name: "Vérandas démontables 4 saisons", reason: "Frontière pergola/serre — marges 1200€+" },
  { name: "Pistes de padel privées", reason: "Vague sport premium, B2C aisé + B2B clubs" },
  { name: "Caves à vin enterrées préfab", reason: "Patrimoine + œnologie, aucun acteur Google Ads" },
  { name: "Stations de recharge VE design", reason: "B2B copro + résidentiel premium" },
];
