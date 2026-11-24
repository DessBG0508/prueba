import { Bell, GraduationCap, Info, Sparkles } from "lucide-react";
import type { AnuncioTipo } from "@/features/anuncios/anuncios-service";

export const ANUNCIO_TIPO_META: Record<
  AnuncioTipo,
  {
    label: string;
    borderClass: string;
    accentStripeClass: string;
    iconWrapClass: string;
    badgeClass: string;
    buttonClass: string;
    Icon: typeof GraduationCap;
  }
> = {
  taller: {
    label: "Taller",
    borderClass: "border-2 border-[#A9DB1B]",
    accentStripeClass: "bg-[#A9DB1B]",
    iconWrapClass: "bg-[#A9DB1B]/20 text-[#3F5304] dark:text-[#A9DB1B]",
    badgeClass: "border-[#A9DB1B] bg-[#A9DB1B]/15 text-[#3F5304] dark:text-[#C5F04B]",
    buttonClass: "bg-[#1B198F] hover:bg-[#1B198F]/90 text-white",
    Icon: GraduationCap,
  },
  informativo: {
    label: "Informativo",
    borderClass: "border-2 border-[#1B198F]",
    accentStripeClass: "bg-[#1B198F]",
    iconWrapClass: "bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300",
    badgeClass: "border-[#1B198F]/40 bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300",
    buttonClass: "bg-[#1B198F] hover:bg-[#1B198F]/90 text-white",
    Icon: Info,
  },
  recordatorio: {
    label: "Recordatorio",
    borderClass: "border-2 border-[#1B198F]",
    accentStripeClass: "bg-[#1B198F]",
    iconWrapClass: "bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300",
    badgeClass: "border-[#1B198F]/40 bg-[#1B198F]/10 text-[#1B198F] dark:text-indigo-300",
    buttonClass: "bg-[#1B198F] hover:bg-[#1B198F]/90 text-white",
    Icon: Bell,
  },
  evento: {
    label: "Evento",
    borderClass: "border-2 border-[#FF9CED]",
    accentStripeClass: "bg-[#FF9CED]",
    iconWrapClass: "bg-[#FF9CED]/25 text-[#7A1C6B] dark:text-[#FF9CED]",
    badgeClass: "border-[#FF9CED] bg-[#FF9CED]/20 text-[#7A1C6B] dark:text-[#FFB8F2]",
    buttonClass: "bg-[#1B198F] hover:bg-[#1B198F]/90 text-white",
    Icon: Sparkles,
  },
};

export function formatAnuncioFecha(fechaStr?: string | null): string | null {
  if (!fechaStr) return null;
  try {
    const parsed = new Date(`${fechaStr.slice(0, 10)}T12:00:00`);
    if (isNaN(parsed.getTime())) return fechaStr;
    const raw = parsed
      .toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      .replace(/^([a-záéíóúñ]+),\s+/i, "$1 ");
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  } catch {
    return fechaStr;
  }
}

export function formatAnuncioHorario(
  horaInicio?: string | null,
  horaFin?: string | null,
): string | null {
  const start = horaInicio?.trim().slice(0, 5);
  const end = horaFin?.trim().slice(0, 5);
  if (start && end) return `${start} - ${end} hrs`;
  if (start) return `${start} hrs`;
  if (end) return `Hasta las ${end} hrs`;
  return null;
}

export function getCleanAnuncioTitulo(titulo: string): string {
  const cleaned = titulo.replace(/^(taller|evento|informativo|recordatorio)\s*:\s*/i, "").trim();
  return cleaned || titulo;
}

export function getCupoProgressInfo(inscritos: number, cupo: number) {
  const safeCupo = Math.max(1, cupo);
  const safeInscritos = Math.max(0, inscritos);
  const pct = Math.min(100, Math.round((safeInscritos / safeCupo) * 100));
  const remaining = Math.max(0, safeCupo - safeInscritos);
  const isFull = remaining === 0;

  let barClass = "bg-emerald-500";
  let textClass = "text-emerald-700 dark:text-emerald-300";

  if (pct > 90 || isFull) {
    barClass = "bg-rose-500";
    textClass = "text-rose-700 dark:text-rose-300";
  } else if (pct >= 70) {
    barClass = "bg-amber-500";
    textClass = "text-amber-700 dark:text-amber-300";
  }

  const remainingText = isFull
    ? "Cupo lleno"
    : remaining === 1
      ? "1 lugar disponible"
      : `${remaining} lugares disponibles`;

  return {
    pct,
    remaining,
    isFull,
    barClass,
    textClass,
    remainingText,
  };
}
