import { createFileRoute } from "@tanstack/react-router";
import { TutorDashboard } from "@/features/tutor/tutor-dashboard";
import { BRAND } from "@/lib/branding";

export const Route = createFileRoute("/tutor")({
  head: () => ({
    meta: [
      { title: `Panel de Tutor — ${BRAND.fullName}` },
      {
        name: "description",
        content: `Seguimiento grupal, alertas de inasistencia y canalización psicológica en ${BRAND.fullName}.`,
      },
      { property: "og:title", content: `Panel de Tutor — ${BRAND.fullName}` },
      {
        property: "og:description",
        content:
          "Gestión tutorial de grupo, semáforo simplificado y canalizaciones al área de psicología.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TutorDashboard,
});
