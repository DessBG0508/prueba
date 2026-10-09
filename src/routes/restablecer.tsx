import { createFileRoute } from "@tanstack/react-router";
import { RestablecerPage } from "@/features/auth/restablecer-page";
import { BRAND } from "@/lib/branding";

type RestablecerSearch = {
  email?: string;
  token?: string;
  code?: string;
};

export const Route = createFileRoute("/restablecer")({
  validateSearch: (search: Record<string, unknown>): RestablecerSearch => ({
    email: typeof search.email === "string" ? search.email : undefined,
    token: typeof search.token === "string" ? search.token : undefined,
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Restablecer contraseña — ${BRAND.fullName}` },
      {
        name: "description",
        content: "Ingreso de código de 6 dígitos y actualización de contraseña segura.",
      },
      { property: "og:title", content: `Restablecer contraseña — ${BRAND.fullName}` },
      {
        property: "og:description",
        content: "Ingreso de código de 6 dígitos y actualización de contraseña segura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RestablecerPage,
});
