import { cn } from "@/lib/utils";

export const PageHeader = ({
  eyebrow, title, description, actions,
}: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) => (
  <div className="mb-8 flex items-start justify-between gap-6 flex-wrap">
    <div>
      {eyebrow && (
        <div className="text-xs font-semibold tracking-[0.2em] text-primary uppercase mb-2">{eyebrow}</div>
      )}
      <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground mt-2 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex gap-2">{actions}</div>}
  </div>
);

export const StatCard = ({
  label, value, hint, accent,
}: { label: string; value: React.ReactNode; hint?: string; accent?: boolean }) => (
  <div className={cn(
    "rounded-xl border border-border bg-gradient-card p-5 shadow-card-premium relative overflow-hidden",
    accent && "border-primary/30"
  )}>
    {accent && <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />}
    <div className="relative">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  </div>
);

export const ScorePill = ({ score }: { score: number }) => {
  const verdict = score >= 80 ? "Prioritaire" : score >= 65 ? "À tester" : "Rejeter";
  const cls = score >= 80
    ? "bg-success/15 text-success border-success/30"
    : score >= 65
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border", cls)}>
      <span className="font-mono">{score}</span>
      <span className="opacity-80">·</span>
      <span>{verdict}</span>
    </span>
  );
};
