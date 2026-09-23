import type { ReactNode } from "react";

export function AuroraBackground({ children }: { children: ReactNode }) {
  return (
    <div className="aurora-shell">
      <div className="aurora-blobs" aria-hidden="true">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>
      <div className="grain-layer" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
