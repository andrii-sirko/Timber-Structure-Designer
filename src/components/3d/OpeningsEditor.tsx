import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Opening } from '@/types';
import { useProjectStore, useWallFrames } from '@/store';
import { CLADDING_THICKNESS, edgeHandleCentre, openingHost, resizableEdges, resizeOpening, type OpeningEdge } from '@/engine/framing';
import { getOpeningEdgeMaterial, getOpeningHandleMaterial, getWallPlaneMaterial, MM } from './materials';
import { basisQuaternion } from './TimberMember';
import { useT } from '@/i18n';

const HANDLE_OFFSET = CLADDING_THICKNESS + 5; // mm outside the outer face
const SNAP = 10;
/** Grip bar thickness across the edge (mm) */
const EDGE_GRIP = 120;

interface DragState {
  id: string;
  offsetU: number;
  offsetV: number;
  plane: THREE.Plane;
  /** Set while an edge is being dragged (resize); undefined while moving the whole opening */
  edge?: OpeningEdge;
}

const EDGE_CURSOR: Record<OpeningEdge, string> = { left: 'ew-resize', right: 'ew-resize', top: 'ns-resize', bottom: 'ns-resize' };

/**
 * Shows the selected wall as a translucent plane and lets the user drag openings along it.
 * Dragging intersects the pointer ray with the wall plane analytically, so the pointer never
 * has to stay over the handle mesh.
 */
export function OpeningsEditor() {
  const { tx } = useT();
  const project = useProjectStore((s) => s.project);
  const selectedWallId = useProjectStore((s) => s.selectedWallId);
  const selectedOpeningId = useProjectStore((s) => s.selectedOpeningId);
  const measureMode = useProjectStore((s) => s.view.measureMode);
  const updateOpening = useProjectStore((s) => s.updateOpening);
  const selectOpening = useProjectStore((s) => s.selectOpening);
  const setDragging = useProjectStore((s) => s.setDragging);
  const frames = useWallFrames();
  const drag = useRef<DragState | null>(null);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const frame = selectedWallId ? (frames[selectedWallId] ?? null) : null;
  const wall = selectedWallId ? openingHost(project, selectedWallId) : null;

  const planeInfo = useMemo(() => {
    if (!frame) return null;
    const height = Math.max(frame.studTopAt(0), frame.studTopAt(frame.length)) + 300;
    const centre = frame.toWorld(frame.length / 2, height / 2, HANDLE_OFFSET);
    const quaternion = basisQuaternion(frame.u, frame.v);
    const origin = new THREE.Vector3(frame.origin.x * MM, frame.origin.y * MM, frame.origin.z * MM);
    const U = new THREE.Vector3(frame.u.x, frame.u.y, frame.u.z);
    const V = new THREE.Vector3(frame.v.x, frame.v.y, frame.v.z);
    const N = new THREE.Vector3(frame.normal.x, frame.normal.y, frame.normal.z);
    const pointOnPlane = origin.clone().addScaledVector(N, HANDLE_OFFSET * MM);
    const mathPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, pointOnPlane);
    return { height, centre, quaternion, origin, U, V, mathPlane };
  }, [frame]);

  if (!frame || !wall || !planeInfo || !selectedWallId) return null;

  const toLocal = (ray: THREE.Ray): { u: number; v: number } | null => {
    if (!ray.intersectPlane(planeInfo.mathPlane, hit)) return null;
    const rel = hit.clone().sub(planeInfo.origin);
    return { u: rel.dot(planeInfo.U) / MM, v: rel.dot(planeInfo.V) / MM };
  };

  const onHandleDown = (o: Opening, e: ThreeEvent<PointerEvent>): void => {
    if (measureMode) return;
    e.stopPropagation();
    const local = toLocal(e.ray);
    if (!local) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { id: o.id, offsetU: local.u - o.x, offsetV: local.v - o.y, plane: planeInfo.mathPlane };
    selectOpening(selectedWallId, o.id);
    setDragging(true);
  };

  const onEdgeDown = (o: Opening, edge: OpeningEdge, e: ThreeEvent<PointerEvent>): void => {
    if (measureMode) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { id: o.id, offsetU: 0, offsetV: 0, plane: planeInfo.mathPlane, edge };
    selectOpening(selectedWallId, o.id);
    setDragging(true);
  };

  const onHandleMove = (e: ThreeEvent<PointerEvent>): void => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const local = toLocal(e.ray);
    if (!local) return;
    if (d.edge) {
      const current = openingHost(useProjectStore.getState().project, selectedWallId)?.openings.find((o) => o.id === d.id);
      if (!current) return;
      const next = resizeOpening(current, d.edge, local.u, local.v, SNAP);
      if (next.x !== current.x || next.y !== current.y || next.width !== current.width || next.height !== current.height) {
        updateOpening(selectedWallId, d.id, next);
      }
      return;
    }
    const x = Math.round((local.u - d.offsetU) / SNAP) * SNAP;
    const y = Math.round((local.v - d.offsetV) / SNAP) * SNAP;
    updateOpening(selectedWallId, d.id, { x, y });
  };

  const onHandleUp = (e: ThreeEvent<PointerEvent>): void => {
    if (!drag.current) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    drag.current = null;
    setDragging(false);
    document.body.style.cursor = '';
  };

  return (
    <group>
      <mesh
        position={[planeInfo.centre.x * MM, planeInfo.centre.y * MM, planeInfo.centre.z * MM]}
        quaternion={planeInfo.quaternion}
        material={getWallPlaneMaterial()}
        onClick={(e) => {
          if (measureMode) return;
          e.stopPropagation();
          selectOpening(selectedWallId, null);
        }}
      >
        <planeGeometry args={[frame.length * MM, planeInfo.height * MM]} />
      </mesh>

      {wall.closed &&
        wall.openings.map((o) => {
          const c = frame.toWorld(o.x + o.width / 2, o.y + o.height / 2, HANDLE_OFFSET / 2);
          const selected = o.id === selectedOpeningId;
          return (
            <group key={o.id}>
              <mesh
                position={[c.x * MM, c.y * MM, c.z * MM]}
                quaternion={planeInfo.quaternion}
                material={getOpeningHandleMaterial(selected)}
                onPointerDown={(e) => onHandleDown(o, e)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  if (!measureMode) document.body.style.cursor = 'grab';
                }}
                onPointerOut={() => {
                  document.body.style.cursor = '';
                }}
              >
                <boxGeometry args={[o.width * MM, o.height * MM, (HANDLE_OFFSET + 30) * MM]} />
              </mesh>
              {selected &&
                resizableEdges(o).map((edge) => {
                  const ec = edgeHandleCentre(o, edge);
                  const p = frame.toWorld(ec.u, ec.v, HANDLE_OFFSET + 20);
                  const horizontal = edge === 'top' || edge === 'bottom';
                  const active = drag.current?.edge === edge && drag.current.id === o.id;
                  return (
                    <mesh
                      key={edge}
                      position={[p.x * MM, p.y * MM, p.z * MM]}
                      quaternion={planeInfo.quaternion}
                      material={getOpeningEdgeMaterial(active)}
                      renderOrder={10}
                      onPointerDown={(e) => onEdgeDown(o, edge, e)}
                      onPointerMove={onHandleMove}
                      onPointerUp={onHandleUp}
                      onPointerCancel={onHandleUp}
                      onPointerOver={(e) => {
                        e.stopPropagation();
                        if (!measureMode) document.body.style.cursor = EDGE_CURSOR[edge];
                      }}
                      onPointerOut={() => {
                        if (!drag.current) document.body.style.cursor = '';
                      }}
                    >
                      <boxGeometry
                        args={
                          horizontal
                            ? [Math.max(o.width - EDGE_GRIP, 100) * MM, EDGE_GRIP * MM, 20 * MM]
                            : [EDGE_GRIP * MM, Math.max(o.height - EDGE_GRIP, 100) * MM, 20 * MM]
                        }
                      />
                    </mesh>
                  );
                })}
              <Html
                position={[c.x * MM, (o.y + o.height) * MM + 0.12, c.z * MM]}
                center
                zIndexRange={[6, 0]}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  className={`rounded px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap shadow ${
                    selected ? 'border border-sky-400/60 bg-sky-950/90 text-sky-100' : 'border border-orange-400/50 bg-slate-900/85 text-orange-100'
                  }`}
                >
                  {tx(o.label ?? o.type)} · x {o.x} · y {o.y} · {o.width}×{o.height}
                </div>
              </Html>
            </group>
          );
        })}
    </group>
  );
}
