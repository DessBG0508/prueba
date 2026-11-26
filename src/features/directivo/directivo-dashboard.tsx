import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  BatteryMedium,
  BedDouble,
  BookOpen,
  Brain,
  CalendarCheck2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  Lock,
  LogOut,
  PieChart as PieChartIcon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EquilibraBrand } from "@/components/ui/equilibra-brand";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AjustesModal } from "@/components/settings/ajustes-modal";
import { useAuth } from "@/lib/auth-context";
import {
  fetchUltimosBloques,
  verificarCadenaAuditoria,
  type AuditBlock,
  type VerificationResult,
} from "@/lib/blockchain-audit";
import { BRAND } from "@/lib/branding";
import {
  TESH_CAREERS,
  getDirectivoInstitutionalStats,
  getDirectivoKPIs,
  getSemesterChartData,
  type DirectivoInstitutionalStats,
  type TeshCareer,
} from "@/lib/directivo-data";

type DirectivoSidebarSection = "dashboard" | "metricas" | "auditoria";

const SIDEBAR_ITEMS: Array<{
  id: DirectivoSidebarSection;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Resumen estratégico e indicadores globales",
    icon: LayoutDashboard,
  },
  {
    id: "metricas",
    label: "Métricas",
    description: "Análisis porcentual por carrera y semestre",
    icon: BarChart3,
  },
  {
    id: "auditoria",
    label: "Auditoría",
    description: "Trazabilidad criptográfica e integridad de datos",
    icon: ShieldCheck,
  },
];

export function DirectivoDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [activeSection, setActiveSection] = useState<DirectivoSidebarSection>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState<TeshCareer | "all">("all");

  // Estadísticas agregadas (sin nombres ni datos clínicos)
  const [institutionalStats, setInstitutionalStats] = useState<DirectivoInstitutionalStats>(() => {
    const base = getDirectivoKPIs("all");
    return {
      totalTamizados: base.totalSamples,
      pctVerde: base.pctVerde,
      pctAmarillo: base.pctAmarillo,
      pctRojo: base.pctRojo,
      totalCanalizaciones: 3,
      citasAgendadas: 2,
      citasCompletadas: 0,
      recursosPublicados: 8,
    };
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Datos de Auditoría embebidos para el Directivo
  const [auditBlocks, setAuditBlocks] = useState<AuditBlock[]>([]);
  const [totalAuditBlocks, setTotalAuditBlocks] = useState(0);
  const [lastAuditHash, setLastAuditHash] = useState("");
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [verificacion, setVerificacion] = useState<VerificationResult | null>(null);
  const [isVerifying, startVerifyTransition] = useTransition();

  const kpis = useMemo(() => getDirectivoKPIs(selectedCareer), [selectedCareer]);
  const semesterData = useMemo(() => getSemesterChartData(selectedCareer), [selectedCareer]);

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const stats = await getDirectivoInstitutionalStats(selectedCareer);
      setInstitutionalStats(stats);
    } finally {
      setIsLoadingStats(false);
    }
  }, [selectedCareer]);

  const loadAudit = useCallback(async () => {
    setIsLoadingAudit(true);
    try {
      const res = await fetchUltimosBloques(12);
      setAuditBlocks(res.bloques);
      setTotalAuditBlocks(res.total);
      setLastAuditHash(res.ultimoHash);
    } catch {
      toast.error("No se pudieron cargar los registros de auditoría.");
    } finally {
      setIsLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeSection === "auditoria" && auditBlocks.length === 0) {
      loadAudit();
    }
  }, [activeSection, auditBlocks.length, loadAudit]);

  const handleVerifyChain = () => {
    startVerifyTransition(async () => {
      try {
        const res = await verificarCadenaAuditoria(auditBlocks);
        setVerificacion(res);
        if (res.valida) {
          toast.success("Cadena de auditoría verificada: integridad válida.");
        } else {
          toast.error(res.error || "Discrepancia detectada en la cadena.");
        }
      } catch {
        toast.error("Error verificando la integridad de la cadena.");
      }
    });
  };

  const handleLogout = async () => {
    await logout();
    toast.info("Has cerrado sesión.");
    navigate({ to: "/login", replace: true });
  };

  const donutData = useMemo(
    () => [
      { name: "Nivel Verde (Estable)", value: institutionalStats.pctVerde, color: "#10B981" },
      {
        name: "Nivel Amarillo (Seguimiento)",
        value: institutionalStats.pctAmarillo,
        color: "#F59E0B",
      },
      { name: "Nivel Rojo (Prioritario)", value: institutionalStats.pctRojo, color: "#EF4444" },
    ],
    [institutionalStats],
  );

  const initials =
    user?.name
      ?.split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DIR";

  const activeNavMeta = SIDEBAR_ITEMS.find((item) => item.id === activeSection) || SIDEBAR_ITEMS[0];

  const getCareerTitle = () => {
    if (selectedCareer === "all") return "Todas las Carreras del Campus";
    return selectedCareer;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar del Directivo: SOLO Dashboard, Métricas, Auditoría */}
      <aside
        aria-label="Navegación del panel directivo"
        className={`hidden md:flex fixed top-0 bottom-0 left-0 z-30 flex-col justify-between border-r border-border/80 bg-card/95 backdrop-blur-xl transition-all duration-300 ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div>
          <div className="flex h-16 items-center justify-between border-b border-border/70 px-3 sm:px-4">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <EquilibraBrand showText={false} size="sm" />
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <span className="font-display block text-sm font-bold tracking-tight text-foreground truncate">
                    {BRAND.name}
                  </span>
                  <span className="block text-[10px] font-semibold text-muted-foreground truncate">
                    Dirección Académica
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </button>
          </div>

          <nav className="space-y-1.5 p-3" aria-label="Secciones directivas">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-[#1B198F] text-white shadow-xs"
                      : "text-muted-foreground hover:bg-[#1B198F]/10 hover:text-foreground"
                  } ${isSidebarCollapsed ? "justify-center px-2" : ""}`}
                >
                  <Icon
                    className={`size-4.5 shrink-0 ${
                      isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  {!isSidebarCollapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border/70 p-3 space-y-2">
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 p-2">
              <Avatar className="size-8.5 rounded-lg border border-border/60">
                <AvatarFallback className="bg-[#1B198F]/10 font-bold text-xs text-[#1B198F] dark:text-indigo-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 truncate">
                <p className="truncate text-xs font-bold leading-tight text-foreground">
                  {user?.name || "Jefatura de Carrera"}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">Directivo TESH</p>
              </div>
              <ThemeToggle className="size-7" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <Avatar className="size-8 rounded-lg border border-border/60">
                <AvatarFallback className="bg-[#1B198F]/10 font-bold text-[11px] text-[#1B198F] dark:text-indigo-300">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ThemeToggle className="size-7" />
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            aria-label="Cerrar sesión institucional"
            className={`w-full rounded-xl text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8.5 transition-colors ${
              isSidebarCollapsed ? "justify-center px-0" : "justify-start px-2.5 gap-2"
            }`}
          >
            <LogOut className="size-4 shrink-0" />
            {!isSidebarCollapsed && <span>Cerrar sesión</span>}
          </Button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div
        className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        {/* Encabezado Institucional Directivo */}
        <header className="bg-[#1B198F] text-white border-b border-white/15 shadow-sm">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/80">
                <GraduationCap className="size-3.5" />
                <span>Dirección Académica y Jefaturas • {BRAND.fullName}</span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
                Panel Directivo — {activeNavMeta.label}
              </h1>
              <p className="text-xs text-white/80">{activeNavMeta.description}</p>
            </div>

            <div className="flex items-center gap-2.5">
              <AjustesModal
                rol="directivo"
                className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 [&_svg]:text-white"
              />
              <ThemeToggle className="border-white/25 bg-white/10 text-white hover:bg-white/20" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Menú de directivo"
                    className="flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 p-1 pr-3 transition-colors cursor-pointer"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-white text-[#1B198F] font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-xs font-semibold text-white truncate max-w-36">
                      {user?.name || "Jefatura"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
                  <DropdownMenuLabel className="space-y-1 p-2">
                    <p className="truncate text-sm font-bold text-foreground">
                      {user?.name || "Jefatura de Carrera"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.email || "jefatura@tesh.mx"}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-[#1B198F]/30 bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 text-[10px] font-bold"
                    >
                      Directivo / Estadísticas Estratégicas
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer gap-2 rounded-xl text-xs font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <LogOut className="size-4" />
                    <span>Cerrar sesión institucional</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Navegación móvil (<md) */}
          <nav
            aria-label="Secciones directivas móvil"
            className="md:hidden border-t border-white/15 px-4 py-2.5 flex items-center gap-2 overflow-x-auto"
          >
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? "bg-white text-[#1B198F]"
                      : "bg-white/10 text-white/90 hover:bg-white/20"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 pb-16 space-y-6">
          {/* Selector de Carrera para Dashboard y Métricas */}
          {activeSection !== "auditoria" && (
            <section
              aria-labelledby="career-selector-heading"
              className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <GraduationCap className="size-4 text-[#1B198F] dark:text-indigo-300" />
                  <h2
                    id="career-selector-heading"
                    className="text-sm font-bold text-foreground uppercase tracking-wide"
                  >
                    Segmentación Estratégica por Carrera
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cifras estrictamente agregadas y anónimas para planeación institucional.
                </p>
              </div>

              <div className="w-full sm:w-auto flex flex-wrap items-center gap-2.5">
                <label htmlFor="career-select" className="sr-only">
                  Seleccionar Carrera
                </label>
                <div className="relative w-full sm:w-80">
                  <select
                    id="career-select"
                    value={selectedCareer}
                    onChange={(e) => setSelectedCareer(e.target.value as TeshCareer | "all")}
                    className="w-full appearance-none rounded-xl border border-border/80 bg-background px-3.5 py-2.5 pr-9 text-xs sm:text-sm font-semibold text-foreground shadow-xs transition-colors hover:border-[#1B198F]/50 focus:border-[#1B198F] focus:outline-none"
                  >
                    <option value="all">Todas las Carreras (Vista Institucional)</option>
                    <optgroup label="Carreras TESH">
                      {TESH_CAREERS.map((career) => (
                        <option key={career} value={career}>
                          {career}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadStats}
                  className="rounded-xl text-xs font-semibold h-10"
                >
                  <RefreshCw
                    className={`mr-1.5 size-3.5 ${isLoadingStats ? "animate-spin" : ""}`}
                  />
                  Actualizar
                </Button>
              </div>
            </section>
          )}

          {/* SECCIÓN 1: DASHBOARD ESTRATÉGICO */}
          {activeSection === "dashboard" && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase text-[#1B198F] dark:text-indigo-300 tracking-wider">
                    Panorama Estratégico Institucional
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                    {getCareerTitle()}
                  </h2>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-card border border-border/60 px-3 py-1.5 shadow-xs">
                  {kpis.weeklyTrendPercent >= 0 ? (
                    <TrendingUp className="size-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="size-4 text-amber-500" />
                  )}
                  <span className="text-xs font-bold text-foreground">
                    {kpis.weeklyTrendPercent >= 0
                      ? `+${kpis.weeklyTrendPercent}%`
                      : `${kpis.weeklyTrendPercent}%`}
                  </span>
                  <span className="text-[11px] text-muted-foreground">vs. semana anterior</span>
                </div>
              </div>

              {/* KPIs Estratégicos Agregados (SIN nombres, SIN datos clínicos) */}
              <section
                aria-label="Indicadores estratégicos agregados"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
              >
                {/* a) Total estudiantes tamizados */}
                <div className="rounded-2xl border border-border border-l-4 border-l-[#1B198F] bg-card p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Estudiantes Tamizados
                    </span>
                    <div className="grid size-8 place-items-center rounded-xl bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300">
                      <Users className="size-4" />
                    </div>
                  </div>
                  <p className="font-numeric text-3xl sm:text-4xl font-bold text-[#1B198F] dark:text-foreground">
                    {institutionalStats.totalTamizados}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Evaluaciones anónimas agregadas
                  </p>
                </div>

                {/* c) Total de canalizaciones (solo número, sin nombres) */}
                <div className="rounded-2xl border border-border border-l-4 border-l-amber-500 bg-card p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Total Canalizaciones
                    </span>
                    <div className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                      <GitBranch className="size-4" />
                    </div>
                  </div>
                  <p className="font-numeric text-3xl sm:text-4xl font-bold text-foreground">
                    {institutionalStats.totalCanalizaciones}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Conteo agregado sin identidades individuales
                  </p>
                </div>

                {/* d) Total citas agendadas / completadas */}
                <div className="rounded-2xl border border-border border-l-4 border-l-emerald-500 bg-card p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Citas Agendadas / Completadas
                    </span>
                    <div className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                      <CalendarCheck2 className="size-4" />
                    </div>
                  </div>
                  <p className="font-numeric text-3xl sm:text-4xl font-bold text-foreground">
                    {institutionalStats.citasAgendadas}
                    <span className="text-base font-semibold text-muted-foreground ml-1.5">
                      / {institutionalStats.citasCompletadas}
                    </span>
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Agendadas activas vs. sesiones completadas
                  </p>
                </div>

                {/* e) Total de recursos publicados */}
                <div className="rounded-2xl border border-border border-l-4 border-l-indigo-500 bg-card p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Recursos Publicados
                    </span>
                    <div className="grid size-8 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                      <BookOpen className="size-4" />
                    </div>
                  </div>
                  <p className="font-numeric text-3xl sm:text-4xl font-bold text-foreground">
                    {institutionalStats.recursosPublicados}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Guías, ejercicios y material psicoeducativo activo
                  </p>
                </div>
              </section>

              {/* b) Tarjetas % Verde / % Amarillo / % Rojo */}
              <section
                aria-label="Porcentajes de distribución por nivel"
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
              >
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-foreground">Nivel Verde</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Estable y sin indicadores de alerta
                    </p>
                  </div>
                  <span className="font-numeric text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {institutionalStats.pctVerde}%
                  </span>
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-foreground">Nivel Amarillo</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Seguimiento preventivo sugerido
                    </p>
                  </div>
                  <span className="font-numeric text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {institutionalStats.pctAmarillo}%
                  </span>
                </div>

                <div className="rounded-2xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-rose-500" />
                      <span className="text-xs font-bold text-foreground">Nivel Rojo</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Atención prioritaria institucional
                    </p>
                  </div>
                  <span className="font-numeric text-3xl font-bold text-rose-600 dark:text-rose-400">
                    {institutionalStats.pctRojo}%
                  </span>
                </div>
              </section>

              {/* f) Gráficas Recharts: Donut (% Rojo / Amarillo / Verde) + Barras (Bienestar por Semestre) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Donut Chart */}
                <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <PieChartIcon className="size-4 text-[#1B198F] dark:text-indigo-300" />
                        <h3 className="text-base font-bold text-foreground">
                          Distribución Porcentual de Riesgo
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Proporción global Verde / Amarillo / Rojo (sin conteos nominales)
                      </p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={88}
                            paddingAngle={3}
                          >
                            {donutData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val: number) => [`${val}%`, "Proporción"]}
                            contentStyle={{
                              borderRadius: "0.75rem",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                        Cargando gráfica...
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
                    {donutData.map((d) => (
                      <span key={d.name} className="inline-flex items-center gap-1.5 font-medium">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        {d.name.split(" ")[1]} ({d.value}%)
                      </span>
                    ))}
                  </div>
                </section>

                {/* Bar Chart */}
                <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="size-4 text-[#1B198F] dark:text-indigo-300" />
                        <h3 className="text-base font-bold text-foreground">
                          Bienestar Agregado por Semestre (1º–9º)
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Índice promedio de cohorte en escala 1.0 a 5.0
                      </p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    {isMounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={semesterData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                        >
                          <XAxis
                            dataKey="semesterLabel"
                            stroke="currentColor"
                            className="text-[11px] text-muted-foreground"
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 5]}
                            ticks={[1, 2, 3, 4, 5]}
                            stroke="currentColor"
                            className="text-[11px] text-muted-foreground"
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(val: number) => [`${val.toFixed(1)} / 5.0`, "Bienestar"]}
                            contentStyle={{
                              borderRadius: "0.75rem",
                              fontSize: "12px",
                            }}
                          />
                          <Bar dataKey="bienestarScore" radius={[8, 8, 0, 0]} maxBarSize={42}>
                            {semesterData.map((entry, idx) => (
                              <Cell
                                key={`sem-bar-${idx}`}
                                fill={
                                  entry.bienestarScore >= 4.0
                                    ? "#10B981"
                                    : entry.bienestarScore >= 3.3
                                      ? "#1B198F"
                                      : "#6857E4"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                        Cargando gráfica...
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}

          {/* SECCIÓN 2: MÉTRICAS DETALLADAS DE COHORTE (SIN NOMBRES NI DATOS CLÍNICOS) */}
          {activeSection === "metricas" && (
            <>
              <section
                aria-label="Indicadores clave de bienestar"
                className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
              >
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Ánimo Promedio
                    </span>
                    <Brain className="size-4 text-[#1B198F] dark:text-indigo-300" />
                  </div>
                  <p className="font-numeric text-3xl font-bold text-[#1B198F] dark:text-foreground">
                    {kpis.avgAnimo.toFixed(1)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">/ 5</span>
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[#1B198F]"
                      style={{ width: `${(kpis.avgAnimo / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Sueño Promedio
                    </span>
                    <BedDouble className="size-4 text-emerald-600" />
                  </div>
                  <p className="font-numeric text-3xl font-bold text-foreground">
                    {kpis.avgSueno.toFixed(1)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">h / día</span>
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, (kpis.avgSueno / 9) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Estrés Promedio
                    </span>
                    <CircleGauge className="size-4 text-amber-600" />
                  </div>
                  <p className="font-numeric text-3xl font-bold text-foreground">
                    {kpis.avgEstres.toFixed(1)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">/ 5</span>
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${(kpis.avgEstres / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Energía Promedio
                    </span>
                    <BatteryMedium className="size-4 text-indigo-600" />
                  </div>
                  <p className="font-numeric text-3xl font-bold text-foreground">
                    {kpis.avgEnergia.toFixed(1)}
                    <span className="text-xs font-normal text-muted-foreground ml-1">/ 5</span>
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(kpis.avgEnergia / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </section>

              {/* Barra segmentada + comparativo por semestre */}
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Proporción de Riesgo en {getCareerTitle()}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Distribución porcentual agregada ({kpis.totalSamples} muestras anónimas)
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">
                    Sin datos individuales
                  </Badge>
                </div>

                <div className="h-4 w-full overflow-hidden rounded-full bg-muted flex">
                  <div
                    className="bg-emerald-500 transition-all duration-500"
                    style={{ width: `${kpis.pctVerde}%` }}
                  />
                  <div
                    className="bg-amber-400 transition-all duration-500"
                    style={{ width: `${kpis.pctAmarillo}%` }}
                  />
                  <div
                    className="bg-rose-500 transition-all duration-500"
                    style={{ width: `${kpis.pctRojo}%` }}
                  />
                </div>

                <div className="h-72 w-full pt-2">
                  {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={semesterData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                      >
                        <XAxis
                          dataKey="semesterLabel"
                          stroke="currentColor"
                          className="text-[11px] text-muted-foreground"
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 5]}
                          ticks={[1, 2, 3, 4, 5]}
                          stroke="currentColor"
                          className="text-[11px] text-muted-foreground"
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(val: number) => [`${val.toFixed(1)} / 5.0`, "Bienestar"]}
                          contentStyle={{ borderRadius: "0.75rem", fontSize: "12px" }}
                        />
                        <Bar dataKey="bienestarScore" radius={[8, 8, 0, 0]} maxBarSize={48}>
                          {semesterData.map((entry, index) => (
                            <Cell
                              key={`metric-cell-${index}`}
                              fill={
                                entry.bienestarScore >= 4.0
                                  ? "#10B981"
                                  : entry.bienestarScore >= 3.3
                                    ? "#1B198F"
                                    : "#6857E4"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : null}
                </div>
              </section>
            </>
          )}

          {/* SECCIÓN 3: AUDITORÍA INSTITUCIONAL (CERO DATOS CLÍNICOS) */}
          {activeSection === "auditoria" && (
            <section className="space-y-5">
              <div className="rounded-2xl border border-[#1B198F]/25 bg-[#1B198F]/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300">
                    <Lock className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-sm sm:text-base font-bold text-foreground">
                      Auditoría Criptográfica de Integridad (Sin Datos Clínicos)
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Verifica la integridad de los registros institucionales mediante hashes
                      SHA-256 encadenados. No muestra nombres, diagnósticos ni expedientes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoadingAudit}
                    onClick={loadAudit}
                    className="rounded-xl text-xs font-semibold"
                  >
                    <RefreshCw
                      className={`mr-1.5 size-3.5 ${isLoadingAudit ? "animate-spin" : ""}`}
                    />
                    Actualizar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isVerifying || auditBlocks.length === 0}
                    onClick={handleVerifyChain}
                    className="rounded-xl bg-[#1B198F] hover:bg-[#1B198F]/90 text-white text-xs font-bold"
                  >
                    <ShieldCheck className="mr-1.5 size-3.5" />
                    {isVerifying ? "Verificando..." : "Verificar cadena"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground">
                    Bloques registrados
                  </span>
                  <p className="font-numeric text-2xl font-bold text-[#1B198F] dark:text-foreground mt-1">
                    {totalAuditBlocks}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground">
                    Último hash
                  </span>
                  <p className="font-mono text-xs font-semibold text-foreground mt-2 truncate">
                    {lastAuditHash || "Sin registros"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground">
                    Estado de verificación
                  </span>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {verificacion ? (
                      verificacion.valida ? (
                        <Badge className="bg-emerald-600 text-white text-xs font-bold">
                          Cadena válida ({verificacion.bloquesVerificados} bloques)
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs font-bold">
                          <ShieldAlert className="mr-1 size-3.5" />
                          Alerta de integridad
                        </Badge>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">Pendiente de verificar</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-xs font-bold">Bloque</TableHead>
                      <TableHead className="text-xs font-bold">Evento / Operación</TableHead>
                      <TableHead className="text-xs font-bold">Hash SHA-256</TableHead>
                      <TableHead className="text-xs font-bold">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditBlocks.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-xs text-muted-foreground"
                        >
                          {isLoadingAudit
                            ? "Cargando bloques de auditoría..."
                            : "No hay bloques registrados."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditBlocks.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs font-bold">#{b.indice}</TableCell>
                          <TableCell className="text-xs font-semibold text-foreground">
                            {b.accion}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {b.hash_actual ? `${b.hash_actual.slice(0, 22)}...` : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {b.timestamp ? new Date(b.timestamp).toLocaleString("es-MX") : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          {/* Nota de confidencialidad permanente */}
          <footer className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex items-start gap-3.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 mt-0.5">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-foreground">
                Garantía de Confidencialidad Estudiantil TESH
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Datos estrictamente agregados y anónimos. El perfil Directivo no tiene acceso a
                nombres individuales, matrículas, expedientes clínicos ni conversaciones.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
