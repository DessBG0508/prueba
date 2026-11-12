export { ELI_SYSTEM_INSTRUCTIONS } from "@/config/eli-prompt";

export type ScreeningNivel = "verde" | "amarillo" | "rojo";

export interface ScreeningPatientData {
  iniciales: string;
  edad: number;
  sexo: string;
  fecha: string;
  semestre?: string;
}

export type ScreeningStep =
  | "not_started"
  | "waiting_consent"
  | "declined"
  | "waiting_initials"
  | "waiting_age"
  | "waiting_sex"
  | "waiting_fecha"
  | "gad7"
  | "phq9"
  | "completed";

export interface ScreeningState {
  step: ScreeningStep;
  currentQuestionIndex: number;
  paciente: ScreeningPatientData;
  gad7Items: number[];
  phq9Items: number[];
  folio?: string;
  nivel?: ScreeningNivel;
}

export const INITIAL_SCREENING_STATE: ScreeningState = {
  step: "waiting_consent",
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

export const ELI_WELCOME_MESSAGE =
  "Soy Eli, asistente de tamizaje. No doy diagnóstico. Tus respuestas serán confidenciales y un profesional las revisará. ¿Aceptas participar? (Sí/No)";

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

export const GAD7_ANUNCIO =
  "Ahora 7 preguntas sobre ansiedad. Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas? Responde con: Nunca / Varios días / Más de la mitad de los días / Casi todos los días.";

export const PHQ9_ANUNCIO =
  "Ahora 9 preguntas sobre estado de ánimo, mismas opciones de respuesta.";

export const CRISIS_MESSAGE =
  "Tu seguridad es importante. Te recomiendo contactar ahora a Línea de la Vida 800 911 2000 / SAPTEL 800 472 7835 o acudir a urgencias. Un profesional revisará tus respuestas.";

export function generateFolio(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `EQ-${randomNum}`;
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Lista canónica de palabras y frases críticas de riesgo de autolesión o crisis suicida.
 * Detección heurística en el cliente (SIN Gemini) para mostrar inmediatamente Línea de la Vida y SAPTEL.
 */
export const CRISIS_KEYWORDS: string[] = [
  "suicidio",
  "suicida",
  "suicidarme",
  "suicidarse",
  "morir",
  "morirme",
  "quiero morir",
  "deseo morir",
  "preferiria morir",
  "mejor muerto",
  "mejor muerta",
  "matarme",
  "matar",
  "quitarme la vida",
  "quitar la vida",
  "hacerme dano",
  "hacerse dano",
  "danarme",
  "cortarme",
  "autolesion",
  "autolesionarme",
  "lastimarme",
  "acabar con todo",
  "terminar con todo",
  "acabar con mi vida",
  "poner fin a todo",
  "poner fin a mi vida",
  "no quiero vivir",
  "ya no quiero vivir",
  "no vale la pena vivir",
  "no tiene sentido vivir",
  "desaparecer",
  "no despertar",
  "ojala no despertara",
  "ya no puedo mas",
];

export function detectCrisisKeywords(text: string): boolean {
  if (!text) return false;
  const norm = normalize(text);

  return CRISIS_KEYWORDS.some((kw) => {
    if (kw.includes(" ")) {
      return norm.includes(kw);
    }
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    return regex.test(norm);
  });
}

/**
 * Convierte respuestas a puntaje Likert:
 * Nunca = 0, Varios días = 1, Más de la mitad de los días = 2, Casi todos los días = 3.
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
    norm === "mas de la mitad de los dias" ||
    norm === "frecuente" ||
    norm === "frecuentemente"
  ) {
    return 2;
  }

  if (
    norm === "3" ||
    norm.includes("casi todos") ||
    norm.includes("casi todos los dias") ||
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
  folio: string;
  nivel: ScreeningNivel;
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
  folio?: string;
  nivel?: ScreeningNivel;
  isReadyForSubmission?: boolean;
  submissionPayload?: {
    paciente: {
      iniciales: string;
      edad: number;
      sexo: string;
      fecha?: string;
      semestre?: string;
    };
    GAD7: number[];
    PHQ9: number[];
  };
}

/**
 * Motor central de la aplicación de tamizaje por Eli conforme al protocolo oficial.
 */
export function processEliMessage(userText: string, currentState: ScreeningState): EliStepResult {
  const trimmed = userText.trim();

  // PASO 0 — Mensaje de bienvenida EXACTO
  if (currentState.step === "not_started") {
    return {
      replyText: ELI_WELCOME_MESSAGE,
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
      norm === "adelante" ||
      norm === "iniciar" ||
      norm === "iniciar tamizaje"
    ) {
      return {
        replyText: "Perfecto. ¿Cuáles son tus iniciales?",
        nextState: {
          ...currentState,
          step: "waiting_initials",
        },
      };
    }

    // Redirección con "Anotado." y pregunta pendiente
    return {
      replyText: "Anotado. ¿Aceptas participar? (Sí/No)",
      nextState: currentState,
      quickReplies: ["Sí", "No"],
    };
  }

  // Si ya había declinado o completado, reiniciar desde PASO 0
  if (currentState.step === "declined" || currentState.step === "completed") {
    return {
      replyText: ELI_WELCOME_MESSAGE,
      nextState: {
        ...INITIAL_SCREENING_STATE,
        step: "waiting_consent",
      },
      quickReplies: ["Sí", "No"],
    };
  }

  // PASO 1 -> PASO 2: Iniciales
  if (currentState.step === "waiting_initials") {
    if (!trimmed || trimmed.length > 50) {
      return {
        replyText: "Anotado. ¿Cuáles son tus iniciales?",
        nextState: currentState,
      };
    }

    const cleanInitials =
      trimmed
        .toUpperCase()
        .replace(/[^A-ZÁÉÍÓÚÑ.\s]/g, "")
        .slice(0, 10) || trimmed.slice(0, 10).toUpperCase();

    return {
      replyText: "¿Qué edad tienes?",
      nextState: {
        ...currentState,
        paciente: {
          ...currentState.paciente,
          iniciales: cleanInitials,
        },
        step: "waiting_age",
      },
    };
  }

  // PASO 2 -> PASO 3: Edad
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

  // PASO 3 -> PASO 4: Sexo
  if (currentState.step === "waiting_sex") {
    const norm = normalize(trimmed);
    let resolvedSex = "";
    if (norm.startsWith("fem") || norm === "f" || norm === "mujer") {
      resolvedSex = "Femenino";
    } else if (norm.startsWith("masc") || norm === "m" || norm === "hombre") {
      resolvedSex = "Masculino";
    } else if (
      norm.includes("otro") ||
      norm.includes("no binario") ||
      norm.includes("prefiero") ||
      norm.includes("nb")
    ) {
      resolvedSex = "Otro";
    }

    if (!resolvedSex) {
      return {
        replyText: "Anotado. ¿Tu sexo? (Femenino / Masculino / Otro)",
        nextState: currentState,
        quickReplies: ["Femenino", "Masculino", "Otro"],
      };
    }

    const todayStr = new Date().toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return {
      replyText: "¿Fecha de hoy?",
      nextState: {
        ...currentState,
        paciente: {
          ...currentState.paciente,
          sexo: resolvedSex,
        },
        step: "waiting_fecha",
      },
      quickReplies: [todayStr, "Hoy"],
    };
  }

  // PASO 4 -> PASO 5: Fecha de hoy
  if (currentState.step === "waiting_fecha") {
    const norm = normalize(trimmed);
    let resolvedFecha = trimmed;
    if (norm === "hoy" || norm === "fecha de hoy") {
      resolvedFecha = new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    if (!resolvedFecha || resolvedFecha.length > 50) {
      return {
        replyText: "Anotado. ¿Fecha de hoy?",
        nextState: currentState,
        quickReplies: [
          new Date().toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
        ],
      };
    }

    const nextState: ScreeningState = {
      ...currentState,
      paciente: {
        ...currentState.paciente,
        fecha: resolvedFecha,
      },
      step: "gad7",
      currentQuestionIndex: 0,
      gad7Items: [],
    };

    return {
      replyText: `${GAD7_ANUNCIO}\n\n${GAD7_QUESTIONS[0]}`,
      nextState,
      quickReplies: ["Nunca", "Varios días", "Más de la mitad de los días", "Casi todos los días"],
    };
  }

  // PASO 5 — GAD-7 reactivos (7 preguntas)
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

    // ¿Faltan preguntas de GAD-7?
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

    // Terminó GAD-7 -> Anunciar PHQ-9 y primera pregunta (PASO 6)
    return {
      replyText: `${PHQ9_ANUNCIO}\n\n${PHQ9_QUESTIONS[0]}`,
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

  // PASO 6 — PHQ-9 reactivos (9 preguntas)
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

    // ¿Faltan preguntas de PHQ-9?
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

    // Reactivo 9 de PHQ-9 respondido: aplicar regla de crisis y generar JSON final
    const gad7Total = currentState.gad7Items.reduce((acc, v) => acc + v, 0);
    const phq9Total = updatedItems.reduce((acc, v) => acc + v, 0);
    const item9Score = score;

    // REGLA DE CRISIS (prioridad máxima):
    // Si la respuesta al ítem 9 del PHQ-9 es "Varios días", "Más de la mitad de los días" o "Casi todos los días" (score > 0)
    const hasCrisisItem9 = item9Score > 0;
    const isCrisis = hasCrisisItem9 || phq9Total >= 20 || gad7Total >= 15;

    let nivel: ScreeningNivel = "verde";
    if (isCrisis) {
      nivel = "rojo";
    } else if (phq9Total >= 10 || gad7Total >= 10) {
      nivel = "amarillo";
    } else {
      nivel = "verde";
    }

    const folio = generateFolio();

    const recomendaciones =
      nivel === "rojo"
        ? "Atención prioritaria inmediata en Terapia Psicológica"
        : nivel === "amarillo"
          ? "Orientación o Terapia Psicológica recomendada"
          : "Consejería preventiva opcional";

    // FORMATO JSON FINAL (claves exactas, sin acentos, al terminar el ítem 9)
    const jsonOutput = JSON.stringify({
      paciente: {
        iniciales: currentState.paciente.iniciales || "",
        edad: currentState.paciente.edad || 0,
        sexo: currentState.paciente.sexo || "",
        fecha: currentState.paciente.fecha || new Date().toLocaleDateString("es-MX"),
      },
      GAD_7: {
        total: gad7Total,
        items: currentState.gad7Items,
      },
      PHQ_9: {
        total: phq9Total,
        items: updatedItems,
        item9: item9Score,
      },
      alerta: isCrisis,
      recomendaciones,
    });

    // Construcción de la respuesta de Eli
    let replyText = "";
    if (hasCrisisItem9) {
      replyText = `${CRISIS_MESSAGE}\n\nTu folio de tamizaje es: ${folio}\nEscríbelo en el formulario de la Agenda para vincular tus resultados.\n\n${jsonOutput}\nGracias. Un profesional revisará tus respuestas.`;
    } else if (nivel === "rojo") {
      replyText = `${CRISIS_MESSAGE}\n\nRequieres atención prioritaria. Por favor agenda tu cita hoy mismo en el apartado 'Agenda de Citas' de esta plataforma y elige TERAPIA PSICOLÓGICA.\n\nTu folio de tamizaje es: ${folio}\nEscríbelo en el formulario para vincular tus resultados.\n\n${jsonOutput}\nGracias. Un profesional revisará tus respuestas.`;
    } else if (nivel === "amarillo") {
      replyText = `Tus resultados sugieren que sería beneficioso recibir apoyo profesional. Te recomiendo agendar una cita en el apartado 'Agenda de Citas' de esta plataforma, eligiendo ORIENTACIÓN o TERAPIA PSICOLÓGICA.\n\nTu folio de tamizaje es: ${folio}\nEscríbelo en el formulario para vincular tus resultados.\n\n${jsonOutput}\nGracias. Un profesional revisará tus respuestas.`;
    } else {
      replyText = `Tus resultados no muestran señales de alerta en este momento. Si en algún momento lo deseas, puedes agendar una sesión de CONSEJERÍA en el apartado 'Agenda de Citas' de esta plataforma.\n\nTu folio de tamizaje es: ${folio} por si deseas vincularlo.\n\n${jsonOutput}\nGracias. Un profesional revisará tus respuestas.`;
    }

    const finalJson: ScreeningFinalJson = {
      paciente: {
        iniciales: currentState.paciente.iniciales || "",
        edad: currentState.paciente.edad || 0,
        sexo: currentState.paciente.sexo || "",
        fecha: currentState.paciente.fecha || new Date().toLocaleDateString("es-MX"),
      },
      GAD_7: {
        total: gad7Total,
        items: currentState.gad7Items,
      },
      PHQ_9: {
        total: phq9Total,
        items: updatedItems,
        item9: item9Score,
      },
      folio,
      nivel,
      alerta: isCrisis,
      recomendaciones,
    };

    return {
      replyText,
      nextState: {
        ...currentState,
        currentQuestionIndex: 8,
        phq9Items: updatedItems,
        step: "completed",
        folio,
        nivel,
      },
      folio,
      nivel,
      isCrisis,
      isCompleted: true,
      finalJson,
      isReadyForSubmission: true,
      submissionPayload: {
        paciente: {
          iniciales: currentState.paciente.iniciales || "",
          edad: currentState.paciente.edad || 0,
          sexo: currentState.paciente.sexo || "",
          fecha: currentState.paciente.fecha || new Date().toLocaleDateString("es-MX"),
          semestre: currentState.paciente.semestre,
        },
        GAD7: currentState.gad7Items,
        PHQ9: updatedItems,
      },
    };
  }

  // Fallback de seguridad: reiniciar en bienvenida
  return {
    replyText: ELI_WELCOME_MESSAGE,
    nextState: {
      ...INITIAL_SCREENING_STATE,
      step: "waiting_consent",
    },
    quickReplies: ["Sí", "No"],
  };
}
