import { supabase } from "@/lib/supabase";

export type CanalizacionPrioridad = "baja" | "normal" | "alta" | "urgente";
export type CanalizacionEstado = "pendiente" | "aceptada" | "rechazada" | "completada";
export type AlertaTipo = "no_asistio" | "inasistencia_repetida" | "no_canalizacion";

export interface TutorProfile {
  id: string;
  nombre: string;
  email?: string;
  matricula?: string;
  carrera?: string;
  grupo?: string;
  semestre?: string;
  rol?: string;
}

export interface TutorGrupoAssignment {
  id: string;
  tutor_id: string;
  tutor_nombre?: string;
  carrera: string;
  grupo: string;
  semestre: string;
  activo?: boolean;
  created_at?: string;
}

export interface TutorStudentItem {
  id: string;
  nombre: string;
  matricula: string;
  carrera: string;
  grupo: string;
  semestre: string;
}

export interface CanalizacionRecord {
  id: string;
  tutor_id: string;
  tutor_nombre?: string;
  psicologo_id?: string | null;
  psicologo_nombre?: string | null;
  estudiante_id: string;
  estudiante_nombre?: string;
  estudiante_iniciales?: string;
  folio?: string | null;
  carrera?: string;
  grupo?: string;
  semestre?: string;
  motivo: string;
  prioridad: CanalizacionPrioridad;
  estado: CanalizacionEstado;
  motivo_rechazo?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AlertaInasistencia {
  id: string;
  tutor_id: string;
  psicologo_id?: string | null;
  estudiante_id?: string | null;
  folio?: string | null;
  tipo_alerta: AlertaTipo;
  prioridad?: CanalizacionPrioridad;
  mensaje: string;
  leida_tutor: boolean;
  leida_estudiante?: boolean;
  created_at: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TUTORES_GRUPO_KEY = "equilibra_tutores_grupo_v1";
const CANALIZACIONES_KEY = "equilibra_canalizaciones_v1";
const ALERTAS_TUTOR_KEY = "equilibra_alertas_inasistencia_v1";

const DEMO_TUTOR_PROFILES: TutorProfile[] = [
  {
    id: "demo-tutor-carlos",
    nombre: "Mtro. Carlos Mendoza",
    email: "tutor@tesh.mx",
    matricula: "TUT-50101",
    carrera: "Ing. en Sistemas Computacionales",
    grupo: "501",
    semestre: "5",
    rol: "tutor",
  },
  {
    id: "demo-tutor-laura",
    nombre: "Mtra. Laura Sánchez",
    email: "laura.tutor@tesh.mx",
    matricula: "TUT-30204",
    carrera: "Ing. Industrial",
    grupo: "302",
    semestre: "3",
    rol: "tutor",
  },
  {
    id: "demo-tutor-hector",
    nombre: "Mtro. Héctor Ramírez",
    email: "hector.tutor@tesh.mx",
    matricula: "TUT-40108",
    carrera: "Ing. Mecatrónica",
    grupo: "401",
    semestre: "4",
    rol: "tutor",
  },
];

const SEED_TUTORES_GRUPO: TutorGrupoAssignment[] = [
  {
    id: "tg-demo-501",
    tutor_id: "demo-tutor-carlos",
    tutor_nombre: "Mtro. Carlos Mendoza",
    carrera: "Ing. en Sistemas Computacionales",
    grupo: "501",
    semestre: "5",
    activo: true,
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: "tg-demo-601",
    tutor_id: "demo-tutor-carlos",
    tutor_nombre: "Mtro. Carlos Mendoza",
    carrera: "Ing. en Sistemas Computacionales",
    grupo: "601",
    semestre: "6",
    activo: true,
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: "tg-demo-302",
    tutor_id: "demo-tutor-laura",
    tutor_nombre: "Mtra. Laura Sánchez",
    carrera: "Ing. Industrial",
    grupo: "302",
    semestre: "3",
    activo: true,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

const SEED_STUDENTS_DEMO: TutorStudentItem[] = [
  {
    id: "demo-student-dess",
    nombre: "Dess Bautista",
    matricula: "202310452",
    carrera: "Ing. en Sistemas Computacionales",
    grupo: "501",
    semestre: "5",
  },
  {
    id: "demo-student-isc-2",
    nombre: "Valeria Morales",
    matricula: "202310489",
    carrera: "Ing. en Sistemas Computacionales",
    grupo: "501",
    semestre: "5",
  },
  {
    id: "demo-student-isc-3",
    nombre: "Diego Hernández",
    matricula: "202310511",
    carrera: "Ing. en Sistemas Computacionales",
    grupo: "501",
    semestre: "5",
  },
  {
    id: "demo-student-isc-4",
    nombre: "Sofía Navarro",
    matricula: "202310540",
    carrera: "Ing. en Sistemas Computacionales",
    grupo: "501",
    semestre: "5",
  },
  {
    id: "demo-student-isc-5",
    nombre: "Emiliano Cruz",
    matricula: "202310577",
    carrera: "Ing. en Sistemas Computacionales",
    grupo: "501",
    semestre: "5",
  },
  {
    id: "demo-student-isc-601-1",
    nombre: "Fernanda López",
    matricula: "202210301",
    carrera: "Ing. en Sistemas Computacionales",
    grupo: "601",
    semestre: "6",
  },
  {
    id: "demo-student-isc-601-2",
    nombre: "Mateo Jiménez",
    matricula: "202210315",
    carrera: "Ing. en Sistemas Computacionales",
    grupo: "601",
    semestre: "6",
  },
  {
    id: "demo-student-isc-601-3",
    nombre: "Camila Ortega",
    matricula: "202210349",
    carrera: "Ing. en Sistemas Computacionales",
    grupo: "601",
    semestre: "6",
  },
];

const SEED_CANALIZACIONES: CanalizacionRecord[] = [
  {
    id: "can-demo-001",
    tutor_id: "demo-tutor-carlos",
    tutor_nombre: "Mtro. Carlos Mendoza",
    psicologo_id: null,
    estudiante_id: "demo-student-isc-2",
    estudiante_nombre: "Valeria Morales",
    estudiante_iniciales: "V.M.",
    folio: null,
    carrera: "Ing. en Sistemas Computacionales",
    grupo: "501",
    semestre: "5",
    motivo:
      "Disminución reciente en entrega de prácticas y cansancio visible durante tutoría grupal.",
    prioridad: "alta",
    estado: "pendiente",
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "can-demo-002",
    tutor_id: "demo-tutor-laura",
    tutor_nombre: "Mtra. Laura Sánchez",
    psicologo_id: "demo-psicologa-marta",
    psicologo_nombre: "Dra. Marta Gómez",
    estudiante_id: "demo-user-student-2",
    estudiante_nombre: "Mateo Rivera",
    estudiante_iniciales: "M.R.",
    folio: null,
    carrera: "Ing. Industrial",
    grupo: "302",
    semestre: "3",
    motivo: "Seguimiento académico y manejo de ansiedad previo a evaluaciones parciales.",
    prioridad: "normal",
    estado: "completada",
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
];

const SEED_ALERTAS: AlertaInasistencia[] = [
  {
    id: "alerta-demo-001",
    tutor_id: "demo-tutor-carlos",
    psicologo_id: "demo-psicologa-marta",
    estudiante_id: "demo-student-dess",
    folio: null,
    tipo_alerta: "no_asistio",
    prioridad: "alta",
    mensaje: "Dess Bautista (Grupo 501) no asistió a su cita programada de seguimiento.",
    leida_tutor: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
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

function writeLocal<T>(key: string, list: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Ignore quota errors
  }
}

function normalizeText(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

function normalizeSemestre(value?: string | number | null): string {
  const raw = String(value ?? "").trim();
  const digits = raw.match(/\d+/);
  return digits ? digits[0] : raw.toLowerCase();
}

function buildInitials(name?: string | null): string {
  const clean = (name || "").trim();
  if (!clean) return "E.T.";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return `${parts[0][0].toUpperCase()}.`;
  return `${parts[0][0].toUpperCase()}.${parts[1][0].toUpperCase()}.`;
}

export async function getAuthenticatedUid(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id && UUID_REGEX.test(data.user.id)) {
      return data.user.id;
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Obtener lista de perfiles con rol = 'tutor'
 */
export async function getTutorProfiles(): Promise<TutorProfile[]> {
  try {
    let { data, error } = await supabase
      .from("profiles")
      .select("id, nombre, matricula, carrera, semestre, grupo, rol")
      .eq("rol", "tutor")
      .order("nombre", { ascending: true });

    if (error && error.message.toLowerCase().includes("rol")) {
      const fallback = await supabase
        .from("profiles")
        .select("id, nombre, matricula, carrera, semestre, grupo, role")
        .eq("role", "tutor")
        .order("nombre", { ascending: true });
      data = fallback.data as typeof data;
      error = fallback.error;
    }

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((p: Record<string, unknown>) => ({
        id: String(p.id),
        nombre: String(p.nombre || "Tutor TESH"),
        matricula: p.matricula ? String(p.matricula) : undefined,
        carrera: p.carrera ? String(p.carrera) : undefined,
        semestre: p.semestre ? String(p.semestre) : undefined,
        grupo: p.grupo ? String(p.grupo) : undefined,
        rol: String(p.rol || p.role || "tutor"),
      }));
    }
  } catch {
    // Fallback local
  }

  return DEMO_TUTOR_PROFILES;
}

/**
 * Obtener todas las asignaciones tutor-grupo (para Directivo o búsqueda)
 */
export async function getAllTutorGroupAssignments(): Promise<TutorGrupoAssignment[]> {
  const local = readLocal<TutorGrupoAssignment>(TUTORES_GRUPO_KEY, SEED_TUTORES_GRUPO);

  try {
    const { data, error } = await supabase
      .from("tutores_grupo")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const profiles = await getTutorProfiles();
      const profileMap = new Map(profiles.map((p) => [p.id, p.nombre]));

      const dbRows: TutorGrupoAssignment[] = data.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        tutor_id: String(row.tutor_id),
        tutor_nombre:
          (row.tutor_nombre ? String(row.tutor_nombre) : undefined) ||
          profileMap.get(String(row.tutor_id)) ||
          "Tutor asignado",
        carrera: String(row.carrera || ""),
        grupo: String(row.grupo || ""),
        semestre: String(row.semestre || ""),
        activo: row.activo !== undefined ? Boolean(row.activo) : true,
        created_at: row.created_at ? String(row.created_at) : undefined,
      }));

      const seenIds = new Set(dbRows.map((r) => r.id));
      return [...dbRows, ...local.filter((l) => !seenIds.has(l.id))];
    }
  } catch {
    // Fallback local
  }

  return local;
}

/**
 * Obtener grupos activos asignados a un tutor (tutores_grupo donde tutor_id = auth.uid() AND activo = true)
 */
export async function getTutorGroupAssignments(
  tutorId: string,
  fallbackUser?: { name?: string; carrera?: string; grupo?: string; semestre?: string },
): Promise<TutorGrupoAssignment[]> {
  const authUid = await getAuthenticatedUid();
  const effectiveTutorId = authUid || tutorId;
  const local = readLocal<TutorGrupoAssignment>(TUTORES_GRUPO_KEY, SEED_TUTORES_GRUPO);

  if (UUID_REGEX.test(effectiveTutorId)) {
    try {
      let { data, error } = await supabase
        .from("tutores_grupo")
        .select("*")
        .eq("tutor_id", effectiveTutorId)
        .eq("activo", true)
        .order("created_at", { ascending: false });

      if (error && error.message.toLowerCase().includes("activo")) {
        const retry = await supabase
          .from("tutores_grupo")
          .select("*")
          .eq("tutor_id", effectiveTutorId)
          .order("created_at", { ascending: false });
        data = retry.data;
        error = retry.error;
      }

      if (!error && Array.isArray(data) && data.length > 0) {
        return data
          .filter((row: Record<string, unknown>) => row.activo !== false)
          .map((row: Record<string, unknown>) => ({
            id: String(row.id),
            tutor_id: String(row.tutor_id),
            tutor_nombre: row.tutor_nombre ? String(row.tutor_nombre) : fallbackUser?.name,
            carrera: String(row.carrera || ""),
            grupo: String(row.grupo || ""),
            semestre: String(row.semestre || ""),
            activo: row.activo !== undefined ? Boolean(row.activo) : true,
            created_at: row.created_at ? String(row.created_at) : undefined,
          }));
      }
    } catch {
      // Continuar a fallback
    }
  }

  const matchedLocal = local.filter((a) => a.tutor_id === effectiveTutorId && a.activo !== false);
  if (matchedLocal.length > 0) {
    // Si es la cuenta demo principal y aún no tiene el segundo grupo en caché local, unir semillas faltantes
    if (effectiveTutorId === "demo-tutor-carlos") {
      const seen = new Set(matchedLocal.map((m) => m.id));
      const missingSeeds = SEED_TUTORES_GRUPO.filter(
        (s) => s.tutor_id === "demo-tutor-carlos" && !seen.has(s.id),
      );
      if (missingSeeds.length > 0) {
        return [...matchedLocal, ...missingSeeds];
      }
    }
    return matchedLocal;
  }

  if (fallbackUser?.carrera && fallbackUser?.grupo) {
    return [
      {
        id: `tg-${effectiveTutorId}`,
        tutor_id: effectiveTutorId,
        tutor_nombre: fallbackUser.name,
        carrera: fallbackUser.carrera,
        grupo: fallbackUser.grupo,
        semestre: fallbackUser.semestre || "5",
        activo: true,
      },
    ];
  }

  return SEED_TUTORES_GRUPO.filter((s) => s.tutor_id === "demo-tutor-carlos" && s.activo !== false);
}

/**
 * Asignar tutor a carrera + grupo + semestre (INSERT en tutores_grupo)
 */
export async function assignTutorToGroup(input: {
  tutor_id: string;
  tutor_nombre?: string;
  carrera: string;
  grupo: string;
  semestre: string;
}): Promise<{ ok: boolean; assignment?: TutorGrupoAssignment; error?: string }> {
  const cleanGrupo = input.grupo.trim();
  const cleanSemestre = input.semestre.trim();
  const cleanCarrera = input.carrera.trim();

  if (!input.tutor_id || !cleanCarrera || !cleanGrupo || !cleanSemestre) {
    return { ok: false, error: "Selecciona tutor, carrera, semestre y grupo." };
  }

  const localRecord: TutorGrupoAssignment = {
    id: `tg-${Date.now().toString(36)}`,
    tutor_id: input.tutor_id,
    tutor_nombre: input.tutor_nombre || "Tutor TESH",
    carrera: cleanCarrera,
    grupo: cleanGrupo,
    semestre: cleanSemestre,
    activo: true,
    created_at: new Date().toISOString(),
  };

  if (UUID_REGEX.test(input.tutor_id)) {
    try {
      const { data, error } = await supabase
        .from("tutores_grupo")
        .insert({
          tutor_id: input.tutor_id,
          carrera: cleanCarrera,
          grupo: cleanGrupo,
          semestre: cleanSemestre,
        })
        .select()
        .single();

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data) {
        localRecord.id = String(data.id);
        if (data.created_at) localRecord.created_at = String(data.created_at);
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "No se pudo guardar la asignación.",
      };
    }
  }

  const existing = readLocal<TutorGrupoAssignment>(TUTORES_GRUPO_KEY, SEED_TUTORES_GRUPO);
  const filtered = existing.filter(
    (item) =>
      !(
        normalizeText(item.carrera) === normalizeText(cleanCarrera) &&
        normalizeText(item.grupo) === normalizeText(cleanGrupo) &&
        item.tutor_id === input.tutor_id
      ),
  );
  writeLocal(TUTORES_GRUPO_KEY, [localRecord, ...filtered]);

  return { ok: true, assignment: localRecord };
}

/**
 * Obtener estudiantes del grupo asignado al tutor consultando ÚNICAMENTE `profiles`
 * (por cumplimiento LFPDPPP, el tutor nunca consulta tablas clínicas ni resultados de tamizaje).
 */
export async function getGroupStudents(
  carrera: string,
  grupo: string,
  semestre?: string,
): Promise<TutorStudentItem[]> {
  const targetSemestreNorm = normalizeSemestre(semestre);

  try {
    const profQuery = supabase
      .from("profiles")
      .select("id, nombre, matricula, carrera, grupo, semestre, rol")
      .eq("carrera", carrera)
      .eq("grupo", grupo)
      .order("nombre", { ascending: true });

    let { data: profData, error: profErr } = await profQuery;

    if (profErr && profErr.message.toLowerCase().includes("rol")) {
      const retry = await supabase
        .from("profiles")
        .select("id, nombre, matricula, carrera, grupo, semestre, role")
        .eq("carrera", carrera)
        .eq("grupo", grupo)
        .order("nombre", { ascending: true });
      profData = retry.data as typeof profData;
      profErr = retry.error;
    }

    if (!profErr && Array.isArray(profData)) {
      const students = profData
        .filter((p: Record<string, unknown>) => {
          const r = String(p.rol || p.role || "estudiante").toLowerCase();
          const isStudent = r === "estudiante" || r === "";
          if (!isStudent) return false;
          if (!targetSemestreNorm || !p.semestre) return true;
          return normalizeSemestre(String(p.semestre)) === targetSemestreNorm;
        })
        .map((p: Record<string, unknown>) => ({
          id: String(p.id),
          nombre: String(p.nombre || "Estudiante TESH"),
          matricula: String(p.matricula || "Sin matrícula"),
          carrera: String(p.carrera || carrera),
          grupo: String(p.grupo || grupo),
          semestre: String(p.semestre || semestre || ""),
        }));

      if (students.length > 0) {
        return students;
      }
    }
  } catch {
    // Fallback abajo
  }

  // Fallback demostrativo por grupo + semestre para entorno demo
  const matchingDemo = SEED_STUDENTS_DEMO.filter(
    (s) =>
      normalizeText(s.carrera) === normalizeText(carrera) &&
      normalizeText(s.grupo) === normalizeText(grupo) &&
      (!targetSemestreNorm || normalizeSemestre(s.semestre) === targetSemestreNorm),
  );
  if (matchingDemo.length > 0) {
    return matchingDemo;
  }

  return SEED_STUDENTS_DEMO.filter((s) => s.grupo === "501")
    .slice(0, 4)
    .map((s, idx) => ({
      ...s,
      id: `${s.id}-${grupo}-${idx}`,
      carrera,
      grupo,
      semestre: semestre || s.semestre,
    }));
}

/**
 * Busca el tutor_id asignado a un estudiante consultando profiles + tutores_grupo
 */
export async function findTutorForStudent(params: {
  estudianteId?: string | null;
  carrera?: string | null;
  grupo?: string | null;
}): Promise<{ tutor_id: string; carrera?: string; grupo?: string } | null> {
  let carrera = params.carrera?.trim() || "";
  let grupo = params.grupo?.trim() || "";

  if ((!carrera || !grupo) && params.estudianteId && UUID_REGEX.test(params.estudianteId)) {
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("carrera, grupo")
        .eq("id", params.estudianteId)
        .maybeSingle();

      if (prof) {
        carrera = carrera || String(prof.carrera || "");
        grupo = grupo || String(prof.grupo || "");
      }
    } catch {
      // Continuar
    }
  }

  // 1. Buscar en Supabase tutores_grupo por carrera + grupo
  if (carrera && grupo) {
    try {
      const { data, error } = await supabase
        .from("tutores_grupo")
        .select("tutor_id, carrera, grupo")
        .eq("carrera", carrera)
        .eq("grupo", grupo)
        .limit(1)
        .maybeSingle();

      if (!error && data?.tutor_id) {
        return {
          tutor_id: String(data.tutor_id),
          carrera: String(data.carrera || carrera),
          grupo: String(data.grupo || grupo),
        };
      }
    } catch {
      // Fallback
    }
  }

  // 2. Fallback en tutores_grupo por carrera únicamente
  if (carrera) {
    try {
      const { data, error } = await supabase
        .from("tutores_grupo")
        .select("tutor_id, carrera, grupo")
        .eq("carrera", carrera)
        .limit(1)
        .maybeSingle();

      if (!error && data?.tutor_id) {
        return {
          tutor_id: String(data.tutor_id),
          carrera: String(data.carrera || carrera),
          grupo: String(data.grupo || grupo),
        };
      }
    } catch {
      // Fallback
    }
  }

  // 3. Fallback local / demo
  const local = readLocal<TutorGrupoAssignment>(TUTORES_GRUPO_KEY, SEED_TUTORES_GRUPO);
  const byCarreraGrupo = local.find(
    (t) =>
      (!carrera || normalizeText(t.carrera) === normalizeText(carrera)) &&
      (!grupo || normalizeText(t.grupo) === normalizeText(grupo)),
  );
  if (byCarreraGrupo) {
    return {
      tutor_id: byCarreraGrupo.tutor_id,
      carrera: byCarreraGrupo.carrera,
      grupo: byCarreraGrupo.grupo,
    };
  }

  const byCarrera = local.find(
    (t) => carrera && normalizeText(t.carrera) === normalizeText(carrera),
  );
  if (byCarrera) {
    return {
      tutor_id: byCarrera.tutor_id,
      carrera: byCarrera.carrera,
      grupo: byCarrera.grupo,
    };
  }

  // Fallback seguro para demo estudiante Dess (grupo 501, Sistemas)
  if (!params.estudianteId || params.estudianteId.startsWith("demo-")) {
    return {
      tutor_id: "demo-tutor-carlos",
      carrera: carrera || "Ing. en Sistemas Computacionales",
      grupo: grupo || "501",
    };
  }

  return null;
}

/**
 * Crear una canalización del tutor/jefe al psicólogo (INSERT en canalizaciones + alerta estudiante)
 */
export async function createCanalizacion(input: {
  tutor_id: string;
  tutor_nombre?: string;
  estudiante_id: string;
  estudiante_nombre?: string;
  estudiante_iniciales?: string;
  folio?: string | null;
  carrera?: string;
  grupo?: string;
  semestre?: string;
  motivo: string;
  prioridad: CanalizacionPrioridad;
}): Promise<{ ok: boolean; canalizacion?: CanalizacionRecord; error?: string }> {
  const motivoClean = input.motivo.trim();
  if (!motivoClean) {
    return { ok: false, error: "Debes indicar el motivo de la canalización." };
  }

  const authUid = await getAuthenticatedUid();
  const effectiveTutorId = authUid || input.tutor_id;
  const iniciales = input.estudiante_iniciales || buildInitials(input.estudiante_nombre);

  const newRecord: CanalizacionRecord = {
    id: `can-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tutor_id: effectiveTutorId,
    tutor_nombre: input.tutor_nombre || "Tutor TESH",
    psicologo_id: null,
    estudiante_id: input.estudiante_id,
    estudiante_nombre: input.estudiante_nombre || `Estudiante ${iniciales}`,
    estudiante_iniciales: iniciales,
    folio: input.folio || null,
    carrera: input.carrera,
    grupo: input.grupo,
    semestre: input.semestre,
    motivo: motivoClean,
    prioridad: input.prioridad,
    estado: "pendiente",
    created_at: new Date().toISOString(),
  };

  if (UUID_REGEX.test(effectiveTutorId) && UUID_REGEX.test(input.estudiante_id)) {
    try {
      const fullPayload: Record<string, unknown> = {
        tutor_id: effectiveTutorId,
        estudiante_id: input.estudiante_id,
        motivo: motivoClean,
        prioridad: input.prioridad,
        estado: "pendiente",
      };
      if (input.folio) fullPayload.folio = input.folio;
      if (input.carrera) fullPayload.carrera = input.carrera;
      if (input.grupo) fullPayload.grupo = input.grupo;
      if (input.semestre) fullPayload.semestre = input.semestre;

      let { data, error } = await supabase
        .from("canalizaciones")
        .insert(fullPayload)
        .select()
        .single();

      // Reintento mínimo si la tabla solo define columnas base
      if (error && error.message.toLowerCase().includes("column")) {
        const minimal = await supabase
          .from("canalizaciones")
          .insert({
            tutor_id: effectiveTutorId,
            estudiante_id: input.estudiante_id,
            motivo: motivoClean,
            prioridad: input.prioridad,
            estado: "pendiente",
          })
          .select()
          .single();
        data = minimal.data;
        error = minimal.error;
      }

      if (error) {
        return { ok: false, error: error.message };
      }

      if (data) {
        newRecord.id = String(data.id);
        if (data.created_at) newRecord.created_at = String(data.created_at);
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Error al registrar la canalización.",
      };
    }
  }

  const local = readLocal<CanalizacionRecord>(CANALIZACIONES_KEY, SEED_CANALIZACIONES);
  writeLocal(CANALIZACIONES_KEY, [newRecord, ...local]);

  // Notificar automáticamente al estudiante en alertas_inasistencia
  await createAlertaInasistencia({
    tutor_id: effectiveTutorId,
    estudiante_id: input.estudiante_id,
    folio: input.folio || null,
    tipo_alerta: "no_canalizacion",
    prioridad: input.prioridad,
    mensaje: `Tu tutor te ha canalizado al psicólogo. Motivo: ${motivoClean}`,
    leida_tutor: true,
    leida_estudiante: false,
  });

  return { ok: true, canalizacion: newRecord };
}

/**
 * Canalizar múltiples estudiantes seleccionados en lote (INSERT en canalizaciones + alertas_inasistencia)
 */
export async function createCanalizacionesBatch(input: {
  tutor_id: string;
  tutor_nombre?: string;
  estudiantes: TutorStudentItem[];
  motivo: string;
  prioridad: CanalizacionPrioridad;
}): Promise<{
  created: CanalizacionRecord[];
  errors: string[];
}> {
  const created: CanalizacionRecord[] = [];
  const errors: string[] = [];

  for (const st of input.estudiantes) {
    const res = await createCanalizacion({
      tutor_id: input.tutor_id,
      tutor_nombre: input.tutor_nombre,
      estudiante_id: st.id,
      estudiante_nombre: st.nombre,
      carrera: st.carrera,
      grupo: st.grupo,
      semestre: st.semestre,
      motivo: input.motivo,
      prioridad: input.prioridad,
    });

    if (res.ok && res.canalizacion) {
      created.push(res.canalizacion);
    } else if (res.error) {
      errors.push(`${st.nombre}: ${res.error}`);
    }
  }

  return { created, errors };
}

/**
 * Consultar canalizaciones (para tutor, psicólogo o directivo)
 */
export async function getCanalizaciones(filtros?: {
  tutorId?: string;
  estado?: CanalizacionEstado;
}): Promise<CanalizacionRecord[]> {
  const local = readLocal<CanalizacionRecord>(CANALIZACIONES_KEY, SEED_CANALIZACIONES);

  try {
    let query = supabase
      .from("canalizaciones")
      .select("*")
      .order("created_at", { ascending: false });

    if (filtros?.tutorId && UUID_REGEX.test(filtros.tutorId)) {
      query = query.eq("tutor_id", filtros.tutorId);
    }
    if (filtros?.estado) {
      query = query.eq("estado", filtros.estado);
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data) && data.length > 0) {
      // Enriquecer nombres si es posible desde profiles
      const ids = Array.from(
        new Set(
          data
            .flatMap((r: Record<string, unknown>) => [
              r.tutor_id ? String(r.tutor_id) : "",
              r.estudiante_id ? String(r.estudiante_id) : "",
              r.psicologo_id ? String(r.psicologo_id) : "",
            ])
            .filter((id) => UUID_REGEX.test(id)),
        ),
      );

      const profileMap = new Map<
        string,
        { nombre?: string; matricula?: string; carrera?: string; grupo?: string; semestre?: string }
      >();

      if (ids.length > 0) {
        try {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, nombre, matricula, carrera, grupo, semestre")
            .in("id", ids);

          if (Array.isArray(profs)) {
            profs.forEach((p: Record<string, unknown>) => {
              profileMap.set(String(p.id), {
                nombre: p.nombre ? String(p.nombre) : undefined,
                matricula: p.matricula ? String(p.matricula) : undefined,
                carrera: p.carrera ? String(p.carrera) : undefined,
                grupo: p.grupo ? String(p.grupo) : undefined,
                semestre: p.semestre ? String(p.semestre) : undefined,
              });
            });
          }
        } catch {
          // Continuar sin enriquecimiento
        }
      }

      const mapped: CanalizacionRecord[] = data.map((row: Record<string, unknown>) => {
        const tId = String(row.tutor_id || "");
        const eId = String(row.estudiante_id || "");
        const pId = row.psicologo_id ? String(row.psicologo_id) : null;
        const tProf = profileMap.get(tId);
        const eProf = profileMap.get(eId);
        const pProf = pId ? profileMap.get(pId) : undefined;

        return {
          id: String(row.id),
          tutor_id: tId,
          tutor_nombre:
            (row.tutor_nombre ? String(row.tutor_nombre) : undefined) ||
            tProf?.nombre ||
            "Tutor TESH",
          psicologo_id: pId,
          psicologo_nombre:
            (row.psicologo_nombre ? String(row.psicologo_nombre) : undefined) ||
            pProf?.nombre ||
            undefined,
          estudiante_id: eId,
          estudiante_nombre:
            (row.estudiante_nombre ? String(row.estudiante_nombre) : undefined) ||
            eProf?.nombre ||
            "Estudiante TESH",
          estudiante_iniciales: buildInitials(
            (row.estudiante_nombre ? String(row.estudiante_nombre) : undefined) || eProf?.nombre,
          ),
          folio: filtros?.tutorId ? null : row.folio ? String(row.folio) : eProf?.matricula || null,
          carrera: (row.carrera ? String(row.carrera) : undefined) || eProf?.carrera,
          grupo: (row.grupo ? String(row.grupo) : undefined) || eProf?.grupo,
          semestre: (row.semestre ? String(row.semestre) : undefined) || eProf?.semestre,
          motivo: String(row.motivo || ""),
          prioridad: (row.prioridad as CanalizacionPrioridad) || "normal",
          estado: (row.estado as CanalizacionEstado) || "pendiente",
          motivo_rechazo: row.motivo_rechazo
            ? String(row.motivo_rechazo)
            : row.observaciones
              ? String(row.observaciones)
              : null,
          created_at: String(row.created_at || new Date().toISOString()),
          updated_at: row.updated_at ? String(row.updated_at) : undefined,
        };
      });

      const dbIds = new Set(mapped.map((m) => m.id));
      const merged = [
        ...mapped,
        ...local
          .filter((l) => {
            if (dbIds.has(l.id)) return false;
            if (filtros?.tutorId && l.tutor_id !== filtros.tutorId) return false;
            if (filtros?.estado && l.estado !== filtros.estado) return false;
            return true;
          })
          .map((l) => (filtros?.tutorId ? { ...l, folio: null } : l)),
      ];
      return merged;
    }
  } catch {
    // Fallback local
  }

  return local
    .filter((c) => {
      if (filtros?.tutorId && c.tutor_id !== filtros.tutorId) return false;
      if (filtros?.estado && c.estado !== filtros.estado) return false;
      return true;
    })
    .map((c) => (filtros?.tutorId ? { ...c, folio: null } : c));
}

/**
 * Actualizar estado de canalización (Aceptar / Rechazar / Completar) desde el panel del psicólogo
 */
export async function updateCanalizacionEstado(input: {
  id: string;
  estado: CanalizacionEstado;
  psicologo_id?: string | null;
  psicologo_nombre?: string;
  motivo_rechazo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const authUid = await getAuthenticatedUid();
  const effectivePsicologoId =
    authUid ||
    (input.psicologo_id && UUID_REGEX.test(input.psicologo_id) ? input.psicologo_id : null);

  if (UUID_REGEX.test(input.id)) {
    try {
      const payload: Record<string, unknown> = {
        estado: input.estado,
      };
      if (effectivePsicologoId) {
        payload.psicologo_id = effectivePsicologoId;
      }
      if (input.motivo_rechazo) {
        payload.motivo_rechazo = input.motivo_rechazo;
      }

      let { error } = await supabase.from("canalizaciones").update(payload).eq("id", input.id);

      // Si el esquema usa 'observaciones' o no tiene 'motivo_rechazo'
      if (error && error.message.toLowerCase().includes("motivo_rechazo")) {
        const retryPayload: Record<string, unknown> = {
          estado: input.estado,
        };
        if (effectivePsicologoId) retryPayload.psicologo_id = effectivePsicologoId;
        if (input.motivo_rechazo) retryPayload.observaciones = input.motivo_rechazo;

        const retry = await supabase.from("canalizaciones").update(retryPayload).eq("id", input.id);
        error = retry.error;

        if (error && error.message.toLowerCase().includes("observaciones")) {
          const minimalPayload: Record<string, unknown> = { estado: input.estado };
          if (effectivePsicologoId) minimalPayload.psicologo_id = effectivePsicologoId;
          const minimal = await supabase
            .from("canalizaciones")
            .update(minimalPayload)
            .eq("id", input.id);
          error = minimal.error;
        }
      }

      if (error) {
        return { ok: false, error: error.message };
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "No se pudo actualizar la canalización.",
      };
    }
  }

  const local = readLocal<CanalizacionRecord>(CANALIZACIONES_KEY, SEED_CANALIZACIONES);
  const idx = local.findIndex((c) => c.id === input.id);
  if (idx !== -1) {
    local[idx] = {
      ...local[idx],
      estado: input.estado,
      psicologo_id: effectivePsicologoId || input.psicologo_id || local[idx].psicologo_id,
      psicologo_nombre: input.psicologo_nombre || local[idx].psicologo_nombre || "Dra. Marta Gómez",
      motivo_rechazo: input.motivo_rechazo || local[idx].motivo_rechazo,
      updated_at: new Date().toISOString(),
    };
    writeLocal(CANALIZACIONES_KEY, local);
  }

  return { ok: true };
}

/**
 * Crear alerta en alertas_inasistencia
 */
export async function createAlertaInasistencia(input: {
  tutor_id: string;
  psicologo_id?: string | null;
  estudiante_id?: string | null;
  folio?: string | null;
  tipo_alerta: AlertaTipo;
  prioridad?: CanalizacionPrioridad;
  mensaje: string;
  leida_tutor?: boolean;
  leida_estudiante?: boolean;
}): Promise<{ ok: boolean; alerta?: AlertaInasistencia }> {
  const leidaTutor = input.leida_tutor ?? false;
  const leidaEstudiante = input.leida_estudiante ?? false;

  const newAlert: AlertaInasistencia = {
    id: `alerta-${Date.now().toString(36)}`,
    tutor_id: input.tutor_id,
    psicologo_id: input.psicologo_id || null,
    estudiante_id: input.estudiante_id || null,
    folio: input.folio || null,
    tipo_alerta: input.tipo_alerta,
    prioridad: input.prioridad || (input.tipo_alerta === "no_asistio" ? "alta" : "urgente"),
    mensaje: input.mensaje,
    leida_tutor: leidaTutor,
    leida_estudiante: leidaEstudiante,
    created_at: new Date().toISOString(),
  };

  if (
    UUID_REGEX.test(input.tutor_id) ||
    (input.estudiante_id && UUID_REGEX.test(input.estudiante_id))
  ) {
    try {
      const basePayload: Record<string, unknown> = {
        tipo_alerta: input.tipo_alerta,
        mensaje: input.mensaje,
        leida_tutor: leidaTutor,
        leida_estudiante: leidaEstudiante,
      };
      if (UUID_REGEX.test(input.tutor_id)) {
        basePayload.tutor_id = input.tutor_id;
      }
      if (input.psicologo_id && UUID_REGEX.test(input.psicologo_id)) {
        basePayload.psicologo_id = input.psicologo_id;
      }
      if (input.estudiante_id && UUID_REGEX.test(input.estudiante_id)) {
        basePayload.estudiante_id = input.estudiante_id;
      }
      if (newAlert.prioridad) {
        basePayload.prioridad = newAlert.prioridad;
      }

      let { data, error } = await supabase
        .from("alertas_inasistencia")
        .insert(basePayload)
        .select()
        .single();

      if (
        error &&
        (error.message.toLowerCase().includes("prioridad") ||
          error.message.toLowerCase().includes("leida_estudiante"))
      ) {
        if (error.message.toLowerCase().includes("prioridad")) delete basePayload.prioridad;
        if (error.message.toLowerCase().includes("leida_estudiante"))
          delete basePayload.leida_estudiante;
        const retry = await supabase
          .from("alertas_inasistencia")
          .insert(basePayload)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        newAlert.id = String(data.id);
        if (data.created_at) newAlert.created_at = String(data.created_at);
      }
    } catch {
      // Fallback local
    }
  }

  const local = readLocal<AlertaInasistencia>(ALERTAS_TUTOR_KEY, SEED_ALERTAS);
  writeLocal(ALERTAS_TUTOR_KEY, [newAlert, ...local]);

  return { ok: true, alerta: newAlert };
}

/**
 * Consultar alertas no leídas del tutor (tutor_id = auth.uid() AND leida_tutor = false)
 * Por LFPDPPP, se excluye cualquier alerta con datos clínicos de tamizaje o nivel de riesgo.
 */
export async function getUnreadTutorAlerts(tutorId: string): Promise<AlertaInasistencia[]> {
  const authUid = await getAuthenticatedUid();
  const effectiveTutorId = authUid || tutorId;
  const local = readLocal<AlertaInasistencia>(ALERTAS_TUTOR_KEY, SEED_ALERTAS);

  const isNonClinicalTutorAlert = (a: AlertaInasistencia): boolean => {
    if (a.tipo_alerta === "no_canalizacion") return false;
    const msg = (a.mensaje || "").toLowerCase();
    if (msg.includes("tamizaje") || msg.includes("nivel rojo") || /\beq-\d+/i.test(msg)) {
      return false;
    }
    return true;
  };

  if (UUID_REGEX.test(effectiveTutorId)) {
    try {
      const { data, error } = await supabase
        .from("alertas_inasistencia")
        .select("*")
        .eq("tutor_id", effectiveTutorId)
        .eq("leida_tutor", false)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        const dbAlerts: AlertaInasistencia[] = data
          .map((row: Record<string, unknown>) => ({
            id: String(row.id),
            tutor_id: String(row.tutor_id),
            psicologo_id: row.psicologo_id ? String(row.psicologo_id) : null,
            estudiante_id: row.estudiante_id ? String(row.estudiante_id) : null,
            folio: null,
            tipo_alerta: (row.tipo_alerta as AlertaTipo) || "no_asistio",
            prioridad: (row.prioridad as CanalizacionPrioridad) || "alta",
            mensaje: String(row.mensaje || ""),
            leida_tutor: Boolean(row.leida_tutor),
            leida_estudiante:
              row.leida_estudiante !== undefined ? Boolean(row.leida_estudiante) : false,
            created_at: String(row.created_at || new Date().toISOString()),
          }))
          .filter(isNonClinicalTutorAlert);

        const seen = new Set(dbAlerts.map((a) => a.id));
        const localUnread = local.filter(
          (l) =>
            !seen.has(l.id) &&
            l.tutor_id === effectiveTutorId &&
            !l.leida_tutor &&
            isNonClinicalTutorAlert(l),
        );
        return [...dbAlerts, ...localUnread];
      }
    } catch {
      // Fallback local
    }
  }

  return local.filter(
    (a) => a.tutor_id === effectiveTutorId && !a.leida_tutor && isNonClinicalTutorAlert(a),
  );
}

/**
 * Marcar alerta de tutor como leída
 */
export async function markAlertaAsRead(alertaId: string): Promise<boolean> {
  if (UUID_REGEX.test(alertaId)) {
    try {
      await supabase.from("alertas_inasistencia").update({ leida_tutor: true }).eq("id", alertaId);
    } catch {
      // Continuar con actualización local
    }
  }

  const local = readLocal<AlertaInasistencia>(ALERTAS_TUTOR_KEY, SEED_ALERTAS);
  const updated = local.map((a) => (a.id === alertaId ? { ...a, leida_tutor: true } : a));
  writeLocal(ALERTAS_TUTOR_KEY, updated);
  return true;
}

/**
 * Consultar canalizaciones pendientes del estudiante (estado='pendiente' y estudiante_id = auth.uid())
 */
export async function getStudentPendingCanalizaciones(
  studentId?: string | null,
): Promise<CanalizacionRecord[]> {
  const authUid = await getAuthenticatedUid();
  const effectiveStudentId = authUid || studentId || "";
  if (!effectiveStudentId) return [];

  const local = readLocal<CanalizacionRecord>(CANALIZACIONES_KEY, SEED_CANALIZACIONES);
  const localMatches = local.filter(
    (c) => c.estudiante_id === effectiveStudentId && c.estado === "pendiente",
  );

  if (UUID_REGEX.test(effectiveStudentId)) {
    try {
      const { data, error } = await supabase
        .from("canalizaciones")
        .select("*")
        .eq("estudiante_id", effectiveStudentId)
        .eq("estado", "pendiente")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        const dbRecords: CanalizacionRecord[] = data.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          tutor_id: String(row.tutor_id || ""),
          tutor_nombre: row.tutor_nombre ? String(row.tutor_nombre) : "Área de Tutorías",
          psicologo_id: row.psicologo_id ? String(row.psicologo_id) : null,
          estudiante_id: String(row.estudiante_id || effectiveStudentId),
          folio: row.folio ? String(row.folio) : null,
          carrera: row.carrera ? String(row.carrera) : undefined,
          grupo: row.grupo ? String(row.grupo) : undefined,
          semestre: row.semestre ? String(row.semestre) : undefined,
          motivo: String(row.motivo || ""),
          prioridad: (row.prioridad as CanalizacionPrioridad) || "normal",
          estado: (row.estado as CanalizacionEstado) || "pendiente",
          created_at: String(row.created_at || new Date().toISOString()),
        }));

        const seen = new Set(dbRecords.map((r) => r.id));
        return [...dbRecords, ...localMatches.filter((l) => !seen.has(l.id))];
      }
    } catch {
      // Fallback local
    }
  }

  return localMatches;
}

/**
 * Consultar alertas no leídas del estudiante (estudiante_id = auth.uid() AND leida_estudiante = false)
 */
export async function getUnreadStudentAlerts(
  studentId?: string | null,
): Promise<AlertaInasistencia[]> {
  const authUid = await getAuthenticatedUid();
  const effectiveStudentId = authUid || studentId || "";
  if (!effectiveStudentId) return [];

  const local = readLocal<AlertaInasistencia>(ALERTAS_TUTOR_KEY, SEED_ALERTAS);
  const localMatches = local.filter(
    (a) =>
      a.estudiante_id === effectiveStudentId &&
      a.leida_estudiante !== true &&
      !a.mensaje.includes("obtuvo nivel rojo en tamizaje"),
  );

  if (UUID_REGEX.test(effectiveStudentId)) {
    try {
      const { data, error } = await supabase
        .from("alertas_inasistencia")
        .select("*")
        .eq("estudiante_id", effectiveStudentId)
        .eq("leida_estudiante", false)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        const dbAlerts: AlertaInasistencia[] = data
          .map((row: Record<string, unknown>) => ({
            id: String(row.id),
            tutor_id: String(row.tutor_id || ""),
            psicologo_id: row.psicologo_id ? String(row.psicologo_id) : null,
            estudiante_id: row.estudiante_id ? String(row.estudiante_id) : null,
            folio: row.folio ? String(row.folio) : null,
            tipo_alerta: (row.tipo_alerta as AlertaTipo) || "no_canalizacion",
            prioridad: (row.prioridad as CanalizacionPrioridad) || "normal",
            mensaje: String(row.mensaje || ""),
            leida_tutor: Boolean(row.leida_tutor),
            leida_estudiante:
              row.leida_estudiante !== undefined ? Boolean(row.leida_estudiante) : false,
            created_at: String(row.created_at || new Date().toISOString()),
          }))
          .filter((a) => !a.mensaje.includes("obtuvo nivel rojo en tamizaje"));

        const seen = new Set(dbAlerts.map((a) => a.id));
        return [...dbAlerts, ...localMatches.filter((l) => !seen.has(l.id))];
      }
    } catch {
      // Fallback local
    }
  }

  return localMatches;
}

/**
 * Marcar alerta del estudiante como leída (leida_estudiante = true)
 */
export async function markStudentAlertaAsRead(alertaId: string): Promise<boolean> {
  if (UUID_REGEX.test(alertaId)) {
    try {
      await supabase
        .from("alertas_inasistencia")
        .update({ leida_estudiante: true })
        .eq("id", alertaId);
    } catch {
      // Continuar con actualización local
    }
  }

  const local = readLocal<AlertaInasistencia>(ALERTAS_TUTOR_KEY, SEED_ALERTAS);
  const updated = local.map((a) => (a.id === alertaId ? { ...a, leida_estudiante: true } : a));
  writeLocal(ALERTAS_TUTOR_KEY, updated);
  return true;
}

/**
 * Por cumplimiento de privacidad clínica (LFPDPPP), los resultados de tamizaje
 * (incluyendo nivel rojo y folio EQ-XXXX) pertenecen exclusivamente al área de psicología
 * y nunca deben notificarse al tutor académico.
 * Se conserva la firma exportada por compatibilidad de invocaciones existentes.
 */
export async function notificarTutorNivelRojo(_params: {
  estudianteId?: string | null;
  folio: string;
  carrera?: string | null;
  grupo?: string | null;
}): Promise<void> {
  // No-op intencional por confidencialidad clínica (LFPDPPP)
  void _params;
}
