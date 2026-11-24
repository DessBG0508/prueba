import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { Calendar, CheckCircle2, MapPin, Megaphone, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
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
import { Input } from "@/components/ui/input";
import { AnuncioBannerCard } from "@/components/anuncios/anuncio-banner-card";
import { ANUNCIO_TIPO_META, formatAnuncioFecha } from "@/components/anuncios/anuncio-meta";
import {
  getActiveAnuncios,
  getStudentAnuncioInscripciones,
  getStudentLatestRiskLevel,
  inscribirEstudianteEnAnuncio,
  subscribeToAnunciosChanges,
  type AnuncioPublicoObjetivo,
  type AnuncioRecord,
  type AnuncioTipo,
} from "@/features/anuncios/anuncios-service";
import { useAuth } from "@/lib/auth-context";

type FilterTipo = "all" | "inscritos" | AnuncioTipo;

export function AnunciosPage() {
  const { user } = useAuth();
  const search = useSearch({ strict: false }) as { anuncio?: string };

  const [anuncios, setAnuncios] = useState<AnuncioRecord[]>([]);
  const [studentRiskLevel, setStudentRiskLevel] =
    useState<Exclude<AnuncioPublicoObjetivo, "todos">>("sin_tamizaje");
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const [filterTipo, setFilterTipo] = useState<FilterTipo>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<AnuncioRecord | null>(null);
  const [handledDeepLinkId, setHandledDeepLinkId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [activeAnuncios, riskLvl, myEnrolled] = await Promise.all([
        getActiveAnuncios(),
        getStudentLatestRiskLevel(user?.id, user?.email),
        user?.id ? getStudentAnuncioInscripciones(user.id) : Promise.resolve([]),
      ]);
      setAnuncios(activeAnuncios);
      setStudentRiskLevel(riskLvl);
      setEnrolledIds(myEnrolled);
    } catch {
      toast.error("No se pudieron cargar los anuncios y talleres.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToAnunciosChanges(() => {
      getActiveAnuncios()
        .then(setAnuncios)
        .catch(() => {});
    });
    return unsubscribe;
  }, [loadData]);

  const visibleAnuncios = useMemo(() => {
    return anuncios.filter(
      (a) => a.publico_objetivo === "todos" || a.publico_objetivo === studentRiskLevel,
    );
  }, [anuncios, studentRiskLevel]);

  // Si llega redirigido desde el Hero Carousel con ?anuncio=ID, abrir directamente el flyer/detalle para inscribirse
  useEffect(() => {
    const targetId = search?.anuncio;
    if (!targetId || handledDeepLinkId === targetId || visibleAnuncios.length === 0) return;
    const match = visibleAnuncios.find((a) => a.id === targetId);
    if (match) {
      setSelectedDetail(match);
      setHandledDeepLinkId(targetId);
    }
  }, [search?.anuncio, visibleAnuncios, handledDeepLinkId]);

  const filteredAnuncios = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleAnuncios.filter((a) => {
      const matchesFilter =
        filterTipo === "all" ||
        (filterTipo === "inscritos" ? enrolledIds.includes(a.id) : a.tipo === filterTipo);

      const matchesQuery =
        q === "" ||
        a.titulo.toLowerCase().includes(q) ||
        a.descripcion.toLowerCase().includes(q) ||
        (a.lugar || "").toLowerCase().includes(q);

      return matchesFilter && matchesQuery;
    });
  }, [visibleAnuncios, filterTipo, searchQuery, enrolledIds]);

  const handleInscribirme = async (anuncio: AnuncioRecord) => {
    if (!user?.id) {
      toast.error("Inicia sesión para inscribirte.");
      return;
    }

    setEnrollingId(anuncio.id);
    try {
      const res = await inscribirEstudianteEnAnuncio({
        anuncioId: anuncio.id,
        studentId: user.id,
      });

      if (!res.ok) {
        toast.error(res.error || "No se pudo completar la inscripción.");
        await loadData();
        return;
      }

      setEnrolledIds((prev) => (prev.includes(anuncio.id) ? prev : [...prev, anuncio.id]));
      if (res.inscritos !== undefined) {
        setAnuncios((prev) =>
          prev.map((a) => (a.id === anuncio.id ? { ...a, inscritos: res.inscritos! } : a)),
        );
        setSelectedDetail((prev) =>
          prev && prev.id === anuncio.id ? { ...prev, inscritos: res.inscritos! } : prev,
        );
      }

      toast.success(
        res.alreadyEnrolled
          ? `Ya estás inscrito en "${anuncio.titulo}".`
          : `Inscripción confirmada en "${anuncio.titulo}".`,
      );
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <PageShell>
      <main className="space-y-6 pb-8">
        {/* Cabecera */}
        <section className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-lg bg-[#1B198F]/10 px-3 py-1 text-xs font-bold text-[#1B198F] dark:text-indigo-300">
            <Megaphone className="size-3.5" />
            Cartelera Institucional TESH
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary">
            Anuncios y Talleres
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Explora los próximos talleres de bienestar, nutrición, manejo del estrés, higiene del
            sueño y eventos abiertos del Departamento de Psicología. Selecciona cualquier flyer o
            tarjeta para ver detalles e inscribirte.
          </p>
        </section>

        {/* Filtros */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: `Todos (${visibleAnuncios.length})` },
                { id: "taller", label: "Talleres" },
                { id: "evento", label: "Eventos" },
                { id: "informativo", label: "Informativos" },
                { id: "recordatorio", label: "Recordatorios" },
                { id: "inscritos", label: `Mis inscripciones (${enrolledIds.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTipo(tab.id)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  filterTipo === tab.id
                    ? "border-[#1B198F] bg-[#1B198F] text-white"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar taller o evento..."
              className="pl-9 rounded-xl text-xs h-9"
            />
          </div>
        </section>

        {/* Galería / Listado de anuncios y flyers */}
        {isLoading && visibleAnuncios.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-52 rounded-2xl border border-border bg-card animate-pulse"
              />
            ))}
          </div>
        ) : filteredAnuncios.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-2">
            <Megaphone className="size-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm font-bold text-foreground">
              No hay anuncios disponibles con este filtro
            </p>
            <p className="text-xs text-muted-foreground">
              Prueba seleccionando otra categoría o limpia tu búsqueda.
            </p>
          </div>
        ) : (
          <section
            aria-label="Listado de anuncios y talleres"
            className="grid gap-5 md:grid-cols-2"
          >
            {filteredAnuncios.map((anuncio) => (
              <AnuncioBannerCard
                key={anuncio.id}
                anuncio={anuncio}
                isEnrolled={enrolledIds.includes(anuncio.id)}
                isSubmitting={enrollingId === anuncio.id}
                onInscribirme={handleInscribirme}
                onOpenDetail={(item) => setSelectedDetail(item)}
              />
            ))}
          </section>
        )}
      </main>

      {/* Modal de Flyer completo y registro directo */}
      <Dialog
        open={Boolean(selectedDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedDetail(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          {selectedDetail &&
            (() => {
              const meta = ANUNCIO_TIPO_META[selectedDetail.tipo] || ANUNCIO_TIPO_META.informativo;
              const fecha = formatAnuncioFecha(selectedDetail.fecha_evento);
              const hasCupo =
                selectedDetail.cupo !== null &&
                selectedDetail.cupo !== undefined &&
                selectedDetail.cupo > 0;
              const isEnrolled = enrolledIds.includes(selectedDetail.id);
              const isCupoLleno = hasCupo && selectedDetail.inscritos >= (selectedDetail.cupo ?? 0);
              const canEnroll =
                selectedDetail.tipo === "taller" || selectedDetail.tipo === "evento" || hasCupo;

              return (
                <>
                  <DialogHeader>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline" className={`${meta.badgeClass} text-xs font-bold`}>
                        {meta.label}
                      </Badge>
                      {hasCupo && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                          <Users className="size-3.5 text-[#1B198F] dark:text-indigo-300" />
                          {selectedDetail.inscritos}/{selectedDetail.cupo} inscritos
                        </span>
                      )}
                    </div>
                    <DialogTitle className="text-lg font-bold text-foreground">
                      {selectedDetail.titulo}
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {selectedDetail.descripcion}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-1">
                    {selectedDetail.imagen_url && (
                      <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                        <img
                          src={selectedDetail.imagen_url}
                          alt={`Flyer completo: ${selectedDetail.titulo}`}
                          className="w-full max-h-[420px] object-contain mx-auto"
                        />
                      </div>
                    )}

                    {(fecha || selectedDetail.lugar) && (
                      <div className="rounded-xl border border-border bg-muted/20 p-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-foreground">
                        {fecha && (
                          <span className="inline-flex items-center gap-1.5 capitalize">
                            <Calendar className="size-4 text-[#1B198F] dark:text-indigo-300" />
                            {fecha}
                          </span>
                        )}
                        {selectedDetail.lugar && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-4 text-[#1B198F] dark:text-indigo-300" />
                            {selectedDetail.lugar}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedDetail(null)}
                      className="rounded-xl text-xs font-semibold"
                    >
                      Cerrar
                    </Button>

                    {canEnroll &&
                      (isEnrolled ? (
                        <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="size-4" />
                          Inscrito
                        </div>
                      ) : isCupoLleno ? (
                        <Button
                          type="button"
                          disabled
                          variant="outline"
                          className="rounded-xl border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold"
                        >
                          Cupo lleno
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled={enrollingId === selectedDetail.id}
                          onClick={() => handleInscribirme(selectedDetail)}
                          className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-bold px-5"
                        >
                          {enrollingId === selectedDetail.id ? "Inscribiendo..." : "Inscribirme"}
                        </Button>
                      ))}
                  </DialogFooter>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
