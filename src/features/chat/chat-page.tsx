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
} from "lucide-react";
import { sendEliMessage, type EliMessage } from "@/lib/api-client";
import {
  INITIAL_SCREENING_STATE,
  type ScreeningState,
  processEliMessage,
} from "@/lib/eli-screening";
import { sanitizeText } from "@/lib/security";
import { BRAND } from "@/lib/branding";
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

const CHAT_SESSIONS_STORAGE_KEY = "equilibra_eli_screening_sessions_v4";
const ACTIVE_SESSION_STORAGE_KEY = "equilibra_eli_active_session_id_v4";

function createFreshSession(): ChatSession {
  const id = `session-${Date.now()}`;
  return {
    id,
    title: "Nuevo tamizaje",
    updatedAt: "Ahora",
    preview: "Cuestionario de tamizaje clínico...",
    messages: [],
    screeningState: { ...INITIAL_SCREENING_STATE },
  };
}

export function ChatPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  // Inicializar sesiones
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [createFreshSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const storedId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
      if (storedId && sessions.some((s) => s.id === storedId)) {
        return storedId;
      }
    } catch {
      // fallback
    }
    return sessions[0]?.id || "default-session";
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Obtener sesión activa
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0] || createFreshSession();
  const messages = activeSession.messages;
  const screeningState = activeSession.screeningState || INITIAL_SCREENING_STATE;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const messagesCount = messages.length;
  useEffect(() => {
    scrollToBottom();
  }, [messagesCount, isTyping, scrollToBottom]);

  // Persistir sesiones
  const persistSessions = (newSessions: ChatSession[], newActiveId?: string) => {
    setSessions(newSessions);
    try {
      localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(newSessions));
      if (newActiveId) {
        localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, newActiveId);
      }
    } catch {
      // ignore storage errors
    }
  };

  // REINICIAR CHAT COMPLETAMENTE
  const handleResetChat = () => {
    const freshSession = createFreshSession();
    const updated = [
      freshSession,
      ...sessions.filter((s) => s.id !== activeSession.id || s.messages.length > 0),
    ];
    persistSessions(updated, freshSession.id);
    setActiveSessionId(freshSession.id);
    setInputText("");
    setIsTyping(false);
    toast.success("Chat reiniciado. Puedes comenzar un nuevo tamizaje.");
  };

  // NUEVA CONVERSACIÓN
  const handleNewConversation = () => {
    const freshSession = createFreshSession();
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
    try {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, session.id);
    } catch {
      // ignore
    }
    setIsHistoryOpen(false);
  };

  // BORRAR HISTORIAL COMPLETO
  const handleClearAllHistory = () => {
    const freshSession = createFreshSession();
    persistSessions([freshSession], freshSession.id);
    setActiveSessionId(freshSession.id);
    setIsHistoryOpen(false);
    toast.info("Historial de tamizajes borrado.");
  };

  // DETERMINAR OPCIONES RÁPIDAS
  const getQuickReplies = (): string[] => {
    if (screeningState.step === "waiting_consent") {
      return ["Sí", "No"];
    }
    if (screeningState.step === "waiting_sex") {
      return ["Femenino", "Masculino", "Otro"];
    }
    if (screeningState.step === "waiting_date") {
      const today = new Date().toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return [today];
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
    if (!trimmed || isTyping) return;

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

    const updatedSessionsInterim = sessions.map((s) =>
      s.id === activeSession.id ? sessionWithUser : s,
    );
    persistSessions(updatedSessionsInterim);

    setInputText("");
    setIsTyping(true);

    try {
      const response = await sendEliMessage(sanitized, screeningState);
      const nextState =
        response.nextState || processEliMessage(sanitized, screeningState).nextState;

      const eliTimestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const eliMsg: EliMessage = {
        id: response.id || crypto.randomUUID(),
        sender: "eli",
        text: response.text,
        isCrisisProtocol: response.isCrisisProtocol,
        crisisData: response.crisisData,
        timestamp: eliTimestamp,
      };

      const finalMessages = [...newMessages, eliMsg];

      // Título de la sesión si se obtuvieron iniciales
      let sessionTitle = activeSession.title;
      if (nextState.paciente.iniciales && sessionTitle === "Nuevo tamizaje") {
        sessionTitle = `Tamizaje — ${nextState.paciente.iniciales}`;
      }

      const updatedSessionFinal: ChatSession = {
        ...activeSession,
        title: sessionTitle,
        updatedAt: "Ahora",
        messages: finalMessages,
        preview: eliMsg.text.slice(0, 60),
        screeningState: nextState,
      };

      const finalSessions = sessions.map((s) =>
        s.id === activeSession.id ? updatedSessionFinal : s,
      );
      persistSessions(finalSessions);
    } catch {
      // Fallback estricto con el flujo
      const fallbackResult = processEliMessage(sanitized, screeningState);
      const eliMsg: EliMessage = {
        id: crypto.randomUUID(),
        sender: "eli",
        text: fallbackResult.replyText,
        isCrisisProtocol: fallbackResult.isCrisis,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const updatedSessionFallback: ChatSession = {
        ...activeSession,
        updatedAt: "Ahora",
        messages: [...newMessages, eliMsg],
        preview: eliMsg.text.slice(0, 60),
        screeningState: fallbackResult.nextState,
      };

      const finalSessions = sessions.map((s) =>
        s.id === activeSession.id ? updatedSessionFallback : s,
      );
      persistSessions(finalSessions);
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
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
      {/* Fondo con auroras de baja carga */}
      <div className="aurora-blobs pointer-events-none" aria-hidden="true">
        <div className="aurora-blob aurora-blob-1 opacity-60" />
        <div className="aurora-blob aurora-blob-2 opacity-50" />
      </div>
      <div className="grain-layer pointer-events-none" aria-hidden="true" />

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
              <div
                className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#6857E4] to-[#87FFBD] shadow-soft"
                aria-hidden="true"
              >
                <Sparkles className="size-4 text-white" />
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

          {/* Lado derecho: Reiniciar + Historial + Tema */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetChat}
              className="h-8.5 gap-1 rounded-xl border-border/80 bg-card/80 px-2.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:bg-muted active:scale-95 sm:gap-1.5"
              title="Reiniciar chat y comenzar nuevo tamizaje"
              aria-label="Reiniciar chat"
            >
              <RotateCcw className="size-3.5 text-amber-500 dark:text-amber-400" />
              <span className="text-xs">Reiniciar</span>
            </Button>

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
              <div className="mx-auto mb-2.5 grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <h2 className="text-sm font-bold text-foreground">
                Asistente de Tamizaje {BRAND.assistant}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Este cuestionario evalúa de forma confidencial síntomas de ansiedad (GAD-7) y estado
                de ánimo (PHQ-9). Un profesional de salud mental revisará tus respuestas.
              </p>
              <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSendMessage("Comenzar")}
                  className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90"
                >
                  Comenzar cuestionario
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

          {/* Tarjeta de conclusión cuando el tamizaje está completo */}
          {screeningState.step === "completed" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto w-full max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 text-center shadow-soft"
            >
              <div className="mx-auto mb-2 grid size-9 place-items-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Tamizaje Registrado</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Tus respuestas han sido procesadas con éxito y serán revisadas por el equipo de
                salud mental.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleResetChat}
                  className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground gap-1.5 shadow-xs"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Nuevo tamizaje</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate({ to: "/" })}
                  className="rounded-xl border-border bg-card text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Volver al inicio
                </Button>
              </div>
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
                    {BRAND.assistant} está registrando...
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
          {quickReplies.length > 0 && !isTyping && screeningState.step !== "completed" && (
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

          {/* Formulario de entrada */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  screeningState.step === "completed"
                    ? "Tamizaje finalizado. Pulsa 'Reiniciar' para uno nuevo."
                    : `Escribe tu respuesta para ${BRAND.assistant}...`
                }
                rows={1}
                className="max-h-24 min-h-[42px] w-full resize-none rounded-2xl border border-border/80 bg-background px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <Button
              type="submit"
              disabled={!inputText.trim() || isTyping}
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
              className="font-medium text-amber-600 dark:text-amber-400 hover:underline"
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
            <Button
              type="button"
              onClick={handleNewConversation}
              className="w-full rounded-xl bg-primary text-primary-foreground font-semibold text-xs h-10 gap-2 shadow-xs transition-transform active:scale-98"
            >
              <Plus className="size-4" />
              <span>+ Nuevo tamizaje con {BRAND.assistant}</span>
            </Button>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sesiones Guardadas ({sessions.length})
                </p>
                {sessions.length > 1 && (
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
