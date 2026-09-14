import { useEffect, useState } from 'react';
import { create } from 'zustand';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import type { Measurement, Vec3 } from '@/types';
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

/** Second point moved along the a→b direction so the measurement reads `length` mm. */
export function resizeMeasurement(m: Measurement, length: number): Vec3 {
  const d = Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y, m.b.z - m.a.z);
  if (d === 0 || !Number.isFinite(length) || length < 0) return m.b;
  const k = length / d;
  return {
    x: Math.round(m.a.x + (m.b.x - m.a.x) * k),
    y: Math.round(m.a.y + (m.b.y - m.a.y) * k),
    z: Math.round(m.a.z + (m.b.z - m.a.z) * k),
  };
}

/** Second point moved on one axis so |Δaxis| reads `delta` mm; the sign of the original offset is kept. */
export function resizeMeasurementAxis(m: Measurement, axis: keyof Vec3, delta: number): Vec3 {
  if (!Number.isFinite(delta) || delta < 0) return m.b;
  const sign = m.b[axis] - m.a[axis] < 0 ? -1 : 1;
  return { ...m.b, [axis]: Math.round(m.a[axis] + sign * delta) };
}

interface EditableProps {
  value: number;
  title: string;
  className?: string;
  onCommit: (v: number) => void;
}

/** Click-to-edit number; commits on Enter or blur, Escape cancels. */
function EditableMm({ value, title, className, onCommit }: EditableProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (!editing) setText(String(value));
  }, [value, editing]);

  const commit = (): void => {
    const v = Number(text);
    if (Number.isFinite(v) && v >= 0 && v !== value) onCommit(v);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        title={title}
        className={`cursor-text rounded px-0.5 hover:bg-pink-400/20 ${className ?? ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        {value}
      </button>
    );
  }
  return (
    <input
      autoFocus
      type="number"
      min={0}
      step={1}
      value={text}
      title={title}
      className="w-16 rounded border border-pink-400/60 bg-slate-950 px-1 text-pink-50 outline-none"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setEditing(false);
      }}
    />
  );
}

export function MeasureTool() {
  const measurements = useProjectStore((s) => s.measurements);
  const updateMeasurement = useProjectStore((s) => s.updateMeasurement);
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
        const setLength = (v: number) => updateMeasurement(m.id, { b: resizeMeasurement(m, v) });
        const setAxis = (axis: keyof Vec3) => (v: number) => updateMeasurement(m.id, { b: resizeMeasurementAxis(m, axis, v) });
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
            <Html position={mid} center zIndexRange={[7, 0]}>
              <div
                className="rounded border border-pink-400/50 bg-slate-900/90 px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-pink-100 shadow"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <EditableMm value={Math.round(d)} title="Click to set the length (mm); the second point moves along the line" onCommit={setLength} />
                {' mm'}
                <span className="ml-1 text-pink-300/70">
                  (Δx <EditableMm value={dx} title="Set Δx (mm)" onCommit={setAxis('x')} /> · Δy{' '}
                  <EditableMm value={dy} title="Set Δy (mm)" onCommit={setAxis('y')} /> · Δz{' '}
                  <EditableMm value={dz} title="Set Δz (mm)" onCommit={setAxis('z')} />)
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
