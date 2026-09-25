import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  History,
  Plus,
  ChevronRight,
  Sparkles,
  Send,
  Mic,
  ArrowLeft,
  Info,
  ShieldAlert,
  Phone,
} from "lucide-react";
import { sendEliMessage, type EliMessage } from "@/lib/api-client";
import { sanitizeText } from "@/lib/security";
import { BRAND } from "@/lib/branding";
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
import { ThemeToggle } from "@/components/layout/theme-toggle";

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
  messages: EliMessage[];
}

const CHAT_SESSIONS_KEY = "equilibra_chat_sessions_v3";

/**
 * 2-3 Mensajes informativos de ejemplo mostrando las capacidades de Eli
 * y reforzando el estado "Próximamente".
 */
const DEFAULT_EXAMPLE_MESSAGES: EliMessage[] = [
  {
    id: "m-welcome-1",
    sender: "eli",
    text: `¡Hola! Soy ${BRAND.assistant}, tu asistente virtual de bienestar emocional en el TESH. Estoy diseñada para ofrecerte un espacio seguro y confidencial de escucha activa, ejercicios de respiración y acompañamiento ante el estrés académico.`,
    isCrisisProtocol: false,
    timestamp: "10:00",
  },
  {
    id: "m-welcome-2",
    sender: "user",
    text: `Hola ${BRAND.assistant}, ¿cómo podré usar este chat una vez que esté habilitado?`,
    isCrisisProtocol: false,
    timestamp: "10:01",
  },
  {
    id: "m-welcome-3",
    sender: "eli",
    text: `Podrás conversar conmigo las 24 horas del día para desahogarte, realizar pausas guiadas de calma o canalizarte con el equipo de psicología universitaria si necesitas una cita prioritaria.`,
    isCrisisProtocol: false,
    timestamp: "10:02",
  },
];

const DEFAULT_SESSIONS: ChatSession[] = [
  {
    id: "session-current",
    title: "Conversación de demostración",
    updatedAt: "Hoy",
    preview: "Estoy diseñada para ofrecerte un espacio seguro y confidencial...",
    messages: DEFAULT_EXAMPLE_MESSAGES,
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
        text: `Hola, soy ${BRAND.assistant}. Este es un espacio seguro para ti. ¿Cómo has estado últimamente?`,
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
        text: `Hola, soy ${BRAND.assistant}. Este es un espacio seguro para ti. ¿Cómo has estado últimamente?`,
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

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || DEFAULT_EXAMPLE_MESSAGES;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const saveSessionsToStorage = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    try {
      localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updatedSessions));
    } catch {
      // ignore
    }
  };

  const handleSelectSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setIsHistoryOpen(false);
  };

  const handleNewConversation = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: "Nueva consulta",
      updatedAt: "Ahora",
      preview: `Hola, soy ${BRAND.assistant}. Este es un espacio seguro para ti...`,
      messages: DEFAULT_EXAMPLE_MESSAGES,
    };
    const updated = [newSession, ...sessions];
    saveSessionsToStorage(updated);
    setActiveSessionId(newSessionId);
    setIsHistoryOpen(false);
    toast.success("Nueva conversación iniciada");
  };

  const updateActiveSessionMessages = (newMessages: EliMessage[]) => {
    const updated = sessions.map((s) => {
      if (s.id === activeSessionId) {
        const lastMsg = newMessages[newMessages.length - 1];
        return {
          ...s,
          updatedAt: "Ahora",
          preview: lastMsg?.text.slice(0, 75) + "..." || s.preview,
          messages: newMessages,
        };
      }
      return s;
    });
    saveSessionsToStorage(updated);
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isTyping) return;

    const sanitized = sanitizeText(trimmed, 500);
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
        text: `Gracias por tu mensaje. ${BRAND.assistant} estará disponible próximamente para acompañarte en tu día a día en el TESH. Si necesitas apoyo inmediato, puedes contactar al personal de psicología en el campus.`,
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
      {/* Vista de pantalla completa: 100dvh sin scroll del viewport de página */}
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground">
        <AuroraBackground className="flex h-full w-full flex-col overflow-hidden">
          {/* Header fijo superior */}
          <header className="z-20 shrink-0 border-b border-border/60 bg-card/90 px-3.5 py-3 backdrop-blur-md sm:px-6">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-2.5">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate({ to: "/" })}
                  className="size-9 shrink-0 rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Regresar al inicio"
                >
                  <ArrowLeft className="size-5" />
                </Button>

                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  {/* Avatar de Eli: Círculo con gradiente de la marca sin foto */}
                  <div
                    className="relative flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#6857E4] to-[#87FFBD] shadow-soft ring-2 ring-card"
                    aria-hidden="true"
                  >
                    <Sparkles className="size-4 sm:size-5 text-white/95" />
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-amber-400 ring-2 ring-card" />
                  </div>

                  <div className="min-w-0 truncate">
                    <div className="flex items-center gap-2">
                      <h1 className="text-sm sm:text-base font-bold leading-tight text-foreground truncate">
                        {BRAND.assistant}
                      </h1>
                      <Badge
                        variant="outline"
                        className="border-amber-400/50 bg-amber-400/10 text-amber-600 dark:text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0"
                      >
                        Próximamente
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Asistente virtual de bienestar TESH
                    </p>
                  </div>
                </div>
              </div>

              {/* Acciones del encabezado: Tema, Historial y Nueva Conversación */}
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <ThemeToggle className="size-9" />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHistoryOpen(true)}
                  className="h-9 rounded-xl border-border bg-card/80 text-xs font-semibold gap-1.5 shadow-xs transition-colors hover:bg-muted px-2.5 sm:px-3"
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
                  className="size-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Nueva conversación"
                  aria-label="Nueva conversación"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Banner permanente informativo del estado "Próximamente" y línea de apoyo */}
          <div
            role="note"
            aria-label="Aviso de disponibilidad y línea de crisis"
            className="z-10 shrink-0 border-b border-teal/20 bg-mint-soft/40 dark:bg-teal/10 px-4 py-2 text-center text-xs text-foreground backdrop-blur-sm"
          >
            <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 text-[11px] leading-snug sm:text-xs">
              <Sparkles className="size-3.5 shrink-0 text-teal animate-pulse" />
              <span>
                <strong>{BRAND.assistant} estará disponible próximamente.</strong> En caso de
                requerir apoyo inmediato, llama al{" "}
                <a
                  href="tel:8009112000"
                  className="font-bold text-teal underline decoration-teal/60 underline-offset-2 hover:decoration-teal"
                >
                  800 911 2000
                </a>{" "}
                o acude a Orientación Psicológica del TESH.
              </span>
            </div>
          </div>

          {/* Área central de mensajes: scroll interno independiente */}
          <main
            aria-label={`Conversación con ${BRAND.assistant}`}
            className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 overscroll-contain"
          >
            <div className="mx-auto flex max-w-3xl flex-col space-y-4">
              {/* Tarjeta destacada de aviso informativo "Próximamente" */}
              <div className="mx-auto w-full max-w-md rounded-2xl border border-teal/30 bg-card/75 p-3.5 text-center shadow-soft backdrop-blur-sm">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-teal uppercase tracking-wider">
                  <Info className="size-3.5" />
                  <span>Modo Demostración</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Mostrando mensajes de ejemplo informativos. Muy pronto podrás interactuar
                  directamente con {BRAND.assistant} para acompañamiento 24/7.
                </p>
              </div>

              {messages.map((msg) => {
                const isUser = msg.sender === "user";

                return (
                  <motion.div
                    key={msg.id}
                    initial={
                      shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: shouldReduceMotion ? 0.1 : 0.24,
                      ease: "easeOut",
                    }}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`relative max-w-[86%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed sm:max-w-[78%] ${
                        isUser
                          ? "rounded-tr-xs bg-[#6857E4] dark:bg-[#8B7CF0] text-white dark:text-[#0F0E1A] shadow-sm font-medium"
                          : "rounded-tl-xs border border-border/60 bg-card text-card-foreground shadow-soft"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <div
                        className={`mt-1.5 text-[10px] ${
                          isUser
                            ? "text-white/80 dark:text-[#0F0E1A]/80 text-right"
                            : "text-muted-foreground text-left"
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
                        className="mt-3 w-full max-w-[92%] rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-card-foreground shadow-md sm:max-w-[82%]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-destructive/20 p-2 text-destructive">
                            <ShieldAlert className="size-5" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <h2 className="text-sm font-bold text-foreground">
                              Acompañamiento prioritario e inmediato
                            </h2>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Tu bienestar es lo más importante. Si estás pasando por un momento
                              crítico o necesitas hablar con un especialista de inmediato, cuentas
                              con apoyo directo y confidencial.
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
                                <Phone className="size-3.5 text-accent" />
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

              {/* Indicador de escritura animado */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={
                      shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }
                    }
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
                        {BRAND.assistant} está escribiendo...
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
          </main>

          {/* Campo de entrada fijo abajo (compatible con teclado móvil y safe-area insets) */}
          <footer className="z-20 shrink-0 border-t border-border/60 bg-card/95 px-3 py-3 backdrop-blur-lg sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
                    placeholder={`Escribe un mensaje para ${BRAND.assistant}...`}
                    rows={1}
                    className="max-h-28 min-h-[44px] w-full resize-none rounded-2xl border border-border/80 bg-background px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                {/* Botón de micrófono deshabilitado en preview */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled
                      aria-label="Dictado por voz (Próximamente)"
                      className="size-11 shrink-0 rounded-2xl border-border/70 text-muted-foreground/50 cursor-not-allowed hidden sm:inline-flex"
                    >
                      <Mic className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Dictado por voz próximamente</p>
                  </TooltipContent>
                </Tooltip>

                {/* Botón de enviar mensaje */}
                <Button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  aria-label="Enviar mensaje"
                  className="size-11 shrink-0 rounded-2xl bg-primary text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-40"
                >
                  <Send className="size-4 sm:size-5" />
                </Button>
              </form>

              <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground px-1">
                <span>Enter para enviar • Shift + Enter para salto de línea</span>
                <span className="font-semibold text-accent hidden sm:inline">
                  Próximamente en TESH
                </span>
              </div>
            </div>
          </footer>

          {/* Panel lateral reutilizado de Historial de Conversaciones */}
          <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-card p-6">
              <SheetHeader className="text-left pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-xl bg-lavender-soft text-primary">
                    <History className="size-4" />
                  </div>
                  <div>
                    <SheetTitle className="font-display text-xl text-primary font-bold">
                      Historial de Conversaciones
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                      Consulta sesiones informativas anteriores o inicia una nueva plática con{" "}
                      {BRAND.assistant}.
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
                  <span>+ Nueva conversación con {BRAND.assistant}</span>
                </Button>

                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sesiones Anteriores (Ejemplos)
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
      </div>
    </TooltipProvider>
  );
}
