import { useState, useRef, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function LiquidButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const shouldReduceMotion = useReducedMotion();
  const nextRippleId = useRef(0);

  const handlePointerMove = (event: MouseEvent<HTMLButtonElement>) => {
    // Solo activamos seguimiento continuo en dispositivos de puntero preciso (desktop)
    if (typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (shouldReduceMotion) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const size = Math.max(bounds.width, bounds.height) * 2.2;

    const newRipple: Ripple = {
      id: ++nextRippleId.current,
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev, newRipple]);

    // Limpieza automática al concluir la animación (600ms)
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  return (
    <Button
      size="lg"
      onClick={onClick}
      onMouseMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      className="liquid-button group relative w-full overflow-hidden bg-accent text-accent-foreground select-none"
      style={
        {
          "--liquid-x": `${position.x}%`,
          "--liquid-y": `${position.y}%`,
        } as React.CSSProperties
      }
    >
      {/* Brillo radial siguiendo el puntero en desktop */}
      <span className="liquid-sheen" aria-hidden="true" />
      <span className="liquid-glow" aria-hidden="true" />

      {/* Ondas expansivas al presionar (todos los dispositivos) */}
      {!shouldReduceMotion &&
        ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="liquid-ripple"
            style={{
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: `${ripple.size}px`,
              height: `${ripple.size}px`,
            }}
            aria-hidden="true"
          />
        ))}

      <span className="relative z-10 font-semibold tracking-wide">{children}</span>
      <ArrowUpRight className="relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Button>
  );
}
