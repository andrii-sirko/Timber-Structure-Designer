import { useMemo } from 'react';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import type { DerivedModel, Partition, StructureParams } from '@/types';
import { useProjectStore } from '@/store';
import { computeRoofLines, sanitizeParams } from '@/engine/framing';
import { partitionEdgeDistances } from '@/engine/postDrag';
import { MM } from './materials';

type V = [number, number, number];

interface DimensionProps {
  a: V;
  b: V;
  /** Offset (m) from the measured points to the dimension line */
  offset: V;
  label: string;
  color?: string;
}

const norm = (v: V): V => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const addV = (p: V, q: V, s = 1): V => [p[0] + q[0] * s, p[1] + q[1] * s, p[2] + q[2] * s];

export function Dimension({ a, b, offset, label, color = '#7dd3fc' }: DimensionProps) {
  const A = addV(a, offset);
  const B = addV(b, offset);
  const dir = norm(offset);
  const mid: V = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
  return (
    <group>
      <Line points={[A, B]} color={color} lineWidth={1.5} />
      <Line points={[a, addV(A, dir, 0.08)]} color={color} lineWidth={0.8} transparent opacity={0.6} />
      <Line points={[b, addV(B, dir, 0.08)]} color={color} lineWidth={0.8} transparent opacity={0.6} />
      <Line points={[addV(A, dir, -0.05), addV(A, dir, 0.05)]} color={color} lineWidth={1.5} />
      <Line points={[addV(B, dir, -0.05), addV(B, dir, 0.05)]} color={color} lineWidth={1.5} />
      <Html position={mid} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="rounded border border-sky-500/40 bg-slate-900/85 px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-sky-100 shadow">
          {label}
        </div>
      </Html>
    </group>
  );
}

export function DimensionLines({ model }: { model: DerivedModel }) {
  const project = useProjectStore((s) => s.project);
  const dims = useMemo(() => {
    const p = sanitizeParams(project.params);
    const roof = computeRoofLines(p);
    const { length: L, width: W, overhangs: o } = p;
    const gap = 0.7;
    const list: DimensionProps[] = [];
    list.push({ a: [0, 0, 0], b: [L * MM, 0, 0], offset: [0, 0, -(o.front * MM + gap)], label: `L ${L} mm` });
    // Post spacing chains: front row outside the front edge, rear row outside the rear edge.
    // Each row has its own positions (posts can be moved or removed individually).
    const rows: { xs: number[]; z: number; offsetZ: number }[] = [
      { xs: model.framing.grid.frontXPositions, z: 0, offsetZ: -(o.front * MM + gap * 0.5) },
      { xs: model.framing.grid.rearXPositions, z: W * MM, offsetZ: o.rear * MM + gap * 0.5 },
    ];
    for (const row of rows) {
      if (row.xs.length < 2) continue;
      for (let i = 0; i < row.xs.length - 1; i++) {
        list.push({
          a: [row.xs[i] * MM, 0, row.z],
          b: [row.xs[i + 1] * MM, 0, row.z],
          offset: [0, 0, row.offsetZ],
          label: `${Math.round(row.xs[i + 1] - row.xs[i])}`,
          color: '#a5b4fc',
        });
      }
    }
    list.push({ a: [0, 0, 0], b: [0, 0, W * MM], offset: [-(o.left * MM + gap), 0, 0], label: `W ${W} mm` });
    list.push({ a: [0, 0, 0], b: [0, p.frontHeight * MM, 0], offset: [-(o.left * MM + gap), 0, 0], label: `H1 ${p.frontHeight} mm` });
    list.push({ a: [0, 0, W * MM], b: [0, p.rearHeight * MM, W * MM], offset: [-(o.left * MM + gap), 0, 0], label: `H2 ${p.rearHeight} mm` });
    const ridge = model.framing.roof.ridgeHeight * MM;
    list.push({
      a: [-o.left * MM, ridge, -o.front * MM],
      b: [(L + o.right) * MM, ridge, -o.front * MM],
      offset: [0, 0.35, 0],
      label: `Roof ${L + o.left + o.right} mm`,
      color: '#fcd34d',
    });
    const zMid = (W + o.rear - o.front) / 2;
    const pitchPos: V = [(L + o.right) * MM + 0.3, roof.topAt(zMid) * MM + 0.15, zMid * MM];
    return { list, pitchPos, roofDepth: W + o.front + o.rear, pitch: roof.pitchDeg };
  }, [project, model]);

  return (
    <group>
      {dims.list.map((d, i) => (
        <Dimension key={i} {...d} />
      ))}
      <Html position={new THREE.Vector3(...dims.pitchPos)} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="rounded border border-amber-400/40 bg-slate-900/85 px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-amber-100 shadow">
          α = {dims.pitch.toFixed(1)}° · {dims.roofDepth} mm
        </div>
      </Html>
    </group>
  );
}

export function PartitionDragDistances({ partition, params }: { partition: Partition; params: StructureParams }) {
  const dims = useMemo(() => {
    const thickness = params.timber.stud.height;
    const distances = partitionEdgeDistances(partition, params, thickness);
    const uMid = ((partition.start + partition.end) / 2) * MM;
    const firstEdge = (partition.offset - thickness / 2) * MM;
    const secondEdge = (partition.offset + thickness / 2) * MM;
    const y = 0.03;
    if (partition.axis === 'x') {
      return [
        { a: [uMid, y, 0] as V, b: [uMid, y, firstEdge] as V, label: `front ${Math.round(distances.first)} mm` },
        { a: [uMid, y, secondEdge] as V, b: [uMid, y, params.width * MM] as V, label: `rear ${Math.round(distances.second)} mm` },
      ];
    }
    return [
      { a: [0, y, uMid] as V, b: [firstEdge, y, uMid] as V, label: `left ${Math.round(distances.first)} mm` },
      { a: [secondEdge, y, uMid] as V, b: [params.length * MM, y, uMid] as V, label: `right ${Math.round(distances.second)} mm` },
    ];
  }, [params, partition]);

  return (
    <group>
      {dims.map((dim) => (
        <Dimension key={dim.label} {...dim} offset={[0, 0.18, 0]} color="#fbbf24" />
      ))}
    </group>
  );
}
