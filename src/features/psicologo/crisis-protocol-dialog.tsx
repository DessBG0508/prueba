import { useState } from "react";
import { ShieldAlert, PhoneCall, AlertOctagon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { activateCrisisProtocol } from "@/lib/psychologist-store";
import { useAuth } from "@/lib/auth-context";
import { supabase, hasRealSupabaseSession, isDemoUserId } from "@/lib/supabase";
import type { CaseSummary } from "@/lib/types";

interface CrisisProtocolDialogProps {
  caseItem: CaseSummary | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CrisisProtocolDialog({
  caseItem,
  isOpen,
  onOpenChange,
  onSuccess,
}: CrisisProtocolDialogProps) {
  const { user } = useAuth();
  const isRealUser = Boolean(user?.id && !isDemoUserId(user.id));
  const [details, setDetails] = useState<string>(
    "Estudiante contactado en condición de angustia o riesgo alto. Se brinda contención inmediata y se vincula con redes institucionales y Línea de la Vida.",
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!caseItem) return null;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const authorName = user?.name || "Psicología TESH";
      const isRealSession = (await hasRealSupabaseSession()) || isRealUser;

      if (isRealSession && user?.id) {
        const targetFolio = caseItem.folio || caseItem.id;
        const { data: existingExp } = await supabase
          .from("expedientes_clinicos")
          .select("campos_clinicos")
          .eq("folio", targetFolio)
          .eq("psicologo_id", user.id)
          .maybeSingle();

        const prevCampos = (existingExp?.campos_clinicos as Record<string, unknown>) || {};
        const prevObj = (prevCampos.objetivos_sesion as Record<string, unknown>) || {};
        const prevNotas = String(prevObj.notas_libres || "").trim();
        const stamp = new Date().toLocaleString("es-MX");
        const entry = `[${stamp} · PROTOCOLO DE CRISIS — ${authorName}]\n${details.trim()}`;
        const nextNotas = prevNotas ? `${entry}\n\n${prevNotas}` : entry;

        const { error } = await supabase.from("expedientes_clinicos").upsert(
          {
            folio: targetFolio,
            psicologo_id: user.id,
            campos_clinicos: {
              ...prevCampos,
              objetivos_sesion: {
                ...prevObj,
                notas_libres: nextNotas,
              },
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "folio,psicologo_id" },
        );

        if (error) {
          toast.error(`No se pudo registrar el protocolo en Supabase: ${error.message}`);
          return;
        }

        toast.error("Protocolo de Emergencia Activado (Supabase)", {
          description: `Se registró en el expediente clínico de ${caseItem.studentName || caseItem.initials}.`,
        });
        onOpenChange(false);
        onSuccess?.();
        return;
      }

      activateCrisisProtocol(caseItem.id, details, authorName);
      toast.error("Protocolo de Emergencia Activado", {
        description: `Se registró en la bitácora clínica la activación del protocolo para ${caseItem.studentName || caseItem.initials}.`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error("Error al registrar protocolo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-rose-200 dark:border-rose-900 bg-card">
        <form onSubmit={handleActivate}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-rose-500/15 text-rose-600">
                <ShieldAlert className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-display text-rose-600 dark:text-rose-400">
                  Protocolo de Atención en Crisis — Caso {caseItem.initials}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Acciones prioritarias y registro de intervención urgente
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-4 text-sm">
            {/* Canales de apoyo directo */}
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 p-4 space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <AlertOctagon className="size-3.5" />
                Líneas de canalización inmediata
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <a
                  href="tel:8009112000"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-rose-300 transition-colors"
                >
                  <div>
                    <p className="font-bold text-foreground">Línea de la Vida</p>
                    <p className="text-[10px] text-muted-foreground">800 911 2000 (24h)</p>
                  </div>
                  <PhoneCall className="size-4 text-rose-600" />
                </a>

                <a
                  href="tel:5558290000"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-rose-300 transition-colors"
                >
                  <div>
                    <p className="font-bold text-foreground">Servicio Médico TESH</p>
                    <p className="text-[10px] text-muted-foreground">Edificio A, Ext. 109</p>
                  </div>
                  <PhoneCall className="size-4 text-teal" />
                </a>
              </div>
            </div>

            {/* Bitácora de la intervención */}
            <div className="space-y-1.5">
              <Label htmlFor="crisis-details" className="text-xs font-semibold text-foreground">
                Detalles de las medidas tomadas y acuerdos de contención
              </Label>
              <Textarea
                id="crisis-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                className="rounded-xl border-border bg-background text-xs"
                required
              />
            </div>
          </div>

          <DialogFooter className="mt-5 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-rose-600 text-white hover:bg-rose-700 gap-1.5"
            >
              <CheckCircle2 className="size-4" />
              <span>Registrar Activación Oficial</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
