import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "equilibra_media_db";
const STORE_NAME = "videos";
const DB_VERSION = 1;

/**
 * Abre o crea la base de datos IndexedDB para almacenamiento de videos locales de alta capacidad
 */
function openMediaDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB no está disponible en este entorno"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Guarda un Blob/File de video en IndexedDB y retorna un ID persistente
 */
export async function saveVideoToIndexedDB(
  id: string,
  file: File | Blob,
  metadata: { fileName: string; type: string; size: number },
): Promise<string> {
  const db = await openMediaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record = {
      id,
      blob: file,
      fileName: metadata.fileName,
      type: metadata.type,
      size: metadata.size,
      createdAt: Date.now(),
    };

    const req = store.put(record);
    req.onsuccess = () => resolve(`indexeddb://${id}`);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Obtiene un Blob de video desde IndexedDB por su ID
 */
export async function getVideoFromIndexedDB(id: string): Promise<Blob | null> {
  try {
    const db = await openMediaDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob as Blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Cache en memoria de Object URLs creados para no duplicar llamadas a createObjectURL
 */
const resolvedObjectUrls = new Map<string, string>();

/**
 * Resuelve una URL de video (convirtiendo referencias indexeddb:// a blob: URLs reproducibles)
 */
export async function resolvePlayableVideoUrl(url?: string): Promise<string | null> {
  if (!url) return null;
  const trimmed = url.trim();

  // Si ya es un blob: o https: o data:
  if (
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  // Si es una referencia a IndexedDB (indexeddb://ID)
  if (trimmed.startsWith("indexeddb://")) {
    const id = trimmed.replace("indexeddb://", "");
    if (resolvedObjectUrls.has(id)) {
      return resolvedObjectUrls.get(id)!;
    }

    const blob = await getVideoFromIndexedDB(id);
    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      resolvedObjectUrls.set(id, objectUrl);
      return objectUrl;
    }
  }

  return trimmed;
}

/**
 * Formatea bytes a cadena legible (ej: 14.5 MB)
 */
export function formatVideoSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Valida y sube un archivo de video directamente.
 * 1. Intenta subir a Supabase Storage (bucket "recursos-videos" o "public")
 * 2. Si Supabase Storage no está provisionado, almacena en IndexedDB localmente sin límite de 5MB
 */
export async function uploadDirectVideoFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ url: string; fileName: string; size: number; isLocal: boolean }> {
  // Validación básica
  const validTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
  const isVideo = validTypes.includes(file.type) || file.name.match(/\.(mp4|webm|ogg|mov)$/i);

  if (!isVideo) {
    throw new Error(
      "El archivo seleccionado no es un formato de video compatible (.mp4, .webm, .mov).",
    );
  }

  // Límite razonable: 150 MB
  const MAX_SIZE = 150 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(
      "El video excede el límite máximo de 150 MB. Intenta comprimirlo antes de subirlo.",
    );
  }

  onProgress?.(20);

  // 1. Intentar subir a Supabase Storage
  try {
    const ext = file.name.split(".").pop() || "mp4";
    const cleanName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const { data, error } = await supabase.storage.from("recursos-videos").upload(cleanName, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (!error && data) {
      onProgress?.(100);
      const { data: pubData } = supabase.storage.from("recursos-videos").getPublicUrl(cleanName);
      return {
        url: pubData.publicUrl,
        fileName: file.name,
        size: file.size,
        isLocal: false,
      };
    }
  } catch {
    // Bucket de storage no disponible en Supabase, pasamos a almacenamiento local seguro
  }

  onProgress?.(60);

  // 2. Almacenamiento seguro en IndexedDB
  const videoId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const indexedDbRef = await saveVideoToIndexedDB(videoId, file, {
    fileName: file.name,
    type: file.type,
    size: file.size,
  });

  // Crear ObjectURL para previsualización inmediata
  const immediateUrl = URL.createObjectURL(file);
  resolvedObjectUrls.set(videoId, immediateUrl);

  onProgress?.(100);

  return {
    url: indexedDbRef,
    fileName: file.name,
    size: file.size,
    isLocal: true,
  };
}
