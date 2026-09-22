import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/home/home-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Equilibra TESH — Tu bienestar universitario" },
      {
        name: "description",
        content:
          "Espacio de apoyo psicológico y bienestar emocional para la comunidad estudiantil del TESH Huixquilucan.",
      },
      { property: "og:title", content: "Equilibra TESH — Tu bienestar universitario" },
      {
        property: "og:description",
        content: "Acompañamiento psicológico universitario cercano, confidencial y humano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});
