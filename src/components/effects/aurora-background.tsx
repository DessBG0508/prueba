import type { ReactNode } from "react";

export function AuroraBackground({ children }: { children: ReactNode }) {
  return (
    <div className="aurora-shell">
      {/* Aurora viva: 3 blobs de gradiente en bucle lento (20-30s) con alto desenfoque y baja opacidad */}
      <div className="aurora-blobs-container" aria-hidden="true">
        {/* Blob 1: Tono lavanda / secundaria institucional */}
        <div className="aurora-blob aurora-blob-1" />
        {/* Blob 2: Tono menta suave / verde institucional */}
        <div className="aurora-blob aurora-blob-2" />
        {/* Blob 3: Tono cian / teal institucional */}
        <div className="aurora-blob aurora-blob-3" />
      </div>
      <div className="grain-layer" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
