import { createFileRoute } from "@tanstack/react-router";
import { EncuestaSatisfaccion } from "@/features/encuesta/EncuestaSatisfaccion";
import { BRAND } from "@/lib/branding";
import { useAuth } from "@/lib/auth-context";

import { getStoredUserFolio } from "@/lib/screening-storage";

function EncuestaRouteComponent() {
  const { user } = useAuth();

  // Leer parámetros de la URL (?folio=TESH-2026-0842&tipo=alta)
  let folio = "";
  let tipo: "alta" | "abandono" = "alta";

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const urlFolio = params.get("folio");
    const urlTipo = params.get("tipo");

    if (urlFolio) {
      folio = urlFolio;
    } else if (user) {
      folio = getStoredUserFolio(user.id, user.email) || "";
    }
    if (urlTipo === "abandono") tipo = "abandono";
  }

  return (
    <main className="min-h-screen bg-background py-8">
      <EncuestaSatisfaccion folio={folio} triggerTipo={tipo} user={user} userId={user?.id} />
    </main>
  );
}

export const Route = createFileRoute("/encuesta")({
  head: () => ({
    meta: [
      { title: `Encuesta de Satisfacción PB-021 — ${BRAND.fullName}` },
      {
        name: "description",
        content: `Encuesta de calidad y acompañamiento psicológico PB-021 de ${BRAND.fullName}.`,
      },
      { property: "og:title", content: `Encuesta de Satisfacción PB-021 — ${BRAND.fullName}` },
      {
        property: "og:description",
        content:
          "Formulario oficial de evaluación de calidad, confidencialidad y acompañamiento en salud mental del TESH.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: EncuestaRouteComponent,
});
