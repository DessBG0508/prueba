export { ELI_SYSTEM_INSTRUCTIONS } from "@/config/eli-prompt";

export interface ScreeningState {
  step:
    | "not_started"
    | "waiting_consent"
    | "declined"
    | "waiting_initials"
    | "waiting_age"
    | "waiting_sex"
    | "waiting_date"
    | "gad7"
    | "phq9"
    | "completed";
  currentQuestionIndex: number;
  paciente: {
    iniciales: string;
    edad: number;
    sexo: string;
    fecha: string;
  };
  gad7Items: number[];
  phq9Items: number[];
}

export const INITIAL_SCREENING_STATE: ScreeningState = {
  step: "not_started",
  currentQuestionIndex: 0,
  paciente: {
    iniciales: "",
    edad: 0,
    sexo: "",
    fecha: "",
  },
  gad7Items: [],
  phq9Items: [],
};

export const GAD7_QUESTIONS = [
  "1. Se ha sentido nervioso/a, ansioso/a o muy tenso/a.",
  "2. No ha sido capaz de dejar de preocuparse o de controlar la preocupación.",
  "3. Se ha preocupado demasiado por diferentes cosas.",
  "4. Ha tenido dificultad para relajarse.",
  "5. Se ha sentido tan inquieto/a que no ha podido permanecer quieto/a.",
  "6. Se ha sentido fácilmente molesto/a o irritable.",
  "7. Ha sentido miedo, como si algo terrible pudiera pasar.",
];

export const PHQ9_QUESTIONS = [
  "1. Poco interés o placer en hacer las cosas.",
  "2. Se ha sentido decaído(a), deprimido(a) o sin esperanza.",
  "3. Ha tenido dificultad para dormir o ha dormido demasiado.",
  "4. Se ha sentido cansado(a) o con poca energía.",
  "5. Ha tenido poco apetito o ha comido en exceso.",
  "6. Se ha sentido mal consigo mismo(a) o que ha decepcionado a su familia.",
  "7. Ha tenido dificultad para concentrarse.",
  "8. Se ha movido o hablado muy lento, o ha estado muy inquieto(a), más de lo habitual.",
  "9. Ha tenido pensamientos de que estaría mejor muerto(a) o de hacerse daño.",
];

export const GAD7_INTRO =
  "Ahora 7 preguntas sobre ansiedad. Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas? Responde con: Nunca / Varios días / Más de la mitad de los días / Casi todos los días.";

export const PHQ9_INTRO = "Ahora 9 preguntas sobre estado de ánimo, mismas opciones de respuesta.";

export const CRISIS_MESSAGE =
  "Tu seguridad es importante. Te recomiendo contactar ahora a Línea de la Vida 800 911 2000 / SAPTEL 800 472 7835 o acudir a urgencias. Un profesional revisará tus respuestas.";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Mapea una respuesta a un puntaje 0-3 para los reactivos GAD-7 y PHQ-9.
 * Retorna null si no coincide con ninguna opción válida.
 */
export function parseLikertOption(text: string): number | null {
  const norm = normalize(text);

  if (
    norm === "0" ||
    norm === "nunca" ||
    norm === "ningun dia" ||
    norm === "ninguno" ||
    norm === "jamas"
  ) {
    return 0;
  }

  if (
    norm === "1" ||
    norm === "varios dias" ||
    norm === "pocos dias" ||
    norm === "algunos dias" ||
    norm === "a veces"
  ) {
    return 1;
  }

  if (
    norm === "2" ||
    norm.includes("mas de la mitad") ||
    norm === "frecuente" ||
    norm === "frecuentemente"
  ) {
    return 2;
  }

  if (
    norm === "3" ||
    norm.includes("casi todos") ||
    norm.includes("todos los dias") ||
    norm === "diario" ||
    norm === "siempre"
  ) {
    return 3;
  }

  return null;
}

export interface ScreeningFinalJson {
  paciente: {
    iniciales: string;
    edad: number;
    sexo: string;
    fecha: string;
  };
  GAD_7: {
    total: number;
    items: number[];
  };
  PHQ_9: {
    total: number;
    items: number[];
    item9: number;
  };
  alerta: boolean;
  recomendaciones: string;
}

export interface EliStepResult {
  replyText: string;
  nextState: ScreeningState;
  isCrisis?: boolean;
  isCompleted?: boolean;
  finalJson?: ScreeningFinalJson;
  quickReplies?: string[];
}

export function processEliMessage(userText: string, currentState: ScreeningState): EliStepResult {
  const trimmed = userText.trim();

  // PASO 0 — Sea lo que sea que escriba el usuario en su primer mensaje:
  if (currentState.step === "not_started") {
    return {
      replyText:
        "Soy Eli, asistente de tamizaje. No doy diagnóstico. Tus respuestas serán confidenciales y un profesional las revisará. ¿Aceptas participar? (Sí/No)",
      nextState: {
        ...currentState,
        step: "waiting_consent",
      },
      quickReplies: ["Sí", "No"],
    };
  }

  // PASO 1 — Esperando consentimiento
  if (currentState.step === "waiting_consent") {
    const norm = normalize(trimmed);
    if (norm === "no" || norm === "no acepto" || norm === "rechazar" || norm === "cancelar") {
      return {
        replyText: "Gracias por tu tiempo. Si cambias de opinión, aquí estaré.",
        nextState: {
          ...currentState,
          step: "declined",
        },
      };
    }

    if (
      norm === "si" ||
      norm === "acepto" ||
      norm === "si acepto" ||
      norm === "ok" ||
      norm === "claro" ||
      norm === "de acuerdo" ||
      norm === "adelante"
    ) {
      return {
        replyText: "Perfecto. ¿Cuáles son tus iniciales?",
        nextState: {
          ...currentState,
          step: "waiting_initials",
        },
      };
    }

    // Redirección
    return {
      replyText: "Anotado. ¿Aceptas participar? (Sí/No)",
      nextState: currentState,
      quickReplies: ["Sí", "No"],
    };
  }

  // Si ya había terminado o declinado
  if (currentState.step === "declined" || currentState.step === "completed") {
    return {
      replyText:
        "Soy Eli, asistente de tamizaje. No doy diagnóstico. Tus respuestas serán confidenciales y un profesional las revisará. ¿Aceptas participar? (Sí/No)",
      nextState: {
        ...INITIAL_SCREENING_STATE,
        step: "waiting_consent",
      },
      quickReplies: ["Sí", "No"],
    };
  }

  // PASO 2 — Iniciales
  if (currentState.step === "waiting_initials") {
    if (!trimmed || trimmed.length > 50) {
      return {
        replyText: "Anotado. ¿Cuáles son tus iniciales?",
        nextState: currentState,
      };
    }

    return {
      replyText: "¿Qué edad tienes?",
      nextState: {
        ...currentState,
        paciente: {
          ...currentState.paciente,
          iniciales: trimmed.toUpperCase(),
        },
        step: "waiting_age",
      },
    };
  }

  // PASO 3 — Edad
  if (currentState.step === "waiting_age") {
    const parsedAge = parseInt(trimmed.replace(/\D/g, ""), 10);
    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 115) {
      return {
        replyText: "Anotado. ¿Qué edad tienes?",
        nextState: currentState,
      };
    }

    return {
      replyText: "¿Tu sexo? (Femenino / Masculino / Otro)",
      nextState: {
        ...currentState,
        paciente: {
          ...currentState.paciente,
          edad: parsedAge,
        },
        step: "waiting_sex",
      },
      quickReplies: ["Femenino", "Masculino", "Otro"],
    };
  }

  // PASO 4 — Sexo
  if (currentState.step === "waiting_sex") {
    const norm = normalize(trimmed);
    let resolvedSex = "";
    if (norm.startsWith("fem") || norm === "f" || norm === "mujer") {
      resolvedSex = "Femenino";
    } else if (norm.startsWith("masc") || norm === "m" || norm === "hombre") {
      resolvedSex = "Masculino";
    } else if (norm.includes("otro") || norm.includes("no binario") || norm.includes("prefiero")) {
      resolvedSex = "Otro";
    }

    if (!resolvedSex) {
      return {
        replyText: "Anotado. ¿Tu sexo? (Femenino / Masculino / Otro)",
        nextState: currentState,
        quickReplies: ["Femenino", "Masculino", "Otro"],
      };
    }

    return {
      replyText: "¿Fecha de hoy?",
      nextState: {
        ...currentState,
        paciente: {
          ...currentState.paciente,
          sexo: resolvedSex,
        },
        step: "waiting_date",
      },
      quickReplies: [
        new Date().toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      ],
    };
  }

  // PASO 5 — Fecha de hoy
  if (currentState.step === "waiting_date") {
    const dateStr = trimmed || new Date().toISOString().split("T")[0];

    const nextState: ScreeningState = {
      ...currentState,
      paciente: {
        ...currentState.paciente,
        fecha: dateStr,
      },
      step: "gad7",
      currentQuestionIndex: 0,
      gad7Items: [],
    };

    return {
      replyText: `${GAD7_INTRO}\n\n${GAD7_QUESTIONS[0]}`,
      nextState,
      quickReplies: ["Nunca", "Varios días", "Más de la mitad de los días", "Casi todos los días"],
    };
  }

  // PASO 6 — GAD-7 reactivos (7 preguntas)
  if (currentState.step === "gad7") {
    const score = parseLikertOption(trimmed);
    const qIndex = currentState.currentQuestionIndex;

    if (score === null) {
      return {
        replyText: `Anotado. ${GAD7_QUESTIONS[qIndex]}`,
        nextState: currentState,
        quickReplies: [
          "Nunca",
          "Varios días",
          "Más de la mitad de los días",
          "Casi todos los días",
        ],
      };
    }

    const updatedItems = [...currentState.gad7Items, score];

    // ¿Faltan más preguntas de GAD-7?
    if (qIndex + 1 < GAD7_QUESTIONS.length) {
      const nextQIndex = qIndex + 1;
      return {
        replyText: GAD7_QUESTIONS[nextQIndex],
        nextState: {
          ...currentState,
          currentQuestionIndex: nextQIndex,
          gad7Items: updatedItems,
        },
        quickReplies: [
          "Nunca",
          "Varios días",
          "Más de la mitad de los días",
          "Casi todos los días",
        ],
      };
    }

    // Terminó GAD-7 -> Pasar a PHQ-9
    return {
      replyText: `${PHQ9_INTRO}\n\n${PHQ9_QUESTIONS[0]}`,
      nextState: {
        ...currentState,
        step: "phq9",
        currentQuestionIndex: 0,
        gad7Items: updatedItems,
        phq9Items: [],
      },
      quickReplies: ["Nunca", "Varios días", "Más de la mitad de los días", "Casi todos los días"],
    };
  }

  // PASO 7 — PHQ-9 reactivos (9 preguntas)
  if (currentState.step === "phq9") {
    const score = parseLikertOption(trimmed);
    const qIndex = currentState.currentQuestionIndex;

    if (score === null) {
      return {
        replyText: `Anotado. ${PHQ9_QUESTIONS[qIndex]}`,
        nextState: currentState,
        quickReplies: [
          "Nunca",
          "Varios días",
          "Más de la mitad de los días",
          "Casi todos los días",
        ],
      };
    }

    const updatedItems = [...currentState.phq9Items, score];

    // ¿Faltan más preguntas de PHQ-9?
    if (qIndex + 1 < PHQ9_QUESTIONS.length) {
      const nextQIndex = qIndex + 1;
      return {
        replyText: PHQ9_QUESTIONS[nextQIndex],
        nextState: {
          ...currentState,
          currentQuestionIndex: nextQIndex,
          phq9Items: updatedItems,
        },
        quickReplies: [
          "Nunca",
          "Varios días",
          "Más de la mitad de los días",
          "Casi todos los días",
        ],
      };
    }

    // Terminó ítem 9 de PHQ-9!
    const item9Score = score;
    const isCrisis = item9Score >= 1; // "Varios días" (1), "Más de la mitad de los días" (2), o "Casi todos los días" (3)

    const gadTotal = currentState.gad7Items.reduce((acc, curr) => acc + curr, 0);
    const phqTotal = updatedItems.reduce((acc, curr) => acc + curr, 0);
    const isAlert = isCrisis || gadTotal >= 15 || phqTotal >= 15;

    let recomendaciones = "";
    if (isCrisis) {
      recomendaciones =
        "Atención prioritaria inmediata recomendada por respuesta afirmativa a ideación o autolesión. Canalización prioritaria con psicología o servicios de urgencias.";
    } else if (phqTotal >= 15 || gadTotal >= 15) {
      recomendaciones =
        "Sintomatología severa detectada en tamizaje. Se sugiere valoración presencial con psicología universitaria.";
    } else if (phqTotal >= 10 || gadTotal >= 10) {
      recomendaciones =
        "Sintomatología moderada detectada. Se recomienda seguimiento y apoyo psicopedagógico.";
    } else {
      recomendaciones =
        "Sintomatología leve o mínima. Mantener rutinas de autocuidado y monitoreo periódico de bienestar.";
    }

    const finalJson = {
      paciente: {
        iniciales: currentState.paciente.iniciales || "",
        edad: currentState.paciente.edad || 0,
        sexo: currentState.paciente.sexo || "",
        fecha: currentState.paciente.fecha || "",
      },
      GAD_7: {
        total: gadTotal,
        items: currentState.gad7Items,
      },
      PHQ_9: {
        total: phqTotal,
        items: updatedItems,
        item9: item9Score,
      },
      alerta: isAlert,
      recomendaciones,
    };

    const jsonString = JSON.stringify(finalJson);

    let replyText = "";
    if (isCrisis) {
      replyText = `${CRISIS_MESSAGE}\n\n${jsonString}\nGracias. Un profesional revisará tus respuestas.`;
    } else {
      replyText = `${jsonString}\nGracias. Un profesional revisará tus respuestas.`;
    }

    return {
      replyText,
      nextState: {
        ...currentState,
        step: "completed",
        currentQuestionIndex: 8,
        phq9Items: updatedItems,
      },
      isCrisis,
      isCompleted: true,
      finalJson,
    };
  }

  // Fallback
  return {
    replyText:
      "Soy Eli, asistente de tamizaje. No doy diagnóstico. Tus respuestas serán confidenciales y un profesional las revisará. ¿Aceptas participar? (Sí/No)",
    nextState: {
      ...INITIAL_SCREENING_STATE,
      step: "waiting_consent",
    },
    quickReplies: ["Sí", "No"],
  };
}
