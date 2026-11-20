import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Copy,
  Grid3X3,
  Plus,
  RefreshCw,
  Save,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TESH_PERIODOS_SUGERIDOS,
  TESH_TUTORIAS_CARRERAS,
  copyTutorAssignmentsFromPreviousPeriod,
  getAllStudentsForDirectivo,
  getAllTutorGroupAssignments,
  getCanalizaciones,
  getPreviousPeriodo,
  getTutorProfiles,
  saveBulkTutorAssignments,
  updateStudentAcademicGroup,
  updateTutorAssignment,
  type CanalizacionEstado,
  type CanalizacionPrioridad,
  type CanalizacionRecord,
  type TutorGrupoAssignment,
  type TutorProfile,
  type TutorStudentItem,
} from "@/features/tutor/tutor-service";

type PanelTab = "asignaciones" | "estudiantes" | "canalizaciones";

interface GridRowItem {
  key: string;
  carrera: string;
  semestre: string;
  grupo: string;
}

const SEMESTRES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const ESTADO_BADGE: Record<CanalizacionEstado, { label: string; cls: string }> = {
  pendiente: {
    label: "Pendiente",
    cls: "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  aceptada: {
    label: "Aceptada",
    cls: "border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  },
  completada: {
    label: "Completada",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  rechazada: {
    label: "Rechazada",
    cls: "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

const PRIORIDAD_BADGE: Record<CanalizacionPrioridad, string> = {
  baja: "border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  normal: "border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  alta: "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  urgente: "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
};

function makeGridKey(carrera: string, semestre: string, grupo: string): string {
  return `${carrera.trim().toLowerCase()}|${semestre.trim()}|${grupo.trim().toLowerCase()}`;
}

function formatFecha(iso?: string): string {
  if (!iso) return "Reciente";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Reciente";
    return format(d, "dd MMM yyyy", { locale: es });
  } catch {
    return "Reciente";
  }
}

export function TutoresAsignacionPanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>("asignaciones");

  const [tutores, setTutores] = useState<TutorProfile[]>([]);
  const [allAsignaciones, setAllAsignaciones] = useState<TutorGrupoAssignment[]>([]);
  const [canalizaciones, setCanalizaciones] = useState<CanalizacionRecord[]>([]);
  const [estudiantes, setEstudiantes] = useState<TutorStudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selector de periodo académico
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("2026-2");
  const [customPeriodoInput, setCustomPeriodoInput] = useState("");
  const [showCustomPeriodo, setShowCustomPeriodo] = useState(false);
  const [showInactiveRows, setShowInactiveRows] = useState(false);
  const [isCopyingPeriod, setIsCopyingPeriod] = useState(false);

  // Grilla de asignación masiva
  const [showBulkGrid, setShowBulkGrid] = useState(true);
  const [groupsPerSemester, setGroupsPerSemester] = useState<1 | 2 | 3>(1);
  const [gridCareerFilter, setGridCareerFilter] = useState<string>("all");
  const [gridSemesterFilter, setGridSemesterFilter] = useState<string>("all");
  const [gridOnlyUnassigned, setGridOnlyUnassigned] = useState(false);
  const [gridSelections, setGridSelections] = useState<Record<string, string>>({});
  const [extraGroups, setExtraGroups] = useState<GridRowItem[]>([]);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Gestión de estudiantes que recursan
  const [studentSearch, setStudentSearch] = useState("");
  const [studentCareerFilter, setStudentCareerFilter] = useState<string>("all");
  const [editingStudent, setEditingStudent] = useState<TutorStudentItem | null>(null);
  const [editCarrera, setEditCarrera] = useState<string>(TESH_TUTORIAS_CARRERAS[0]);
  const [editSemestre, setEditSemestre] = useState<string>("1");
  const [editGrupo, setEditGrupo] = useState<string>("101");
  const [isUpdatingStudent, setIsUpdatingStudent] = useState(false);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profiles, groupAssignments, allCanalizaciones, studentsList] = await Promise.all([
        getTutorProfiles(),
        getAllTutorGroupAssignments(),
        getCanalizaciones(),
        getAllStudentsForDirectivo(),
      ]);
      setTutores(profiles);
      setAllAsignaciones(groupAssignments);
      setCanalizaciones(allCanalizaciones);
      setEstudiantes(studentsList);
    } catch (err) {
      console.error("Error cargando tutores, periodos y estudiantes:", err);
      toast.error("No se pudieron cargar los datos de tutorías.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Lista combinada de periodos disponibles
  const availablePeriodos = useMemo(() => {
    const set = new Set<string>([...TESH_PERIODOS_SUGERIDOS]);
    allAsignaciones.forEach((a) => {
      if (a.periodo) set.add(a.periodo);
    });
    if (selectedPeriodo) set.add(selectedPeriodo);
    return Array.from(set).sort();
  }, [allAsignaciones, selectedPeriodo]);

  const previousPeriodo = useMemo(() => getPreviousPeriodo(selectedPeriodo), [selectedPeriodo]);

  // Asignaciones del periodo seleccionado
  const periodAssignments = useMemo(() => {
    return allAsignaciones
      .filter((a) => (a.periodo || "2026-2") === selectedPeriodo)
      .sort((a, b) => {
        const c = a.carrera.localeCompare(b.carrera, "es");
        if (c !== 0) return c;
        const s = Number(a.semestre) - Number(b.semestre);
        if (!isNaN(s) && s !== 0) return s;
        return a.grupo.localeCompare(b.grupo, "es");
      });
  }, [allAsignaciones, selectedPeriodo]);

  const activePeriodAssignments = useMemo(
    () => periodAssignments.filter((a) => a.activo !== false),
    [periodAssignments],
  );

  const visiblePeriodAssignments = useMemo(
    () => (showInactiveRows ? periodAssignments : activePeriodAssignments),
    [showInactiveRows, periodAssignments, activePeriodAssignments],
  );

  const previousPeriodHasAssignments = useMemo(() => {
    return allAsignaciones.some((a) => (a.periodo || "2026-2") === previousPeriodo);
  }, [allAsignaciones, previousPeriodo]);

  // Sincronizar selecciones de la grilla con asignaciones activas del periodo elegido
  const syncGridWithSelectedPeriod = useCallback(
    (sourceAssignments: TutorGrupoAssignment[]) => {
      const nextSelections: Record<string, string> = {};
      const extras: GridRowItem[] = [];
      const standardSet = new Set<string>();

      for (const career of TESH_TUTORIAS_CARRERAS) {
        for (const sem of SEMESTRES) {
          for (let gIdx = 1; gIdx <= groupsPerSemester; gIdx++) {
            const grp = `${sem}0${gIdx}`;
            standardSet.add(makeGridKey(career, sem, grp));
          }
        }
      }

      sourceAssignments
        .filter((a) => a.activo !== false)
        .forEach((a) => {
          const k = makeGridKey(a.carrera, a.semestre, a.grupo);
          nextSelections[k] = a.tutor_id;
          if (!standardSet.has(k)) {
            extras.push({
              key: k,
              carrera: a.carrera,
              semestre: a.semestre,
              grupo: a.grupo,
            });
          }
        });

      setGridSelections(nextSelections);
      setExtraGroups(extras);
    },
    [groupsPerSemester],
  );

  useEffect(() => {
    syncGridWithSelectedPeriod(periodAssignments);
  }, [selectedPeriodo, periodAssignments, syncGridWithSelectedPeriod]);

  // Filas base de la grilla (7 carreras × 9 semestres × 1-3 grupos) + extras del periodo
  const allGridRows = useMemo<GridRowItem[]>(() => {
    const rows: GridRowItem[] = [];
    const seenKeys = new Set<string>();

    for (const carrera of TESH_TUTORIAS_CARRERAS) {
      for (const sem of SEMESTRES) {
        for (let gIdx = 1; gIdx <= groupsPerSemester; gIdx++) {
          const grupo = `${sem}0${gIdx}`;
          const key = makeGridKey(carrera, sem, grupo);
          seenKeys.add(key);
          rows.push({ key, carrera, semestre: sem, grupo });
        }
      }
    }

    for (const extra of extraGroups) {
      if (!seenKeys.has(extra.key)) {
        seenKeys.add(extra.key);
        rows.push(extra);
      }
    }

    return rows.sort((a, b) => {
      const c = a.carrera.localeCompare(b.carrera, "es");
      if (c !== 0) return c;
      const s = Number(a.semestre) - Number(b.semestre);
      if (!isNaN(s) && s !== 0) return s;
      return a.grupo.localeCompare(b.grupo, "es");
    });
  }, [groupsPerSemester, extraGroups]);

  const filteredGridRows = useMemo(() => {
    return allGridRows.filter((row) => {
      if (gridCareerFilter !== "all" && row.carrera !== gridCareerFilter) return false;
      if (gridSemesterFilter !== "all" && row.semestre !== gridSemesterFilter) return false;
      if (gridOnlyUnassigned && gridSelections[row.key]) return false;
      return true;
    });
  }, [allGridRows, gridCareerFilter, gridSemesterFilter, gridOnlyUnassigned, gridSelections]);

  const selectedGridEntries = useMemo(() => {
    return allGridRows
      .filter((row) => Boolean(gridSelections[row.key]))
      .map((row) => {
        const tutorId = gridSelections[row.key];
        const tutor = tutores.find((t) => t.id === tutorId);
        return {
          ...row,
          tutor_id: tutorId,
          tutor_nombre: tutor?.nombre || "Tutor TESH",
        };
      });
  }, [allGridRows, gridSelections, tutores]);

  const handleOpenCreateFromScratch = () => {
    setShowBulkGrid(true);
    setGridSelections({});
    setGridCareerFilter("all");
    setGridSemesterFilter("all");
    setGridOnlyUnassigned(false);
    setTimeout(() => {
      document
        .getElementById("asignacion-masiva-grid")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const handleCopyFromPreviousPeriod = async () => {
    setIsCopyingPeriod(true);
    try {
      const res = await copyTutorAssignmentsFromPreviousPeriod({
        targetPeriodo: selectedPeriodo,
        sourcePeriodo: previousPeriodo,
      });

      if (!res.ok) {
        toast.error(res.error || `No se encontraron asignaciones en ${previousPeriodo}.`);
        return;
      }

      toast.success(
        `Se copiaron ${res.copiedCount} asignaciones de ${res.sourcePeriodo} a ${selectedPeriodo}. El periodo anterior quedó inactivo.`,
      );
      setShowBulkGrid(true);
      await loadAll();
    } finally {
      setIsCopyingPeriod(false);
    }
  };

  const handleSaveBulkAssignments = async () => {
    if (selectedGridEntries.length === 0) {
      toast.error("Selecciona al menos un tutor en la grilla para guardar.");
      return;
    }

    setIsSavingBulk(true);
    try {
      const res = await saveBulkTutorAssignments({
        periodo: selectedPeriodo,
        assignments: selectedGridEntries.map((item) => ({
          tutor_id: item.tutor_id,
          tutor_nombre: item.tutor_nombre,
          carrera: item.carrera,
          semestre: item.semestre,
          grupo: item.grupo,
        })),
      });

      if (!res.ok) {
        toast.error(res.error || "No se pudieron guardar las asignaciones.");
        return;
      }

      toast.success(
        `${res.savedCount} asignaciones guardadas en el periodo ${selectedPeriodo}. Las asignaciones previas de esos grupos se marcaron como inactivas.`,
      );
      await loadAll();
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleInlineTutorChange = async (asig: TutorGrupoAssignment, nextTutorId: string) => {
    const tutor = tutores.find((t) => t.id === nextTutorId);
    if (!tutor) return;
    const res = await updateTutorAssignment({
      id: asig.id,
      tutor_id: tutor.id,
      tutor_nombre: tutor.nombre,
    });
    if (!res.ok) {
      toast.error(res.error || "No se pudo cambiar el tutor.");
      return;
    }
    toast.success(`Grupo ${asig.grupo} (${asig.carrera}) actualizado a ${tutor.nombre}.`);
    await loadAll();
  };

  const handleToggleAssignmentActive = async (asig: TutorGrupoAssignment) => {
    const nextActivo = asig.activo === false;
    const res = await updateTutorAssignment({
      id: asig.id,
      activo: nextActivo,
    });
    if (!res.ok) {
      toast.error(res.error || "No se pudo actualizar el estado.");
      return;
    }
    toast.success(
      nextActivo
        ? `Asignación de ${asig.carrera} · Grupo ${asig.grupo} reactivada.`
        : `Asignación de ${asig.carrera} · Grupo ${asig.grupo} marcada como inactiva.`,
    );
    await loadAll();
  };

  const handleAddCustomPeriodo = () => {
    const clean = customPeriodoInput.trim();
    if (!clean) return;
    setSelectedPeriodo(clean);
    setCustomPeriodoInput("");
    setShowCustomPeriodo(false);
  };

  // Filtrado de estudiantes para la pestaña "Estudiantes" (recursamiento)
  const filteredEstudiantes = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return estudiantes.filter((st) => {
      const matchesCareer = studentCareerFilter === "all" || st.carrera === studentCareerFilter;
      const matchesQuery =
        q === "" || st.nombre.toLowerCase().includes(q) || st.matricula.toLowerCase().includes(q);
      return matchesCareer && matchesQuery;
    });
  }, [estudiantes, studentSearch, studentCareerFilter]);

  const handleOpenEditStudent = (st: TutorStudentItem) => {
    setEditingStudent(st);
    setEditCarrera(st.carrera || TESH_TUTORIAS_CARRERAS[0]);
    setEditSemestre(String(st.semestre || "1").replace(/\D/g, "") || "1");
    setEditGrupo(st.grupo || "101");
  };

  const handleSaveStudentGroupChange = async () => {
    if (!editingStudent) return;
    if (!editGrupo.trim()) {
      toast.error("Ingresa el grupo destino del estudiante.");
      return;
    }

    setIsUpdatingStudent(true);
    try {
      const res = await updateStudentAcademicGroup({
        studentId: editingStudent.id,
        carrera: editCarrera,
        semestre: editSemestre,
        grupo: editGrupo.trim(),
      });

      if (!res.ok) {
        toast.error(res.error || "No se pudo cambiar el grupo del estudiante.");
        return;
      }

      toast.success(
        `${editingStudent.nombre} ahora pertenece a ${editCarrera} · ${editSemestre}º Sem · Grupo ${editGrupo.trim()}.`,
      );
      setEditingStudent(null);
      await loadAll();
    } finally {
      setIsUpdatingStudent(false);
    }
  };

  const canalizacionesStats = useMemo(() => {
    return {
      total: canalizaciones.length,
      pendientes: canalizaciones.filter((c) => c.estado === "pendiente").length,
      aceptadas: canalizaciones.filter((c) => c.estado === "aceptada").length,
      completadas: canalizaciones.filter((c) => c.estado === "completada").length,
      urgentes: canalizaciones.filter((c) => c.prioridad === "urgente").length,
    };
  }, [canalizaciones]);

  return (
    <div className="space-y-6">
      {/* Cabecera de sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#1B198F] dark:text-indigo-300">
            Gestión Tutorial Institucional
          </p>
          <h2 className="font-display text-2xl font-bold text-[#1B198F] dark:text-foreground">
            Asignación de Tutores por Periodo y Recursamiento
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Administra las 7 carreras del TESH, semestres 1º al 9º, cambios semestrales y alumnos en
            recursamiento.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadAll}
          className="rounded-xl text-xs font-semibold w-fit"
        >
          <RefreshCw className={`mr-1.5 size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar datos
        </Button>
      </div>

      {/* Pestañas del módulo */}
      <div
        role="tablist"
        aria-label="Secciones de gestión tutorial"
        className="flex flex-wrap items-center gap-2 border-b border-border pb-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "asignaciones"}
          onClick={() => setActiveTab("asignaciones")}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "asignaciones"
              ? "border-[#1B198F] bg-[#1B198F] text-white"
              : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <CalendarRange className="size-3.5" />
          Asignaciones por periodo
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "estudiantes"}
          onClick={() => setActiveTab("estudiantes")}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "estudiantes"
              ? "border-[#1B198F] bg-[#1B198F] text-white"
              : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Users className="size-3.5" />
          Estudiantes
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] ${
              activeTab === "estudiantes"
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {estudiantes.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "canalizaciones"}
          onClick={() => setActiveTab("canalizaciones")}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === "canalizaciones"
              ? "border-[#1B198F] bg-[#1B198F] text-white"
              : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <ClipboardList className="size-3.5" />
          Canalizaciones
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] ${
              activeTab === "canalizaciones"
                ? "bg-white/20 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {canalizaciones.length}
          </span>
        </button>
      </div>

      {activeTab === "asignaciones" && (
        <div className="space-y-6">
          {/* 1. BARRA SUPERIOR: SELECTOR DE PERIODO Y ACCIONES RÁPIDAS */}
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5 min-w-48">
                  <Label htmlFor="directivo-periodo-select" className="text-xs font-bold">
                    Periodo académico
                  </Label>
                  <select
                    id="directivo-periodo-select"
                    value={selectedPeriodo}
                    onChange={(e) => setSelectedPeriodo(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-bold text-[#1B198F] dark:text-foreground focus:border-[#1B198F] focus:outline-none"
                  >
                    {availablePeriodos.map((p) => (
                      <option key={p} value={p}>
                        Periodo {p}
                      </option>
                    ))}
                  </select>
                </div>

                {!showCustomPeriodo ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomPeriodo(true)}
                    className="rounded-xl text-xs font-semibold h-9.5"
                  >
                    <Plus className="mr-1.5 size-3.5" />
                    Otro periodo
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={customPeriodoInput}
                      onChange={(e) => setCustomPeriodoInput(e.target.value)}
                      placeholder="Ej. 2028-1"
                      className="w-28 rounded-xl text-xs h-9.5"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCustomPeriodo}
                      className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs h-9.5"
                    >
                      Aplicar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCustomPeriodo(false)}
                      className="rounded-xl text-xs h-9.5"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isCopyingPeriod}
                  onClick={handleCopyFromPreviousPeriod}
                  className="rounded-xl border-[#1B198F]/35 text-[#1B198F] dark:text-indigo-300 hover:bg-[#1B198F]/10 text-xs font-bold h-9.5"
                >
                  <Copy className="mr-1.5 size-3.5" />
                  {isCopyingPeriod
                    ? "Copiando..."
                    : `Copiar del periodo anterior (${previousPeriodo})`}
                </Button>

                <Button
                  type="button"
                  onClick={() => setShowBulkGrid((prev) => !prev)}
                  className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-bold h-9.5"
                >
                  <Grid3X3 className="mr-1.5 size-3.5" />
                  {showBulkGrid ? "Ocultar grilla masiva" : "Abrir asignación masiva"}
                </Button>
              </div>
            </div>

            {/* Resumen del periodo y tutores disponibles */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge
                  variant="outline"
                  className="border-[#1B198F]/30 bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 font-bold"
                >
                  {activePeriodAssignments.length} activas en {selectedPeriodo}
                </Badge>
                <Badge variant="outline" className="font-semibold text-muted-foreground">
                  {tutores.length} tutores con rol=&apos;tutor&apos;
                </Badge>
                {previousPeriodHasAssignments && (
                  <span className="text-[11px] text-muted-foreground">
                    Al copiar o guardar nuevas asignaciones, las del periodo anterior se marcan
                    automáticamente como inactivas.
                  </span>
                )}
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactiveRows}
                  onChange={(e) => setShowInactiveRows(e.target.checked)}
                  className="rounded border-border accent-[#1B198F]"
                />
                Mostrar inactivas
              </label>
            </div>

            {/* Tabla de asignaciones del periodo */}
            {visiblePeriodAssignments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center space-y-4">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    No hay asignaciones activas registradas para el periodo {selectedPeriodo}.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Puedes inicializar todas las carreras y grupos en la grilla masiva o copiar la
                    plantilla del periodo anterior ({previousPeriodo}).
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="button"
                    onClick={handleOpenCreateFromScratch}
                    className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-bold h-9.5"
                  >
                    <Plus className="mr-1.5 size-3.5" />
                    Crear asignaciones desde cero
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isCopyingPeriod || !previousPeriodHasAssignments}
                    onClick={handleCopyFromPreviousPeriod}
                    className="rounded-xl border-[#1B198F]/35 text-[#1B198F] dark:text-indigo-300 text-xs font-bold h-9.5"
                  >
                    <Copy className="mr-1.5 size-3.5" />
                    Copiar del periodo anterior ({previousPeriodo})
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs font-bold">Carrera</TableHead>
                      <TableHead className="text-xs font-bold">Semestre</TableHead>
                      <TableHead className="text-xs font-bold">Grupo</TableHead>
                      <TableHead className="text-xs font-bold">Tutor asignado</TableHead>
                      <TableHead className="text-xs font-bold">Estado</TableHead>
                      <TableHead className="text-xs font-bold text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePeriodAssignments.map((asig) => {
                      const isActive = asig.activo !== false;
                      return (
                        <TableRow key={asig.id} className={!isActive ? "opacity-60" : undefined}>
                          <TableCell className="text-xs font-semibold text-foreground">
                            {asig.carrera}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {asig.semestre}º Semestre
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="border-[#1B198F]/30 bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 text-xs font-bold"
                            >
                              {asig.grupo}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <select
                              aria-label={`Cambiar tutor para ${asig.carrera} grupo ${asig.grupo}`}
                              value={asig.tutor_id}
                              disabled={!isActive}
                              onChange={(e) => handleInlineTutorChange(asig, e.target.value)}
                              className="max-w-60 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:border-[#1B198F] focus:outline-none disabled:opacity-60"
                            >
                              {!tutores.some((t) => t.id === asig.tutor_id) && (
                                <option value={asig.tutor_id}>
                                  {asig.tutor_nombre || asig.tutor_id}
                                </option>
                              )}
                              {tutores.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nombre}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            {isActive ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-bold"
                              >
                                Activa
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-slate-200 bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 text-[11px] font-semibold"
                              >
                                Inactiva
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleAssignmentActive(asig)}
                              className="rounded-lg text-xs font-semibold h-8"
                            >
                              {isActive ? "Desactivar" : "Reactivar"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* 2. GRILLA DE ASIGNACIÓN MASIVA */}
          {showBulkGrid && (
            <section
              id="asignacion-masiva-grid"
              className="rounded-2xl border border-border bg-card p-5 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 shrink-0">
                    <Grid3X3 className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Asignación Masiva por Carrera, Semestre y Grupo ({selectedPeriodo})
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Precargado con las 7 carreras del TESH y semestres 1º al 9º. Selecciona el
                      tutor para cada grupo y guarda todo en una sola operación.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={isSavingBulk || selectedGridEntries.length === 0}
                  onClick={handleSaveBulkAssignments}
                  className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-bold h-10 shrink-0"
                >
                  <Save className="mr-1.5 size-4" />
                  {isSavingBulk
                    ? "Guardando asignaciones..."
                    : `Guardar todas las asignaciones (${selectedGridEntries.length})`}
                </Button>
              </div>

              {/* Tutores disponibles */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                  Tutores disponibles:
                </span>
                {tutores.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs"
                  >
                    <UserCheck className="size-3 text-[#1B198F] dark:text-indigo-300" />
                    <span className="font-semibold text-foreground">{t.nombre}</span>
                  </span>
                ))}
              </div>

              {/* Controles de la grilla */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="grid-filter-career" className="text-xs font-bold">
                    Filtrar por carrera
                  </Label>
                  <select
                    id="grid-filter-career"
                    value={gridCareerFilter}
                    onChange={(e) => setGridCareerFilter(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
                  >
                    <option value="all">Todas las carreras (7)</option>
                    {TESH_TUTORIAS_CARRERAS.map((career) => (
                      <option key={career} value={career}>
                        {career}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="grid-filter-semester" className="text-xs font-bold">
                    Filtrar por semestre
                  </Label>
                  <select
                    id="grid-filter-semester"
                    value={gridSemesterFilter}
                    onChange={(e) => setGridSemesterFilter(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
                  >
                    <option value="all">Todos los semestres (1º–9º)</option>
                    {SEMESTRES.map((s) => (
                      <option key={s} value={s}>
                        {s}º Semestre
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="grid-groups-count" className="text-xs font-bold">
                    Grupos por semestre
                  </Label>
                  <select
                    id="grid-groups-count"
                    value={groupsPerSemester}
                    onChange={(e) => setGroupsPerSemester(Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
                  >
                    <option value={1}>1 grupo por semestre (ej. 101)</option>
                    <option value={2}>2 grupos por semestre (ej. 101, 102)</option>
                    <option value={3}>3 grupos por semestre (ej. 101, 102, 103)</option>
                  </select>
                </div>

                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gridOnlyUnassigned}
                      onChange={(e) => setGridOnlyUnassigned(e.target.checked)}
                      className="rounded border-border accent-[#1B198F]"
                    />
                    Mostrar solo grupos sin tutor
                  </label>
                </div>
              </div>

              {/* Grilla de combinaciones Carrera + Semestre + Grupo -> Dropdown Tutor */}
              <div className="rounded-xl border border-border overflow-x-auto max-h-[540px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Carrera</TableHead>
                      <TableHead className="text-xs font-bold w-28">Semestre</TableHead>
                      <TableHead className="text-xs font-bold w-24">Grupo</TableHead>
                      <TableHead className="text-xs font-bold min-w-64">
                        Tutor asignado (rol = &apos;tutor&apos;)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGridRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-xs text-muted-foreground"
                        >
                          No hay combinaciones que coincidan con los filtros seleccionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredGridRows.map((row) => {
                        const selectedTutorId = gridSelections[row.key] || "";
                        return (
                          <TableRow
                            key={row.key}
                            className={selectedTutorId ? "bg-[#1B198F]/[0.03]" : undefined}
                          >
                            <TableCell className="text-xs font-semibold text-foreground">
                              {row.carrera}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {row.semestre}º Semestre
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="border-[#1B198F]/30 bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 text-xs font-bold"
                              >
                                {row.grupo}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <select
                                aria-label={`Tutor para ${row.carrera} ${row.semestre} semestre grupo ${row.grupo}`}
                                value={selectedTutorId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setGridSelections((prev) => {
                                    const next = { ...prev };
                                    if (!val) {
                                      delete next[row.key];
                                    } else {
                                      next[row.key] = val;
                                    }
                                    return next;
                                  });
                                }}
                                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
                              >
                                <option value="">— Sin tutor asignado —</option>
                                {tutores.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.nombre} {t.matricula ? `(${t.matricula})` : ""}
                                  </option>
                                ))}
                              </select>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  Mostrando {filteredGridRows.length} de {allGridRows.length} grupos totales •{" "}
                  <strong className="text-foreground">
                    {selectedGridEntries.length} grupo(s) con tutor seleccionado
                  </strong>
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setGridSelections({})}
                    className="rounded-xl text-xs font-semibold h-9"
                  >
                    Limpiar selección
                  </Button>
                  <Button
                    type="button"
                    disabled={isSavingBulk || selectedGridEntries.length === 0}
                    onClick={handleSaveBulkAssignments}
                    className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-bold h-9"
                  >
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                    {isSavingBulk ? "Guardando..." : "Guardar todas las asignaciones"}
                  </Button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === "estudiantes" && (
        /* 4. GESTIÓN DE ESTUDIANTES QUE RECURSAN */
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 shrink-0">
                <ArrowRightLeft className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Gestión de Estudiantes y Recursamiento
                </h3>
                <p className="text-xs text-muted-foreground">
                  Busca por nombre o matrícula para reubicar a un estudiante en su nueva carrera,
                  semestre y grupo. El cambio actualiza automáticamente las listas del tutor.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Buscar estudiante por nombre o matrícula..."
                className="pl-9 rounded-xl text-xs h-10"
              />
            </div>

            <select
              aria-label="Filtrar estudiantes por carrera"
              value={studentCareerFilter}
              onChange={(e) => setStudentCareerFilter(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-[#1B198F] focus:outline-none h-10"
            >
              <option value="all">Todas las carreras</option>
              {TESH_TUTORIAS_CARRERAS.map((career) => (
                <option key={career} value={career}>
                  {career}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-bold">Nombre completo</TableHead>
                  <TableHead className="text-xs font-bold">Matrícula</TableHead>
                  <TableHead className="text-xs font-bold">Carrera actual</TableHead>
                  <TableHead className="text-xs font-bold">Semestre</TableHead>
                  <TableHead className="text-xs font-bold">Grupo</TableHead>
                  <TableHead className="text-xs font-bold text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEstudiantes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-xs text-muted-foreground"
                    >
                      No se encontraron estudiantes con ese nombre o matrícula.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEstudiantes.map((st) => (
                    <TableRow key={st.id}>
                      <TableCell className="text-xs sm:text-sm font-semibold text-foreground">
                        {st.nombre}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-foreground/85">
                        {st.matricula}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{st.carrera}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {st.semestre}º Semestre
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-[#1B198F]/30 bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 text-xs font-bold"
                        >
                          {st.grupo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenEditStudent(st)}
                          className="rounded-lg bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-semibold h-8"
                        >
                          <ArrowRightLeft className="mr-1.5 size-3.5" />
                          Cambiar grupo
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {activeTab === "canalizaciones" && (
        /* Resumen institucional de canalizaciones */
        <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300">
              <ClipboardList className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Todas las Canalizaciones del Sistema (Resumen Agregado)
              </h3>
              <p className="text-xs text-muted-foreground">
                Monitoreo institucional del flujo tutor → área psicológica sin exposición clínica
                sensible.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <span className="text-[11px] font-bold uppercase text-muted-foreground">Total</span>
              <p className="font-numeric text-2xl font-bold text-[#1B198F] dark:text-foreground mt-1">
                {canalizacionesStats.total}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20 p-3.5">
              <span className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-300">
                Pendientes
              </span>
              <p className="font-numeric text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                {canalizacionesStats.pendientes}
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20 p-3.5">
              <span className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-300">
                Aceptadas
              </span>
              <p className="font-numeric text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                {canalizacionesStats.aceptadas}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-3.5">
              <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                Completadas
              </span>
              <p className="font-numeric text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {canalizacionesStats.completadas}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-xl border border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20 p-3.5">
              <span className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-300">
                Urgentes
              </span>
              <p className="font-numeric text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                {canalizacionesStats.urgentes}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-bold">Carrera / Grupo</TableHead>
                  <TableHead className="text-xs font-bold">Tutor Solicitante</TableHead>
                  <TableHead className="text-xs font-bold">Estudiante / Folio</TableHead>
                  <TableHead className="text-xs font-bold">Prioridad</TableHead>
                  <TableHead className="text-xs font-bold">Estado</TableHead>
                  <TableHead className="text-xs font-bold">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {canalizaciones.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-6 text-xs text-muted-foreground"
                    >
                      No existen canalizaciones registradas en el sistema.
                    </TableCell>
                  </TableRow>
                ) : (
                  canalizaciones.map((c) => {
                    const est = ESTADO_BADGE[c.estado] || ESTADO_BADGE.pendiente;
                    const prio = PRIORIDAD_BADGE[c.prioridad] || PRIORIDAD_BADGE.normal;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs text-foreground">
                          <div className="font-semibold">{c.carrera || "TESH"}</div>
                          {c.grupo && (
                            <span className="text-[11px] text-muted-foreground">
                              Grupo {c.grupo}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.tutor_nombre || "Tutor TESH"}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground">
                          {c.estudiante_nombre || "Estudiante"}
                          {c.folio ? ` (${c.folio})` : ""}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${prio} text-[11px] font-bold capitalize`}
                          >
                            {c.prioridad}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${est.cls} text-[11px] font-bold`}>
                            {est.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatFecha(c.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Modal para cambiar carrera, semestre y grupo de un estudiante que recursa */}
      <Dialog
        open={Boolean(editingStudent)}
        onOpenChange={(open) => {
          if (!open && !isUpdatingStudent) setEditingStudent(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1B198F] dark:text-foreground">
              Actualizar Grupo por Recursamiento
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingStudent
                ? `Reasigna a ${editingStudent.nombre} (${editingStudent.matricula}). Dejará de aparecer en su grupo anterior automáticamente.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {editingStudent && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs space-y-1">
                <p className="font-bold text-foreground">{editingStudent.nombre}</p>
                <p className="text-muted-foreground">
                  Actual: {editingStudent.carrera} · {editingStudent.semestre}º Sem · Grupo{" "}
                  {editingStudent.grupo}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recursamiento-carrera" className="text-xs font-bold">
                  Nueva carrera
                </Label>
                <select
                  id="recursamiento-carrera"
                  value={editCarrera}
                  onChange={(e) => setEditCarrera(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
                >
                  {!TESH_TUTORIAS_CARRERAS.includes(
                    editCarrera as (typeof TESH_TUTORIAS_CARRERAS)[number],
                  ) && <option value={editCarrera}>{editCarrera}</option>}
                  {TESH_TUTORIAS_CARRERAS.map((career) => (
                    <option key={career} value={career}>
                      {career}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="recursamiento-semestre" className="text-xs font-bold">
                    Nuevo semestre
                  </Label>
                  <select
                    id="recursamiento-semestre"
                    value={editSemestre}
                    onChange={(e) => {
                      const nextSem = e.target.value;
                      setEditSemestre(nextSem);
                      // Sugerir grupo acorde si tenía formato N01/N02/N03
                      const suffixMatch = editGrupo.match(/^\d(\d{2})$/);
                      if (suffixMatch) {
                        setEditGrupo(`${nextSem}${suffixMatch[1]}`);
                      }
                    }}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
                  >
                    {SEMESTRES.map((s) => (
                      <option key={s} value={s}>
                        {s}º Semestre
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="recursamiento-grupo" className="text-xs font-bold">
                    Nuevo grupo
                  </Label>
                  <Input
                    id="recursamiento-grupo"
                    value={editGrupo}
                    onChange={(e) => setEditGrupo(e.target.value)}
                    placeholder={`Ej. ${editSemestre}01`}
                    className="rounded-xl text-xs sm:text-sm font-semibold h-9.5"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isUpdatingStudent}
              onClick={() => setEditingStudent(null)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isUpdatingStudent || !editGrupo.trim()}
              onClick={handleSaveStudentGroupChange}
              className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-bold"
            >
              <Save className="mr-1.5 size-3.5" />
              {isUpdatingStudent ? "Guardando..." : "Guardar cambio de grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
