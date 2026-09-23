// Small procedural building blocks shared by the dish models.
import type {} from "@react-three/fiber";
import { useMemo, useRef, useLayoutEffect } from "react";
import * as THREE from "three";

/** Deterministic RNG so every render of a dish looks the same (and stills are reproducible). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const texCache = new Map<string, THREE.CanvasTexture>();

/** Speckled crust / surface texture drawn on a canvas: base colour, darker spots, lighter flecks. */
export function speckleTexture(key: string, base: string, spots: string[], density = 260, maxR = 7, seed = 1): THREE.CanvasTexture {
  const cacheKey = `${key}:${base}:${spots.join()}:${density}:${maxR}:${seed}`;
  const hit = texCache.get(cacheKey);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  const r = rng(seed);
  for (let i = 0; i < density; i++) {
    g.globalAlpha = 0.25 + r() * 0.55;
    g.fillStyle = spots[Math.floor(r() * spots.length)];
    g.beginPath();
    g.ellipse(r() * 256, r() * 256, 1 + r() * maxR, 1 + r() * maxR * 0.7, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  texCache.set(cacheKey, tex);
  return tex;
}

/** Nudges sphere vertices outward/inward for an organic, hand-made silhouette. */
export function lumpyGeometry(radius: number, lumpiness: number, seed: number, detail = 32): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(radius, detail, Math.round(detail * 0.75));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const r = rng(seed);
  const phases = Array.from({ length: 6 }, () => r() * Math.PI * 2);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const bump =
      Math.sin(n.x * 5 + phases[0]) * Math.cos(n.y * 4 + phases[1]) * 0.5 +
      Math.sin(n.z * 7 + phases[2]) * 0.3 +
      Math.sin((n.x + n.z) * 11 + phases[3]) * 0.2;
    v.addScaledVector(n, bump * lumpiness * radius);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

type Vec3 = [number, number, number];

/** Scatters small instanced pieces (rice grains, seeds, peas) over a dome of given radius/height. */
export function Scatter({
  count,
  radius,
  height,
  color,
  size,
  seed,
  shape = "grain",
  yOffset = 0,
  colors,
  roughness = 0.6,
}: {
  count: number;
  radius: number;
  height: number;
  color: string;
  size: number;
  seed: number;
  shape?: "grain" | "dot" | "cube" | "pea";
  yOffset?: number;
  colors?: string[];
  roughness?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    if (shape === "grain") return new THREE.CapsuleGeometry(size * 0.35, size * 1.4, 3, 6);
    if (shape === "cube") return new THREE.BoxGeometry(size, size, size);
    return new THREE.SphereGeometry(shape === "pea" ? size * 0.6 : size * 0.4, 8, 6);
  }, [shape, size]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const r = rng(seed);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // Uniform-ish point on a disc, lifted onto the dome surface.
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * radius * 0.98;
      const t = d / radius;
      const y = yOffset + height * Math.sqrt(Math.max(0, 1 - t * t)) + size * 0.2;
      e.set(r() * Math.PI, r() * Math.PI, r() * Math.PI);
      q.setFromEuler(e);
      const s = 0.8 + r() * 0.4;
      m.compose(new THREE.Vector3(Math.cos(a) * d, y, Math.sin(a) * d), q, new THREE.Vector3(s, s, s));
      mesh.setMatrixAt(i, m);
      if (colors) mesh.setColorAt(i, col.set(colors[Math.floor(r() * colors.length)]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, radius, height, size, seed, yOffset, colors]);

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, count]} castShadow>
      <meshStandardMaterial color={colors ? "#ffffff" : color} roughness={roughness} />
    </instancedMesh>
  );
}

/** A curry / mint leaf: a thin, pointed ellipsoid with a midrib tint. */
export function Leaf({ position, rotation = [0, 0, 0], scale = 1, color = "#2f7a3a" }: { position: Vec3; rotation?: Vec3; scale?: number; color?: string }) {
  return (
    <mesh position={position} rotation={rotation} scale={[0.16 * scale, 0.018 * scale, 0.065 * scale]} castShadow>
      <sphereGeometry args={[1, 16, 8]} />
      <meshStandardMaterial color={color} roughness={0.45} />
    </mesh>
  );
}

/** A dome of food (rice, pongal, masala): flattened sphere cut at the base. */
export function Mound({
  radius,
  height,
  color,
  map,
  seed = 1,
  lumpiness = 0.04,
  position = [0, 0, 0],
  roughness = 0.75,
}: {
  radius: number;
  height: number;
  color?: string;
  map?: THREE.Texture;
  seed?: number;
  lumpiness?: number;
  position?: Vec3;
  roughness?: number;
}) {
  const geo = useMemo(() => {
    const g = lumpyGeometry(1, lumpiness, seed, 48);
    // Keep only the upper half and flatten the base so it sits on its shadow.
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, pos.getY(i) * 0.08);
    g.computeVertexNormals();
    return g;
  }, [lumpiness, seed]);
  return (
    <mesh geometry={geo} position={position} scale={[radius, height, radius]} castShadow receiveShadow>
      <meshStandardMaterial color={color ?? "#ffffff"} map={map ?? null} roughness={roughness} />
    </mesh>
  );
}
