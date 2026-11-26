import { createFileRoute } from "@tanstack/react-router";
import { CoordinadorDashboard } from "@/features/coordinador/coordinador-dashboard";
import { BRAND } from "@/lib/branding";

export const Route = createFileRoute("/coordinador")({
  head: () => ({
    meta: [
      { title: `Panel de Coordinación — ${BRAND.fullName}` },
      {
        name: "description",
        content: `Asignación de tutores por periodo, seguimiento de canalizaciones y gestión de recursamiento en ${BRAND.fullName}.`,
      },
      { property: "og:title", content: `Panel de Coordinación — ${BRAND.fullName}` },
      {
        property: "og:description",
        content:
          "Gestión administrativa de tutorías, canalizaciones y reubicación académica estudiantil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoordinadorDashboard,
});
