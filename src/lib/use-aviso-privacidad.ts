import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const AVISO_PRIVACIDAD_VERSION_ACTUAL = "1.0";

export interface AvisoPrivacidadStatus {
  needsAcceptance: boolean;
  isLoading: boolean;
  versionAceptada: string | null;
  fechaAceptacion: string | null;
  acceptAviso: (version?: string, modoAcompanamiento?: boolean) => Promise<boolean>;
}

export function useAvisoPrivacidad(): AvisoPrivacidadStatus {
  const { user } = useAuth();
  const [needsAcceptance, setNeedsAcceptance] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [versionAceptada, setVersionAceptada] = useState<string | null>(null);
  const [fechaAceptacion, setFechaAceptacion] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAviso() {
      if (!user?.id) {
        if (isMounted) {
          setIsLoading(false);
          setNeedsAcceptance(false);
        }
        return;
      }

      // 1. Verificación inicial rápida en almacenamiento local
      try {
        const localAceptado =
          localStorage.getItem("equilibra_aviso_privacidad_aceptado") === "true";
        const localVersion = localStorage.getItem("equilibra_aviso_privacidad_version");
        const localFecha = localStorage.getItem("equilibra_aviso_privacidad_fecha");

        if (localAceptado && localVersion === AVISO_PRIVACIDAD_VERSION_ACTUAL) {
          if (isMounted) {
            setNeedsAcceptance(false);
            setVersionAceptada(localVersion);
            setFechaAceptacion(localFecha);
          }
        } else {
          if (isMounted) {
            setNeedsAcceptance(true);
          }
        }
      } catch {
        // ignore storage errors
      }

      // 2. Fuente de verdad: Consulta a la tabla profiles en Supabase
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("aviso_privacidad_aceptado, aviso_privacidad_version, aviso_privacidad_fecha")
          .eq("id", user.id)
          .maybeSingle();

        if (isMounted && !error && data) {
          const yaAcepto = data.aviso_privacidad_aceptado === true;
          const versionCoincide = data.aviso_privacidad_version === AVISO_PRIVACIDAD_VERSION_ACTUAL;
          const debeAceptar = !(yaAcepto && versionCoincide);

          setNeedsAcceptance(debeAceptar);
          setVersionAceptada(data.aviso_privacidad_version ?? null);
          setFechaAceptacion(data.aviso_privacidad_fecha ?? null);

          // Sincronizar en localStorage si ya está aceptado en BD
          if (!debeAceptar) {
            try {
              localStorage.setItem("equilibra_aviso_privacidad_aceptado", "true");
              localStorage.setItem(
                "equilibra_aviso_privacidad_version",
                data.aviso_privacidad_version || AVISO_PRIVACIDAD_VERSION_ACTUAL,
              );
              if (data.aviso_privacidad_fecha) {
                localStorage.setItem(
                  "equilibra_aviso_privacidad_fecha",
                  data.aviso_privacidad_fecha,
                );
              }
            } catch {
              // ignore storage errors
            }
          }
        }
      } catch (err) {
        console.warn("Aviso al verificar estado de aviso de privacidad en profiles:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAviso();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const acceptAviso = useCallback(
    async (
      version = AVISO_PRIVACIDAD_VERSION_ACTUAL,
      modoAcompanamiento?: boolean,
    ): Promise<boolean> => {
      const timestamp = new Date().toISOString();

      // Guardar inmediatamente en localStorage
      try {
        localStorage.setItem("equilibra_aviso_privacidad_aceptado", "true");
        localStorage.setItem("equilibra_aviso_privacidad_version", version);
        localStorage.setItem("equilibra_aviso_privacidad_fecha", timestamp);
        if (modoAcompanamiento !== undefined) {
          localStorage.setItem(
            "equilibra_modo_acompanamiento",
            modoAcompanamiento ? "true" : "false",
          );
        }
      } catch {
        // ignore
      }

      setNeedsAcceptance(false);
      setVersionAceptada(version);
      setFechaAceptacion(timestamp);

      if (!user?.id) return true;

      try {
        const updatePayload: Record<string, unknown> = {
          aviso_privacidad_aceptado: true,
          aviso_privacidad_version: version,
          aviso_privacidad_fecha: timestamp,
        };

        if (modoAcompanamiento !== undefined) {
          updatePayload.modo_acompaniamiento = modoAcompanamiento;
        }

        const { error } = await supabase.from("profiles").update(updatePayload).eq("id", user.id);

        if (error && error.message.includes("does not exist")) {
          // Fallback tolerante si las columnas aún no existen en la BD
          if (modoAcompanamiento !== undefined) {
            await supabase
              .from("profiles")
              .update({ modo_acompaniamiento: modoAcompanamiento })
              .eq("id", user.id);
          }
        }
        return true;
      } catch (err) {
        console.warn("Error al registrar aceptación en Supabase:", err);
        return false;
      }
    },
    [user?.id],
  );

  return {
    needsAcceptance,
    isLoading,
    versionAceptada,
    fechaAceptacion,
    acceptAviso,
  };
}
