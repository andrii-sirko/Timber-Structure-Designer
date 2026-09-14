import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import type { GroundPoint, PavedArea, PavedAreaSummary, PavingPattern } from '@/types';
import { useProjectStore } from '@/store';
import { edgeMidpoint, offsetEdge } from '@/engine/paving';
import { MM } from './materials';
import { Dimension } from './DimensionLines';
import { useMeasureStore } from './MeasureTool';
import { DRAG_SNAP } from '@/engine/postDrag';

const SNAP = DRAG_SNAP;
const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
/** Slab top sits just above the ground grid so it never z-fights with it. */
const TOP_Y = 0.006;
/** Invisible grab radius (m) around corner / edge handles */
const HIT_RADIUS = 0.18;

// ─────────────────────────────────────────────────────────────────────────────
// Procedural paver texture – one repeating tile per pattern / stone module
// ─────────────────────────────────────────────────────────────────────────────

interface PaverTile {
  texture: THREE.CanvasTexture;
  /** Tile size in metres (world units) along X and Z */
  sizeX: number;
  sizeZ: number;
}

function stoneShade(seed: number): string {
  // deterministic light/dark variation per stone
  const t = Math.abs(Math.sin(seed * 12.9898 + 78.233) * 43758.5453) % 1;
  const v = Math.round(200 + (t - 0.5) * 50);
  return `rgb(${v},${v},${v})`;
}

function drawStone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, joint: number, seed: number): void {
  ctx.fillStyle = stoneShade(seed);
  ctx.fillRect(x + joint / 2, y + joint / 2, w - joint, h - joint);
}

/** Draws a tileable canvas for the given pattern. Stone dimensions are in mm, the canvas maps 1:1 to `px` per mm. */
function buildPaverTile(pattern: PavingPattern, stoneLength: number, stoneWidth: number, jointWidth: number): PaverTile {
  const L = stoneLength + jointWidth;
  const W = stoneWidth + jointWidth;
  let tileMmX: number;
  let tileMmZ: number;
  // herringbone is drawn on a square cell grid of `W` with bricks `n` cells long
  const n = Math.max(1, Math.round(L / W));
  if (pattern === 'stack') {
    tileMmX = L;
    tileMmZ = W;
  } else if (pattern === 'stretcher') {
    tileMmX = L;
    tileMmZ = 2 * W;
  } else {
    tileMmX = 2 * n * W;
    tileMmZ = 2 * n * W;
  }
  const maxPx = 1024;
  const px = Math.min(4, maxPx / Math.max(tileMmX, tileMmZ));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(8, Math.round(tileMmX * px));
  canvas.height = Math.max(8, Math.round(tileMmZ * px));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#4a4a4a'; // joints (sand)
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const j = Math.max(1, jointWidth * px);
    if (pattern === 'stack') {
      drawStone(ctx, 0, 0, canvas.width, canvas.height, j, 1);
    } else if (pattern === 'stretcher') {
      const lw = L * px;
      const wh = W * px;
      drawStone(ctx, 0, 0, lw, wh, j, 1);
      // second course offset by half a stone – drawn twice so the tile wraps
      drawStone(ctx, -lw / 2, wh, lw, wh, j, 2);
      drawStone(ctx, lw / 2, wh, lw, wh, j, 3);
    } else {
      const cell = W * px;
      const cells = 2 * n;
      // draw a margin of bricks around the tile so wrapped edges are seamless
      for (let i = -cells; i < 2 * cells; i += 1) {
        for (let k = -cells; k < 2 * cells; k += 1) {
          const d = (((i - k) % cells) + cells) % cells;
          if (d === 0) drawStone(ctx, i * cell, k * cell, n * cell, cell, j, i * 31 + k * 17);
          else if (d === cells - 1) drawStone(ctx, i * cell, (k - n + 1) * cell, cell, n * cell, j, i * 13 + k * 29);
        }
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, sizeX: tileMmX * MM, sizeZ: tileMmZ * MM };
}

// ─────────────────────────────────────────────────────────────────────────────

interface PavedAreaMeshProps {
  area: PavedArea;
  summary?: PavedAreaSummary;
  selected: boolean;
  selectedPointIndex: number | null;
}

const toWorld = (p: GroundPoint): [number, number, number] => [p.x * MM, TOP_Y, p.z * MM];

/** A paved floor polygon: textured slab, and – when selected – draggable corner handles and edge "add corner" handles. */
export const PavedAreaMesh = memo(function PavedAreaMesh({ area, summary, selected, selectedPointIndex }: PavedAreaMeshProps) {
  const measureMode = useProjectStore((s) => s.view.measureMode);
  const selectPavedArea = useProjectStore((s) => s.selectPavedArea);
  const movePavedPoint = useProjectStore((s) => s.movePavedPoint);
  const insertPavedPoint = useProjectStore((s) => s.insertPavedPoint);
  const updatePavedArea = useProjectStore((s) => s.updatePavedArea);
  const translatePavedArea = useProjectStore((s) => s.translatePavedArea);
  const setDragging = useProjectStore((s) => s.setDragging);
  const addPoint = useMeasureStore((s) => s.addPoint);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const drag = useRef<
    | { kind: 'point'; index: number }
    | { kind: 'area'; lastX: number; lastZ: number }
    | { kind: 'edge'; index: number; startX: number; startZ: number; startPoints: GroundPoint[] }
    | null
  >(null);

  const tile = useMemo(() => buildPaverTile(area.pattern, area.stoneLength, area.stoneWidth, area.jointWidth), [area.pattern, area.stoneLength, area.stoneWidth, area.jointWidth]);
  useEffect(() => () => tile.texture.dispose(), [tile]);

  const geometry = useMemo(() => {
    if (area.points.length < 3) return null;
    // shape lies in the XY plane; the mesh is rotated -90° about X so shape Y → world -Z
    const shape = new THREE.Shape(area.points.map((p) => new THREE.Vector2(p.x * MM, -p.z * MM)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: area.stoneThickness * MM, bevelEnabled: false, steps: 1 });
    // ShapeGeometry UVs equal the shape coordinates (metres) → repeat = 1 / tile size
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) / tile.sizeX, uv.getY(i) / tile.sizeZ);
    uv.needsUpdate = true;
    return geo;
  }, [area.points, area.stoneThickness, tile.sizeX, tile.sizeZ]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({ map: tile.texture, color: area.color, roughness: 0.95, metalness: 0 }), [tile, area.color]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.emissive.set(selected ? '#0ea5e9' : '#000000');
    material.emissiveIntensity = selected ? 0.08 : 0;
  }, [material, selected]);

  const outline = useMemo(() => {
    const pts = area.points.map((p) => [p.x * MM, TOP_Y + 0.002, p.z * MM] as [number, number, number]);
    return pts.length ? [...pts, pts[0]] : pts;
  }, [area.points]);

  const groundPoint = (ray: THREE.Ray): THREE.Vector3 | null => (ray.intersectPlane(GROUND, hit) ? hit : null);
  const snap = (v: number): number => Math.round(v / SNAP) * SNAP;

  const beginDrag = (e: ThreeEvent<PointerEvent>, state: NonNullable<typeof drag.current>): void => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = state;
    setDragging(true);
  };
  const onMove = (e: ThreeEvent<PointerEvent>): void => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const p = groundPoint(e.ray);
    if (!p) return;
    if (d.kind === 'point') {
      movePavedPoint(area.id, d.index, { x: snap(p.x / MM), z: snap(p.z / MM) });
    } else if (d.kind === 'edge') {
      // whole side follows the pointer perpendicular to itself; computed from the drag-start
      // snapshot so repeated snapping never drifts
      updatePavedArea(area.id, { points: offsetEdge(d.startPoints, d.index, p.x / MM - d.startX, p.z / MM - d.startZ, SNAP) });
    } else {
      const x = snap(p.x / MM);
      const z = snap(p.z / MM);
      if (x !== d.lastX || z !== d.lastZ) {
        translatePavedArea(area.id, x - d.lastX, z - d.lastZ);
        d.lastX = x;
        d.lastZ = z;
      }
    }
  };
  const onUp = (e: ThreeEvent<PointerEvent>): void => {
    if (!drag.current) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    drag.current = null;
    setDragging(false);
  };

  // R3F routes captured pointer events only to the capturing object (no bubbling to ancestors),
  // so every draggable mesh carries the move / up handlers itself.
  const dragHandlers = { onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp };

  const onSlabDown = (e: ThreeEvent<PointerEvent>): void => {
    if (measureMode) return;
    const p = groundPoint(e.ray);
    if (!p) return;
    selectPavedArea(area.id, null);
    beginDrag(e, { kind: 'area', lastX: snap(p.x / MM), lastZ: snap(p.z / MM) });
  };
  const onCornerDown = (index: number, e: ThreeEvent<PointerEvent>): void => {
    if (measureMode) return;
    selectPavedArea(area.id, index);
    beginDrag(e, { kind: 'point', index });
  };
  const onEdgeDown = (edgeIndex: number, e: ThreeEvent<PointerEvent>): void => {
    if (measureMode) return;
    if (e.nativeEvent.altKey) {
      // Alt-drag: split the side and drag the new corner
      const index = insertPavedPoint(area.id, edgeIndex);
      beginDrag(e, { kind: 'point', index });
      return;
    }
    const p = groundPoint(e.ray);
    if (!p) return;
    selectPavedArea(area.id, null);
    beginDrag(e, { kind: 'edge', index: edgeIndex, startX: p.x / MM, startZ: p.z / MM, startPoints: area.points });
  };

  const outlineColor = summary?.selfIntersecting ? '#f87171' : selected ? '#38bdf8' : '#94a3b8';
  const labelPos = useMemo(() => {
    const b = summary?.bounds;
    if (!b) return [0, 0, 0] as [number, number, number];
    return [((b.minX + b.maxX) / 2) * MM, TOP_Y + 0.3, ((b.minZ + b.maxZ) / 2) * MM] as [number, number, number];
  }, [summary]);
  // Overall bounding-box dimensions shown while the floor is selected: X extent along the
  // near (min-Z) edge, Z extent along the left (min-X) edge, both offset outside the outline.
  const overallDims = useMemo(() => {
    const b = summary?.bounds;
    if (!b) return [];
    const y = TOP_Y + 0.01;
    const gap = 0.45;
    return [
      {
        a: [b.minX * MM, y, b.minZ * MM] as [number, number, number],
        b: [b.maxX * MM, y, b.minZ * MM] as [number, number, number],
        offset: [0, 0, -gap] as [number, number, number],
        label: `${Math.round(b.maxX - b.minX)} mm`,
      },
      {
        a: [b.minX * MM, y, b.minZ * MM] as [number, number, number],
        b: [b.minX * MM, y, b.maxZ * MM] as [number, number, number],
        offset: [-gap, 0, 0] as [number, number, number],
        label: `${Math.round(b.maxZ - b.minZ)} mm`,
      },
    ];
  }, [summary]);

  return (
    <group>
      {geometry && (
        <mesh
          geometry={geometry}
          material={material}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, TOP_Y - area.stoneThickness * MM, 0]}
          receiveShadow
          onPointerDown={onSlabDown}
          {...dragHandlers}
          onClick={(e) => {
            if (measureMode) {
              e.stopPropagation();
              addPoint(e.point);
            }
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (!measureMode) document.body.style.cursor = 'grab';
          }}
          onPointerOut={() => {
            document.body.style.cursor = '';
          }}
        />
      )}
      <Line points={outline} color={outlineColor} lineWidth={selected ? 2 : 1} transparent opacity={selected ? 1 : 0.7} />
      {selected && !measureMode &&
        area.points.map((p, i) => (
          <group key={`c${i}`} position={toWorld(p)} onPointerDown={(e) => onCornerDown(i, e)} {...dragHandlers} onPointerOver={() => { document.body.style.cursor = 'move'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
            <mesh>
              <sphereGeometry args={[0.08, 16, 12]} />
              <meshBasicMaterial color={selectedPointIndex === i ? '#f59e0b' : '#38bdf8'} depthTest={false} />
            </mesh>
            {/* larger invisible hit target so the corner is easy to grab */}
            <mesh>
              <sphereGeometry args={[HIT_RADIUS, 8, 6]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        ))}
      {selected && !measureMode &&
        area.points.map((_, i) => (
          <group key={`e${i}`} position={toWorld(edgeMidpoint(area.points, i))} onPointerDown={(e) => onEdgeDown(i, e)} {...dragHandlers} onPointerOver={(e) => { document.body.style.cursor = e.nativeEvent.altKey ? 'copy' : 'move'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
            <mesh>
              <boxGeometry args={[0.09, 0.09, 0.09]} />
              <meshBasicMaterial color="#a3e635" depthTest={false} transparent opacity={0.85} />
            </mesh>
            <mesh>
              <sphereGeometry args={[HIT_RADIUS, 8, 6]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        ))}
      {selected && overallDims.map((d) => <Dimension key={d.label + d.offset.join()} {...d} color="#38bdf8" />)}
      {selected && summary && (
        <Html position={labelPos} center zIndexRange={[7, 0]} style={{ pointerEvents: 'none' }}>
          <div className="rounded border border-sky-400/60 bg-slate-900/90 px-2 py-1 text-[11px] whitespace-nowrap text-slate-200 shadow">
            <div className="font-semibold">{area.label}</div>
            <div className="font-mono text-slate-300">
              {summary.areaM2.toFixed(2)} m² · {area.points.length} corners · ≈ {summary.stoneCount} stones
            </div>
          </div>
        </Html>
      )}
    </group>
  );
});
