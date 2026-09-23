import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { History, Plus, MessageSquare, ChevronRight, Sparkles } from "lucide-react";
import { chatIcons } from "@/config/icons";
import { sendEliMessage, type EliMessage } from "@/lib/api-client";
import { sanitizeText } from "@/lib/security";
import { AuroraBackground } from "@/components/effects/aurora-background";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
  messages: EliMessage[];
}

const CHAT_SESSIONS_KEY = "equilibra_chat_sessions_v2";

const INITIAL_MESSAGE: EliMessage = {
  id: "initial-welcome-message",
  sender: "eli",
  text: "Hola, soy Eli. Este es un espacio seguro para ti. ¿Cómo has estado últimamente?",
  isCrisisProtocol: false,
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const DEFAULT_SESSIONS: ChatSession[] = [
  {
    id: "session-current",
    title: "Conversación actual",
    updatedAt: "Hoy",
    preview: "¿Cómo has estado últimamente?",
    messages: [INITIAL_MESSAGE],
  },
  {
    id: "session-exam-stress",
    title: "Gestión de ansiedad ante exámenes",
    updatedAt: "18 sep 2026",
    preview: "Inhala suavemente contando hasta 4, sostén el aire 4 segundos...",
    messages: [
      {
        id: "m-101",
        sender: "eli",
        text: "Hola, soy Eli. Este es un espacio seguro para ti. ¿Cómo has estado últimamente?",
        timestamp: "11:15",
      },
      {
        id: "m-102",
        sender: "user",
        text: "Tengo un examen de cálculo el viernes y siento mucha presión en el pecho y no logro concentrarme.",
        timestamp: "11:16",
      },
      {
        id: "m-103",
        sender: "eli",
        text: "Entiendo que los exámenes de materias demandantes pueden generar una gran carga física y mental. Esa sensación de presión en el pecho es una respuesta común ante el estrés. ¿Te gustaría que probemos juntos un ejercicio de respiración guiada de 4 tiempos antes de revisar tus horarios de estudio?",
        timestamp: "11:17",
      },
      {
        id: "m-104",
        sender: "user",
        text: "Sí, me vendría muy bien calmarme un poco.",
        timestamp: "11:18",
      },
      {
        id: "m-105",
        sender: "eli",
        text: "Perfecto. Inhala suavemente contando hasta 4, sostén el aire 4 segundos, y exhala lentamente en 4. Hazlo tres veces a tu propio ritmo. Estoy aquí contigo.",
        timestamp: "11:20",
      },
    ],
  },
  {
    id: "session-sleep",
    title: "Técnicas de respiración y descanso",
    updatedAt: "12 sep 2026",
    preview: "El descanso es fundamental para tu bienestar y rendimiento escolar...",
    messages: [
      {
        id: "m-201",
        sender: "eli",
        text: "Hola, soy Eli. Este es un espacio seguro para ti. ¿Cómo has estado últimamente?",
        timestamp: "20:30",
      },
      {
        id: "m-202",
        sender: "user",
        text: "He tenido problemas para dormir por las noches pensando en las tareas y entregas.",
        timestamp: "20:32",
      },
      {
        id: "m-203",
        sender: "eli",
        text: "El descanso es fundamental para tu bienestar y rendimiento escolar. Desconectarte de pantallas al menos 30 minutos antes de acostarte y practicar una respiración pausada puede ayudar a que tu sistema nervioso se prepare para el sueño.",
        timestamp: "20:35",
      },
    ],
  },
];

export function ChatPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem(CHAT_SESSIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_SESSIONS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || "session-current";
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || DEFAULT_SESSIONS[0];
  }, [sessions, activeSessionId]);

  const messages = activeSession.messages;

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Error saving chat sessions", e);
    }
  }, [sessions]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, isTyping]);

  const handleSelectSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setIsHistoryOpen(false);
    toast.success(`Cargada: ${session.title}`);
  };

  const handleNewConversation = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: "Nueva conversación",
      updatedAt: "Hoy",
      preview: "¿Cómo has estado últimamente?",
      messages: [INITIAL_MESSAGE],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setIsHistoryOpen(false);
    toast.success("Nueva conversación iniciada");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  const updateActiveSessionMessages = (newMessages: EliMessage[]) => {
    setSessions((prevSessions) => {
      return prevSessions.map((session) => {
        if (session.id === activeSessionId) {
          const lastMsg = newMessages[newMessages.length - 1];
          const firstUserMsg = newMessages.find((m) => m.sender === "user");
          let updatedTitle = session.title;
          if (
            (session.title === "Nueva conversación" || session.title === "Conversación actual") &&
            firstUserMsg
          ) {
            updatedTitle =
              firstUserMsg.text.length > 32
                ? `${firstUserMsg.text.slice(0, 32)}...`
                : firstUserMsg.text;
          }

          return {
            ...session,
            title: updatedTitle,
            updatedAt: "Hoy",
            preview: lastMsg ? lastMsg.text.slice(0, 70) : session.preview,
            messages: newMessages,
          };
        }
        return session;
      });
    });
  };

  const handleSend = async () => {
    const sanitized = sanitizeText(inputText, 1000);
    if (!sanitized || isTyping) return;

    if (inputText.length > 1000) {
      toast.info("El mensaje fue ajustado al límite máximo seguro de 1000 caracteres.");
    }

    const userMsg: EliMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: sanitized,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessagesWithUser = [...messages, userMsg];
    updateActiveSessionMessages(newMessagesWithUser);
    setInputText("");
    setIsTyping(true);

    try {
      const response = await sendEliMessage(sanitized);
      const formattedTimestamp = new Date(response.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const eliMsg: EliMessage = {
        ...response,
        timestamp: formattedTimestamp,
      };

      updateActiveSessionMessages([...newMessagesWithUser, eliMsg]);
    } catch {
      const errorMsg: EliMessage = {
        id: crypto.randomUUID(),
        sender: "eli",
        text: "Estoy teniendo dificultades para responder en este instante. Por favor, intenta de nuevo en unos momentos.",
        isCrisisProtocol: false,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      updateActiveSessionMessages([...newMessagesWithUser, errorMsg]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <TooltipProvider>
      <AuroraBackground className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
        {/* Encabezado fijo del asistente Eli */}
        <header className="z-20 shrink-0 border-b border-border/60 bg-card/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: "/" })}
                className="size-9 rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                aria-label="Regresar al inicio"
              >
                <chatIcons.back className="size-5" />
              </Button>

              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Avatar de Eli: Círculo con gradiente de la marca (#6857E4 a #87FFBD), sin foto */}
                <div
                  className="relative flex size-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#6857E4] to-[#87FFBD] shadow-soft ring-2 ring-card"
                  aria-hidden="true"
                >
                  <chatIcons.sparkles className="size-5 text-white/90" />
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                </div>

                <div>
                  <h1 className="text-base font-bold leading-tight text-foreground sm:text-lg">
                    Eli
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      En línea
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones del encabezado: Botón de historial de conversaciones */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryOpen(true)}
                className="h-9 rounded-xl border-border bg-card/80 text-xs font-semibold gap-1.5 shadow-xs transition-colors hover:bg-muted"
                aria-label="Historial de conversaciones"
              >
                <History className="size-4 text-primary" />
                <span className="hidden sm:inline">Historial</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleNewConversation}
                className="size-9 rounded-xl text-muted-foreground hover:bg-card hover:text-foreground"
                title="Nueva conversación"
                aria-label="Nueva conversación"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Banner permanente discreto arriba del chat */}
        <div
          role="note"
          aria-label="Aviso legal y línea de crisis"
          className="z-10 shrink-0 border-b border-border/40 bg-card/65 px-4 py-2 text-center text-xs text-muted-foreground backdrop-blur-sm"
        >
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-1.5 text-[11px] leading-snug sm:text-xs">
            <chatIcons.info className="size-3.5 shrink-0 text-muted-foreground/80" />
            <span>
              Eli es una herramienta de apoyo. No reemplaza la atención profesional. En crisis llama
              al{" "}
              <a
                href="tel:8009112000"
                className="font-semibold text-accent underline decoration-accent/50 underline-offset-2 hover:decoration-accent"
              >
                800 911 2000
              </a>
            </span>
          </div>
        </div>

        {/* Área de mensajes con scroll automático */}
        <main
          aria-label="Conversación con Eli"
          className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
        >
          <div className="mx-auto flex max-w-3xl flex-col space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";

              return (
                <motion.div
                  key={msg.id}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: shouldReduceMotion ? 0.1 : 0.26,
                    ease: "easeOut",
                  }}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`relative max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[78%] ${
                      isUser
                        ? "rounded-tr-xs bg-[#6857E4] text-white shadow-sm"
                        : "rounded-tl-xs border border-border/50 bg-card text-card-foreground shadow-soft"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <div
                      className={`mt-1 text-[10px] ${
                        isUser ? "text-white/70 text-right" : "text-muted-foreground text-left"
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Tarjeta destacada de guardarraíles de crisis */}
                  {msg.isCrisisProtocol && msg.crisisData && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.25 }}
                      className="mt-3 w-full max-w-[92%] rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-card-foreground shadow-md sm:max-w-[82%]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-destructive/15 p-2 text-destructive">
                          <chatIcons.shieldAlert className="size-5" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <h2 className="text-sm font-bold text-foreground">
                            Acompañamiento prioritario e inmediato
                          </h2>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Tu bienestar es lo más importante. Si estás pasando por un momento
                            crítico o necesitas hablar con un especialista de inmediato, cuentas con
                            apoyo directo y confidencial.
                          </p>

                          <div className="pt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Button
                              type="button"
                              onClick={() => navigate({ to: msg.crisisData!.actionRoute })}
                              className="h-10 rounded-xl bg-destructive px-4 text-xs font-semibold text-destructive-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                              {msg.crisisData.actionLabel}
                            </Button>

                            <a
                              href={`tel:${msg.crisisData.helphoneNumber.replace(/\s+/g, "")}`}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card px-4 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                            >
                              <chatIcons.phone className="size-3.5 text-accent" />
                              <span>
                                {msg.crisisData.helplineName}: {msg.crisisData.helphoneNumber}
                              </span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}

            {/* Indicador de escritura: tres puntos animados */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.96,
                    transition: { duration: 0.15 },
                  }}
                  transition={{
                    duration: shouldReduceMotion ? 0.1 : 0.22,
                    ease: "easeOut",
                  }}
                  className="flex items-start"
                >
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-xs border border-border/50 bg-card px-4 py-3 text-card-foreground shadow-soft">
                    <span className="size-2 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-2 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-2 rounded-full bg-accent animate-bounce" />
                    <span className="ml-2 text-xs text-muted-foreground font-medium">
                      Eli está escribiendo...
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        </main>

        {/* Barra de entrada fija abajo */}
        <footer className="z-20 shrink-0 border-t border-border/60 bg-card/90 px-3 py-3 backdrop-blur-lg sm:px-6">
          <div className="mx-auto max-w-3xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-2"
            >
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu mensaje para Eli..."
                  rows={1}
                  className="max-h-32 min-h-[44px] w-full resize-none rounded-2xl border border-border/80 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {/* Botón de micrófono placeholder */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled
                    aria-label="Dictado por voz"
                    className="size-11 shrink-0 rounded-2xl border-border/70 text-muted-foreground/60 cursor-not-allowed"
                  >
                    <chatIcons.mic className="size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Próximamente</p>
                </TooltipContent>
              </Tooltip>

              {/* Botón de enviar */}
              <Button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                aria-label="Enviar mensaje"
                className="size-11 shrink-0 rounded-2xl bg-[#6857E4] text-white shadow-sm transition-all hover:bg-[#5948d3] disabled:opacity-40 disabled:hover:bg-[#6857E4]"
              >
                <chatIcons.send className="size-5" />
              </Button>
            </form>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground/80">
              Presiona Enter para enviar. Shift + Enter para salto de línea.
            </p>
          </div>
        </footer>

        {/* Panel lateral de historial de conversaciones pasadas */}
        <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-card p-6">
            <SheetHeader className="text-left pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-xl bg-lavender-soft text-primary">
                  <History className="size-4" />
                </div>
                <div>
                  <SheetTitle className="font-display text-xl text-primary">
                    Historial de Conversaciones
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                    Retoma sesiones anteriores o inicia una nueva plática con Eli.
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <Button
                type="button"
                onClick={handleNewConversation}
                className="w-full rounded-xl bg-primary text-primary-foreground font-semibold text-xs h-10 gap-2 shadow-xs transition-transform active:scale-[0.98]"
              >
                <Plus className="size-4" />
                <span>+ Nueva conversación con Eli</span>
              </Button>

              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sesiones Anteriores
                </p>

                <div className="space-y-2">
                  {sessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => handleSelectSession(session)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isActive
                            ? "border-accent/60 bg-accent/10 ring-1 ring-accent/30 shadow-xs"
                            : "border-border/70 bg-card hover:bg-muted/40 hover:border-border"
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3
                              className={`text-xs font-bold truncate ${
                                isActive ? "text-accent" : "text-foreground"
                              }`}
                            >
                              {session.title}
                            </h3>
                            <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                              {session.updatedAt}
                            </span>
                          </div>

                          <p className="text-[11px] text-muted-foreground line-clamp-1 leading-normal">
                            {session.preview}
                          </p>

                          {isActive && (
                            <Badge
                              variant="outline"
                              className="mt-1 bg-accent/15 text-accent border-accent/30 text-[9px] font-semibold py-0 px-1.5"
                            >
                              Sesión activa
                            </Badge>
                          )}
                        </div>

                        <ChevronRight
                          className={`size-4 shrink-0 transition-transform ${
                            isActive ? "text-accent" : "text-muted-foreground/60"
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
      </AuroraBackground>
    </TooltipProvider>
  );
}
