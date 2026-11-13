import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Play } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { resourceIcons } from "@/config/icons";
import {
  getStoredResources,
  fetchResourcesAsync,
  detectVideoOrientation,
} from "./recursos-service";
import { VideoPlayerView, type ResolvedOrientation } from "./video-player-view";
import type { PsychoResource, ResourceCategory } from "@/lib/types";
import { BRAND } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const CATEGORIES: Array<"Todos" | ResourceCategory> = [
  "Todos",
  "Ansiedad",
  "Estrés",
  "Sueño",
  "Ánimo",
  "Respiración",
];

function getCategoryTone(category: ResourceCategory): string {
  switch (category) {
    case "Respiración":
      return "bg-mint-soft text-teal border-mint/40";
    case "Ansiedad":
      return "bg-cyan-soft text-cyan-700 dark:text-cyan-400 border-cyan/40";
    case "Sueño":
      return "bg-lavender-soft text-[#6857E4] border-lavender/40";
    case "Estrés":
      return "bg-teal-soft text-teal border-teal/40";
    case "Ánimo":
      return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getIconComponent(iconName: PsychoResource["iconName"]) {
  switch (iconName) {
    case "wind":
      return resourceIcons.wind;
    case "moon":
      return resourceIcons.moon;
    case "sun":
      return resourceIcons.sun;
    case "heart":
      return resourceIcons.heart;
    case "compass":
      return resourceIcons.compass;
    case "brain":
      return resourceIcons.brain;
    case "feather":
      return resourceIcons.feather;
    case "smile":
      return resourceIcons.smile;
    case "bookOpen":
      return resourceIcons.bookOpen;
    default:
      return resourceIcons.bookOpen;
  }
}

export function RecursosPage() {
  const [resources, setResources] = useState<PsychoResource[]>(() => getStoredResources());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"Todos" | ResourceCategory>("Todos");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<"all" | "under5" | "over5">("all");
  const [activeResource, setActiveResource] = useState<PsychoResource | null>(null);
  const [videoOrientation, setVideoOrientation] = useState<ResolvedOrientation>("horizontal");

  useEffect(() => {
    async function load() {
      const data = await fetchResourcesAsync();
      setResources(data);
    }
    load();
  }, []);

  useEffect(() => {
    if (activeResource?.videoUrl) {
      setVideoOrientation(
        detectVideoOrientation(activeResource.videoUrl, activeResource.videoOrientation),
      );
    } else {
      setVideoOrientation("horizontal");
    }
  }, [activeResource]);

  const handleOrientationDetected = useCallback((next: ResolvedOrientation) => {
    setVideoOrientation(next);
  }, []);

  const filteredResources = useMemo(() => {
    return resources.filter((rec) => {
      if (rec.active === false) return false;
      const matchesCategory = selectedCategory === "Todos" || rec.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === "" ||
        rec.title.toLowerCase().includes(query) ||
        rec.shortDescription.toLowerCase().includes(query) ||
        rec.category.toLowerCase().includes(query) ||
        (rec.author && rec.author.toLowerCase().includes(query));

      const minutes = parseInt(rec.readTime, 10) || 3;
      const matchesTime =
        selectedTimeFilter === "all" ||
        (selectedTimeFilter === "under5" && minutes < 5) ||
        (selectedTimeFilter === "over5" && minutes >= 5);

      return matchesCategory && matchesSearch && matchesTime;
    });
  }, [resources, searchQuery, selectedCategory, selectedTimeFilter]);

  const isVerticalVideo = Boolean(activeResource?.videoUrl && videoOrientation === "vertical");

  const renderVideoSection = (res: PsychoResource) => {
    if (!res.videoUrl) return null;
    return (
      <div
        className={`min-w-0 overflow-hidden space-y-2.5 rounded-2xl border border-teal-200/80 dark:border-teal-900/50 bg-teal-50/40 dark:bg-teal-950/20 p-3.5 sm:p-4 shadow-sm ${
          isVerticalVideo ? "" : "mx-auto w-full max-w-3xl"
        }`}
      >
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2 text-xs font-bold text-teal-800 dark:text-teal-300">
            <Play className="size-3.5 fill-current shrink-0 mt-0.5" />
            <span className="min-w-0 break-words leading-snug">
              {res.videoTitle || "Video Demostrativo Guiado"}
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] border-lavender/50 text-[#6857E4] dark:text-indigo-300 bg-lavender-soft shrink-0"
          >
            {videoOrientation === "vertical"
              ? "Video Vertical"
              : videoOrientation === "square"
                ? "Video Cuadrado"
                : "Video Demostrativo"}
          </Badge>
        </div>

        <VideoPlayerView
          videoUrl={res.videoUrl}
          title={res.videoTitle || res.title}
          orientation={res.videoOrientation || "auto"}
          onOrientationDetected={handleOrientationDetected}
        />

        <p className="text-[11px] text-slate-600 dark:text-slate-300 italic text-center pt-0.5">
          Sigue las indicaciones del video y acompaña el ejercicio a tu propio ritmo.
        </p>
      </div>
    );
  };

  const renderTechniqueHeader = (res: PsychoResource) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-300">
        <resourceIcons.clock className="size-3.5" />
        <span>{res.readTime}</span>
      </div>
      <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        {res.title}
      </h1>
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
        {res.shortDescription}
      </p>
      {res.author && (
        <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">
          Material validado por: {res.author}
        </p>
      )}
    </div>
  );

  const renderTechniqueContent = (res: PsychoResource) => (
    <div className="ethereal-card space-y-5 p-5 sm:p-8 text-slate-800 dark:text-slate-100 leading-relaxed text-sm sm:text-base">
      {res.content.map((paragraph, index) => (
        <p key={index} className="leading-relaxed text-slate-800 dark:text-slate-100">
          {paragraph}
        </p>
      ))}

      {res.keyTakeaway && (
        <div className="mt-6 rounded-2xl bg-teal-50/90 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 p-4 sm:p-5">
          <div className="flex items-center gap-2 font-display text-sm font-bold text-teal-800 dark:text-teal-300 mb-1.5">
            <resourceIcons.sparkles className="size-4" />
            <span>Idea para recordar</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            {res.keyTakeaway}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <PageShell>
      <main className="space-y-8 animate-fade-in pb-16">
        <AnimatePresence mode="wait">
          {activeResource ? (
            /* Vista de Lectura Completa del Recurso (Adaptativa a Video Vertical u Horizontal) */
            <motion.article
              key="resource-detail"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveResource(null)}
                  className="h-9 gap-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-300"
                >
                  <resourceIcons.arrowLeft className="size-4" />
                  <span>Volver a la biblioteca</span>
                </Button>

                <Badge
                  variant="secondary"
                  className={`rounded-xl px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${getCategoryTone(
                    activeResource.category,
                  )}`}
                >
                  {activeResource.category}
                </Badge>
              </div>

              {/* Estructura única estable para evitar que el reproductor se reinicie al detectar orientación */}
              <div
                className={
                  isVerticalVideo
                    ? "grid gap-6 md:grid-cols-[minmax(270px,350px)_minmax(0,1fr)] md:items-start lg:gap-8"
                    : "flex flex-col gap-6"
                }
              >
                <div
                  className={isVerticalVideo ? "min-w-0 md:col-start-2 md:row-start-1" : "min-w-0"}
                >
                  {renderTechniqueHeader(activeResource)}
                </div>

                {activeResource.videoUrl && (
                  <div
                    className={
                      isVerticalVideo
                        ? "min-w-0 md:col-start-1 md:row-start-1 md:row-span-2 md:sticky md:top-6"
                        : "min-w-0"
                    }
                  >
                    {renderVideoSection(activeResource)}
                  </div>
                )}

                <div
                  className={isVerticalVideo ? "min-w-0 md:col-start-2 md:row-start-2" : "min-w-0"}
                >
                  {renderTechniqueContent(activeResource)}
                </div>
              </div>

              {/* Barra inferior de acciones */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveResource(null)}
                  className="rounded-2xl h-11 px-6 text-xs font-semibold"
                >
                  <resourceIcons.arrowLeft className="mr-2 size-4" />
                  <span>Regresar a recursos</span>
                </Button>

                <Button
                  asChild
                  className="rounded-2xl h-11 px-6 bg-[#6857E4] text-white hover:bg-[#5847d5] text-xs font-semibold shadow-soft"
                >
                  <Link to="/chat">
                    <resourceIcons.sparkles className="mr-2 size-4" />
                    <span>Conversar con {BRAND.assistant} sobre este tema</span>
                  </Link>
                </Button>
              </div>
            </motion.article>
          ) : (
            /* Vista Principal: Buscador, Filtros y Grid */
            <motion.div
              key="resource-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-7"
            >
              {/* Header de la sección */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-accent">
                  <resourceIcons.bookOpen className="size-3.5" />
                  <span>Biblioteca de autocuidado</span>
                </div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                  Recursos y herramientas de bienestar
                </h1>
                <p className="max-w-xl text-sm text-muted-foreground leading-relaxed">
                  Lecturas breves, ejercicios prácticos y técnicas validadas para acompañarte a tu
                  propio ritmo.
                </p>
              </section>

              {/* Buscador interactivo */}
              <section className="relative max-w-md">
                <resourceIcons.search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por técnica, emoción o palabra clave..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-2xl pl-10 pr-4 text-sm bg-card/80 border-border/80 shadow-soft focus-visible:ring-accent"
                />
              </section>

              {/* Filtros por Categoría en Chips */}
              <section aria-label="Filtrar por categoría" className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-2xl px-4 py-2 text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-[#6857E4] text-white shadow-soft font-bold scale-[1.02]"
                          : "border border-border/70 bg-card/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </section>

              {/* Filtro por Tiempo de Lectura / Disponibilidad */}
              <section
                aria-label="Filtrar por tiempo de lectura"
                className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <resourceIcons.clock className="size-3.5 text-accent" />
                    <span>Tiempo de lectura</span>
                  </div>
                  {selectedTimeFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedTimeFilter("all")}
                      className="text-[11px] font-semibold text-accent hover:underline"
                    >
                      Mostrar todas
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTimeFilter("all")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedTimeFilter === "all"
                        ? "bg-accent/15 text-accent border border-accent/40 font-bold shadow-2xs"
                        : "border border-border/70 bg-card/80 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <span>Cualquier duración</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTimeFilter("under5")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedTimeFilter === "under5"
                        ? "bg-teal-soft text-teal border border-teal/40 font-bold shadow-2xs"
                        : "border border-border/70 bg-card/80 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <span>Menos de 5 min</span>
                    <span className="text-[10px] font-normal opacity-80">(Pausas breves)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTimeFilter("over5")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedTimeFilter === "over5"
                        ? "bg-lavender-soft text-[#6857E4] border border-lavender/40 font-bold shadow-2xs"
                        : "border border-border/70 bg-card/80 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <span>5 min o más</span>
                    <span className="text-[10px] font-normal opacity-80">(Guías detalladas)</span>
                  </button>
                </div>
              </section>

              {/* Grid de Cards (1 col móvil, 2 tablet, 3 escritorio) */}
              <section aria-labelledby="resources-grid-title" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2
                    id="resources-grid-title"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {filteredResources.length} recurso
                    {filteredResources.length === 1 ? "" : "s"} disponible
                    {filteredResources.length === 1 ? "" : "s"}
                  </h2>
                </div>

                {filteredResources.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredResources.map((resource) => {
                      const IconComponent = getIconComponent(resource.iconName);
                      return (
                        <article
                          key={resource.id}
                          onClick={() => setActiveResource(resource)}
                          className="ethereal-card group flex flex-col justify-between p-5 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-float cursor-pointer"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              {/* Círculo suave con icono Lucide */}
                              <div
                                className={`grid size-11 shrink-0 place-items-center rounded-2xl ${getCategoryTone(
                                  resource.category,
                                )} transition-transform group-hover:scale-105`}
                              >
                                <IconComponent className="size-5" />
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                <Badge
                                  variant="secondary"
                                  className={`rounded-xl px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getCategoryTone(
                                    resource.category,
                                  )}`}
                                >
                                  {resource.category}
                                </Badge>
                                {resource.videoUrl && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-bold rounded-md border-lavender/50 bg-lavender-soft text-[#6857E4] dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-700/50 gap-1 px-1.5 py-0"
                                  >
                                    <Play className="size-2.5 fill-current" />
                                    <span>Video</span>
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div>
                              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                                {resource.title}
                              </h3>
                              <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {resource.shortDescription}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1.5 font-medium">
                              <resourceIcons.clock className="size-3.5 text-teal-600 dark:text-teal-400" />
                              <span>{resource.readTime}</span>
                            </span>

                            <span className="font-bold text-teal-700 dark:text-teal-300 group-hover:underline">
                              {resource.videoUrl ? "Ver video y técnica →" : "Leer técnica →"}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  /* Estado sin resultados */
                  <div className="ethereal-card flex flex-col items-center justify-center p-8 text-center sm:p-12">
                    <resourceIcons.bookOpen className="size-10 text-muted-foreground/60 mb-3" />
                    <h3 className="font-display text-lg font-bold text-foreground">
                      No encontramos recursos con ese criterio
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                      Prueba buscando con otra palabra o selecciona "Todos" para ver todas las
                      técnicas disponibles.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("Todos");
                      }}
                      className="mt-4 rounded-xl text-xs font-semibold"
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageShell>
  );
}
