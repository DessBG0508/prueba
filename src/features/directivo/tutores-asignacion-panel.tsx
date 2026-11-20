import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, RefreshCw, UserCheck, UserPlus, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { TESH_CAREERS } from "@/lib/directivo-data";
import {
  assignTutorToGroup,
  getAllTutorGroupAssignments,
  getCanalizaciones,
  getTutorProfiles,
  type CanalizacionEstado,
  type CanalizacionPrioridad,
  type CanalizacionRecord,
  type TutorGrupoAssignment,
  type TutorProfile,
} from "@/features/tutor/tutor-service";

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
    cls: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
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
  const [tutores, setTutores] = useState<TutorProfile[]>([]);
  const [asignaciones, setAsignaciones] = useState<TutorGrupoAssignment[]>([]);
  const [canalizaciones, setCanalizaciones] = useState<CanalizacionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Formulario de asignación a tutores_grupo
  const [selectedTutorId, setSelectedTutorId] = useState("");
  const [selectedCarrera, setSelectedCarrera] = useState<string>(TESH_CAREERS[3]);
  const [semestre, setSemestre] = useState("5");
  const [grupo, setGrupo] = useState("501");

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profiles, groupAssignments, allCanalizaciones] = await Promise.all([
        getTutorProfiles(),
        getAllTutorGroupAssignments(),
        getCanalizaciones(),
      ]);
      setTutores(profiles);
      setAsignaciones(groupAssignments);
      setCanalizaciones(allCanalizaciones);
      if (profiles.length > 0 && !selectedTutorId) {
        setSelectedTutorId(profiles[0].id);
      }
    } catch (err) {
      console.error("Error cargando tutores y canalizaciones:", err);
      toast.error("No se pudieron cargar los datos de tutorías.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedTutorId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tutor = tutores.find((t) => t.id === selectedTutorId);
    if (!tutor) {
      toast.error("Selecciona un tutor válido.");
      return;
    }
    if (!grupo.trim()) {
      toast.error("Ingresa el grupo a asignar (ej. 501).");
      return;
    }

    setIsSaving(true);
    try {
      const res = await assignTutorToGroup({
        tutor_id: tutor.id,
        tutor_nombre: tutor.nombre,
        carrera: selectedCarrera,
        grupo: grupo.trim(),
        semestre: semestre.trim(),
      });

      if (!res.ok) {
        toast.error(res.error || "No se pudo guardar la asignación.");
        return;
      }

      toast.success(
        `Tutor ${tutor.nombre} asignado al grupo ${grupo.trim()} (${selectedCarrera}).`,
      );
      await loadAll();
    } finally {
      setIsSaving(false);
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
            Asignación de Tutores y Canalizaciones del Sistema
          </h2>
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

      {/* Grid: Formulario de asignación + Lista de perfiles con rol='tutor' */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Formulario INSERT tutores_grupo */}
        <section className="lg:col-span-5 rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300">
              <UserPlus className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Asignar tutor a grupo</h3>
              <p className="text-xs text-muted-foreground">
                Registra la asignación oficial por carrera, semestre y grupo.
              </p>
            </div>
          </div>

          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="directivo-tutor-select" className="text-xs font-bold">
                Tutor (rol = 'tutor')
              </Label>
              <select
                id="directivo-tutor-select"
                value={selectedTutorId}
                onChange={(e) => setSelectedTutorId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
              >
                {tutores.length === 0 ? (
                  <option value="">No hay tutores disponibles</option>
                ) : (
                  tutores.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} {t.matricula ? `(${t.matricula})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="directivo-tutor-carrera" className="text-xs font-bold">
                Carrera
              </Label>
              <select
                id="directivo-tutor-carrera"
                value={selectedCarrera}
                onChange={(e) => setSelectedCarrera(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
              >
                {TESH_CAREERS.map((career) => (
                  <option key={career} value={career}>
                    {career}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="directivo-tutor-semestre" className="text-xs font-bold">
                  Semestre
                </Label>
                <select
                  id="directivo-tutor-semestre"
                  value={semestre}
                  onChange={(e) => setSemestre(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
                    <option key={s} value={String(s)}>
                      {s}º Semestre
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="directivo-tutor-grupo" className="text-xs font-bold">
                  Grupo
                </Label>
                <Input
                  id="directivo-tutor-grupo"
                  value={grupo}
                  onChange={(e) => setGrupo(e.target.value)}
                  placeholder="Ej. 501"
                  className="rounded-xl text-xs sm:text-sm font-semibold h-9.5"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSaving || tutores.length === 0}
              className="w-full rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs sm:text-sm font-semibold h-10"
            >
              <CheckCircle2 className="mr-1.5 size-4" />
              {isSaving ? "Guardando asignación..." : "Guardar asignación de tutor"}
            </Button>
          </form>
        </section>

        {/* Lista de Perfiles de Tutores + Asignaciones actuales */}
        <section className="lg:col-span-7 rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300">
                <Users className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Tutores Registrados y Grupos Asignados
                </h3>
                <p className="text-xs text-muted-foreground">
                  Perfiles con rol = 'tutor' disponibles en la institución ({tutores.length}).
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tutores.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs"
              >
                <UserCheck className="size-3.5 text-[#1B198F] dark:text-indigo-300" />
                <span className="font-bold text-foreground">{t.nombre}</span>
                {t.matricula && <span className="text-muted-foreground">({t.matricula})</span>}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-bold">Tutor</TableHead>
                  <TableHead className="text-xs font-bold">Carrera</TableHead>
                  <TableHead className="text-xs font-bold">Semestre</TableHead>
                  <TableHead className="text-xs font-bold">Grupo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asignaciones.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-6 text-xs text-muted-foreground"
                    >
                      No hay asignaciones de tutores registradas aún.
                    </TableCell>
                  </TableRow>
                ) : (
                  asignaciones.map((asig) => (
                    <TableRow key={asig.id}>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {asig.tutor_nombre || asig.tutor_id}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {asig.carrera}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {asig.semestre}º
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-[#1B198F]/30 bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 text-xs font-bold"
                        >
                          {asig.grupo}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      {/* Agregado y detalle de todas las canalizaciones del sistema */}
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

        {/* KPIs agregados de canalizaciones */}
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
                  <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
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
                          <span className="text-[11px] text-muted-foreground">Grupo {c.grupo}</span>
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
    </div>
  );
}
