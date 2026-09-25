import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { profileIcons } from "@/config/icons";
import { useAuth } from "@/lib/auth-context";
import { BRAND } from "@/lib/branding";
import { WellbeingStreakCard } from "./wellbeing-streak-card";
import { WellbeingStatsGrid } from "@/features/bienestar/wellbeing-stats-grid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function getInitials(name?: string) {
  if (!name) return "ES";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts[1]?.charAt(0) ?? "";
  if (first && second) return `${first}${second}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "ES";
}

const STAT_ICONS = [
  profileIcons.brain,
  profileIcons.sleep,
  profileIcons.stress,
  profileIcons.energy,
];

const SECURITY_ITEMS = [
  {
    title: "Tus datos están cifrados",
    description:
      "Toda la información y registros de check-in viajan protegidos mediante cifrado en tránsito y reposo.",
    icon: profileIcons.lock,
  },
  {
    title: "Solo tú accedes a tus registros",
    description:
      "A menos que actives voluntariamente el Modo Acompañamiento, tus notas y emociones son 100% privadas.",
    icon: profileIcons.shieldCheck,
  },
  {
    title: "Consentimiento reversible",
    description:
      "Tú tienes el control absoluto: puedes encender o apagar el acompañamiento cuando lo desees.",
    icon: profileIcons.userCheck,
  },
  {
    title: "Acompañamiento sin repercusiones",
    description: `${BRAND.name} es un espacio de cuidado humano. Nunca se comparte con fines académicos ni disciplinarios.`,
    icon: profileIcons.heartPulse,
  },
];

export function PerfilPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Modo Acompañamiento (Consentimiento de supervisión psicológica)
  // /* TODO(Supabase): sincronizar con columna 'modo_acompanamiento' boolean en tabla 'profiles' con RLS */
  const [modoAcompanamiento, setModoAcompanamiento] = useState<boolean>(() => {
    try {
      return localStorage.getItem("equilibra_modo_acompanamiento") === "true";
    } catch {
      return false;
    }
  });

  // Campos de edición visual (Mock en DEMO_MODE)
  const [nombre, setNombre] = useState(user?.name || "Dess Bautista");
  const [email] = useState(user?.email || "dess@tesh.mx");
  const [matricula] = useState(user?.matricula || "202310452");
  const [carrera, setCarrera] = useState("Ingeniería en Sistemas Computacionales");
  const [semestre, setSemestre] = useState("6to Semestre");

  const handleToggleAcompanamiento = (checked: boolean) => {
    setModoAcompanamiento(checked);
    try {
      localStorage.setItem("equilibra_modo_acompanamiento", checked ? "true" : "false");
    } catch (e) {
      console.error("Error al guardar preferencia de acompañamiento", e);
    }

    if (checked) {
      toast.success("Modo Acompañamiento activado", {
        description:
          "El equipo de Bienestar podrá ver tus tamizajes para brindarte orientación oportuna.",
      });
    } else {
      toast.info("Modo Privado activado", {
        description: "Tus registros y check-ins son ahora 100% confidenciales en tu dispositivo.",
      });
    }
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Datos guardados en vista previa", {
      description:
        "En esta versión de demostración los datos de tu cuenta institucional están preconfigurados.",
    });
  };

  const handleConfirmLogout = () => {
    logout();
    toast.success("Has cerrado sesión de forma segura.");
    navigate({ to: "/login", replace: true });
  };

  return (
    <PageShell>
      <main className="mx-auto max-w-4xl space-y-6 pb-20 animate-fade-in">
        {/* 1. HEADER: Avatar, Iniciales, Nombre, Matrícula */}
        <section
          className="ethereal-card relative overflow-hidden p-6 sm:p-8"
          aria-labelledby="perfil-heading"
        >
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            {/* Avatar con gradiente de marca y texto blanco */}
            <div className="relative flex size-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#6857E4] to-[#87FFBD] shadow-float ring-4 ring-card">
              <span className="font-display text-2xl font-bold tracking-tight text-white">
                {getInitials(user?.name)}
              </span>
              <span
                className={`absolute bottom-0 right-0 size-4 rounded-full border-2 border-card ${
                  modoAcompanamiento ? "bg-teal" : "bg-emerald-500"
                }`}
                title={modoAcompanamiento ? "Modo Acompañamiento" : "Conectado"}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1
                  id="perfil-heading"
                  className="font-display text-2xl font-bold text-primary sm:text-3xl truncate"
                >
                  {user?.name || "Estudiante"}
                </h1>
                <Badge
                  variant="outline"
                  className="rounded-xl border-accent/40 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent"
                >
                  Estudiante TESH
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:justify-start">
                <span className="flex items-center gap-1.5">
                  <profileIcons.matricula className="size-3.5 text-accent" />
                  <span className="font-semibold text-foreground">
                    Matrícula: {user?.matricula || "202310452"}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <profileIcons.email className="size-3.5 text-accent" />
                  <span>{user?.email || "dess@tesh.mx"}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. RACHA DE AUTOCUIDADO EMOCIONAL (Estilo Duolingo / TikTok) */}
        <WellbeingStreakCard />

        {/* 3. SECCIONES EN CARDS */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card 1: Mi Bienestar */}
          <section
            className="ethereal-card flex flex-col justify-between p-6 sm:p-7"
            aria-labelledby="bienestar-heading"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-xl bg-teal-soft text-teal">
                    <profileIcons.stats className="size-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal">
                      Últimos 7 días
                    </p>
                    <h2
                      id="bienestar-heading"
                      className="font-display text-lg font-bold text-primary"
                    >
                      Mi bienestar en números
                    </h2>
                  </div>
                </div>
              </div>
              <WellbeingStatsGrid variant="profile" />
            </div>

            <div className="mt-5 rounded-xl bg-mint-soft/80 p-3.5 text-xs text-primary/80 leading-relaxed border border-mint/30">
              <p>
                Tus días no tienen que ser perfectos para contar. Cada pausa y registro es un paso
                hacia tu bienestar.
              </p>
              <div className="mt-2 text-right">
                <Link
                  to="/checkin"
                  className="font-semibold text-teal hover:underline inline-flex items-center gap-1"
                >
                  <span>Registrar nuevo check-in</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Card 2: Modo Privado / Modo Acompañamiento (Consentimiento) */}
          <section
            className="ethereal-card flex flex-col justify-between p-6 sm:p-7"
            aria-labelledby="acompanamiento-heading"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-xl bg-lavender-soft text-[#6857E4]">
                    <profileIcons.shield className="size-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#6857E4]">
                      Consentimiento
                    </p>
                    <h2
                      id="acompanamiento-heading"
                      className="font-display text-lg font-bold text-primary"
                    >
                      Modo Acompañamiento
                    </h2>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className={`rounded-xl px-2.5 py-0.5 text-xs font-bold ${
                    modoAcompanamiento
                      ? "bg-teal-soft text-teal border-teal/40"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {modoAcompanamiento ? "Acompañamiento activo" : "Modo Privado"}
                </Badge>
              </div>

              {/* Control de Toggle */}
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card/60 p-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="toggle-acompanamiento"
                    className="text-sm font-bold text-foreground cursor-pointer"
                  >
                    Compartir tamizajes con Bienestar
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {modoAcompanamiento
                      ? "El equipo de psicología puede contactarte si detecta riesgo"
                      : "Tus respuestas no son compartidas con nadie"}
                  </p>
                </div>
                <Switch
                  id="toggle-acompanamiento"
                  checked={modoAcompanamiento}
                  onCheckedChange={handleToggleAcompanamiento}
                  className="data-[state=checked]:bg-teal"
                />
              </div>

              {/* Explicación en lenguaje claro */}
              <div
                className={`rounded-2xl p-4 text-xs leading-relaxed transition-all ${
                  modoAcompanamiento
                    ? "bg-teal-soft/70 text-primary border border-teal/30"
                    : "bg-card/90 text-muted-foreground border border-border/60"
                }`}
              >
                {modoAcompanamiento ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-teal flex items-center gap-1.5">
                      <profileIcons.check className="size-4" />
                      <span>Modo Acompañamiento encendido</span>
                    </p>
                    <p>
                      Permites que el equipo de Bienestar del TESH pueda ver tu tamizaje para
                      acompañarte y ofrecerte orientación oportuna. Puedes desactivarlo cuando
                      quieras.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <profileIcons.lock className="size-3.5 text-accent" />
                      <span>Modo Privado encendido</span>
                    </p>
                    <p>
                      Tus registros emocionales son exclusivamente tuyos. Nadie del personal
                      universitario puede ver tus check-ins ni respuestas.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground italic">
              * Tu consentimiento es voluntario y puedes cambiar esta preferencia en cualquier
              momento sin que afecte tus materias ni trámites escolares.
            </p>
          </section>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Card 3: Mi Cuenta (Edición visual en demo) */}
          <section className="ethereal-card p-6 sm:p-7 space-y-4" aria-labelledby="cuenta-heading">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <div className="grid size-8 place-items-center rounded-xl bg-cyan-soft text-cyan-700 dark:text-cyan-400">
                <profileIcons.user className="size-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                  Información escolar
                </p>
                <h2 id="cuenta-heading" className="font-display text-lg font-bold text-primary">
                  Mi cuenta
                </h2>
              </div>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label htmlFor="cuenta-nombre" className="text-xs font-semibold text-foreground">
                  Nombre completo
                </Label>
                <Input
                  id="cuenta-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-10 rounded-xl bg-card/80 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label
                    htmlFor="cuenta-matricula"
                    className="text-xs font-semibold text-foreground"
                  >
                    Matrícula TESH
                  </Label>
                  <Input
                    id="cuenta-matricula"
                    value={matricula}
                    disabled
                    className="h-10 rounded-xl bg-muted/50 text-xs text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="cuenta-email" className="text-xs font-semibold text-foreground">
                    Correo institucional
                  </Label>
                  <Input
                    id="cuenta-email"
                    value={email}
                    disabled
                    className="h-10 rounded-xl bg-muted/50 text-xs text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cuenta-carrera" className="text-xs font-semibold text-foreground">
                    Carrera / Programa
                  </Label>
                  <Input
                    id="cuenta-carrera"
                    value={carrera}
                    onChange={(e) => setCarrera(e.target.value)}
                    className="h-10 rounded-xl bg-card/80 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="cuenta-semestre"
                    className="text-xs font-semibold text-foreground"
                  >
                    Semestre actual
                  </Label>
                  <Input
                    id="cuenta-semestre"
                    value={semestre}
                    onChange={(e) => setSemestre(e.target.value)}
                    className="h-10 rounded-xl bg-card/80 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  className="h-9 rounded-xl bg-[#6857E4] px-4 text-xs font-semibold text-white hover:bg-[#5847d5]"
                >
                  <profileIcons.edit className="mr-1.5 size-3.5" />
                  <span>Guardar cambios</span>
                </Button>
              </div>
            </form>
          </section>

          {/* Card 4: Seguridad y Privacidad */}
          <section
            className="ethereal-card p-6 sm:p-7 space-y-4"
            aria-labelledby="seguridad-heading"
          >
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <div className="grid size-8 place-items-center rounded-xl bg-mint-soft text-teal">
                <profileIcons.shieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal">
                  Privacidad garantizada
                </p>
                <h2 id="seguridad-heading" className="font-display text-lg font-bold text-primary">
                  Seguridad
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {SECURITY_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/50 p-3"
                  >
                    <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-lavender-soft text-accent">
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-foreground">{item.title}</h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* 3. CERRAR SESIÓN: Botón outline rojo suave (NO rosa de crisis) con confirmación */}
        <section className="pt-4 flex justify-center">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full max-w-sm rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/30 text-xs font-semibold gap-2 shadow-soft transition-colors"
              >
                <profileIcons.logout className="size-4" />
                <span>Cerrar sesión</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl p-6 sm:p-7 max-w-md border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-xl font-bold text-primary">
                  ¿Deseas cerrar tu sesión?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2">
                  Tus registros y configuraciones de bienestar se mantendrán guardados. Podrás
                  volver a ingresar cuando lo necesites con tu correo institucional y contraseña.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-5 gap-2 sm:gap-3">
                <AlertDialogCancel className="rounded-xl h-10 text-xs font-semibold">
                  Permanecer aquí
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmLogout}
                  className="rounded-xl h-10 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  Sí, cerrar sesión
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </main>
    </PageShell>
  );
}
