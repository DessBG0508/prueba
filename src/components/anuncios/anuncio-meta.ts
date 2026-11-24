import { Bell, GraduationCap, Info, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
    return format(parsed, "EEEE d 'de' MMMM, yyyy", { locale: es });
  } catch {
    return fechaStr;
  }
}
