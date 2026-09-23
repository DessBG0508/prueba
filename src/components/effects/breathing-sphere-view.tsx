import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return Boolean(window.WebGLRenderingContext && gl);
  } catch {
    return false;
  }
}

export function BreathingCircleFallback() {
  return (
    <div
      className="breathing-orb grid size-36 place-items-center rounded-full bg-cyan-soft shadow-soft ring-8 ring-card/70 sm:size-40"
      aria-hidden="true"
    >
      <div className="breathing-orb-core size-20 rounded-full bg-teal/55" />
    </div>
  );
}

// Error boundary to catch any WebGL context loss or runtime failure
class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("3D Sphere failed, using fallback:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Lazy load Three.js & Fiber bundle strictly on demand
const LazyBreathingSphere3D = lazy(() => import("./breathing-sphere-3d"));

export function BreathingSphereView() {
  const shouldReduceMotion = useReducedMotion();
  const [canRender3D, setCanRender3D] = useState(false);

  useEffect(() => {
    if (!shouldReduceMotion && checkWebGLSupport()) {
      setCanRender3D(true);
    }
  }, [shouldReduceMotion]);

  if (shouldReduceMotion || !canRender3D) {
    return <BreathingCircleFallback />;
  }

  return (
    <WebGLErrorBoundary fallback={<BreathingCircleFallback />}>
      <Suspense fallback={<BreathingCircleFallback />}>
        <LazyBreathingSphere3D />
      </Suspense>
    </WebGLErrorBoundary>
  );
}
