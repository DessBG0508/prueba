import React from "react";
import type { BadgeType } from "./types";

interface BadgeOrigenProps {
  tipo: BadgeType;
  className?: string;
}

export const BadgeOrigen: React.FC<BadgeOrigenProps> = ({ tipo, className = "" }) => {
  const styles: Record<BadgeType, string> = {
    AUTOMÁTICO: "bg-[#1c2474] text-white border-transparent",
    MIXTO: "bg-[#0bb5b5] text-white border-transparent",
    PSICÓLOGO: "bg-[#8c8bf0] text-white border-transparent",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-xs select-none ${
        styles[tipo]
      } ${className}`}
    >
      {tipo}
    </span>
  );
};
