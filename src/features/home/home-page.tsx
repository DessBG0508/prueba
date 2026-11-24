import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  BatteryMedium,
  BedDouble,
  Brain,
  CalendarHeart,
  CircleGauge,
  HeartPulse,
  Library,
  Sparkles,
  Wind,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MoodIllustration } from "@/components/ui/mood-illustration";
import { LiquidButton } from "@/components/effects/liquid-button";
import { TiltCard } from "@/components/effects/tilt-card";
import { PageShell } from "@/components/layout/page-shell";
import { WellbeingStatsGrid } from "@/features/bienestar/wellbeing-stats-grid";
import { moods } from "@/lib/mock-data";
import type { MoodId } from "@/lib/types";
import { BRAND } from "@/lib/branding";
import { useMoodStats, getTodayMoodCheckIn } from "@/lib/mood-store";
import { useAuth } from "@/lib/auth-context";
import { BreathingModal } from "@/features/bienestar/breathing-modal";
import {
  getStudentPendingCanalizaciones,
  type CanalizacionRecord,
} from "@/features/tutor/tutor-service";
import {
  getActiveAnuncios,
  getStudentAnuncioInscripciones,
  getStudentLatestRiskLevel,
  subscribeToAnunciosChanges,
  type AnuncioPublicoObjetivo,
  type AnuncioRecord,
} from "@/features/anuncios/anuncios-service";
import { AnuncioHeroCarousel } from "@/components/anuncios/anuncio-hero-carousel";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06, // 60ms stagger between cards
      delayChildren: 0.04,
    },
  },
};

const staggerCard = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 1, 0.5, 1],
    },
  },
};

const quickActions = [
  { title: "Check-in emocional", detail: "Tómate 2 min", icon: HeartPulse, tone: "bg-mint-soft" },
  {
    title: "Ejercicios de respiración",
    detail: "Respira y vuelve a ti",
    icon: Wind,
    tone: "bg-lavender-soft",
  },
  { title: "Recursos", detail: "Ideas para cuidarte", icon: Library, tone: "bg-cyan-soft" },
  { title: "Mis citas", detail: "Revisa tu agenda", icon: CalendarHeart, tone: "bg-green-soft" },
];
const statIcons = [Brain, BedDouble, CircleGauge, BatteryMedium];

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const nombre = user?.name ?? "Estudiante";
  const { todayMood, saveTodayMood } = useMoodStats();
  const [selectedMood, setSelectedMood] = useState<MoodId>(() => {
    const today = getTodayMoodCheckIn();
    return today ? today.moodId : "regular";
  });
  const [isBreathingModalOpen, setIsBreathingModalOpen] = useState(false);
  const [pendingCanalizaciones, setPendingCanalizaciones] = useState<CanalizacionRecord[]>([]);
  const [anuncios, setAnuncios] = useState<AnuncioRecord[]>([]);
  const [studentRiskLevel, setStudentRiskLevel] =
    useState<Exclude<AnuncioPublicoObjetivo, "todos">>("sin_tamizaje");
  const [enrolledAnuncioIds, setEnrolledAnuncioIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const loadAnunciosData = async () => {
      try {
        const [activeAnuncios, riskLvl, enrolledIds] = await Promise.all([
          getActiveAnuncios(),
          getStudentLatestRiskLevel(user?.id, user?.email),
          user?.id ? getStudentAnuncioInscripciones(user.id) : Promise.resolve([]),
        ]);
        if (!active) return;
        setAnuncios(activeAnuncios);
        setStudentRiskLevel(riskLvl);
        setEnrolledAnuncioIds(enrolledIds);
      } catch {
        // Ignore non-blocking load errors
      }
    };

    loadAnunciosData();
    const unsubscribe = subscribeToAnunciosChanges(() => {
      getActiveAnuncios()
        .then((list) => {
          if (active) setAnuncios(list);
        })
        .catch(() => {});
    });

    if (user?.id) {
      getStudentPendingCanalizaciones(user.id)
        .then((list) => {
          if (active) setPendingCanalizaciones(list);
        })
        .catch(() => {});
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.id, user?.email]);

  const visibleAnuncios = anuncios.filter(
    (a) => a.publico_objetivo === "todos" || a.publico_objetivo === studentRiskLevel,
  );

  // Sincronía inversa: si se edita desde el panel de métricas o cambia hoy, actualizar el emocionómetro
  useEffect(() => {
    if (todayMood && todayMood !== selectedMood) {
      setSelectedMood(todayMood);
    }
  }, [todayMood, selectedMood]);

  const handleMoodSelect = (moodId: MoodId) => {
    setSelectedMood(moodId);
    saveTodayMood(moodId);
    toast("Registro guardado");
  };

  const shouldReduceMotion = useReducedMotion();

  const reducedVariants = {
    hidden: { opacity: 1, y: 0 },
    visible: { opacity: 1, y: 0 },
  };
  const activeContainerVariants = shouldReduceMotion ? reducedVariants : staggerContainer;
  const activeCardVariants = shouldReduceMotion ? reducedVariants : staggerCard;

  return (
    <PageShell>
      <main>
        <AnuncioHeroCarousel anuncios={visibleAnuncios} enrolledIds={enrolledAnuncioIds} />

        {pendingCanalizaciones.length > 0 && (
          <section
            aria-label="Aviso de canalización pendiente"
            className="mb-6 rounded-2xl border-2 border-[#1B198F] bg-card p-4 sm:p-5 shadow-soft"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1B198F] text-white">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1B198F] dark:text-indigo-300">
                    Aviso del Área de Tutorías
                  </p>
                  <p className="text-sm font-semibold text-foreground leading-relaxed">
                    Tienes una canalización pendiente del área de tutorías. Motivo:{" "}
                    {pendingCanalizaciones[0].motivo}. Prioridad:{" "}
                    <span className="capitalize font-bold">
                      {pendingCanalizaciones[0].prioridad}
                    </span>
                    . Por favor agenda tu cita con el psicólogo lo antes posible.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => navigate({ to: "/citas" })}
                className="shrink-0 rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs sm:text-sm font-semibold px-5 h-10"
              >
                Agendar cita
              </Button>
            </div>
          </section>
        )}

        <section className="mb-7 max-w-2xl animate-fade-in sm:mb-9">
          <p className="mb-1 text-sm font-semibold text-accent">Sábado, 19 de septiembre</p>
          <h1 className="font-display text-4xl leading-tight text-primary sm:text-5xl">
            Hola, {nombre}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Qué bueno verte por aquí. Siempre es un buen momento para cuidar de ti.
          </p>
        </section>

        <motion.div
          variants={activeContainerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] lg:gap-7"
        >
          <div className="space-y-5 lg:space-y-7">
            {/* Tarjeta destacada de Eli — Asistente de apoyo emocional */}
            <motion.section
              variants={activeCardVariants}
              className="ethereal-card overflow-hidden p-5 sm:p-6 border-[#6857E4]/30 bg-card shadow-soft"
              aria-label={`Asistente ${BRAND.assistant}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar de Eli: Mascota oficial */}
                  <div className="relative size-11 shrink-0">
                    <img
                      src="/img/eli-avatar.webp"
                      alt="Eli, asistente de tamizaje emocional"
                      width={44}
                      height={44}
                      decoding="async"
                      className="size-full rounded-full object-cover shadow-soft"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl font-bold text-primary">
                        Habla con {BRAND.assistant}
                      </h2>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                        En línea
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      Tu asistente de apoyo emocional 24/7. Un espacio seguro y confidencial.
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  className="rounded-2xl bg-[#6857E4] hover:bg-[#6857E4]/90 px-5 text-xs font-semibold text-white shadow-soft transition-colors active:scale-95"
                >
                  <Link to="/chat">
                    <span>Conversar con {BRAND.assistant}</span>
                  </Link>
                </Button>
              </div>
            </motion.section>

            <motion.section
              variants={activeCardVariants}
              className="ethereal-card p-5 sm:p-7"
              aria-labelledby="mood-title"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase text-teal">Pausa contigo</p>
                  <h2 id="mood-title" className="font-display text-2xl text-primary sm:text-3xl">
                    ¿Cómo está tu cielo hoy?
                  </h2>
                </div>
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mint-soft text-teal">
                  <HeartPulse />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2 sm:gap-4">
                {moods.map((mood) => {
                  const active = selectedMood === mood.id;
                  return (
                    <button
                      key={mood.id}
                      type="button"
                      aria-pressed={active}
                      aria-label={`Me siento ${mood.label.toLowerCase()}`}
                      onClick={() => handleMoodSelect(mood.id)}
                      className="group flex min-w-0 flex-col items-center gap-2 rounded-2xl py-1 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-ring/35"
                    >
                      <motion.span
                        animate={{ scale: active ? 1.12 : 1, y: active ? -3 : 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 18 }}
                        className={`mood-circle mood-${mood.tone} ${active ? "ring-4 ring-accent/20 shadow-float" : "shadow-soft"}`}
                      >
                        <MoodIllustration moodId={mood.id} />
                      </motion.span>
                      <span
                        className={`text-center text-[0.68rem] font-semibold leading-tight sm:text-xs ${active ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {mood.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.section>

            <motion.section variants={activeCardVariants} aria-labelledby="quick-title">
              <h2 id="quick-title" className="mb-4 font-display text-2xl text-primary">
                Para cuidar de ti
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {quickActions.map(({ title, detail, icon: Icon, tone }) =>
                  title === "Check-in emocional" ? (
                    <TiltCard key={title} className="h-full">
                      <Button
                        asChild
                        variant="outline"
                        className="ethereal-card group h-full w-full min-h-36 flex-col items-start justify-between whitespace-normal p-4 text-left sm:min-h-40 sm:p-5"
                      >
                        <Link to="/checkin">
                          <span
                            className={`grid size-11 place-items-center rounded-2xl ${tone} text-primary transition-transform group-hover:-rotate-3 group-hover:scale-105`}
                          >
                            <Icon />
                          </span>
                          <span>
                            <span className="block text-sm font-bold leading-snug text-primary sm:text-base">
                              {title}
                            </span>
                            <span className="mt-1 block text-xs font-medium text-muted-foreground">
                              {detail}
                            </span>
                          </span>
                        </Link>
                      </Button>
                    </TiltCard>
                  ) : title === "Ejercicios de respiración" ? (
                    <TiltCard key={title} className="h-full">
                      <button
                        type="button"
                        onClick={() => setIsBreathingModalOpen(true)}
                        className="ethereal-card group h-full w-full min-h-36 flex flex-col items-start justify-between whitespace-normal p-4 text-left sm:min-h-40 sm:p-5 rounded-3xl border border-border/80 bg-card/80 hover:border-primary/40 transition-all cursor-pointer"
                        aria-label="Iniciar ejercicio interactivo de respiración"
                      >
                        <span
                          className={`grid size-11 place-items-center rounded-2xl ${tone} text-primary transition-transform group-hover:-rotate-3 group-hover:scale-105`}
                        >
                          <Icon />
                        </span>
                        <span>
                          <span className="block text-sm font-bold leading-snug text-primary sm:text-base">
                            {title}
                          </span>
                          <span className="mt-1 block text-xs font-medium text-muted-foreground">
                            {detail}
                          </span>
                        </span>
                      </button>
                    </TiltCard>
                  ) : title === "Recursos" ? (
                    <TiltCard key={title} className="h-full">
                      <Button
                        asChild
                        variant="outline"
                        className="ethereal-card group h-full w-full min-h-36 flex-col items-start justify-between whitespace-normal p-4 text-left sm:min-h-40 sm:p-5"
                      >
                        <Link to="/recursos">
                          <span
                            className={`grid size-11 place-items-center rounded-2xl ${tone} text-primary transition-transform group-hover:-rotate-3 group-hover:scale-105`}
                          >
                            <Icon />
                          </span>
                          <span>
                            <span className="block text-sm font-bold leading-snug text-primary sm:text-base">
                              {title}
                            </span>
                            <span className="mt-1 block text-xs font-medium text-muted-foreground">
                              {detail}
                            </span>
                          </span>
                        </Link>
                      </Button>
                    </TiltCard>
                  ) : title === "Mis citas" ? (
                    <TiltCard key={title} className="h-full">
                      <Button
                        asChild
                        variant="outline"
                        className="ethereal-card group h-full w-full min-h-36 flex-col items-start justify-between whitespace-normal p-4 text-left sm:min-h-40 sm:p-5"
                      >
                        <Link to="/citas">
                          <span
                            className={`grid size-11 place-items-center rounded-2xl ${tone} text-primary transition-transform group-hover:-rotate-3 group-hover:scale-105`}
                          >
                            <Icon />
                          </span>
                          <span>
                            <span className="block text-sm font-bold leading-snug text-primary sm:text-base">
                              {title}
                            </span>
                            <span className="mt-1 block text-xs font-medium text-muted-foreground">
                              {detail}
                            </span>
                          </span>
                        </Link>
                      </Button>
                    </TiltCard>
                  ) : (
                    <TiltCard key={title} className="h-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => toast("Próximamente")}
                        className="ethereal-card group h-full w-full min-h-36 flex-col items-start justify-between whitespace-normal p-4 text-left sm:min-h-40 sm:p-5"
                      >
                        <span
                          className={`grid size-11 place-items-center rounded-2xl ${tone} text-primary transition-transform group-hover:-rotate-3 group-hover:scale-105`}
                        >
                          <Icon />
                        </span>
                        <span>
                          <span className="block text-sm font-bold leading-snug text-primary sm:text-base">
                            {title}
                          </span>
                          <span className="mt-1 block text-xs font-medium text-muted-foreground">
                            {detail}
                          </span>
                        </span>
                      </Button>
                    </TiltCard>
                  ),
                )}
              </div>
            </motion.section>

            <motion.div variants={activeCardVariants}>
              <LiquidButton onClick={() => navigate({ to: "/citas" })}>
                Agendar cita con psicólogo
              </LiquidButton>
            </motion.div>
          </div>

          <motion.section
            variants={activeCardVariants}
            className="ethereal-card h-fit p-5 sm:p-7"
            aria-labelledby="stats-title"
          >
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-teal">Últimos 7 días</p>
                <h2 id="stats-title" className="font-display text-2xl text-primary sm:text-3xl">
                  Tu bienestar en números
                </h2>
              </div>
            </div>
            <WellbeingStatsGrid variant="home" />
            <p className="mt-5 rounded-2xl bg-mint-soft px-4 py-3 text-sm leading-relaxed text-primary/80">
              Tus días no tienen que ser perfectos para contar. Cada pausa también es un avance.
            </p>
          </motion.section>
        </motion.div>

        <footer className="mt-8 border-t border-border/50 pt-4 pb-2 text-center text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span>
              Tus datos de tamizaje y notas están protegidos bajo estricta confidencialidad médica
              (LFPDPPP).
            </span>
            <Link
              to="/aviso-privacidad"
              search={{ mode: "consulta" }}
              className="font-semibold text-primary underline hover:text-accent transition-colors"
            >
              Consultar Aviso de Privacidad
            </Link>
          </div>
        </footer>
      </main>

      <BreathingModal
        isOpen={isBreathingModalOpen}
        onClose={() => setIsBreathingModalOpen(false)}
      />
    </PageShell>
  );
}
