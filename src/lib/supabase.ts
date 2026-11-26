import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env");
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("https://") &&
  supabaseAnonKey.length > 20,
);

/**
 * Cliente oficial de Supabase para Equilibra TESH.
 * Gestiona autenticación, base de datos y políticas de seguridad (RLS).
 *
 * ARQUITECTURA DE ALMACENAMIENTO, RESPALDOS Y SEGURIDAD:
 * - Base de datos en la nube: PostgreSQL administrado en Supabase (normalizada en 3FN),
 *   expuesta al cliente únicamente mediante VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
 *   (clave pública anónima segura por diseño al estar protegida por Row Level Security).
 * - Videos psicoeducativos: almacenados en Supabase Storage (bucket `recursos-videos`)
 *   con políticas RLS por rol (solo psicólogos/directivos pueden subir o eliminar).
 * - Audio de notas de voz: procesamiento estrictamente EFÍMERO en la Edge Function
 *   `transcribir-voz` (se envía a Whisper para obtener texto y no se persiste ningún archivo de audio).
 * - Respaldos automáticos: Supabase provee respaldos automáticos diarios y Point-in-Time
 *   Recovery (PITR) para recuperación ante desastres.
 * - Cifrado y HTTPS: tráfico forzado por HTTPS / TLS 1.3 (Vercel y Supabase) y datos en reposo
 *   cifrados con AES-256.
 * - Sesiones JWT: Supabase Auth emite JWT de corta duración con rotación automática
 *   (`autoRefreshToken: true`); en arquitectura SPA el almacenamiento en cliente requiere
 *   `httpOnly=false`, mitigado mediante expiración corta y validación de token en cada request/Edge Function.
 * - Monitoreo: logs y métricas de consultas SQL auditables en tiempo real desde Supabase Dashboard.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Determina si un ID corresponde a un usuario de demostración local (sin cuenta real en Supabase Auth).
 */
export function isDemoUserId(userId?: string | null): boolean {
  if (!userId) return true;
  return userId.startsWith("demo-") || !UUID_REGEX.test(userId);
}

/**
 * Devuelve el UUID del usuario autenticado en Supabase Auth si existe una sesión real;
 * devuelve null si se está operando con una cuenta demo o sin sesión en la nube.
 */
export async function getRealSupabaseUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    return uid && UUID_REGEX.test(uid) ? uid : null;
  } catch {
    return null;
  }
}

/**
 * Devuelve true únicamente cuando el usuario actual inició sesión con una cuenta real
 * registrada en Supabase Auth (no en modo demo).
 */
export async function hasRealSupabaseSession(): Promise<boolean> {
  const uid = await getRealSupabaseUserId();
  return uid !== null;
}
