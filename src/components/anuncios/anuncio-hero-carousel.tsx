import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ANUNCIO_TIPO_META,
  formatAnuncioFecha,
  formatAnuncioHorario,
  getCleanAnuncioTitulo,
} from "@/components/anuncios/anuncio-meta";
import type { AnuncioRecord } from "@/features/anuncios/anuncios-service";

interface AnuncioHeroCarouselProps {
  anuncios: AnuncioRecord[];
  enrolledIds: string[];
  autoPlayMs?: number;
}

const SLIDE_VARIANTS = {
  enter: (direction: number) => ({
    x: direction > 0 ? 44 : -44,
    opacity: 0,
    scale: 0.99,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -44 : 44,
    opacity: 0,
    scale: 0.99,
  }),
};

export function AnuncioHeroCarousel({
  anuncios,
  enrolledIds,
  autoPlayMs = 5000,
}: AnuncioHeroCarouselProps) {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const count = anuncios.length;
  const safeIndex = count > 0 ? activeIndex % count : 0;

  useEffect(() => {
    if (count <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % count);
    }, autoPlayMs);
    return () => clearInterval(timer);
  }, [count, isPaused, autoPlayMs]);

  if (count === 0) return null;

  const current = anuncios[safeIndex];
  const meta = ANUNCIO_TIPO_META[current.tipo] || ANUNCIO_TIPO_META.informativo;
  const Icon = meta.Icon;
  const cleanTitle = getCleanAnuncioTitulo(current.titulo);
  const fechaFormateada = formatAnuncioFecha(current.fecha_evento);
  const horario = formatAnuncioHorario(current.hora_inicio, current.hora_fin);

  const hasCupo = current.cupo !== null && current.cupo !== undefined && current.cupo > 0;
  const isEnrolled = enrolledIds.includes(current.id);
  const isCupoLleno = hasCupo && current.inscritos >= (current.cupo ?? 0);
  const canEnroll = current.tipo === "taller" || current.tipo === "evento" || hasCupo;

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + count) % count);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % count);
  };

  const goToIndex = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDirection(idx >= safeIndex ? 1 : -1);
    setActiveIndex(idx);
  };

  const handleOpenInAnuncios = (targetId?: string) => {
    navigate({
      to: "/anuncios",
      search: targetId ? { anuncio: targetId } : undefined,
    });
  };

  return (
    <section
      aria-label="Cartelera de anuncios y talleres"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="mb-6"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => handleOpenInAnuncios(current.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenInAnuncios(current.id);
          }
        }}
        className={`group relative overflow-hidden rounded-2xl ${meta.borderClass} bg-card shadow-soft transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B198F]`}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={current.id}
            custom={direction}
            variants={
              shouldReduceMotion
                ? {
                    enter: { opacity: 0 },
                    center: { opacity: 1 },
                    exit: { opacity: 0 },
                  }
                : SLIDE_VARIANTS
            }
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 280, damping: 28 },
              opacity: { duration: 0.24, ease: "easeOut" },
              scale: { duration: 0.24, ease: "easeOut" },
            }}
            className={`grid gap-0 ${
              current.imagen_url ? "md:grid-cols-[minmax(0,22rem)_1fr]" : "grid-cols-1"
            }`}
          >
            {/* Flyer visual si existe */}
            {current.imagen_url && (
              <div className="relative aspect-[16/10] md:aspect-auto md:h-full min-h-44 overflow-hidden bg-muted/40">
                <motion.img
                  src={current.imagen_url}
                  alt={`Flyer: ${current.titulo}`}
                  initial={shouldReduceMotion ? false : { scale: 1.04 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
            )}

            {/* Contenido del slide */}
            <div className="p-4 sm:p-6 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`${meta.badgeClass} text-[11px] font-bold`}>
                      <Icon className="mr-1 size-3" />
                      {meta.label}
                    </Badge>

                    {hasCupo && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                        <Users className="size-3 text-[#1B198F] dark:text-indigo-300" />
                        {current.inscritos}/{current.cupo} inscritos
                      </span>
                    )}

                    {isEnrolled && (
                      <Badge
                        variant="outline"
                        className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-bold"
                      >
                        <CheckCircle2 className="mr-1 size-3" />
                        Inscrito
                      </Badge>
                    )}

                    {isCupoLleno && !isEnrolled && (
                      <Badge
                        variant="outline"
                        className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] font-bold"
                      >
                        Cupo lleno
                      </Badge>
                    )}
                  </div>

                  {count > 1 && (
                    <span className="text-[11px] font-bold text-muted-foreground">
                      {safeIndex + 1} / {count}
                    </span>
                  )}
                </div>

                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground leading-snug group-hover:text-[#1B198F] dark:group-hover:text-indigo-300 transition-colors">
                  {cleanTitle}
                </h2>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {current.descripcion}
                </p>

                {(fechaFormateada || horario || current.lugar) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs font-medium text-foreground/85">
                    {fechaFormateada && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-[#1B198F] dark:text-indigo-300 shrink-0" />
                        {fechaFormateada}
                      </span>
                    )}
                    {horario && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5 text-[#1B198F] dark:text-indigo-300 shrink-0" />
                        {horario}
                      </span>
                    )}
                    {current.lugar && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-[#1B198F] dark:text-indigo-300 shrink-0" />
                        {current.lugar}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Footer del Hero Carousel: CTA + controles de navegación */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInAnuncios(current.id);
                    }}
                    className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-semibold h-9 px-4"
                  >
                    {canEnroll && !isEnrolled && !isCupoLleno ? "Ir a inscribirme" : "Ver detalles"}
                    <ArrowRight className="ml-1.5 size-3.5" />
                  </Button>

                  {count > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInAnuncios();
                      }}
                      className="rounded-xl text-xs font-semibold h-9"
                    >
                      Ver todos ({count})
                    </Button>
                  )}
                </div>

                {count > 1 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center gap-1.5"
                      role="tablist"
                      aria-label="Diapositivas"
                    >
                      {anuncios.map((item, idx) => (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={idx === safeIndex}
                          aria-label={`Ir al anuncio ${idx + 1}: ${item.titulo}`}
                          onClick={(e) => goToIndex(idx, e)}
                          className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                            idx === safeIndex
                              ? "w-6 bg-[#1B198F] dark:bg-indigo-400"
                              : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1 ml-1">
                      <button
                        type="button"
                        onClick={goToPrev}
                        aria-label="Anuncio anterior"
                        className="grid size-8 place-items-center rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={goToNext}
                        aria-label="Siguiente anuncio"
                        className="grid size-8 place-items-center rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Barra de progreso del temporizador de rotación */}
        {count > 1 && !shouldReduceMotion && (
          <div className="h-1 w-full bg-muted/40 overflow-hidden">
            {!isPaused && (
              <motion.div
                key={`${current.id}-${safeIndex}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: autoPlayMs / 1000, ease: "linear" }}
                style={{ transformOrigin: "left center" }}
                className={`h-full w-full ${meta.accentStripeClass}`}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
