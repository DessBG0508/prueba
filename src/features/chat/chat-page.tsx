import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { chatIcons } from "@/config/icons";
import { sendEliMessage, type EliMessage } from "@/lib/api-client";
import { sanitizeText } from "@/lib/security";
import { AuroraBackground } from "@/components/effects/aurora-background";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const INITIAL_MESSAGE: EliMessage = {
  id: "initial-welcome-message",
  sender: "eli",
  text: "Hola, soy Eli. Este es un espacio seguro para ti. ¿Cómo has estado últimamente?",
  isCrisisProtocol: false,
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

export function ChatPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [messages, setMessages] = useState<EliMessage[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, isTyping]);

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

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const response = await sendEliMessage(sanitized);
      const formattedTimestamp = new Date(response.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      setMessages((prev) => [
        ...prev,
        {
          ...response,
          timestamp: formattedTimestamp,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "eli",
          text: "Estoy teniendo dificultades para responder en este instante. Por favor, intenta de nuevo en unos momentos.",
          isCrisisProtocol: false,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
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
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: "/" })}
                className="size-9 rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                aria-label="Regresar al inicio"
              >
                <chatIcons.back className="size-5" />
              </Button>

              <div className="flex items-center gap-3">
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

            <div className="hidden text-right text-xs text-muted-foreground sm:block">
              <p className="font-medium">Espacio de apoyo emocional</p>
              <p className="text-[11px] text-muted-foreground/80">Confidencial y seguro</p>
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

                  {/* Tarjeta destacada de guardarraíles de crisis (RNF03) */}
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

            {/* Indicador de escritura: tres puntos animados con fade-in / fade-out */}
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

        {/* Barra de entrada fija abajo (optimizada para no tapar en móvil) */}
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

              {/* Botón de micrófono: placeholder deshabilitado con tooltip */}
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
      </AuroraBackground>
    </TooltipProvider>
  );
}
