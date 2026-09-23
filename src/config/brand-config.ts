// Configuración centralizada de marca, logo e ilustraciones del emocionómetro.
// Permite cambiar, editar o sustituir iconos e imágenes fácilmente en un solo lugar.

import estrellaFeliz from "@/assets/moods/estrella-feliz.png.asset.json";
import nubeLigera from "@/assets/moods/nube-ligera.png.asset.json";
import nubeNormal from "@/assets/moods/nube-normal.png.asset.json";
import gotaTriste from "@/assets/moods/gota-triste.png.asset.json";
import nubeMuyMal from "@/assets/moods/nube-muy-mal.png.asset.json";
import type { MoodId } from "@/lib/types";

export interface BrandConfig {
  institutionName: string;
  appName: string;
  brandSubtext: string;
  logoUrl?: string; // Opcional: si se desea cargar una imagen PNG directa para el logo
}

export const brandConfig: BrandConfig = {
  institutionName: "TecNM Valle de Bravo - Ext. Villa Victoria / TESH",
  appName: "EQUILIBRA TESH",
  brandSubtext: "Plataforma Institucional de Bienestar y Salud Mental",
  logoUrl: undefined, // Si se define una URL de imagen, EquilibraBrand la usará como primera opción
};

export interface MoodIllustrationConfig {
  id: MoodId;
  label: string;
  src: string;
  alt: string;
  description: string;
}

export const moodIllustrationsConfig: Record<MoodId, MoodIllustrationConfig> = {
  "muy-bien": {
    id: "muy-bien",
    label: "Excelente",
    src: estrellaFeliz.url,
    alt: "Estrella sonriente y luminosa",
    description: "Te sientes con energía, vitalidad y apertura emocional",
  },
  bien: {
    id: "bien",
    label: "Bien",
    src: nubeLigera.url,
    alt: "Nube suave y alegre",
    description: "Te sientes con tranquilidad y buen ánimo para tus actividades",
  },
  regular: {
    id: "regular",
    label: "Regular",
    src: nubeNormal.url,
    alt: "Nube con expresión neutra",
    description: "Te sientes en balance o con un nivel manejable de cansancio",
  },
  triste: {
    id: "triste",
    label: "Triste",
    src: gotaTriste.url,
    alt: "Gota de agua con semblante melancólico",
    description: "Sientes desánimo, vulnerabilidad o ganas de desconectar",
  },
  "muy-mal": {
    id: "muy-mal",
    label: "Muy mal",
    src: nubeMuyMal.url,
    alt: "Nube con tormenta y relámpago",
    description: "Sientes sobrecarga, dolor emocional o angustia intensa",
  },
};
