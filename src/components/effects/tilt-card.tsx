import { useState, useRef, type PointerEvent, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number; // max tilt in degrees, defaults to 4
}

export function TiltCard({ children, className = "", maxTilt = 4 }: TiltCardProps) {
  const [transform, setTransform] = useState<string>("none");
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // Strictly deactivated on touch/coarse devices and reduced-motion
    if (shouldReduceMotion || event.pointerType !== "mouse") {
      return;
    }

    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = (event.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

    const rotateX = (-y * (maxTilt * 2)).toFixed(2);
    const rotateY = (x * (maxTilt * 2)).toFixed(2);

    setTransform(`perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
  };

  const handlePointerLeave = () => {
    setTransform("none");
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`will-change-transform ${className}`}
      style={{
        transform: shouldReduceMotion ? "none" : transform,
        transformStyle: "preserve-3d",
        transition:
          transform === "none"
            ? "transform 350ms cubic-bezier(0.2, 0.8, 0.4, 1)"
            : "transform 100ms ease-out",
      }}
    >
      {children}
    </div>
  );
}
