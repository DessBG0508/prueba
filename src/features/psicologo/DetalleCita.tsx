import React, { useState } from "react";
import { AgendaBadge } from "../agenda/AgendaBadge";
import type { SolicitudCita, EstadoCita } from "../agenda/types";
import {
  Calendar,
  Clock,
  User,
  GraduationCap,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  FileText,
  UserX,
  MessageSquare,
} from "lucide-react";

interface DetalleCitaProps {
  cita: SolicitudCita;
  onAceptar: () => Promise<void>;
  onCancelar: (motivo: string) => Promise<void>;
  onCompletar: () => Promise<void>;
  onNoAsistio: () => Promise<void>;
  onBack: () => void;
  triggerAbandonoActivo?: boolean;
}

export const DetalleCita: React.FC<DetalleCitaProps> = ({
  cita,
  onAceptar,
  onCancelar,
  onCompletar,
  onNoAsistio,
  onBack,
  triggerAbandonoActivo = false,
}) => {
  const [showCancelBox, setShowCancelBox] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const nivel = cita.nivel_tamizaje || "rojo";
  const phq9 = cita.puntaje_phq9 ?? 9;
  const gad7 = cita.puntaje_gad7 ?? 14;

  const handleAceptarClick = async () => {
    try {
      setIsProcessing(true);
      await onAceptar();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompletarClick = async () => {
    try {
      setIsProcessing(true);
      await onCompletar();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNoAsistioClick = async () => {
    try {
      setIsProcessing(true);
      await onNoAsistio();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCancel = async () => {
    try {
      setIsProcessing(true);
      await onCancelar(motivoCancelacion || "Cancelada por el profesional de psicología");
      setShowCancelBox(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera limpia con botón de regreso */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-border bg-card p-2 text-foreground hover:bg-muted transition-colors shadow-xs"
          aria-label="Volver a la lista"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
            Detalle de la Cita
          </h2>
          <p className="text-xs text-muted-foreground">
            Información del paciente, actualización de estado y seguimiento clínico
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-[#d8d2ff] bg-white p-5 shadow-xs dark:border-indigo-950/60 dark:bg-[#1a1b35] sm:p-7 space-y-6">
        {/* Banner de Trigger PB-021 si hay 2 inasistencias consecutivas */}
        {triggerAbandonoActivo && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              <span>Alerta PB-021: Encuesta de Abandono Activada</span>
            </div>
            <p>
              El estudiante ha acumulado 2 inasistencias consecutivas marcadas como &ldquo;No
              asistió&rdquo;. Se ha enviado automáticamente el formulario PB-021 para identificar
              barreras de acceso o desvinculación escolar.
            </p>
          </div>
        )}

        {/* Banner de Cita Completada y Trigger PB-021 Alta Clínica */}
        {cita.estado === "completada" && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Sesión Completada — Trigger PB-021 Enviado</span>
            </div>
            <p>
              La cita ha sido marcada como completada en el expediente clínico. Se disparó
              automáticamente la encuesta de satisfacción por alta (PB-021 / MIN-008, disponible en
              ventana de 24h para el estudiante).
            </p>
          </div>
        )}

        {/* Datos del estudiante (AUTO) */}
        <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Datos del estudiante:
            </span>
            <AgendaBadge tipo="AUTO" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <span className="text-[11px] text-muted-foreground block">Folio:</span>
              <span className="font-mono text-sm font-bold text-foreground">{cita.folio}</span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Iniciales:</span>
              <span className="text-sm font-bold text-foreground">
                {cita.iniciales_estudiante || "D.B."}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Semestre:</span>
              <span className="text-sm font-semibold text-foreground">
                {cita.semestre_estudiante || "6º Semestre"}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block">Carrera:</span>
              <span className="text-sm font-semibold text-foreground">
                {cita.carrera_estudiante || "Ing. en Sistemas Computacionales"}
              </span>
            </div>
          </div>
        </div>

        {/* Último tamizaje (AUTO desde para_psicologo) */}
        <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Último tamizaje: Nivel + puntaje + fecha (auto desde para_psicologo)
            </span>
            <AgendaBadge tipo="AUTO" />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span
              className={`rounded-full px-3 py-1 font-bold uppercase ${
                nivel === "rojo"
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                  : nivel === "amarillo"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}
            >
              Nivel {nivel}
            </span>
            <span className="font-semibold text-foreground">
              PHQ-9: <strong className="text-rose-600">{phq9}/27</strong>
            </span>
            <span className="font-semibold text-foreground">
              GAD-7: <strong className="text-amber-600">{gad7}/21</strong>
            </span>
            <span className="text-muted-foreground">
              Fecha de corte: 18-oct-2026 (Tamizaje institucional)
            </span>
          </div>
        </div>

        {/* Motivo de la cita (AUTO) */}
        <div className="space-y-2 rounded-2xl border border-border/80 bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Motivo de la cita (texto del estudiante):
            </span>
            <AgendaBadge tipo="AUTO" />
          </div>
          <p className="text-xs leading-relaxed text-foreground bg-muted/30 p-3 rounded-xl border border-border/50">
            {cita.motivo || "El estudiante no ingresó motivo adicional en la solicitud."}
          </p>
        </div>

        {/* Estado y horario propuesto */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-2xl bg-indigo-50/70 p-4 text-xs dark:bg-indigo-950/30">
          <div>
            <span className="text-muted-foreground block text-[11px]">Estado actual:</span>
            <span className="font-bold uppercase text-foreground">{cita.estado}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Fecha propuesta:</span>
            <span className="font-bold text-foreground">{cita.fecha_cita}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Hora y modalidad:</span>
            <span className="font-bold text-foreground">
              {cita.hora_cita} hrs · Presencial única
            </span>
          </div>
        </div>

        {/* Acciones del Psicólogo (PSICÓLOGO) */}
        <div className="border-t border-border/60 pt-5 space-y-4">
          <div className="flex items-center gap-2">
            <AgendaBadge tipo="PSICÓLOGO" />
            <span className="text-xs font-bold text-foreground">
              Acciones clínicas sobre la solicitud:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 1. Botón Aceptar cita -> estado = confirmada */}
            {cita.estado === "pendiente" && (
              <button
                type="button"
                onClick={handleAceptarClick}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-teal px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal/90 disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" />
                <span>{isProcessing ? "Confirmando..." : "Aceptar cita (confirmar)"}</span>
              </button>
            )}

            {/* 2. Botón Completar cita -> estado = completada (Trigger PB-021) */}
            {(cita.estado === "confirmada" || cita.estado === "pendiente") && (
              <button
                type="button"
                onClick={handleCompletarClick}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" />
                <span>{isProcessing ? "Completando..." : "Marcar como completada"}</span>
              </button>
            )}

            {/* 3. Botón No asistió -> estado = no_asistio */}
            {(cita.estado === "confirmada" || cita.estado === "pendiente") && (
              <button
                type="button"
                onClick={handleNoAsistioClick}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-purple-300 bg-purple-50 px-4 py-2.5 text-xs font-bold text-purple-800 hover:bg-purple-100 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-300 disabled:opacity-50"
              >
                <UserX className="size-4" />
                <span>{isProcessing ? "Registrando..." : "No asistió"}</span>
              </button>
            )}

            {/* 4. Botón Cancelar cita -> estado = cancelada + motivo */}
            {(cita.estado === "pendiente" || cita.estado === "confirmada") && (
              <button
                type="button"
                onClick={() => setShowCancelBox((prev) => !prev)}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
              >
                <XCircle className="size-4" />
                <span>Cancelar cita</span>
              </button>
            )}
          </div>

          {/* Formulario desplegable para cancelar con motivo */}
          {showCancelBox && (
            <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
              <label
                htmlFor="motivo-cancel-psico-input"
                className="block text-xs font-bold text-rose-900 dark:text-rose-200"
              >
                Motivo de cancelación (se notificará al estudiante):
              </label>
              <textarea
                id="motivo-cancel-psico-input"
                rows={3}
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Especifica el motivo de la cancelación institucional..."
                className="w-full resize-none rounded-xl border border-border bg-card p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isProcessing}
                  className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                >
                  {isProcessing ? "Cancelando..." : "Confirmar cancelación"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelBox(false)}
                  className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Regresar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nota PB-021 al pie */}
        <div className="border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
          <strong>Nota institucional (MIN-002):</strong> 2 inasistencias consecutivas marcadas como
          &lsquo;No asistió&rsquo; = trigger automático para PB-021 Encuesta de Satisfacción
          (motivo: abandono).
        </div>
      </div>
    </div>
  );
};
