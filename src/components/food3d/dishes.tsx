// Stylised, plate-free 3D models of every seeded dish, built from primitives in code.
import type {} from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { Leaf, Mound, Scatter, lumpyGeometry, speckleTexture } from "./kit";

type Vec3 = [number, number, number];

const GOLD_CRUST = { base: "#d9973f", spots: ["#a45d1c", "#b8732a", "#f0c070", "#7a3f12"] };

function useSpeckle(key: string, base: string, spots: string[], density = 260, maxR = 7, seed = 1) {
  return useMemo(() => speckleTexture(key, base, spots, density, maxR, seed), [key, base, spots, density, maxR, seed]);
}

function Lumpy({
  radius = 1,
  scale,
  position,
  rotation = [0, 0, 0],
  lumpiness = 0.06,
  seed,
  color,
  map,
  roughness = 0.7,
}: {
  radius?: number;
  scale: Vec3;
  position: Vec3;
  rotation?: Vec3;
  lumpiness?: number;
  seed: number;
  color?: string;
  map?: THREE.Texture;
  roughness?: number;
}) {
  const geo = useMemo(() => lumpyGeometry(radius, lumpiness, seed, 40), [radius, lumpiness, seed]);
  return (
    <mesh geometry={geo} position={position} rotation={rotation} scale={scale} castShadow receiveShadow>
      <meshStandardMaterial color={color ?? "#ffffff"} map={map ?? null} roughness={roughness} />
    </mesh>
  );
}

function Dollop({ position, color, size = 0.2, seed = 3 }: { position: Vec3; color: string; size?: number; seed?: number }) {
  return <Lumpy position={position} scale={[size, size * 0.55, size]} seed={seed} lumpiness={0.12} color={color} roughness={0.35} />;
}

function Lathe({ points, color, metal = false, opacity = 1, roughness = 0.3, position = [0, 0, 0] as Vec3 }: {
  points: [number, number][];
  color: string;
  metal?: boolean;
  opacity?: number;
  roughness?: number;
  position?: Vec3;
}) {
  const geo = useMemo(() => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 64), [points]);
  return (
    <mesh geometry={geo} position={position} castShadow receiveShadow>
      {metal ? (
        <meshStandardMaterial color={color} metalness={1} roughness={roughness} side={THREE.DoubleSide} />
      ) : (
        <meshPhysicalMaterial
          color={color}
          roughness={roughness}
          transparent={opacity < 1}
          opacity={opacity}
          side={THREE.DoubleSide}
          clearcoat={0.6}
          depthWrite={opacity >= 1}
        />
      )}
    </mesh>
  );
}

// ------------------------------------------------------------------ Breakfast

function Idli() {
  const tex = useSpeckle("idli", "#fbf6ea", ["#e9e0cb", "#dcd2bb", "#ffffff"], 420, 3, 2);
  return (
    <group position={[0, 0, 0]}>
      <Lumpy position={[-0.34, 0.2, 0]} scale={[0.6, 0.24, 0.6]} seed={11} lumpiness={0.03} map={tex} roughness={0.85} />
      <Lumpy position={[0.36, 0.34, 0.04]} rotation={[0.1, 0, -0.42]} scale={[0.6, 0.24, 0.6]} seed={12} lumpiness={0.03} map={tex} roughness={0.85} />
      <Dollop position={[0.12, 0.07, 0.62]} color="#dfe6b6" size={0.22} seed={4} />
      <Dollop position={[-0.55, 0.06, 0.55]} color="#c9582d" size={0.18} seed={5} />
      <Leaf position={[0.14, 0.17, 0.62]} rotation={[0.2, 0.8, 0.1]} scale={0.7} />
    </group>
  );
}

function MasalaDosa() {
  const tex = useSpeckle("dosa", "#e2a64a", ["#b3651f", "#8f4a14", "#f3c679", "#c67a2c"], 520, 6, 3);
  const inner = useSpeckle("dosa-in", "#f1d59a", ["#e8c075", "#fbe7bf"], 200, 5, 4);
  return (
    <group rotation={[0, -0.45, 0.06]} position={[0, 0.32, 0]}>
      {/* The crisp rolled crepe, open at both ends */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.3, 0.28, 1.7, 48, 1, true]} />
        <meshStandardMaterial map={tex} roughness={0.55} side={THREE.FrontSide} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.285, 0.265, 1.68, 48, 1, true]} />
        <meshStandardMaterial map={inner} roughness={0.8} side={THREE.BackSide} />
      </mesh>
      {/* Spiced potato filling peeking out */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 1.4, 24]} />
        <meshStandardMaterial color="#e5b43b" roughness={0.8} />
      </mesh>
      <Dollop position={[0.25, -0.26, 0.6]} color="#dfe6b6" size={0.2} seed={6} />
    </group>
  );
}

function Pongal() {
  const tex = useSpeckle("pongal", "#f0dc9c", ["#2b2418", "#c8a24a", "#fff3c9", "#8a6a2a"], 260, 2.2, 5);
  return (
    <group>
      <Mound radius={0.82} height={0.55} map={tex} seed={21} lumpiness={0.06} roughness={0.45} />
      {[
        [0.1, 0.55, 0.05, 0.3],
        [-0.28, 0.45, 0.25, 1.4],
        [0.35, 0.4, -0.3, 2.2],
        [-0.2, 0.47, -0.3, 0.9],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, r]} castShadow>
          <torusGeometry args={[0.075, 0.04, 10, 20, Math.PI * 1.1]} />
          <meshStandardMaterial color="#f1d9a2" roughness={0.5} />
        </mesh>
      ))}
      <Leaf position={[0.05, 0.58, 0.22]} rotation={[0.3, 0.4, 0.15]} />
      <Leaf position={[-0.15, 0.56, 0.05]} rotation={[0.2, 1.9, -0.1]} scale={0.8} />
    </group>
  );
}

function Poori() {
  const tex = useSpeckle("poori", "#e0a24f", ["#b26a24", "#f6cf86", "#9c5a1b"], 380, 5, 6);
  return (
    <group>
      <Lumpy position={[-0.3, 0.2, -0.1]} rotation={[0.15, 0, 0.2]} scale={[0.62, 0.2, 0.62]} seed={31} lumpiness={0.05} map={tex} roughness={0.5} />
      <Lumpy position={[0.3, 0.3, -0.05]} rotation={[-0.2, 0.3, -0.35]} scale={[0.58, 0.19, 0.58]} seed={32} lumpiness={0.05} map={tex} roughness={0.5} />
      <Mound radius={0.38} height={0.24} color="#e7b53c" position={[0.1, 0, 0.6]} seed={33} lumpiness={0.12} />
      <Scatter count={24} radius={0.34} height={0.24} color="#2f7a3a" size={0.05} seed={34} shape="dot" yOffset={0} colors={["#2f7a3a", "#d4561f"]} />
    </group>
  );
}

// ------------------------------------------------------------------ Meals

function VegMeals() {
  const papad = useSpeckle("papad", "#f1dcaa", ["#d6b574", "#b98e46", "#fff0c8"], 380, 4, 7);
  return (
    <group position={[0, 0, 0.05]}>
      <group position={[-0.25, 0, 0]}>
        <Mound radius={0.6} height={0.42} color="#fbf7ee" seed={41} lumpiness={0.03} />
        <Scatter count={220} radius={0.58} height={0.42} color="#fffdf6" size={0.05} seed={42} roughness={0.5} />
      </group>
      <Dollop position={[0.48, 0.05, 0.3]} color="#e7b33a" size={0.3} seed={43} />
      <Dollop position={[0.35, 0.05, -0.38]} color="#fbfbf6" size={0.24} seed={44} />
      <group position={[0.55, 0, -0.02]}>
        <Mound radius={0.2} height={0.14} color="#7aa84a" seed={45} lumpiness={0.15} />
        <Scatter count={18} radius={0.2} height={0.14} color="#f08a2c" size={0.05} seed={46} shape="cube" colors={["#f08a2c", "#f7e08a"]} />
      </group>
      {/* Papad leaning at the back */}
      <mesh position={[-0.1, 0.5, -0.62]} rotation={[1.2, 0, 0.12]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.02, 48]} />
        <meshStandardMaterial map={papad} roughness={0.8} />
      </mesh>
    </group>
  );
}

function CurdRice() {
  return (
    <group>
      <Mound radius={0.8} height={0.5} color="#f8f4ea" seed={51} lumpiness={0.05} roughness={0.4} />
      <Scatter count={160} radius={0.78} height={0.5} color="#fffdf7" size={0.045} seed={52} roughness={0.45} />
      <Scatter count={40} radius={0.7} height={0.5} color="#1d1a16" size={0.035} seed={53} shape="dot" />
      <Scatter count={14} radius={0.6} height={0.5} color="#b3172d" size={0.07} seed={54} shape="pea" roughness={0.2} />
      <Leaf position={[0.1, 0.52, 0.15]} rotation={[0.25, 0.6, 0.1]} />
      <Leaf position={[-0.2, 0.5, -0.1]} rotation={[0.2, 2.2, -0.15]} scale={0.9} />
      <mesh position={[0.35, 0.44, -0.15]} rotation={[0.4, 0.5, 1.1]} castShadow>
        <capsuleGeometry args={[0.035, 0.28, 4, 10]} />
        <meshStandardMaterial color="#3f8a2a" roughness={0.35} />
      </mesh>
    </group>
  );
}

function LemonRice() {
  return (
    <group>
      <Mound radius={0.8} height={0.48} color="#f0ce45" seed={61} lumpiness={0.05} />
      <Scatter count={200} radius={0.78} height={0.48} color="#f7dc5c" size={0.05} seed={62} colors={["#f7dc5c", "#fbe685", "#eec23a"]} />
      <Scatter count={16} radius={0.65} height={0.48} color="#b9793d" size={0.1} seed={63} shape="pea" colors={["#b9793d", "#a8672f"]} roughness={0.4} />
      <Leaf position={[0.05, 0.5, 0.12]} rotation={[0.3, 0.3, 0.1]} />
      <Leaf position={[-0.25, 0.47, -0.12]} rotation={[0.2, 2.5, -0.1]} scale={0.85} />
      <mesh position={[0.3, 0.42, -0.2]} rotation={[0.3, 0.2, 1.3]} castShadow>
        <capsuleGeometry args={[0.04, 0.22, 4, 10]} />
        <meshStandardMaterial color="#7a1a10" roughness={0.4} />
      </mesh>
    </group>
  );
}

function Biryani() {
  const skin = useSpeckle("chicken", "#9a3f1d", ["#6e2410", "#c4602b", "#4a1706"], 300, 5, 8);
  return (
    <group>
      <Mound radius={0.85} height={0.52} color="#d58a3e" seed={71} lumpiness={0.06} />
      <Scatter count={260} radius={0.83} height={0.52} color="#fff6e0" size={0.05} seed={72} colors={["#fff4dc", "#f4b54a", "#e27b2a", "#fbe6b6", "#fff4dc"]} />
      <Scatter count={30} radius={0.75} height={0.52} color="#5a2c10" size={0.06} seed={73} shape="cube" />
      {/* Chicken leg */}
      <group position={[0.12, 0.5, 0.05]} rotation={[0.1, 0.6, 0.35]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.2, 0.32, 8, 16]} />
          <meshStandardMaterial map={skin} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.05, 0.25, 12]} />
          <meshStandardMaterial color="#f3e7cf" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow>
          <sphereGeometry args={[0.07, 16, 12]} />
          <meshStandardMaterial color="#f3e7cf" roughness={0.5} />
        </mesh>
      </group>
      {/* Half egg */}
      <group position={[-0.42, 0.36, 0.3]} rotation={[-0.5, 0.3, 0.1]}>
        <mesh castShadow scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#fbfaf4" roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <circleGeometry args={[0.085, 24]} />
          <meshStandardMaterial color="#f2b61f" roughness={0.6} />
        </mesh>
      </group>
      <Leaf position={[-0.1, 0.52, -0.25]} rotation={[0.3, 1.2, 0.2]} color="#3b9a45" />
      <Leaf position={[0.35, 0.44, -0.3]} rotation={[0.2, 2.6, 0.1]} color="#3b9a45" scale={0.8} />
    </group>
  );
}

function EggFriedRice() {
  return (
    <group>
      <Mound radius={0.84} height={0.5} color="#efdcae" seed={81} lumpiness={0.06} />
      <Scatter count={240} radius={0.82} height={0.5} color="#fbf1d4" size={0.05} seed={82} colors={["#fbf1d4", "#f3e2b4", "#fff8e6"]} />
      <Scatter count={30} radius={0.75} height={0.5} color="#f6d24a" size={0.09} seed={83} shape="cube" colors={["#f6d24a", "#f9e27a"]} roughness={0.5} />
      <Scatter count={22} radius={0.75} height={0.5} color="#5aa83a" size={0.07} seed={84} shape="pea" roughness={0.3} />
      <Scatter count={18} radius={0.75} height={0.5} color="#ec7a2a" size={0.07} seed={85} shape="cube" />
      <Scatter count={16} radius={0.6} height={0.5} color="#3f9a3a" size={0.06} seed={86} colors={["#3f9a3a", "#8cc85a"]} />
    </group>
  );
}

// ------------------------------------------------------------------ Snacks

function Samosa({ position, rotation, seed }: { position: Vec3; rotation: Vec3; seed: number }) {
  const tex = useSpeckle("samosa", GOLD_CRUST.base, GOLD_CRUST.spots, 420, 5, seed);
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.5, 0.9, 3, 6);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={position} rotation={rotation} scale={[1, 1, 0.8]} castShadow>
      <meshStandardMaterial map={tex} roughness={0.55} flatShading={false} />
    </mesh>
  );
}

function Samosas() {
  return (
    <group>
      <Samosa position={[-0.32, 0.42, 0]} rotation={[0, 0.3, 0.05]} seed={91} />
      <Samosa position={[0.4, 0.38, 0.1]} rotation={[0.05, -0.8, -0.1]} seed={92} />
      <Dollop position={[0.05, 0.05, 0.62]} color="#6aa83a" size={0.2} seed={93} />
    </group>
  );
}

function Puff({ egg = false }: { egg?: boolean }) {
  const tex = useSpeckle("puff", "#e3a650", ["#c07a2c", "#f6d38e", "#9a5a1c"], 300, 6, egg ? 102 : 101);
  const layers = [0, 1, 2, 3];
  if (egg) {
    return (
      <group position={[0, 0.02, 0]} rotation={[0, 0.5, 0]}>
        {layers.map((i) => (
          <mesh key={i} position={[0, 0.07 + i * 0.09, 0]} rotation={[0, i * 0.03, 0]} scale={[1 - i * 0.03, 1, 1 - i * 0.03]} castShadow>
            <cylinderGeometry args={[0.72, 0.72, 0.1, 3]} />
            <meshStandardMaterial map={tex} color={i === 3 ? "#e9b064" : "#f1c57e"} roughness={0.55} />
          </mesh>
        ))}
        <mesh position={[0.1, 0.42, 0]} scale={[1, 0.55, 1]} castShadow>
          <sphereGeometry args={[0.18, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#fbfaf4" roughness={0.3} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[0, 0.02, 0]} rotation={[0, -0.4, 0]}>
      {layers.map((i) => (
        <RoundedBox
          key={i}
          args={[1.3 - i * 0.04, 0.12, 0.85 - i * 0.03]}
          radius={0.05}
          smoothness={3}
          position={[i * 0.01, 0.07 + i * 0.1, 0]}
          castShadow
        >
          <meshStandardMaterial map={tex} color={i === 3 ? "#e8ab5c" : "#f3cd8c"} roughness={0.55} />
        </RoundedBox>
      ))}
    </group>
  );
}

function OnionBajji() {
  const tex = useSpeckle("bajji", "#d98a2e", ["#a8561a", "#f2b35a", "#7d3a0e", "#e8a040"], 460, 5, 111);
  const pieces: { p: Vec3; r: Vec3; s: Vec3; seed: number }[] = [
    { p: [-0.35, 0.18, 0.05], r: [0.2, 0.3, 0.1], s: [0.42, 0.2, 0.3], seed: 112 },
    { p: [0.3, 0.2, -0.1], r: [-0.1, 1.4, 0.2], s: [0.4, 0.22, 0.28], seed: 113 },
    { p: [0.02, 0.2, 0.42], r: [0.1, 0.9, -0.2], s: [0.38, 0.2, 0.28], seed: 114 },
    { p: [0.0, 0.42, -0.02], r: [0.3, 2.2, 0.35], s: [0.36, 0.18, 0.26], seed: 115 },
  ];
  return (
    <group>
      {pieces.map((pc) => (
        <Lumpy key={pc.seed} position={pc.p} rotation={pc.r} scale={pc.s} seed={pc.seed} lumpiness={0.22} map={tex} roughness={0.45} />
      ))}
      <mesh position={[0.45, 0.08, 0.4]} rotation={[0, 0.8, 1.45]} castShadow>
        <capsuleGeometry args={[0.05, 0.4, 4, 12]} />
        <meshStandardMaterial color="#3f8a2a" roughness={0.3} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ Beverages

const STEEL = "#dfe3e8";

function FilterCoffee() {
  // Brushed steel: bright base colour, a touch of roughness so it reads as metal from any angle.
  const froth = useSpeckle("froth", "#c99a66", ["#e6c79f", "#a8744a", "#f3dfc2"], 300, 6, 121);
  return (
    <group>
      {/* Dabara (the wide cup) */}
      <Lathe points={[[0.0, 0.0], [0.42, 0.0], [0.5, 0.05], [0.58, 0.28], [0.62, 0.34], [0.6, 0.35], [0.56, 0.3], [0.48, 0.08], [0.0, 0.07]]} color={STEEL} metal roughness={0.28} />
      {/* Tumbler */}
      <Lathe
        position={[0, 0.08, 0]}
        points={[[0.0, 0.0], [0.3, 0.0], [0.33, 0.04], [0.37, 0.9], [0.4, 0.96], [0.38, 0.97], [0.35, 0.92], [0.31, 0.06], [0.0, 0.05]]}
        color={STEEL}
        metal
        roughness={0.22}
      />
      <mesh position={[0, 0.98, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.345, 48]} />
        <meshStandardMaterial map={froth} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Tea() {
  return (
    <group>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.25, 0.72, 48]} />
        <meshStandardMaterial color="#b8692a" roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.765, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 48]} />
        <meshStandardMaterial color="#d9a56c" roughness={0.7} />
      </mesh>
      <Lathe points={[[0.0, 0.0], [0.28, 0.0], [0.34, 0.9], [0.33, 0.9], [0.27, 0.02], [0.0, 0.02]]} color="#e8f2f2" opacity={0.28} roughness={0.05} />
    </group>
  );
}

function LimeJuice() {
  const slice = useSpeckle("lime", "#f3f0a0", ["#fbfbd0", "#e2e070", "#ffffff"], 120, 10, 131);
  return (
    <group scale={0.74}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.3, 0.25, 1.0, 48]} />
        <meshStandardMaterial color="#e2ee94" roughness={0.2} transparent opacity={0.9} />
      </mesh>
      {[
        [0.08, 0.9, 0.05],
        [-0.1, 0.95, -0.06],
      ].map((p, i) => (
        <mesh key={i} position={p as Vec3} rotation={[0.4 * i, 0.6, 0.3]}>
          <boxGeometry args={[0.16, 0.16, 0.16]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.05} transparent opacity={0.55} />
        </mesh>
      ))}
      <Lathe points={[[0.0, 0.0], [0.28, 0.0], [0.35, 1.25], [0.34, 1.25], [0.27, 0.02], [0.0, 0.02]]} color="#eef8f5" opacity={0.25} roughness={0.05} />
      {/* Lemon wheel on the rim */}
      <group position={[0.3, 1.2, 0.12]} rotation={[0.2, 0, 1.25]} scale={0.7}>
        <mesh>
          <cylinderGeometry args={[0.24, 0.24, 0.04, 40]} />
          <meshStandardMaterial map={slice} roughness={0.3} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.24, 0.022, 8, 40]} />
          <meshStandardMaterial color="#d9d23a" roughness={0.4} />
        </mesh>
      </group>
      {/* Straw */}
      <mesh position={[-0.12, 1.1, -0.05]} rotation={[0.15, 0, 0.22]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 12]} />
        <meshStandardMaterial color="#2f7a4f" roughness={0.4} />
      </mesh>
    </group>
  );
}

// ------------------------------------------------------------------ registry

const DISHES: Record<string, { Model: () => React.JSX.Element; hot: boolean; steamAt: Vec3 }> = {
  idli: { Model: Idli, hot: true, steamAt: [0, 0.5, 0] },
  "masala-dosa": { Model: MasalaDosa, hot: true, steamAt: [0, 0.7, 0] },
  pongal: { Model: Pongal, hot: true, steamAt: [0, 0.65, 0] },
  poori: { Model: Poori, hot: true, steamAt: [0, 0.5, 0] },
  "veg-meals": { Model: VegMeals, hot: true, steamAt: [-0.25, 0.5, 0] },
  "curd-rice": { Model: CurdRice, hot: false, steamAt: [0, 0.6, 0] },
  "lemon-rice": { Model: LemonRice, hot: true, steamAt: [0, 0.6, 0] },
  biryani: { Model: Biryani, hot: true, steamAt: [0, 0.8, 0] },
  "egg-fried-rice": { Model: EggFriedRice, hot: true, steamAt: [0, 0.6, 0] },
  samosa: { Model: Samosas, hot: true, steamAt: [0, 0.9, 0] },
  "veg-puff": { Model: () => <Puff />, hot: false, steamAt: [0, 0.5, 0] },
  "egg-puff": { Model: () => <Puff egg />, hot: false, steamAt: [0, 0.5, 0] },
  "onion-bajji": { Model: OnionBajji, hot: true, steamAt: [0, 0.6, 0] },
  "filter-coffee": { Model: FilterCoffee, hot: true, steamAt: [0, 1.05, 0] },
  tea: { Model: Tea, hot: true, steamAt: [0, 0.9, 0] },
  "lime-juice": { Model: LimeJuice, hot: false, steamAt: [0, 1.3, 0] },
};

export const DISH_KEYS = Object.keys(DISHES);

/** Generic fallback for dishes an admin adds without a model: a golden mound with herbs. */
function Generic() {
  return (
    <group>
      <Mound radius={0.75} height={0.45} color="#e2b35a" seed={200} lumpiness={0.08} />
      <Leaf position={[0, 0.47, 0.1]} rotation={[0.3, 0.4, 0.1]} />
    </group>
  );
}

export function getDish(key: string | null | undefined) {
  return (key && DISHES[key]) || { Model: Generic, hot: false, steamAt: [0, 0.5, 0] as Vec3 };
}
