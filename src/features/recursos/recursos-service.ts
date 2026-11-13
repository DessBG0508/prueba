import { psychoResources } from "@/lib/resources-data";
import type { PsychoResource, VideoOrientation } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "equilibra_recursos_catalogo_v1";

/**
 * Determina si la URL corresponde a un video externo que debe reproducirse en iframe (YouTube o Vimeo)
 */
export function isExternalEmbedVideo(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.includes("youtube.com") ||
    trimmed.includes("youtube-nocookie.com") ||
    trimmed.includes("youtu.be") ||
    trimmed.includes("vimeo.com")
  );
}

/**
 * Determina si la URL corresponde a un archivo de video directo (MP4, WebM, MOV, Blob o IndexedDB)
 */
export function isDirectVideoFile(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.startsWith("indexeddb://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:video") ||
    trimmed.endsWith(".mp4") ||
    trimmed.endsWith(".webm") ||
    trimmed.endsWith(".ogg") ||
    trimmed.endsWith(".mov") ||
    trimmed.includes("storage.supabase.co") ||
    trimmed.includes("/storage/v1/object/public/")
  );
}

/**
 * Detecta la orientación inicial a partir de la preferencia explícita o patrones en la URL (ej. YouTube Shorts)
 */
export function detectVideoOrientation(
  url?: string,
  explicit?: VideoOrientation,
): "horizontal" | "vertical" | "square" {
  if (explicit && explicit !== "auto") {
    return explicit;
  }
  if (url) {
    const lower = url.toLowerCase();
    if (lower.includes("youtube.com/shorts/") || lower.includes("/shorts/")) {
      return "vertical";
    }
  }
  return "horizontal";
}

/**
 * Extrae el ID de 11 caracteres de cualquier formato de URL de YouTube.
 */
function extractYouTubeId(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const vParam = parsed.searchParams.get("v");
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;

      const segments = parsed.pathname.split("/").filter(Boolean);
      if (
        segments.length >= 2 &&
        (segments[0] === "shorts" ||
          segments[0] === "embed" ||
          segments[0] === "live" ||
          segments[0] === "v") &&
        /^[a-zA-Z0-9_-]{11}$/.test(segments[1])
      ) {
        return segments[1];
      }
    }
  } catch {
    // Fallback regex si la URL viene sin protocolo completo
  }

  const regexMatch = rawUrl.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/)|youtube-nocookie\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return regexMatch ? regexMatch[1] : null;
}

/**
 * Convierte URLs estándar de YouTube (watch, youtu.be, shorts, live, embed) y Vimeo a formato embed seguro para iframes.
 */
export function getEmbedVideoUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const youtubeId = extractYouTubeId(trimmed);
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}`;
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return trimmed;
}

/**
 * Recursos iniciales enriquecidos con videos demostrativos institucionales
 */
const SEEDED_RESOURCES: PsychoResource[] = [
  {
    ...psychoResources[0],
    format: "video",
    videoUrl: "https://www.youtube.com/watch?v=T38xzsKv3GQ",
    videoTitle: "Técnica Guiada de Respiración Abdominal y Diafragmática",
    author: "Área de Psicología TESH",
    updatedAt: "Oct 2026",
    active: true,
  },
  {
    ...psychoResources[1],
    format: "video",
    videoUrl: "https://www.youtube.com/watch?v=30VMIEmA114",
    videoTitle: "Técnica de Anclaje 5-4-3-2-1 para Calmar la Ansiedad en Minutos",
    author: "Área de Psicología TESH",
    updatedAt: "Oct 2026",
    active: true,
  },
  {
    id: "rec-relajacion-muscular-jacobson",
    title: "Relajación Muscular Progresiva de Jacobson",
    shortDescription:
      "Aprende a liberar la tensión física acumulada en hombros, cuello y mandíbula tras jornadas largas de estudio.",
    category: "Estrés",
    readTime: "6 min de práctica",
    iconName: "feather",
    tone: "teal",
    format: "video",
    videoUrl: "https://www.youtube.com/watch?v=ihO02wUzgkc",
    videoTitle: "Guía Demostrativa de Relajación Muscular Progresiva",
    author: "Área de Psicología TESH",
    updatedAt: "Nov 2026",
    active: true,
    content: [
      "El estrés académico continuado provoca que mantengamos micro-contracciones involuntarias en los músculos del cuello, los hombros y la espalda.",
      "La técnica de Jacobson consiste en tensar conscientemente un grupo muscular durante 5 segundos y luego soltarlo de golpe, prestando atención a la sensación de alivio y calor que genera la relajación.",
      "Practica esta secuencia sentado cómodamente con los pies en el suelo: manos en puño, hombros hacia las orejas y mandíbula suave.",
    ],
    keyTakeaway:
      "Tensa 5 segundos, suelta de golpe y siente el contraste: el cuerpo relajado calma la mente agitada.",
  },
  ...psychoResources.slice(2).map((rec) => ({
    ...rec,
    format: "lectura" as const,
    author: "Área de Psicología TESH",
    updatedAt: "Sep 2026",
    active: true,
  })),
];

/**
 * Obtiene todos los recursos (desde Supabase o LocalStorage con fallback a semilla)
 */
export function getStoredResources(): PsychoResource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PsychoResource[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Reparar automáticamente URL rota de YouTube (404) de la semilla inicial si sigue en caché
        let repaired = false;
        const normalized = parsed.map((item) => {
          if (item.videoUrl && item.videoUrl.includes("1Dv-LDOGvuc")) {
            repaired = true;
            return { ...item, videoUrl: "https://www.youtube.com/watch?v=T38xzsKv3GQ" };
          }
          return item;
        });
        if (repaired) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
          } catch {
            // ignore
          }
        }
        return normalized;
      }
    }
  } catch {
    // fallback
  }

  // Guardar semilla inicial si es la primera vez
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEEDED_RESOURCES));
  } catch {
    // ignore
  }

  return SEEDED_RESOURCES;
}

/**
 * Carga recursos asíncronamente intentando sincronizar con Supabase
 */
export async function fetchResourcesAsync(): Promise<PsychoResource[]> {
  try {
    const { data, error } = await supabase
      .from("recursos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped: PsychoResource[] = data.map((row: Record<string, unknown>) => ({
        id: String(row.id || crypto.randomUUID()),
        title: String(row.title || "Recurso"),
        shortDescription: String(row.short_description || ""),
        category: (row.category as PsychoResource["category"]) || "Ansiedad",
        readTime: String(row.read_time || "4 min"),
        iconName: (row.icon_name as PsychoResource["iconName"]) || "bookOpen",
        tone: (row.tone as PsychoResource["tone"]) || "teal",
        content: Array.isArray(row.content)
          ? (row.content as string[])
          : typeof row.content === "string"
            ? (row.content as string).split("\n\n")
            : [],
        keyTakeaway: row.key_takeaway ? String(row.key_takeaway) : undefined,
        videoUrl: row.video_url ? String(row.video_url) : undefined,
        videoTitle: row.video_title ? String(row.video_title) : undefined,
        videoOrientation: (row.video_orientation as VideoOrientation) || "auto",
        format: (row.format as PsychoResource["format"]) || "lectura",
        author: row.author ? String(row.author) : "Área de Psicología TESH",
        updatedAt: row.updated_at ? String(row.updated_at).slice(0, 10) : "Hoy",
        active: row.active !== false,
      }));

      // Cachear localmente
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      } catch {
        // ignore
      }

      return mapped;
    }
  } catch {
    // Si no existe la tabla o hay error de red, usar almacenamiento local
  }

  return getStoredResources();
}

export interface SaveResourceResult {
  resource: PsychoResource;
  syncedToDb: boolean;
  dbError?: string;
}

/**
 * Guarda o actualiza un recurso (upsert) e informa si se sincronizó en Supabase
 */
export async function saveResourceWithStatus(
  resource: Partial<PsychoResource> & { title: string },
): Promise<SaveResourceResult> {
  const current = getStoredResources();
  const id = resource.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const finalResource: PsychoResource = {
    id,
    title: resource.title.trim(),
    shortDescription: resource.shortDescription?.trim() || "",
    category: resource.category || "Ansiedad",
    readTime: resource.readTime?.trim() || "4 min de lectura",
    iconName: resource.iconName || "bookOpen",
    tone: resource.tone || "teal",
    content:
      resource.content && resource.content.length > 0
        ? resource.content
        : ["Contenido preparado por el equipo de orientación psicológica del TESH."],
    keyTakeaway: resource.keyTakeaway?.trim() || undefined,
    videoUrl: resource.videoUrl?.trim() || undefined,
    videoTitle: resource.videoTitle?.trim() || undefined,
    videoOrientation: resource.videoOrientation || "auto",
    format: resource.videoUrl?.trim() ? "video" : resource.format || "lectura",
    author: resource.author?.trim() || "Área de Psicología TESH",
    updatedAt: new Date().toLocaleDateString("es-MX", {
      month: "short",
      year: "numeric",
    }),
    active: resource.active !== false,
  };

  const existingIndex = current.findIndex((r) => r.id === id);
  let updatedList: PsychoResource[];

  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = finalResource;
  } else {
    updatedList = [finalResource, ...current];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  } catch {
    // ignore
  }

  // Intentar sincronizar en Supabase
  let syncedToDb = false;
  let dbError: string | undefined;

  try {
    const { error } = await supabase.from("recursos").upsert({
      id: finalResource.id,
      title: finalResource.title,
      short_description: finalResource.shortDescription,
      category: finalResource.category,
      read_time: finalResource.readTime,
      icon_name: finalResource.iconName,
      tone: finalResource.tone,
      content: finalResource.content,
      key_takeaway: finalResource.keyTakeaway,
      video_url: finalResource.videoUrl,
      video_title: finalResource.videoTitle,
      video_orientation: finalResource.videoOrientation,
      format: finalResource.format,
      author: finalResource.author,
      active: finalResource.active,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      dbError = error.message;
    } else {
      syncedToDb = true;
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Error de conexión con Supabase";
  }

  return { resource: finalResource, syncedToDb, dbError };
}

/**
 * Guarda o actualiza un recurso (upsert)
 */
export async function saveResource(
  resource: Partial<PsychoResource> & { title: string },
): Promise<PsychoResource> {
  const { resource: saved } = await saveResourceWithStatus(resource);
  return saved;
}

/**
 * Elimina un recurso por su ID
 */
export async function deleteResource(id: string): Promise<boolean> {
  const current = getStoredResources();
  const updated = current.filter((r) => r.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }

  try {
    await supabase.from("recursos").delete().eq("id", id);
  } catch {
    // ignore
  }

  return true;
}

/**
 * Alterna el estado activo/inactivo de un recurso
 */
export async function toggleResourceActive(id: string): Promise<boolean> {
  const current = getStoredResources();
  const index = current.findIndex((r) => r.id === id);
  if (index === 0 || index > 0) {
    const updated = [...current];
    updated[index] = { ...updated[index], active: !updated[index].active };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    try {
      await supabase.from("recursos").update({ active: updated[index].active }).eq("id", id);
    } catch {
      // ignore
    }

    return updated[index].active ?? true;
  }
  return false;
}

/**
 * Restaura los recursos a los valores predeterminados institucionales
 */
export function resetResourcesToDefault(): PsychoResource[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEEDED_RESOURCES));
  } catch {
    // ignore
  }
  return SEEDED_RESOURCES;
}
