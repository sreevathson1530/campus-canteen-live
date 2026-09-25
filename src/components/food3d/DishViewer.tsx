"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState, useSyncExternalStore } from "react";
import { Rotate3d } from "lucide-react";
import { cn } from "@/lib/utils";
import { DishStage } from "./Stage";

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Live, spinnable 3D dish. Loaded lazily from the dish sheet; it fades in over the still image
 * once the first frame is drawn. Without WebGL it renders nothing and the still stays visible.
 * With reduced motion there is no auto-rotate, float or steam, and frames render only on interaction.
 */
export function DishViewer({
  modelKey,
  className,
  interactive = true,
}: {
  modelKey: string;
  className?: string;
  /** false: a spinning showpiece that ignores touch, so the page still scrolls over it. */
  interactive?: boolean;
}) {
  const [supported] = useState(() => typeof window !== "undefined" && hasWebGL());
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => true);
  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);

  if (!supported) return null;

  return (
    <div
      className={cn(
        "transition-opacity duration-500",
        "bg-[radial-gradient(circle_at_50%_40%,#ffffff_0%,#f3ecdd_60%,#e5d8bf_100%)] dark:bg-[radial-gradient(circle_at_50%_40%,#35302a_0%,#201d19_70%)]",
        ready ? "opacity-100" : "opacity-0",
        !interactive && "pointer-events-none",
        className,
      )}
      onPointerDown={() => setTouched(true)}
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 2.1, 3.6], fov: 34, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        frameloop={reduced ? "demand" : "always"}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.05;
          requestAnimationFrame(() => setReady(true));
        }}
        aria-label="3D model of the dish. Drag to rotate, pinch to zoom."
        role="img"
      >
        <Suspense fallback={null}>
          <DishStage modelKey={modelKey} animated={!reduced} />
        </Suspense>
        <OrbitControls
          target={[0, 0.3, 0]}
          enablePan={false}
          minDistance={1.8}
          maxDistance={4.6}
          minPolarAngle={0.25}
          maxPolarAngle={1.38}
          autoRotate={!reduced && !touched}
          autoRotateSpeed={1.4}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
      {interactive && (
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-3 flex justify-center transition-opacity duration-700",
          touched ? "opacity-0" : "opacity-100",
        )}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold backdrop-blur">
          <Rotate3d className="size-3.5" /> Drag to spin · pinch to zoom
        </span>
      </div>
      )}
    </div>
  );
}
