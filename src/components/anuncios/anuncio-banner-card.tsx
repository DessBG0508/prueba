import { Calendar, CheckCircle2, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ANUNCIO_TIPO_META, formatAnuncioFecha } from "@/components/anuncios/anuncio-meta";
import type { AnuncioRecord } from "@/features/anuncios/anuncios-service";

interface AnuncioBannerCardProps {
  anuncio: AnuncioRecord;
  isEnrolled?: boolean;
  isSubmitting?: boolean;
  isPreview?: boolean;
  onInscribirme?: (anuncio: AnuncioRecord) => void;
  onOpenDetail?: (anuncio: AnuncioRecord) => void;
}

export function AnuncioBannerCard({
  anuncio,
  isEnrolled = false,
  isSubmitting = false,
  isPreview = false,
  onInscribirme,
  onOpenDetail,
}: AnuncioBannerCardProps) {
  const meta = ANUNCIO_TIPO_META[anuncio.tipo] || ANUNCIO_TIPO_META.informativo;
  const Icon = meta.Icon;
  const fechaFormateada = formatAnuncioFecha(anuncio.fecha_evento);

  const hasCupo = anuncio.cupo !== null && anuncio.cupo !== undefined && anuncio.cupo > 0;
  const isCupoLleno = hasCupo && anuncio.inscritos >= (anuncio.cupo ?? 0);
  const canEnroll = anuncio.tipo === "taller" || anuncio.tipo === "evento" || hasCupo;

  return (
    <article
      aria-label={`${meta.label}: ${anuncio.titulo}`}
      className={`overflow-hidden rounded-2xl ${meta.borderClass} bg-card shadow-soft transition-colors flex flex-col justify-between`}
    >
      {/* Flyer visual si fue cargado por el psicólogo */}
      {anuncio.imagen_url ? (
        <button
          type="button"
          onClick={() => onOpenDetail?.(anuncio)}
          disabled={!onOpenDetail}
          className={`relative block w-full overflow-hidden bg-muted/40 aspect-[16/9] ${
            onOpenDetail ? "cursor-pointer group" : "cursor-default"
          }`}
        >
          <img
            src={anuncio.imagen_url}
            alt={`Flyer: ${anuncio.titulo}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={`${meta.badgeClass} bg-card/95 backdrop-blur-xs text-[11px] font-bold shadow-xs`}
            >
              {meta.label}
            </Badge>
          </div>
          {hasCupo && (
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg border border-border/70 bg-card/95 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-foreground shadow-xs">
              <Users className="size-3 text-[#1B198F] dark:text-indigo-300" />
              {anuncio.inscritos}/{anuncio.cupo}
            </span>
          )}
        </button>
      ) : (
        <div className={`h-1.5 w-full ${meta.accentStripeClass}`} />
      )}

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {!anuncio.imagen_url && (
            <div
              className={`grid size-11 shrink-0 place-items-center rounded-xl ${meta.iconWrapClass}`}
            >
              <Icon className="size-5" />
            </div>
          )}

          <div className="space-y-1.5 min-w-0 flex-1">
            {!anuncio.imagen_url && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`${meta.badgeClass} text-[11px] font-bold`}>
                  {meta.label}
                </Badge>
                {hasCupo && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                    <Users className="size-3 text-[#1B198F] dark:text-indigo-300" />
                    {anuncio.inscritos}/{anuncio.cupo} inscritos
                  </span>
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
            )}

            <h3 className="font-display text-base sm:text-lg font-bold text-foreground leading-snug">
              {anuncio.titulo || "Título del anuncio"}
            </h3>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {anuncio.descripcion || "Descripción del anuncio o taller institucional."}
            </p>

            {(fechaFormateada || anuncio.lugar) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs font-medium text-foreground/85">
                {fechaFormateada && (
                  <span className="inline-flex items-center gap-1.5 capitalize">
                    <Calendar className="size-3.5 text-[#1B198F] dark:text-indigo-300 shrink-0" />
                    {fechaFormateada}
                  </span>
                )}
                {anuncio.lugar && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-[#1B198F] dark:text-indigo-300 shrink-0" />
                    {anuncio.lugar}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {(canEnroll || onOpenDetail) && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
            {onOpenDetail ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenDetail(anuncio)}
                className="rounded-xl text-xs font-semibold h-9"
              >
                Ver detalles
              </Button>
            ) : (
              <span />
            )}

            {canEnroll && (
              <div>
                {isEnrolled ? (
                  <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="size-4" />
                    Inscrito
                  </div>
                ) : isCupoLleno ? (
                  <Button
                    type="button"
                    disabled
                    variant="outline"
                    className="rounded-xl border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300 text-xs font-bold h-9 px-4 opacity-90"
                  >
                    Cupo lleno
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isSubmitting || isPreview}
                    onClick={() => onInscribirme?.(anuncio)}
                    className={`rounded-xl ${meta.buttonClass} text-xs font-semibold h-9 px-5`}
                  >
                    {isSubmitting ? "Inscribiendo..." : "Inscribirme"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
