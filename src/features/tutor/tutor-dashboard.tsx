import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  FolderKanban,
  LogOut,
  RefreshCw,
  Search,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/layout/page-shell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { EquilibraBrand } from "@/components/ui/equilibra-brand";
import { useAuth } from "@/lib/auth-context";
import { BRAND } from "@/lib/branding";
import {
  createCanalizacionesBatch,
  getCanalizaciones,
  getGroupStudents,
  getTutorGroupAssignments,
  getUnreadTutorAlerts,
  markAlertaAsRead,
  type AlertaInasistencia,
  type CanalizacionEstado,
  type CanalizacionPrioridad,
  type CanalizacionRecord,
  type TutorGrupoAssignment,
  type TutorStudentItem,
} from "./tutor-service";

type StudentCanalizacionFilter = "all" | "sin_canalizar" | "canalizadas";

const URGENCIA_OBSERVACION_META: Record<
  CanalizacionPrioridad,
  { label: string; badgeClass: string }
> = {
  baja: {
    label: "Baja",
    badgeClass:
      "border-slate-200 bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  },
  normal: {
    label: "Normal",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  },
  alta: {
    label: "Alta",
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  urgente: {
    label: "Urgente",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

const ESTADO_CANALIZACION_META: Record<CanalizacionEstado, { label: string; badgeClass: string }> =
  {
    pendiente: {
      label: "Pendiente",
      badgeClass:
        "border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    },
    aceptada: {
      label: "Aceptada",
      badgeClass: "border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    },
    completada: {
      label: "Completada",
      badgeClass:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    },
    rechazada: {
      label: "Rechazada",
      badgeClass: "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
    },
  };

function formatFechaCorta(fechaStr?: string | null): string {
  if (!fechaStr) return "Sin registro";
  try {
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return "Reciente";
    return format(d, "dd MMM yyyy, HH:mm", { locale: es });
  } catch {
    return "Reciente";
  }
}

export function TutorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState<TutorGrupoAssignment[]>([]);
  const [studentsByGroup, setStudentsByGroup] = useState<Record<string, TutorStudentItem[]>>({});
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertaInasistencia[]>([]);
  const [canalizaciones, setCanalizaciones] = useState<CanalizacionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros y selección dentro del grupo activo
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudentCanalizacionFilter>("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Modal de canalización por observación del tutor (individual o múltiple)
  const [canalizarTargets, setCanalizarTargets] = useState<TutorStudentItem[]>([]);
  const [motivoCanalizacion, setMotivoCanalizacion] = useState("");
  const [urgenciaObservacion, setUrgenciaObservacion] = useState<CanalizacionPrioridad>("normal");
  const [isSubmittingCanalizacion, setIsSubmittingCanalizacion] = useState(false);

  const activeGroup = useMemo(
    () => assignments.find((a) => a.id === activeGroupId) || null,
    [assignments, activeGroupId],
  );

  const activeStudents = useMemo(
    () => (activeGroup ? studentsByGroup[activeGroup.id] || [] : []),
    [activeGroup, studentsByGroup],
  );

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const tutorGroups = await getTutorGroupAssignments(user.id, {
        name: user.name,
        carrera: user.carrera,
        grupo: user.grupo,
        semestre: user.semestre,
      });
      setAssignments(tutorGroups);

      const [groupStudentPairs, unreadAlerts, myCanalizaciones] = await Promise.all([
        Promise.all(
          tutorGroups.map(async (g) => {
            const list = await getGroupStudents(g.carrera, g.grupo, g.semestre);
            return [g.id, list] as const;
          }),
        ),
        getUnreadTutorAlerts(user.id),
        getCanalizaciones({ tutorId: user.id }),
      ]);

      const nextMap: Record<string, TutorStudentItem[]> = {};
      for (const [id, list] of groupStudentPairs) {
        nextMap[id] = list;
      }

      setStudentsByGroup(nextMap);
      setAlerts(unreadAlerts);
      setCanalizaciones(myCanalizaciones);
    } catch (err) {
      console.error("Error cargando panel del tutor:", err);
      toast.error("No se pudo actualizar la información de los grupos.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.name, user?.carrera, user?.grupo, user?.semestre]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleOpenGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    setSelectedStudentIds([]);
    setSearchQuery("");
    setStatusFilter("all");
  };

  const handleBackToGroups = () => {
    setActiveGroupId(null);
    setSelectedStudentIds([]);
    setSearchQuery("");
    setStatusFilter("all");
  };

  const handleLogout = async () => {
    await logout();
    toast.info("Has cerrado sesión como tutor.");
    navigate({ to: "/login", replace: true });
  };

  const handleMarkAlertRead = async (alertId: string) => {
    await markAlertaAsRead(alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    toast.success("Alerta marcada como leída.");
  };

  // Verifica si el estudiante ya tiene una canalización pendiente
  const hasPendingCanalizacion = useCallback(
    (student: TutorStudentItem): boolean => {
      return canalizaciones.some((c) => c.estado === "pendiente" && c.estudiante_id === student.id);
    },
    [canalizaciones],
  );

  // Cuenta cuántos estudiantes de un grupo tienen canalización registrada (activa/en seguimiento)
  const countCanalizadosInGroup = useCallback(
    (groupStudents: TutorStudentItem[]): number => {
      const studentIdSet = new Set(groupStudents.map((s) => s.id));
      const canalizadosIds = new Set(
        canalizaciones
          .filter((c) => studentIdSet.has(c.estudiante_id) && c.estado !== "rechazada")
          .map((c) => c.estudiante_id),
      );
      return canalizadosIds.size;
    },
    [canalizaciones],
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeStudents.filter((st) => {
      const isCanalizada = hasPendingCanalizacion(st);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "canalizadas" && isCanalizada) ||
        (statusFilter === "sin_canalizar" && !isCanalizada);

      const matchesQuery =
        q === "" || st.nombre.toLowerCase().includes(q) || st.matricula.toLowerCase().includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [activeStudents, searchQuery, statusFilter, hasPendingCanalizacion]);

  const selectableFilteredStudents = useMemo(
    () => filteredStudents.filter((st) => !hasPendingCanalizacion(st)),
    [filteredStudents, hasPendingCanalizacion],
  );

  const selectedStudentsList = useMemo(
    () => activeStudents.filter((st) => selectedStudentIds.includes(st.id)),
    [activeStudents, selectedStudentIds],
  );

  const allSelectableSelected =
    selectableFilteredStudents.length > 0 &&
    selectableFilteredStudents.every((st) => selectedStudentIds.includes(st.id));

  const handleToggleStudentSelection = (student: TutorStudentItem) => {
    if (hasPendingCanalizacion(student)) return;
    setSelectedStudentIds((prev) =>
      prev.includes(student.id) ? prev.filter((id) => id !== student.id) : [...prev, student.id],
    );
  };

  const handleToggleSelectAll = () => {
    if (selectableFilteredStudents.length === 0) return;
    if (allSelectableSelected) {
      const selectableIds = new Set(selectableFilteredStudents.map((s) => s.id));
      setSelectedStudentIds((prev) => prev.filter((id) => !selectableIds.has(id)));
    } else {
      const merged = new Set([
        ...selectedStudentIds,
        ...selectableFilteredStudents.map((s) => s.id),
      ]);
      setSelectedStudentIds(Array.from(merged));
    }
  };

  const handleOpenCanalizarModal = (targets: TutorStudentItem[]) => {
    const elegibles = targets.filter((t) => !hasPendingCanalizacion(t));
    if (elegibles.length === 0) return;

    setCanalizarTargets(elegibles);
    setMotivoCanalizacion("");
    setUrgenciaObservacion("normal");
  };

  const handleSubmitCanalizacion = async () => {
    if (canalizarTargets.length === 0 || !user?.id) return;
    if (!motivoCanalizacion.trim()) {
      toast.error("Describe el motivo de canalización basado en tu observación como tutor.");
      return;
    }

    setIsSubmittingCanalizacion(true);
    try {
      const { created, errors } = await createCanalizacionesBatch({
        tutor_id: user.id,
        tutor_nombre: user.name,
        estudiantes: canalizarTargets,
        motivo: motivoCanalizacion,
        prioridad: urgenciaObservacion,
      });

      if (created.length > 0) {
        setCanalizaciones((prev) => [...created, ...prev]);
        const createdIds = new Set(created.map((c) => c.estudiante_id));
        setSelectedStudentIds((prev) => prev.filter((id) => !createdIds.has(id)));
        toast.success(
          created.length === 1
            ? "1 estudiante canalizado al psicólogo"
            : `${created.length} estudiantes canalizados al psicólogo`,
        );
      }

      if (errors.length > 0) {
        toast.error(`Algunos registros no pudieron enviarse: ${errors[0]}`);
      }

      if (created.length > 0) {
        setCanalizarTargets([]);
        setMotivoCanalizacion("");
      }
    } finally {
      setIsSubmittingCanalizacion(false);
    }
  };

  const activeGroupCounts = useMemo(() => {
    const canalizadas = activeStudents.filter((s) => hasPendingCanalizacion(s)).length;
    return {
      total: activeStudents.length,
      canalizadas,
      sinCanalizar: activeStudents.length - canalizadas,
    };
  }, [activeStudents, hasPendingCanalizacion]);

  const scrollToAlerts = () => {
    if (activeGroupId) {
      setActiveGroupId(null);
      setTimeout(() => {
        document
          .getElementById("tutor-alertas-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return;
    }
    document
      .getElementById("tutor-alertas-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PageShell showAppHeader={false} showBottomNav={false}>
      {/* Cabecera Institucional del Tutor (Azul #1B198F sobrio, sin gradientes) */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 border-b border-border/70">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <EquilibraBrand showText={false} size="sm" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#1B198F] dark:text-indigo-300">
              Tutorías Académicas • {BRAND.fullName}
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#1B198F] dark:text-foreground truncate">
              Panel de Tutoría y Canalización
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {activeGroup
                ? `${activeGroup.carrera} · Grupo ${activeGroup.grupo} · ${activeGroup.semestre}º Sem`
                : `${assignments.length} ${assignments.length === 1 ? "grupo asignado" : "grupos asignados"} activos`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={scrollToAlerts}
            aria-label={`Alertas de inasistencia sin leer: ${alerts.length}`}
            className="relative inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Bell className="size-4 text-[#1B198F] dark:text-indigo-300" />
            <span className="hidden sm:inline">Alertas</span>
            {alerts.length > 0 && (
              <span
                data-testid="tutor-unread-badge"
                className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white"
              >
                {alerts.length}
              </span>
            )}
          </button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            className="rounded-lg text-xs font-semibold h-9"
          >
            <RefreshCw className={`size-3.5 sm:mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#1B198F]"
                aria-label="Menú de tutor"
              >
                <Avatar className="size-9 border-2 border-[#1B198F]/30">
                  <AvatarFallback className="bg-[#1B198F] text-white text-xs font-bold">
                    {user?.name
                      ?.split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("") || "TU"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl p-2">
              <DropdownMenuLabel className="space-y-1 p-2">
                <p className="truncate text-sm font-bold text-foreground">
                  {user?.name || "Tutor TESH"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email || "tutor@tesh.mx"}
                </p>
                <Badge
                  variant="outline"
                  className="mt-1 border-[#1B198F]/30 bg-[#1B198F]/10 text-[10px] font-semibold text-[#1B198F] dark:text-indigo-300"
                >
                  Rol: Tutor de Grupo
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer gap-2 rounded-lg text-xs font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="size-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="space-y-6 py-6 pb-16">
        {!activeGroup ? (
          /* ================================================================
             1. VISTA POR GRUPOS (Tarjetas de grupos asignados al tutor)
             ================================================================ */
          <>
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-lg bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300">
                    <FolderKanban className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Tus Grupos Asignados</h2>
                    <p className="text-xs text-muted-foreground">
                      Selecciona un grupo para consultar la lista académica y canalizar por
                      observación tutorial.
                    </p>
                  </div>
                </div>
              </div>

              {isLoading && assignments.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-44 rounded-xl border border-border bg-card animate-pulse"
                    />
                  ))}
                </div>
              ) : assignments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    No tienes grupos activos asignados actualmente.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Solicita al departamento Directivo la asignación de tus grupos en el sistema.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignments.map((group) => {
                    const groupList = studentsByGroup[group.id] || [];
                    const totalCount = groupList.length;
                    const canalizadosCount = countCanalizadosInGroup(groupList);

                    return (
                      <article
                        key={group.id}
                        className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-[#1B198F]/50"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="inline-flex items-center rounded-md bg-[#1B198F]/10 px-2.5 py-1 text-[11px] font-bold text-[#1B198F] dark:text-indigo-300">
                              Grupo {group.grupo} · {group.semestre}º Sem
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                              <Users className="size-3.5 text-[#1B198F]" />
                              {totalCount} {totalCount === 1 ? "estudiante" : "estudiantes"}
                            </span>
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                            {group.carrera} · Grupo {group.grupo} · {group.semestre}º Sem
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge
                              variant="outline"
                              className="border-[#1B198F]/30 bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 text-xs font-bold"
                            >
                              {canalizadosCount}{" "}
                              {canalizadosCount === 1
                                ? "estudiante canalizado"
                                : "estudiantes canalizados"}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-border/60">
                          <Button
                            type="button"
                            onClick={() => handleOpenGroup(group.id)}
                            className="w-full rounded-lg bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-semibold h-9"
                          >
                            Ver grupo
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SECCIÓN DE ALERTAS DE INASISTENCIA A CITAS */}
            <section
              id="tutor-alertas-section"
              className="rounded-xl border border-border bg-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Alertas de Inasistencia a Citas
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Avisos operativos cuando un estudiante canalizado no acude a su cita
                      programada.
                    </p>
                  </div>
                </div>
                {alerts.length > 0 && (
                  <Badge className="bg-rose-600 text-white text-xs font-bold">
                    {alerts.length} sin leer
                  </Badge>
                )}
              </div>

              {alerts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No tienes alertas de inasistencia pendientes de revisión.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alerts.map((alerta) => (
                    <div
                      key={alerta.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20 p-3.5"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-white dark:bg-card text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase"
                          >
                            {alerta.tipo_alerta === "inasistencia_repetida"
                              ? "Inasistencia repetida"
                              : "Inasistencia a cita"}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {formatFechaCorta(alerta.created_at)}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-foreground">
                          {alerta.mensaje}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAlertRead(alerta.id)}
                        className="rounded-lg border-[#1B198F]/30 text-[#1B198F] dark:text-indigo-300 hover:bg-[#1B198F]/10 text-xs font-semibold shrink-0"
                      >
                        <CheckCircle2 className="mr-1.5 size-3.5" />
                        Marcar como leída
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* HISTORIAL DE CANALIZACIONES DEL TUTOR */}
            <section className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-lg bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300">
                  <ClipboardList className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Canalizaciones Enviadas a Psicología
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Seguimiento administrativo del estado de tus canalizaciones por observación
                    tutorial.
                  </p>
                </div>
              </div>

              {canalizaciones.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Aún no has enviado canalizaciones al área de psicología.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-bold">Estudiante</TableHead>
                        <TableHead className="text-xs font-bold">Motivo (Observación)</TableHead>
                        <TableHead className="text-xs font-bold">Urgencia</TableHead>
                        <TableHead className="text-xs font-bold">Estado</TableHead>
                        <TableHead className="text-xs font-bold">Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {canalizaciones.map((c) => {
                        const uMeta =
                          URGENCIA_OBSERVACION_META[c.prioridad] ||
                          URGENCIA_OBSERVACION_META.normal;
                        const eMeta =
                          ESTADO_CANALIZACION_META[c.estado] || ESTADO_CANALIZACION_META.pendiente;
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="text-xs font-semibold text-foreground">
                              <div className="font-bold text-foreground">
                                {c.estudiante_nombre || "Estudiante TESH"}
                              </div>
                              {c.grupo && (
                                <span className="text-[11px] text-muted-foreground">
                                  Grupo {c.grupo}
                                  {c.semestre ? ` · ${c.semestre}º Sem` : ""}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-sm">
                              <p className="line-clamp-2">{c.motivo}</p>
                              {c.estado === "rechazada" && c.motivo_rechazo && (
                                <p className="mt-1 text-[11px] text-rose-600 font-medium">
                                  Motivo de rechazo: {c.motivo_rechazo}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`${uMeta.badgeClass} text-[11px] font-bold`}
                              >
                                {uMeta.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`${eMeta.badgeClass} text-[11px] font-bold`}
                              >
                                {eMeta.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatFechaCorta(c.created_at)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </>
        ) : (
          /* ================================================================
             2. VISTA DE LISTA DE ESTUDIANTES POR GRUPO (DATOS ACADÉMICOS)
             ================================================================ */
          <section className="space-y-5">
            {/* Barra superior de navegación de regreso y contexto del grupo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start sm:items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBackToGroups}
                  className="rounded-lg text-xs font-semibold h-9 shrink-0"
                >
                  <ArrowLeft className="mr-1.5 size-3.5" />
                  Volver a grupos
                </Button>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#1B198F] dark:text-foreground">
                    {activeGroup.carrera} · Grupo {activeGroup.grupo} · {activeGroup.semestre}º Sem
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Listado académico del grupo. Las canalizaciones se fundamentan en observación
                    tutorial directa.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-foreground">
                  Total: {activeGroupCounts.total}
                </span>
                <span className="rounded-md border border-[#1B198F]/30 bg-[#1B198F]/10 px-2.5 py-1 text-[#1B198F] dark:text-indigo-300">
                  Canalizadas: {activeGroupCounts.canalizadas}
                </span>
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  Sin canalizar: {activeGroupCounts.sinCanalizar}
                </span>
              </div>
            </div>

            {/* Contenedor de filtros, selección múltiple y tabla */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              {/* Filtros por estado de canalización y búsqueda por nombre o matrícula */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div
                  role="group"
                  aria-label="Filtrar por estado de canalización"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {(
                    [
                      { key: "all", label: "Todos" },
                      { key: "sin_canalizar", label: "Sin canalizar" },
                      { key: "canalizadas", label: "Canalizadas" },
                    ] as const
                  ).map((tab) => {
                    const isActive = statusFilter === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setStatusFilter(tab.key)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? "border-[#1B198F] bg-[#1B198F] text-white"
                            : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full lg:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o matrícula..."
                    className="pl-9 rounded-lg text-xs h-9"
                  />
                </div>
              </div>

              {/* Barra superior de selección múltiple */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/30 px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectableFilteredStudents.length === 0}
                    onClick={handleToggleSelectAll}
                    className="rounded-lg text-xs font-semibold h-8 border-[#1B198F]/30 text-[#1B198F] dark:text-indigo-300"
                  >
                    <CheckSquare className="mr-1.5 size-3.5" />
                    {allSelectableSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                  </Button>

                  <span className="text-xs text-muted-foreground">
                    {selectedStudentIds.length > 0
                      ? `${selectedStudentIds.length} seleccionado(s)`
                      : "Marca uno o varios estudiantes para canalizar"}
                  </span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={selectedStudentsList.length === 0}
                  onClick={() => handleOpenCanalizarModal(selectedStudentsList)}
                  className="rounded-lg bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-semibold h-8 disabled:opacity-50"
                >
                  <UserPlus className="mr-1.5 size-3.5" />
                  Canalizar seleccionados ({selectedStudentsList.length})
                </Button>
              </div>

              {/* Tabla de estudiantes del grupo */}
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-11 text-center">
                        <span className="sr-only">Seleccionar</span>
                      </TableHead>
                      <TableHead className="text-xs font-bold">Nombre completo</TableHead>
                      <TableHead className="text-xs font-bold">Matrícula</TableHead>
                      <TableHead className="text-xs font-bold">
                        Carrera / Grupo / Semestre
                      </TableHead>
                      <TableHead className="text-xs font-bold">Estado de canalización</TableHead>
                      <TableHead className="text-xs font-bold text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-xs text-muted-foreground"
                        >
                          No hay estudiantes en este grupo que coincidan con el filtro aplicado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((st) => {
                        const isPending = hasPendingCanalizacion(st);
                        const isChecked = !isPending && selectedStudentIds.includes(st.id);

                        return (
                          <TableRow
                            key={st.id}
                            className={isChecked ? "bg-[#1B198F]/[0.04]" : undefined}
                          >
                            <TableCell className="text-center">
                              <Checkbox
                                checked={isChecked}
                                disabled={isPending}
                                onCheckedChange={() => handleToggleStudentSelection(st)}
                                aria-label={`Seleccionar estudiante ${st.nombre}`}
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-xs sm:text-sm text-foreground">
                              {st.nombre}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-foreground/85">
                              {st.matricula}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {st.carrera} · Grupo {st.grupo} · {st.semestre}º Sem
                            </TableCell>
                            <TableCell>
                              {isPending ? (
                                <Badge
                                  variant="outline"
                                  className="border-[#1B198F]/30 bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 text-xs font-bold"
                                >
                                  Canalizada
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 text-xs font-semibold"
                                >
                                  Sin canalizar
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                disabled={isPending}
                                onClick={() => handleOpenCanalizarModal([st])}
                                className="rounded-lg bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-semibold h-8 disabled:opacity-50"
                              >
                                <UserPlus className="mr-1.5 size-3.5" />
                                Canalizar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modal de Canalización por Observación del Tutor (Individual / Selectiva) */}
      <Dialog
        open={canalizarTargets.length > 0}
        onOpenChange={(open) => {
          if (!open && !isSubmittingCanalizacion) {
            setCanalizarTargets([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1B198F] dark:text-foreground">
              {canalizarTargets.length === 1
                ? "Canalizar estudiante al psicólogo"
                : `Canalizar ${canalizarTargets.length} estudiantes al psicólogo`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registra una solicitud basada exclusivamente en tu observación académica y conductual
              como tutor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Lista de estudiantes seleccionados para confirmar */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                Estudiantes seleccionados ({canalizarTargets.length})
              </Label>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2.5 space-y-1.5">
                {canalizarTargets.map((target) => (
                  <div
                    key={target.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-semibold text-foreground">{target.nombre}</span>
                    <span className="font-mono text-muted-foreground">{target.matricula}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="canalizacion-urgencia" className="text-xs font-bold">
                Urgencia de la observación
              </Label>
              <select
                id="canalizacion-urgencia"
                value={urgenciaObservacion}
                onChange={(e) => setUrgenciaObservacion(e.target.value as CanalizacionPrioridad)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
              >
                <option value="baja">Baja — Seguimiento preventivo en tutoría</option>
                <option value="normal">Normal — Observación académica o conductual</option>
                <option value="alta">Alta — Cambios notorios o inasistencias recientes</option>
                <option value="urgente">Urgente — Situación observada de atención pronta</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="canalizacion-motivo" className="text-xs font-bold">
                Describe el motivo de canalización basado en tu observación como tutor (no en datos
                clínicos): <span className="text-rose-600">*</span>
              </Label>
              <Textarea
                id="canalizacion-motivo"
                rows={4}
                required
                value={motivoCanalizacion}
                onChange={(e) => setMotivoCanalizacion(e.target.value)}
                placeholder="Ej. Cambio de conducta, inasistencias frecuentes, bajo rendimiento o comentarios expresados en clase..."
                className="rounded-lg text-xs sm:text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmittingCanalizacion}
              onClick={() => setCanalizarTargets([])}
              className="rounded-lg text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSubmittingCanalizacion || !motivoCanalizacion.trim()}
              onClick={handleSubmitCanalizacion}
              className="rounded-lg bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-semibold"
            >
              <Send className="mr-1.5 size-3.5" />
              {isSubmittingCanalizacion ? "Enviando..." : "Confirmar canalización"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
