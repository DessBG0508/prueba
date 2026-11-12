import { createClient } from "npm:@supabase/supabase-js@2";

const TIMEOUT_MS = 25000;
const OPENAI_WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =========================================================================
// 4. RATE LIMITING (En memoria por usuario con ventana deslizante de 1 minuto)
// =========================================================================
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 segundos
const MAX_REQUESTS_PER_WINDOW = 10; // Máximo 10 transcripciones por minuto por usuario

function checkRateLimit(identifier: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  // Limpieza periódica si el mapa crece
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSec = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  entry.count += 1;
  return { allowed: true };
}

// =========================================================================
// 1. LLAMADA A OPENAI WHISPER API (Modelo: whisper-1)
// =========================================================================
async function callWhisperAPI(audioBytes: Uint8Array, mimeType: string): Promise<{ text: string }> {
  const primaryKey = Deno.env.get("OPENAI_API_KEY");
  const secondaryKey = Deno.env.get("OPENAI_API_KEY_2");

  const keys = [primaryKey, secondaryKey].filter((k): k is string => Boolean(k && k.trim()));

  if (keys.length === 0) {
    throw new Error(
      "No hay llave de API de OpenAI configurada (OPENAI_API_KEY). Configura este secreto en Supabase.",
    );
  }

  // Determinar extensión de archivo según el tipo MIME
  let extension = "webm";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) extension = "m4a";
  else if (mimeType.includes("wav")) extension = "wav";
  else if (mimeType.includes("ogg") || mimeType.includes("opus")) extension = "ogg";
  else if (mimeType.includes("mp3") || mimeType.includes("mpeg")) extension = "mp3";

  let lastError: Error | null = null;

  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    const keyLabel = i === 0 ? "OPENAI_API_KEY" : "OPENAI_API_KEY_2";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const formData = new FormData();
      const audioBlob = new Blob([audioBytes], { type: mimeType });
      formData.append("file", audioBlob, `audio.${extension}`);
      formData.append("model", "whisper-1");
      formData.append("language", "es");
      formData.append("response_format", "json");

      const res = await fetch(OPENAI_WHISPER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const transcription = (json?.text ?? "").trim();
        return { text: transcription };
      }

      const errorBody = await res.text();
      console.warn(`[Whisper] Llave ${keyLabel} falló con estado HTTP ${res.status}: ${errorBody}`);
      lastError = new Error(`Whisper API error (HTTP ${res.status}): ${errorBody}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[Whisper] Error de conexión o timeout con llave ${keyLabel}: ${message}`);
      lastError = err instanceof Error ? err : new Error(message);
    }
  }

  throw lastError ?? new Error("Fallo al conectar con OpenAI Whisper API.");
}

// =========================================================================
// HANDLER PRINCIPAL DE LA EDGE FUNCTION
// =========================================================================
Deno.serve(async (req: Request) => {
  // Manejo de preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido. Solo se acepta POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // =========================================================================
  // 2. VALIDACIÓN DE JWT (Supabase Auth)
  // =========================================================================
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Cabecera Authorization faltante. Se requiere token Bearer." }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: "Variables de entorno de Supabase no configuradas en el servidor." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Cliente con el token del llamante para validar el JWT y respetar RLS
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Usuario no autenticado o sesión expirada." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // =========================================================================
  // 4. RATE LIMITING (Por usuario autenticado)
  // =========================================================================
  const rateLimitCheck = checkRateLimit(user.id);
  if (!rateLimitCheck.allowed) {
    return new Response(
      JSON.stringify({
        error:
          "Has alcanzado el límite de notas de voz por minuto. Por favor, espera unos segundos antes de enviar otra grabación.",
        retry_after_seg: rateLimitCheck.retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(rateLimitCheck.retryAfterSec ?? 60),
        },
      },
    );
  }

  // =========================================================================
  // VALIDACIÓN DEL BODY
  // =========================================================================
  let audio_base64: string | undefined;
  let folio: string | undefined;
  let duracion_seg: number | undefined;
  let mime_type = "audio/webm";

  try {
    const body = await req.json();
    audio_base64 = body.audio_base64;
    folio = body.folio;
    duracion_seg = body.duracion_seg;
    if (body.mime_type && typeof body.mime_type === "string") {
      mime_type = body.mime_type;
    }
  } catch {
    return new Response(JSON.stringify({ error: "Cuerpo de solicitud JSON inválido." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!audio_base64 || typeof audio_base64 !== "string" || audio_base64.trim().length === 0) {
    return new Response(JSON.stringify({ error: "El campo 'audio_base64' es obligatorio." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Limpiar prefijo data URL si viniera presente (data:audio/webm;base64,...)
  const cleanBase64 = audio_base64.includes(",") ? audio_base64.split(",")[1] : audio_base64;

  // Convertir Base64 a Uint8Array binario
  let audioBytes: Uint8Array;
  try {
    const binaryString = atob(cleanBase64);
    audioBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      audioBytes[i] = binaryString.charCodeAt(i);
    }
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        error: "El formato Base64 del audio no es válido.",
        detalle: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // =========================================================================
  // 1. TRANSCRIPCIÓN CON WHISPER API
  // =========================================================================
  let transcripcion = "";
  try {
    const result = await callWhisperAPI(audioBytes, mime_type);
    transcripcion = result.text;
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error del servicio de transcripción de audio (Whisper)";
    console.error("[TranscribirVoz] Error con Whisper:", msg);
    return new Response(
      JSON.stringify({
        error:
          "El servicio de transcripción Whisper no está disponible en este momento. Intenta de nuevo o escribe tu respuesta.",
        detalle: msg,
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // =========================================================================
  // 3. PERSISTENCIA EN TABLA NOTAS_VOZ (Respetando RLS del usuario autenticado)
  // =========================================================================
  let notaId = crypto.randomUUID();
  try {
    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      folio: folio ?? null,
      folio_tamizaje: folio ?? null,
      transcripcion: transcripcion,
      duracion_seg: typeof duracion_seg === "number" ? duracion_seg : null,
    };

    const { data: nota, error: dbError } = await supabase
      .from("notas_voz")
      .insert(insertPayload)
      .select("id")
      .maybeSingle();

    if (dbError) {
      console.warn("[TranscribirVoz] Advertencia al persistir en notas_voz:", dbError.message);
    } else if (nota?.id) {
      notaId = String(nota.id);
    }
  } catch (dbErr: unknown) {
    console.warn("[TranscribirVoz] Excepción al registrar en notas_voz:", dbErr);
  }

  // Respuesta exitosa
  return new Response(
    JSON.stringify({
      transcripcion,
      nota_id: notaId,
      modelo: "whisper-1",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
