import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardList,
  LogOut,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import type { RiskLevel } from "@/lib/types";
import {
  createCanalizacion,
  getCanalizaciones,
  getGroupStudentsWithSemaforo,
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

const SEMAFORO_META: Record<RiskLevel, { label: string; dot: string; badgeClass: string }> = {
  verde: {
    label: "Verde",
    dot: "bg-emerald-500",
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  amarillo: {
    label: "Amarillo",
    dot: "bg-amber-500",
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  },
  rojo: {
    label: "Rojo",
    dot: "bg-rose-600",
    badgeClass:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

const PRIORIDAD_META: Record<CanalizacionPrioridad, { label: string; badgeClass: string }> = {
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
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
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
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [students, setStudents] = useState<TutorStudentItem[]>([]);
  const [alerts, setAlerts] = useState<AlertaInasistencia[]>([]);
  const [canalizaciones, setCanalizaciones] = useState<CanalizacionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");

  // Modal de canalización
  const [canalizarTarget, setCanalizarTarget] = useState<TutorStudentItem | null>(null);
  const [motivoCanalizacion, setMotivoCanalizacion] = useState("");
  const [prioridadCanalizacion, setPrioridadCanalizacion] =
    useState<CanalizacionPrioridad>("normal");
  const [isSubmittingCanalizacion, setIsSubmittingCanalizacion] = useState(false);

  const selectedAssignment = useMemo(
    () => assignments.find((a) => a.id === selectedAssignmentId) || assignments[0] || null,
    [assignments, selectedAssignmentId],
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

      const activeGroup =
        tutorGroups.find((g) => g.id === selectedAssignmentId) || tutorGroups[0] || null;
      if (activeGroup && !selectedAssignmentId) {
        setSelectedAssignmentId(activeGroup.id);
      }

      const [groupStudents, unreadAlerts, myCanalizaciones] = await Promise.all([
        activeGroup
          ? getGroupStudentsWithSemaforo(
              activeGroup.carrera,
              activeGroup.grupo,
              activeGroup.semestre,
            )
          : Promise.resolve([]),
        getUnreadTutorAlerts(user.id),
        getCanalizaciones({ tutorId: user.id }),
      ]);

      setStudents(groupStudents);
      setAlerts(unreadAlerts);
      setCanalizaciones(myCanalizaciones);
    } catch (err) {
      console.error("Error cargando panel del tutor:", err);
      toast.error("No se pudo actualizar la información del grupo.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.name, user?.carrera, user?.grupo, user?.semestre, selectedAssignmentId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleGroupChange = async (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    const chosen = assignments.find((a) => a.id === assignmentId);
    if (!chosen) return;
    setIsLoading(true);
    try {
      const groupStudents = await getGroupStudentsWithSemaforo(
        chosen.carrera,
        chosen.grupo,
        chosen.semestre,
      );
      setStudents(groupStudents);
    } finally {
      setIsLoading(false);
    }
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

  const handleOpenCanalizarModal = (student: TutorStudentItem) => {
    setCanalizarTarget(student);
    setMotivoCanalizacion("");
    setPrioridadCanalizacion(
      student.nivel === "rojo" ? "urgente" : student.nivel === "amarillo" ? "alta" : "normal",
    );
  };

  const handleSubmitCanalizacion = async () => {
    if (!canalizarTarget || !user?.id) return;
    if (!motivoCanalizacion.trim()) {
      toast.error("Describe brevemente el motivo de la canalización.");
      return;
    }

    setIsSubmittingCanalizacion(true);
    try {
      const res = await createCanalizacion({
        tutor_id: user.id,
        tutor_nombre: user.name,
        estudiante_id: canalizarTarget.id,
        estudiante_nombre: canalizarTarget.nombre,
        folio: canalizarTarget.folio,
        carrera: canalizarTarget.carrera,
        grupo: canalizarTarget.grupo,
        semestre: canalizarTarget.semestre,
        motivo: motivoCanalizacion,
        prioridad: prioridadCanalizacion,
      });

      if (!res.ok) {
        toast.error(res.error || "No se pudo enviar la canalización.");
        return;
      }

      if (res.canalizacion) {
        setCanalizaciones((prev) => [res.canalizacion!, ...prev]);
      }
      toast.success(`Canalización enviada para ${canalizarTarget.nombre}.`);
      setCanalizarTarget(null);
      setMotivoCanalizacion("");
    } finally {
      setIsSubmittingCanalizacion(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((st) => {
      const matchesRisk = riskFilter === "all" || st.nivel === riskFilter;
      const matchesQuery =
        q === "" ||
        st.nombre.toLowerCase().includes(q) ||
        st.matricula.toLowerCase().includes(q) ||
        (st.folio && st.folio.toLowerCase().includes(q));
      return matchesRisk && matchesQuery;
    });
  }, [students, searchQuery, riskFilter]);

  const counts = useMemo(() => {
    return {
      total: students.length,
      verde: students.filter((s) => s.nivel === "verde").length,
      amarillo: students.filter((s) => s.nivel === "amarillo").length,
      rojo: students.filter((s) => s.nivel === "rojo").length,
    };
  }, [students]);

  const scrollToAlerts = () => {
    const el = document.getElementById("tutor-alertas-section");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
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
            {selectedAssignment && (
              <p className="text-xs text-muted-foreground truncate">
                {selectedAssignment.carrera} • Grupo {selectedAssignment.grupo} (
                {selectedAssignment.semestre}º Semestre)
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          {/* Badge rojo con contador de alertas no leídas en el header */}
          <button
            type="button"
            onClick={scrollToAlerts}
            aria-label={`Alertas sin leer: ${alerts.length}`}
            className="relative inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
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
            className="rounded-xl text-xs font-semibold h-9"
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
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2">
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
                className="cursor-pointer gap-2 rounded-xl text-xs font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="size-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="space-y-6 py-6 pb-16">
        {/* Selector de grupo asignado (si el tutor tiene más de uno) */}
        {assignments.length > 1 && (
          <section className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Grupo Asignado Activo
              </p>
              <p className="text-sm font-semibold text-foreground">
                Selecciona el grupo que deseas revisar
              </p>
            </div>
            <select
              value={selectedAssignment?.id || ""}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.carrera} — Grupo {a.grupo} ({a.semestre}º Semestre)
                </option>
              ))}
            </select>
          </section>
        )}

        {/* Resumen numérico del grupo */}
        <section
          aria-label="Resumen del semáforo grupal"
          className="grid grid-cols-2 lg:grid-cols-5 gap-3"
        >
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-muted-foreground">Estudiantes</span>
              <Users className="size-4 text-[#1B198F]" />
            </div>
            <p className="font-numeric mt-2 text-2xl font-bold text-[#1B198F] dark:text-foreground">
              {counts.total}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">En tu grupo asignado</p>
          </div>

          <button
            type="button"
            onClick={() => setRiskFilter((p) => (p === "verde" ? "all" : "verde"))}
            className={`rounded-2xl border p-4 text-left transition-colors cursor-pointer ${
              riskFilter === "verde"
                ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30"
                : "border-border bg-card hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                Verde
              </span>
              <span className="size-2.5 rounded-full bg-emerald-500" />
            </div>
            <p className="font-numeric mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {counts.verde}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Sin riesgo detectado</p>
          </button>

          <button
            type="button"
            onClick={() => setRiskFilter((p) => (p === "amarillo" ? "all" : "amarillo"))}
            className={`rounded-2xl border p-4 text-left transition-colors cursor-pointer ${
              riskFilter === "amarillo"
                ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/30"
                : "border-border bg-card hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">
                Amarillo
              </span>
              <span className="size-2.5 rounded-full bg-amber-500" />
            </div>
            <p className="font-numeric mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">
              {counts.amarillo}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Seguimiento preventivo</p>
          </button>

          <button
            type="button"
            onClick={() => setRiskFilter((p) => (p === "rojo" ? "all" : "rojo"))}
            className={`rounded-2xl border p-4 text-left transition-colors cursor-pointer ${
              riskFilter === "rojo"
                ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/30"
                : "border-border bg-card hover:border-rose-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-rose-700 dark:text-rose-300">
                Rojo
              </span>
              <span className="size-2.5 rounded-full bg-rose-600" />
            </div>
            <p className="font-numeric mt-2 text-2xl font-bold text-rose-700 dark:text-rose-300">
              {counts.rojo}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Atención prioritaria</p>
          </button>

          <button
            type="button"
            onClick={scrollToAlerts}
            className="col-span-2 lg:col-span-1 rounded-2xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20 p-4 text-left hover:border-rose-400 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-rose-700 dark:text-rose-300">
                Alertas
              </span>
              <ShieldAlert className="size-4 text-rose-600" />
            </div>
            <p className="font-numeric mt-2 text-2xl font-bold text-rose-700 dark:text-rose-300">
              {alerts.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Notificaciones sin leer</p>
          </button>
        </section>

        {/* SECCIÓN DE ALERTAS (Inasistencias a citas y niveles rojos) */}
        <section
          id="tutor-alertas-section"
          className="rounded-2xl border border-border bg-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Alertas de Seguimiento e Inasistencia
                </h2>
                <p className="text-xs text-muted-foreground">
                  Avisos automáticos cuando tus estudiantes faltan a cita o presentan nivel rojo.
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
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No tienes alertas pendientes de revisión en este momento.
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.map((alerta) => (
                <div
                  key={alerta.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20 p-3.5"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-rose-300 bg-white dark:bg-card text-rose-700 dark:text-rose-300 text-[10px] font-bold uppercase"
                      >
                        {alerta.tipo_alerta === "inasistencia_repetida"
                          ? "Inasistencia repetida • Urgente"
                          : alerta.tipo_alerta === "no_canalizacion"
                            ? "Tamizaje nivel rojo"
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
                    className="rounded-xl border-[#1B198F]/30 text-[#1B198F] dark:text-indigo-300 hover:bg-[#1B198F]/10 text-xs font-semibold shrink-0"
                  >
                    <CheckCircle2 className="mr-1.5 size-3.5" />
                    Marcar como leída
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* LISTA DE ESTUDIANTES Y SEMÁFORO SIMPLIFICADO */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Estudiantes del Grupo y Semáforo Simplificado
              </h2>
              <p className="text-xs text-muted-foreground">
                Por confidencialidad clínica solo se muestra el nivel de semáforo (sin puntajes ni
                conversaciones).
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, matrícula o folio..."
                  className="pl-9 rounded-xl text-xs h-9"
                />
              </div>
              {riskFilter !== "all" && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setRiskFilter("all")}
                  className="text-xs text-[#1B198F] font-semibold"
                >
                  Ver todos
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-bold">Estudiante</TableHead>
                  <TableHead className="text-xs font-bold">Matrícula / Folio</TableHead>
                  <TableHead className="text-xs font-bold">Grupo</TableHead>
                  <TableHead className="text-xs font-bold">Semáforo</TableHead>
                  <TableHead className="text-xs font-bold text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-xs text-muted-foreground"
                    >
                      No hay estudiantes que coincidan con el filtro aplicado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((st) => {
                    const meta = SEMAFORO_META[st.nivel];
                    return (
                      <TableRow key={st.id}>
                        <TableCell className="font-semibold text-xs sm:text-sm text-foreground">
                          <div className="flex items-center gap-2.5">
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 text-xs font-bold">
                              {st.iniciales}
                            </span>
                            <span>{st.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{st.matricula}</div>
                          {st.folio && (
                            <span className="text-[11px] font-semibold text-foreground/80">
                              Folio: {st.folio}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {st.grupo} {st.semestre ? `(${st.semestre}º)` : ""}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${meta.badgeClass} text-xs font-bold`}
                          >
                            <span className={`mr-1.5 size-2 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenCanalizarModal(st)}
                            className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-semibold h-8"
                          >
                            <UserPlus className="mr-1.5 size-3.5" />
                            Canalizar al psicólogo
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* HISTORIAL DE CANALIZACIONES DEL TUTOR */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300">
              <ClipboardList className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Canalizaciones Enviadas a Psicología
              </h2>
              <p className="text-xs text-muted-foreground">
                Seguimiento en tiempo real del estado de tus solicitudes de atención.
              </p>
            </div>
          </div>

          {canalizaciones.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Aún no has enviado canalizaciones al área de psicología.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-bold">Estudiante</TableHead>
                    <TableHead className="text-xs font-bold">Motivo</TableHead>
                    <TableHead className="text-xs font-bold">Prioridad</TableHead>
                    <TableHead className="text-xs font-bold">Estado</TableHead>
                    <TableHead className="text-xs font-bold">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {canalizaciones.map((c) => {
                    const pMeta = PRIORIDAD_META[c.prioridad] || PRIORIDAD_META.normal;
                    const eMeta =
                      ESTADO_CANALIZACION_META[c.estado] || ESTADO_CANALIZACION_META.pendiente;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs font-semibold text-foreground">
                          <div>{c.estudiante_nombre || "Estudiante"}</div>
                          {c.folio && (
                            <span className="text-[11px] text-muted-foreground">{c.folio}</span>
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
                            className={`${pMeta.badgeClass} text-[11px] font-bold`}
                          >
                            {pMeta.label}
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
      </main>

      {/* Modal de Canalización al Psicólogo */}
      <Dialog
        open={canalizarTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCanalizarTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1B198F] dark:text-foreground">
              Canalizar estudiante al psicólogo
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {canalizarTarget
                ? `Estudiante: ${canalizarTarget.nombre} (${canalizarTarget.matricula}) — Grupo ${canalizarTarget.grupo}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="canalizacion-prioridad" className="text-xs font-bold">
                Prioridad de atención
              </Label>
              <select
                id="canalizacion-prioridad"
                value={prioridadCanalizacion}
                onChange={(e) => setPrioridadCanalizacion(e.target.value as CanalizacionPrioridad)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:border-[#1B198F] focus:outline-none"
              >
                <option value="baja">Baja — Orientación preventiva</option>
                <option value="normal">Normal — Seguimiento regular</option>
                <option value="alta">Alta — Atención pronta</option>
                <option value="urgente">Urgente — Prioridad inmediata</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="canalizacion-motivo" className="text-xs font-bold">
                Motivo de canalización
              </Label>
              <Textarea
                id="canalizacion-motivo"
                rows={4}
                value={motivoCanalizacion}
                onChange={(e) => setMotivoCanalizacion(e.target.value)}
                placeholder="Describe brevemente las observaciones académicas o indicadores de alerta..."
                className="rounded-xl text-xs sm:text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCanalizarTarget(null)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSubmittingCanalizacion}
              onClick={handleSubmitCanalizacion}
              className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-semibold"
            >
              <Send className="mr-1.5 size-3.5" />
              {isSubmittingCanalizacion ? "Enviando..." : "Enviar canalización"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
