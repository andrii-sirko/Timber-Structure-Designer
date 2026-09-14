import { useMemo } from 'react';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import type { DerivedModel, Partition, StructureParams } from '@/types';
import { useProjectStore } from '@/store';
import { computeRoofLines, sanitizeParams } from '@/engine/framing';
import { canonicalizeParams, canonicalToWorldMap, mapPoint, mapVec } from '@/engine/orientation';
import { partitionEdgeDistances } from '@/engine/postDrag';
import { midPurlinRuler } from '@/engine/purlinDrag';
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
    const { length: L, width: W, overhangs: o, roofDirection: dir } = p;
    // Purlin rows, eave heights and the roof depth are canonical-frame quantities: compute them
    // there and rotate the points into world space.
    const c = canonicalizeParams(p);
    const { length: Lc, width: Wc, overhangs: oc } = c;
    const roof = computeRoofLines(c);
    const m = canonicalToWorldMap(dir, L, W);
    const toW = (x: number, y: number, z: number): V => {
      const q = mapPoint(m, { x, z });
      return [q.x * MM, y * MM, q.z * MM];
    };
    const offW = (x: number, y: number, z: number): V => {
      const q = mapVec(m, { x, y, z });
      return [q.x, q.y, q.z];
    };
    const gap = 0.7;
    const list: DimensionProps[] = [];
    list.push({ a: [0, 0, 0], b: [L * MM, 0, 0], offset: [0, 0, -(o.front * MM + gap)], label: `L ${L} mm` });
    list.push({ a: [0, 0, 0], b: [0, 0, W * MM], offset: [-(o.left * MM + gap), 0, 0], label: `W ${W} mm` });
    // Post spacing chains: high-eave row outside its edge, low-eave row outside the opposite edge.
    // Each row has its own positions (posts can be moved or removed individually).
    const gridRows = model.framing.grid.rows;
    const first = gridRows[0];
    const lastRow = gridRows[gridRows.length - 1];
    const rows: { positions: number[]; axis: 'x' | 'z'; fixed: number; offset: V }[] =
      first.axis === 'x'
        ? [
            { positions: first.positions, axis: 'x', fixed: 0, offset: offW(0, 0, -(oc.front * MM + gap * 0.5)) },
            { positions: lastRow.positions, axis: 'x', fixed: Wc, offset: offW(0, 0, oc.rear * MM + gap * 0.5) },
          ]
        : [
            { positions: first.positions, axis: 'z', fixed: 0, offset: offW(-(oc.left * MM + gap * 0.5), 0, 0) },
            { positions: lastRow.positions, axis: 'z', fixed: Lc, offset: offW(oc.right * MM + gap * 0.5, 0, 0) },
          ];
    for (const row of rows) {
      if (row.positions.length < 2) continue;
      const pt = (pos: number): V => (row.axis === 'x' ? toW(pos, 0, row.fixed) : toW(row.fixed, 0, pos));
      for (let i = 0; i < row.positions.length - 1; i++) {
        list.push({
          a: pt(row.positions[i]),
          b: pt(row.positions[i + 1]),
          offset: row.offset,
          label: `${Math.round(row.positions[i + 1] - row.positions[i])}`,
          color: '#a5b4fc',
        });
      }
    }
    const sideOffset = offW(-(oc.left * MM + gap), 0, 0);
    list.push({ a: toW(0, 0, 0), b: toW(0, p.frontHeight, 0), offset: sideOffset, label: `H1 ${p.frontHeight} mm` });
    list.push({ a: toW(0, 0, Wc), b: toW(0, p.rearHeight, Wc), offset: sideOffset, label: `H2 ${p.rearHeight} mm` });
    const ridge = model.framing.roof.ridgeHeight;
    list.push({
      a: toW(-oc.left, ridge, -oc.front),
      b: toW(Lc + oc.right, ridge, -oc.front),
      offset: [0, 0.35, 0],
      label: `Roof ${Lc + oc.left + oc.right} mm`,
      color: '#fcd34d',
    });
    const zMid = (Wc + oc.rear - oc.front) / 2;
    const pitchPos = toW(Lc + oc.right + 0.3 / MM, roof.topAt(zMid) + 0.15 / MM, zMid);
    return { list, pitchPos, roofDepth: Wc + oc.front + oc.rear, pitch: roof.pitchDeg };
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

/**
 * Ruler shown while an intermediate purlin is dragged across the slope: distance (axis to axis)
 * to the neighbouring purlin rows, drawn at purlin height across the middle of the row.
 */
export function MidPurlinDragDistances({ index, model, params }: { index: number; model: DerivedModel; params: StructureParams }) {
  const dims = useMemo(
    () =>
      midPurlinRuler(index, model.framing.grid, params).map((seg) => ({
        a: [seg.a.x * MM, seg.a.y * MM, seg.a.z * MM] as V,
        b: [seg.b.x * MM, seg.b.y * MM, seg.b.z * MM] as V,
        label: seg.label,
      })),
    [index, model.framing.grid, params],
  );

  return (
    <group>
      {dims.map((dim) => (
        <Dimension key={dim.label} {...dim} offset={[0, 0.18, 0]} color="#fbbf24" />
      ))}
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
