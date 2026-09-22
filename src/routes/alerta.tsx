import { createFileRoute } from "@tanstack/react-router";
import { AlertaPage } from "@/features/alerta/alerta-page";

export const Route = createFileRoute("/alerta")({
  head: () => ({
    meta: [
      { title: "Atención prioritaria — Equilibra TESH" },
      {
        name: "description",
        content:
          "Apoyo psicológico inmediato, confidencial y cercano para estudiantes de la comunidad TESH.",
      },
      { property: "og:title", content: "Atención prioritaria — Equilibra TESH" },
      {
        property: "og:description",
        content: "Encuentra acompañamiento y recursos de apoyo disponibles en este momento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AlertaPage,
});
