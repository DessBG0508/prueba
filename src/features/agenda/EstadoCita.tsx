import React, { useState } from "react";
import { AgendaBadge } from "./AgendaBadge";
import type { SolicitudCita } from "./types";
import { verificarVentanaCancelacion } from "./types";
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Bell,
  Ban,
  RotateCcw,
} from "lucide-react";

interface EstadoCitaProps {
  cita: SolicitudCita;
  onCancelarCita: (citaId: string, motivo?: string) => Promise<void>;
  onNuevaSolicitud?: () => void;
  isCanceling?: boolean;
}

export const EstadoCita: React.FC<EstadoCitaProps> = ({
  cita,
  onCancelarCita,
  onNuevaSolicitud,
  isCanceling = false,
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");

  const ventana = verificarVentanaCancelacion(cita.fecha_cita, cita.hora_cita);

  const statusConfig = {
    pendiente: {
      badge: "Pendiente de confirmación",
      bgBadge: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
      icon: Clock,
      desc: "Tu solicitud ha sido enviada al psicólogo del TESH. Recibirás confirmación en breve.",
    },
    confirmada: {
      badge: "Cita Confirmada",
      bgBadge: "bg-teal/15 text-teal border border-teal/30",
      icon: CheckCircle2,
      desc: "El psicólogo ha confirmado tu espacio presencial. Te esperamos en el Edificio de Bienestar Integral.",
    },
    cancelada: {
      badge: "Cita Cancelada",
      bgBadge: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
      icon: XCircle,
      desc: cita.motivo_cancelacion
        ? `Cancelada (${cita.cancelado_por || "sistema"}): ${cita.motivo_cancelacion}`
        : "La sesión ha sido cancelada.",
    },
    completada: {
      badge: "Sesión Realizada",
      bgBadge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
      icon: CheckCircle2,
      desc: "Sesión completada y registrada en tu expediente de acompañamiento.",
    },
    no_asistio: {
      badge: "Inasistencia registrada",
      bgBadge: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
      icon: AlertCircle,
      desc: "Inasistencia a la cita presencial programada.",
    },
  };

  const current = statusConfig[cita.estado] || statusConfig.pendiente;
  const StatusIcon = current.icon;

  const handleConfirmCancel = async () => {
    await onCancelarCita(cita.id, motivoCancelacion);
    setShowCancelConfirm(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#d8d2ff] bg-white p-5 shadow-xs dark:border-indigo-950/60 dark:bg-[#1a1b35] sm:p-7 space-y-6">
        {/* Banner de Estado Principal (AUTO) */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6857E4]/10 text-[#6857E4]">
                <StatusIcon className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Estado de la cita:
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${current.bgBadge}`}
                >
                  {current.badge}
                </span>
              </div>
            </div>
            <AgendaBadge tipo="AUTO" />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{current.desc}</p>
        </div>

        {/* Detalles: Fecha y hora (AUTO) */}
        <div className="grid grid-cols-1 gap-4 divide-y divide-border/60 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
          <div className="flex items-center justify-between pb-3 sm:pb-0 sm:pr-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Fecha y hora:
              </span>
              <p className="font-display text-sm font-bold text-foreground">
                {cita.fecha_cita} a las {cita.hora_cita} hrs
              </p>
            </div>
            <AgendaBadge tipo="AUTO" />
          </div>

          <div className="flex items-center justify-between pt-3 sm:pt-0 sm:pl-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Modalidad y Lugar:
              </span>
              <p className="text-xs font-semibold text-foreground">
                Presencial · Consultorio Bienestar TESH
              </p>
            </div>
            <AgendaBadge tipo="AUTO" />
          </div>
        </div>

        {/* Notificación (AUTO) */}
        <div className="flex items-center justify-between rounded-2xl bg-indigo-50/70 p-4 text-xs text-indigo-950 dark:bg-indigo-950/30 dark:text-indigo-200">
          <div className="flex items-center gap-2.5">
            <Bell className="size-4 text-[#6857E4] shrink-0" />
            <span>Notificación: Alerta en app enviada + aviso a psicología.</span>
          </div>
          <AgendaBadge tipo="AUTO" />
        </div>

        {/* Acciones del Estudiante (ESTUDIANTE) */}
        {(cita.estado === "pendiente" || cita.estado === "confirmada") && (
          <div className="border-t border-border/60 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AgendaBadge tipo="ESTUDIANTE" />
                <span className="text-xs font-bold text-foreground">
                  Gestión de la cita (mínimo 2h antes):
                </span>
              </div>
            </div>

            {ventana.puedeCancelar ? (
              <div>
                {!showCancelConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300"
                  >
                    <Ban className="size-3.5" />
                    <span>Cancelar mi cita</span>
                  </button>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
                    <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                      ¿Seguro/a que deseas cancelar tu cita para el {cita.fecha_cita} a las{" "}
                      {cita.hora_cita}?
                    </p>
                    <input
                      type="text"
                      value={motivoCancelacion}
                      onChange={(e) => setMotivoCancelacion(e.target.value)}
                      placeholder="Motivo de cancelación (opcional)..."
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmCancel}
                        disabled={isCanceling}
                        className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        {isCanceling ? "Cancelando..." : "Confirmar cancelación"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(false)}
                        className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                      >
                        Regresar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <p>{ventana.mensaje}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Si la cita está cancelada o completada, permitir agendar nueva */}
        {(cita.estado === "cancelada" ||
          cita.estado === "completada" ||
          cita.estado === "no_asistio") &&
          onNuevaSolicitud && (
            <div className="border-t border-border/60 pt-4 text-center">
              <button
                type="button"
                onClick={onNuevaSolicitud}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1c2474] px-6 py-2.5 text-xs font-bold text-white shadow-float transition-all hover:bg-[#28328c]"
              >
                <RotateCcw className="size-3.5" />
                <span>Solicitar una nueva cita</span>
              </button>
            </div>
          )}
      </div>
    </div>
  );
};
