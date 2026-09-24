// Tableware the dishes sit on: a steel plate, a banana leaf and small steel katoris.
import type {} from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

export type PlateKind = "steel" | "leaf" | "oval" | "small" | "none";

const STEEL = "#dfe3e8";

/** Height of the eating surface above the ground, per plate, so food sits on it. */
export const PLATE_TOP: Record<PlateKind, number> = { steel: 0.035, leaf: 0.05, oval: 0.035, small: 0.03, none: 0 };

/** A thali-style steel plate: flat base, gentle wall, rolled rim. Built by turning a profile. */
function SteelPlate({ radius, scaleX = 1 }: { radius: number; scaleX?: number }) {
  const geo = useMemo(() => {
    const r = radius;
    const profile: [number, number][] = [
      [0, 0.025],
      [r * 0.78, 0.025],
      [r * 0.86, 0.04],
      [r * 0.97, 0.1],
      [r * 1.0, 0.118],
      [r * 1.015, 0.112],
      [r * 1.0, 0.1],
      [r * 0.9, 0.04],
      [r * 0.8, 0.0],
      [0, 0.0],
    ];
    return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 96);
  }, [radius]);
  return (
    <mesh geometry={geo} scale={[scaleX, 1, 1]} receiveShadow castShadow>
      <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.32} side={THREE.DoubleSide} />
    </mesh>
  );
}

const leafTexCache: { tex?: THREE.CanvasTexture } = {};

/** Banana-leaf texture: green gradient, a pale midrib and fine parallel veins. */
function leafTexture(): THREE.CanvasTexture {
  if (leafTexCache.tex) return leafTexCache.tex;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#2f7d32");
  grad.addColorStop(0.5, "#3f9a3c");
  grad.addColorStop(1, "#2a7030");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "rgba(210,240,170,0.18)";
  g.lineWidth = 1.2;
  for (let x = -256; x < 768; x += 7) {
    g.beginPath();
    g.moveTo(x, 128);
    g.lineTo(x + 70, 0);
    g.moveTo(x, 128);
    g.lineTo(x + 70, 256);
    g.stroke();
  }
  g.fillStyle = "#b9d98a";
  g.fillRect(0, 122, 512, 12);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  leafTexCache.tex = tex;
  return tex;
}

/** A trimmed banana-leaf piece lying on the plate. */
function BananaLeaf({ length, width, y }: { length: number; width: number; y: number }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    const L = length / 2;
    const W = width / 2;
    s.moveTo(-L, -W * 0.8);
    s.quadraticCurveTo(-L * 1.02, 0, -L, W * 0.8);
    s.quadraticCurveTo(0, W * 1.08, L * 0.92, W * 0.9);
    s.quadraticCurveTo(L * 1.05, 0, L * 0.92, -W * 0.9);
    s.quadraticCurveTo(0, -W * 1.08, -L, -W * 0.8);
    const g = new THREE.ShapeGeometry(s, 24);
    // Map UVs across the leaf so the midrib runs along its length.
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) + L) / length;
      uv[i * 2 + 1] = (pos.getY(i) + W) / width;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
  }, [length, width]);
  const tex = useMemo(() => leafTexture(), []);
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0.35]} position={[0, y, 0]} receiveShadow>
      <meshStandardMaterial map={tex} roughness={0.45} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** A small steel katori with a liquid inside (sambar, rasam, curd…). */
export function Katori({ position, liquid, radius = 0.2 }: { position: [number, number, number]; liquid: string; radius?: number }) {
  const geo = useMemo(() => {
    const r = radius;
    const pts: [number, number][] = [
      [0, 0],
      [r * 0.72, 0],
      [r * 0.95, r * 0.45],
      [r, r * 0.62],
      [r * 0.95, r * 0.62],
      [r * 0.9, r * 0.45],
      [r * 0.68, r * 0.06],
      [0, r * 0.06],
    ];
    return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 48);
  }, [radius]);
  return (
    <group position={position}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, radius * 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.88, 32]} />
        <meshStandardMaterial color={liquid} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function Plate({ kind }: { kind: PlateKind }) {
  if (kind === "none") return null;
  if (kind === "oval") return <SteelPlate radius={0.95} scaleX={1.25} />;
  if (kind === "small") return <SteelPlate radius={0.92} />;
  if (kind === "leaf")
    return (
      <>
        <SteelPlate radius={1.12} />
        <BananaLeaf length={1.9} width={1.25} y={PLATE_TOP.steel + 0.004} />
      </>
    );
  return <SteelPlate radius={1.08} />;
}
