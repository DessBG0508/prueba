import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { EquilibraBrand } from "@/components/ui/equilibra-brand";
import { AuroraBackground } from "@/components/effects/aurora-background";

const PUBLIC_ROUTES = ["/login", "/registro"];

export function RouteGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_ROUTES.includes(pathname);

    // 1. Sin sesión activa -> Redirigir a /login
    if (!user) {
      if (!isPublic) {
        navigate({ to: "/login", replace: true });
      }
      return;
    }

    // 2. Con sesión activa en ruta pública -> Redirigir según rol
    if (isPublic) {
      if (user.role === "psicologo") {
        navigate({ to: "/psicologo", replace: true });
      } else {
        navigate({ to: "/", replace: true });
      }
      return;
    }

    // 3. Rol Psicólogo: solo puede ver /psicologo
    if (user.role === "psicologo") {
      if (!pathname.startsWith("/psicologo")) {
        toast.info("Redirigido al panel de psicología correspondiente a tu rol.");
        navigate({ to: "/psicologo", replace: true });
      }
      return;
    }

    // 4. Rol Estudiante: puede ver /, /checkin, /alerta, /chat, /citas, /recursos, /perfil
    if (user.role === "estudiante") {
      if (pathname.startsWith("/psicologo")) {
        toast.info("Esta sección es de acceso exclusivo para el personal de psicología.");
        navigate({ to: "/", replace: true });
      }
    }
  }, [user, isLoading, pathname, navigate]);

  if (isLoading) {
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
    if (PUBLIC_ROUTES.includes(pathname)) return null;
    if (user.role === "psicologo" && !pathname.startsWith("/psicologo")) return null;
    if (user.role === "estudiante" && pathname.startsWith("/psicologo")) return null;
  }

  return <>{children}</>;
}
