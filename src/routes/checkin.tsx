import { createFileRoute } from "@tanstack/react-router";
import { CheckInPage } from "@/features/checkin/checkin-page";

export const Route = createFileRoute("/checkin")({
  head: () => ({
    meta: [
      { title: "Check-in emocional — Equilibra TESH" },
      {
        name: "description",
        content:
          "Registra cómo se sintió tu semana académica en un espacio tranquilo y confidencial.",
      },
      { property: "og:title", content: "Check-in emocional — Equilibra TESH" },
      {
        property: "og:description",
        content:
          "Una pausa breve para reconocer cómo te sientes y recibir el acompañamiento que necesitas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckInPage,
});
