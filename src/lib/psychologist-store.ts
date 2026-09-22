import { psychologistCases, mockAppointments } from "./mock-data";
import { addSystemNotification } from "./notifications";
import type {
  CaseSummary,
  ClinicalNote,
  CaseStatus,
  RiskLevel,
  Appointment,
  AppointmentModality,
} from "./types";

const CASES_STORAGE_KEY = "equilibra_psych_cases_v1";
const NOTES_STORAGE_KEY = "equilibra_psych_notes_v1";
const APPOINTMENTS_STORAGE_KEY = "equilibra_citas_v1";

const INITIAL_CASES: CaseSummary[] = [
  {
    ...psychologistCases[0], // M.G.
    studentName: "Mireya González",
    career: "Ingeniería en Sistemas Computacionales",
    semester: "6to Semestre",
    status: "por_contactar",
    notesCount: 1,
    lastContactDate: "Pendiente",
  },
  {
    ...psychologistCases[1], // L.R.
    studentName: "Luis Ramírez",
    career: "Ingeniería Industrial",
    semester: "4to Semestre",
    status: "por_contactar",
    notesCount: 2,
    lastContactDate: "14 sep 2026",
  },
  {
    ...psychologistCases[2], // A.V.
    studentName: "Andrea Valdés",
    career: "Licenciatura en Administración",
    semester: "2do Semestre",
    status: "en_seguimiento",
    notesCount: 1,
    lastContactDate: "16 sep 2026",
  },
  {
    ...psychologistCases[3], // C.P.
    studentName: "Carlos Paredes",
    career: "Ingeniería Mecatrónica",
    semester: "5to Semestre",
    status: "cita_programada",
    notesCount: 1,
    lastContactDate: "15 sep 2026",
  },
  {
    ...psychologistCases[4], // J.S.
    studentName: "Jimena Soto",
    career: "Ingeniería en Sistemas Computacionales",
    semester: "3er Semestre",
    status: "en_seguimiento",
    notesCount: 0,
    lastContactDate: "13 sep 2026",
  },
  {
    ...psychologistCases[5], // N.T.
    studentName: "Natalia Torres",
    career: "Licenciatura en Gastronomía",
    semester: "7mo Semestre",
    status: "atendido",
    notesCount: 1,
    lastContactDate: "16 sep 2026",
  },
  {
    ...psychologistCases[6], // D.H.
    studentName: "David Hernández",
    career: "Ingeniería Civil",
    semester: "4to Semestre",
    status: "atendido",
    notesCount: 0,
    lastContactDate: "12 sep 2026",
  },
  {
    ...psychologistCases[7], // R.B.
    studentName: "Renata Becerra",
    career: "Ingeniería Industrial",
    semester: "8vo Semestre",
    status: "atendido",
    notesCount: 0,
    lastContactDate: "11 sep 2026",
  },
];

const INITIAL_NOTES: ClinicalNote[] = [
  {
    id: "note-01",
    caseId: "case-mg",
    date: "15 sep 2026, 11:20",
    author: "Dra. Marta Gómez",
    title: "Alerta de tamizaje recibida (Nivel Rojo)",
    category: "emergencia",
    content:
      "Se identificó puntuación PHQ-9 de 14 y reporte explícito de insomnio sostenido por entregas departamentales. Pendiente realizar llamada de contención y acordar cita presencial en cubículo 3.",
  },
  {
    id: "note-02",
    caseId: "case-lr",
    date: "14 sep 2026, 16:45",
    author: "Dra. Marta Gómez",
    title: "Contacto preventivo inicial",
    category: "contacto",
    content:
      "Se envió correo institucional al alumno ofreciendo un espacio de escucha respetuosa. El estudiante confirmó recepción indicando interés en técnicas de respiración diafragmática.",
  },
  {
    id: "note-03",
    caseId: "case-av",
    date: "16 sep 2026, 10:15",
    author: "Lic. Carlos Fuentes",
    title: "Check-in de seguimiento",
    category: "seguimiento",
    content:
      "Reporta mejor gestión del tiempo para las materias de ciencias básicas. Se sugiere continuar con registro semanal de check-in emocional.",
  },
];

export function getPsychologistCases(): CaseSummary[] {
  try {
    const stored = localStorage.getItem(CASES_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error al leer casos", e);
  }
  return INITIAL_CASES;
}

export function savePsychologistCases(cases: CaseSummary[]): void {
  try {
    localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(cases));
  } catch (e) {
    console.error("Error al guardar casos", e);
  }
}

export function updateCaseRisk(
  caseId: string,
  riskLevel: RiskLevel,
  status?: CaseStatus,
): CaseSummary[] {
  const current = getPsychologistCases();
  const updated = current.map((item) => {
    if (item.id === caseId) {
      return {
        ...item,
        riskLevel,
        status: status || item.status,
      };
    }
    return item;
  });
  savePsychologistCases(updated);
  return updated;
}

export function updateCaseStatus(caseId: string, status: CaseStatus): CaseSummary[] {
  const current = getPsychologistCases();
  const updated = current.map((item) => (item.id === caseId ? { ...item, status } : item));
  savePsychologistCases(updated);
  return updated;
}

export function getAllClinicalNotes(): ClinicalNote[] {
  try {
    const stored = localStorage.getItem(NOTES_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error("Error al leer notas clínicas", e);
  }
  return INITIAL_NOTES;
}

export function saveClinicalNotes(notes: ClinicalNote[]): void {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error("Error al guardar notas clínicas", e);
  }
}

export function getCaseNotes(caseId: string): ClinicalNote[] {
  const all = getAllClinicalNotes();
  return all.filter((n) => n.caseId === caseId);
}

export function addClinicalNote(noteData: Omit<ClinicalNote, "id" | "date">): ClinicalNote {
  const all = getAllClinicalNotes();
  const now = new Date();
  const formattedDate = `${now.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}, ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  const newNote: ClinicalNote = {
    ...noteData,
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    date: formattedDate,
  };

  const updatedNotes = [newNote, ...all];
  saveClinicalNotes(updatedNotes);

  // Actualizar contador en el caso correspondiente
  const cases = getPsychologistCases();
  const updatedCases = cases.map((c) =>
    c.id === noteData.caseId
      ? {
          ...c,
          notesCount: (c.notesCount || 0) + 1,
          lastContactDate: formattedDate,
        }
      : c,
  );
  savePsychologistCases(updatedCases);

  return newNote;
}

export function recordPatientContact(
  caseId: string,
  channel: string,
  outcome: string,
  notes: string,
  author: string = "Dra. Marta Gómez",
): void {
  const currentCases = getPsychologistCases();
  const targetCase = currentCases.find((c) => c.id === caseId);
  const initials = targetCase?.initials || "Estudiante";

  addClinicalNote({
    caseId,
    author,
    title: `Contacto institucional registrado (${channel})`,
    category: "contacto",
    content: `Canal: ${channel}\nResultado: ${outcome}\nDetalle: ${notes || "Sin observaciones adicionales."}`,
  });

  updateCaseStatus(
    caseId,
    outcome === "Cita acordada"
      ? "cita_programada"
      : outcome === "Atención finalizada / Estable"
        ? "atendido"
        : "en_seguimiento",
  );

  addSystemNotification({
    recipientRole: "psicologo",
    type: "sistema",
    title: `Contacto registrado: Caso ${initials}`,
    message: `Se registró contacto vía ${channel}. Resultado: ${outcome}.`,
    priority: "media",
    caseId,
  });
}

export function scheduleSessionFromPsychologist(data: {
  caseId: string;
  studentInitials: string;
  studentName: string;
  date: string;
  timeSlot: string;
  modality: AppointmentModality;
  psychologistName: string;
  sessionTopic: string;
  notes?: string;
}): Appointment {
  let appointments: Appointment[] = [];
  try {
    const raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
    appointments = raw ? JSON.parse(raw) : mockAppointments;
  } catch {
    appointments = mockAppointments;
  }

  const locationOrLink =
    data.modality === "presencial"
      ? "Consultorio 3, Edificio de Bienestar Integral TESH"
      : "Enlace de videollamada institucional segura (Google Meet TESH)";

  const newAppointment: Appointment = {
    id: `apt-${Date.now()}`,
    date: data.date,
    timeSlot: data.timeSlot,
    modality: data.modality,
    psychologistName: data.psychologistName,
    psychologistRole: "Psicóloga clínica y bienestar estudiantil",
    locationOrLink,
    status: "confirmada",
    notes: `${data.sessionTopic}. ${data.notes ? `Observaciones: ${data.notes}` : ""}`,
    createdAt: new Date().toISOString(),
  };

  const updatedAppointments = [newAppointment, ...appointments];
  try {
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(updatedAppointments));
  } catch (e) {
    console.error("Error al guardar cita en agenda", e);
  }

  // Actualizar estado del caso
  updateCaseStatus(data.caseId, "cita_programada");

  // Registrar nota clínica automática
  addClinicalNote({
    caseId: data.caseId,
    author: data.psychologistName,
    title: `Cita programada (${data.modality === "presencial" ? "Presencial" : "En línea"})`,
    category: "sesion",
    content: `Fecha: ${data.date} | Horario: ${data.timeSlot}\nTema: ${data.sessionTopic}\nUbicación: ${locationOrLink}`,
  });

  // Notificación al sistema para el psicólogo
  addSystemNotification({
    recipientRole: "psicologo",
    type: "cita_nueva",
    title: `Nueva cita agendada: Caso ${data.studentInitials}`,
    message: `Sesión ${data.modality} programada para el ${data.date} a las ${data.timeSlot}.`,
    priority: "media",
    caseId: data.caseId,
  });

  // Notificación al sistema para el estudiante
  addSystemNotification({
    recipientRole: "estudiante",
    type: "cita_nueva",
    title: `Tu psicóloga ha programado una sesión contigo`,
    message: `Tienes cita el ${data.date} a las ${data.timeSlot} con ${data.psychologistName}.`,
    priority: "alta",
  });

  return newAppointment;
}

export function activateCrisisProtocol(
  caseId: string,
  details: string,
  author: string = "Dra. Marta Gómez",
): void {
  const currentCases = getPsychologistCases();
  const targetCase = currentCases.find((c) => c.id === caseId);
  const initials = targetCase?.initials || "Estudiante";

  addClinicalNote({
    caseId,
    author,
    title: "🚨 Protocolo de Emergencia / Riesgo Alto Activado",
    category: "emergencia",
    content: `Se activó protocolo de atención inmediata para el caso ${initials}.\nDetalles: ${details}\nAcciones inmediatas: Canalización a Línea de la Vida (800 911 2000), alerta preventiva a Coordinación de Tutorías y Servicio Médico TESH.`,
  });

  updateCaseRisk(caseId, "rojo", "en_seguimiento");

  addSystemNotification({
    recipientRole: "psicologo",
    type: "alerta_roja",
    title: `🚨 Protocolo Activado — Caso ${initials}`,
    message: `Se registró activación de protocolo de emergencia para ${initials}. Revisa el expediente para seguimiento continuo.`,
    priority: "alta",
    caseId,
  });
}
