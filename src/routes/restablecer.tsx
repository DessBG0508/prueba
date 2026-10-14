import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/restablecer")({
  component: () => <Navigate to="/reset" replace />,
});
