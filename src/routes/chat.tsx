import { createFileRoute } from "@tanstack/react-router";
import { ChatPage } from "@/features/chat/chat-page";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat con Eli — Equilibra TESH" },
      {
        name: "description",
        content:
          "Conversa con Eli, asistente conversacional de apoyo emocional en un espacio confidencial y seguro para la comunidad del TESH.",
      },
      { property: "og:title", content: "Chat con Eli — Equilibra TESH" },
      {
        property: "og:description",
        content:
          "Conversa con Eli, asistente conversacional de apoyo emocional en un espacio confidencial y seguro para la comunidad del TESH.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});
