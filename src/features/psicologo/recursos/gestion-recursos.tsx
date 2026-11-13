import { useState, useEffect, useMemo, useRef } from "react";
import {
  Library,
  Plus,
  Video,
  Play,
  Pencil,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Search,
  BookOpen,
  Filter,
  RefreshCw,
  AlertTriangle,
  UploadCloud,
  Link as LinkIcon,
  FileVideo,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getStoredResources,
  fetchResourcesAsync,
  saveResourceWithStatus,
  deleteResource,
  toggleResourceActive,
  resetResourcesToDefault,
  isExternalEmbedVideo,
  detectVideoOrientation,
} from "@/features/recursos/recursos-service";
import { uploadDirectVideoFile, formatVideoSize } from "@/features/recursos/video-storage";
import { VideoPlayerView, type ResolvedOrientation } from "@/features/recursos/video-player-view";
import type {
  PsychoResource,
  ResourceCategory,
  ResourceFormat,
  VideoOrientation,
} from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

const CATEGORIES: ResourceCategory[] = ["Ansiedad", "Estrés", "Sueño", "Ánimo", "Respiración"];

export function GestionRecursos() {
  const { user } = useAuth();
  const [resources, setResources] = useState<PsychoResource[]>(() => getStoredResources());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<PsychoResource | null>(null);
  const [previewResource, setPreviewResource] = useState<PsychoResource | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formShortDesc, setFormShortDesc] = useState("");
  const [formCategory, setFormCategory] = useState<ResourceCategory>("Ansiedad");
  const [formFormat, setFormFormat] = useState<ResourceFormat>("video");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formVideoTitle, setFormVideoTitle] = useState("");
  const [formVideoOrientation, setFormVideoOrientation] = useState<VideoOrientation>("auto");
  const [formReadTime, setFormReadTime] = useState("5 min de práctica");
  const [formContent, setFormContent] = useState("");
  const [formKeyTakeaway, setFormKeyTakeaway] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formIconName, setFormIconName] = useState<PsychoResource["iconName"]>("bookOpen");
  const [formTone, setFormTone] = useState<PsychoResource["tone"]>("teal");

  // Orientación resuelta para adaptar el modal de vista previa
  const [previewOrientation, setPreviewOrientation] = useState<ResolvedOrientation>("horizontal");

  // Estados específicos para la carga directa de archivos de video
  const [videoSourceMode, setVideoSourceMode] = useState<"upload" | "url">("upload");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    fileName: string;
    fileSize: string;
    isLocal: boolean;
    storageError?: string;
  } | null>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar recursos en montaje
  useEffect(() => {
    async function load() {
      const data = await fetchResourcesAsync();
      setResources(data);
    }
    load();
  }, []);

  const openCreateDialog = () => {
    setEditingResource(null);
    setFormTitle("");
    setFormShortDesc("");
    setFormCategory("Ansiedad");
    setFormFormat("video");
    setFormVideoUrl("");
    setFormVideoTitle("");
    setFormVideoOrientation("auto");
    setFormReadTime("5 min de práctica");
    setFormContent(
      "Describe los pasos o fundamentos de esta técnica psicológica.\n\nIndica cómo debe sentarse o posicionarse el alumno y cómo respirar.",
    );
    setFormKeyTakeaway("Pausa 3 minutos: sigue el video demostrativo para recuperar tu calma.");
    setFormAuthor(user?.name ? `${user.name} — Psicología TESH` : "Área de Psicología TESH");
    setFormIconName("bookOpen");
    setFormTone("teal");

    setVideoSourceMode("upload");
    setUploadedFileInfo(null);
    setUploadProgress(0);
    setIsUploadingVideo(false);

    setIsFormOpen(true);
  };

  const openEditDialog = (res: PsychoResource) => {
    setEditingResource(res);
    setFormTitle(res.title);
    setFormShortDesc(res.shortDescription);
    setFormCategory(res.category);
    setFormFormat(res.format || (res.videoUrl ? "video" : "lectura"));
    setFormVideoUrl(res.videoUrl || "");
    setFormVideoTitle(res.videoTitle || "");
    setFormVideoOrientation(res.videoOrientation || "auto");
    setFormReadTime(res.readTime);
    setFormContent(res.content.join("\n\n"));
    setFormKeyTakeaway(res.keyTakeaway || "");
    setFormAuthor(res.author || "Área de Psicología TESH");
    setFormIconName(res.iconName);
    setFormTone(res.tone);

    if (res.videoUrl) {
      if (isExternalEmbedVideo(res.videoUrl)) {
        setVideoSourceMode("url");
        setUploadedFileInfo(null);
      } else {
        setVideoSourceMode("upload");
        const isLocal = res.videoUrl.startsWith("indexeddb://");
        setUploadedFileInfo({
          fileName: res.videoTitle || "Archivo de video cargado",
          fileSize: isLocal ? "Guardado localmente (IndexedDB)" : "En almacenamiento en la nube",
          isLocal,
        });
      }
    } else {
      setVideoSourceMode("upload");
      setUploadedFileInfo(null);
    }

    setUploadProgress(0);
    setIsUploadingVideo(false);
    setIsFormOpen(true);
  };

  // Procesar archivo de video seleccionado o arrastrado
  const handleProcessVideoFile = async (file: File) => {
    setIsUploadingVideo(true);
    setUploadProgress(15);

    try {
      const result = await uploadDirectVideoFile(file, (pct) => setUploadProgress(pct));
      setFormVideoUrl(result.url);
      setFormFormat("video");
      setFormVideoOrientation(result.orientation);
      if (!formVideoTitle.trim()) {
        setFormVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      setUploadedFileInfo({
        fileName: result.fileName,
        fileSize: formatVideoSize(result.size),
        isLocal: result.isLocal,
        storageError: result.storageError,
      });

      if (result.isLocal) {
        toast.warning(
          "Video guardado solo en este navegador (IndexedDB). No se subió a la base de datos remota.",
          {
            description: result.storageError
              ? `Motivo: ${result.storageError}`
              : "Configura el bucket 'recursos-videos' en Supabase para sincronizar entre dispositivos.",
          },
        );
      } else {
        toast.success("Video subido a Supabase Storage con éxito.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al procesar el archivo de video");
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessVideoFile(file);
    }
    // Limpiar input para permitir seleccionar el mismo archivo si es necesario
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDropVideo = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingVideo(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessVideoFile(file);
    }
  };

  const handleRemoveVideo = () => {
    setFormVideoUrl("");
    setFormVideoTitle("");
    setFormVideoOrientation("auto");
    setUploadedFileInfo(null);
    setUploadProgress(0);
    toast.info("Video removido del recurso.");
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("El título del recurso es obligatorio.");
      return;
    }

    const paragraphs = formContent
      .split("\n\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const payload: Partial<PsychoResource> & { title: string } = {
      id: editingResource ? editingResource.id : undefined,
      title: formTitle.trim(),
      shortDescription: formShortDesc.trim(),
      category: formCategory,
      format: formVideoUrl.trim() ? "video" : formFormat,
      videoUrl: formVideoUrl.trim() || undefined,
      videoTitle: formVideoTitle.trim() || undefined,
      videoOrientation: formVideoOrientation,
      readTime: formReadTime.trim() || "4 min",
      content:
        paragraphs.length > 0 ? paragraphs : ["Contenido de apoyo elaborado por Psicología TESH."],
      keyTakeaway: formKeyTakeaway.trim() || undefined,
      author: formAuthor.trim() || "Área de Psicología TESH",
      iconName: formIconName,
      tone: formTone,
      active: editingResource ? editingResource.active : true,
    };

    const { resource: saved, syncedToDb, dbError } = await saveResourceWithStatus(payload);
    setResources((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });

    setIsFormOpen(false);
    if (syncedToDb) {
      toast.success(
        editingResource
          ? "Recurso actualizado y sincronizado en la base de datos"
          : "Nuevo recurso publicado y guardado en la base de datos",
      );
    } else {
      toast.warning(
        editingResource
          ? "Recurso actualizado localmente (sin sincronizar a Supabase)"
          : "Recurso guardado solo localmente en este navegador",
        {
          description: dbError
            ? `Detalle BD: ${dbError}`
            : "Ejecuta supabase/schema_recursos.sql para habilitar la tabla 'recursos'.",
        },
      );
    }
  };

  const handleDelete = async (id: string) => {
    await deleteResource(id);
    setResources((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirmId(null);
    toast.success("Recurso eliminado del catálogo");
  };

  const handleToggle = async (id: string) => {
    const newState = await toggleResourceActive(id);
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, active: newState } : r)));
    toast.info(newState ? "Recurso visible para estudiantes" : "Recurso ocultado para estudiantes");
  };

  const handleResetDefaults = () => {
    const def = resetResourcesToDefault();
    setResources(def);
    toast.success("Se restauró el catálogo a los recursos oficiales predeterminados");
  };

  // Filtrado de recursos
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      const matchesCategory = selectedCategory === "all" || res.category === selectedCategory;
      const matchesFormat =
        selectedFormat === "all" ||
        (selectedFormat === "video" && !!res.videoUrl) ||
        (selectedFormat === "lectura" && !res.videoUrl);

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        res.title.toLowerCase().includes(q) ||
        res.shortDescription.toLowerCase().includes(q) ||
        res.category.toLowerCase().includes(q) ||
        (res.author && res.author.toLowerCase().includes(q));

      return matchesCategory && matchesFormat && matchesQuery;
    });
  }, [resources, selectedCategory, selectedFormat, searchQuery]);

  const stats = useMemo(() => {
    const total = resources.length;
    const conVideo = resources.filter((r) => !!r.videoUrl).length;
    const activos = resources.filter((r) => r.active !== false).length;
    return { total, conVideo, activos };
  }, [resources]);

  return (
    <div className="space-y-6">
      {/* Header del Módulo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6857E4]">
            <Library className="size-4" />
            <span>Módulo Institucional TESH</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
            Gestión de Recursos y Videos Psicoeducativos
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
            Sube videos demostrativos directamente desde tu equipo (.mp4, .webm) o vincúlalos por
            URL. Los estudiantes tendrán acceso inmediato a estos materiales en el apartado{" "}
            <span className="font-semibold text-foreground">Recursos</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Restablece las técnicas y videos iniciales del TESH"
          >
            <RefreshCw className="size-3.5" />
            <span>Restaurar Predeterminados</span>
          </Button>

          <Button
            type="button"
            onClick={openCreateDialog}
            className="h-9 gap-1.5 bg-[#6857E4] hover:bg-[#5847d5] text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="size-4" />
            <span>Nuevo Recurso / Video</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total de Recursos</span>
            <BookOpen className="size-4 text-[#6857E4]" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1.5">{stats.total}</p>
          <span className="text-[11px] text-muted-foreground">En el catálogo de autocuidado</span>
        </div>

        <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 bg-lavender-soft/60 dark:bg-indigo-950/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-[#6857E4] dark:text-indigo-300">
            <span className="text-xs font-medium">Videos Demostrativos</span>
            <Video className="size-4" />
          </div>
          <p className="text-2xl font-bold text-[#6857E4] dark:text-indigo-200 mt-1.5">
            {stats.conVideo}
          </p>
          <span className="text-[11px] text-[#6857E4]/80 dark:text-indigo-300/80">
            Con reproductor embebido activo
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-xs font-medium">Recursos Activos</span>
            <CheckCircle2 className="size-4" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1.5">
            {stats.activos}
          </p>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
            Visibles para los estudiantes
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por título, autor o técnica..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8.5 pl-8 text-xs bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="size-3.5" />
            <span>Categoría:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Todas ({resources.length})</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Todos los formatos</option>
            <option value="video">Solo con Video</option>
            <option value="lectura">Solo Lecturas</option>
          </select>
        </div>
      </div>

      {/* Lista / Grid de Recursos del Psicólogo */}
      {filteredResources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-10 text-center">
          <Library className="mx-auto size-9 text-muted-foreground/60" />
          <h3 className="text-sm font-semibold text-foreground mt-2">
            No se encontraron recursos con los filtros actuales
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Intenta cambiar los términos de búsqueda o haz clic en "Nuevo Recurso" para crear uno.
          </p>
          <Button
            type="button"
            onClick={openCreateDialog}
            className="mt-4 h-8.5 text-xs font-semibold bg-[#6857E4] text-white"
          >
            Crear primer recurso
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((res) => {
            const hasVideo = !!res.videoUrl;
            return (
              <div
                key={res.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm transition-all bg-card ${
                  res.active === false
                    ? "opacity-60 border-border/50 bg-muted/10"
                    : "border-border/80 hover:border-[#6857E4]/50 hover:shadow-md"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold uppercase tracking-wider rounded-md border-primary/30 bg-primary/10 text-primary"
                      >
                        {res.category}
                      </Badge>
                      {hasVideo ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold rounded-md border-lavender/50 bg-lavender-soft text-[#6857E4] dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-700/50 gap-1"
                        >
                          <Play className="size-2.5 fill-current" />
                          <span>
                            {detectVideoOrientation(res.videoUrl, res.videoOrientation) ===
                            "vertical"
                              ? "Video Vertical"
                              : "Video"}
                          </span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium rounded-md border-border bg-muted/40 text-muted-foreground"
                        >
                          Lectura
                        </Badge>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggle(res.id)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                        res.active !== false
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                      title={res.active !== false ? "Desactivar recurso" : "Activar recurso"}
                    >
                      {res.active !== false ? "Visible" : "Oculto"}
                    </button>
                  </div>

                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-50 leading-snug">
                      {res.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {res.shortDescription}
                    </p>
                  </div>

                  {hasVideo && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#6857E4] dark:text-indigo-300 font-medium bg-lavender-soft/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 p-2 rounded-lg truncate">
                      <Video className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {res.videoTitle || "Video demostrativo adjunto"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {res.readTime}
                    </span>
                    <span className="truncate max-w-[140px]">{res.author}</span>
                  </div>
                </div>

                {/* Acciones de Edición y Vista Previa */}
                <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-border/50 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPreviewOrientation(
                        detectVideoOrientation(res.videoUrl, res.videoOrientation),
                      );
                      setPreviewResource(res);
                    }}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                    title="Ver como lo ve el alumno"
                  >
                    <Eye className="size-3.5" />
                    <span>Ver</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(res)}
                    className="h-7 px-2 text-xs font-semibold gap-1"
                  >
                    <Pencil className="size-3.5" />
                    <span>Editar</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmId(res.id)}
                    className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                    title="Eliminar recurso"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DIÁLOGO: CREAR / EDITAR RECURSO */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveForm} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                {editingResource ? (
                  <>
                    <Pencil className="size-4 text-[#6857E4]" />
                    <span>Editar Recurso Psicoeducativo</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-4 text-[#6857E4]" />
                    <span>Crear Nuevo Recurso / Video</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configura el título, categoría, video demostrativo y texto que se presentará a los
                estudiantes en la biblioteca de autocuidado.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Título del Recurso *
                </label>
                <Input
                  required
                  placeholder="Ej. Respiración Diafragmática Consciente o Anclaje Sensorial"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Categoría Emocional</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ResourceCategory)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Tiempo Estimado</label>
                <Input
                  placeholder="Ej. 4 min de lectura o 5 min de práctica"
                  value={formReadTime}
                  onChange={(e) => setFormReadTime(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* SECCIÓN AVANZADA DE VIDEO DEMOSTRATIVO: SUBIDA DIRECTA O URL */}
              <div className="space-y-3 sm:col-span-2 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-lavender-soft/40 dark:bg-indigo-950/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#6857E4] dark:text-indigo-300">
                    <Video className="size-4" />
                    <span>Video Demostrativo Guiado (Opcional)</span>
                  </div>

                  {formVideoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveVideo}
                      className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                    >
                      Quitar video
                    </Button>
                  )}
                </div>

                {/* Selector de modo: Subir Archivo vs Enlace URL */}
                <div className="grid grid-cols-2 gap-2 bg-background/80 p-1 rounded-lg border border-border/70">
                  <button
                    type="button"
                    onClick={() => setVideoSourceMode("upload")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                      videoSourceMode === "upload"
                        ? "bg-[#6857E4] text-white shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <UploadCloud className="size-3.5" />
                    <span>Subir archivo (.mp4, .webm)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVideoSourceMode("url")}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                      videoSourceMode === "url"
                        ? "bg-[#6857E4] text-white shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LinkIcon className="size-3.5" />
                    <span>Vincular por URL (YouTube/Vimeo)</span>
                  </button>
                </div>

                {/* MODO 1: SUBIDA DIRECTA DE ARCHIVO DE VIDEO */}
                {videoSourceMode === "upload" && (
                  <div className="space-y-3 pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    {isUploadingVideo ? (
                      <div className="rounded-xl border border-dashed border-indigo-300 bg-background/60 p-6 text-center space-y-2">
                        <Loader2 className="mx-auto size-7 animate-spin text-[#6857E4]" />
                        <p className="text-xs font-semibold text-foreground">
                          Procesando y guardando video demostrativo... {uploadProgress}%
                        </p>
                        <div className="w-full max-w-xs mx-auto h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#6857E4] transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : formVideoUrl && !isExternalEmbedVideo(formVideoUrl) ? (
                      /* Video cargado con éxito */
                      <div className="rounded-xl border border-border bg-background p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="grid size-8 place-items-center rounded-lg bg-[#6857E4]/10 text-[#6857E4] dark:text-indigo-300">
                              <FileVideo className="size-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                {uploadedFileInfo?.fileName ||
                                  formVideoTitle ||
                                  "Video demostrativo cargado"}
                              </p>
                              <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                                <span>
                                  {uploadedFileInfo?.fileSize || "Guardado en almacenamiento"}
                                </span>
                                <span>•</span>
                                {uploadedFileInfo?.isLocal ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                    <AlertTriangle className="size-3" /> Solo local (este navegador)
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                                    <Check className="size-3" /> En Supabase Storage
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-7 text-xs"
                          >
                            Cambiar archivo
                          </Button>
                        </div>

                        {uploadedFileInfo?.isLocal && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg px-2.5 py-1.5">
                            Nota: El video se guardó en IndexedDB de este equipo porque{" "}
                            {uploadedFileInfo.storageError
                              ? `Supabase Storage devolvió: ${uploadedFileInfo.storageError}.`
                              : "aún no hay un bucket remoto activo."}
                          </p>
                        )}

                        {/* Vista previa adaptativa */}
                        <div className="flex justify-center">
                          <VideoPlayerView
                            videoUrl={formVideoUrl}
                            title={formVideoTitle || formTitle}
                            orientation={formVideoOrientation}
                            className={
                              formVideoOrientation === "vertical"
                                ? "max-w-[230px] sm:max-w-[250px]"
                                : "max-h-60"
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      /* Zona de arrastrar y soltar o seleccionar */
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingVideo(true);
                        }}
                        onDragLeave={() => setIsDraggingVideo(false)}
                        onDrop={handleDropVideo}
                        onClick={() => fileInputRef.current?.click()}
                        className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors bg-background/60 hover:bg-background ${
                          isDraggingVideo
                            ? "border-[#6857E4] bg-[#6857E4]/10"
                            : "border-border/80 hover:border-[#6857E4]/60"
                        }`}
                      >
                        <UploadCloud className="mx-auto size-8 text-[#6857E4] mb-2" />
                        <p className="text-xs font-semibold text-foreground">
                          Haz clic para seleccionar o arrastra un video demostrativo aquí
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Formatos compatibles: MP4, WebM o MOV (hasta 150 MB). Detecta
                          automáticamente si es vertical u horizontal.
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="mt-3 h-7 text-xs font-semibold"
                        >
                          Seleccionar video desde mi computadora
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* MODO 2: ENLACE EXTERNO DE YOUTUBE O VIMEO */}
                {videoSourceMode === "url" && (
                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-foreground">
                        URL del Video (YouTube, Shorts o Vimeo)
                      </label>
                      <Input
                        placeholder="https://www.youtube.com/watch?v=... o .../shorts/..."
                        value={formVideoUrl}
                        onChange={(e) => setFormVideoUrl(e.target.value)}
                        className="text-xs bg-background"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Pega cualquier enlace público de YouTube, YouTube Shorts o Vimeo. Si es un
                      video vertical estándar, puedes marcar su orientación abajo.
                    </p>

                    {formVideoUrl && isExternalEmbedVideo(formVideoUrl) && (
                      <div className="pt-2 flex flex-col items-center">
                        <span className="text-[11px] font-semibold text-foreground block mb-1.5 self-start">
                          Vista previa del reproductor embebido:
                        </span>
                        <VideoPlayerView
                          videoUrl={formVideoUrl}
                          title={formVideoTitle || formTitle}
                          orientation={formVideoOrientation}
                          className={
                            detectVideoOrientation(formVideoUrl, formVideoOrientation) ===
                            "vertical"
                              ? "max-w-[230px] sm:max-w-[250px]"
                              : "max-h-60"
                          }
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Selector de orientación del video (cuando existe archivo o URL) */}
                {formVideoUrl && (
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <label className="text-[11px] font-semibold text-foreground block">
                      Orientación del Reproductor y Diseño de Página
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {(
                        [
                          { id: "auto", label: "Automático" },
                          { id: "horizontal", label: "Horizontal (16:9)" },
                          { id: "vertical", label: "Vertical (9:16)" },
                          { id: "square", label: "Cuadrado (1:1)" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFormVideoOrientation(opt.id)}
                          className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                            formVideoOrientation === opt.id
                              ? "border-[#6857E4] bg-[#6857E4]/10 text-[#6857E4] dark:text-indigo-300"
                              : "border-border bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Título o descripción del video */}
                <div className="space-y-1 pt-1 border-t border-border/40">
                  <label className="text-[11px] font-semibold text-foreground">
                    Título o Descripción Breve del Video (opcional)
                  </label>
                  <Input
                    placeholder="Ej. Guía práctica de respiración diafragmática grabada por el Área de Psicología"
                    value={formVideoTitle}
                    onChange={(e) => setFormVideoTitle(e.target.value)}
                    className="text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">Descripción Corta</label>
                <Input
                  placeholder="Resumen en una o dos líneas que se muestra en la tarjeta del estudiante"
                  value={formShortDesc}
                  onChange={(e) => setFormShortDesc(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Párrafos Explicativos de la Técnica (separa párrafos con doble salto de línea)
                </label>
                <Textarea
                  rows={4}
                  placeholder="Párrafo 1: Justificación clínica y qué esperar...\n\nPárrafo 2: Instrucciones paso a paso..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="text-xs resize-y font-normal"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Idea Clave para Recordar (Takeaway)
                </label>
                <Input
                  placeholder="Ej. Pausa 2 minutos, inhala en 4 segundos y exhala en 6."
                  value={formKeyTakeaway}
                  onChange={(e) => setFormKeyTakeaway(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Autor / Responsable Clínico
                </label>
                <Input
                  placeholder="Dra. Marta Gómez — Psicología TESH"
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-[#6857E4] hover:bg-[#5847d5] text-white"
                disabled={isUploadingVideo}
              >
                {editingResource ? "Guardar Cambios" : "Publicar Recurso"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: VISTA PREVIA DEL ESTUDIANTE */}
      <Dialog open={!!previewResource} onOpenChange={() => setPreviewResource(null)}>
        <DialogContent
          className={`${
            previewResource?.videoUrl && previewOrientation === "vertical"
              ? "max-w-3xl"
              : "max-w-2xl"
          } max-h-[88vh] overflow-y-auto`}
        >
          {previewResource && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-bold uppercase">
                    {previewResource.category}
                  </Badge>
                  <span className="text-xs text-teal-700 dark:text-teal-300 font-medium flex items-center gap-1">
                    <Clock className="size-3" />
                    {previewResource.readTime}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
                >
                  Vista previa de estudiante
                </Badge>
              </div>

              <div
                className={
                  previewResource.videoUrl && previewOrientation === "vertical"
                    ? "grid gap-5 md:grid-cols-[260px_minmax(0,1fr)] md:items-start"
                    : "flex flex-col gap-4"
                }
              >
                <div
                  className={
                    previewResource.videoUrl && previewOrientation === "vertical"
                      ? "min-w-0 md:col-start-2 md:row-start-1"
                      : "min-w-0"
                  }
                >
                  <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50 break-words">
                    {previewResource.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    {previewResource.shortDescription}
                  </p>
                  <p className="text-[11px] text-teal-700 dark:text-teal-300 mt-1 font-medium">
                    Publicado por: {previewResource.author}
                  </p>
                </div>

                {previewResource.videoUrl && (
                  <div
                    className={`min-w-0 space-y-1.5 ${
                      previewOrientation === "vertical"
                        ? "md:col-start-1 md:row-start-1 md:row-span-2"
                        : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-1.5 text-xs font-bold text-[#6857E4] dark:text-indigo-300">
                      <Video className="size-3.5 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words leading-snug">
                        {previewResource.videoTitle || "Video Demostrativo Guiado"}
                      </span>
                    </div>
                    <VideoPlayerView
                      videoUrl={previewResource.videoUrl}
                      title={previewResource.videoTitle || previewResource.title}
                      orientation={previewResource.videoOrientation}
                      onOrientationDetected={setPreviewOrientation}
                      className={previewOrientation === "vertical" ? "max-w-[260px]" : ""}
                    />
                  </div>
                )}

                <div
                  className={`min-w-0 space-y-3 text-sm text-slate-800 dark:text-slate-100 leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/60 ${
                    previewResource.videoUrl && previewOrientation === "vertical"
                      ? "md:col-start-2 md:row-start-2"
                      : ""
                  }`}
                >
                  {previewResource.content.map((par, i) => (
                    <p key={i}>{par}</p>
                  ))}

                  {previewResource.keyTakeaway && (
                    <div className="mt-3 rounded-lg bg-teal-50/90 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 p-3 text-xs">
                      <span className="font-bold block mb-0.5 text-teal-800 dark:text-teal-300">
                        Idea para recordar:
                      </span>
                      <p className="text-slate-800 dark:text-slate-100">
                        {previewResource.keyTakeaway}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewResource(null)}
                  className="text-xs"
                >
                  Cerrar Vista Previa
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRMACIÓN DE ELIMINACIÓN */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="size-4" />
              <span>Confirmar Eliminación</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              ¿Estás seguro de que deseas eliminar este recurso del catálogo? Los estudiantes ya no
              podrán consultarlo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="text-xs"
            >
              Sí, Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
