import { DEMO_MODE } from "./mock-data";
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
  if (!DEMO_MODE) throw new Error("El servicio todavía no está conectado.");
  // Fase Cloud: esta escritura usará acceso autenticado y políticas RLS por rol.
  return Promise.resolve(checkIn);
}

export async function triggerRedAlert(checkInId: string): Promise<{ alertId: string }> {
  if (!DEMO_MODE) throw new Error("El servicio todavía no está conectado.");
  // Fase Cloud: solo psicología y coordinación podrán consultar alertas asignadas.
  return Promise.resolve({ alertId: `demo-alert-${checkInId}` });
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

let responseIndex = 0;

/* TODO(Gemini): conectar a Gemini API con RAG sobre manuales PHQ-9/GAD-7 vía backend. La API key NUNCA va en el frontend */
export async function sendEliMessage(mensaje: string): Promise<EliMessage> {
  // Simulación de latencia de red de 1 a 1.5 segundos en DEMO_MODE
  await new Promise((resolve) => setTimeout(resolve, 1200));

  /* TODO(Supabase Edge): este filtro DEBE migrar al backend — nunca confiar solo en el cliente */
  if (detectCrisis(mensaje)) {
    return {
      id: crypto.randomUUID(),
      sender: "eli",
      text: "Me alegra que me lo cuentes. Esto es importante y no estás solo/a.",
      isCrisisProtocol: true,
      crisisData: {
        actionLabel: "Necesito hablar con alguien ahora",
        actionRoute: "/alerta",
        helplineName: "Línea de la Vida",
        helphoneNumber: "800 911 2000",
      },
      timestamp: new Date().toISOString(),
    };
  }

  if (DEMO_MODE) {
    const normalized = normalizeText(mensaje);

    // Intentar buscar respuesta contextual que coincida con alguna palabra clave
    const matched = CONTEXTUAL_RESPONSES.find(
      (entry) => entry.keywords.length > 0 && entry.keywords.some((kw) => normalized.includes(kw)),
    );

    let chosenText: string;
    if (matched) {
      chosenText = matched.text;
    } else {
      // Rotar entre las respuestas generales
      const fallbackList = CONTEXTUAL_RESPONSES.filter((entry) => entry.keywords.length === 0);
      const chosen = fallbackList[responseIndex % fallbackList.length];
      responseIndex++;
      chosenText = chosen
        ? chosen.text
        : "Aquí estoy contigo para escucharte y acompañarte en tu día.";
    }

    return {
      id: crypto.randomUUID(),
      sender: "eli",
      text: chosenText,
      isCrisisProtocol: false,
      timestamp: new Date().toISOString(),
    };
  }

  throw new Error("El servicio de inteligencia artificial no está configurado.");
}
