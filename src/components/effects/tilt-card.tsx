import { useState, useRef, useCallback, type MouseEvent, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxAngle?: number; // Máximo 4 grados según especificación
}

export function TiltCard({ children, className = "", maxAngle = 4 }: TiltCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<string>("");
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (shouldReduceMotion || !cardRef.current) return;

      // Desactivado en pantallas táctiles
      if (typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches) {
        return;
      }

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Inclinación máxima de 4 grados
      const rotateX = Math.max(-maxAngle, Math.min(maxAngle, ((y - centerY) / centerY) * -maxAngle));
      const rotateY = Math.max(-maxAngle, Math.min(maxAngle, ((x - centerX) / centerX) * maxAngle));

      // Solo transform (rotación 3D + ligera elevación de 2px)
      setTransformStyle(
        `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`,
      );
    },
    [shouldReduceMotion, maxAngle],
  );

  const handleMouseEnter = () => {
    if (!shouldReduceMotion && typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Retorno suave a posición neutra
    setTransformStyle("perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0px)");
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`tilt-card-wrapper ${className}`}
      style={{
        perspective: "800px",
      }}
    >
      <div
        className="tilt-card-inner h-full w-full"
        style={{
          transform: shouldReduceMotion ? "none" : transformStyle || undefined,
          transformStyle: "preserve-3d",
          transition: isHovered
            ? "transform 80ms ease-out"
            : "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: isHovered ? "transform" : "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
