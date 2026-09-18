import { useEffect, useRef, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { X } from 'lucide-react';
import type { Measurement, Vec3 } from '@/types';
import { useProjectStore } from '@/store';
import { uuid } from '@/engine/geometry';
import { useT } from '@/i18n';
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

const LABEL_GAP_PX = 8;
const _pa = new THREE.Vector3();
const _pb = new THREE.Vector3();

interface LabelProps {
  a: [number, number, number];
  b: [number, number, number];
  children: ReactNode;
}

/** Label at the line's midpoint, pushed off the line perpendicular to it in screen space so it never covers it. */
function MeasurementLabel({ a, b, children }: LabelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

  useFrame(({ camera, size }) => {
    const el = ref.current;
    if (!el) return;
    _pa.set(...a).project(camera);
    _pb.set(...b).project(camera);
    const sx = ((_pb.x - _pa.x) * size.width) / 2;
    const sy = (-(_pb.y - _pa.y) * size.height) / 2;
    const len = Math.hypot(sx, sy);
    // Screen-space normal of the line, flipped to point up; straight up when the line is seen end-on.
    let nx = len < 1 ? 0 : -sy / len;
    let ny = len < 1 ? -1 : sx / len;
    if (ny > 0 || (ny === 0 && nx < 0)) {
      nx = -nx;
      ny = -ny;
    }
    const off = (Math.abs(nx) * el.offsetWidth + Math.abs(ny) * el.offsetHeight) / 2 + LABEL_GAP_PX;
    el.style.transform = `translate(${(nx * off).toFixed(1)}px, ${(ny * off).toFixed(1)}px)`;
  });

  return (
    <Html position={mid} center zIndexRange={[7, 0]}>
      <div
        ref={ref}
        className="rounded border border-pink-400/50 bg-slate-900/90 px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-pink-100 shadow"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </Html>
  );
}

export function MeasureTool() {
  const measurements = useProjectStore((s) => s.measurements);
  const updateMeasurement = useProjectStore((s) => s.updateMeasurement);
  const removeMeasurement = useProjectStore((s) => s.removeMeasurement);
  const measureMode = useProjectStore((s) => s.view.measureMode);
  const pending = useMeasureStore((s) => s.pending);
  const { t } = useT();

  return (
    <group>
      {measurements.map((m) => {
        const a = toM(m.a);
        const b = toM(m.b);
        const d = Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y, m.b.z - m.a.z);
        const dx = Math.abs(m.b.x - m.a.x);
        const dy = Math.abs(m.b.y - m.a.y);
        const dz = Math.abs(m.b.z - m.a.z);
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
            <MeasurementLabel a={a} b={b}>
              <EditableMm value={Math.round(d)} title={t('Click to set the length (mm); the second point moves along the line')} onCommit={setLength} />
              {' mm'}
              <span className="ml-1 text-pink-300/70">
                (Δx <EditableMm value={dx} title={t('Set {axis} (mm)', { axis: 'Δx' })} onCommit={setAxis('x')} /> · Δy{' '}
                <EditableMm value={dy} title={t('Set {axis} (mm)', { axis: 'Δy' })} onCommit={setAxis('y')} /> · Δz{' '}
                <EditableMm value={dz} title={t('Set {axis} (mm)', { axis: 'Δz' })} onCommit={setAxis('z')} />)
              </span>
              <button
                type="button"
                title={t('Remove this measurement')}
                className="ml-1 inline-flex rounded p-0.5 align-middle text-pink-300/70 hover:bg-pink-400/20 hover:text-pink-100"
                onClick={(e) => {
                  e.stopPropagation();
                  removeMeasurement(m.id);
                }}
              >
                <X size={11} />
              </button>
            </MeasurementLabel>
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
