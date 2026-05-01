import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const COACH_URL =
  "https://script.google.com/macros/s/AKfycbwZs8fBuPdVLufsdfre_ZY-Znkc9uFMszUL-M0KUOzE3IlV_y_CFmIbJaP_ZQs-CLBL/exec";

export type CoachProduct = {
  name: string;
  niche?: string;
  supplierUrl?: string;
  buyPrice?: number;
  sellPrice?: number;
  margin?: number;
  semrushSearches?: number;
  googleTrends?: number | string;
  seasonality?: string;
  marketingAngle?: string;
  competitors?: string[];
};

interface Props {
  product: CoachProduct;
  variant?: "icon" | "default";
  size?: "sm" | "default" | "icon";
}

export function SubmitToCoach({ product, variant = "default", size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const payload = {
    nom: product.name,
    niche: product.niche ?? "",
    lienFournisseur: product.supplierUrl ?? "",
    pAchat: product.buyPrice ?? 0,
    pVente: product.sellPrice ?? 0,
    marge: product.margin ?? 0,
    rechercheSemrush: product.semrushSearches ?? 0,
    gTrends: product.googleTrends ?? "",
    saisonnalite: product.seasonality ?? "",
    offreMarketing: product.marketingAngle ?? "",
    concurrents: (product.competitors ?? []).join(" / "),
  };

  const handleSubmit = async () => {
    setSending(true);
    try {
      await fetch(COACH_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      toast.success("Produit envoyé au coach avec succès");
      setOpen(false);
    } catch {
      toast.error("Erreur lors de l'envoi — réessaie");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setOpen(true)}
          title="Soumettre au coach"
        >
          <Send className="w-4 h-4" />
        </Button>
      ) : (
        <Button size={size} variant="outline" onClick={() => setOpen(true)}>
          <Send className="w-4 h-4 mr-2" />
          Soumettre au coach
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Soumettre au coach</DialogTitle>
            <DialogDescription>
              Vérifie les données envoyées. La colonne « Commentaire » reste vide pour ton usage.
            </DialogDescription>
          </DialogHeader>

          <div className="text-sm divide-y divide-border rounded-md border border-border">
            <Row label="Nom du produit" value={payload.nom} />
            <Row label="Niche" value={payload.niche} />
            <Row label="Lien fournisseur" value={payload.lienFournisseur} truncate />
            <Row label="Prix d'achat" value={`${payload.pAchat} €`} />
            <Row label="Prix de vente" value={`${payload.pVente} €`} />
            <Row label="Marge" value={`${payload.marge} €`} />
            <Row label="Recherches (FR/mois)" value={payload.rechercheSemrush?.toLocaleString("fr-FR") || "—"} />
            <Row label="Google Trends" value={String(payload.gTrends || "—")} />
            <Row label="Saisonnalité" value={payload.saisonnalite || "—"} />
            <Row label="Offre marketing" value={payload.offreMarketing || "—"} />
            <Row label="Concurrents" value={payload.concurrents || "—"} />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Confirmer l'envoi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex justify-between gap-3 px-3 py-2">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
      <span className={`font-medium text-right ${truncate ? "truncate max-w-[260px]" : ""}`}>{value}</span>
    </div>
  );
}
