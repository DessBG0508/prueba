import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, KeyRound, Lock, Mail, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { BRAND } from "@/lib/branding";
import { sanitizeText, isValidEmail } from "@/lib/security";
import { authIcons } from "@/config/icons";
import { AuroraBackground } from "@/components/effects/aurora-background";
import { EquilibraBrand } from "@/components/ui/equilibra-brand";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RestablecerPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Intentar leer email o token desde URL si viene de enlace de correo o redirección
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      const tokenParam = params.get("token") || params.get("code");
      if (emailParam) {
        setEmail(emailParam);
      }
      if (tokenParam) {
        setToken(tokenParam);
      }
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = sanitizeText(email, 120).toLowerCase();
    const cleanToken = sanitizeText(token, 20).replace(/\s+/g, "");
    const cleanPassword = password.trim();

    // Validaciones
    if (!cleanEmail) {
      const msg = "El correo electrónico es obligatorio.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      const msg = "Ingresa un formato de correo válido (ej. alumno@tesh.mx).";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!cleanToken) {
      const msg = "Ingresa el código de verificación de 6 dígitos recibido por correo.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (cleanToken.length < 6) {
      const msg = "El código debe tener al menos 6 dígitos.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!cleanPassword) {
      const msg = "La nueva contraseña es obligatoria.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (cleanPassword.length < 8) {
      const msg = "La nueva contraseña debe tener al menos 8 caracteres.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (cleanPassword.length > 100) {
      const msg = "La contraseña excede el límite seguro de 100 caracteres.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (cleanPassword !== confirmPassword.trim()) {
      const msg = "Las contraseñas no coinciden. Por favor verifícalas.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    try {
      setIsSubmitting(true);

      // Paso 1: Verificar el código OTP de tipo "recovery" con Supabase Auth nativo
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "recovery",
      });

      if (otpError) {
        let userFriendlyMsg =
          "El código de verificación es inválido o ha expirado. Por favor solicita uno nuevo.";
        const rawMsg = otpError.message.toLowerCase();

        if (rawMsg.includes("expired") || rawMsg.includes("expirado")) {
          userFriendlyMsg =
            "El código de verificación ha expirado. Por favor solicita un nuevo código.";
        } else if (
          rawMsg.includes("invalid") ||
          rawMsg.includes("inválido") ||
          rawMsg.includes("token") ||
          rawMsg.includes("otp")
        ) {
          userFriendlyMsg =
            "El código de 6 dígitos es incorrecto. Verifica los dígitos recibidos en tu correo.";
        } else {
          userFriendlyMsg = otpError.message;
        }

        setErrorMessage(userFriendlyMsg);
        toast.error(userFriendlyMsg);
        return;
      }

      // Paso 2: Si el código es válido, actualizar la contraseña en Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: cleanPassword,
      });

      if (updateError) {
        const updateMsg =
          updateError.message || "No se pudo actualizar la contraseña. Intenta nuevamente.";
        setErrorMessage(updateMsg);
        toast.error(updateMsg);
        return;
      }

      // Paso 3: Éxito total
      toast.success("¡Tu contraseña ha sido restablecida con éxito! Ya puedes iniciar sesión.");
      navigate({ to: "/login", replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado al restablecer tu contraseña.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuroraBackground>
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="ethereal-card relative w-full max-w-md space-y-6 rounded-3xl border border-white/40 bg-card/85 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 sm:p-8">
          {/* Selector de Tema */}
          <div className="absolute right-4 top-4">
            <ThemeToggle />
          </div>

          {/* Botón de regreso */}
          <Link
            to="/recuperar"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            <span>Volver a solicitar código</span>
          </Link>

          {/* Header con Marca */}
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="scale-105 transform transition-transform hover:scale-110">
              <EquilibraBrand />
            </div>
            <div className="space-y-1 pt-1">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Restablecer contraseña
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ingresa el código de 6 dígitos recibido por correo y define tu nueva contraseña.
              </p>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
              >
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Campo: Correo */}
            <div className="space-y-1.5">
              <Label htmlFor="reset-email" className="text-xs font-medium text-foreground">
                Correo institucional o registrado
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="ej. alumno@tesh.mx"
                  value={email}
                  disabled={isSubmitting}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="rounded-xl border-border/70 bg-background/70 pl-10 text-sm focus-visible:border-accent focus-visible:ring-accent/30 disabled:opacity-60"
                  required
                />
              </div>
            </div>

            {/* Campo: Código de 6 dígitos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="reset-token" className="text-xs font-medium text-foreground">
                  Código de 6 dígitos
                </Label>
                <span className="text-[10px] text-muted-foreground">Enviado por Supabase Auth</span>
              </div>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-token"
                  type="text"
                  placeholder="123456"
                  maxLength={10}
                  value={token}
                  disabled={isSubmitting}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="one-time-code"
                  className="rounded-xl border-border/70 bg-background/70 pl-10 font-mono tracking-widest text-sm focus-visible:border-accent focus-visible:ring-accent/30 disabled:opacity-60"
                  required
                />
              </div>
            </div>

            {/* Campo: Nueva Contraseña */}
            <div className="space-y-1.5">
              <Label htmlFor="reset-new-password" className="text-xs font-medium text-foreground">
                Nueva contraseña
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres (máx. 100)"
                  value={password}
                  disabled={isSubmitting}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="rounded-xl border-border/70 bg-background/70 pl-10 pr-10 text-sm focus-visible:border-accent focus-visible:ring-accent/30 disabled:opacity-60"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
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

            {/* Campo: Confirmar Contraseña */}
            <div className="space-y-1.5">
              <Label
                htmlFor="reset-confirm-password"
                className="text-xs font-medium text-foreground"
              >
                Confirmar nueva contraseña
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  disabled={isSubmitting}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="rounded-xl border-border/70 bg-background/70 pl-10 text-sm focus-visible:border-accent focus-visible:ring-accent/30 disabled:opacity-60"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 h-11 w-full gap-2 rounded-xl bg-accent font-semibold text-accent-foreground shadow-md transition-all hover:bg-accent/90 disabled:opacity-50"
            >
              <Check className="size-4" />
              <span>{isSubmitting ? "Restableciendo..." : "Actualizar contraseña"}</span>
            </Button>
          </form>

          {/* Enlaces de pie */}
          <div className="flex flex-col items-center justify-center gap-2 pt-2 text-center text-xs text-muted-foreground">
            <div>
              <span>¿No te llegó el código? </span>
              <Link
                to="/recuperar"
                className="font-medium text-accent hover:underline focus:outline-none"
              >
                Solicitar nuevo código
              </Link>
            </div>
            <div>
              <Link
                to="/login"
                className="hover:underline focus:outline-none text-muted-foreground"
              >
                Volver a Iniciar sesión
              </Link>
            </div>
          </div>

          {/* Microcopy de seguridad */}
          <div className="rounded-xl bg-card/40 p-2.5 text-center text-xs text-muted-foreground">
            {BRAND.fullName} — Plataforma institucional segura del Tecnológico de Estudios
            Superiores de Huixquilucan.
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
}
