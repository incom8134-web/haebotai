"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, MeshDistortMaterial } from "@react-three/drei";
import { useTheme } from "next-themes";
import * as THREE from "three";

// Ambient 3D backdrop for the hero: a "brief" core with orbiting tool-
// output nodes and thin connecting lines — the same "one brief, many
// linked tools" story the hero copy tells, just rendered in space instead
// of only in words. Colors are read straight from the --studio-cyan/
// --studio-violet CSS custom properties the rest of the app already uses,
// so this never drifts from the theme and follows light/dark switches.

// getComputedStyle normalizes the app's oklch() custom properties to
// lab(), which THREE.Color's parser doesn't recognize (it silently falls
// back to a default color instead of throwing). A 1x1 canvas resolves any
// CSS color string the browser can render down to plain sRGB, which
// THREE.Color always understands — reusing the browser's own color engine
// instead of reimplementing oklch/lab math.
function cssColorToHex(value: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return value;
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

// A plain useMemo, not an effect, since this only ever runs client-side
// (the component is mounted via a ssr:false dynamic import) and just
// needs to resync when the theme hook reports a new resolvedTheme.
function useThemeColors(resolvedTheme: string | undefined) {
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const cyan = style.getPropertyValue("--studio-cyan").trim();
    const violet = style.getPropertyValue("--studio-violet").trim();
    return { cyan: cyan ? cssColorToHex(cyan) : "#22d3ee", violet: violet ? cssColorToHex(violet) : "#8b5cf6" };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolvedTheme isn't read directly, it's the signal that the CSS custom properties just changed
  }, [resolvedTheme]);
}

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia(REDUCE_MOTION_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCE_MOTION_QUERY).matches, () => false);
}

/** Normalized pointer position, tracked independently of the canvas's own
 *  pointer-events (the canvas sits pointer-events-none behind page content
 *  so hero buttons stay clickable — R3F's built-in pointer state would
 *  never update in that case). */
function usePointer() {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return pointer;
}

function Rig({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const pointer = usePointer();
  useFrame(() => {
    if (!group.current) return;
    const targetX = (pointer.current.y * Math.PI) / 32;
    const targetY = (pointer.current.x * Math.PI) / 20;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.04;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.04;
  });
  return <group ref={group}>{children}</group>;
}

function Core({ violet, spin }: { violet: string; spin: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!spin || !mesh.current) return;
    mesh.current.rotation.x += delta * 0.06;
    mesh.current.rotation.y += delta * 0.09;
  });
  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1.15, 4]} />
      <MeshDistortMaterial color={violet} emissive={violet} emissiveIntensity={0.15} speed={1.4} distort={0.32} roughness={0.15} metalness={0.3} />
    </mesh>
  );
}

const NODE_COUNT = 6;

function Nodes({ cyan, violet, spin }: { cyan: string; violet: string; spin: boolean }) {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(
    () =>
      Array.from({ length: NODE_COUNT }, (_, i) => {
        const angle = (i / NODE_COUNT) * Math.PI * 2;
        return { angle, radius: 2.6 + (i % 2) * 0.5, y: Math.sin(i * 1.7) * 0.6, floatSpeed: 1 + (i % 3) * 0.4 };
      }),
    [],
  );
  useFrame((_, delta) => {
    if (!spin || !group.current) return;
    group.current.rotation.y += delta * 0.08;
  });
  return (
    <group ref={group}>
      {nodes.map((n, i) => {
        const x = Math.cos(n.angle) * n.radius;
        const z = Math.sin(n.angle) * n.radius;
        const color = i % 2 ? violet : cyan;
        return (
          <group key={i}>
            <Line points={[[0, 0, 0], [x, n.y, z]]} color={color} transparent opacity={0.18} lineWidth={1} />
            <Float speed={n.floatSpeed} floatIntensity={1.1} rotationIntensity={0.4} enabled={spin}>
              <mesh position={[x, n.y, z]}>
                <octahedronGeometry args={[0.22, 0]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.3} metalness={0.4} />
              </mesh>
            </Float>
          </group>
        );
      })}
    </group>
  );
}

function Scene() {
  const { resolvedTheme } = useTheme();
  const { cyan, violet } = useThemeColors(resolvedTheme);
  const spin = !useReducedMotion();
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 3, 4]} color={cyan} intensity={30} />
      <pointLight position={[-4, -2, -3]} color={violet} intensity={22} />
      <Rig>
        <Core violet={violet} spin={spin} />
        <Nodes cyan={cyan} violet={violet} spin={spin} />
      </Rig>
    </>
  );
}

export function Hero3D() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[880px] [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden>
      <Canvas camera={{ position: [0, 0, 6.5], fov: 42 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
        <Scene />
      </Canvas>
    </div>
  );
}
