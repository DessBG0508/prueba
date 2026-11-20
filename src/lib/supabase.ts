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
