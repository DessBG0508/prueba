import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ChevronDown, HeartHandshake, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { BreathingSphereView } from "@/components/effects/breathing-sphere-view";
import type { CrisisResource, RiskLevel } from "@/lib/types";

const ALERT_LEVEL: RiskLevel = "rojo";

const crisisResources: CrisisResource[] = [
  {
    id: "linea-vida",
    name: "Línea de la Vida",
    contact: "800 911 2000",
    kind: "phone",
    available: "Disponible las 24 horas · Gratuita",
  },
  {
    id: "saptel",
    name: "SAPTEL (Cruz Roja)",
    contact: "800 472 7835",
    kind: "phone",
    available: "Apoyo y contención psicológica 24h",
  },
  {
    id: "emergencias",
    name: "Emergencias",
    contact: "911",
    kind: "emergency",
    available: "Atención inmediata 24/7",
  },
  {
    id: "tesh-bienestar",
    name: "Bienestar / Psicología TESH",
    contact: "55 5829 0000",
    kind: "phone",
    available: "Edif. Tutorías · Ext. 109 (L-V 8:00 a 18:00 hrs)",
  },
];

export function AlertaPage() {
  const [showResources, setShowResources] = useState(true);
  const reduceMotion = useReducedMotion();

  const handleContact = () => {
    window.location.href = "tel:8009112000";
    toast("Conectando con Línea de la Vida (800 911 2000)", {
      description: "Atención gratuita, confidencial y especializada disponible 24/7.",
    });
  };

  return (
    <PageShell>
      <main className="mx-auto max-w-4xl pb-6" data-risk-level={ALERT_LEVEL}>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary sm:text-sm">
          Atención prioritaria
        </p>

        <section
          className="relative overflow-hidden rounded-3xl bg-[#FF9CED] p-6 text-primary shadow-float sm:p-9 lg:p-12"
          style={{ backgroundColor: "#FF9CED" }}
          aria-labelledby="alert-title"
        >
          <img
            src="/emocionometro/mood-bien.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute -right-5 -top-4 w-28 rotate-6 opacity-20 sm:w-40"
            aria-hidden="true"
          />
          <img
            src="/emocionometro/mood-feliz.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute -bottom-6 right-20 w-20 -rotate-12 opacity-15 sm:w-28"
            aria-hidden="true"
          />
          <div className="relative max-w-2xl">
            <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-card/75 text-primary">
              <HeartHandshake className="size-6" aria-hidden="true" />
            </div>
            <h1
              id="alert-title"
              className="font-display text-3xl leading-tight sm:text-4xl lg:text-5xl"
            >
              Notamos que podrías necesitar apoyo ahora
            </h1>
            <p className="mt-4 max-w-xl text-base font-medium leading-relaxed sm:text-lg">
              No estás sola/o en esto. Hay alguien disponible para escucharte en este momento, sin
              costo y de forma confidencial.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                onClick={handleContact}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Phone aria-hidden="true" />
                Hablar con alguien ahora
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                aria-expanded={showResources}
                aria-controls="crisis-resources"
                onClick={() => setShowResources((current) => !current)}
                className="w-full border-card bg-card text-primary hover:bg-card/90"
              >
                {showResources ? "Ocultar recursos" : "Ver recursos de apoyo"}
                <ChevronDown
                  className={`transition-transform ${showResources ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>
        </section>

        {showResources && (
          <motion.section
            id="crisis-resources"
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Recursos de apoyo"
          >
            {crisisResources.map((resource) => {
              const Icon = resource.kind === "emergency" ? ShieldCheck : Phone;
              const cleanDigits = resource.contact.replace(/[^\d+]/g, "");
              const phoneHref = resource.id === "emergencias" ? "tel:911" : `tel:${cleanDigits}`;

              const content = (
                <div className="flex flex-col justify-between h-full space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-mint-soft text-teal">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <span className="block font-semibold text-primary text-sm leading-snug">
                        {resource.name}
                      </span>
                      <span className="mt-0.5 block text-base font-bold font-mono text-foreground">
                        {resource.contact}
                      </span>
                    </div>
                  </div>
                  <span className="block text-xs text-muted-foreground pt-1 border-t border-border/40">
                    {resource.available}
                  </span>
                </div>
              );

              return (
                <a
                  key={resource.id}
                  href={phoneHref}
                  className="ethereal-card p-4 hover:border-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
                  aria-label={`Llamar a ${resource.name} al ${resource.contact}`}
                >
                  {content}
                </a>
              );
            })}
          </motion.section>
        )}

        <section
          className="ethereal-card mt-5 grid items-center gap-7 p-6 sm:grid-cols-[minmax(13rem,0.7fr)_1.3fr] sm:p-9"
          aria-labelledby="breathing-title"
        >
          <div className="flex min-h-56 items-center justify-center" aria-hidden="true">
            <BreathingSphereView />
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2 text-teal">
              <ShieldCheck className="size-5" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-[0.16em]">
                Respiración 4–7–8
              </span>
            </div>
            <h2 id="breathing-title" className="font-display text-3xl text-primary sm:text-4xl">
              Mientras tanto
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Respira lento cuatro segundos, sostén, y suelta. Estamos aquí contigo.
            </p>
          </div>
        </section>

        <footer className="mt-8 border-t border-border/70 pt-6 text-center space-y-3 text-sm text-muted-foreground">
          {/* Leyenda clínica obligatoria */}
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary shadow-xs">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            <span>Tamizaje, no diagnóstico</span>
          </div>

          <p className="max-w-xl mx-auto text-xs text-muted-foreground leading-relaxed">
            Esta plataforma ofrece detección preventiva y orientación psicológica inicial para la
            comunidad universitaria del TESH. Ningún resultado emitido por Equilibra TESH sustituye
            una evaluación clínica formal ni constituye un diagnóstico médico.
          </p>

          <p>Cuando te sientas listo/a, puedes volver cuando quieras</p>
          <Link
            to="/"
            className="inline-block font-semibold text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
          >
            Volver al inicio
          </Link>
        </footer>
      </main>
    </PageShell>
  );
}
