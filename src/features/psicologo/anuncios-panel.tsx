import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Clock,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  MapPin,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnuncioBannerCard, AnuncioDetailModal } from "@/components/anuncios/anuncio-banner-card";
import {
  formatAnuncioFecha,
  formatAnuncioHorario,
  getCleanAnuncioTitulo,
} from "@/components/anuncios/anuncio-meta";
import {
  deleteAnuncio,
  getAllAnuncios,
  saveAnuncio,
  subscribeToAnunciosChanges,
  toggleAnuncioActivo,
  uploadAnuncioFlyerImage,
  type AnuncioPublicoObjetivo,
  type AnuncioRecord,
  type AnuncioTipo,
} from "@/features/anuncios/anuncios-service";

const TIPO_LABEL: Record<AnuncioTipo, string> = {
  taller: "Taller",
  recordatorio: "Recordatorio",
  informativo: "Informativo",
  evento: "Evento",
};

const PUBLICO_LABEL: Record<AnuncioPublicoObjetivo, string> = {
  todos: "Todos los estudiantes",
  rojo: "Estudiantes en nivel rojo",
  amarillo: "Estudiantes en nivel amarillo",
  verde: "Estudiantes en nivel verde",
  sin_tamizaje: "Estudiantes sin tamizaje",
};

export function AnunciosPanel() {
  const [anuncios, setAnuncios] = useState<AnuncioRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"all" | AnuncioTipo>("all");

  // Modal de creación / edición
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnuncio, setEditingAnuncio] = useState<AnuncioRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Campos del formulario
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [descripcionLarga, setDescripcionLarga] = useState("");
  const [tipo, setTipo] = useState<AnuncioTipo>("taller");
  const [fechaEvento, setFechaEvento] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [lugar, setLugar] = useState("");
  const [ponente, setPonente] = useState("");
  const [requisitos, setRequisitos] = useState("");
  const [cupo, setCupo] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);
  const [isDraggingFlyer, setIsDraggingFlyer] = useState(false);
  const flyerInputRef = useRef<HTMLInputElement>(null);
  const [publicoObjetivo, setPublicoObjetivo] = useState<AnuncioPublicoObjetivo>("todos");
  const [activo, setActivo] = useState(true);

  // Modales de vista previa completa y confirmación de borrado
  const [previewAnuncio, setPreviewAnuncio] = useState<AnuncioRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnuncioRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAnuncios = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getAllAnuncios();
      setAnuncios(list);
    } catch {
      toast.error("No se pudieron cargar los anuncios.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnuncios();
    const unsubscribe = subscribeToAnunciosChanges(() => {
      getAllAnuncios()
        .then(setAnuncios)
        .catch(() => {});
    });
    return unsubscribe;
  }, [loadAnuncios]);

  const openCreateModal = () => {
    setEditingAnuncio(null);
    setTitulo("");
    setDescripcion("");
    setDescripcionLarga("");
    setTipo("taller");
    setFechaEvento("");
    setHoraInicio("");
    setHoraFin("");
    setLugar("");
    setPonente("");
    setRequisitos("");
    setCupo("30");
    setImagenUrl("");
    setPublicoObjetivo("todos");
    setActivo(true);
    setIsFormOpen(true);
  };

  const openEditModal = (item: AnuncioRecord) => {
    setEditingAnuncio(item);
    setTitulo(item.titulo);
    setDescripcion(item.descripcion);
    setDescripcionLarga(item.descripcion_larga || "");
    setTipo(item.tipo);
    setFechaEvento(item.fecha_evento || "");
    setHoraInicio(item.hora_inicio || "");
    setHoraFin(item.hora_fin || "");
    setLugar(item.lugar || "");
    setPonente(item.ponente || "");
    setRequisitos(item.requisitos || "");
    setCupo(item.cupo !== null && item.cupo !== undefined ? String(item.cupo) : "");
    setImagenUrl(item.imagen_url || "");
    setPublicoObjetivo(item.publico_objetivo);
    setActivo(item.activo);
    setIsFormOpen(true);
  };

  const handleFlyerFile = async (file: File) => {
    setIsUploadingFlyer(true);
    try {
      const res = await uploadAnuncioFlyerImage(file);
      setImagenUrl(res.url);
      toast.success(
        res.isLocal
          ? "Flyer cargado y optimizado para cartelera."
          : "Flyer subido a Supabase Storage.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir el flyer.");
    } finally {
      setIsUploadingFlyer(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descripcion.trim()) {
      toast.error("Completa el título y la descripción del anuncio.");
      return;
    }

    setIsSaving(true);
    try {
      const parsedCupo = cupo.trim() === "" ? null : Math.max(0, Number(cupo));
      const res = await saveAnuncio(
        {
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          descripcion_larga: descripcionLarga.trim() || null,
          tipo,
          fecha_evento: fechaEvento.trim() || null,
          hora_inicio: horaInicio.trim() || null,
          hora_fin: horaFin.trim() || null,
          lugar: lugar.trim() || null,
          ponente: ponente.trim() || null,
          requisitos: requisitos.trim() || null,
          cupo: parsedCupo !== null && !Number.isNaN(parsedCupo) ? parsedCupo : null,
          imagen_url: imagenUrl.trim() || null,
          publico_objetivo: publicoObjetivo,
          activo,
        },
        editingAnuncio?.id,
      );

      if (!res.ok) {
        toast.error(res.error || "No se pudo guardar el anuncio.");
        return;
      }

      toast.success(editingAnuncio ? "Anuncio actualizado." : "Anuncio publicado en el sistema.");
      setIsFormOpen(false);
      await loadAnuncios();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisible = async (item: AnuncioRecord) => {
    const nextActivo = !item.activo;
    const res = await toggleAnuncioActivo(item.id, nextActivo);
    if (!res.ok) {
      toast.error(res.error || "No se pudo actualizar la visibilidad.");
      return;
    }
    toast.success(
      nextActivo
        ? `"${item.titulo}" ahora es visible para estudiantes.`
        : `"${item.titulo}" se ocultó del inicio estudiantil.`,
    );
    await loadAnuncios();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteAnuncio(deleteTarget.id);
      if (!res.ok) {
        toast.error(res.error || "No se pudo eliminar el anuncio.");
        return;
      }
      toast.success("Anuncio eliminado.");
      setDeleteTarget(null);
      await loadAnuncios();
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAnuncios = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return anuncios.filter((a) => {
      const matchesTipo = tipoFilter === "all" || a.tipo === tipoFilter;
      const matchesQuery =
        q === "" ||
        a.titulo.toLowerCase().includes(q) ||
        a.descripcion.toLowerCase().includes(q) ||
        (a.lugar || "").toLowerCase().includes(q);
      return matchesTipo && matchesQuery;
    });
  }, [anuncios, searchQuery, tipoFilter]);

  const stats = useMemo(() => {
    return {
      total: anuncios.length,
      activos: anuncios.filter((a) => a.activo).length,
      talleres: anuncios.filter((a) => a.tipo === "taller").length,
      totalInscritos: anuncios.reduce((sum, a) => sum + (a.inscritos || 0), 0),
    };
  }, [anuncios]);

  // Objeto de vista previa en tiempo real mientras se llena el formulario
  const livePreviewAnuncio: AnuncioRecord = {
    id: editingAnuncio?.id || "preview",
    titulo: titulo || "Manejo del Estrés Académico",
    descripcion:
      descripcion ||
      "Comparte los beneficios, horario e indicaciones clave para invitar a la comunidad estudiantil.",
    descripcion_larga: descripcionLarga.trim() || null,
    tipo,
    fecha_evento: fechaEvento || null,
    hora_inicio: horaInicio || null,
    hora_fin: horaFin || null,
    lugar: lugar || null,
    ponente: ponente || null,
    requisitos: requisitos || null,
    cupo: cupo.trim() === "" ? null : Math.max(0, Number(cupo) || 0),
    inscritos: editingAnuncio?.inscritos ?? 0,
    imagen_url: imagenUrl.trim() || null,
    publico_objetivo: publicoObjetivo,
    activo,
    creado_por: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#1B198F] dark:text-indigo-300">
            Difusión y Prevención Estudiantil
          </p>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
            Anuncios y Talleres Públicos
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Publica talleres (nutrición, manejo de estrés, higiene del sueño), recordatorios y
            eventos visibles en el inicio de los estudiantes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadAnuncios}
            className="rounded-xl text-xs font-semibold h-9"
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            type="button"
            onClick={openCreateModal}
            className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-bold h-9 px-4"
          >
            <Plus className="mr-1.5 size-4" />
            Nuevo anuncio
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="text-[11px] font-bold uppercase text-muted-foreground">
            Total publicados
          </span>
          <p className="font-numeric text-2xl font-bold text-[#1B198F] dark:text-foreground mt-1">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-4">
          <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
            Visibles en inicio
          </span>
          <p className="font-numeric text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {stats.activos}
          </p>
        </div>
        <div className="rounded-2xl border border-[#A9DB1B]/70 bg-[#A9DB1B]/10 p-4">
          <span className="text-[11px] font-bold uppercase text-[#3F5304] dark:text-[#C5F04B]">
            Talleres activos
          </span>
          <p className="font-numeric text-2xl font-bold text-[#3F5304] dark:text-[#C5F04B] mt-1">
            {stats.talleres}
          </p>
        </div>
        <div className="rounded-2xl border border-[#1B198F]/30 bg-[#1B198F]/5 p-4">
          <span className="text-[11px] font-bold uppercase text-[#1B198F] dark:text-indigo-300">
            Total inscritos
          </span>
          <p className="font-numeric text-2xl font-bold text-[#1B198F] dark:text-indigo-300 mt-1">
            {stats.totalInscritos}
          </p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "all", label: "Todos" },
              { id: "taller", label: "Talleres" },
              { id: "recordatorio", label: "Recordatorios" },
              { id: "informativo", label: "Informativos" },
              { id: "evento", label: "Eventos" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTipoFilter(tab.id)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                tipoFilter === tab.id
                  ? "border-[#1B198F] bg-[#1B198F] text-white"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título o lugar..."
            className="pl-9 rounded-xl text-xs h-9"
          />
        </div>
      </div>

      {/* Lista de anuncios */}
      {filteredAnuncios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center space-y-3">
          <Megaphone className="size-8 mx-auto text-muted-foreground/60" />
          <div>
            <p className="text-sm font-bold text-foreground">No hay anuncios que mostrar</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crea un taller, recordatorio o evento para mostrarlo en el inicio de los estudiantes.
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreateModal}
            className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-bold"
          >
            <Plus className="mr-1.5 size-3.5" />
            Crear primer anuncio
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredAnuncios.map((item) => {
            const hasCupo = item.cupo !== null && item.cupo !== undefined && item.cupo > 0;
            const lleno = hasCupo && item.inscritos >= (item.cupo ?? 0);
            const borderColor =
              item.tipo === "taller"
                ? "border-l-4 border-l-[#A9DB1B]"
                : item.tipo === "evento"
                  ? "border-l-4 border-l-[#FF9CED]"
                  : "border-l-4 border-l-[#1B198F]";

            return (
              <article
                key={item.id}
                className={`rounded-2xl border border-border ${borderColor} bg-card p-5 flex flex-col justify-between gap-4 ${
                  !item.activo ? "opacity-70" : ""
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[11px] font-bold">
                        {TIPO_LABEL[item.tipo]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          item.activo
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-bold"
                            : "border-slate-200 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 text-[11px] font-semibold"
                        }
                      >
                        {item.activo ? "Activo" : "Oculto"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-[#1B198F]/25 bg-[#1B198F]/5 text-[#1B198F] dark:text-indigo-300 text-[11px] font-semibold"
                      >
                        {PUBLICO_LABEL[item.publico_objetivo]}
                      </Badge>
                    </div>

                    {hasCupo && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                          lleno
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <Users className="size-3.5" />
                        {item.inscritos}/{item.cupo} {lleno ? "(Cupo lleno)" : ""}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-foreground leading-snug">
                    {getCleanAnuncioTitulo(item.titulo)}
                  </h3>
                  {item.imagen_url && (
                    <div className="overflow-hidden rounded-xl border border-border bg-muted/30 aspect-[16/9]">
                      <img
                        src={item.imagen_url}
                        alt={`Flyer de ${item.titulo}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {item.descripcion}
                  </p>

                  {(item.fecha_evento || item.hora_inicio || item.lugar || item.ponente) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
                      {item.fecha_evento && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3.5 text-[#1B198F] dark:text-indigo-300" />
                          {formatAnuncioFecha(item.fecha_evento)}
                        </span>
                      )}
                      {formatAnuncioHorario(item.hora_inicio, item.hora_fin) && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5 text-[#1B198F] dark:text-indigo-300" />
                          {formatAnuncioHorario(item.hora_inicio, item.hora_fin)}
                        </span>
                      )}
                      {item.lugar && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5 text-[#1B198F] dark:text-indigo-300" />
                          {item.lugar}
                        </span>
                      )}
                      {item.ponente && (
                        <span className="inline-flex items-center gap-1">
                          <User className="size-3.5 text-[#1B198F] dark:text-indigo-300" />
                          {item.ponente}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewAnuncio(item)}
                    className="rounded-lg text-xs font-semibold h-8"
                  >
                    <Eye className="mr-1.5 size-3.5" />
                    Vista previa
                  </Button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleVisible(item)}
                      className="rounded-lg text-xs font-semibold h-8"
                    >
                      {item.activo ? (
                        <>
                          <EyeOff className="mr-1 size-3.5" />
                          Ocultar
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1 size-3.5" />
                          Mostrar
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(item)}
                      className="rounded-lg text-xs font-semibold h-8"
                    >
                      <Pencil className="mr-1 size-3.5" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteTarget(item)}
                      className="rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30 text-xs font-semibold h-8"
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Anuncio + Vista previa en vivo */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open && !isSaving) setIsFormOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1B198F] dark:text-foreground">
              {editingAnuncio ? "Editar anuncio o taller" : "Crear nuevo anuncio o taller"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Los anuncios son avisos públicos no confidenciales que aparecen arriba del inicio de
              los estudiantes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 py-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="anuncio-titulo" className="text-xs font-bold">
                  Título *
                </Label>
                <Input
                  id="anuncio-titulo"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Taller de Higiene del Sueño y Manejo de Estrés"
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="anuncio-descripcion" className="text-xs font-bold">
                  Descripción corta *
                </Label>
                <Textarea
                  id="anuncio-descripcion"
                  required
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Resumen breve que aparece en la tarjeta y en el carrusel del inicio..."
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="anuncio-descripcion-larga" className="text-xs font-bold">
                  Descripción extendida / Temario y objetivos (opcional)
                </Label>
                <Textarea
                  id="anuncio-descripcion-larga"
                  rows={4}
                  value={descripcionLarga}
                  onChange={(e) => setDescripcionLarga(e.target.value)}
                  placeholder="Temario detallado, objetivos del taller o qué aprenderán los estudiantes..."
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="anuncio-tipo" className="text-xs font-bold">
                  Tipo de anuncio
                </Label>
                <select
                  id="anuncio-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as AnuncioTipo)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
                >
                  <option value="taller">Taller (borde #A9DB1B + inscripción)</option>
                  <option value="recordatorio">Recordatorio (borde #1B198F)</option>
                  <option value="informativo">Informativo (borde #1B198F)</option>
                  <option value="evento">Evento (borde #FF9CED)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="anuncio-publico" className="text-xs font-bold">
                  Público objetivo
                </Label>
                <select
                  id="anuncio-publico"
                  value={publicoObjetivo}
                  onChange={(e) => setPublicoObjetivo(e.target.value as AnuncioPublicoObjetivo)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
                >
                  <option value="todos">Todos los estudiantes</option>
                  <option value="rojo">Nivel rojo (invitación dirigida)</option>
                  <option value="amarillo">Nivel amarillo</option>
                  <option value="verde">Nivel verde</option>
                  <option value="sin_tamizaje">Sin tamizaje registrado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="anuncio-fecha" className="text-xs font-bold">
                  Fecha del evento
                </Label>
                <Input
                  id="anuncio-fecha"
                  type="date"
                  value={fechaEvento}
                  onChange={(e) => setFechaEvento(e.target.value)}
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="anuncio-cupo" className="text-xs font-bold">
                  Cupo máximo (opcional)
                </Label>
                <Input
                  id="anuncio-cupo"
                  type="number"
                  min={0}
                  value={cupo}
                  onChange={(e) => setCupo(e.target.value)}
                  placeholder="Ej. 30 (vacío = sin límite)"
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="anuncio-hora-inicio" className="text-xs font-bold">
                  Hora de inicio (opcional)
                </Label>
                <Input
                  id="anuncio-hora-inicio"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="anuncio-hora-fin" className="text-xs font-bold">
                  Hora de fin (opcional)
                </Label>
                <Input
                  id="anuncio-hora-fin"
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="anuncio-lugar" className="text-xs font-bold">
                  Lugar / Sede
                </Label>
                <Input
                  id="anuncio-lugar"
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value)}
                  placeholder="Ej. Auditorio Edificio B · TESH"
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="anuncio-ponente" className="text-xs font-bold">
                  Ponente / Facilitador (opcional)
                </Label>
                <Input
                  id="anuncio-ponente"
                  value={ponente}
                  onChange={(e) => setPonente(e.target.value)}
                  placeholder="Ej. Psic. Marta Elena Ríos · Departamento de Psicología"
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="anuncio-requisitos" className="text-xs font-bold">
                  Requisitos para asistir (opcional)
                </Label>
                <Textarea
                  id="anuncio-requisitos"
                  rows={2}
                  value={requisitos}
                  onChange={(e) => setRequisitos(e.target.value)}
                  placeholder="Ej. Credencial vigente TESH, libreta para notas y ropa cómoda..."
                  className="rounded-xl text-xs sm:text-sm"
                />
              </div>

              {/* Subir Flyer / Cartel visual */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <ImagePlus className="size-3.5 text-[#1B198F] dark:text-indigo-300" />
                  Flyer o cartel visual (opcional, recomendado para el carrusel)
                </Label>

                <input
                  ref={flyerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFlyerFile(f);
                    if (flyerInputRef.current) flyerInputRef.current.value = "";
                  }}
                  className="hidden"
                />

                {imagenUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30">
                    <img
                      src={imagenUrl}
                      alt="Flyer cargado"
                      className="w-full max-h-52 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImagenUrl("")}
                      aria-label="Quitar flyer"
                      className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-lg bg-background/90 px-2.5 py-1 text-xs font-semibold text-rose-600 shadow-xs hover:bg-background cursor-pointer"
                    >
                      <X className="size-3.5" />
                      Quitar flyer
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFlyer(true);
                    }}
                    onDragLeave={() => setIsDraggingFlyer(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFlyer(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFlyerFile(f);
                    }}
                    onClick={() => flyerInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        flyerInputRef.current?.click();
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-5 text-center transition-colors cursor-pointer ${
                      isDraggingFlyer
                        ? "border-[#1B198F] bg-[#1B198F]/5"
                        : "border-border hover:border-[#1B198F]/60 hover:bg-muted/30"
                    }`}
                  >
                    {isUploadingFlyer ? (
                      <>
                        <Loader2 className="size-6 animate-spin text-[#1B198F]" />
                        <span className="text-xs font-semibold text-foreground">
                          Optimizando y subiendo flyer...
                        </span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="size-6 text-[#1B198F] dark:text-indigo-300" />
                        <span className="text-xs font-semibold text-foreground">
                          Haz clic o arrastra aquí el flyer del taller (JPG, PNG, WebP)
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Máximo 8 MB • Se mostrará en el carrusel del inicio y en la sección
                          Anuncios
                        </span>
                      </>
                    )}
                  </div>
                )}

                <Input
                  value={imagenUrl}
                  onChange={(e) => setImagenUrl(e.target.value)}
                  placeholder="O pega la URL de una imagen externa (https://...)"
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="rounded border-border accent-[#1B198F]"
              />
              Visible inmediatamente en el Home del estudiante
            </label>

            {/* Vista previa de cómo se verá en el Home del estudiante */}
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Vista previa en el Home del estudiante
              </p>
              <AnuncioBannerCard anuncio={livePreviewAnuncio} isPreview />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setIsFormOpen(false)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-bold"
              >
                {isSaving
                  ? "Guardando..."
                  : editingAnuncio
                    ? "Guardar cambios"
                    : "Publicar anuncio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Vista Previa completa (igual al modal de detalle del estudiante) */}
      <AnuncioDetailModal
        anuncio={previewAnuncio}
        open={Boolean(previewAnuncio)}
        onOpenChange={(open) => {
          if (!open) setPreviewAnuncio(null);
        }}
        isPreview
      />

      {/* Modal Confirmar Eliminación */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              ¿Eliminar este anuncio?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {deleteTarget
                ? `Se eliminará "${deleteTarget.titulo}" y sus registros de inscripción asociados.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="rounded-xl text-xs font-bold"
            >
              {isDeleting ? "Eliminando..." : "Eliminar anuncio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
