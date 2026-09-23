import type { Appointment, CaseSummary, Mood } from "./types";

export const DEMO_MODE = true;

export const moods: Mood[] = [
  { id: "muy-bien", label: "Feliz", value: 5, tone: "teal" },
  { id: "bien", label: "Bien", value: 4, tone: "cyan" },
  { id: "regular", label: "Normal", value: 3, tone: "mint" },
  { id: "triste", label: "Triste", value: 2, tone: "lavender" },
  { id: "muy-mal", label: "Muy mal", value: 1, tone: "deep" },
];

export const wellbeingStats = [
  { label: "Ánimo", value: "3.4", suffix: "/5", progress: 76 },
  { label: "Sueño", value: "6.4", suffix: "h", progress: 81 },
  { label: "Estrés", value: "3.4", suffix: "/5", progress: 48 },
  { label: "Energía", value: "3.6", suffix: "/5", progress: 72 },
];

/* TODO(Supabase): reemplazar por consulta a view dashboard_psicologo con RLS por rol */
export const psychologistCases: CaseSummary[] = [
  {
    id: "case-mg",
    initials: "M.G.",
    riskLevel: "rojo",
    summary: "Reportó insomnio y ansiedad en check-in del 15 sep",
    lastCheckIn: "15 sep 2026",
    accompanimentSummary:
      "Ha tenido noches con poco descanso y preocupación constante por sus entregas. Expresa disposición para conversar y recibir acompañamiento esta semana.",
    phq9: 14,
    gad7: 11,
  },
  {
    id: "case-lr",
    initials: "L.R.",
    riskLevel: "rojo",
    summary: "Ánimo bajo y carga académica alta durante la última semana",
    lastCheckIn: "14 sep 2026",
    accompanimentSummary:
      "Describe cansancio sostenido, dificultad para concentrarse y sensación de aislamiento. Identifica a una persona cercana como red de apoyo.",
    phq9: 16,
    gad7: 13,
  },
  {
    id: "case-av",
    initials: "A.V.",
    riskLevel: "amarillo",
    summary: "Estrés leve por exámenes y cambios en sus horas de sueño",
    lastCheckIn: "16 sep 2026",
    accompanimentSummary:
      "Refiere tensión antes de los exámenes y horarios de sueño irregulares. Ha comenzado a organizar pausas breves durante el día.",
    phq9: 8,
    gad7: 9,
  },
  {
    id: "case-cp",
    initials: "C.P.",
    riskLevel: "amarillo",
    summary: "Preocupación recurrente por materias pendientes",
    lastCheckIn: "15 sep 2026",
    accompanimentSummary:
      "Se siente abrumada/o por dos materias pendientes, aunque conserva rutinas de alimentación y contacto con amistades.",
    phq9: 7,
    gad7: 10,
  },
  {
    id: "case-js",
    initials: "J.S.",
    riskLevel: "amarillo",
    summary: "Sueño irregular y menor energía durante tres días",
    lastCheckIn: "13 sep 2026",
    accompanimentSummary:
      "Comenta una baja temporal de energía relacionada con entregas acumuladas. Le ayudan las caminatas y conversar con su familia.",
    phq9: 9,
    gad7: 7,
  },
  {
    id: "case-nt",
    initials: "N.T.",
    riskLevel: "verde",
    summary: "Se mantiene tranquila/o y con buen descanso esta semana",
    lastCheckIn: "16 sep 2026",
    accompanimentSummary:
      "Mantiene una rutina estable, descanso suficiente y vínculos de apoyo. No reporta cambios relevantes desde el último seguimiento.",
    phq9: 3,
    gad7: 2,
  },
  {
    id: "case-dh",
    initials: "D.H.",
    riskLevel: "verde",
    summary: "Buen ánimo y estrategias de organización constantes",
    lastCheckIn: "12 sep 2026",
    accompanimentSummary:
      "Refiere buen ánimo general y una mejor distribución de su carga académica. Continúa usando pausas de respiración.",
    phq9: 4,
    gad7: 3,
  },
  {
    id: "case-rb",
    initials: "R.B.",
    riskLevel: "verde",
    summary: "Sin cambios relevantes; conserva una red de apoyo cercana",
    lastCheckIn: "11 sep 2026",
    accompanimentSummary:
      "Se percibe estable y acompañada/o. Identifica recursos personales claros para manejar semanas con mayor carga.",
    phq9: 2,
    gad7: 3,
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: "apt-01",
    studentName: "Mireya González",
    caseId: "case-mg",
    date: "2026-09-25",
    timeSlot: "11:00 - 11:50",
    modality: "presencial",
    psychologistName: "Dra. Marta Gómez",
    psychologistRole: "Psicóloga clínica y bienestar estudiantil",
    locationOrLink: "Consultorio 3, Edificio de Bienestar Integral TESH",
    status: "confirmada",
    notes: "Seguimiento de estrategias de afrontamiento y descanso.",
    createdAt: "2026-09-19T14:30:00Z",
  },
  {
    id: "apt-04",
    studentName: "Andrea Valdés",
    caseId: "case-av",
    date: "2026-09-28",
    timeSlot: "10:00 - 10:50",
    modality: "presencial",
    psychologistName: "Dra. Marta Gómez",
    psychologistRole: "Psicóloga clínica y bienestar estudiantil",
    locationOrLink: "Consultorio 3, Edificio de Bienestar Integral TESH",
    status: "confirmada",
    notes: "Acompañamiento en manejo del estrés académico.",
    createdAt: "2026-09-20T10:00:00Z",
  },
  {
    id: "apt-05",
    studentName: "Jimena Soto",
    caseId: "case-js",
    date: "2026-09-30",
    timeSlot: "14:00 - 14:50",
    modality: "en-linea",
    psychologistName: "Dra. Marta Gómez",
    psychologistRole: "Psicóloga clínica y bienestar estudiantil",
    locationOrLink: "Enlace de videollamada institucional segura",
    status: "pendiente",
    notes: "Seguimiento de técnicas de respiración y descanso.",
    createdAt: "2026-09-21T11:00:00Z",
  },
  {
    id: "apt-02",
    studentName: "Luis Ramírez",
    caseId: "case-lr",
    date: "2026-09-11",
    timeSlot: "10:00 - 10:50",
    modality: "en-linea",
    psychologistName: "Dra. Marta Gómez",
    psychologistRole: "Psicóloga clínica y bienestar estudiantil",
    locationOrLink: "Enlace de videollamada institucional segura",
    status: "realizada",
    notes: "Sesión inicial de valoración y primeros acuerdos.",
    createdAt: "2026-09-08T09:15:00Z",
  },
  {
    id: "apt-03",
    studentName: "Carlos Paredes",
    caseId: "case-cp",
    date: "2026-09-02",
    timeSlot: "15:00 - 15:50",
    modality: "presencial",
    psychologistName: "Lic. Carlos Fuentes",
    psychologistRole: "Orientación psicológica vocacional",
    locationOrLink: "Consultorio 1, Edificio de Bienestar Integral TESH",
    status: "cancelada",
    notes: "Cancelada con aviso oportuno por cruce de horario de examen.",
    createdAt: "2026-08-28T16:00:00Z",
  },
];
