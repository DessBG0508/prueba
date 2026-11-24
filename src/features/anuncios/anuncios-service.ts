import { supabase } from "@/lib/supabase";
import { getChatSessionsStorageKey } from "@/lib/screening-storage";

export type AnuncioTipo = "taller" | "recordatorio" | "informativo" | "evento";

export type AnuncioPublicoObjetivo = "todos" | "rojo" | "amarillo" | "verde" | "sin_tamizaje";

export interface AnuncioRecord {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: AnuncioTipo;
  fecha_evento: string | null;
  lugar: string | null;
  cupo: number | null;
  inscritos: number;
  imagen_url?: string | null;
  publico_objetivo: AnuncioPublicoObjetivo;
  activo: boolean;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnuncioInput {
  titulo: string;
  descripcion: string;
  tipo: AnuncioTipo;
  fecha_evento?: string | null;
  lugar?: string | null;
  cupo?: number | null;
  imagen_url?: string | null;
  publico_objetivo: AnuncioPublicoObjetivo;
  activo?: boolean;
}

export interface AnuncioInscripcionRecord {
  id: string;
  estudiante_id: string;
  anuncio_id: string;
  fecha: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ANUNCIOS_STORAGE_KEY = "equilibra_anuncios_publicos_v1";
const INSCRIPCIONES_STORAGE_KEY = "equilibra_anuncios_inscripciones_v1";

function getUpcomingDateISO(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const SEED_ANUNCIOS: AnuncioRecord[] = [
  {
    id: "anuncio-taller-estres",
    titulo: "Taller: Manejo del Estrés Académico y Regulación Emocional",
    descripcion:
      "Aprende herramientas prácticas de respiración, organización previa a exámenes y pausas activas para cuidar tu equilibrio durante el semestre.",
    tipo: "taller",
    fecha_evento: getUpcomingDateISO(4),
    lugar: "Auditorio Edificio B · TESH",
    cupo: 30,
    inscritos: 14,
    publico_objetivo: "todos",
    activo: true,
    creado_por: "demo-psicologa-marta",
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "anuncio-taller-sueno",
    titulo: "Taller de Higiene del Sueño y Descanso Reparador",
    descripcion:
      "Sesión práctica sobre hábitos nocturnos, reducción de fatiga mental y estrategias para descansar mejor antes de jornadas escolares intensas.",
    tipo: "taller",
    fecha_evento: getUpcomingDateISO(8),
    lugar: "Sala Audiovisual · Edificio A",
    cupo: 25,
    inscritos: 9,
    publico_objetivo: "todos",
    activo: true,
    creado_por: "demo-psicologa-marta",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "anuncio-taller-nutricion",
    titulo: "Taller de Nutrición Consciente y Energía Universitaria",
    descripcion:
      "Recomendaciones accesibles de alimentación para mantener tu concentración, estado de ánimo estable y energía a lo largo del día.",
    tipo: "taller",
    fecha_evento: getUpcomingDateISO(12),
    lugar: "Centro de Bienestar · Cubículo 3",
    cupo: 20,
    inscritos: 20,
    publico_objetivo: "todos",
    activo: true,
    creado_por: "demo-psicologa-marta",
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "anuncio-informativo-orientacion",
    titulo: "Recordatorio: Horarios de Atención Psicológica Presencial TESH",
    descripcion:
      "El Departamento de Psicología brinda orientación presencial de lunes a viernes de 9:00 a 17:00 hrs en el Cubículo 3. Puedes agendar tu espacio desde Mis Citas.",
    tipo: "recordatorio",
    fecha_evento: null,
    lugar: "Cubículo 3 · Edificio Administrativo",
    cupo: null,
    inscritos: 0,
    publico_objetivo: "todos",
    activo: true,
    creado_por: "demo-psicologa-marta",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "anuncio-evento-jornada",
    titulo: "Jornada Universitaria de Bienestar Integral TESH",
    descripcion:
      "Módulos informativos, actividades de activación física, orientación nutricional y charlas breves abiertas a toda la comunidad estudiantil.",
    tipo: "evento",
    fecha_evento: getUpcomingDateISO(15),
    lugar: "Explanada Central TESH",
    cupo: 100,
    inscritos: 42,
    publico_objetivo: "todos",
    activo: true,
    creado_por: "demo-psicologa-marta",
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

function readLocal<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : seed;
  } catch {
    return seed;
  }
}

function writeLocal<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

function mapDbRowToAnuncio(row: Record<string, unknown>): AnuncioRecord {
  const rawCupo = row.cupo;
  return {
    id: String(row.id),
    titulo: String(row.titulo || ""),
    descripcion: String(row.descripcion || ""),
    tipo: (row.tipo as AnuncioTipo) || "informativo",
    fecha_evento: row.fecha_evento ? String(row.fecha_evento).slice(0, 10) : null,
    lugar: row.lugar ? String(row.lugar) : null,
    cupo: rawCupo !== null && rawCupo !== undefined ? Number(rawCupo) : null,
    inscritos: Number(row.inscritos ?? 0),
    imagen_url: row.imagen_url ? String(row.imagen_url) : null,
    publico_objetivo: (row.publico_objetivo as AnuncioPublicoObjetivo) || "todos",
    activo: row.activo !== undefined ? Boolean(row.activo) : true,
    creado_por: row.creado_por ? String(row.creado_por) : null,
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

async function getAuthUid(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id && UUID_REGEX.test(data.user.id)) {
      return data.user.id;
    }
  } catch {
    // Ignore auth lookup errors
  }
  return null;
}

/**
 * Obtener todos los anuncios (para el panel de psicología: activos y ocultos)
 */
export async function getAllAnuncios(): Promise<AnuncioRecord[]> {
  const local = readLocal<AnuncioRecord>(ANUNCIOS_STORAGE_KEY, SEED_ANUNCIOS);

  try {
    const { data, error } = await supabase
      .from("anuncios")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      const dbRows = data.map((row) => mapDbRowToAnuncio(row as Record<string, unknown>));
      if (dbRows.length > 0) {
        const dbIds = new Set(dbRows.map((r) => r.id));
        return [...dbRows, ...local.filter((l) => !UUID_REGEX.test(l.id) && !dbIds.has(l.id))];
      }
      return local;
    }
  } catch {
    // Fallback local
  }

  return [...local].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/**
 * Obtener anuncios públicos activos (para el home del estudiante)
 */
export async function getActiveAnuncios(): Promise<AnuncioRecord[]> {
  const local = readLocal<AnuncioRecord>(ANUNCIOS_STORAGE_KEY, SEED_ANUNCIOS);
  const localActive = local.filter((a) => a.activo);

  try {
    const { data, error } = await supabase
      .from("anuncios")
      .select("*")
      .eq("activo", true)
      .order("fecha_evento", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      const dbRows = data.map((row) => mapDbRowToAnuncio(row as Record<string, unknown>));
      if (dbRows.length > 0) {
        const dbIds = new Set(dbRows.map((r) => r.id));
        const extraLocal = localActive.filter((l) => !UUID_REGEX.test(l.id) && !dbIds.has(l.id));
        return [...dbRows, ...extraLocal];
      }
      return localActive;
    }
  } catch {
    // Fallback local
  }

  return localActive;
}

/**
 * Crear o actualizar un anuncio desde el panel del psicólogo
 */
export async function saveAnuncio(
  input: AnuncioInput,
  existingId?: string,
): Promise<{ ok: boolean; anuncio?: AnuncioRecord; error?: string }> {
  const tituloClean = input.titulo.trim();
  const descripcionClean = input.descripcion.trim();
  if (!tituloClean || !descripcionClean) {
    return { ok: false, error: "Título y descripción son obligatorios." };
  }

  const cupoClean =
    input.cupo !== null && input.cupo !== undefined && !Number.isNaN(Number(input.cupo))
      ? Math.max(0, Math.floor(Number(input.cupo)))
      : null;

  const authUid = await getAuthUid();
  const nowIso = new Date().toISOString();

  const localList = readLocal<AnuncioRecord>(ANUNCIOS_STORAGE_KEY, SEED_ANUNCIOS);
  const existingLocal = existingId ? localList.find((a) => a.id === existingId) : undefined;

  const nextRecord: AnuncioRecord = {
    id:
      existingId || `anuncio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    titulo: tituloClean,
    descripcion: descripcionClean,
    tipo: input.tipo,
    fecha_evento: input.fecha_evento ? input.fecha_evento.trim() : null,
    lugar: input.lugar ? input.lugar.trim() : null,
    cupo: cupoClean,
    inscritos: existingLocal?.inscritos ?? 0,
    imagen_url: input.imagen_url ? input.imagen_url.trim() : null,
    publico_objetivo: input.publico_objetivo || "todos",
    activo: input.activo !== undefined ? input.activo : (existingLocal?.activo ?? true),
    creado_por: existingLocal?.creado_por || authUid || "demo-psicologa-marta",
    created_at: existingLocal?.created_at || nowIso,
    updated_at: nowIso,
  };

  try {
    if (existingId && UUID_REGEX.test(existingId)) {
      const updatePayload: Record<string, unknown> = {
        titulo: nextRecord.titulo,
        descripcion: nextRecord.descripcion,
        tipo: nextRecord.tipo,
        fecha_evento: nextRecord.fecha_evento || null,
        lugar: nextRecord.lugar || null,
        cupo: nextRecord.cupo,
        imagen_url: nextRecord.imagen_url || null,
        publico_objetivo: nextRecord.publico_objetivo,
        activo: nextRecord.activo,
        updated_at: nowIso,
      };

      let { data, error } = await supabase
        .from("anuncios")
        .update(updatePayload)
        .eq("id", existingId)
        .select()
        .single();

      if (error && error.message.toLowerCase().includes("imagen_url")) {
        delete updatePayload.imagen_url;
        const retry = await supabase
          .from("anuncios")
          .update(updatePayload)
          .eq("id", existingId)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        const mapped = mapDbRowToAnuncio(data as Record<string, unknown>);
        if (!mapped.imagen_url && nextRecord.imagen_url) {
          mapped.imagen_url = nextRecord.imagen_url;
        }
        const updatedLocal = [mapped, ...localList.filter((a) => a.id !== mapped.id)];
        writeLocal(ANUNCIOS_STORAGE_KEY, updatedLocal);
        return { ok: true, anuncio: mapped };
      }
      if (error && !error.message.toLowerCase().includes("does not exist")) {
        // If DB explicitly denied or rejected when authenticated in prod
        if (authUid) {
          return { ok: false, error: error.message };
        }
      }
    } else if (!existingId && authUid) {
      const insertPayload: Record<string, unknown> = {
        titulo: nextRecord.titulo,
        descripcion: nextRecord.descripcion,
        tipo: nextRecord.tipo,
        fecha_evento: nextRecord.fecha_evento || null,
        lugar: nextRecord.lugar || null,
        cupo: nextRecord.cupo,
        imagen_url: nextRecord.imagen_url || null,
        publico_objetivo: nextRecord.publico_objetivo,
        activo: nextRecord.activo,
        creado_por: authUid,
      };

      let { data, error } = await supabase.from("anuncios").insert(insertPayload).select().single();

      if (error && error.message.toLowerCase().includes("imagen_url")) {
        delete insertPayload.imagen_url;
        const retry = await supabase.from("anuncios").insert(insertPayload).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        const mapped = mapDbRowToAnuncio(data as Record<string, unknown>);
        if (!mapped.imagen_url && nextRecord.imagen_url) {
          mapped.imagen_url = nextRecord.imagen_url;
        }
        const updatedLocal = [mapped, ...localList.filter((a) => a.id !== mapped.id)];
        writeLocal(ANUNCIOS_STORAGE_KEY, updatedLocal);
        return { ok: true, anuncio: mapped };
      }
    }
  } catch {
    // Fallback local
  }

  const updatedLocal = existingId
    ? localList.map((a) => (a.id === existingId ? nextRecord : a))
    : [nextRecord, ...localList];
  writeLocal(ANUNCIOS_STORAGE_KEY, updatedLocal);
  return { ok: true, anuncio: nextRecord };
}

/**
 * Ocultar o reactivar un anuncio
 */
export async function toggleAnuncioActivo(
  anuncioId: string,
  activo: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const nowIso = new Date().toISOString();

  if (UUID_REGEX.test(anuncioId)) {
    try {
      const { error } = await supabase
        .from("anuncios")
        .update({ activo, updated_at: nowIso })
        .eq("id", anuncioId);
      if (error) {
        return { ok: false, error: error.message };
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "No se pudo cambiar el estado del anuncio.",
      };
    }
  }

  const localList = readLocal<AnuncioRecord>(ANUNCIOS_STORAGE_KEY, SEED_ANUNCIOS);
  writeLocal(
    ANUNCIOS_STORAGE_KEY,
    localList.map((a) => (a.id === anuncioId ? { ...a, activo, updated_at: nowIso } : a)),
  );
  return { ok: true };
}

/**
 * Eliminar un anuncio
 */
export async function deleteAnuncio(anuncioId: string): Promise<{ ok: boolean; error?: string }> {
  if (UUID_REGEX.test(anuncioId)) {
    try {
      const { error } = await supabase.from("anuncios").delete().eq("id", anuncioId);
      if (error) {
        return { ok: false, error: error.message };
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "No se pudo eliminar el anuncio.",
      };
    }
  }

  const localList = readLocal<AnuncioRecord>(ANUNCIOS_STORAGE_KEY, SEED_ANUNCIOS);
  writeLocal(
    ANUNCIOS_STORAGE_KEY,
    localList.filter((a) => a.id !== anuncioId),
  );
  return { ok: true };
}

/**
 * Consultar el último nivel de tamizaje del estudiante actual ('rojo' | 'amarillo' | 'verde' | 'sin_tamizaje')
 * para segmentación interna de banners (sin exponer datos clínicos en la UI).
 */
export async function getStudentLatestRiskLevel(
  userId?: string | null,
  userEmail?: string | null,
): Promise<Exclude<AnuncioPublicoObjetivo, "todos">> {
  const authUid = await getAuthUid();
  const effectiveUid = authUid || userId;

  if (effectiveUid && UUID_REGEX.test(effectiveUid)) {
    try {
      const { data: paciente } = await supabase
        .from("pacientes")
        .select("folio")
        .eq("user_id", effectiveUid)
        .order("fecha_registro", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paciente?.folio) {
        const { data: resp } = await supabase
          .from("respuestas_tamizaje")
          .select("nivel")
          .eq("folio", paciente.folio)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nivel = String(resp?.nivel || "").toLowerCase();
        if (nivel === "rojo" || nivel === "amarillo" || nivel === "verde") {
          return nivel;
        }
      }
    } catch {
      // Fallback a sesiones locales del chat
    }
  }

  // Fallback local: revisar sesiones de tamizaje scoped del usuario
  if (typeof window !== "undefined") {
    const keys = [userId, userEmail].filter(Boolean).map((id) => getChatSessionsStorageKey(id));

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const sessions = JSON.parse(raw);
        if (!Array.isArray(sessions)) continue;
        for (const sess of sessions) {
          const st = sess?.screeningState;
          if (st?.step === "completed" && st?.nivel) {
            const nivel = String(st.nivel).toLowerCase();
            if (nivel === "rojo" || nivel === "amarillo" || nivel === "verde") {
              return nivel;
            }
          }
        }
      } catch {
        // Ignore parse error
      }
    }
  }

  return "sin_tamizaje";
}

/**
 * Obtener IDs de anuncios en los que el estudiante ya está inscrito
 */
export async function getStudentAnuncioInscripciones(studentId?: string | null): Promise<string[]> {
  const authUid = await getAuthUid();
  const effectiveId = authUid || studentId || "";
  if (!effectiveId) return [];

  const localInsc = readLocal<AnuncioInscripcionRecord>(INSCRIPCIONES_STORAGE_KEY, []);
  const localIds = localInsc
    .filter((i) => i.estudiante_id === effectiveId)
    .map((i) => i.anuncio_id);

  if (UUID_REGEX.test(effectiveId)) {
    try {
      const { data, error } = await supabase
        .from("anuncios_inscripciones")
        .select("anuncio_id")
        .eq("estudiante_id", effectiveId);

      if (!error && Array.isArray(data)) {
        const dbIds = data.map((r) => String(r.anuncio_id));
        return Array.from(new Set([...dbIds, ...localIds]));
      }
    } catch {
      // Fallback local
    }
  }

  return Array.from(new Set(localIds));
}

/**
 * Inscribir a un estudiante en un taller o evento (INSERT en anuncios_inscripciones)
 * Valida cupo disponible y actualiza el contador en tiempo real.
 */
export async function inscribirEstudianteEnAnuncio(input: {
  anuncioId: string;
  studentId: string;
}): Promise<{ ok: boolean; inscritos?: number; alreadyEnrolled?: boolean; error?: string }> {
  const authUid = await getAuthUid();
  const effectiveStudentId = authUid || input.studentId;
  if (!effectiveStudentId) {
    return { ok: false, error: "Inicia sesión para inscribirte." };
  }

  const localInsc = readLocal<AnuncioInscripcionRecord>(INSCRIPCIONES_STORAGE_KEY, []);
  const alreadyLocal = localInsc.some(
    (i) => i.anuncio_id === input.anuncioId && i.estudiante_id === effectiveStudentId,
  );
  if (alreadyLocal) {
    return { ok: true, alreadyEnrolled: true };
  }

  const localAnuncios = readLocal<AnuncioRecord>(ANUNCIOS_STORAGE_KEY, SEED_ANUNCIOS);
  const targetAnuncio = localAnuncios.find((a) => a.id === input.anuncioId);

  if (
    targetAnuncio &&
    targetAnuncio.cupo !== null &&
    targetAnuncio.cupo > 0 &&
    targetAnuncio.inscritos >= targetAnuncio.cupo
  ) {
    return { ok: false, error: "Cupo lleno" };
  }

  if (UUID_REGEX.test(input.anuncioId) && UUID_REGEX.test(effectiveStudentId)) {
    try {
      const { error } = await supabase.from("anuncios_inscripciones").insert({
        anuncio_id: input.anuncioId,
        estudiante_id: effectiveStudentId,
        fecha: new Date().toISOString(),
      });

      if (error) {
        if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
          return { ok: true, alreadyEnrolled: true };
        }
        return {
          ok: false,
          error: error.message.includes("Cupo lleno") ? "Cupo lleno" : error.message,
        };
      }

      const { data: refreshed } = await supabase
        .from("anuncios")
        .select("inscritos")
        .eq("id", input.anuncioId)
        .maybeSingle();

      const nextCount = Number(refreshed?.inscritos ?? (targetAnuncio?.inscritos ?? 0) + 1);
      const nextInsc: AnuncioInscripcionRecord = {
        id: `insc-${Date.now().toString(36)}`,
        anuncio_id: input.anuncioId,
        estudiante_id: effectiveStudentId,
        fecha: new Date().toISOString(),
      };
      writeLocal(INSCRIPCIONES_STORAGE_KEY, [nextInsc, ...localInsc]);
      return { ok: true, inscritos: nextCount };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "No se pudo completar la inscripción.",
      };
    }
  }

  // Modo demo / local
  const nextCount = (targetAnuncio?.inscritos ?? 0) + 1;
  const nextAnuncios = localAnuncios.map((a) =>
    a.id === input.anuncioId
      ? { ...a, inscritos: nextCount, updated_at: new Date().toISOString() }
      : a,
  );
  writeLocal(ANUNCIOS_STORAGE_KEY, nextAnuncios);

  const nextInsc: AnuncioInscripcionRecord = {
    id: `insc-${Date.now().toString(36)}`,
    anuncio_id: input.anuncioId,
    estudiante_id: effectiveStudentId,
    fecha: new Date().toISOString(),
  };
  writeLocal(INSCRIPCIONES_STORAGE_KEY, [nextInsc, ...localInsc]);

  return { ok: true, inscritos: nextCount };
}

/**
 * Comprimir imagen localmente (para fallback/demo o vista previa rápida)
 */
function compressFlyerToDataUrl(file: File, maxWidth = 1080): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result || ""));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.84));
      };
      img.onerror = () => reject(new Error("No se pudo procesar la imagen del flyer."));
      img.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado."));
    reader.readAsDataURL(file);
  });
}

/**
 * Subir flyer de taller/anuncio a Supabase Storage (bucket `anuncios-flyers`)
 * con fallback comprimido local si se opera en modo demo o sin bucket configurado.
 */
export async function uploadAnuncioFlyerImage(file: File): Promise<{
  url: string;
  isLocal: boolean;
  storageError?: string;
}> {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Formato no compatible. Sube una imagen JPG, PNG, WebP o GIF.");
  }
  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("La imagen del flyer no debe superar los 8 MB.");
  }

  const authUid = await getAuthUid();
  if (authUid) {
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safePath = `flyers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("anuncios-flyers")
        .upload(safePath, file, { upsert: true, contentType: file.type });

      if (!error) {
        const { data: pub } = supabase.storage.from("anuncios-flyers").getPublicUrl(safePath);
        if (pub?.publicUrl) {
          return { url: pub.publicUrl, isLocal: false };
        }
      } else {
        const dataUrl = await compressFlyerToDataUrl(file);
        return { url: dataUrl, isLocal: true, storageError: error.message };
      }
    } catch (err) {
      const dataUrl = await compressFlyerToDataUrl(file);
      return {
        url: dataUrl,
        isLocal: true,
        storageError: err instanceof Error ? err.message : undefined,
      };
    }
  }

  const dataUrl = await compressFlyerToDataUrl(file);
  return { url: dataUrl, isLocal: true };
}

/**
 * Suscripción en tiempo real para actualizar contador de inscritos/cupo en vivo
 */
export function subscribeToAnunciosChanges(onChange: () => void): () => void {
  try {
    const channel = supabase
      .channel("anuncios-realtime-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "anuncios" }, () => {
        onChange();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "anuncios_inscripciones" },
        () => {
          onChange();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  } catch {
    return () => {};
  }
}
