import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authIcons } from "@/config/icons";
import { useAuth } from "@/lib/auth-context";
import {
  sanitizeText,
  isValidEmail,
  getLoginRateLimitState,
  recordFailedLoginAttempt,
  resetLoginAttempts,
} from "@/lib/security";
import { AuroraBackground } from "@/components/effects/aurora-background";
import { EquilibraBrand } from "@/components/ui/equilibra-brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rate limiting en cliente (5 intentos fallidos -> bloqueo por 30s)
  // /* TODO(Supabase): rate limiting real en Edge Functions */
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(() => {
    return getLoginRateLimitState().remainingSeconds;
  });

  useEffect(() => {
    if (lockoutSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMessage(null);
          toast.info("Puedes volver a intentar iniciar sesión.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const isLocked = lockoutSeconds > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isLocked) {
      toast.warning(`Por seguridad, espera ${lockoutSeconds} segundos antes de volver a intentar.`);
      return;
    }

    // Sanitización y validación estricta de entradas
    const cleanEmail = sanitizeText(email, 120).toLowerCase();
    const cleanPassword = password.slice(0, 100);

    if (!cleanEmail) {
      setErrorMessage("Por favor ingresa tu correo institucional o registrado.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorMessage("Por favor ingresa un formato de correo electrónico válido.");
      return;
    }

    if (!cleanPassword) {
      setErrorMessage("Por favor ingresa tu contraseña.");
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await login(cleanEmail, cleanPassword);
      resetLoginAttempts();
      toast.success(`Bienvenido/a de nuevo, ${user.name}`);

      if (user.role === "psicologo") {
        navigate({ to: "/psicologo", replace: true });
      } else {
        navigate({ to: "/", replace: true });
      }
    } catch (err: unknown) {
      /* TODO(Supabase): rate limiting real en Edge Functions */
      const rateState = recordFailedLoginAttempt(5, 30);
      if (rateState.isLocked) {
        setLockoutSeconds(rateState.remainingSeconds);
        const lockMsg = `Por tu seguridad y bienestar emocional, hemos pausado los intentos durante ${rateState.remainingSeconds} segundos. Respira profundo y tómate una pausa; podrás intentarlo de nuevo en breve.`;
        setErrorMessage(lockMsg);
        toast.error(lockMsg);
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : "No se pudo iniciar sesión. Verifica tus credenciales.";
        const attemptsLeft = 5 - rateState.attemptsCount;
        const warning =
          attemptsLeft <= 2
            ? `${msg} (${attemptsLeft} intentos restantes antes de una pausa de seguridad).`
            : msg;
        setErrorMessage(warning);
        toast.error(warning);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemoUser = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <AuroraBackground>
      <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="ethereal-card relative w-full max-w-md space-y-7 rounded-3xl border border-white/40 bg-card/85 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Header con Marca */}
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="scale-105 transform transition-transform hover:scale-110">
              <EquilibraBrand />
            </div>
            <div className="space-y-1 pt-1">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Bienvenido/a de nuevo
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Tu espacio de calma y acompañamiento emocional en el TESH.
              </p>
            </div>
          </div>

          {/* Accesos rápidos DEMO */}
          <div className="space-y-2 rounded-2xl border border-accent/25 bg-accent/5 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <authIcons.sparkles className="size-3.5" />
              <span>Accesos rápidos DEMO_MODE</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleSelectDemoUser("dess@tesh.mx", "password123")}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-2.5 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:border-accent hover:bg-accent/10"
              >
                <authIcons.roleStudent className="size-3.5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1 truncate">
                  <span className="block font-semibold">Dess (Estudiante)</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    dess@tesh.mx
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectDemoUser("dra.marta@tesh.mx", "password123")}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-2.5 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:border-accent hover:bg-accent/10"
              >
                <authIcons.rolePsychologist className="size-3.5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1 truncate">
                  <span className="block font-semibold">Dra. Marta (Psicóloga)</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    dra.marta@tesh.mx
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
              >
                <authIcons.alert className="mt-0.5 size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="login-email" className="text-xs font-medium text-foreground">
                Correo institucional o registrado
              </Label>
              <div className="relative">
                <authIcons.email className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="ej. alumno@tesh.mx"
                  value={email}
                  disabled={isSubmitting || isLocked}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="rounded-xl border-border/70 bg-background/70 pl-10 text-sm focus-visible:border-accent focus-visible:ring-accent/30 disabled:opacity-60"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-xs font-medium text-foreground">
                  Contraseña
                </Label>
              </div>
              <div className="relative">
                <authIcons.password className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  disabled={isSubmitting || isLocked}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="rounded-xl border-border/70 bg-background/70 pl-10 pr-10 text-sm focus-visible:border-accent focus-visible:ring-accent/30 disabled:opacity-60"
                  required
                />
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? (
                    <authIcons.hidePassword className="size-4" />
                  ) : (
                    <authIcons.showPassword className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isLocked}
              className="mt-2 h-11 w-full gap-2 rounded-xl bg-accent font-semibold text-accent-foreground shadow-md transition-all hover:bg-accent/90 disabled:opacity-50"
            >
              <authIcons.submitLogin className="size-4" />
              <span>
                {isSubmitting
                  ? "Iniciando sesión..."
                  : isLocked
                    ? `Acceso pausado (${lockoutSeconds}s)`
                    : "Iniciar sesión"}
              </span>
            </Button>
          </form>

          {/* Microcopy empático de confidencialidad */}
          <div className="flex items-center justify-center gap-2 rounded-xl bg-card/40 p-2.5 text-center text-xs text-muted-foreground">
            <authIcons.shield className="size-4 shrink-0 text-accent" />
            <span>Tu información está protegida y es confidencial.</span>
          </div>

          {/* Enlace a Registro */}
          <div className="border-t border-border/40 pt-4 text-center text-xs text-muted-foreground">
            <span>¿Aún no tienes una cuenta? </span>
            <Link
              to="/registro"
              className="font-semibold text-accent underline-offset-4 transition-colors hover:underline"
            >
              Crea tu espacio seguro
            </Link>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
}
