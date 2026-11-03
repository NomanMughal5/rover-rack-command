import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { driver, getEngine, useEngine, useSim } from "@/sim/store";
import type { Engine, Robot } from "@/sim/engine";
import { RobotModel, STATUS_COLORS } from "./RobotModel";
import { useCamera } from "./camera";

const W = 26;
const H = 18;
const wx = (x: number) => x - W / 2 + 0.5;
const wz = (y: number) => y - H / 2 + 0.5;

export function robotColor(engine: Engine, r: Robot) {
  if (engine.isWaiting(r)) return STATUS_COLORS.waiting;
  if (r.status === "loading" || r.status === "unloading") return STATUS_COLORS.loading;
  if (r.packageId) return STATUS_COLORS.carrying;
  if (r.moving) return STATUS_COLORS.moving;
  return STATUS_COLORS.idle;
}

function useFloorTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f1eee8";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3500; i++) {
      const v = 225 + Math.floor(Math.random() * 25);
      g.fillStyle = `rgba(${v},${v - 3},${v - 8},0.35)`;
      g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    g.strokeStyle = "rgba(160,150,135,0.18)";
    g.lineWidth = 2;
    g.strokeRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(W / 2, H / 2);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function useStripeTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#f6e1d6";
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = "#e2735a";
    g.lineWidth = 14;
    for (let i = -128; i < 256; i += 36) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + 128, 128);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1.4);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Crates({ items, color, size }: { items: [number, number, number][]; color: string; size: [number, number, number] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    items.forEach((p, i) => {
      m.makeTranslation(p[0], p[1], p[2]);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </instancedMesh>
  );
}

function Environment3D() {
  const engine = getEngine();
  const floor = useFloorTexture();
  const stripes = useStripeTexture();
  const crates = useMemo(() => {
    const orange: [number, number, number][] = [];
    const green: [number, number, number][] = [];
    const cardboard: [number, number, number][] = [];
    const white: [number, number, number][] = [];
    for (const r of engine.racks) {
      for (let i = 0; i < r.w; i++)
        for (let j = 0; j < r.h; j++) {
          const p: [number, number, number] = [wx(r.x + i), 0.78, wz(r.y + j)];
          if (r.color === "orange") orange.push(p);
          else if (r.color === "green") green.push(p);
          else ((i + j) % 2 ? cardboard : white).push(p);
          if (r.color !== "orange" && (i + j) % 3 === 0) cardboard.push([p[0], 1.18, p[2]]);
        }
    }
    for (const o of engine.obstacles) {
      cardboard.push([wx(o.x) - 0.18, 0.28, wz(o.y) - 0.18], [wx(o.x) + 0.18, 0.28, wz(o.y) + 0.12], [wx(o.x), 0.62, wz(o.y)]);
    }
    return { orange, green, cardboard, white };
  }, [engine]);

  const lanes = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const ok = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !engine.blocked[y][x];
    for (const y of [1, 5, 9, 13, 16])
      for (let x = 0; x < W - 1; x++)
        if (ok(x, y) && ok(x + 1, y)) pts.push(new THREE.Vector3(wx(x), 0.012, wz(y)), new THREE.Vector3(wx(x + 1), 0.012, wz(y)));
    for (const x of [1, 7, 13, 19, 24])
      for (let y = 0; y < H - 1; y++)
        if (ok(x, y) && ok(x, y + 1)) pts.push(new THREE.Vector3(wx(x), 0.012, wz(y)), new THREE.Vector3(wx(x), 0.012, wz(y + 1)));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [engine]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={floor} roughness={0.9} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <planeGeometry args={[W + 12, H + 14]} />
        <meshStandardMaterial color="#e9e3d9" roughness={1} />
      </mesh>
      {/* perimeter walls */}
      {[
        [0, -H / 2 - 0.08, W + 0.3, 0.16],
        [-W / 2 - 0.08, 0, 0.16, H],
        [W / 2 + 0.08, 0, 0.16, H],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.35, z]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.7, d]} />
          <meshStandardMaterial color="#fbfaf7" roughness={0.6} />
        </mesh>
      ))}
      <lineSegments geometry={lanes}>
        <lineBasicMaterial color="#7fb38a" transparent opacity={0.75} />
      </lineSegments>
      {/* racks */}
      {engine.racks.map((r) => (
        <group key={r.id}>
          <mesh position={[wx(r.x) + (r.w - 1) / 2, 0.27, wz(r.y) + (r.h - 1) / 2]} castShadow receiveShadow>
            <boxGeometry args={[r.w - 0.08, 0.54, r.h - 0.08]} />
            <meshStandardMaterial color="#fdfcf9" roughness={0.5} />
          </mesh>
          <Html position={[wx(r.x) - 0.35, 0.56, wz(r.y) + r.h - 0.62]} center={false} zIndexRange={[5, 0]} pointerEvents="none">
            <div className="pointer-events-none select-none rounded bg-card/80 px-1 text-[8px] font-semibold text-muted-foreground">{r.id}</div>
          </Html>
        </group>
      ))}
      <Crates items={crates.orange} color="#ef7a3c" size={[0.84, 0.46, 0.84]} />
      <Crates items={crates.green} color="#5f8f62" size={[0.84, 0.46, 0.84]} />
      <Crates items={crates.white} color="#eceae4" size={[0.84, 0.46, 0.84]} />
      <Crates items={crates.cardboard} color="#c99a62" size={[0.36, 0.34, 0.36]} />
      {/* pickup + delivery stations */}
      {engine.locations.map((l) => (
        <group key={l.id} position={[wx(l.cell.x), 0, wz(l.cell.y)]}>
          <mesh position-y={0.008} receiveShadow>
            <boxGeometry args={[0.92, 0.016, 0.92]} />
            <meshStandardMaterial color={l.kind === "pickup" ? "#f7c4a2" : "#b9d8bd"} roughness={0.8} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.018}>
            <ringGeometry args={[0.34, 0.4, 4, 1, Math.PI / 4]} />
            <meshBasicMaterial color={l.kind === "pickup" ? "#ef7a3c" : "#4f9a62"} />
          </mesh>
        </group>
      ))}
      {/* chargers */}
      {engine.robots.map((r) => (
        <group key={r.id} position={[wx(r.home.x), 0, wz(r.home.y) - 0.42]}>
          <mesh position-y={0.2}>
            <boxGeometry args={[0.4, 0.4, 0.1]} />
            <meshStandardMaterial color="#3d423e" />
          </mesh>
          <mesh position={[0, 0.3, 0.052]}>
            <boxGeometry args={[0.16, 0.04, 0.01]} />
            <meshStandardMaterial color="#6fd08a" emissive="#5fc07a" emissiveIntensity={1.5} />
          </mesh>
        </group>
      ))}
      {/* docks + trucks */}
      <mesh position={[0, 0.25, wz(17)]} receiveShadow>
        <boxGeometry args={[W, 0.5, 0.9]} />
        <meshStandardMaterial color="#d8d3ca" />
      </mesh>
      {engine.locations
        .filter((l) => l.kind === "delivery")
        .map((l) => (
          <group key={l.id} position={[wx(l.cell.x), 0, wz(17) + 1.9]}>
            <mesh position={[0, 0.75, -0.2]} castShadow>
              <boxGeometry args={[1.5, 1.3, 3]} />
              <meshStandardMaterial color="#f7f6f2" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.62, 1.75]} castShadow>
              <boxGeometry args={[1.4, 1.05, 0.9]} />
              <meshStandardMaterial color="#e9e7e1" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.85, 2.21]}>
              <boxGeometry args={[1.2, 0.35, 0.02]} />
              <meshStandardMaterial color="#2e3431" roughness={0.2} metalness={0.4} />
            </mesh>
            {[-0.6, 0.6].map((x) =>
              [-1.2, 1.6].map((z) => (
                <mesh key={`${x}${z}`} position={[x, 0.18, z]} rotation-z={Math.PI / 2}>
                  <cylinderGeometry args={[0.18, 0.18, 0.15, 16]} />
                  <meshStandardMaterial color="#222" />
                </mesh>
              )),
            )}
            <Html position={[0, 1.5, -1.6]} center zIndexRange={[5, 0]} pointerEvents="none">
              <div className="select-none rounded-full bg-success px-2 py-0.5 text-[9px] font-bold text-primary-foreground">{l.id}</div>
            </Html>
          </group>
        ))}
      {/* restricted zone */}
      {engine.restricted.map((z, i) => (
        <group key={i} position={[wx(z.x) + (z.w - 1) / 2, 0, wz(z.y) + (z.h - 1) / 2]}>
          <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
            <planeGeometry args={[z.w, z.h]} />
            <meshStandardMaterial map={stripes} roughness={0.9} />
          </mesh>
          {[
            [-z.w / 2, -z.h / 2],
            [z.w / 2, -z.h / 2],
            [-z.w / 2, z.h / 2],
            [z.w / 2, z.h / 2],
          ].map(([x, zz], k) => (
            <mesh key={k} position={[x, 0.3, zz]} castShadow>
              <cylinderGeometry args={[0.05, 0.06, 0.6, 10]} />
              <meshStandardMaterial color="#e2524a" />
            </mesh>
          ))}
          <Html position={[0, 0.5, 0]} center zIndexRange={[5, 0]} pointerEvents="none">
            <div className="select-none whitespace-nowrap rounded-full bg-destructive px-2 py-0.5 text-[8px] font-bold text-primary-foreground">RESTRICTED</div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function RobotActor({ r }: { r: Robot }) {
  const engine = useEngine();
  const selectedId = useSim((s) => s.selectedId);
  const select = useSim((s) => s.select);
  const ref = useRef<THREE.Group>(null);
  const yaw = useRef(r.heading);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const a = driver.alpha;
    const e = a * a * (3 - 2 * a);
    const x = r.px + (r.x - r.px) * e;
    const y = r.py + (r.y - r.py) * e;
    g.position.set(wx(x), 0, wz(y));
    let diff = r.heading - yaw.current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    yaw.current += diff * (1 - Math.exp(-10 * dt));
    g.rotation.y = yaw.current;
  });
  const selected = selectedId === r.id;
  const color = robotColor(engine, r);
  return (
    <group
      ref={ref}
      onClick={(ev) => {
        ev.stopPropagation();
        select(selected ? null : r.id);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <RobotModel statusColor={color} carrying={!!r.packageId} selected={selected} />
      <Html position={[0, r.packageId ? 1.0 : 0.7, 0]} center zIndexRange={[20, 10]} pointerEvents="none">
        <div
          className={`select-none whitespace-nowrap rounded-lg border bg-card/95 px-1.5 py-0.5 text-[9px] font-semibold shadow-card ${selected ? "border-primary" : ""}`}
        >
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {r.id}
            <span className="font-mono text-muted-foreground">{Math.round(r.battery)}%</span>
          </div>
          <div className="mt-0.5 h-[3px] w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-success" style={{ width: `${r.battery}%` }} />
          </div>
          {selected && r.packageId && <div className="mt-0.5 text-[8px] text-primary">📦 {r.packageId}</div>}
          {selected && <div className="text-[8px] font-medium text-muted-foreground">{r.taskId ?? engine.displayStatus(r)}</div>}
        </div>
      </Html>
    </group>
  );
}

function FlowMarkers({ points }: { points: THREE.Vector3[] }) {
  const group = useRef<THREE.Group>(null);
  const curve = useMemo(() => (points.length > 1 ? new THREE.CurvePath<THREE.Vector3>() : null), [points]);
  useMemo(() => {
    if (!curve) return;
    for (let i = 0; i < points.length - 1; i++) curve.add(new THREE.LineCurve3(points[i], points[i + 1]));
  }, [curve, points]);
  const count = Math.min(14, Math.max(2, Math.floor(points.length / 2)));
  useFrame(({ clock }) => {
    if (!curve || !group.current) return;
    const len = curve.getLength();
    group.current.children.forEach((c, i) => {
      const u = ((clock.elapsedTime * 1.2) / len + i / count) % 1;
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      c.position.copy(p);
      c.rotation.set(0, Math.atan2(t.x, t.z), 0);
    });
  });
  if (!curve) return null;
  return (
    <group ref={group}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i}>
          <coneGeometry args={[0.09, 0.22, 3]} />
          <meshBasicMaterial color="#ef7a3c" />
          <group rotation-x={Math.PI / 2} />
        </mesh>
      ))}
    </group>
  );
}

function Paths() {
  const engine = useEngine();
  const selectedId = useSim((s) => s.selectedId);
  const routes = engine.robots
    .filter((r) => r.path.length)
    .map((r) => ({
      r,
      pts: [{ x: r.x, y: r.y }, ...r.path].map((c) => new THREE.Vector3(wx(c.x), 0.03, wz(c.y))),
    }));
  const sel = engine.robot(selectedId);
  const selPts = sel && sel.route.length > 1 ? sel.route.map((c) => new THREE.Vector3(wx(c.x), 0.04, wz(c.y))) : null;
  const waiting = engine.robots.filter((r) => engine.isWaiting(r) && r.path[0]);
  const recent = engine.conflicts.filter((c) => engine.tick - c.tick < 5);
  return (
    <group>
      {routes.map(({ r, pts }) =>
        r.id === selectedId ? null : <Line key={r.id} points={pts} color="#f2a774" lineWidth={1.6} transparent opacity={0.85} />,
      )}
      {selPts && (
        <>
          <Line points={selPts} color="#f6cfb2" lineWidth={5} />
          {sel!.path.length > 0 && (
            <Line points={[{ x: sel!.x, y: sel!.y }, ...sel!.path].map((c) => new THREE.Vector3(wx(c.x), 0.05, wz(c.y)))} color="#ef7a3c" lineWidth={4} />
          )}
          <mesh position={[wx(sel!.route.at(-1)!.x), 0.05, wz(sel!.route.at(-1)!.y)]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.25, 0.42, 32]} />
            <meshBasicMaterial color="#ef7a3c" />
          </mesh>
          <FlowMarkers points={selPts} />
        </>
      )}
      {waiting.map((r) => (
        <group key={r.id}>
          <Line points={[new THREE.Vector3(wx(r.x), 0.06, wz(r.y)), new THREE.Vector3(wx(r.path[0].x), 0.06, wz(r.path[0].y))]} color="#e2524a" lineWidth={4} />
          <mesh position={[wx(r.path[0].x), 0.03, wz(r.path[0].y)]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.38, 24]} />
            <meshBasicMaterial color="#e2524a" transparent opacity={0.28} />
          </mesh>
        </group>
      ))}
      {recent.map((c) => (
        <mesh key={c.id} position={[wx(c.cell.x), 0.035, wz(c.cell.y)]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.36, 0.46, 24]} />
          <meshBasicMaterial color="#e2524a" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

const HOME = new THREE.Vector3(0, 17, 17);
function CameraRig() {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null };
  const { cmd, n } = useCamera();
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  useEffect(() => {
    if (!cmd || !controls) return;
    const t = controls.target.clone();
    if (cmd === "reset") goal.current = { pos: HOME.clone(), target: new THREE.Vector3() };
    if (cmd === "top") goal.current = { pos: new THREE.Vector3(0, 27, 0.01), target: new THREE.Vector3() };
    if (cmd === "zoomIn" || cmd === "zoomOut") {
      const f = cmd === "zoomIn" ? 0.75 : 1.33;
      const pos = camera.position.clone().sub(t).multiplyScalar(f).add(t);
      if (pos.distanceTo(t) > 5 && pos.distanceTo(t) < 50) goal.current = { pos, target: t };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  useFrame((_, delta) => {
    const g = goal.current;
    if (!g || !controls) return;
    const k = 1 - Math.exp(-6 * Math.min(delta, 0.05));
    camera.position.lerp(g.pos, k);
    controls.target.lerp(g.target, k);
    controls.update();
    if (camera.position.distanceTo(g.pos) < 0.05) goal.current = null;
  });
  return null;
}

function ReadySignal() {
  const done = useRef(false);
  const { gl } = useThree();
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    gl.domElement.parentElement?.parentElement?.setAttribute("data-scene-ready", "true");
  });
  return null;
}

export default function WarehouseScene() {
  const engine = useEngine();
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: HOME.toArray(), fov: 38 }} gl={{ antialias: true }}>
      <color attach="background" args={["#f4f0ea"]} />
      <fog attach="fog" args={["#f4f0ea", 40, 75]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[10, 18, 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0005}
      />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer intensity={0.8} color="#ffe2cc" position={[-8, 2, 0]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={0.6} color="#d9f0de" position={[8, 2, 0]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
      <Environment3D />
      <Paths />
      {engine.robots.map((r) => (
        <RobotActor key={r.id} r={r} />
      ))}
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={6} maxDistance={48} maxPolarAngle={Math.PI / 2.15} />
      <CameraRig />
      <ReadySignal />
    </Canvas>
  );
}
