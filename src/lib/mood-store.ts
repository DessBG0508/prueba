import { useState, useEffect, useCallback } from "react";
import type { MoodCheckIn, MoodId } from "./types";
import { saveCheckIn } from "./api-client";
import { mapCheckInRiskRD02 } from "./metric-rules";
import { getRealSupabaseUserId, hasRealSupabaseSession, supabase } from "./supabase";

export const MOOD_STORAGE_KEY = "equilibra_mood_checkins_v1";
export const DEFAULT_MOCK_MOOD_DISPLAY = 3.4;
export const DEFAULT_MOCK_MOOD_PROGRESS = 76;

/**
 * Reglas de mapeo (la escala interna 1-5 ya definida se mantiene intacta:
 * Feliz=1, Bien=2, Normal=3, Triste=4, Muy mal=5)
 */
export const MOOD_TO_INTERNAL_VALUE: Record<MoodId, 1 | 2 | 3 | 4 | 5> = {
  "muy-bien": 1, // Feliz = 1
  bien: 2, // Bien = 2
  regular: 3, // Normal = 3
  triste: 4, // Triste = 4
  "muy-mal": 5, // Muy mal = 5
};

export const INTERNAL_VALUE_TO_MOOD: Record<number, MoodId> = {
  1: "muy-bien",
  2: "bien",
  3: "regular",
  4: "triste",
  5: "muy-mal",
};

/**
 * Conversión inversa entre score mostrado (1 a 5, donde 5=Excelente ánimo)
 * y valor interno (1 a 5, donde 1=Feliz)
 * Regla: valorMostrado = 6 - promedioInterno  =>  promedioInterno = 6 - valorMostrado
 */
export function displayedScoreToInternalValue(displayedScore: number): 1 | 2 | 3 | 4 | 5 {
  const rounded = Math.round(displayedScore);
  const clamped = Math.max(1, Math.min(5, rounded));
  const internal = 6 - clamped;
  return Math.max(1, Math.min(5, internal)) as 1 | 2 | 3 | 4 | 5;
}

export function internalValueToDisplayedScore(internalValue: number): number {
  return 6 - internalValue;
}

export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getStoredMoodCheckIns(): MoodCheckIn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MOOD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Determina si una fecha (YYYY-MM-DD) se encuentra en los últimos 7 días
 * (desde 6 días atrás hasta hoy inclusive).
 */
export function isWithinLast7Days(dateStr: string, referenceDate: Date = new Date()): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const [year, month, day] = parts;
  const recordDate = new Date(year, month - 1, day);
  recordDate.setHours(0, 0, 0, 0);

  const refDate = new Date(referenceDate);
  refDate.setHours(0, 0, 0, 0);

  const diffMs = refDate.getTime() - recordDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays < 7;
}

export interface MoodStatsResult {
  hasRecords: boolean;
  promedioInterno: number | null;
  valorMostrado: number;
  displayValue: string;
  progress: number;
  totalRecordsInWindow: number;
}

export function calculateMoodStats(records: MoodCheckIn[], isRealSession = false): MoodStatsResult {
  const last7 = records.filter((r) => isWithinLast7Days(r.date));
  if (last7.length === 0) {
    if (isRealSession) {
      return {
        hasRecords: false,
        promedioInterno: null,
        valorMostrado: 0,
        displayValue: "0.0",
        progress: 0,
        totalRecordsInWindow: 0,
      };
    }
    return {
      hasRecords: false,
      promedioInterno: null,
      valorMostrado: DEFAULT_MOCK_MOOD_DISPLAY,
      displayValue: DEFAULT_MOCK_MOOD_DISPLAY.toFixed(1),
      progress: DEFAULT_MOCK_MOOD_PROGRESS,
      totalRecordsInWindow: 0,
    };
  }

  const sum = last7.reduce((acc, r) => acc + r.value, 0);
  const promedioInterno = sum / last7.length;

  // Regla 3: valorMostrado = 6 - promedio (así 5 = excelente ánimo, 1 = requiere apoyo)
  const rawValorMostrado = 6 - promedioInterno;
  const clampedDisplay = Math.max(1, Math.min(5, rawValorMostrado));
  const progress = Math.min(100, Math.max(0, Math.round((clampedDisplay / 5) * 100)));

  return {
    hasRecords: true,
    promedioInterno,
    valorMostrado: clampedDisplay,
    displayValue: clampedDisplay.toFixed(1),
    progress,
    totalRecordsInWindow: last7.length,
  };
}

export function getTodayMoodCheckIn(): MoodCheckIn | null {
  const todayStr = getTodayDateStr();
  const records = getStoredMoodCheckIns();
  return records.find((r) => r.date === todayStr) || null;
}

/**
 * Guarda o actualiza el registro MoodCheckIn del día actual.
 * Regla 5: Un registro por día (se actualiza el existente, no se duplica).
 */
export function saveMoodCheckInToday(moodIdOrScore: MoodId | number): MoodCheckIn {
  const todayStr = getTodayDateStr();

  let moodId: MoodId;
  let internalValue: 1 | 2 | 3 | 4 | 5;

  if (typeof moodIdOrScore === "number") {
    internalValue = displayedScoreToInternalValue(moodIdOrScore);
    moodId = INTERNAL_VALUE_TO_MOOD[internalValue] || "regular";
  } else {
    moodId = moodIdOrScore;
    internalValue = MOOD_TO_INTERNAL_VALUE[moodId] || 3;
  }

  const newRecord: MoodCheckIn = {
    date: todayStr,
    value: internalValue,
    moodId,
    createdAt: new Date().toISOString(),
  };

  void (async () => {
    const realUid = await getRealSupabaseUserId();
    if (realUid) {
      try {
        await saveCheckIn(
          {
            id: `mood-${todayStr}`,
            studentId: realUid,
            academicLoad: internalValue,
            emotions: [moodId],
            createdAt: newRecord.createdAt,
            riskLevel: mapCheckInRiskRD02(internalValue),
          },
          realUid,
          { silentNotice: true },
        );
      } catch {
        // Error registrado por saveCheckIn
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("equilibra-mood-update", {
            detail: { record: newRecord },
          }),
        );
      }
      return;
    }

    const records = getStoredMoodCheckIns();
    const existingIndex = records.findIndex((r) => r.date === todayStr);
    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(records));
        window.dispatchEvent(
          new CustomEvent("equilibra-mood-update", {
            detail: { record: newRecord, records },
          }),
        );
      } catch {
        // LocalStorage fallback
      }
    }

    try {
      await saveCheckIn(
        {
          id: `mood-${todayStr}`,
          studentId: "demo-student-dess",
          academicLoad: internalValue,
          emotions: [moodId],
          createdAt: newRecord.createdAt,
          riskLevel: mapCheckInRiskRD02(internalValue),
        },
        undefined,
        { silentNotice: true },
      );
    } catch {
      // Demo fallback
    }
  })();

  return newRecord;
}

async function fetchRealMoodCheckIns(): Promise<MoodCheckIn[]> {
  const uid = await getRealSupabaseUserId();
  if (!uid) return [];
  try {
    const { data, error } = await supabase
      .from("checkins")
      .select("escala, emociones, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !Array.isArray(data)) return [];
    const byDate = new Map<string, MoodCheckIn>();
    for (const row of data) {
      const created = String(row.created_at || new Date().toISOString());
      const dateStr = created.slice(0, 10);
      if (byDate.has(dateStr)) continue;
      const escala = Math.max(1, Math.min(5, Number(row.escala || 3))) as 1 | 2 | 3 | 4 | 5;
      const emociones = Array.isArray(row.emociones) ? row.emociones : [];
      const firstMood = String(emociones[0] || "") as MoodId;
      const moodId =
        firstMood in MOOD_TO_INTERNAL_VALUE
          ? firstMood
          : INTERNAL_VALUE_TO_MOOD[escala] || "regular";
      byDate.set(dateStr, {
        date: dateStr,
        value: escala,
        moodId,
        createdAt: created,
      });
    }
    return Array.from(byDate.values());
  } catch {
    return [];
  }
}

/**
 * Hook reactivo para consultar y actualizar el estado y métricas del ánimo
 */
export function useMoodStats() {
  const [records, setRecords] = useState<MoodCheckIn[]>(getStoredMoodCheckIns);
  const [isRealSession, setIsRealSession] = useState(false);

  useEffect(() => {
    let active = true;

    const syncMoods = async (optimisticRecord?: MoodCheckIn) => {
      const real = await hasRealSupabaseSession();
      if (!active) return;
      setIsRealSession(real);
      if (real) {
        const dbRecords = await fetchRealMoodCheckIns();
        if (!active) return;
        if (optimisticRecord) {
          const filtered = dbRecords.filter((r) => r.date !== optimisticRecord.date);
          setRecords([optimisticRecord, ...filtered]);
        } else {
          setRecords(dbRecords);
        }
      } else {
        setRecords(getStoredMoodCheckIns());
      }
    };

    void syncMoods();

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ record?: MoodCheckIn }>;
      void syncMoods(custom.detail?.record);
    };

    window.addEventListener("equilibra-mood-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      active = false;
      window.removeEventListener("equilibra-mood-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const stats = calculateMoodStats(records, isRealSession);
  const todayStr = getTodayDateStr();
  const todayRecord = records.find((r) => r.date === todayStr) || null;
  const todayMood = todayRecord ? todayRecord.moodId : null;

  const saveToday = useCallback((moodIdOrScore: MoodId | number) => {
    return saveMoodCheckInToday(moodIdOrScore);
  }, []);

  return {
    ...stats,
    records,
    todayRecord,
    todayMood,
    saveTodayMood: saveToday,
  };
}
