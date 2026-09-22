import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
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
import { moods, wellbeingStats } from "@/lib/mock-data";
import type { MoodId } from "@/lib/types";

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
  const [selectedMood, setSelectedMood] = useState<MoodId>("regular");

  return (
    <PageShell>
      <main>
        <section className="mb-7 max-w-2xl animate-fade-in sm:mb-9">
          <p className="mb-1 text-sm font-semibold text-accent">Sábado, 19 de septiembre</p>
          <h1 className="font-display text-4xl leading-tight text-primary sm:text-5xl">
            Hola, Dess <span aria-hidden>✨</span>
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Qué bueno verte por aquí. Siempre es un buen momento para cuidar de ti.
          </p>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] lg:gap-7">
          <div className="space-y-5 lg:space-y-7">
            {/* Tarjeta destacada de Eli — Asistente de apoyo emocional */}
            <section
              className="ethereal-card overflow-hidden p-5 sm:p-6 border-accent/30 bg-gradient-to-r from-card via-card to-lavender-soft/40 shadow-soft"
              aria-label="Asistente Eli"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar de Eli: Círculo con gradiente de la marca (#6857E4 a #87FFBD), no foto */}
                  <div className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#6857E4] to-[#87FFBD] shadow-soft ring-2 ring-card">
                    <Sparkles className="size-6 text-white" />
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl font-bold text-primary">Habla con Eli</h2>
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
                  className="rounded-2xl bg-[#6857E4] px-5 text-xs font-semibold text-white shadow-soft transition-transform hover:scale-105 active:scale-95"
                >
                  <Link to="/chat">
                    <span>Conversar con Eli</span>
                  </Link>
                </Button>
              </div>
            </section>

            <section className="ethereal-card p-5 sm:p-7" aria-labelledby="mood-title">
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
                      onClick={() => setSelectedMood(mood.id)}
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
            </section>

            <section aria-labelledby="quick-title">
              <h2 id="quick-title" className="mb-4 font-display text-2xl text-primary">
                Para cuidar de ti
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {quickActions.map(({ title, detail, icon: Icon, tone }) =>
                  title === "Check-in emocional" ? (
                    <Button
                      key={title}
                      asChild
                      variant="outline"
                      className="ethereal-card group h-auto min-h-36 flex-col items-start justify-between whitespace-normal p-4 text-left sm:min-h-40 sm:p-5"
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
                  ) : title === "Ejercicios de respiración" || title === "Recursos" ? (
                    <Button
                      key={title}
                      asChild
                      variant="outline"
                      className="ethereal-card group h-auto min-h-36 flex-col items-start justify-between whitespace-normal p-4 text-left sm:min-h-40 sm:p-5"
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
                  ) : title === "Mis citas" ? (
                    <Button
                      key={title}
                      asChild
                      variant="outline"
                      className="ethereal-card group h-auto min-h-36 flex-col items-start justify-between whitespace-normal p-4 text-left sm:min-h-40 sm:p-5"
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
                  ) : (
                    <Button
                      key={title}
                      type="button"
                      variant="outline"
                      onClick={() => toast("Próximamente")}
                      className="ethereal-card group h-auto min-h-36 flex-col items-start justify-between whitespace-normal p-4 text-left sm:min-h-40 sm:p-5"
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
                  ),
                )}
              </div>
            </section>

            <LiquidButton onClick={() => navigate({ to: "/citas" })}>
              Agendar cita con psicólogo
            </LiquidButton>
          </div>

          <section className="ethereal-card h-fit p-5 sm:p-7" aria-labelledby="stats-title">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-teal">Últimos 7 días</p>
                <h2 id="stats-title" className="font-display text-2xl text-primary sm:text-3xl">
                  Tu bienestar en números
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {wellbeingStats.map((stat, index) => {
                const Icon = statIcons[index] ?? Brain;
                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-border/60 bg-card/65 p-4 lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-4"
                  >
                    <div className="mb-3 grid size-9 place-items-center rounded-xl bg-lavender-soft text-accent lg:mb-0">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">{stat.label}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary/25">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${stat.progress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-teal"
                        />
                      </div>
                    </div>
                    <p className="mt-2 font-numeric text-2xl font-semibold italic text-primary lg:mt-0">
                      {stat.value}
                      <span className="ml-0.5 font-sans text-xs font-semibold not-italic text-muted-foreground">
                        {stat.suffix}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 rounded-2xl bg-mint-soft px-4 py-3 text-sm leading-relaxed text-primary/80">
              Tus días no tienen que ser perfectos para contar. Cada pausa también es un avance.
            </p>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
