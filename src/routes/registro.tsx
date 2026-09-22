import { createFileRoute } from "@tanstack/react-router";
import { RegistroPage } from "@/features/auth/registro-page";

export const Route = createFileRoute("/registro")({
  head: () => ({
    meta: [
      { title: "Crea tu espacio seguro — Equilibra TESH" },
      {
        name: "description",
        content:
          "Registro de estudiantes y profesionales para el acompañamiento y bienestar emocional.",
      },
      { property: "og:title", content: "Crea tu espacio seguro — Equilibra TESH" },
      {
        property: "og:description",
        content:
          "Registro de estudiantes y profesionales para el acompañamiento y bienestar emocional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegistroPage,
});
