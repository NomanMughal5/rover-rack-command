import { RoundedBox } from "@react-three/drei";

export const STATUS_COLORS: Record<string, string> = {
  idle: "#9aa3a0",
  moving: "#5fb07a",
  carrying: "#f08a4b",
  waiting: "#e2524a",
  loading: "#7b6fd0",
};

/** Industrial AMR: low chassis, dark lift deck, wheels, lidar, front LED bar. Faces +Z. */
export function RobotModel({
  statusColor = STATUS_COLORS.idle,
  carrying = false,
  selected = false,
}: {
  statusColor?: string;
  carrying?: boolean;
  selected?: boolean;
}) {
  return (
    <group>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.012}>
          <ringGeometry args={[0.5, 0.6, 40]} />
          <meshBasicMaterial color="#f08a4b" transparent opacity={0.9} />
        </mesh>
      )}
      {/* chassis */}
      <RoundedBox args={[0.62, 0.18, 0.74]} radius={0.06} smoothness={3} position-y={0.15} castShadow>
        <meshStandardMaterial color="#d9ddd2" roughness={0.45} metalness={0.15} />
      </RoundedBox>
      {/* side skirt */}
      <mesh position-y={0.075}>
        <boxGeometry args={[0.64, 0.05, 0.7]} />
        <meshStandardMaterial color="#3b3f3c" roughness={0.7} />
      </mesh>
      {/* lift deck */}
      <RoundedBox args={[0.54, 0.035, 0.62]} radius={0.015} smoothness={2} position-y={0.255}>
        <meshStandardMaterial color="#454a46" roughness={0.6} metalness={0.3} />
      </RoundedBox>
      {/* wheels */}
      {[
        [-0.3, 0.24],
        [0.3, 0.24],
        [-0.3, -0.24],
        [0.3, -0.24],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.07, z]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 16]} />
          <meshStandardMaterial color="#1f2220" roughness={0.9} />
        </mesh>
      ))}
      {/* front face */}
      <mesh position={[0, 0.15, 0.372]}>
        <boxGeometry args={[0.5, 0.11, 0.01]} />
        <meshStandardMaterial color="#2a2d2b" roughness={0.4} />
      </mesh>
      {/* LED bar (status) */}
      <mesh position={[0, 0.105, 0.38]}>
        <boxGeometry args={[0.36, 0.022, 0.01]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={1.6} />
      </mesh>
      {/* headlight "eyes" */}
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, 0.17, 0.379]}>
          <boxGeometry args={[0.08, 0.03, 0.01]} />
          <meshStandardMaterial color="#ffcf9a" emissive="#ffb066" emissiveIntensity={1.4} />
        </mesh>
      ))}
      {/* lidar puck */}
      <mesh position={[0, 0.3, 0.26]}>
        <cylinderGeometry args={[0.045, 0.05, 0.05, 16]} />
        <meshStandardMaterial color="#1d201e" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* status beacon */}
      <mesh position={[0.22, 0.31, -0.27]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2} />
      </mesh>
      {/* rear direction chevron on deck */}
      <mesh position={[0, 0.275, 0.12]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.07, 3]} />
        <meshBasicMaterial color="#f08a4b" />
      </mesh>
      {carrying && <PackageBox />}
    </group>
  );
}

export function PackageBox() {
  return (
    <group position-y={0.44}>
      <mesh castShadow>
        <boxGeometry args={[0.44, 0.34, 0.44]} />
        <meshStandardMaterial color="#c99a62" roughness={0.85} />
      </mesh>
      <mesh position-y={0.171}>
        <boxGeometry args={[0.08, 0.002, 0.445]} />
        <meshStandardMaterial color="#e8d4ad" roughness={0.6} />
      </mesh>
      <mesh position={[0.1, 0.02, 0.221]}>
        <planeGeometry args={[0.14, 0.09]} />
        <meshStandardMaterial color="#f5f1e8" />
      </mesh>
    </group>
  );
}
