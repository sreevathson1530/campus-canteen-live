import { ContactShadows, Environment, Float, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getDish } from "./dishes";

type Vec3 = [number, number, number];

/** Soft studio light built from light formers: no HDR files are downloaded. */
export function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 2.5]} intensity={2.1} color="#fff2dc" />
      <directionalLight position={[-4, 2.5, -3]} intensity={0.7} color="#dfeaff" />
      <Environment resolution={256} frames={1}>
        {/* Warm grey surroundings so polished steel reflects light instead of black. */}
        <color attach="background" args={["#5e574c"]} />
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} color="#fff6e8" />
        <Lightformer form="rect" intensity={1.4} position={[-5, 1.5, 1]} rotation-y={Math.PI / 2} scale={[6, 2.5, 1]} color="#ffe2b8" />
        <Lightformer form="rect" intensity={1.1} position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} color="#dcecff" />
        <Lightformer form="ring" intensity={0.8} position={[0, 1, -6]} scale={3} color="#ffffff" />
      </Environment>
    </>
  );
}

/** Rising, fading wisps above hot food. */
function Steam({ at }: { at: Vec3 }) {
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ phase: i / 12, x: (Math.sin(i * 7.3) * 0.18), z: Math.cos(i * 3.1) * 0.12, speed: 0.22 + (i % 4) * 0.03 })),
    [],
  );
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    g.children.forEach((child, i) => {
      const p = puffs[i];
      const life = (t * p.speed + p.phase) % 1;
      const mesh = child as THREE.Mesh;
      mesh.position.set(p.x + Math.sin(t * 1.3 + i) * 0.06 * life, life * 0.9, p.z + Math.cos(t + i) * 0.05 * life);
      const s = 0.06 + life * 0.18;
      mesh.scale.setScalar(s);
      (mesh.material as THREE.MeshBasicMaterial).opacity = Math.sin(life * Math.PI) * 0.16;
    });
  });
  return (
    <group ref={group} position={at}>
      {puffs.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** One dish on its contact shadow. `animated` adds float and steam (off for stills and reduced motion). */
export function DishStage({ modelKey, animated }: { modelKey: string | null; animated: boolean }) {
  const { Model, hot, steamAt } = getDish(modelKey);
  const dish = (
    <group position={[0, 0.08, 0]}>
      <Model />
      {animated && hot && <Steam at={steamAt} />}
    </group>
  );
  return (
    <>
      <StudioLights />
      {animated ? (
        <Float speed={1.6} rotationIntensity={0.15} floatIntensity={0.35} floatingRange={[0, 0.08]}>
          {dish}
        </Float>
      ) : (
        dish
      )}
      <ContactShadows position={[0, 0, 0]} opacity={0.42} scale={3.4} blur={2.6} far={1.6} resolution={512} color="#3b2a16" />
    </>
  );
}
