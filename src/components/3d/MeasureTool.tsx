import { create } from 'zustand';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import type { Vec3 } from '@/types';
import { useProjectStore } from '@/store';
import { uuid } from '@/engine/geometry';
import { MM } from './materials';

interface MeasureState {
  pending: Vec3 | null;
  addPoint: (p: THREE.Vector3) => void;
  reset: () => void;
}

/** Tiny transient store for the two-click measuring interaction. */
export const useMeasureStore = create<MeasureState>((set, get) => ({
  pending: null,
  addPoint: (p) => {
    const mm: Vec3 = { x: Math.round(p.x / MM), y: Math.round(p.y / MM), z: Math.round(p.z / MM) };
    const pending = get().pending;
    if (!pending) {
      set({ pending: mm });
      return;
    }
    useProjectStore.getState().addMeasurement({ id: uuid(), a: pending, b: mm });
    set({ pending: null });
  },
  reset: () => set({ pending: null }),
}));

const toM = (v: Vec3): [number, number, number] => [v.x * MM, v.y * MM, v.z * MM];

export function MeasureTool() {
  const measurements = useProjectStore((s) => s.measurements);
  const measureMode = useProjectStore((s) => s.view.measureMode);
  const pending = useMeasureStore((s) => s.pending);

  return (
    <group>
      {measurements.map((m) => {
        const a = toM(m.a);
        const b = toM(m.b);
        const d = Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y, m.b.z - m.a.z);
        const dx = Math.abs(m.b.x - m.a.x);
        const dy = Math.abs(m.b.y - m.a.y);
        const dz = Math.abs(m.b.z - m.a.z);
        const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
        return (
          <group key={m.id}>
            <Line points={[a, b]} color="#f472b6" lineWidth={2} />
            <mesh position={a}>
              <sphereGeometry args={[0.02, 12, 12]} />
              <meshBasicMaterial color="#f472b6" />
            </mesh>
            <mesh position={b}>
              <sphereGeometry args={[0.02, 12, 12]} />
              <meshBasicMaterial color="#f472b6" />
            </mesh>
            <Html position={mid} center zIndexRange={[7, 0]} style={{ pointerEvents: 'none' }}>
              <div className="rounded border border-pink-400/50 bg-slate-900/90 px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-pink-100 shadow">
                {Math.round(d)} mm
                <span className="ml-1 text-pink-300/70">
                  (Δx {dx} · Δy {dy} · Δz {dz})
                </span>
              </div>
            </Html>
          </group>
        );
      })}
      {measureMode && pending && (
        <mesh position={toM(pending)}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#fbcfe8" />
        </mesh>
      )}
    </group>
  );
}
