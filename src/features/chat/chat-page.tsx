import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  History,
  RotateCcw,
  Plus,
  ChevronRight,
  Sparkles,
  Send,
  ArrowLeft,
  ShieldAlert,
  Phone,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Copy,
  Ticket,
  Mic,
} from "lucide-react";
import { VoiceNoteRecorder } from "@/components/chat/voice-note-recorder";
import {
  resetBackendScreeningState,
  parseEdgeFunctionPayload,
  extractSafeMensaje,
  type EliMessage,
  type TamizajeSubmissionPayload,
} from "@/lib/api-client";
import { supabase, isDemoUserId } from "@/lib/supabase";
import { DEMO_MODE } from "@/lib/mock-data";
import {
  INITIAL_SCREENING_STATE,
  ELI_WELCOME_MESSAGE,
  type ScreeningState,
  type ScreeningNivel,
  type ScreeningDefaults,
  processEliMessage,
  buildEliCompletionMessage,
  parseLikertOption,
  CRISIS_MESSAGE,
  detectCrisisKeywords,
  getInitialsFromName,
  getTodayFormattedDate,
} from "@/lib/eli-screening";
import { sanitizeText } from "@/lib/security";
import { useAuth } from "@/lib/auth-context";
import { BRAND } from "@/lib/branding";
import { notificarTutorNivelRojo } from "@/features/tutor/tutor-service";
import {
  getChatSessionsStorageKey,
  getActiveSessionStorageKey,
  getStoredUserFolio,
  setStoredUserFolio,
  removeStoredUserFolio,
  clearLegacyUnscopedScreeningData,
} from "@/lib/screening-storage";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
  messages: EliMessage[];
  screeningState: ScreeningState;
}

// Limpiar versiones obsoletas y datos no-scoped residuales
if (typeof window !== "undefined") {
  clearLegacyUnscopedScreeningData();
}

function ensureSessionHasWelcome(session: ChatSession, defaults?: ScreeningDefaults): ChatSession {
  const baseState = session.screeningState || INITIAL_SCREENING_STATE;
  const hydratedState: ScreeningState = {
    ...baseState,
    paciente: {
      ...baseState.paciente,
      iniciales: baseState.paciente?.iniciales || defaults?.iniciales || "",
      fecha: baseState.paciente?.fecha || getTodayFormattedDate(),
      semestre: baseState.paciente?.semestre || defaults?.semestre,
    },
  };

  if (!session.messages || session.messages.length === 0) {
    const welcomeMsg: EliMessage = {
      id: crypto.randomUUID(),
      sender: "eli",
      text: ELI_WELCOME_MESSAGE,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    return {
      ...session,
      preview: ELI_WELCOME_MESSAGE.slice(0, 60),
      messages: [welcomeMsg],
      screeningState: {
        ...hydratedState,
        step: "waiting_consent",
      },
    };
  }
  return {
    ...session,
    screeningState: hydratedState,
  };
}

function createFreshSession(defaults?: ScreeningDefaults): ChatSession {
  const id = `session-${Date.now()}`;
  const initialMsg: EliMessage = {
    id: crypto.randomUUID(),
    sender: "eli",
    text: ELI_WELCOME_MESSAGE,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  return {
    id,
    title: "Nuevo tamizaje",
    updatedAt: "Ahora",
    preview: ELI_WELCOME_MESSAGE.slice(0, 60),
    messages: [initialMsg],
    screeningState: {
      ...INITIAL_SCREENING_STATE,
      paciente: {
        ...INITIAL_SCREENING_STATE.paciente,
        iniciales: defaults?.iniciales || "",
        fecha: getTodayFormattedDate(),
        semestre: defaults?.semestre,
      },
      step: "waiting_consent",
    },
  };
}

function loadUserSessions(
  userIdOrEmail?: string | null,
  defaults?: ScreeningDefaults,
): ChatSession[] {
  clearLegacyUnscopedScreeningData();
  if (typeof window === "undefined" || !userIdOrEmail) return [createFreshSession(defaults)];

  try {
    const key = getChatSessionsStorageKey(userIdOrEmail);
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s) => ensureSessionHasWelcome(s, defaults));
      }
    }
  } catch {
    // fallback
  }
  return [createFreshSession(defaults)];
}

export function ChatPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuth();
  const defaultPaciente: ScreeningDefaults = {
    iniciales: getInitialsFromName(user?.name, user?.email),
    semestre: user?.semestre,
  };

  // RD-07: Bloqueo persistente desde la base de datos (Supabase)
  const [isBlockedByBackend, setIsBlockedByBackend] = useState(false);

  // Inicializar sesiones scoped por usuario
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    return loadUserSessions(user?.id || user?.email, defaultPaciente);
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const userIdOrEmail = user?.id || user?.email;
      if (userIdOrEmail) {
        const storedId = localStorage.getItem(getActiveSessionStorageKey(userIdOrEmail));
        if (storedId && sessions.some((s) => s.id === storedId)) {
          return storedId;
        }
      }
    } catch {
      // fallback
    }
    return sessions[0]?.id || "default-session";
  });

  // Reaccionar al cambio de usuario (o login) para cargar exclusivamente sus sesiones
  useEffect(() => {
    const userIdOrEmail = user?.id || user?.email;
    const defaultsForUser: ScreeningDefaults = {
      iniciales: getInitialsFromName(user?.name, user?.email),
      semestre: user?.semestre,
    };
    const loaded = loadUserSessions(userIdOrEmail, defaultsForUser);
    setSessions(loaded);
    let activeId = loaded[0]?.id || "default-session";
    if (userIdOrEmail) {
      try {
        const storedId = localStorage.getItem(getActiveSessionStorageKey(userIdOrEmail));
        if (storedId && loaded.some((s) => s.id === storedId)) {
          activeId = storedId;
        }
      } catch {
        // ignore
      }
    }
    setActiveSessionId(activeId);
  }, [user?.id, user?.email, user?.name, user?.semestre]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAnalyzingResponses, setIsAnalyzingResponses] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [pendingSubmissionPayload, setPendingSubmissionPayload] =
    useState<TamizajeSubmissionPayload | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isSubmittingTamizajeRef = useRef(false);

  // Obtener sesión activa
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ||
    sessions[0] ||
    createFreshSession(defaultPaciente);
  const messages = activeSession.messages;
  const screeningState = activeSession.screeningState || INITIAL_SCREENING_STATE;

  const isRealUser = Boolean(user?.id && !isDemoUserId(user.id));
  const isDemoSession = DEMO_MODE && !isRealUser;

  // RD-07: Fix definitivo de bloqueo:
  // 1. isEffectiveBlocked depende ÚNICAMENTE de isBlockedByBackend (que consulta Supabase).
  // 2. Solo en sesión demo local se fuerza a false; si inició sesión con cuenta real de Supabase, respeta la BD.
  const isEffectiveBlocked = isDemoSession ? false : isBlockedByBackend;
  const isGatedByRisk = isEffectiveBlocked;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const messagesCount = messages.length;
  useEffect(() => {
    scrollToBottom();
  }, [messagesCount, isTyping, scrollToBottom]);

  // Persistir sesiones scoped al usuario activo
  const persistSessions = (newSessions: ChatSession[], newActiveId?: string) => {
    setSessions(newSessions);
    const userIdOrEmail = user?.id || user?.email;
    if (!userIdOrEmail) return;
    try {
      const sessionsKey = getChatSessionsStorageKey(userIdOrEmail);
      localStorage.setItem(sessionsKey, JSON.stringify(newSessions));
      if (newActiveId) {
        const activeKey = getActiveSessionStorageKey(userIdOrEmail);
        localStorage.setItem(activeKey, newActiveId);
      }
    } catch {
      // ignore storage errors
    }
  };

  // RD-07: Al montar el chat con sesión real: consultar pacientes por user_id (última fila).
  // Fuente única de verdad del bloqueo: Si bloqueado=false, NO debe existir ningún gating:
  // habilitar reinicios y placeholder normal, IGNORANDO y LIMPIANDO cualquier estado local
  // de "tamizaje completado" persistido del navegador.
  useEffect(() => {
    let isMounted = true;
    async function checkBlockedStatus() {
      // En sesión demo local, no bloquear jamás
      if (isDemoSession) {
        if (isMounted) setIsBlockedByBackend(false);
        return;
      }

      let authUserId = user?.id;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          authUserId = authData.user.id;
        }
      } catch {
        // usar id de contexto si existe
      }

      // Si no es un UUID de Supabase Auth (p. ej. demo o registro local), no bloquear
      const UUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!authUserId || !UUID_REGEX.test(authUserId)) {
        if (isMounted) setIsBlockedByBackend(false);
        return;
      }

      try {
        let patientRow: {
          id?: string | number;
          bloqueado?: boolean | null;
          folio?: string | null;
        } | null = null;
        let queryCompleted = false;

        // Intentar consultar ordenando por fecha_registro, created_at, o id
        const q1 = await supabase
          .from("pacientes")
          .select("id, bloqueado, folio, fecha_registro")
          .eq("user_id", authUserId)
          .order("fecha_registro", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!q1.error) {
          patientRow = q1.data;
          queryCompleted = true;
        } else {
          const q2 = await supabase
            .from("pacientes")
            .select("id, bloqueado, folio, created_at")
            .eq("user_id", authUserId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!q2.error) {
            patientRow = q2.data;
            queryCompleted = true;
          } else {
            const q3 = await supabase
              .from("pacientes")
              .select("id, bloqueado, folio")
              .eq("user_id", authUserId)
              .order("id", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!q3.error) {
              patientRow = q3.data;
              queryCompleted = true;
            }
          }
        }

        if (queryCompleted && isMounted) {
          if (patientRow && patientRow.bloqueado === true) {
            setIsBlockedByBackend(true);
            if (patientRow.folio) {
              setStoredUserFolio(authUserId, patientRow.folio, user?.email);
            }
          } else if (!patientRow || patientRow.bloqueado === false) {
            // FUENTE ÚNICA DE VERDAD: Si no hay registro en BD o bloqueado=false, NO hay gating
            setIsBlockedByBackend(false);

            setSessions((prevSessions) => {
              const hasCompleted = prevSessions.some((s) => s.screeningState?.step === "completed");
              if (hasCompleted || prevSessions.length === 0) {
                const fresh = createFreshSession({
                  iniciales: getInitialsFromName(user?.name, user?.email),
                  semestre: user?.semestre,
                });
                const userIdOrEmail = authUserId || user?.email;
                if (userIdOrEmail) {
                  removeStoredUserFolio(authUserId, user?.email);
                  try {
                    localStorage.setItem(
                      getChatSessionsStorageKey(userIdOrEmail),
                      JSON.stringify([fresh]),
                    );
                    localStorage.setItem(getActiveSessionStorageKey(userIdOrEmail), fresh.id);
                  } catch {
                    // ignore
                  }
                }
                setActiveSessionId(fresh.id);
                return [fresh];
              }
              return prevSessions;
            });
          }
        }
      } catch (err) {
        console.warn("Aviso al consultar estado de bloqueo de paciente:", err);
        if (isMounted) setIsBlockedByBackend(false);
      }
    }

    checkBlockedStatus();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.email, user?.name, user?.semestre, isDemoSession]);

  // RECUPERACIÓN AUTOMÁTICA: Si el usuario respondió el reactivo 9 pero falta mostrar el mensaje final con el folio del servidor
  useEffect(() => {
    if (isTyping || isSubmittingTamizajeRef.current) return;
    if (!activeSession || !activeSession.screeningState) return;
    const st = activeSession.screeningState;
    const msgs = activeSession.messages;
    if (!msgs || msgs.length === 0) return;

    const lastMsg = msgs[msgs.length - 1];
    const hasAnsweredQ9 =
      (st.step === "phq9" &&
        (st.phq9Items.length === 9 || (st.phq9Items.length === 8 && lastMsg?.sender === "user"))) ||
      (st.step === "completed" &&
        !msgs.some(
          (m) => m.sender === "eli" && (m.text.includes("folio") || m.text.includes("EQ-")),
        ));

    const alreadyHasEliFolio = msgs.some(
      (m) =>
        m.sender === "eli" &&
        (m.text.includes("folio") ||
          m.text.includes("EQ-") ||
          m.text.includes("profesional revisará")),
    );

    if (hasAnsweredQ9 && !alreadyHasEliFolio) {
      let q9Score = 1;
      if (lastMsg && lastMsg.sender === "user") {
        const parsed = parseLikertOption(lastMsg.text);
        if (parsed !== null) q9Score = parsed;
      }
      const phq9Items = st.phq9Items.length === 9 ? st.phq9Items : [...st.phq9Items, q9Score];
      const gad7Total = st.gad7Items.reduce((a, b) => a + b, 0);
      const phq9Total = phq9Items.reduce((a, b) => a + b, 0);
      const item9Score = phq9Items[8] ?? q9Score;
      const isCrisis = item9Score > 0 || phq9Total >= 20 || gad7Total >= 15;
      const nivel: ScreeningNivel = isCrisis
        ? "rojo"
        : phq9Total >= 10 || gad7Total >= 10
          ? "amarillo"
          : "verde";
      const existingFolio = st.folio || getStoredUserFolio(user?.id, user?.email);

      if (!existingFolio) {
        if (!pendingSubmissionPayload && !submissionError) {
          setPendingSubmissionPayload({
            paciente: {
              iniciales: st.paciente.iniciales || defaultPaciente.iniciales || "",
              edad: st.paciente.edad || 0,
              sexo: st.paciente.sexo || "",
              fecha: st.paciente.fecha || getTodayFormattedDate(),
              semestre: st.paciente.semestre || defaultPaciente.semestre,
            },
            GAD7: st.gad7Items,
            PHQ9: phq9Items,
          });
          setSubmissionError(
            "Tu tamizaje quedó pendiente de registro. Pulsa Reintentar para obtener tu folio oficial del servidor.",
          );
        }
        return;
      }

      const replyText = buildEliCompletionMessage({
        folio: existingFolio,
        nivel,
        hasCrisisItem9: item9Score > 0,
      });

      const eliMsg: EliMessage = {
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
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const userIdOrEmail = user?.id || user?.email;
      setStoredUserFolio(userIdOrEmail || "", existingFolio);

      const updatedState: ScreeningState = {
        ...st,
        step: "completed",
        currentQuestionIndex: 8,
        phq9Items,
        folio: existingFolio,
        nivel,
      };

      const updatedSession: ChatSession = {
        ...activeSession,
        messages: [...msgs, eliMsg],
        screeningState: updatedState,
      };

      setSessions((prev) => {
        const nextSessions = prev.map((s) => (s.id === activeSession.id ? updatedSession : s));
        if (userIdOrEmail) {
          try {
            localStorage.setItem(
              getChatSessionsStorageKey(userIdOrEmail),
              JSON.stringify(nextSessions),
            );
          } catch {
            // ignore
          }
        }
        return nextSessions;
      });
    }
  }, [
    isTyping,
    activeSessionId,
    activeSession,
    user?.id,
    user?.email,
    defaultPaciente.iniciales,
    defaultPaciente.semestre,
    pendingSubmissionPayload,
    submissionError,
  ]);

  // REINICIAR CHAT COMPLETAMENTE: Permite al estudiante iniciar una evaluación limpia
  const handleResetChat = async () => {
    try {
      let authUserId = user?.id;
      if (!authUserId) {
        const { data: authData } = await supabase.auth.getUser();
        authUserId = authData?.user?.id;
      }
      if (authUserId && isRealUser) {
        await supabase.from("pacientes").update({ bloqueado: false }).eq("user_id", authUserId);
      }
    } catch {
      // ignore
    }
    setIsBlockedByBackend(false);
    resetBackendScreeningState();
    setSubmissionError(null);
    setPendingSubmissionPayload(null);
    removeStoredUserFolio(user?.id, user?.email);
    clearLegacyUnscopedScreeningData();
    const freshSession = createFreshSession(defaultPaciente);
    persistSessions([freshSession], freshSession.id);
    setActiveSessionId(freshSession.id);
    setInputText("");
    setIsTyping(false);
    toast.success("Chat reiniciado. Puedes comenzar un nuevo tamizaje.");
  };

  // Invocación unificada a la Edge Function `tamizaje` con timeout de 30s y parseo tolerante
  const invokeTamizajeWithTimeout = async (payload: TamizajeSubmissionPayload) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      let { data, error } = await supabase.functions.invoke("tamizaje", {
        body: payload,
        signal: controller.signal,
      });

      if (
        error &&
        error.name !== "AbortError" &&
        (error.message?.includes("404") ||
          error.message?.includes("not found") ||
          error.message?.includes("Failed to send"))
      ) {
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 30_000);
        try {
          const alt = await supabase.functions.invoke("tamizaje", {
            body: payload,
            signal: retryController.signal,
          });
          if (!alt.error) {
            data = alt.data;
            error = null;
          }
        } finally {
          clearTimeout(retryTimeoutId);
        }
      }

      const parsed = await parseEdgeFunctionPayload(data);
      const nestedData =
        parsed?.data && typeof parsed.data === "object"
          ? (parsed.data as Record<string, unknown>)
          : null;

      const serverFolio =
        (typeof nestedData?.folio === "string" && nestedData.folio.trim()) ||
        (typeof parsed?.folio === "string" && parsed.folio.trim()) ||
        "";
      const isCompletedStatus = parsed?.status === "completado";
      const isSuccess =
        !error && parsed?.status !== "error" && (Boolean(serverFolio) || isCompletedStatus);

      return {
        isSuccess,
        error,
        rawData: data,
        parsed,
        nestedData,
        serverFolio,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // REINTENTAR ENVÍO TRAS ERROR DE CONEXIÓN
  const handleRetrySubmission = async () => {
    if (!pendingSubmissionPayload || isTyping) return;
    isSubmittingTamizajeRef.current = true;
    setIsTyping(true);
    setIsAnalyzingResponses(true);
    setSubmissionError(null);

    try {
      let finalPayload = pendingSubmissionPayload;
      if (finalPayload.user_id === undefined) {
        let currentUserId: string | null = null;
        try {
          const { data: authData } = await supabase.auth.getUser();
          const UUID_REGEX =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (authData?.user?.id && UUID_REGEX.test(authData.user.id)) {
            currentUserId = authData.user.id;
          }
        } catch {
          currentUserId = null;
        }
        finalPayload = { ...finalPayload, user_id: currentUserId };
      }

      const { isSuccess, error, rawData, parsed, nestedData, serverFolio } =
        await invokeTamizajeWithTimeout(finalPayload);

      if (!isSuccess) {
        console.error("[Tamizaje] Error en respuesta al reintentar:", {
          error,
          rawData,
          parsed,
        });
        setSubmissionError(
          error?.message ||
            (typeof parsed?.error === "string" && parsed.error) ||
            "Error al conectar con la función de tamizaje en Supabase. Por favor reintenta.",
        );
        return;
      }

      setPendingSubmissionPayload(null);
      setSubmissionError(null);

      const eliTimestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const rawNivel = typeof nestedData?.nivel === "string" ? nestedData.nivel.toLowerCase() : "";
      const serverNivel: ScreeningNivel =
        rawNivel === "rojo" || rawNivel === "amarillo" || rawNivel === "verde"
          ? rawNivel
          : screeningState.nivel || "verde";
      const isCrisis = Boolean(nestedData?.alerta || serverNivel === "rojo");
      const phq9Items = Array.isArray(finalPayload.PHQ9)
        ? finalPayload.PHQ9
        : screeningState.phq9Items || [];
      const gad7Items = Array.isArray(finalPayload.GAD7)
        ? finalPayload.GAD7
        : screeningState.gad7Items || [];
      const gad7Total = gad7Items.reduce((a, b) => a + b, 0);
      const phq9Total = phq9Items.reduce((a, b) => a + b, 0);
      const item9Score = phq9Items[8] ?? 0;

      const recomendaciones =
        serverNivel === "rojo"
          ? "Atención prioritaria inmediata en Terapia Psicológica"
          : serverNivel === "amarillo"
            ? "Orientación o Terapia Psicológica recomendada"
            : "Consejería preventiva opcional";

      const jsonOutput = JSON.stringify({
        paciente: {
          iniciales: finalPayload.paciente.iniciales || "",
          edad: finalPayload.paciente.edad || 0,
          sexo: finalPayload.paciente.sexo || "",
          fecha: finalPayload.paciente.fecha || new Date().toLocaleDateString("es-MX"),
        },
        GAD_7: { total: gad7Total, items: gad7Items },
        PHQ_9: { total: phq9Total, items: phq9Items, item9: item9Score },
        alerta: isCrisis,
        recomendaciones,
      });

      const serverMensaje = extractSafeMensaje(parsed?.mensaje);
      let eliText = "";
      if (serverMensaje) {
        eliText =
          serverFolio && !serverMensaje.includes(serverFolio)
            ? `${serverMensaje}\n\nTu folio de tamizaje es: ${serverFolio}`
            : serverMensaje;
      } else {
        eliText = buildEliCompletionMessage({
          folio: serverFolio,
          nivel: serverNivel,
          hasCrisisItem9: item9Score > 0,
          jsonOutput,
        });
      }

      const eliMsg: EliMessage = {
        id: crypto.randomUUID(),
        sender: "eli",
        text: eliText,
        isCrisisProtocol: isCrisis,
        crisisData: isCrisis
          ? {
              actionLabel: "Contactar a Línea de la Vida ahora",
              actionRoute: "/alerta",
              helplineName: "Línea de la Vida",
              helphoneNumber: "800 911 2000",
            }
          : undefined,
        timestamp: eliTimestamp,
      };

      const finalMessages = [...messages, eliMsg];

      const userIdOrEmail = user?.id || user?.email;
      if (serverFolio) {
        setStoredUserFolio(userIdOrEmail || "", serverFolio);
      }

      const updatedState: ScreeningState = {
        ...screeningState,
        step: "completed",
        currentQuestionIndex: 8,
        gad7Items,
        phq9Items,
        folio: serverFolio || undefined,
        nivel: serverNivel,
      };

      const updatedSessionFinal: ChatSession = {
        ...activeSession,
        updatedAt: "Ahora",
        messages: finalMessages,
        preview: eliText.slice(0, 60),
        screeningState: updatedState,
      };

      const finalSessions = sessions.map((s) =>
        s.id === activeSession.id ? updatedSessionFinal : s,
      );
      persistSessions(finalSessions);
      if (
        !DEMO_MODE &&
        (serverNivel === "amarillo" || serverNivel === "rojo" || Boolean(nestedData?.bloqueado))
      ) {
        setIsBlockedByBackend(true);
      }
      toast.success("Tamizaje registrado correctamente");

      if (serverNivel === "rojo" || isCrisis) {
        (async () => {
          try {
            await supabase.functions.invoke("notificar-psicologo-rojo", {
              body: {
                folio: serverFolio || "ALERTA-CHAT",
                paciente: finalPayload.paciente,
                gad7_total: gad7Total,
                gad7_items: gad7Items,
                phq9_total: phq9Total,
                phq9_items: phq9Items,
                item9_score: item9Score,
                estudiante_id: finalPayload.user_id || undefined,
                estudiante_email: user?.email || undefined,
                estudiante_nombre: user?.name || undefined,
                fecha: new Date().toISOString(),
              },
            });

            await notificarTutorNivelRojo({
              estudianteId: finalPayload.user_id || user?.id,
              folio: serverFolio || "ALERTA-CHAT",
              carrera: user?.carrera,
              grupo: user?.grupo,
            });
          } catch (retryAlertErr) {
            console.warn("[AlertaRojo] Aviso al reintentar alerta al psicólogo:", retryAlertErr);
          }
        })();
      }
    } catch (err: unknown) {
      console.error("[Tamizaje] Error real al reintentar el tamizaje:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Error al conectar con la función de tamizaje en Supabase.";
      setSubmissionError(msg);
    } finally {
      isSubmittingTamizajeRef.current = false;
      setIsAnalyzingResponses(false);
      setIsTyping(false);
    }
  };

  // NUEVA CONVERSACIÓN
  const handleNewConversation = () => {
    setIsBlockedByBackend(false);
    resetBackendScreeningState();
    const freshSession = createFreshSession(defaultPaciente);
    const updated = [freshSession, ...sessions];
    persistSessions(updated, freshSession.id);
    setActiveSessionId(freshSession.id);
    setIsHistoryOpen(false);
    setInputText("");
    toast.success("Nuevo tamizaje creado");
  };

  // SELECCIONAR SESIÓN
  const handleSelectSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    const userIdOrEmail = user?.id || user?.email;
    if (userIdOrEmail) {
      try {
        localStorage.setItem(getActiveSessionStorageKey(userIdOrEmail), session.id);
      } catch {
        // ignore
      }
    }
    setIsHistoryOpen(false);
  };

  // BORRAR HISTORIAL COMPLETO
  const handleClearAllHistory = () => {
    setIsBlockedByBackend(false);
    resetBackendScreeningState();
    const freshSession = createFreshSession(defaultPaciente);
    persistSessions([freshSession], freshSession.id);
    setActiveSessionId(freshSession.id);
    setIsHistoryOpen(false);
    toast.info("Historial de tamizajes borrado.");
  };

  // DETERMINAR OPCIONES RÁPIDAS
  const getQuickReplies = (): string[] => {
    if (screeningState.step === "waiting_consent" || screeningState.step === "not_started") {
      return ["Sí", "No"];
    }
    if (screeningState.step === "waiting_sex") {
      return ["Femenino", "Masculino", "Otro"];
    }
    if (screeningState.step === "gad7" || screeningState.step === "phq9") {
      return ["Nunca", "Varios días", "Más de la mitad de los días", "Casi todos los días"];
    }
    return [];
  };

  // ENVIAR MENSAJE
  const handleSendMessage = async (textToSend?: string) => {
    const raw = textToSend !== undefined ? textToSend : inputText;
    const trimmed = raw.trim();
    if (!trimmed || isTyping || isEffectiveBlocked) return;

    const sanitized = sanitizeText(trimmed, 300);
    const userTimestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg: EliMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: sanitized,
      timestamp: userTimestamp,
    };

    const newMessages = [...messages, userMsg];

    // Actualizar sesión con el mensaje de usuario de inmediato
    const sessionWithUser = {
      ...activeSession,
      updatedAt: "Ahora",
      messages: newMessages,
      preview: sanitized.slice(0, 60),
    };

    isSubmittingTamizajeRef.current = true;
    setInputText("");
    setIsTyping(true);

    const updatedSessionsInterim = sessions.map((s) =>
      s.id === activeSession.id ? sessionWithUser : s,
    );
    persistSessions(updatedSessionsInterim);
    // Detección proactiva de palabras clave de crisis (SIN Gemini)
    // "suicidio", "morir", "matarme", "hacerme daño", "acabar con todo", "no quiero vivir", etc.
    const hasCrisisKeyword = detectCrisisKeywords(sanitized);

    if (hasCrisisKeyword) {
      const eliTimestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const existingFolio =
        screeningState.folio || getStoredUserFolio(user?.id, user?.email) || undefined;

      const eliMsg: EliMessage = {
        id: crypto.randomUUID(),
        sender: "eli",
        text: `${CRISIS_MESSAGE}\n\nTu seguridad es lo más importante en este momento. Hemos habilitado las líneas de auxilio 24/7 de atención inmediata aquí abajo.`,
        isCrisisProtocol: true,
        crisisData: {
          actionLabel: "Contactar a Línea de la Vida ahora",
          actionRoute: "/alerta",
          helplineName: "Línea de la Vida",
          helphoneNumber: "800 911 2000",
        },
        timestamp: eliTimestamp,
      };

      const finalMessages = [...newMessages, eliMsg];

      const updatedSessionCrisis: ChatSession = {
        ...activeSession,
        updatedAt: "Ahora",
        messages: finalMessages,
        preview: eliMsg.text.slice(0, 60),
        screeningState: {
          ...screeningState,
          nivel: "rojo",
          folio: existingFolio,
        },
      };

      const finalSessions = sessions.map((s) =>
        s.id === activeSession.id ? updatedSessionCrisis : s,
      );
      if (existingFolio) {
        setStoredUserFolio(user?.id || user?.email || "", existingFolio);
      }
      persistSessions(finalSessions);
      isSubmittingTamizajeRef.current = false;
      setIsTyping(false);

      // Notificación activa en segundo plano al psicólogo vía Edge Function
      (async () => {
        try {
          let currentUserId: string | null = null;
          try {
            const { data: authData } = await supabase.auth.getUser();
            const UUID_REGEX =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (authData?.user?.id && UUID_REGEX.test(authData.user.id)) {
              currentUserId = authData.user.id;
            }
          } catch {
            currentUserId = null;
          }

          await supabase.functions.invoke("notificar-psicologo-rojo", {
            body: {
              folio: existingFolio || "ALERTA-CHAT",
              paciente: {
                iniciales:
                  screeningState.paciente.iniciales || defaultPaciente.iniciales || "ALERTA-CHAT",
                edad: screeningState.paciente.edad || 0,
                sexo: screeningState.paciente.sexo || "No especificado",
                fecha: getTodayFormattedDate(),
              },
              gad7_total: screeningState.gad7Items.reduce((a, b) => a + b, 0),
              phq9_total: screeningState.phq9Items.reduce((a, b) => a + b, 0),
              item9_score: 3, // Máxima alerta por palabra clave crítica
              estudiante_id: currentUserId || undefined,
              estudiante_email: user?.email || undefined,
              estudiante_nombre: user?.name || undefined,
              fecha: new Date().toISOString(),
            },
          });

          await notificarTutorNivelRojo({
            estudianteId: currentUserId || user?.id,
            folio: existingFolio || "ALERTA-CHAT",
            carrera: user?.carrera,
            grupo: user?.grupo,
          });
        } catch (alertaErr) {
          console.warn("[CrisisKeyword] Aviso al disparar notificación al psicólogo:", alertaErr);
        }
      })();

      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    // Procesar localmente la pregunta/respuesta actual
    const stepResult = processEliMessage(sanitized, screeningState, defaultPaciente);

    // Si respondió la pregunta 9 de PHQ-9, llamar a la Edge Function `tamizaje` y usar EXCLUSIVAMENTE json.data.folio
    if (stepResult.isReadyForSubmission && stepResult.submissionPayload) {
      setSubmissionError(null);
      setIsAnalyzingResponses(true);

      let currentUserId: string | null = null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        const UUID_REGEX =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (authData?.user?.id && UUID_REGEX.test(authData.user.id)) {
          currentUserId = authData.user.id;
        }
      } catch {
        currentUserId = null;
      }

      // Mantener exactamente el payload esperado: { paciente, GAD7, PHQ9, user_id }
      const payloadWithUser: TamizajeSubmissionPayload = {
        ...stepResult.submissionPayload,
        user_id: currentUserId,
      };

      try {
        const { isSuccess, error, rawData, parsed, nestedData, serverFolio } =
          await invokeTamizajeWithTimeout(payloadWithUser);

        if (!isSuccess) {
          console.error("[Tamizaje] Error en respuesta de Edge Function:", {
            error,
            rawData,
            parsed,
          });
          setPendingSubmissionPayload(payloadWithUser);
          setSubmissionError(
            error?.message ||
              (typeof parsed?.error === "string" && parsed.error) ||
              "Error al obtener el folio oficial desde la función de tamizaje. Por favor reintenta.",
          );
          return;
        }

        const rawNivel =
          typeof nestedData?.nivel === "string" ? nestedData.nivel.toLowerCase() : "";
        const serverNivel: ScreeningNivel =
          rawNivel === "rojo" || rawNivel === "amarillo" || rawNivel === "verde"
            ? rawNivel
            : stepResult.nivel || "verde";
        const isCrisis = Boolean(
          nestedData?.alerta || serverNivel === "rojo" || stepResult.isCrisis,
        );
        const gad7Items = Array.isArray(stepResult.submissionPayload.GAD7)
          ? stepResult.submissionPayload.GAD7
          : [];
        const phq9Items = Array.isArray(stepResult.submissionPayload.PHQ9)
          ? stepResult.submissionPayload.PHQ9
          : [];
        const item9Score = phq9Items[8] ?? 0;

        const eliTimestamp = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        const jsonOutput = stepResult.finalJson
          ? JSON.stringify({
              paciente: stepResult.finalJson.paciente,
              GAD_7: stepResult.finalJson.GAD_7,
              PHQ_9: stepResult.finalJson.PHQ_9,
              alerta: isCrisis,
              recomendaciones: stepResult.finalJson.recomendaciones,
            })
          : undefined;

        const serverMensaje = extractSafeMensaje(parsed?.mensaje);
        let eliText = "";
        if (serverMensaje) {
          eliText =
            serverFolio && !serverMensaje.includes(serverFolio)
              ? `${serverMensaje}\n\nTu folio de tamizaje es: ${serverFolio}`
              : serverMensaje;
        } else {
          eliText = buildEliCompletionMessage({
            folio: serverFolio,
            nivel: serverNivel,
            hasCrisisItem9: item9Score > 0,
            jsonOutput,
          });
        }

        const eliMsg: EliMessage = {
          id: crypto.randomUUID(),
          sender: "eli",
          text: eliText,
          isCrisisProtocol: isCrisis,
          crisisData: isCrisis
            ? {
                actionLabel: "Contactar a Línea de la Vida ahora",
                actionRoute: "/alerta",
                helplineName: "Línea de la Vida",
                helphoneNumber: "800 911 2000",
              }
            : undefined,
          timestamp: eliTimestamp,
        };

        const finalMessages = [...newMessages, eliMsg];

        const userIdOrEmail = user?.id || user?.email;
        if (serverFolio) {
          setStoredUserFolio(userIdOrEmail || "", serverFolio);
        }

        const updatedState: ScreeningState = {
          ...stepResult.nextState,
          step: "completed",
          folio: serverFolio || undefined,
          nivel: serverNivel,
        };

        const updatedSessionFinal: ChatSession = {
          ...activeSession,
          updatedAt: "Ahora",
          messages: finalMessages,
          preview: eliText.slice(0, 60),
          screeningState: updatedState,
        };

        setPendingSubmissionPayload(null);
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSession.id ? updatedSessionFinal : s)),
        );
        persistSessions(
          updatedSessionsInterim.map((s) => (s.id === activeSession.id ? updatedSessionFinal : s)),
        );
        if (
          !isDemoSession &&
          (serverNivel === "amarillo" || serverNivel === "rojo" || Boolean(nestedData?.bloqueado))
        ) {
          setIsBlockedByBackend(true);
        }
        toast.success("Tamizaje completado con éxito");

        // Disparar Edge Function "notificar-psicologo-rojo" con el folio oficial del servidor
        if (serverNivel === "rojo" || isCrisis) {
          (async () => {
            try {
              const gad7Total = gad7Items.reduce((a, b) => a + b, 0);
              const phq9Total = phq9Items.reduce((a, b) => a + b, 0);

              const alertaPayload = {
                folio: serverFolio || "ALERTA-CHAT",
                paciente: stepResult.submissionPayload?.paciente || {
                  iniciales: "",
                  edad: 0,
                  sexo: "",
                  fecha: new Date().toLocaleDateString("es-MX"),
                },
                gad7_total: gad7Total,
                gad7_items: gad7Items,
                phq9_total: phq9Total,
                phq9_items: phq9Items,
                item9_score: item9Score,
                estudiante_id: currentUserId || undefined,
                estudiante_email: user?.email || undefined,
                estudiante_nombre: user?.name || undefined,
                fecha: new Date().toISOString(),
              };

              await supabase.functions.invoke("notificar-psicologo-rojo", {
                body: alertaPayload,
              });

              await notificarTutorNivelRojo({
                estudianteId: currentUserId || user?.id,
                folio: serverFolio || "ALERTA-CHAT",
                carrera: user?.carrera,
                grupo: user?.grupo,
              });
            } catch (alertaErr) {
              console.warn("[AlertaRojo] Aviso al disparar notificación al psicólogo:", alertaErr);
            }
          })();
        }
      } catch (err: unknown) {
        console.error("[Tamizaje] Error real al registrar el tamizaje:", err);
        const msg =
          err instanceof Error
            ? err.message
            : "Error al conectar con la función de tamizaje en Supabase.";
        setPendingSubmissionPayload(payloadWithUser);
        setSubmissionError(msg);
      } finally {
        isSubmittingTamizajeRef.current = false;
        setIsAnalyzingResponses(false);
        setIsTyping(false);
      }

      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    // Flujo normal de preguntas
    const eliTimestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const eliMsg: EliMessage = {
      id: crypto.randomUUID(),
      sender: "eli",
      text: stepResult.replyText,
      timestamp: eliTimestamp,
    };

    const finalMessages = [...newMessages, eliMsg];

    // Título de la sesión si se obtuvieron iniciales
    let sessionTitle = activeSession.title;
    if (stepResult.nextState.paciente.iniciales && sessionTitle === "Nuevo tamizaje") {
      sessionTitle = `Tamizaje — ${stepResult.nextState.paciente.iniciales}`;
    }

    const updatedSessionFinal: ChatSession = {
      ...activeSession,
      title: sessionTitle,
      updatedAt: "Ahora",
      messages: finalMessages,
      preview: eliMsg.text.slice(0, 60),
      screeningState: stepResult.nextState,
    };

    const finalSessions = sessions.map((s) =>
      s.id === activeSession.id ? updatedSessionFinal : s,
    );
    persistSessions(finalSessions);
    isSubmittingTamizajeRef.current = false;
    setIsTyping(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickReplies = getQuickReplies();

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
      {/* 
        BARRA SUPERIOR PERMANENTE (Sticky, siempre visible)
        Incluye botón de salir explícito, identidad de Eli, botón de reiniciar y botón de historial
      */}
      <header className="sticky top-0 z-40 flex-none border-b border-border/80 bg-card/95 px-3 py-2.5 shadow-xs backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          {/* Lado izquierdo: Botón Salir + Identidad Eli */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/" })}
              className="h-8.5 gap-1.5 rounded-xl border-border/80 bg-background/80 px-2.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground active:scale-95"
              aria-label="Salir al inicio"
              title="Salir del chat y regresar al inicio"
            >
              <ArrowLeft className="size-4 text-primary" />
              <span>Salir</span>
            </Button>

            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <div className="relative size-8 sm:size-9 shrink-0">
                <img
                  src="/img/eli-avatar.webp"
                  alt="Eli, asistente de tamizaje emocional"
                  width={36}
                  height={36}
                  decoding="async"
                  className="size-full rounded-full object-cover shadow-soft"
                />
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>

              <div className="min-w-0 truncate">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-xs sm:text-sm font-bold leading-tight text-foreground">
                    {BRAND.assistant}
                  </h1>
                  <Badge
                    variant="outline"
                    className="shrink-0 rounded-md border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] font-semibold text-primary"
                  >
                    Tamizaje
                  </Badge>
                </div>
                <p className="truncate text-[10px] sm:text-[11px] text-muted-foreground">
                  PHQ-9 & GAD-7 • Confidencial TESH
                </p>
              </div>
            </div>
          </div>

          {/* Lado derecho: Reiniciar (siempre visible en demo) + Historial + Tema */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {(isDemoSession || !isGatedByRisk) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetChat}
                className="h-8.5 gap-1 rounded-xl border-border/80 bg-card/80 px-2.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted active:scale-95 sm:gap-1.5"
                aria-label="Reiniciar tamizaje"
                title="Reiniciar tamizaje"
              >
                <RotateCcw className="size-3.5 text-muted-foreground" />
                <span className="hidden xs:inline text-xs">Reiniciar</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="h-8.5 gap-1 rounded-xl border-border/80 bg-card/80 px-2.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted active:scale-95 sm:gap-1.5"
              aria-label="Ver historial de cuestionarios"
              title="Historial de conversaciones"
            >
              <History className="size-3.5 text-primary" />
              <span className="hidden xs:inline text-xs">Historial</span>
            </Button>

            <ThemeToggle className="size-8.5" />
          </div>
        </div>
      </header>

      {/* Banner de estado bloqueado (RD-07) */}
      {isEffectiveBlocked && (
        <div className="flex-none border-b border-amber-300 bg-amber-50/95 dark:border-amber-700 dark:bg-amber-950/80 px-4 py-3 text-amber-900 dark:text-amber-100 shadow-xs backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-start gap-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-200/80 dark:bg-amber-800/80 text-amber-900 dark:text-amber-100">
              <ShieldAlert className="size-4.5" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-xs font-semibold leading-relaxed">
                Tu tamizaje está en revisión. Un profesional lo revisará antes de permitir uno
                nuevo. Si necesitas apoyo inmediato, las líneas de ayuda siguen disponibles.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5 text-[11px] font-bold">
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="tel:8009112000"
                    className="inline-flex items-center gap-1 text-teal hover:underline"
                  >
                    <Phone className="size-3" />
                    Línea de la Vida 800 911 2000
                  </a>
                  <span className="text-amber-400 dark:text-amber-600">•</span>
                  <a
                    href="tel:8004727835"
                    className="inline-flex items-center gap-1 text-teal hover:underline"
                  >
                    <Phone className="size-3" />
                    SAPTEL 800 472 7835
                  </a>
                </div>
                <button
                  type="button"
                  onClick={handleResetChat}
                  className="rounded-lg bg-amber-200/90 dark:bg-amber-800/90 px-2.5 py-1 text-[11px] font-bold text-amber-950 dark:text-amber-50 hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  Iniciar nuevo tamizaje
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner discreto de confidencialidad y aviso de crisis */}
      <div className="flex-none border-b border-border/60 bg-muted/40 px-3 py-1.5 text-center backdrop-blur-xs">
        <p className="mx-auto max-w-3xl text-[11px] text-muted-foreground">
          Tamizaje confidencial. Si estás en crisis o peligro inmediato:{" "}
          <a
            href="tel:8009112000"
            className="font-bold text-teal underline decoration-teal/60 underline-offset-2 hover:decoration-teal"
          >
            Línea de la Vida 800 911 2000
          </a>{" "}
          o SAPTEL{" "}
          <a
            href="tel:8004727835"
            className="font-bold text-teal underline decoration-teal/60 underline-offset-2 hover:decoration-teal"
          >
            800 472 7835
          </a>
        </p>
      </div>

      {/* ÁREA CENTRAL DE MENSAJES (Scroll independiente) */}
      <main
        aria-label={`Tamizaje con ${BRAND.assistant}`}
        className="flex-1 min-h-0 overflow-y-auto px-3.5 py-4 overscroll-contain sm:px-6"
      >
        <div className="mx-auto flex max-w-3xl flex-col space-y-3.5">
          {/* Tarjeta de bienvenida cuando la conversación está recién reiniciada */}
          {messages.length === 0 && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto w-full max-w-md rounded-2xl border border-primary/20 bg-card/90 p-4 text-center shadow-soft backdrop-blur-md"
            >
              <img
                src="/img/eli-avatar.webp"
                alt="Eli, asistente de tamizaje emocional"
                width={40}
                height={40}
                decoding="async"
                className="mx-auto mb-2.5 size-10 rounded-full object-cover shadow-soft"
              />
              <h2 className="text-sm font-bold text-foreground">
                Área de Psicología TESH — {BRAND.assistant}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                La atención psicológica es un proceso en el que recibes apoyo y orientación
                profesional. Aquí responderás un tamizaje breve y confidencial (GAD-7 y PHQ-9). Un
                profesional revisará tus respuestas y obtendrás tu folio para vincularlo a tu cita.
              </p>
              <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSendMessage("Hola")}
                  className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90"
                >
                  Comenzar tamizaje
                </Button>
              </div>
            </motion.div>
          )}

          {/* Lista de mensajes */}
          {messages.map((msg) => {
            const isUser = msg.sender === "user";

            return (
              <motion.div
                key={msg.id}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                <div
                  className={`relative max-w-[88%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed sm:max-w-[80%] sm:text-sm ${
                    isUser
                      ? "rounded-tr-xs bg-primary text-primary-foreground shadow-xs font-medium"
                      : "rounded-tl-xs border border-border/70 bg-card text-card-foreground shadow-soft"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Tarjeta destacada de Folio directamente en el mensaje de Eli */}
                  {!isUser &&
                    (msg.text.includes("folio") || msg.text.includes("EQ-")) &&
                    (() => {
                      const resolvedMsgFolio =
                        msg.text.match(/EQ-\d{4}/)?.[0] ||
                        screeningState.folio ||
                        getStoredUserFolio(user?.id, user?.email) ||
                        "";
                      if (!resolvedMsgFolio) return null;
                      return (
                        <div className="mt-3 rounded-xl border-2 border-primary/40 bg-primary/10 p-3 text-card-foreground shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Ticket className="size-4 text-primary shrink-0" />
                              <span className="text-xs font-bold text-primary">Folio Oficial:</span>
                              <span className="font-mono text-base font-extrabold text-primary bg-background px-2.5 py-0.5 rounded-lg border border-primary/30">
                                {resolvedMsgFolio}
                              </span>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(resolvedMsgFolio);
                                toast.success("Folio copiado al portapapeles");
                              }}
                              className="h-7 px-2.5 text-[11px] font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
                            >
                              <Copy className="size-3" />
                              <span>Copiar</span>
                            </Button>
                          </div>
                          <p className="mt-1.5 text-[10px] text-muted-foreground leading-tight">
                            Escribe este folio en el apartado <strong>Agenda de Citas</strong> al
                            solicitar tu cita.
                          </p>
                        </div>
                      );
                    })()}

                  <div
                    className={`mt-1 text-[10px] ${
                      isUser
                        ? "text-primary-foreground/75 text-right"
                        : "text-muted-foreground text-left"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* Tarjeta de emergencia si se detectó protocolo de crisis */}
                {msg.isCrisisProtocol && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-2.5 w-full max-w-[94%] rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-3.5 shadow-md sm:max-w-[85%]"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="rounded-xl bg-destructive/20 p-2 text-destructive shrink-0">
                        <ShieldAlert className="size-5" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="text-xs sm:text-sm font-bold text-foreground">
                          Tu seguridad es lo más importante
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Por favor ponte en contacto de inmediato con líneas de apoyo gratuito y
                          confidencial 24/7 o acude al servicio médico de urgencias más cercano:
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <a
                            href="tel:8009112000"
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-destructive px-3 text-xs font-semibold text-destructive-foreground shadow-xs transition-transform hover:scale-102"
                          >
                            <Phone className="size-3.5" />
                            <span>Línea de la Vida (800 911 2000)</span>
                          </a>
                          <a
                            href="tel:8004727835"
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
                          >
                            <Phone className="size-3.5 text-teal" />
                            <span>SAPTEL (800 472 7835)</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}

          {/* Mensaje de error visible con botón Reintentar si falla la función tamizaje de Supabase */}
          {submissionError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto w-full max-w-md rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-4 text-center shadow-md space-y-2.5"
            >
              <div className="mx-auto grid size-10 place-items-center rounded-xl bg-destructive/20 text-destructive">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-destructive uppercase tracking-wider">
                  Error al registrar el tamizaje
                </h4>
                <p className="mt-1 text-xs text-foreground font-medium leading-relaxed">
                  {submissionError}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Tus respuestas están guardadas. Pulsa reintentar para volver a enviar.
                </p>
              </div>
              <div className="pt-1 flex justify-center">
                <Button
                  type="button"
                  onClick={handleRetrySubmission}
                  disabled={isTyping}
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold gap-1.5 shadow-xs"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reintentar</span>
                </Button>
              </div>
            </motion.div>
          )}

          {/* Tarjeta de conclusión cuando el tamizaje está completo */}
          {screeningState.step === "completed" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto w-full max-w-md rounded-2xl border border-primary/30 bg-card p-5 text-center shadow-soft"
            >
              <div
                className={`mx-auto mb-2.5 grid size-11 place-items-center rounded-2xl ${
                  screeningState.nivel === "rojo"
                    ? "bg-destructive/15 text-destructive"
                    : screeningState.nivel === "amarillo"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {screeningState.nivel === "rojo" ? (
                  <ShieldAlert className="size-6" />
                ) : (
                  <CheckCircle2 className="size-6" />
                )}
              </div>

              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Badge
                  variant="outline"
                  className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg ${
                    screeningState.nivel === "rojo"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : screeningState.nivel === "amarillo"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  Nivel {screeningState.nivel || "verde"}
                </Badge>
              </div>

              <h3 className="text-base font-bold text-foreground">Tamizaje Finalizado</h3>

              {screeningState.folio && (
                <div className="my-3 rounded-xl border border-primary/30 bg-primary/5 p-3 flex flex-col items-center justify-center gap-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Tu Folio de Tamizaje
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-primary tracking-wider">
                      {screeningState.folio}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(screeningState.folio || "");
                        toast.success("Folio copiado al portapapeles");
                      }}
                      className="h-7 px-2 text-[11px] rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      Copiar
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Escríbelo en el formulario de la Agenda para vincular tus resultados.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed">
                {screeningState.nivel === "rojo" &&
                  "Requieres atención prioritaria. Por favor agenda tu cita hoy mismo en 'Agenda de Citas' y elige TERAPIA PSICOLÓGICA."}
                {screeningState.nivel === "amarillo" &&
                  "Sería beneficioso recibir apoyo profesional. Te recomendamos agendar una cita eligiendo ORIENTACIÓN o TERAPIA PSICOLÓGICA."}
                {screeningState.nivel === "verde" &&
                  "Tus resultados no muestran señales de alerta. Si en algún momento lo deseas, puedes agendar una sesión de CONSEJERÍA."}
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate({ to: "/citas" })}
                  className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground gap-1.5 shadow-xs"
                >
                  <span>Ir a Agenda de Citas</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetChat}
                  className="rounded-xl border-border bg-card text-xs font-semibold text-foreground gap-1.5 shadow-xs hover:bg-muted active:scale-95"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Realizar nuevo tamizaje</span>
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed text-center sm:max-w-md mx-auto">
                {isEffectiveBlocked
                  ? "Tu tamizaje ha quedado registrado y en resguardo clínico. Un profesional del TESH revisará tus respuestas. Para evitar alterar resultados, solo el área de psicología puede habilitar un nuevo tamizaje."
                  : "Tu evaluación ha sido registrada de forma confidencial. Un profesional del TESH revisará tus resultados."}
              </p>
            </motion.div>
          )}

          {/* Indicador de escritura animado */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start"
              >
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-xs border border-border/60 bg-card px-3.5 py-2.5 shadow-soft">
                  <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <span className="size-2 rounded-full bg-primary animate-bounce" />
                  <span className="ml-1.5 text-xs text-muted-foreground font-medium">
                    {isAnalyzingResponses
                      ? "Eli está analizando tus respuestas..."
                      : `${BRAND.assistant} está registrando...`}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
      </main>

      {/* 
        PIE DE PÁGINA PERMANENTE (Sticky, siempre visible)
        Incluye opciones rápidas (Likert/Sí-No) y campo de texto
      */}
      <footer className="sticky bottom-0 z-40 flex-none border-t border-border/80 bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur-md sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-3xl space-y-2">
          {/* Botones de respuesta rápida cuando aplican al paso actual */}
          {quickReplies.length > 0 &&
            !isTyping &&
            !isEffectiveBlocked &&
            screeningState.step !== "completed" && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                  Selecciona:
                </span>
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => handleSendMessage(reply)}
                    className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

          {/* Grabadora de nota de voz con transcripción opcional */}
          {showVoiceRecorder && (
            <div className="rounded-2xl border border-primary/20 bg-card p-3 shadow-md backdrop-blur-sm animate-in fade-in-50 slide-in-from-bottom-2">
              <VoiceNoteRecorder
                folio={screeningState.folio}
                disabled={isEffectiveBlocked || isTyping}
                onTranscriptionReady={(texto) => {
                  setShowVoiceRecorder(false);
                  handleSendMessage(texto);
                }}
              />
            </div>
          )}

          {/* Formulario de entrada */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <Button
              type="button"
              variant="outline"
              disabled={isEffectiveBlocked || isTyping}
              onClick={() => setShowVoiceRecorder((prev) => !prev)}
              aria-label="Grabar nota de voz con transcripción"
              title="Grabar nota de voz con transcripción automática"
              className={`size-10.5 shrink-0 rounded-2xl border-border bg-card shadow-xs transition-colors ${
                showVoiceRecorder
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              <Mic className="size-4" />
            </Button>

            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isEffectiveBlocked}
                placeholder={
                  isEffectiveBlocked
                    ? "El chat está finalizado. Tu tamizaje está en revisión."
                    : `Escribe tu respuesta para ${BRAND.assistant}...`
                }
                rows={1}
                className="max-h-24 min-h-[42px] w-full resize-none rounded-2xl border border-border/80 bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <Button
              type="submit"
              disabled={!inputText.trim() || isTyping || isEffectiveBlocked}
              aria-label="Enviar respuesta"
              className="size-10.5 shrink-0 rounded-2xl bg-primary text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-40"
            >
              <Send className="size-4" />
            </Button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span>Enter para enviar • Shift + Enter para salto de línea</span>
            <button
              type="button"
              onClick={handleResetChat}
              className="hover:text-primary transition-colors underline cursor-pointer"
            >
              Reiniciar tamizaje
            </button>
          </div>
        </div>
      </footer>

      {/* PANEL LATERAL DE HISTORIAL */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-card p-6">
          <SheetHeader className="text-left pb-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                <History className="size-4" />
              </div>
              <div>
                <SheetTitle className="font-display text-lg text-primary font-bold">
                  Historial de Tamizajes
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  Consulta sesiones previas o inicia una nueva evaluación con {BRAND.assistant}.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {isDemoSession || !isEffectiveBlocked ? (
              <Button
                type="button"
                onClick={handleNewConversation}
                className="w-full rounded-xl bg-primary text-primary-foreground font-semibold text-xs h-10 gap-2 shadow-xs transition-transform active:scale-98"
              >
                <Plus className="size-4" />
                <span>+ Nuevo tamizaje con {BRAND.assistant}</span>
              </Button>
            ) : (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="size-4 text-amber-600 shrink-0" />
                  Tamizaje en resguardo clínico
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Solo el psicólogo del TESH puede autorizar una nueva evaluación tras revisar tus
                  resultados para evitar alteraciones.
                </p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sesiones Guardadas ({sessions.length})
                </p>
                {sessions.length > 1 && (isDemoSession || !isGatedByRisk) && (
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    className="text-[11px] text-destructive hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="size-3" />
                    <span>Borrar todo</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {sessions.map((session) => {
                  const isActive = session.id === activeSession.id;
                  const isDone = session.screeningState?.step === "completed";

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectSession(session)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30 shadow-xs"
                          : "border-border/70 bg-card hover:bg-muted/40 hover:border-border"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            className={`text-xs font-bold truncate ${
                              isActive ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {session.title}
                          </h3>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                            {session.updatedAt}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground line-clamp-1 leading-normal">
                          {session.preview || "Sin mensajes aún"}
                        </p>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          {isActive && (
                            <Badge
                              variant="outline"
                              className="bg-primary/15 text-primary border-primary/30 text-[9px] font-semibold py-0 px-1.5"
                            >
                              Activa
                            </Badge>
                          )}
                          {isDone ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] font-semibold py-0 px-1.5"
                            >
                              Completado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-muted text-muted-foreground border-border text-[9px] font-semibold py-0 px-1.5"
                            >
                              {session.messages.length} mensajes
                            </Badge>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        className={`size-4 shrink-0 transition-transform ${
                          isActive ? "text-primary" : "text-muted-foreground/60"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
