import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useAvisoPrivacidad } from "@/lib/use-aviso-privacidad";
import { rutaPorRol } from "@/lib/roles";
import { EquilibraBrand } from "@/components/ui/equilibra-brand";
import { AuroraBackground } from "@/components/effects/aurora-background";
import { PersistentSosButton } from "@/components/common/persistent-sos-button";

const PUBLIC_ROUTES = ["/login", "/registro", "/recuperar", "/reset", "/aviso-privacidad"];

/**
 * Control de acceso por rol (RBAC en cliente, respaldado por RLS en Supabase):
 * - coordinador: accede a /coordinador, /perfil, /, /aviso-privacidad (bloqueado de /psicologo, /directivo, /tutor, /expedientes, /auditoria)
 * - jefatura (directivo): accede SOLO a /directivo (estadísticas estratégicas) y /aviso-privacidad
 * - psicologo: accede a /psicologo, /expedientes, /directivo, /perfil, /
 * - tutor: accede a /tutor, /perfil, /
 * - estudiante: accede a rutas estudiantiles; bloqueado de paneles institucionales
 */
export function RouteGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const { needsAcceptance, isLoading: isAvisoLoading } = useAvisoPrivacidad();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  useEffect(() => {
    if (isLoading || isAvisoLoading) return;

    // El Aviso de Privacidad es de acceso público universal para cualquier usuario o visitante
    if (pathname === "/aviso-privacidad") {
      return;
    }

    const isPublic = PUBLIC_ROUTES.includes(pathname);
    const isResetPage = pathname === "/reset";

    // 1. Sin sesión activa -> Redirigir a /login (excepto en rutas públicas)
    if (!user) {
      if (!isPublic) {
        navigate({ to: "/login", replace: true });
      }
      return;
    }

    // El Aviso de Privacidad SOLO se muestra de forma forzada 1 sola vez en el PRIMER INGRESO
    const esPrimerIngreso =
      typeof window !== "undefined" && localStorage.getItem("equilibra_primer_ingreso") === "true";

    if (esPrimerIngreso && needsAcceptance && !isResetPage) {
      navigate({ to: "/aviso-privacidad", replace: true });
      return;
    }

    const destinoAutorizado = rutaPorRol(user.role);

    // 2. Con sesión activa en ruta pública -> Redirigir según rol (salvo en /reset)
    if (isPublic && !isResetPage && pathname !== "/aviso-privacidad") {
      navigate({ to: destinoAutorizado, replace: true });
      return;
    }

    // 3. Rol Psicólogo: puede ver /psicologo, /expedientes, /directivo, /perfil y /
    if (user.role === "psicologo") {
      if (
        !pathname.startsWith("/psicologo") &&
        !pathname.startsWith("/expedientes") &&
        !pathname.startsWith("/directivo") &&
        pathname !== "/perfil" &&
        pathname !== "/"
      ) {
        toast.info("Redirigido al panel de psicología correspondiente a tu rol.");
        navigate({ to: "/psicologo", replace: true });
      }
      return;
    }

    // 4. Rol Coordinador: acceso a /coordinador, /perfil, /, /aviso-privacidad
    //    NO accede a /psicologo, /directivo, /tutor, /expedientes, /auditoria
    if (user.role === "coordinador") {
      if (!pathname.startsWith("/coordinador") && pathname !== "/perfil" && pathname !== "/") {
        toast.info("Redirigido al panel de coordinación correspondiente a tu rol.");
        navigate({ to: "/coordinador", replace: true });
      }
      return;
    }

    // 5. Rol Directivo / Jefatura: SOLO accede a /directivo (estadísticas institucionales)
    if (user.role === "jefatura" || (user.role as string) === "directivo") {
      if (!pathname.startsWith("/directivo")) {
        toast.info("Redirigido al panel directivo correspondiente a tu rol.");
        navigate({ to: "/directivo", replace: true });
      }
      return;
    }

    // 6. Rol Tutor: puede ver /tutor, /perfil y /
    if (user.role === "tutor") {
      if (!pathname.startsWith("/tutor") && pathname !== "/perfil" && pathname !== "/") {
        toast.info("Redirigido al panel de tutoría correspondiente a tu rol.");
        navigate({ to: "/tutor", replace: true });
      }
      return;
    }

    // 7. Rol Estudiante: bloqueado de rutas institucionales
    if (user.role === "estudiante") {
      if (
        pathname.startsWith("/psicologo") ||
        pathname.startsWith("/directivo") ||
        pathname.startsWith("/coordinador") ||
        pathname.startsWith("/expedientes") ||
        pathname.startsWith("/auditoria") ||
        pathname.startsWith("/tutor")
      ) {
        toast.info("Esta sección es de acceso institucional.");
        navigate({ to: "/", replace: true });
      }
    }
  }, [user, isLoading, isAvisoLoading, needsAcceptance, pathname, navigate]);

  if (isLoading || (user && isAvisoLoading && pathname !== "/aviso-privacidad")) {
    return (
      <AuroraBackground>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="ethereal-card flex flex-col items-center gap-4 p-8 text-center">
            <EquilibraBrand />
            <div className="size-8 animate-spin rounded-full border-3 border-accent border-t-transparent" />
            <p className="text-sm font-medium text-muted-foreground">Preparando tu espacio...</p>
          </div>
        </div>
      </AuroraBackground>
    );
  }

  // Si no hay usuario y no es ruta pública, no renderizar contenido protegido mientras redirige
  if (!user && !PUBLIC_ROUTES.includes(pathname)) {
    return null;
  }

  // Si hay usuario y está en una ruta que no le corresponde, no renderizar mientras redirige
  if (user) {
    const enReset = pathname === "/reset";
    const esPrimerIngreso =
      typeof window !== "undefined" && localStorage.getItem("equilibra_primer_ingreso") === "true";
    if (esPrimerIngreso && needsAcceptance && pathname !== "/aviso-privacidad" && !enReset) {
      return null;
    }
    if (PUBLIC_ROUTES.includes(pathname) && !enReset && pathname !== "/aviso-privacidad") {
      return null;
    }
    if (
      user.role === "psicologo" &&
      pathname !== "/aviso-privacidad" &&
      pathname !== "/perfil" &&
      pathname !== "/" &&
      !pathname.startsWith("/psicologo") &&
      !pathname.startsWith("/expedientes") &&
      !pathname.startsWith("/directivo")
    ) {
      return null;
    }
    if (
      user.role === "coordinador" &&
      pathname !== "/aviso-privacidad" &&
      pathname !== "/perfil" &&
      pathname !== "/" &&
      !pathname.startsWith("/coordinador")
    ) {
      return null;
    }
    if (
      (user.role === "jefatura" || (user.role as string) === "directivo") &&
      pathname !== "/aviso-privacidad" &&
      !pathname.startsWith("/directivo")
    ) {
      return null;
    }
    if (
      user.role === "tutor" &&
      pathname !== "/aviso-privacidad" &&
      pathname !== "/perfil" &&
      pathname !== "/" &&
      !pathname.startsWith("/tutor")
    ) {
      return null;
    }
    if (
      user.role === "estudiante" &&
      pathname !== "/aviso-privacidad" &&
      (pathname.startsWith("/psicologo") ||
        pathname.startsWith("/directivo") ||
        pathname.startsWith("/coordinador") ||
        pathname.startsWith("/expedientes") ||
        pathname.startsWith("/auditoria") ||
        pathname.startsWith("/tutor"))
    ) {
      return null;
    }
  }

  return (
    <>
      {children}
      <PersistentSosButton />
    </>
  );
}
