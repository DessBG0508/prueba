import { createFileRoute } from "@tanstack/react-router";
import { RecursosPage } from "@/features/recursos/recursos-page";

export const Route = createFileRoute("/recursos")({
  head: () => ({
    meta: [
      { title: "Recursos de Autocuidado — Equilibra TESH" },
      {
        name: "description",
        content:
          "Biblioteca de recursos de autocuidado, técnicas de respiración, grounding y psicoeducación del TESH.",
      },
      { property: "og:title", content: "Recursos de Autocuidado — Equilibra TESH" },
      {
        property: "og:description",
        content:
          "Biblioteca de recursos de autocuidado, técnicas de respiración, grounding y psicoeducación del TESH.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecursosPage,
});
