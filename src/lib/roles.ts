/**
 * Catálogo y mapeo oficial de roles de la Base de Datos (enum app_role en Supabase).
 *
 * Roles oficiales:
 * - estudiante → /
 * - psicologo  → /psicologo
 * - tutor      → /tutor
 * - coordinador → /coordinador (gestión de tutores, canalizaciones y recursamiento)
 * - jefatura   → /directivo (estadísticas estratégicas agregadas)
 */

export type AppRole = "estudiante" | "psicologo" | "jefatura" | "coordinador" | "tutor";

export function rutaPorRol(rol?: string | null): string {
  switch (rol) {
    case "psicologo":
      return "/psicologo";
    case "jefatura":
      return "/directivo";
    case "coordinador":
      return "/coordinador";
    case "tutor":
      return "/tutor";
    default:
      return "/";
  }
}
