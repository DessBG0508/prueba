import { DEMO_MODE } from "./mock-data";
import { supabase, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from "./supabase";
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

import {
  processEliMessage,
  INITIAL_SCREENING_STATE,
  type ScreeningState,
  type ScreeningNivel,
} from "./eli-screening";

let currentBackendState: ScreeningState = { ...INITIAL_SCREENING_STATE };

export function resetBackendScreeningState() {
  currentBackendState = { ...INITIAL_SCREENING_STATE };
}

export interface TamizajeSubmissionPayload {
  paciente: {
    iniciales: string;
    edad: number;
    sexo: string;
    semestre: string;
  };
  GAD7: number[]; // number[7], valores 0-3
  PHQ9: number[]; // number[9], valores 0-3
}

export interface TamizajeEdgeResultData {
  folio: string;
  nivel: ScreeningNivel;
  alerta: boolean;
  resultados?: Array<{
    instrumento: string;
    total: number;
    interpretacion: string;
    item9?: number;
    nivel: string;
  }>;
}

export interface TamizajeEdgeResponse {
  status: "completado" | "error";
  data?: TamizajeEdgeResultData;
  mensaje?: string;
  fuente_mensaje?: string;
  error?: string;
}

/**
 * Invoca la Edge Function `tamizaje` en Supabase al concluir el reactivo 9 de PHQ-9.
 * Utiliza supabase.functions.invoke inyectando automáticamente la URL y clave pública anónima.
 */
export async function invokeTamizajeEdgeFunction(
  payload: TamizajeSubmissionPayload,
): Promise<{ data: TamizajeEdgeResponse | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("tamizaje", {
      body: payload,
    });

    if (error) {
      return {
        data: null,
        error: error.message || "Error al invocar la función de tamizaje en Supabase",
      };
    }

    if (!data) {
      return {
        data: null,
        error: "No se recibió respuesta de la función de tamizaje",
      };
    }

    if (data.status === "error" || data.error) {
      return {
        data: null,
        error: data.error || data.mensaje || "Error al procesar el tamizaje en el servidor",
      };
    }

    return { data: data as TamizajeEdgeResponse, error: null };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Error de red al conectar con la función de tamizaje";
    return {
      data: null,
      error: errorMsg,
    };
  }
}

export interface EdgeTamizajeData {
  folio?: string;
  nivel?: ScreeningNivel;
  alerta?: boolean;
  paciente?: {
    iniciales?: string;
    edad?: number;
    sexo?: string;
    semestre?: string;
  };
  GAD_7?: {
    total?: number;
    items?: number[];
  };
  PHQ_9?: {
    total?: number;
    items?: number[];
    item9?: number;
  };
  recomendaciones?: string;
}

export interface EdgeFunctionTamizajeResult {
  status: "en_progreso" | "completado";
  mensaje?: string;
  data?: EdgeTamizajeData;
  error?: string;
}

export interface GeminiHistoryItem {
  role: "user" | "model";
  parts: { text: string }[];
}

/**
 * Llamada oficial a la Edge Function de Supabase `tamizaje`.
 * La API Key de Gemini reside protegida en Supabase Secrets (no en el frontend).
 */
export async function callTamizajeEdgeFunction(
  historial: GeminiHistoryItem[],
): Promise<EdgeFunctionTamizajeResult | null> {
  const URL_FN = `${supabaseUrl}/functions/v1/tamizaje`;
  const ANON_KEY = supabaseAnonKey;

  try {
    const res = await fetch(URL_FN, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + ANON_KEY,
        apikey: ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: historial }),
    });

    if (!res.ok) {
      return null;
    }

    const data: EdgeFunctionTamizajeResult = await res.json();
    if (data.error) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export interface SendEliMessageResult extends EliMessage {
  status?: "en_progreso" | "completado";
  edgeData?: EdgeTamizajeData;
  nextState?: ScreeningState;
  quickReplies?: string[];
}

export async function sendEliMessage(
  mensaje: string,
  state?: ScreeningState,
  historial?: GeminiHistoryItem[],
): Promise<SendEliMessageResult> {
  const activeState = state || currentBackendState;

  // 1. Intentar llamar a la Edge Function de Supabase si se provee historial
  if (historial && historial.length > 0) {
    const edgeResult = await callTamizajeEdgeFunction(historial);

    if (edgeResult && (edgeResult.status === "en_progreso" || edgeResult.status === "completado")) {
      const isCompletado = edgeResult.status === "completado";
      const edgeData = edgeResult.data;
      const replyText =
        edgeResult.mensaje ||
        (isCompletado
          ? `Tamizaje finalizado. Tu folio es: ${edgeData?.folio || "EQ-0000"}. Gracias. Un profesional revisará tus respuestas.`
          : "");

      const isCrisis =
        edgeData?.nivel === "rojo" ||
        edgeData?.alerta === true ||
        replyText.includes("Línea de la Vida") ||
        replyText.includes("urgencias");

      // Construir nextState sincronizado con la Edge Function
      const nextState: ScreeningState = {
        ...activeState,
        step: isCompletado ? "completed" : activeState.step,
        folio: edgeData?.folio || activeState.folio,
        nivel: edgeData?.nivel || activeState.nivel,
        paciente: {
          iniciales: edgeData?.paciente?.iniciales || activeState.paciente.iniciales,
          edad: edgeData?.paciente?.edad || activeState.paciente.edad,
          sexo: edgeData?.paciente?.sexo || activeState.paciente.sexo,
          semestre: edgeData?.paciente?.semestre || activeState.paciente.semestre,
        },
        gad7Items: edgeData?.GAD_7?.items || activeState.gad7Items,
        phq9Items: edgeData?.PHQ_9?.items || activeState.phq9Items,
      };

      if (!state) {
        currentBackendState = nextState;
      }

      return {
        id: crypto.randomUUID(),
        sender: "eli",
        text: replyText,
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
        status: edgeResult.status,
        edgeData,
        nextState,
      };
    }
  }

  // 2. Fallback resiliente al motor de reglas local (para desarrollo, offline o si falta GEMINI_API_KEY en Supabase)
  await new Promise((resolve) => setTimeout(resolve, 350));
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
    status: result.isCompleted ? "completado" : "en_progreso",
    edgeData: result.finalJson
      ? {
          folio: result.finalJson.folio,
          nivel: result.finalJson.nivel,
          alerta: result.finalJson.alerta,
          paciente: result.finalJson.paciente,
          GAD_7: result.finalJson.GAD_7,
          PHQ_9: result.finalJson.PHQ_9,
          recomendaciones: result.finalJson.recomendaciones,
        }
      : undefined,
    nextState: result.nextState,
    quickReplies: result.quickReplies,
  };
}
