"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { DishStage } from "@/components/food3d/Stage";

declare global {
  interface Window {
    __stillReady?: boolean;
  }
}

export function StillRenderer({ modelKey }: { modelKey: string }) {
  return (
    <div id="still" style={{ width: 640, height: 512, background: "transparent" }}>
      <Canvas
        dpr={1}
        camera={{ position: [0, 2.15, 3.3], fov: 34 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0.22, 0)}
      >
        <Suspense fallback={null}>
          <DishStage modelKey={modelKey} animated={false} />
          <Ready />
        </Suspense>
      </Canvas>
    </div>
  );
}

function Ready() {
  // Mark ready after a few frames so the environment map and shadows have settled.
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current > 12) window.__stillReady = true;
  });
  return null;
}
