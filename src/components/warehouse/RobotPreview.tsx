import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useRef } from "react";
import type * as THREE from "three";
import { RobotModel } from "./RobotModel";

function Spin({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += Math.min(d, 0.05) * 0.6;
  });
  return <group ref={ref}>{children}</group>;
}

export default function RobotPreview({ color, carrying }: { color: string; carrying: boolean }) {
  return (
    <Canvas camera={{ position: [1.3, 0.9, 1.5], fov: 32 }} dpr={[1, 2]} onCreated={({ camera }) => camera.lookAt(0, 0.25, 0)}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 2]} intensity={1.4} />
      <Environment resolution={32}>
        <Lightformer intensity={2} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} />
      </Environment>
      <Spin>
        <RobotModel statusColor={color} carrying={carrying} />
      </Spin>
      <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={3} blur={2.5} far={1} />
    </Canvas>
  );
}
