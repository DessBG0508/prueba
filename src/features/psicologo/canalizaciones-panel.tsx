import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Clock, RefreshCw, UserCheck, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import {
  getCanalizaciones,
  updateCanalizacionEstado,
  type CanalizacionEstado,
  type CanalizacionPrioridad,
  type CanalizacionRecord,
} from "@/features/tutor/tutor-service";

interface CanalizacionesPanelProps {
  onPendingCountChange?: (count: number) => void;
}

const PRIORIDAD_BADGE: Record<CanalizacionPrioridad, string> = {
  baja: "border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  normal: "border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  alta: "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  urgente: "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
};

const ESTADO_BADGE: Record<CanalizacionEstado, { label: string; cls: string }> = {
  pendiente: {
    label: "Pendiente",
    cls: "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  aceptada: {
    label: "Aceptada",
    cls: "border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  },
  completada: {
    label: "Completada",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  rechazada: {
    label: "Rechazada",
    cls: "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

function formatFecha(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Reciente";
    return format(d, "dd MMM yyyy, HH:mm", { locale: es });
  } catch {
    return "Reciente";
  }
}

export function CanalizacionesPanel({ onPendingCountChange }: CanalizacionesPanelProps) {
  const { user } = useAuth();
  const [canalizaciones, setCanalizaciones] = useState<CanalizacionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<CanalizacionEstado>("pendiente");
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal de rechazo con motivo
  const [rejectTarget, setRejectTarget] = useState<CanalizacionRecord | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getCanalizaciones();
      setCanalizaciones(list);
      const pendingCount = list.filter((c) => c.estado === "pendiente").length;
      onPendingCountChange?.(pendingCount);
    } catch (err) {
      console.error("Error cargando canalizaciones:", err);
      toast.error("No se pudieron cargar las canalizaciones.");
    } finally {
      setIsLoading(false);
    }
  }, [onPendingCountChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const counts = useMemo(
    () => ({
      pendiente: canalizaciones.filter((c) => c.estado === "pendiente").length,
      aceptada: canalizaciones.filter((c) => c.estado === "aceptada").length,
      completada: canalizaciones.filter((c) => c.estado === "completada").length,
      rechazada: canalizaciones.filter((c) => c.estado === "rechazada").length,
    }),
    [canalizaciones],
  );

  const visibleList = useMemo(
    () => canalizaciones.filter((c) => c.estado === activeTab),
    [canalizaciones, activeTab],
  );

  const handleAccept = async (item: CanalizacionRecord) => {
    setProcessingId(item.id);
    try {
      const res = await updateCanalizacionEstado({
        id: item.id,
        estado: "aceptada",
        psicologo_id: user?.id || null,
        psicologo_nombre: user?.name || "Dra. Marta Gómez",
      });

      if (!res.ok) {
        toast.error(res.error || "No se pudo aceptar la canalización.");
        return;
      }

      toast.success(`Canalización de ${item.estudiante_nombre || "estudiante"} aceptada.`);
      await loadData();
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (item: CanalizacionRecord) => {
    setProcessingId(item.id);
    try {
      const res = await updateCanalizacionEstado({
        id: item.id,
        estado: "completada",
        psicologo_id: user?.id || item.psicologo_id || null,
        psicologo_nombre: user?.name || item.psicologo_nombre || "Dra. Marta Gómez",
      });

      if (!res.ok) {
        toast.error(res.error || "No se pudo completar la canalización.");
        return;
      }

      toast.success("Canalización marcada como completada.");
      await loadData();
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectMotivo.trim()) {
      toast.error("Indica el motivo del rechazo.");
      return;
    }

    setProcessingId(rejectTarget.id);
    try {
      const res = await updateCanalizacionEstado({
        id: rejectTarget.id,
        estado: "rechazada",
        psicologo_id: user?.id || null,
        psicologo_nombre: user?.name || "Dra. Marta Gómez",
        motivo_rechazo: rejectMotivo.trim(),
      });

      if (!res.ok) {
        toast.error(res.error || "No se pudo rechazar la canalización.");
        return;
      }

      toast.info("Canalización rechazada con motivo registrado.");
      setRejectTarget(null);
      setRejectMotivo("");
      await loadData();
    } finally {
      setProcessingId(null);
    }
  };

  const tabs: Array<{ id: CanalizacionEstado; label: string; count: number }> = [
    { id: "pendiente", label: "Pendientes", count: counts.pendiente },
    { id: "aceptada", label: "Aceptadas", count: counts.aceptada },
    { id: "completada", label: "Completadas", count: counts.completada },
    { id: "rechazada", label: "Rechazadas", count: counts.rechazada },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
            Canalizaciones de Tutores
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Revisa solicitudes de canalización enviadas por tutores y jefaturas académicas.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadData}
          className="rounded-xl text-xs font-semibold w-fit"
        >
          <RefreshCw className={`mr-1.5 size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Pestañas de estado */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl text-xs font-bold ${
                isActive
                  ? "bg-[#1B198F] text-white hover:bg-[#1B198F]/90"
                  : "border-border text-foreground hover:bg-muted"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Lista de canalizaciones filtradas */}
      {visibleList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center space-y-2">
          <ClipboardCheck className="mx-auto size-8 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">
            No hay canalizaciones en estado "{ESTADO_BADGE[activeTab].label}"
          </p>
          <p className="text-xs text-muted-foreground">
            Las nuevas solicitudes enviadas por los tutores aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleList.map((item) => {
            const estadoInfo = ESTADO_BADGE[item.estado];
            const prioClass = PRIORIDAD_BADGE[item.prioridad] || PRIORIDAD_BADGE.normal;
            const isBusy = processingId === item.id;

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                        {item.estudiante_nombre || "Estudiante TESH"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.carrera || "Carrera TESH"} {item.grupo ? `• Grupo ${item.grupo}` : ""}{" "}
                        {item.folio ? `• Folio ${item.folio}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className={`${prioClass} text-[11px] font-bold capitalize`}
                      >
                        Prioridad {item.prioridad}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`${estadoInfo.cls} text-[10px] font-semibold`}
                      >
                        {estadoInfo.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-foreground leading-relaxed">
                    <p className="font-bold text-muted-foreground uppercase text-[10px] mb-1">
                      Motivo de canalización
                    </p>
                    {item.motivo}
                  </div>

                  {item.estado === "rechazada" && item.motivo_rechazo && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20 p-2.5 text-xs text-rose-700 dark:text-rose-300">
                      <span className="font-bold">Motivo de rechazo: </span>
                      {item.motivo_rechazo}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>
                      Tutor:{" "}
                      <strong className="text-foreground">
                        {item.tutor_nombre || "Tutor asignado"}
                      </strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatFecha(item.created_at)}
                    </span>
                  </div>
                </div>

                {/* Botones de acción según estado */}
                {item.estado === "pendiente" && (
                  <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleAccept(item)}
                      className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-semibold h-9"
                    >
                      <UserCheck className="mr-1.5 size-3.5" />
                      Aceptar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => {
                        setRejectTarget(item);
                        setRejectMotivo("");
                      }}
                      className="rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30 text-xs font-semibold h-9"
                    >
                      <XCircle className="mr-1.5 size-3.5" />
                      Rechazar
                    </Button>
                  </div>
                )}

                {item.estado === "aceptada" && (
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      Asignado a:{" "}
                      <strong className="text-foreground">
                        {item.psicologo_nombre || user?.name || "Psicología"}
                      </strong>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleComplete(item)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8"
                    >
                      <CheckCircle2 className="mr-1.5 size-3.5" />
                      Marcar completada
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal para ingresar motivo de rechazo */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Rechazar canalización
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Indica al tutor el motivo del rechazo o redirección correspondiente para{" "}
              {rejectTarget?.estudiante_nombre || "este estudiante"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="motivo-rechazo" className="text-xs font-bold">
              Motivo del rechazo
            </Label>
            <Textarea
              id="motivo-rechazo"
              rows={3}
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              placeholder="Ej. El estudiante ya cuenta con seguimiento activo en otro horario o requiere canalización académica..."
              className="rounded-xl text-xs sm:text-sm"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectTarget(null)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={processingId !== null}
              onClick={handleConfirmReject}
              className="rounded-xl text-xs font-semibold"
            >
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
