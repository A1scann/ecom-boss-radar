import { PageHeader, StatCard } from "@/components/ui-custom/Premium";
import { products, subNiches } from "@/data/mockData";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Target, Zap, Trophy } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, BarChart, Bar, Cell } from "recharts";

const Dashboard = () => {
  const prioritaires = products.filter((p) => p.verdict === "Prioritaire");
  const avgFit = Math.round(products.reduce((a, p) => a + p.fitScore, 0) / products.length);
  const totalMargin = products.reduce((a, p) => a + p.margin, 0);

  const topNiches = [...subNiches].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 6);
  const FR_MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  const monthLabel = (i: number, total: number) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - (total - 1 - i), 1);
    return `${FR_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
  };
  const trendData = subNiches[0].trend.map((v, i, arr) => ({ m: monthLabel(i, arr.length), v }));
  const scoreData = topNiches.map((n) => ({ name: n.name.split(" ").slice(0, 2).join(" "), score: n.opportunityScore }));

  return (
    <>
      <PageHeader
        eyebrow="Product Research OS"
        title="Bonjour, prêt à scorer des winners ?"
        description="Vue d'ensemble de votre pipeline d'opportunités high-ticket sur le marché français."
        actions={
          <Button asChild variant="default" className="bg-gradient-primary hover:opacity-90 shadow-elegant">
            <Link to="/niches">Lancer le Niche Radar <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard accent label="Sous-niches détectées" value={subNiches.length} hint={`${subNiches.filter((n) => n.mode === "hidden").length} hidden opportunities`} />
        <StatCard label="Produits scorés" value={products.length} hint={`${prioritaires.length} prioritaires`} />
        <StatCard label="Fit Score moyen" value={`${avgFit}/100`} hint="Pipeline qualifié" />
        <StatCard label="Marge cumulée potentielle" value={`${(totalMargin / 1000).toFixed(1)}k€`} hint="Sur shortlist actuelle" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 rounded-xl border border-border bg-gradient-card p-6 shadow-card-premium">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Demande sous-niche leader</h3>
              <p className="text-xs text-muted-foreground">{subNiches[0].name}</p>
            </div>
            <span className="text-xs text-muted-foreground font-mono">12 mois</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-6 shadow-card-premium">
          <h3 className="font-semibold flex items-center gap-2 mb-4"><Trophy className="w-4 h-4 text-primary" /> Top opportunités</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                {scoreData.map((d, i) => (
                  <Cell key={i} fill={d.score >= 85 ? "hsl(var(--primary))" : "hsl(var(--accent))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link to="/niches" className="group rounded-xl border border-border bg-gradient-card p-6 hover:border-primary/40 transition-all shadow-card-premium">
          <Target className="w-5 h-5 text-primary mb-3" />
          <h4 className="font-semibold mb-1">Discover</h4>
          <p className="text-sm text-muted-foreground">Détectez les sous-niches validées et hidden opportunities.</p>
          <div className="mt-4 text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">Niche Radar <ArrowRight className="w-3 h-3" /></div>
        </Link>
        <Link to="/products" className="group rounded-xl border border-border bg-gradient-card p-6 hover:border-primary/40 transition-all shadow-card-premium">
          <Zap className="w-5 h-5 text-primary mb-3" />
          <h4 className="font-semibold mb-1">Validate</h4>
          <p className="text-sm text-muted-foreground">Scorez chaque produit sur 7 dimensions propriétaires.</p>
          <div className="mt-4 text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">Product Finder <ArrowRight className="w-3 h-3" /></div>
        </Link>
        <Link to="/shortlist" className="group rounded-xl border border-border bg-gradient-card p-6 hover:border-primary/40 transition-all shadow-card-premium">
          <Trophy className="w-5 h-5 text-primary mb-3" />
          <h4 className="font-semibold mb-1">Build Shortlist</h4>
          <p className="text-sm text-muted-foreground">Exportez vos produits à analyser et passez à l'action.</p>
          <div className="mt-4 text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">Ma shortlist <ArrowRight className="w-3 h-3" /></div>
        </Link>
      </div>
    </>
  );
};

export default Dashboard;
