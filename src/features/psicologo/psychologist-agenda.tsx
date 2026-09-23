import { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  CheckCircle2,
  XCircle,
  CalendarPlus,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getStoredAppointments,
  completeAppointment,
  cancelAppointment,
} from "@/lib/psychologist-store";
import type { Appointment, AppointmentStatus } from "@/lib/types";

interface PsychologistAgendaProps {
  appointments?: Appointment[];
  onScheduleNew: () => void;
  onAppointmentsChange?: () => void;
}

const statusStyles: Record<AppointmentStatus, { label: string; surface: string }> = {
  confirmada: { label: "Confirmada", surface: "bg-teal/15 text-teal border-teal/30" },
  pendiente: { label: "Pendiente", surface: "bg-amber-100 text-amber-800 border-amber-300" },
  realizada: { label: "Realizada", surface: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  cancelada: { label: "Cancelada", surface: "bg-rose-100 text-rose-800 border-rose-300" },
};

function formatFriendlyDate(dateStr: string) {
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const dateObj = new Date(year, month - 1, day);
    const formatted = dateObj.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return dateStr;
  }
}

export function PsychologistAgenda({
  appointments: externalAppointments,
  onScheduleNew,
  onAppointmentsChange,
}: PsychologistAgendaProps) {
  const [internalAppointments, setInternalAppointments] = useState<Appointment[]>(() =>
    getStoredAppointments(),
  );

  const appointments = externalAppointments || internalAppointments;

  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [completingApt, setCompletingApt] = useState<Appointment | null>(null);
  const [cancellingApt, setCancellingApt] = useState<Appointment | null>(null);

  const upcomingCount = useMemo(
    () => appointments.filter((a) => a.status === "confirmada" || a.status === "pendiente").length,
    [appointments],
  );

  const pastCount = useMemo(
    () => appointments.filter((a) => a.status === "realizada" || a.status === "cancelada").length,
    [appointments],
  );

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (filter === "upcoming") {
        return a.status === "confirmada" || a.status === "pendiente";
      }
      if (filter === "past") {
        return a.status === "realizada" || a.status === "cancelada";
      }
      return true;
    });
  }, [appointments, filter]);

  const handleConfirmComplete = () => {
    if (!completingApt) return;
    const result = completeAppointment(completingApt.id);
    setInternalAppointments(result.appointments);
    setCompletingApt(null);
    setFilter("past");
    onAppointmentsChange?.();
    toast.success("Sesión completada y registrada en bitácora");
  };

  const handleConfirmCancel = () => {
    if (!cancellingApt) return;
    const updated = cancelAppointment(cancellingApt.id);
    setInternalAppointments(updated);
    setCancellingApt(null);
    setFilter("past");
    onAppointmentsChange?.();
    toast.success("Cita cancelada");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-primary">Agenda de Citas</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Gestiona tus sesiones de acompañamiento psicológico presenciales y en línea.
          </p>
        </div>

        <Button
          type="button"
          onClick={onScheduleNew}
          className="rounded-xl bg-teal text-white hover:bg-teal/90 gap-1.5 shadow-sm text-xs font-semibold h-9"
        >
          <CalendarPlus className="size-4" />
          <span>+ Agendar Cita con Paciente</span>
        </Button>
      </div>

      {/* Filtros unificados de la agenda */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className={`h-8 rounded-lg text-xs ${
            filter === "all" ? "bg-primary text-primary-foreground" : "bg-card/70"
          }`}
        >
          Todas ({appointments.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "upcoming" ? "default" : "outline"}
          onClick={() => setFilter("upcoming")}
          className={`h-8 rounded-lg text-xs ${
            filter === "upcoming" ? "bg-teal text-white" : "bg-card/70"
          }`}
        >
          Próximas ({upcomingCount})
        </Button>
        <Button
          size="sm"
          variant={filter === "past" ? "default" : "outline"}
          onClick={() => setFilter("past")}
          className={`h-8 rounded-lg text-xs ${
            filter === "past" ? "bg-accent text-accent-foreground" : "bg-card/70"
          }`}
        >
          Historial ({pastCount})
        </Button>
      </div>

      {/* Lista de citas */}
      <div className="grid gap-3">
        {filteredAppointments.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
            <Calendar className="size-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No hay citas en este filtro</p>
            <p className="text-xs text-muted-foreground mt-1">
              Programa una sesión con tus estudiantes para brindarles acompañamiento.
            </p>
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const statusStyle = statusStyles[apt.status] || statusStyles.pendiente;
            const isUpcoming = apt.status === "confirmada" || apt.status === "pendiente";
            const isCancelled = apt.status === "cancelada";

            return (
              <div
                key={apt.id}
                className={`ethereal-card p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border transition-all ${
                  isCancelled
                    ? "opacity-75 bg-muted/20 border-rose-200/50 dark:border-rose-950/40"
                    : "border-border/80 hover:border-border"
                }`}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`${statusStyle.surface} text-xs font-bold`}>
                      {statusStyle.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-card text-muted-foreground border-border text-xs"
                    >
                      {apt.modality === "presencial" ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-rose-500" /> Presencial
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Video className="size-3 text-teal" /> En Línea
                        </span>
                      )}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                      <Clock className="size-3" />
                      {apt.timeSlot}
                    </span>
                  </div>

                  <div>
                    {/* Nombre del paciente en fuente serif cursiva display legible sin elementos encimados */}
                    <h3 className="font-display italic text-lg sm:text-xl font-semibold text-primary tracking-tight">
                      {apt.studentName || "Paciente TESH"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5 font-medium">
                      <span className="font-semibold text-foreground">
                        {formatFriendlyDate(apt.date)}
                      </span>
                      <span>•</span>
                      <span>{apt.locationOrLink}</span>
                    </div>

                    {apt.notes && (
                      <p className="text-xs text-foreground font-medium mt-2 bg-muted/30 p-2.5 rounded-xl border border-border/40">
                        {apt.notes}
                      </p>
                    )}
                  </div>
                </div>

                {isUpcoming && (
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Button
                      size="sm"
                      onClick={() => setCompletingApt(apt)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-semibold shadow-xs"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Marcar completada</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCancellingApt(apt)}
                      className="rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs h-8 gap-1.5 font-medium"
                    >
                      <XCircle className="size-3.5" />
                      <span>Cancelar</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal de confirmación para Marcar Completada */}
      <AlertDialog
        open={completingApt !== null}
        onOpenChange={(open) => {
          if (!open) setCompletingApt(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-primary flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              ¿Deseas marcar esta sesión como completada?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Al confirmar, la sesión con{" "}
              <strong className="text-foreground">
                {completingApt?.studentName || "el paciente"}
              </strong>{" "}
              se moverá al historial de citas y se registrará automáticamente una nota de evolución
              en la bitácora clínica confidencial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl text-xs h-9">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmComplete}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmación para Cancelar Cita */}
      <AlertDialog
        open={cancellingApt !== null}
        onOpenChange={(open) => {
          if (!open) setCancellingApt(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl text-destructive flex items-center gap-2">
              <AlertCircle className="size-5 text-rose-600" />
              ¿Estás seguro de cancelar esta cita?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Esta acción marcará la cita con{" "}
              <strong className="text-foreground">
                {cancellingApt?.studentName || "el paciente"}
              </strong>{" "}
              como cancelada. El paciente será notificado y la cita quedará registrada en el
              historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl text-xs h-9">Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 font-semibold"
            >
              Confirmar cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
