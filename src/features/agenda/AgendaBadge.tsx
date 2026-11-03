import React from "react";
import type { AgendaBadgeType } from "./types";

interface AgendaBadgeProps {
  tipo: AgendaBadgeType;
  descripcion?: string;
  className?: string;
}

export const AgendaBadge: React.FC<AgendaBadgeProps> = ({ tipo, descripcion, className = "" }) => {
  const styles: Record<AgendaBadgeType, string> = {
    AUTO: "bg-[#1c2474] text-white",
    ESTUDIANTE: "bg-[#4f46e5] text-white",
    PSICÓLOGO: "bg-[#8c8bf0] text-white",
    MIXTO: "bg-[#0bb5b5] text-white",
  };

  const defaultDesc: Record<AgendaBadgeType, string> = {
    AUTO: "Sistema lo llena solo",
    ESTUDIANTE: "Estudiante interactúa",
    PSICÓLOGO: "Psicólogo interactúa",
    MIXTO: "Auto + editable",
  };

  return (
    <span
      title={descripcion || defaultDesc[tipo]}
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-xs select-none ${
        styles[tipo]
      } ${className}`}
    >
      {tipo}
    </span>
  );
};
