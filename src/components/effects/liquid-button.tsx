import { useState, useRef, type PointerEvent, type ReactNode } from "react";
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    // Only track continuous coordinates on fine pointers (desktop mouse)
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    setPosition({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (shouldReduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.5;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newRipple: Ripple = {
      id: Date.now() + Math.random(),
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev.slice(-3), newRipple]);
  };

  const removeRipple = (id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <Button
      ref={buttonRef}
      size="lg"
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      className="liquid-button group relative w-full overflow-hidden bg-accent text-accent-foreground active:scale-[0.98] transition-transform duration-150"
      style={
        {
          "--liquid-x": `${position.x}%`,
          "--liquid-y": `${position.y}%`,
        } as React.CSSProperties
      }
    >
      <span className="liquid-glow" aria-hidden="true" />

      {/* Ripple wave layer (only transform & opacity) */}
      {!shouldReduceMotion &&
        ripples.map((ripple) => (
          <span
            key={ripple.id}
            onAnimationEnd={() => removeRipple(ripple.id)}
            className="pointer-events-none absolute rounded-full bg-white/35"
            style={{
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: `${ripple.size}px`,
              height: `${ripple.size}px`,
              animation: "liquid-ripple 600ms cubic-bezier(0.1, 0.8, 0.3, 1) forwards",
              willChange: "transform, opacity",
            }}
            aria-hidden="true"
          />
        ))}

      <span className="relative z-10">{children}</span>
      <ArrowUpRight className="relative z-10 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Button>
  );
}
