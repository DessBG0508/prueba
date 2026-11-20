import { supabase } from "@/lib/supabase";
import type { SolicitudCita, EstadoCita } from "./types";
import { verificarVentanaCancelacion } from "./types";
import { triggerEnvioEncuesta } from "../encuesta/encuesta-service";
import {
  createAlertaInasistencia,
  findTutorForStudent,
  getAuthenticatedUid,
} from "@/features/tutor/tutor-service";

const LOCAL_STORAGE_KEY = "equilibra_solicitudes_cita_v1";

// Citas iniciales sembradas para demostración interactiva inmediata
const SEED_SOLICITUDES: SolicitudCita[] = [
  {
    id: "sol-001",
    folio: "EQ-9374",
    user_id: "demo-user-student",
    psicologo_id: "psy-001",
    nombre_psicologo: "Dra. Marta Gómez",
    iniciales_estudiante: "D.B.",
    carrera_estudiante: "Ing. en Sistemas Computacionales",
    semestre_estudiante: "6º Semestre",
    nivel_tamizaje: "rojo",
    puntaje_phq9: 9,
    puntaje_gad7: 14,
    fecha_solicitud: new Date(Date.now() - 86400000).toISOString(),
    fecha_cita: "2026-11-06",
    hora_cita: "11:00",
    modalidad: "presencial",
    estado: "pendiente",
    motivo: "He sentido dificultad para concentrarme en exámenes y constante tensión.",
  },
  {
    id: "sol-002",
    folio: "EQ-4120",
    user_id: "demo-user-student-2",
    psicologo_id: "psy-001",
    nombre_psicologo: "Dra. Marta Gómez",
    iniciales_estudiante: "M.R.",
    carrera_estudiante: "Ing. Industrial",
    semestre_estudiante: "4º Semestre",
    nivel_tamizaje: "amarillo",
    puntaje_phq9: 6,
    puntaje_gad7: 11,
    fecha_solicitud: new Date(Date.now() - 172800000).toISOString(),
    fecha_cita: "2026-11-05",
    hora_cita: "15:00",
    modalidad: "presencial",
    estado: "confirmada",
    motivo: "Seguimiento de técnicas de respiración y manejo de ansiedad.",
  },
];

function getLocalSolicitudes(): SolicitudCita[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_SOLICITUDES));
      return SEED_SOLICITUDES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_SOLICITUDES;
  } catch {
    return SEED_SOLICITUDES;
  }
}

function saveLocalSolicitudes(list: SolicitudCita[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

/**
 * Obtener solicitudes del estudiante actual
 */
export async function getSolicitudesEstudiante(
  userId: string,
  folio?: string,
): Promise<SolicitudCita[]> {
  try {
    let query = supabase
      .from("solicitudes_cita")
      .select("*")
      .order("fecha_cita", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (folio) {
      query = query.eq("folio", folio);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return data as SolicitudCita[];
    }
  } catch {
    // Continuar a fallback
  }

  // Fallback local
  const localList = getLocalSolicitudes();
  if (folio) {
    const filtered = localList.filter((s) => s.folio === folio || s.user_id === userId);
    return filtered.length > 0 ? filtered : localList;
  }
  return localList;
}

/**
 * Obtener solicitudes para el panel del psicólogo con filtros
 */
export async function getSolicitudesPsicologo(filtros?: {
  fecha?: string;
  estado?: EstadoCita;
}): Promise<SolicitudCita[]> {
  try {
    let query = supabase
      .from("solicitudes_cita")
      .select("*")
      .order("fecha_cita", { ascending: true })
      .order("hora_cita", { ascending: true });

    if (filtros?.fecha) {
      query = query.eq("fecha_cita", filtros.fecha);
    }
    if (filtros?.estado) {
      query = query.eq("estado", filtros.estado);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return data as SolicitudCita[];
    }
  } catch {
    // Continuar a fallback
  }

  let list = getLocalSolicitudes();
  if (filtros?.fecha) {
    list = list.filter((s) => s.fecha_cita === filtros.fecha);
  }
  if (filtros?.estado) {
    list = list.filter((s) => s.estado === filtros.estado);
  }
  return list;
}

/**
 * Normaliza una cadena de hora a formato "HH:mm" (ej. "09:00:00" -> "09:00")
 */
export function normalizarHoraSlot(h: string): string {
  if (!h) return "";
  const parts = h.trim().split(":");
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  return h;
}

/**
 * Obtener las horas ya ocupadas para una fecha dada desde Supabase y localStorage
 * (PB-009: Bloqueo de horas ocupadas y prevención de doble reserva en tiempo real).
 */
export async function getCitasOcupadasPorFecha(
  fecha: string,
  psicologoId?: string,
): Promise<string[]> {
  const horasSet = new Set<string>();

  // 1. Consultar Supabase en tiempo real (citas pendientes o confirmadas)
  try {
    let query = supabase
      .from("solicitudes_cita")
      .select("hora_cita, estado, psicologo_id")
      .eq("fecha_cita", fecha)
      .in("estado", ["pendiente", "confirmada"]);

    if (psicologoId) {
      query = query.eq("psicologo_id", psicologoId);
    }

    const { data, error } = await query;
    if (!error && data) {
      for (const row of data) {
        if (row.hora_cita) {
          horasSet.add(normalizarHoraSlot(row.hora_cita));
        }
      }
    }
  } catch {
    // Continuar con fallback local
  }

  // 2. Consultar citas en localStorage (híbrido/offline/demo)
  try {
    const localList = getLocalSolicitudes();
    for (const c of localList) {
      if (c.fecha_cita === fecha && (c.estado === "pendiente" || c.estado === "confirmada")) {
        if (!psicologoId || !c.psicologo_id || c.psicologo_id === psicologoId) {
          if (c.hora_cita) {
            horasSet.add(normalizarHoraSlot(c.hora_cita));
          }
        }
      }
    }
  } catch {
    // Ignore
  }

  return Array.from(horasSet);
}

/**
 * Crear nueva solicitud de cita con validación de límite y prevención de doble reserva (P0)
 */
export async function crearSolicitudCita(
  solicitud: Omit<SolicitudCita, "id" | "fecha_solicitud" | "created_at" | "updated_at">,
): Promise<{ ok: boolean; cita?: SolicitudCita; error?: string }> {
  // 1. Validar si ya tiene cita activa
  const existentes = await getSolicitudesEstudiante(solicitud.user_id, solicitud.folio);
  const activa = existentes.find((c) => c.estado === "pendiente" || c.estado === "confirmada");
  if (activa) {
    return {
      ok: false,
      error: `Ya cuentas con una solicitud activa para el ${activa.fecha_cita} a las ${activa.hora_cita}. Solo se permite 1 cita activa por estudiante a la vez.`,
    };
  }

  // 2. Validar doble reserva (P0): verificar si el horario ya está ocupado en esa fecha
  const horasOcupadas = await getCitasOcupadasPorFecha(
    solicitud.fecha_cita,
    solicitud.psicologo_id || undefined,
  );
  const horaNormalizada = normalizarHoraSlot(solicitud.hora_cita);
  if (horasOcupadas.includes(horaNormalizada)) {
    return {
      ok: false,
      error: `El horario de las ${solicitud.hora_cita} hrs para el día ${solicitud.fecha_cita} ya se encuentra reservado. Por favor selecciona otro horario disponible.`,
    };
  }

  const nuevaCita: SolicitudCita = {
    ...solicitud,
    hora_cita: horaNormalizada,
    id: `sol-${Date.now().toString(36)}`,
    fecha_solicitud: new Date().toISOString(),
    modalidad: "presencial",
    estado: "pendiente",
  };

  try {
    const { data, error } = await supabase
      .from("solicitudes_cita")
      .insert({
        folio: nuevaCita.folio,
        user_id: nuevaCita.user_id,
        psicologo_id: nuevaCita.psicologo_id || null,
        fecha_cita: nuevaCita.fecha_cita,
        hora_cita: nuevaCita.hora_cita,
        modalidad: "presencial",
        estado: "pendiente",
        motivo: nuevaCita.motivo || null,
      })
      .select()
      .single();

    if (!error && data) {
      nuevaCita.id = data.id;
    }
  } catch {
    // Fallback local
  }

  const localList = getLocalSolicitudes();
  saveLocalSolicitudes([nuevaCita, ...localList]);

  return { ok: true, cita: nuevaCita };
}

/**
 * Cancelar cita por el estudiante (requiere mínimo 2h de anticipación)
 */
export async function cancelarCitaEstudiante(
  citaId: string,
  fechaCita: string,
  horaCita: string,
  motivo?: string,
): Promise<{ ok: boolean; error?: string }> {
  const check = verificarVentanaCancelacion(fechaCita, horaCita);
  if (!check.puedeCancelar) {
    return {
      ok: false,
      error: check.mensaje || "La cita solo puede cancelarse con al menos 2 horas de anticipación.",
    };
  }

  try {
    await supabase
      .from("solicitudes_cita")
      .update({
        estado: "cancelada",
        cancelado_por: "estudiante",
        motivo_cancelacion: motivo || "Cancelada por el estudiante vía portal",
        updated_at: new Date().toISOString(),
      })
      .eq("id", citaId);
  } catch {
    // Continuar local
  }

  const localList = getLocalSolicitudes();
  const index = localList.findIndex((c) => c.id === citaId);
  if (index !== -1) {
    localList[index] = {
      ...localList[index],
      estado: "cancelada",
      cancelado_por: "estudiante",
      motivo_cancelacion: motivo || "Cancelada por el estudiante vía portal",
    };
    saveLocalSolicitudes(localList);
  }

  return { ok: true };
}

/**
 * Actualizar estado de cita por el psicólogo (Aceptar / Cancelar / Completar / No asistió)
 * Reglas de negocio:
 * 1. 'completada' -> Disparador PB-021 Encuesta de Alta Clínica (ventana 24h)
 * 2. 2 inasistencias consecutivas 'no_asistio' -> Disparador PB-021 Encuesta de Abandono (ventana 15 días)
 */
export async function actualizarEstadoCitaPsicologo(
  citaId: string,
  nuevoEstado: EstadoCita,
  motivoCancelacion?: string,
): Promise<{ ok: boolean; triggerEncuestaAbandono: boolean; triggerEncuestaAlta?: boolean }> {
  let triggerEncuestaAbandono = false;
  let triggerEncuestaAlta = false;

  const localList = getLocalSolicitudes();
  let targetCita: SolicitudCita | undefined = localList.find((c) => c.id === citaId);

  try {
    const updatePayload: Record<string, unknown> = {
      estado: nuevoEstado,
      updated_at: new Date().toISOString(),
    };

    if (nuevoEstado === "cancelada") {
      updatePayload.cancelado_por = "psicologo";
      updatePayload.motivo_cancelacion =
        motivoCancelacion || "Cancelada por el psicólogo por causas de fuerza mayor";
    }

    const { data } = await supabase
      .from("solicitudes_cita")
      .update(updatePayload)
      .eq("id", citaId)
      .select()
      .maybeSingle();

    if (data && !targetCita) {
      targetCita = data as SolicitudCita;
    }
  } catch {
    // Continuar local
  }

  const index = localList.findIndex((c) => c.id === citaId);
  if (index !== -1) {
    const target = localList[index];
    localList[index] = {
      ...target,
      estado: nuevoEstado,
      cancelado_por: nuevoEstado === "cancelada" ? "psicologo" : target.cancelado_por,
      motivo_cancelacion:
        nuevoEstado === "cancelada"
          ? motivoCancelacion || "Cancelada por el psicólogo"
          : target.motivo_cancelacion,
    };
    targetCita = localList[index];
    saveLocalSolicitudes(localList);
  }

  // DISPARADORES AUTOMÁTICOS PB-021 (MIN-008):
  // 1. Alta clínica (cita completada) -> enlace en ventana de 24h
  if (nuevoEstado === "completada" && targetCita) {
    triggerEncuestaAlta = true;
    try {
      await triggerEnvioEncuesta({
        folio: targetCita.folio,
        user_id: targetCita.user_id,
        trigger_tipo: "alta",
        email: targetCita.email,
        nombre: targetCita.nombre_estudiante || targetCita.iniciales_estudiante,
      });
    } catch (err) {
      console.error("Error al disparar PB-021 Alta:", err);
    }
  }

  // 2. Abandono (2 inasistencias consecutivas 'no_asistio') -> ventana de 15 días + Alerta automática al tutor
  if (nuevoEstado === "no_asistio" && targetCita) {
    let citasDelEstudiante: Array<{ estado: string; fecha_cita: string; hora_cita?: string }> =
      localList.filter(
        (c) =>
          (targetCita?.folio && c.folio === targetCita.folio) ||
          (targetCita?.user_id && c.user_id === targetCita.user_id),
      );

    // Combinar con citas en Supabase para detectar 2 inasistencias consecutivas reales
    try {
      let dbQuery = supabase
        .from("solicitudes_cita")
        .select("id, estado, fecha_cita, hora_cita, folio, user_id");

      if (targetCita.user_id && /^[0-9a-f-]{36}$/i.test(targetCita.user_id)) {
        dbQuery = dbQuery.eq("user_id", targetCita.user_id);
      } else if (targetCita.folio) {
        dbQuery = dbQuery.eq("folio", targetCita.folio);
      }

      const { data: dbCitas } = await dbQuery;
      if (Array.isArray(dbCitas) && dbCitas.length > 0) {
        citasDelEstudiante = dbCitas as typeof citasDelEstudiante;
      }
    } catch {
      // Continuar con lista local
    }

    citasDelEstudiante = [...citasDelEstudiante].sort(
      (a, b) =>
        new Date(`${b.fecha_cita}T${b.hora_cita || "00:00"}`).getTime() -
        new Date(`${a.fecha_cita}T${a.hora_cita || "00:00"}`).getTime(),
    );

    const esInasistenciaConsecutiva =
      citasDelEstudiante.length >= 2 &&
      citasDelEstudiante[0].estado === "no_asistio" &&
      citasDelEstudiante[1].estado === "no_asistio";

    if (esInasistenciaConsecutiva) {
      triggerEncuestaAbandono = true;
      try {
        await triggerEnvioEncuesta({
          folio: targetCita.folio,
          user_id: targetCita.user_id,
          trigger_tipo: "abandono",
          email: targetCita.email,
          nombre: targetCita.nombre_estudiante || targetCita.iniciales_estudiante,
        });
      } catch (err) {
        console.error("Error al disparar PB-021 Abandono:", err);
      }
    }

    // Notificar automáticamente al tutor del estudiante en alertas_inasistencia
    try {
      const tutorMatch = await findTutorForStudent({
        estudianteId: targetCita.user_id,
        carrera: targetCita.carrera_estudiante,
      });

      if (tutorMatch?.tutor_id) {
        const psicologoUid = (await getAuthenticatedUid()) || targetCita.psicologo_id || null;
        const tipoAlerta = esInasistenciaConsecutiva ? "inasistencia_repetida" : "no_asistio";
        const prioridad = esInasistenciaConsecutiva ? "urgente" : "alta";
        const folioTexto = targetCita.folio || targetCita.iniciales_estudiante || "Estudiante";
        const mensaje = esInasistenciaConsecutiva
          ? `Estudiante ${folioTexto} acumuló 2 inasistencias consecutivas a cita (${targetCita.fecha_cita}). Requiere seguimiento urgente.`
          : `Estudiante ${folioTexto} no asistió a su cita programada el ${targetCita.fecha_cita}.`;

        await createAlertaInasistencia({
          tutor_id: tutorMatch.tutor_id,
          psicologo_id: psicologoUid,
          estudiante_id: targetCita.user_id,
          folio: targetCita.folio,
          tipo_alerta: tipoAlerta,
          prioridad,
          mensaje,
        });
      }
    } catch (alertErr) {
      console.warn("Aviso al crear alerta de inasistencia para tutor:", alertErr);
    }
  }

  return { ok: true, triggerEncuestaAbandono, triggerEncuestaAlta };
}
