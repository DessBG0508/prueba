import { createFileRoute } from "@tanstack/react-router";
import { AnunciosPage } from "@/features/anuncios/anuncios-page";
import { BRAND } from "@/lib/branding";

export const Route = createFileRoute("/anuncios")({
  validateSearch: (search: Record<string, unknown>): { anuncio?: string } => ({
    anuncio: typeof search.anuncio === "string" ? search.anuncio : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Anuncios y Talleres — ${BRAND.fullName}` },
      {
        name: "description",
        content:
          "Cartelera de talleres de bienestar, manejo de estrés, nutrición, higiene del sueño y eventos del TESH.",
      },
      { property: "og:title", content: `Anuncios y Talleres — ${BRAND.fullName}` },
      {
        property: "og:description",
        content:
          "Cartelera de talleres de bienestar, manejo de estrés, nutrición, higiene del sueño y eventos del TESH.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnunciosPage,
});
