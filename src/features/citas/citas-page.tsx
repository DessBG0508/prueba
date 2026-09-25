import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { appointmentIcons } from "@/config/icons";
import { mockAppointments } from "@/lib/mock-data";
import type { Appointment, AppointmentModality } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "equilibra_citas_v1";

const TIME_SLOTS = [
  { slot: "09:00 - 09:50", occupied: false },
  { slot: "10:00 - 10:50", occupied: true },
  { slot: "11:00 - 11:50", occupied: false },
  { slot: "12:00 - 12:50", occupied: false },
  { slot: "14:00 - 14:50", occupied: true },
  { slot: "15:00 - 15:50", occupied: false },
  { slot: "16:00 - 16:50", occupied: false },
];

const PSYCHOLOGISTS = [
  {
    name: "Dra. Marta Gómez",
    role: "Psicóloga clínica y bienestar estudiantil",
    office: "Consultorio 3, Edificio de Bienestar Integral TESH",
  },
  {
    name: "Lic. Carlos Fuentes",
    role: "Orientación psicológica y manejo del estrés",
    office: "Consultorio 1, Edificio de Bienestar Integral TESH",
  },
];

function formatDateDisplay(dateStr: string) {
  try {
    const parts = dateStr.split("-").map(Number);
    const year = parts[0] ?? 2026;
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function CitasPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Fallback
    }
    return mockAppointments;
  });

  // Modal de Agendar / Reprogramar
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>("2026-09-28");
  const [selectedSlot, setSelectedSlot] = useState<string>("11:00 - 11:50");
  const [selectedModality, setSelectedModality] = useState<AppointmentModality>("presencial");
  const [selectedPsychologist, setSelectedPsychologist] = useState<string>("Dra. Marta Gómez");

  // Modal de Éxito
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // Modal de Cancelar
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    } catch (e) {
      console.error("Error al persistir citas", e);
    }
  }, [appointments]);

  const upcomingAppointments = appointments.filter(
    (a) => a.status === "confirmada" || a.status === "pendiente",
  );
  const historyAppointments = appointments.filter(
    (a) => a.status === "realizada" || a.status === "cancelada",
  );

  const handleOpenNewAppointment = () => {
    setEditingAppointment(null);
    setSelectedDate("2026-09-28");
    setSelectedSlot("11:00 - 11:50");
    setSelectedModality("presencial");
    setSelectedPsychologist("Dra. Marta Gómez");
    setIsFormOpen(true);
  };

  const handleOpenReschedule = (apt: Appointment) => {
    setEditingAppointment(apt);
    setSelectedDate(apt.date);
    setSelectedSlot(apt.timeSlot);
    setSelectedModality(apt.modality);
    setSelectedPsychologist(apt.psychologistName);
    setIsFormOpen(true);
  };

  const handleConfirmForm = () => {
    // Validación estricta en cliente de fecha, horario y modalidad
    if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      toast.error("Por favor selecciona una fecha válida para tu cita.");
      return;
    }

    if (!selectedSlot || !selectedSlot.includes(":")) {
      toast.error("Por favor selecciona un horario disponible.");
      return;
    }

    if (selectedModality !== "presencial" && selectedModality !== "en-linea") {
      toast.error("Por favor selecciona una modalidad válida (presencial o en línea).");
      return;
    }

    const defaultPsych = PSYCHOLOGISTS[0]!;
    const psychInfo = PSYCHOLOGISTS.find((p) => p.name === selectedPsychologist) ?? defaultPsych;
    const location =
      selectedModality === "presencial"
        ? psychInfo.office
        : "Enlace de videollamada institucional segura";

    if (editingAppointment) {
      // Reprogramar
      setAppointments((prev) =>
        prev.map((item) =>
          item.id === editingAppointment.id
            ? {
                ...item,
                date: selectedDate,
                timeSlot: selectedSlot,
                modality: selectedModality,
                psychologistName: psychInfo.name,
                psychologistRole: psychInfo.role,
                locationOrLink: location,
                status: "confirmada",
              }
            : item,
        ),
      );
      setIsFormOpen(false);
      setShowSuccessOverlay(true);
    } else {
      // Nueva Cita
      const newApt: Appointment = {
        id: `apt-${Date.now()}`,
        date: selectedDate,
        timeSlot: selectedSlot,
        modality: selectedModality,
        psychologistName: psychInfo.name,
        psychologistRole: psychInfo.role,
        locationOrLink: location,
        status: "confirmada",
        createdAt: new Date().toISOString(),
      };
      setAppointments((prev) => [newApt, ...prev]);
      setIsFormOpen(false);
      setShowSuccessOverlay(true);
    }
  };

  const handleConfirmCancel = () => {
    if (!appointmentToCancel) return;

    setAppointments((prev) =>
      prev.map((item) =>
        item.id === appointmentToCancel.id ? { ...item, status: "cancelada" } : item,
      ),
    );
    const cancelledName = appointmentToCancel.psychologistName;
    setAppointmentToCancel(null);
    toast.success("Cita cancelada con éxito", {
      description: "No pasa nada, puedes reagendar cuando quieras.",
    });
  };

  // Generador de días del mes actual para el selector (Septiembre 2026, días 22 a 30)
  const availableDays = [
    { day: "22", weekday: "Mar", fullDate: "2026-09-22" },
    { day: "23", weekday: "Mié", fullDate: "2026-09-23" },
    { day: "24", weekday: "Jue", fullDate: "2026-09-24" },
    { day: "25", weekday: "Vie", fullDate: "2026-09-25" },
    { day: "28", weekday: "Lun", fullDate: "2026-09-28" },
    { day: "29", weekday: "Mar", fullDate: "2026-09-29" },
    { day: "30", weekday: "Mié", fullDate: "2026-09-30" },
  ];

  return (
    <PageShell>
      <main className="space-y-8 animate-fade-in pb-16">
        {/* Encabezado de la página */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-accent mb-1">
              <appointmentIcons.calendar className="size-3.5" />
              <span>Acompañamiento psicológico</span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Mis sesiones de orientación
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground leading-relaxed">
              Reserva un espacio confidencial con los profesionales del TESH para cuidar de tu
              bienestar integral.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleOpenNewAppointment}
            className="h-11 gap-2 rounded-2xl bg-[#6857E4] px-5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-[#5746d8] hover:scale-[1.02] active:scale-[0.98]"
          >
            <appointmentIcons.calendarPlus className="size-4" />
            <span>Nueva cita</span>
          </Button>
        </section>

        {/* Sección 1: Próximas Citas */}
        <section aria-labelledby="upcoming-title" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="upcoming-title" className="font-display text-xl font-bold text-foreground">
              Próximas citas
            </h2>
            <span className="text-xs font-semibold text-muted-foreground">
              {upcomingAppointments.length} agendada
              {upcomingAppointments.length === 1 ? "" : "s"}
            </span>
          </div>

          {upcomingAppointments.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingAppointments.map((apt) => (
                <article
                  key={apt.id}
                  className="ethereal-card flex flex-col justify-between p-5 sm:p-6 transition-all hover:border-accent/30"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`rounded-xl px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          apt.status === "confirmada"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {apt.status === "confirmada" ? "Confirmada" : "Pendiente"}
                      </Badge>

                      <Badge
                        variant="secondary"
                        className="gap-1 rounded-xl bg-muted/80 text-[11px] font-medium text-muted-foreground"
                      >
                        {apt.modality === "presencial" ? (
                          <>
                            <appointmentIcons.mapPin className="size-3 text-accent" />
                            <span>Presencial</span>
                          </>
                        ) : (
                          <>
                            <appointmentIcons.video className="size-3 text-accent" />
                            <span>En línea</span>
                          </>
                        )}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-foreground capitalize">
                        {formatDateDisplay(apt.date)}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-accent">
                        <appointmentIcons.clock className="size-3.5" />
                        <span>{apt.timeSlot}</span>
                      </div>
                    </div>

                    <div className="space-y-1 rounded-xl bg-background/60 p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <appointmentIcons.user className="size-3.5 text-accent" />
                        <span>{apt.psychologistName}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {apt.psychologistRole || "Psicología TESH"}
                      </p>
                      <p className="pt-1 text-[11px] text-muted-foreground/90 border-t border-border/40">
                        {apt.locationOrLink}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAppointmentToCancel(apt)}
                      className="h-8 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <appointmentIcons.calendarX className="mr-1.5 size-3.5" />
                      <span>Cancelar</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReschedule(apt)}
                      className="h-8 rounded-xl border-accent/40 text-xs font-semibold text-accent hover:bg-accent/10"
                    >
                      <appointmentIcons.refresh className="mr-1.5 size-3.5" />
                      <span>Reprogramar</span>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            /* Estado vacío ilustrado con shape custom (nube suave) */
            <div className="ethereal-card flex flex-col items-center justify-center p-8 text-center sm:p-12">
              {/* Custom SVG soft cloud shape */}
              <div
                className="relative mb-5 flex size-28 items-center justify-center rounded-full bg-lavender-soft text-accent/80"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 100 70"
                  className="size-20 fill-accent/20 stroke-accent stroke-[2.5]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M25,55 C12,55 5,45 8,33 C10,23 20,18 29,22 C34,10 49,6 60,15 C70,7 86,13 88,27 C96,30 98,42 92,50 C87,56 79,55 75,55 Z"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
                <appointmentIcons.calendar className="absolute size-8 text-accent" />
              </div>

              <h3 className="font-display text-xl font-bold text-foreground">
                Aún no tienes citas
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
                Dar el primer paso también es un acto de cuidado. Cuando sientas que es el momento,
                aquí estaremos para ti.
              </p>

              <Button
                type="button"
                onClick={handleOpenNewAppointment}
                className="mt-6 h-11 gap-2 rounded-2xl bg-[#6857E4] px-6 text-sm font-semibold text-white shadow-soft transition-transform hover:scale-105 active:scale-95"
              >
                <appointmentIcons.calendarPlus className="size-4" />
                <span>Agendar primera cita</span>
              </Button>
            </div>
          )}
        </section>

        {/* Sección 2: Historial de Citas */}
        <section aria-labelledby="history-title" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="history-title" className="font-display text-xl font-bold text-foreground">
              Historial de sesiones
            </h2>
            <span className="text-xs font-semibold text-muted-foreground">
              {historyAppointments.length} anterior
              {historyAppointments.length === 1 ? "" : "es"}
            </span>
          </div>

          {historyAppointments.length > 0 ? (
            <div className="space-y-3">
              {historyAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/75 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                        apt.status === "realizada"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {apt.status === "realizada" ? (
                        <appointmentIcons.checkCircle className="size-5" />
                      ) : (
                        <appointmentIcons.xCircle className="size-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground capitalize">
                          {formatDateDisplay(apt.date)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`rounded-lg px-2 py-0 text-[10px] font-bold uppercase tracking-wider ${
                            apt.status === "realizada"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {apt.status === "realizada" ? "Realizada" : "Cancelada"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {apt.timeSlot} • Con {apt.psychologistName} (
                        {apt.modality === "presencial" ? "Presencial" : "En línea"})
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenReschedule(apt)}
                      className="h-8 rounded-xl text-xs font-semibold text-accent hover:bg-accent/10"
                    >
                      <appointmentIcons.calendarPlus className="mr-1.5 size-3.5" />
                      <span>Volver a agendar</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No tienes sesiones anteriores registradas en tu historial.
            </p>
          )}
        </section>
      </main>

      {/* Modal / Dialog de Agendamiento y Reprogramación */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-accent mb-1">
              <appointmentIcons.sparkles className="size-3.5" />
              <span>{editingAppointment ? "Actualizar sesión" : "Agendar nueva sesión"}</span>
            </div>
            <DialogTitle className="font-display text-2xl font-bold text-primary">
              {editingAppointment ? "Reprogramar cita" : "Elige tu espacio de apoyo"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecciona el día, horario y modalidad que mejor se adapte a tu ritmo escolar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 1. Selector de fecha (Septiembre 2026) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                1. Fecha disponible (Septiembre 2026)
              </label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {availableDays.map((item) => {
                  const isSelected = selectedDate === item.fullDate;
                  return (
                    <button
                      key={item.fullDate}
                      type="button"
                      onClick={() => setSelectedDate(item.fullDate)}
                      className={`flex flex-col items-center justify-center rounded-xl p-2 transition-all ${
                        isSelected
                          ? "bg-[#6857E4] text-white shadow-soft font-bold scale-105"
                          : "border border-border/70 bg-card hover:border-accent/40 text-foreground"
                      }`}
                    >
                      <span className="text-[10px] opacity-80 uppercase">{item.weekday}</span>
                      <span className="text-sm font-bold">{item.day}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Selector de horario (Chips de 50 min) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                2. Horario disponible (Sesión de 50 min)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.map(({ slot, occupied }) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={occupied}
                      onClick={() => setSelectedSlot(slot)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all ${
                        occupied
                          ? "border border-border/40 bg-muted/40 text-muted-foreground/40 cursor-not-allowed opacity-60"
                          : isSelected
                            ? "bg-[#6857E4] text-white font-bold shadow-soft"
                            : "border border-border/80 bg-card text-foreground hover:border-accent"
                      }`}
                    >
                      <span>{slot}</span>
                      {occupied ? (
                        <span className="text-[10px] italic">Ocupado</span>
                      ) : isSelected ? (
                        <appointmentIcons.check className="size-3.5" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Selector de Modalidad */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                3. Modalidad
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedModality("presencial")}
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold transition-all ${
                    selectedModality === "presencial"
                      ? "border-2 border-[#6857E4] bg-lavender-soft text-primary font-bold"
                      : "border border-border/70 bg-card text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <appointmentIcons.mapPin className="size-4 text-accent" />
                  <div className="text-left">
                    <p className="text-xs">Presencial</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Campus TESH</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedModality("en-linea")}
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold transition-all ${
                    selectedModality === "en-linea"
                      ? "border-2 border-[#6857E4] bg-lavender-soft text-primary font-bold"
                      : "border border-border/70 bg-card text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <appointmentIcons.video className="size-4 text-accent" />
                  <div className="text-left">
                    <p className="text-xs">En línea</p>
                    <p className="text-[10px] text-muted-foreground font-normal">Videollamada</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 4. Profesional asignado */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                4. Especialista disponible
              </label>
              <div className="space-y-2">
                {PSYCHOLOGISTS.map((p) => {
                  const isSelected = selectedPsychologist === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setSelectedPsychologist(p.name)}
                      className={`w-full rounded-xl p-3 text-left transition-all ${
                        isSelected
                          ? "border-2 border-[#6857E4] bg-lavender-soft"
                          : "border border-border/70 bg-card hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{p.name}</span>
                        {isSelected && <appointmentIcons.check className="size-4 text-accent" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{p.role}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmForm}
              className="rounded-xl bg-[#6857E4] text-white hover:bg-[#5847d5]"
            >
              {editingAppointment ? "Confirmar reprogramación" : "Confirmar cita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overlay de Éxito al confirmar */}
      <Dialog open={showSuccessOverlay} onOpenChange={setShowSuccessOverlay}>
        <DialogContent className="max-w-md rounded-3xl p-6 text-center shadow-2xl sm:p-8">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <appointmentIcons.checkCircle className="size-8" />
          </div>
          <DialogTitle className="font-display text-2xl font-bold text-foreground">
            Cita confirmada
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Tu cita quedó agendada. Te llegará confirmación por correo con los detalles y las
            instrucciones de acceso.
          </DialogDescription>

          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              onClick={() => setShowSuccessOverlay(false)}
              className="h-11 rounded-2xl bg-[#6857E4] px-8 text-sm font-semibold text-white shadow-soft"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación para Cancelar */}
      <Dialog
        open={Boolean(appointmentToCancel)}
        onOpenChange={(open) => !open && setAppointmentToCancel(null)}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-destructive/15 p-3 text-destructive">
              <appointmentIcons.alert className="size-6" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="font-display text-xl font-bold text-foreground">
                ¿Deseas cancelar esta cita?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                No pasa nada, puedes reagendar cuando quieras. Tu bienestar va a tu propio ritmo.
              </DialogDescription>
            </div>
          </div>

          <DialogFooter className="mt-6 flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAppointmentToCancel(null)}
              className="rounded-xl text-xs font-semibold"
            >
              Mantener cita
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmCancel}
              className="rounded-xl text-xs font-semibold"
            >
              Sí, cancelar cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
