import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  MapPin,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ANUNCIO_TIPO_META,
  formatAnuncioFecha,
  formatAnuncioHorario,
  getCleanAnuncioTitulo,
  getCupoProgressInfo,
} from "@/components/anuncios/anuncio-meta";
import type { AnuncioRecord } from "@/features/anuncios/anuncios-service";

interface AnuncioBannerCardProps {
  anuncio: AnuncioRecord;
  isEnrolled?: boolean;
  isSubmitting?: boolean;
  isPreview?: boolean;
  onInscribirme?: (anuncio: AnuncioRecord) => void;
  onCancelarInscripcion?: (anuncio: AnuncioRecord) => void;
  onOpenDetail?: (anuncio: AnuncioRecord) => void;
}

interface AnuncioDetailModalProps {
  anuncio: AnuncioRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEnrolled?: boolean;
  isSubmitting?: boolean;
  isPreview?: boolean;
  onInscribirme?: (anuncio: AnuncioRecord) => void;
  onCancelarInscripcion?: (anuncio: AnuncioRecord) => void;
}

export function AnuncioDetailModal({
  anuncio,
  open,
  onOpenChange,
  isEnrolled = false,
  isSubmitting = false,
  isPreview = false,
  onInscribirme,
  onCancelarInscripcion,
}: AnuncioDetailModalProps) {
  const [showTemario, setShowTemario] = useState(false);

  useEffect(() => {
    setShowTemario(false);
  }, [anuncio?.id, open]);

  if (!anuncio) return null;

  const meta = ANUNCIO_TIPO_META[anuncio.tipo] || ANUNCIO_TIPO_META.informativo;
  const Icon = meta.Icon;
  const cleanTitle = getCleanAnuncioTitulo(anuncio.titulo);
  const fecha = formatAnuncioFecha(anuncio.fecha_evento);
  const horario = formatAnuncioHorario(anuncio.hora_inicio, anuncio.hora_fin);

  const hasCupo = anuncio.cupo !== null && anuncio.cupo !== undefined && anuncio.cupo > 0;
  const cupoInfo = hasCupo ? getCupoProgressInfo(anuncio.inscritos, anuncio.cupo ?? 0) : null;
  const canEnroll = anuncio.tipo === "taller" || anuncio.tipo === "evento" || hasCupo;
  const hasExtendedDesc = Boolean(anuncio.descripcion_larga && anuncio.descripcion_larga.trim());

  const infoRows = [
    fecha
      ? {
          id: "fecha",
          label: "Fecha",
          value: fecha,
          Icon: Calendar,
        }
      : null,
    horario
      ? {
          id: "hora",
          label: "Hora",
          value: horario,
          Icon: Clock,
        }
      : null,
    anuncio.lugar
      ? {
          id: "lugar",
          label: "Lugar",
          value: anuncio.lugar,
          Icon: MapPin,
        }
      : null,
    anuncio.ponente
      ? {
          id: "ponente",
          label: "Ponente",
          value: anuncio.ponente,
          Icon: User,
        }
      : null,
    anuncio.requisitos
      ? {
          id: "requisitos",
          label: "Requisitos",
          value: anuncio.requisitos,
          Icon: ClipboardList,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-border gap-0">
        {/* Flyer / imagen arriba ocupando todo el ancho, 200px de altura */}
        {anuncio.imagen_url ? (
          <div className="relative h-[200px] w-full overflow-hidden bg-muted/40 border-b border-border/60">
            <img
              src={anuncio.imagen_url}
              alt={`Flyer: ${cleanTitle}`}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className={`h-2 w-full ${meta.accentStripeClass}`} />
        )}

        <div className="p-5 sm:p-6 space-y-5">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`${meta.badgeClass} text-xs font-bold`}>
                <Icon className="mr-1 size-3.5" />
                {meta.label}
              </Badge>

              {isEnrolled && (
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold"
                >
                  <CheckCircle2 className="mr-1 size-3.5" />
                  Ya estás inscrito
                </Badge>
              )}
            </div>

            <DialogTitle className="font-display text-xl sm:text-2xl font-bold text-foreground leading-snug">
              {cleanTitle}
            </DialogTitle>

            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {anuncio.descripcion}
            </DialogDescription>
          </DialogHeader>

          {/* Sección expandible: Ver temario completo */}
          {hasExtendedDesc && (
            <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTemario((prev) => !prev)}
                aria-expanded={showTemario}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-bold text-[#1B198F] dark:text-indigo-300 hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <span>Ver temario completo</span>
                <ChevronDown
                  className={`size-4 transition-transform duration-200 ${
                    showTemario ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showTemario && (
                <div className="border-t border-border/60 bg-card/70 px-4 py-3.5 text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                  {anuncio.descripcion_larga}
                </div>
              )}
            </div>
          )}

          {/* Tabla de información con íconos */}
          {infoRows.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border/60">
              {infoRows.map((row) => {
                const RowIcon = row.Icon;
                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr] items-start gap-3 px-4 py-3 text-xs sm:text-sm"
                  >
                    <span className="inline-flex items-center gap-2 font-semibold text-muted-foreground">
                      <RowIcon className="size-4 text-[#1B198F] dark:text-indigo-300 shrink-0" />
                      {row.label}
                    </span>
                    <span className="font-medium text-foreground leading-relaxed">{row.value}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Barra de progreso visual de cupo */}
          {cupoInfo && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                  <Users className="size-4 text-[#1B198F] dark:text-indigo-300" />
                  Cupo: {anuncio.inscritos}/{anuncio.cupo} ({cupoInfo.pct}%)
                </span>
                <span className={`font-bold ${cupoInfo.textClass}`}>{cupoInfo.remainingText}</span>
              </div>

              <div
                role="progressbar"
                aria-valuenow={cupoInfo.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Ocupación del cupo"
                className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${cupoInfo.barClass}`}
                  style={{ width: `${cupoInfo.pct}%` }}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Cerrar
            </Button>

            {canEnroll && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {isEnrolled ? (
                  onCancelarInscripcion && !isPreview ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => onCancelarInscripcion(anuncio)}
                      className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30 text-xs font-bold px-4"
                    >
                      <XCircle className="mr-1.5 size-4" />
                      {isSubmitting ? "Cancelando..." : "Cancelar inscripción"}
                    </Button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="size-4" />
                      Inscrito
                    </div>
                  )
                ) : cupoInfo?.isFull ? (
                  <Button
                    type="button"
                    disabled
                    variant="outline"
                    className="rounded-xl border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300 text-xs font-bold"
                  >
                    Cupo lleno
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isSubmitting || isPreview}
                    onClick={() => onInscribirme?.(anuncio)}
                    className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-bold px-5"
                  >
                    {isSubmitting ? "Inscribiendo..." : "Inscribirme"}
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AnuncioBannerCard({
  anuncio,
  isEnrolled = false,
  isSubmitting = false,
  isPreview = false,
  onInscribirme,
  onCancelarInscripcion,
  onOpenDetail,
}: AnuncioBannerCardProps) {
  const [internalDetailOpen, setInternalDetailOpen] = useState(false);

  const meta = ANUNCIO_TIPO_META[anuncio.tipo] || ANUNCIO_TIPO_META.informativo;
  const Icon = meta.Icon;
  const cleanTitle = getCleanAnuncioTitulo(anuncio.titulo);
  const fechaFormateada = formatAnuncioFecha(anuncio.fecha_evento);
  const horario = formatAnuncioHorario(anuncio.hora_inicio, anuncio.hora_fin);

  const hasCupo = anuncio.cupo !== null && anuncio.cupo !== undefined && anuncio.cupo > 0;
  const cupoInfo = hasCupo ? getCupoProgressInfo(anuncio.inscritos, anuncio.cupo ?? 0) : null;
  const isCupoLleno = Boolean(cupoInfo?.isFull);
  const canEnroll = anuncio.tipo === "taller" || anuncio.tipo === "evento" || hasCupo;

  const handleOpenDetail = () => {
    if (onOpenDetail) {
      onOpenDetail(anuncio);
    } else {
      setInternalDetailOpen(true);
    }
  };

  return (
    <>
      <article
        aria-label={`${meta.label}: ${cleanTitle}`}
        className={`overflow-hidden rounded-2xl ${meta.borderClass} bg-card shadow-soft transition-colors flex flex-col justify-between`}
      >
        {/* Flyer visual si fue cargado por el psicólogo */}
        {anuncio.imagen_url ? (
          <button
            type="button"
            onClick={handleOpenDetail}
            className="relative block w-full overflow-hidden bg-muted/40 aspect-[16/9] cursor-pointer group"
          >
            <img
              src={anuncio.imagen_url}
              alt={`Flyer: ${cleanTitle}`}
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

            <div className="space-y-2 min-w-0 flex-1">
              {!anuncio.imagen_url && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`${meta.badgeClass} text-[11px] font-bold`}>
                    {meta.label}
                  </Badge>
                  {hasCupo && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                      <Users className="size-3 text-[#1B198F] dark:text-indigo-300" />
                      {anuncio.inscritos}/{anuncio.cupo}
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
                {cleanTitle || "Título del anuncio"}
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {anuncio.descripcion || "Descripción del anuncio o taller institucional."}
              </p>

              {(fechaFormateada || horario || anuncio.lugar || anuncio.ponente) && (
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
                  {anuncio.lugar && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-[#1B198F] dark:text-indigo-300 shrink-0" />
                      {anuncio.lugar}
                    </span>
                  )}
                  {anuncio.ponente && (
                    <span className="inline-flex items-center gap-1.5">
                      <User className="size-3.5 text-[#1B198F] dark:text-indigo-300 shrink-0" />
                      {anuncio.ponente}
                    </span>
                  )}
                </div>
              )}

              {cupoInfo && (
                <div className="pt-1 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-muted-foreground">
                      {anuncio.inscritos}/{anuncio.cupo} ({cupoInfo.pct}%)
                    </span>
                    <span className={`font-bold ${cupoInfo.textClass}`}>
                      {cupoInfo.remainingText}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${cupoInfo.barClass}`}
                      style={{ width: `${cupoInfo.pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenDetail}
              className="rounded-xl text-xs font-semibold h-9"
            >
              Ver detalles
            </Button>

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
        </div>
      </article>

      {!onOpenDetail && (
        <AnuncioDetailModal
          anuncio={anuncio}
          open={internalDetailOpen}
          onOpenChange={setInternalDetailOpen}
          isEnrolled={isEnrolled}
          isSubmitting={isSubmitting}
          isPreview={isPreview}
          onInscribirme={onInscribirme}
          onCancelarInscripcion={onCancelarInscripcion}
        />
      )}
    </>
  );
}
