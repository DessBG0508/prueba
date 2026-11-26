import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LogOut,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
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
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AjustesModal } from "@/components/settings/ajustes-modal";
import { useAuth } from "@/lib/auth-context";
import { BRAND } from "@/lib/branding";
import { TutoresAsignacionPanel, type PanelTab } from "./tutores-asignacion-panel";

const SIDEBAR_ITEMS: Array<{
  id: PanelTab;
  label: string;
  description: string;
  icon: typeof UserPlus;
}> = [
  {
    id: "asignaciones",
    label: "Asignar tutores",
    description: "Periodos semestrales y grilla masiva",
    icon: UserPlus,
  },
  {
    id: "canalizaciones",
    label: "Canalizaciones",
    description: "Seguimiento sin datos clínicos",
    icon: ClipboardList,
  },
  {
    id: "estudiantes",
    label: "Estudiantes",
    description: "Búsqueda y cambios por recursamiento",
    icon: Users,
  },
];

export function CoordinadorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<PanelTab>("asignaciones");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.info("Has cerrado sesión.");
    navigate({ to: "/login", replace: true });
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "RT";

  const activeNavMeta = SIDEBAR_ITEMS.find((item) => item.id === activeSection) || SIDEBAR_ITEMS[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar fijo institucional en desktop */}
      <aside
        aria-label="Navegación del panel de coordinación"
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
                    Coordinación TESH
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

          <nav className="space-y-1.5 p-3" aria-label="Secciones de coordinación">
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
                  {user?.name || "Lic. Roberto Torres"}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">Coordinador TESH</p>
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
            aria-label="Cerrar sesión de coordinación"
            className={`w-full rounded-xl text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8.5 transition-colors ${
              isSidebarCollapsed ? "justify-center px-0" : "justify-start px-2.5 gap-2"
            }`}
          >
            <LogOut className="size-4 shrink-0" />
            {!isSidebarCollapsed && <span>Cerrar sesión</span>}
          </Button>
        </div>
      </aside>

      {/* Área principal con Header azul institucional #1B198F */}
      <div
        className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        <header className="bg-[#1B198F] text-white border-b border-white/15 shadow-sm">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/80">
                <Building2 className="size-3.5" />
                <span>Coordinación Académica y Tutorías • {BRAND.fullName}</span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
                Panel de Coordinación — {activeNavMeta.label}
              </h1>
              <p className="text-xs text-white/80">{activeNavMeta.description}</p>
            </div>

            <div className="flex items-center gap-2.5">
              <AjustesModal
                rol="coordinador"
                className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 [&_svg]:text-white"
              />
              <ThemeToggle className="border-white/25 bg-white/10 text-white hover:bg-white/20" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Menú de coordinador"
                    className="flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 p-1 pr-3 transition-colors cursor-pointer"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-white text-[#1B198F] font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-xs font-semibold text-white truncate max-w-36">
                      {user?.name || "Lic. Roberto Torres"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
                  <DropdownMenuLabel className="space-y-1 p-2">
                    <p className="truncate text-sm font-bold text-foreground">
                      {user?.name || "Lic. Roberto Torres"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.email || "demo-coordinador@tesh.mx"}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-[#1B198F]/30 bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300 text-[10px] font-bold"
                    >
                      Rol: Coordinador
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
          </div>

          {/* Navegación móvil (<md) */}
          <nav
            aria-label="Secciones de coordinación móvil"
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
          <TutoresAsignacionPanel
            activeTab={activeSection}
            onTabChange={setActiveSection}
            hideInternalTabs
          />

          <footer className="rounded-2xl border border-[#1B198F]/20 bg-[#1B198F]/5 p-4 flex items-start gap-3">
            <ShieldCheck className="size-5 text-[#1B198F] dark:text-indigo-300 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">
                Privacidad Académica y Operativa (LFPDPPP)
              </p>
              <p className="text-[11px] text-muted-foreground">
                El rol de Coordinación gestiona asignaciones tutoriales, seguimiento operativo de
                canalizaciones y reubicaciones por recursamiento sin acceso a puntajes PHQ-9/GAD-7,
                expedientes ni notas clínicas.
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
