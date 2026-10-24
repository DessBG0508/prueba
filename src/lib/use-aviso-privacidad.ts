import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const AVISO_PRIVACIDAD_VERSION_ACTUAL = "1.0";
const SYNC_EVENT_NAME = "equilibra_aviso_privacidad_sync"; // FIX S4: Nombre de evento global para sincronizar todas las instancias del hook

export interface AvisoPrivacidadStatus {
  needsAcceptance: boolean;
  isLoading: boolean;
  versionAceptada: string | null;
  fechaAceptacion: string | null;
  acceptAviso: (version?: string, modoAcompanamiento?: boolean) => Promise<boolean>;
  refetch: () => Promise<void>; // FIX S4: Exponer refetch para revalidación explícita
}

export function useAvisoPrivacidad(): AvisoPrivacidadStatus {
  const { user } = useAuth();

  // FIX S4: Inicializar con verificación síncrona de localStorage para evitar falsos positivos
  const [needsAcceptance, setNeedsAcceptance] = useState<boolean>(() => {
    try {
      const localAceptado = localStorage.getItem("equilibra_aviso_privacidad_aceptado") === "true";
      const localVersion = localStorage.getItem("equilibra_aviso_privacidad_version");
      if (localAceptado && localVersion === AVISO_PRIVACIDAD_VERSION_ACTUAL) {
        return false;
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [versionAceptada, setVersionAceptada] = useState<string | null>(() => {
    try {
      return localStorage.getItem("equilibra_aviso_privacidad_version");
    } catch {
      return null;
    }
  });
  const [fechaAceptacion, setFechaAceptacion] = useState<string | null>(() => {
    try {
      return localStorage.getItem("equilibra_aviso_privacidad_fecha");
    } catch {
      return null;
    }
  });

  const checkAviso = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      setNeedsAcceptance(false);
      return;
    }

    // 1. Verificación en almacenamiento local
    try {
      const localAceptado = localStorage.getItem("equilibra_aviso_privacidad_aceptado") === "true";
      const localVersion = localStorage.getItem("equilibra_aviso_privacidad_version");
      const localFecha = localStorage.getItem("equilibra_aviso_privacidad_fecha");

      if (localAceptado && localVersion === AVISO_PRIVACIDAD_VERSION_ACTUAL) {
        setNeedsAcceptance(false); // FIX S4: Desactivar bloqueo inmediatamente si localStorage es válido
        setVersionAceptada(localVersion);
        setFechaAceptacion(localFecha);
      } else {
        setNeedsAcceptance(true);
      }
    } catch {
      // ignore
    }

    // 2. Fuente de verdad: Consulta a la tabla profiles en Supabase
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("aviso_privacidad_aceptado, aviso_privacidad_version, aviso_privacidad_fecha")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
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
              localStorage.setItem("equilibra_aviso_privacidad_fecha", data.aviso_privacidad_fecha);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      console.warn("Aviso al verificar estado de aviso de privacidad en profiles:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkAviso();

    // FIX S4: Escuchar evento de sincronización para actualizar todas las instancias activas del hook simultáneamente
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{
        needsAcceptance: boolean;
        version?: string;
        fecha?: string;
      }>;
      if (customEvent.detail) {
        setNeedsAcceptance(customEvent.detail.needsAcceptance);
        if (customEvent.detail.version) setVersionAceptada(customEvent.detail.version);
        if (customEvent.detail.fecha) setFechaAceptacion(customEvent.detail.fecha);
      } else {
        checkAviso();
      }
    };

    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [checkAviso]);

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

      // FIX S4: Actualizar estado local síncronamente
      setNeedsAcceptance(false);
      setVersionAceptada(version);
      setFechaAceptacion(timestamp);

      // FIX S4: Notificar a todas las demás instancias activas del hook (RouteGuard, Header, etc.)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(SYNC_EVENT_NAME, {
            detail: {
              needsAcceptance: false,
              version,
              fecha: timestamp,
            },
          }),
        );
      }

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
    refetch: checkAviso, // FIX S4: Retornar refetch
  };
}
