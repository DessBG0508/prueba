import estrellaFeliz from "@/assets/moods/estrella-feliz.png.asset.json";
import nubeLigera from "@/assets/moods/nube-ligera.png.asset.json";
import nubeNormal from "@/assets/moods/nube-normal.png.asset.json";
import gotaTriste from "@/assets/moods/gota-triste.png.asset.json";
import nubeMuyMal from "@/assets/moods/nube-muy-mal.png.asset.json";
import type { MoodId } from "@/lib/types";

const illustrations: Record<MoodId, { src: string; alt: string }> = {
  "muy-bien": { src: estrellaFeliz.url, alt: "Estrella feliz" },
  bien: { src: nubeLigera.url, alt: "Nube ligera y sonriente" },
  regular: { src: nubeNormal.url, alt: "Nube con expresión normal" },
  triste: { src: gotaTriste.url, alt: "Gota triste" },
  "muy-mal": { src: nubeMuyMal.url, alt: "Nube con lluvia y expresión de mucho malestar" },
};

export function MoodIllustration({ moodId }: { moodId: MoodId }) {
  const illustration = illustrations[moodId];
  return <img src={illustration.src} alt={illustration.alt} className="mood-illustration" />;
}
