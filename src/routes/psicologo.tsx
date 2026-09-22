import { createFileRoute } from "@tanstack/react-router";
import { PsychologistDashboard } from "@/features/psicologo/psychologist-dashboard";

export const Route = createFileRoute("/psicologo")({
  head: () => ({
    meta: [
      { title: "Panel de acompañamiento — Equilibra TESH" },
      {
        name: "description",
        content:
          "Vista profesional para priorizar y acompañar casos de bienestar emocional en Equilibra TESH.",
      },
      { property: "og:title", content: "Panel de acompañamiento — Equilibra TESH" },
      {
        property: "og:description",
        content: "Seguimiento sereno y confidencial para el equipo de acompañamiento psicológico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PsychologistDashboard,
});
