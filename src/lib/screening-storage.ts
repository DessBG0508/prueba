/**
 * Gestión scoped por usuario del almacenamiento de tamizaje y chat de Eli.
 * Garantiza que cada usuario/alumno tenga sus propios folios, sesiones y resultados,
 * eliminando fugas de folios (como EQ-1632) o estados de bloqueo entre distintas cuentas.
 */

export function getCleanUserIdentifier(userIdOrEmail?: string | null): string {
  if (!userIdOrEmail) return "guest";
  return userIdOrEmail.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function getChatSessionsStorageKey(userIdOrEmail?: string | null): string {
  const clean = getCleanUserIdentifier(userIdOrEmail);
  return `equilibra_eli_sessions_scoped_${clean}`;
}

export function getActiveSessionStorageKey(userIdOrEmail?: string | null): string {
  const clean = getCleanUserIdentifier(userIdOrEmail);
  return `equilibra_eli_active_session_scoped_${clean}`;
}

export function getLastFolioStorageKey(userIdOrEmail?: string | null): string {
  const clean = getCleanUserIdentifier(userIdOrEmail);
  return `equilibra_ultimo_folio_scoped_${clean}`;
}

export function getStoredUserFolio(
  userId?: string | null,
  userEmail?: string | null,
): string | null {
  if (typeof window === "undefined") return null;
  const identifiers = [userId, userEmail].filter(Boolean) as string[];
  for (const id of identifiers) {
    try {
      const folio = localStorage.getItem(getLastFolioStorageKey(id));
      if (folio && folio.trim()) {
        return folio.trim();
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function setStoredUserFolio(
  userIdOrEmail: string,
  folio: string,
  altIdentifier?: string | null,
): void {
  if (typeof window === "undefined" || !userIdOrEmail || !folio) return;
  try {
    localStorage.setItem(getLastFolioStorageKey(userIdOrEmail), folio);
    if (altIdentifier) {
      localStorage.setItem(getLastFolioStorageKey(altIdentifier), folio);
    }
  } catch {
    // ignore
  }
}

export function removeStoredUserFolio(userId?: string | null, userEmail?: string | null): void {
  if (typeof window === "undefined") return;
  const identifiers = [userId, userEmail].filter(Boolean) as string[];
  for (const id of identifiers) {
    try {
      localStorage.removeItem(getLastFolioStorageKey(id));
    } catch {
      // ignore
    }
  }
}

/**
 * Limpia inmediatamente claves genéricas no-scoped y cualquier residuo
 * de sesiones anteriores compartidas entre cuentas (como EQ-1632).
 */
export function clearLegacyUnscopedScreeningData(): void {
  if (typeof window === "undefined") return;
  const legacyKeys = [
    "equilibra_ultimo_folio_tamizaje",
    "equilibra_eli_screening_sessions_v5",
    "equilibra_eli_active_session_id_v5",
    "equilibra_eli_screening_sessions_v4",
    "equilibra_eli_active_session_id_v4",
    "equilibra_eli_screening_sessions_v3",
    "equilibra_eli_chat_messages_v2",
    "equilibra_eli_chat_messages_v1",
  ];

  legacyKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  });

  // Limpiar cualquier residuo que contenga el folio específico EQ-1632 fuera de cuentas scoped
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (
        k &&
        !k.startsWith("equilibra_eli_sessions_scoped_") &&
        !k.startsWith("equilibra_ultimo_folio_scoped_")
      ) {
        const val = localStorage.getItem(k);
        if (val && val.includes("EQ-1632")) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch {
    // ignore
  }
}
