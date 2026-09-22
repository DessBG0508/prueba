import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  CheckCircle2,
  XCircle,
  CalendarPlus,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockAppointments } from "@/lib/mock-data";
import type { Appointment, AppointmentStatus } from "@/lib/types";

interface PsychologistAgendaProps {
  onScheduleNew: () => void;
}

const STORAGE_KEY = "equilibra_citas_v1";

const statusStyles: Record<AppointmentStatus, { label: string; surface: string }> = {
  confirmada: { label: "Confirmada", surface: "bg-teal/15 text-teal border-teal/30" },
  pendiente: { label: "Pendiente", surface: "bg-amber-100 text-amber-800 border-amber-300" },
  realizada: { label: "Realizada", surface: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  cancelada: { label: "Cancelada", surface: "bg-rose-100 text-rose-800 border-rose-300" },
};

export function PsychologistAgenda({ onScheduleNew }: PsychologistAgendaProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    return mockAppointments;
  });

  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    } catch (e) {
      console.error(e);
    }
  }, [appointments]);

  const handleUpdateStatus = (id: string, newStatus: AppointmentStatus) => {
    const updated = appointments.map((a) => (a.id === id ? { ...a, status: newStatus } : a));
    setAppointments(updated);
    toast.success(
      newStatus === "realizada"
        ? "Cita marcada como realizada"
        : newStatus === "cancelada"
          ? "Cita cancelada"
          : "Estado de cita actualizado",
    );
  };

  const filteredAppointments = appointments.filter((a) => {
    if (filter === "upcoming") {
      return a.status === "confirmada" || a.status === "pendiente";
    }
    if (filter === "past") {
      return a.status === "realizada" || a.status === "cancelada";
    }
    return true;
  });

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

      {/* Filtros de la agenda */}
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
          Próximas (
          {appointments.filter((a) => a.status === "confirmada" || a.status === "pendiente").length}
          )
        </Button>
        <Button
          size="sm"
          variant={filter === "past" ? "default" : "outline"}
          onClick={() => setFilter("past")}
          className={`h-8 rounded-lg text-xs ${
            filter === "past" ? "bg-accent text-accent-foreground" : "bg-card/70"
          }`}
        >
          Historial (
          {appointments.filter((a) => a.status === "realizada" || a.status === "cancelada").length})
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

            return (
              <div
                key={apt.id}
                className="ethereal-card p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-border/80"
              >
                <div className="space-y-2">
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
                    <h3 className="font-display text-lg text-primary">{apt.date}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{apt.locationOrLink}</p>
                    {apt.notes && (
                      <p className="text-xs text-foreground font-medium mt-1.5 bg-muted/30 p-2 rounded-lg">
                        {apt.notes}
                      </p>
                    )}
                  </div>
                </div>

                {isUpcoming && (
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(apt.id, "realizada")}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-semibold"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Completada</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(apt.id, "cancelada")}
                      className="rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs h-8 gap-1.5"
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
    </div>
  );
}
