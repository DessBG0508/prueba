import { DEMO_MODE } from "./mock-data";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { CheckIn } from "./types";

export interface EliMessage {
  id: string;
  sender: "user" | "eli";
  text: string;
  isCrisisProtocol?: boolean;
  crisisData?: {
    actionLabel: string;
    actionRoute: string;
    helplineName: string;
    helphoneNumber: string;
  };
  timestamp: string;
}

export async function saveCheckIn(checkIn: CheckIn): Promise<CheckIn> {
  // Si Supabase está configurado, intentamos guardar en la tabla check_ins
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from("check_ins").insert([
        {
          id: checkIn.id,
          student_id: checkIn.studentId,
          academic_load: checkIn.academicLoad,
          emotions: checkIn.emotions,
          risk_level: checkIn.riskLevel,
          created_at: checkIn.createdAt,
        },
      ]);
      if (error) {
        console.warn(
          "Supabase check_ins insert (tabla pendiente de migración o permisos RLS):",
          error.message,
        );
      }
    } catch (err) {
      console.warn("Aviso al guardar check-in en Supabase:", err);
    }
  }

  return Promise.resolve(checkIn);
}

export async function triggerRedAlert(checkInId: string): Promise<{ alertId: string }> {
  const alertId = `alert-${crypto.randomUUID()}`;

  // Si Supabase está configurado, guardamos la alerta en crisis_alerts
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from("crisis_alerts").insert([
        {
          check_in_id: checkInId,
          student_id: "demo-student-dess",
          status: "pendiente",
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) {
        console.warn("Supabase crisis_alerts insert:", error.message);
      }
    } catch (err) {
      console.warn("Aviso al registrar alerta en Supabase:", err);
    }
  }

  return Promise.resolve({ alertId });
}

/* TODO(Supabase Edge): este filtro DEBE migrar al backend — nunca confiar solo en el cliente */
export const CRISIS_KEYWORDS = [
  "suicid",
  "matar",
  "morir",
  "no quiero vivir",
  "hacerme daño",
  "hacerme dano",
  "autolesion",
  "autolesión",
  "cortar",
  "cortarme",
  "terminar con todo",
  "ya no puedo más",
  "ya no puedo mas",
  "acabar con mi vida",
  "desaparecer",
  "no tiene sentido vivir",
  "quitarme la vida",
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function detectCrisis(text: string): boolean {
  const normalized = normalizeText(text);
  return CRISIS_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)));
}

const CONTEXTUAL_RESPONSES = [
  {
    keywords: [
      "estres",
      "tarea",
      "examen",
      "entregas",
      "presion",
      "calificacion",
      "abrumad",
      "materia",
      "semestre",
    ],
    text: "Comprendo lo pesada que puede ser la carga académica en este momento. Es totalmente válido sentirse abrumado/a. Te propongo dar un paso atrás y tomar una respiración lenta: no tienes que resolver todo en un solo día. ¿Hay alguna tarea o situación puntual que te esté generando mayor tensión?",
  },
  {
    keywords: [
      "ansiedad",
      "ansios",
      "miedo",
      "panico",
      "nervios",
      "taquicardia",
      "inquiet",
      "preocup",
      "angustia",
    ],
    text: "La inquietud y la ansiedad pueden sentirse muy abrumadoras en el cuerpo. Coloca ambos pies firmes sobre el suelo y siente el apoyo de donde estás sentado/a. Estás en un lugar seguro y este momento pasará. ¿Cómo sientes tu respiración ahora mismo?",
  },
  {
    keywords: [
      "sueno",
      "dormir",
      "insomnio",
      "despierto",
      "pesadilla",
      "cansad",
      "agotad",
      "fatiga",
      "desvelo",
    ],
    text: "El descanso es fundamental para tu bienestar y claridad mental. Cuando el insomnio o el agotamiento se acumulan, todo se percibe más difícil. Si te parece bien, podemos probar un ejercicio breve de respiración para permitirle a tu cuerpo soltar la tensión.",
  },
  {
    keywords: ["triste", "llorar", "soledad", "solo", "sola", "vacio", "desanim", "mal"],
    text: "Lamento que estés atravesando por este sentimiento de tristeza o soledad. No tienes que forzarte a estar bien ni ocultar lo que experimentas. Reconocerlo ya es un acto de valentía. ¿Te gustaría contarme un poco más sobre lo que ha detonado este sentir?",
  },
  {
    keywords: ["hola", "buenos dias", "buenas tardes", "buenas noches", "que tal", "eli"],
    text: "Hola. Me alegra que estés aquí. Este es un rincón confidencial y tranquilo pensado para ti. Tómate el tiempo que necesites, ¿cómo te sientes hoy?",
  },
  {
    keywords: ["adios", "bye", "hasta luego", "nos vemos", "chao", "terminar"],
    text: "Gracias por compartir este momento conmigo. Cuidar de tu bienestar es un proceso que se construye día a día. Recuerda ser paciente y compasivo/a contigo. Aquí estaré siempre que desees hacer una pausa.",
  },
  {
    keywords: ["gracias", "agradezc", "amable", "ayudaste"],
    text: "Para eso estoy. Expresar lo que llevas dentro requiere honestidad y valor. Recuerda que no tienes que enfrentar las dificultades a solas.",
  },
  {
    keywords: [],
    text: "Te escucho con atención y sin juicios. Poner en palabras lo que sientes ayuda a procesar y dar orden a los pensamientos. Continúa contándome a tu propio ritmo; aquí estoy para acompañarte.",
  },
];

import { processEliMessage, INITIAL_SCREENING_STATE, type ScreeningState } from "./eli-screening";

let currentBackendState: ScreeningState = { ...INITIAL_SCREENING_STATE };

export function resetBackendScreeningState() {
  currentBackendState = { ...INITIAL_SCREENING_STATE };
}

export async function sendEliMessage(
  mensaje: string,
  state?: ScreeningState,
): Promise<EliMessage & { nextState?: ScreeningState; quickReplies?: string[] }> {
  // Simulación de latencia de red breve de 400ms para realismo conversacional
  await new Promise((resolve) => setTimeout(resolve, 400));

  const activeState = state || currentBackendState;
  const result = processEliMessage(mensaje, activeState);
  if (!state) {
    currentBackendState = result.nextState;
  }

  const isCrisis = !!result.isCrisis;

  return {
    id: crypto.randomUUID(),
    sender: "eli",
    text: result.replyText,
    isCrisisProtocol: isCrisis,
    crisisData: isCrisis
      ? {
          actionLabel: "Contactar a Línea de la Vida ahora",
          actionRoute: "/alerta",
          helplineName: "Línea de la Vida",
          helphoneNumber: "800 911 2000",
        }
      : undefined,
    timestamp: new Date().toISOString(),
    nextState: result.nextState,
    quickReplies: result.quickReplies,
  };
}
