import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const AVISO_PRIVACIDAD_VERSION_ACTUAL = "1.0";
const SYNC_EVENT_NAME = "equilibra_aviso_privacidad_sync";

export interface AvisoPrivacidadStatus {
  needsAcceptance: boolean;
  isLoading: boolean;
  versionAceptada: string | null;
  fechaAceptacion: string | null;
  acceptAviso: (version?: string, modoAcompanamiento?: boolean) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export interface StoredAvisoInfo {
  aceptado: boolean;
  version: string | null;
  fecha: string | null;
}

/**
 * Genera la clave de localStorage scoped por user_id o email.
 */
export function getAvisoStorageKey(userIdOrEmail: string): string {
  const clean = userIdOrEmail.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `equilibra_aviso_aceptado_${clean}`;
}

/**
 * Lee el estado del aviso desde localStorage para un usuario específico (por id o email).
 */
export function getStoredAviso(
  userId?: string | null,
  userEmail?: string | null,
): StoredAvisoInfo | null {
  if (typeof window === "undefined") return null;

  const identifiers = [userId, userEmail].filter(Boolean) as string[];
  if (identifiers.length === 0) return null;

  for (const id of identifiers) {
    try {
      const raw = localStorage.getItem(getAvisoStorageKey(id));
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.aceptado) {
          return {
            aceptado: Boolean(parsed.aceptado),
            version: typeof parsed.version === "string" ? parsed.version : null,
            fecha: typeof parsed.fecha === "string" ? parsed.fecha : null,
          };
        }
      } catch {
        if (raw === "true") {
          return {
            aceptado: true,
            version: AVISO_PRIVACIDAD_VERSION_ACTUAL,
            fecha: null,
          };
        }
      }
    } catch {
      // Ignorar cuota
    }
  }

  return null;
}

/**
 * Limpia únicamente claves legadas no-scoped (versiones antiguas),
 * NUNCA elimina las aceptaciones válidas de los usuarios por ID/email.
 */
export function clearAllAvisoStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Solo eliminar claves viejas genéricas sin usuario asignado
      if (
        key &&
        (key === "equilibra_aviso_privacidad_aceptado" ||
          key === "equilibra_aviso_aceptado_true" ||
          key === "equilibra_aviso_privacidad_version")
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.error("Error al limpiar claves legadas de aviso en localStorage:", err);
  }
}

export function useAvisoPrivacidad(): AvisoPrivacidadStatus {
  const { user, isLoading: isAuthLoading } = useAuth();

  // Inicialización síncrona scoped al usuario actual
  const [needsAcceptance, setNeedsAcceptance] = useState<boolean>(() => {
    if (!user?.id) return false;
    const stored = getStoredAviso(user.id, user.email);
    if (stored?.aceptado && stored.version === AVISO_PRIVACIDAD_VERSION_ACTUAL) {
      return false; // Ya aceptó: NO necesita volver a aceptar
    }
    return true; // Usuario nuevo: debe aceptar por primera vez
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [versionAceptada, setVersionAceptada] = useState<string | null>(() => {
    if (!user?.id) return null;
    return getStoredAviso(user.id, user.email)?.version ?? null;
  });

  const [fechaAceptacion, setFechaAceptacion] = useState<string | null>(() => {
    if (!user?.id) return null;
    return getStoredAviso(user.id, user.email)?.fecha ?? null;
  });

  const checkAviso = useCallback(async () => {
    if (isAuthLoading) return;

    if (!user?.id) {
      setIsLoading(false);
      setNeedsAcceptance(false);
      setVersionAceptada(null);
      setFechaAceptacion(null);
      return;
    }

    // 1. Verificación en localStorage (memoria del dispositivo)
    const stored = getStoredAviso(user.id, user.email);
    const localAceptado = Boolean(
      stored?.aceptado && stored.version === AVISO_PRIVACIDAD_VERSION_ACTUAL,
    );

    if (localAceptado && stored) {
      setNeedsAcceptance(false);
      setVersionAceptada(stored.version);
      setFechaAceptacion(stored.fecha);
    }

    // 2. Verificación en Supabase
    let bdAceptado = false;
    let bdVersion: string | null = null;
    let bdFecha: string | null = null;

    try {
      // 2a. Consulta a avisos_aceptados
      const { data: avisoData, error: avisoError } = await supabase
        .from("avisos_aceptados")
        .select("user_id, version_aviso, fecha_aceptacion")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!avisoError && avisoData && avisoData.version_aviso) {
        bdAceptado = true;
        bdVersion = avisoData.version_aviso;
        bdFecha = avisoData.fecha_aceptacion ?? null;
      }
    } catch {
      // Continuar fallback
    }

    // 2b. Fallback a profiles
    if (!bdAceptado) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("aviso_privacidad_aceptado, aviso_privacidad_version, aviso_privacidad_fecha")
          .eq("id", user.id)
          .maybeSingle();

        if (!profileError && profileData && profileData.aviso_privacidad_aceptado === true) {
          bdAceptado = true;
          bdVersion = profileData.aviso_privacidad_version || AVISO_PRIVACIDAD_VERSION_ACTUAL;
          bdFecha = profileData.aviso_privacidad_fecha ?? null;
        }
      } catch {
        // Continuar
      }
    }

    // 3. Evaluar aceptación:
    // El usuario ya aceptó si EITHER localStorage OR Supabase confirman la versión actual
    const versionValida =
      (bdAceptado && bdVersion === AVISO_PRIVACIDAD_VERSION_ACTUAL) || localAceptado;

    const debeAceptar = !versionValida;

    setNeedsAcceptance(debeAceptar);
    const versionFinal = bdVersion || stored?.version || AVISO_PRIVACIDAD_VERSION_ACTUAL;
    const fechaFinal = bdFecha || stored?.fecha || new Date().toISOString();

    if (!debeAceptar) {
      setVersionAceptada(versionFinal);
      setFechaAceptacion(fechaFinal);

      // Sincronizar en localStorage scoped (para persistencia indefinida)
      try {
        const payload = JSON.stringify({
          aceptado: true,
          version: versionFinal,
          fecha: fechaFinal,
        });
        localStorage.setItem(getAvisoStorageKey(user.id), payload);
        if (user.email) {
          localStorage.setItem(getAvisoStorageKey(user.email), payload);
        }
      } catch {
        // ignore
      }

      // Si estaba aceptado localmente pero falta en BD, sincronizar hacia Supabase (write-through)
      if (!bdAceptado) {
        try {
          await supabase.from("avisos_aceptados").upsert(
            {
              user_id: user.id,
              version_aviso: versionFinal,
              fecha_aceptacion: fechaFinal,
            },
            { onConflict: "user_id" },
          );
        } catch {
          // ignore
        }
      }
    } else {
      // Usuario nuevo que NUNCA ha aceptado
      setVersionAceptada(null);
      setFechaAceptacion(null);
    }

    setIsLoading(false);
  }, [user?.id, user?.email, isAuthLoading]);

  useEffect(() => {
    checkAviso();

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{
        userId?: string;
        needsAcceptance: boolean;
        version?: string;
        fecha?: string;
      }>;
      if (customEvent.detail) {
        if (!customEvent.detail.userId || customEvent.detail.userId === user?.id) {
          setNeedsAcceptance(customEvent.detail.needsAcceptance);
          if (customEvent.detail.version !== undefined) {
            setVersionAceptada(customEvent.detail.version);
          }
          if (customEvent.detail.fecha !== undefined) {
            setFechaAceptacion(customEvent.detail.fecha);
          }
        }
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
  }, [checkAviso, user?.id]);

  const acceptAviso = useCallback(
    async (
      version = AVISO_PRIVACIDAD_VERSION_ACTUAL,
      modoAcompanamiento?: boolean,
    ): Promise<boolean> => {
      if (!user?.id) return false;

      const timestamp = new Date().toISOString();

      // 1. Guardar de inmediato en localStorage de forma persistente (por ID y por Email)
      try {
        const payload = JSON.stringify({
          aceptado: true,
          version,
          fecha: timestamp,
        });
        localStorage.setItem(getAvisoStorageKey(user.id), payload);
        if (user.email) {
          localStorage.setItem(getAvisoStorageKey(user.email), payload);
        }
        if (modoAcompanamiento !== undefined) {
          localStorage.setItem(
            "equilibra_modo_acompanamiento",
            modoAcompanamiento ? "true" : "false",
          );
        }
      } catch {
        // ignore
      }

      // 2. Actualizar estado local síncronamente
      setNeedsAcceptance(false);
      setVersionAceptada(version);
      setFechaAceptacion(timestamp);

      // 3. Notificar a todas las instancias activas del hook
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(SYNC_EVENT_NAME, {
            detail: {
              userId: user.id,
              needsAcceptance: false,
              version,
              fecha: timestamp,
            },
          }),
        );
      }

      // 4. Persistir en la tabla avisos_aceptados en Supabase
      try {
        const { error: errorAviso } = await supabase.from("avisos_aceptados").upsert(
          {
            user_id: user.id,
            version_aviso: version,
            fecha_aceptacion: timestamp,
          },
          { onConflict: "user_id" },
        );
        if (errorAviso) {
          console.warn("Aviso al registrar en avisos_aceptados:", errorAviso);
        }
      } catch (err) {
        console.warn("Error al registrar en avisos_aceptados:", err);
      }

      // 5. Actualizar también en profiles para compatibilidad
      try {
        const updatePayload: Record<string, unknown> = {
          aviso_privacidad_aceptado: true,
          aviso_privacidad_version: version,
          aviso_privacidad_fecha: timestamp,
        };

        if (modoAcompanamiento !== undefined) {
          updatePayload.modo_acompaniamiento = modoAcompanamiento;
        }

        await supabase.from("profiles").update(updatePayload).eq("id", user.id);
      } catch {
        // ignore
      }

      return true;
    },
    [user?.id, user?.email],
  );

  return {
    needsAcceptance,
    isLoading,
    versionAceptada,
    fechaAceptacion,
    acceptAviso,
    refetch: checkAviso,
  };
}
