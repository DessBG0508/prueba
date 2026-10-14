import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/test")({
  component: TestComponent,
});

function TestComponent() {
  return <h1>TEST OK</h1>;
}
