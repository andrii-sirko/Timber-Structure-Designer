import { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { StructureParams, WallId } from '@/types';
import { useProjectStore } from '@/store';
import { applyGrabOffset, wallDragDimension, wallDragDimensionValue, wallDragGrabOffset, wallDragRuler, wallHandles } from '@/engine/wallDrag';
import { Dimension } from './DimensionLines';
import { MM } from './materials';

const BAR_WIDTH = 0.16;
const BAR_HEIGHT = 0.05;

function groundPoint(e: ThreeEvent<PointerEvent>): { x: number; z: number } | null {
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const point = new THREE.Vector3();
  if (!e.ray.intersectPlane(ground, point)) return null;
  return { x: point.x / MM, z: point.z / MM };
}

/**
 * Ground grip bars just outside the four outer walls. Dragging a bar along its wall's normal
 * changes the footprint length (left / right) or width (front / rear) in 50 mm steps.
 */
export function WallResizeHandles({ params }: { params: StructureParams }) {
  const setParam = useProjectStore((s) => s.setParam);
  const measureMode = useProjectStore((s) => s.view.measureMode);
  const [hovered, setHovered] = useState<WallId | null>(null);
  const [dragging, setDragging] = useState<WallId | null>(null);
  const grabOffset = useRef(0);
  const handles = useMemo(() => wallHandles(params), [params]);

  const onDown = useCallback(
    (wall: WallId, e: ThreeEvent<PointerEvent>) => {
      if (measureMode) return;
      e.stopPropagation();
      const point = groundPoint(e);
      if (!point) return;
      (e.target as Element).setPointerCapture(e.pointerId);
      grabOffset.current = wallDragGrabOffset(wall, point, useProjectStore.getState().project.params);
      setDragging(wall);
      useProjectStore.getState().setDragging(true);
    },
    [measureMode],
  );
  const onMove = useCallback(
    (wall: WallId, e: ThreeEvent<PointerEvent>) => {
      if (dragging !== wall) return;
      e.stopPropagation();
      const point = groundPoint(e);
      if (!point) return;
      const current = useProjectStore.getState().project.params;
      const dimension = wallDragDimension(wall);
      const value = wallDragDimensionValue(wall, applyGrabOffset(wall, point, grabOffset.current), current);
      if (value !== current[dimension]) setParam(dimension, value);
    },
    [dragging, setParam],
  );
  const onUp = useCallback(
    (wall: WallId, e: ThreeEvent<PointerEvent>) => {
      if (dragging !== wall) return;
      e.stopPropagation();
      (e.target as Element).releasePointerCapture(e.pointerId);
      setDragging(null);
      useProjectStore.getState().setDragging(false);
      document.body.style.cursor = '';
    },
    [dragging],
  );

  const ruler = useMemo(() => (dragging ? wallDragRuler(dragging, params) : null), [dragging, params]);

  if (measureMode) return null;
  return (
    <group>
      {handles.map((h) => {
        const active = dragging === h.wall;
        const lit = active || hovered === h.wall;
        return (
          <mesh
            key={h.wall}
            position={[h.centre.x * MM, BAR_HEIGHT / 2, h.centre.z * MM]}
            userData={{ wallHandle: h.wall }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(h.wall);
              document.body.style.cursor = h.alongX ? 'ns-resize' : 'ew-resize';
            }}
            onPointerOut={() => {
              setHovered(null);
              if (!dragging) document.body.style.cursor = '';
            }}
            onPointerDown={(e) => onDown(h.wall, e)}
            onPointerMove={(e) => onMove(h.wall, e)}
            onPointerUp={(e) => onUp(h.wall, e)}
            onPointerCancel={(e) => onUp(h.wall, e)}
          >
            <boxGeometry args={h.alongX ? [h.length * MM, BAR_HEIGHT, BAR_WIDTH] : [BAR_WIDTH, BAR_HEIGHT, h.length * MM]} />
            <meshStandardMaterial color={lit ? '#fbbf24' : '#94a3b8'} transparent opacity={lit ? 0.95 : 0.35} depthWrite={false} />
          </mesh>
        );
      })}
      {ruler && (
        <Dimension
          a={[ruler.a.x * MM, 0.03, ruler.a.z * MM]}
          b={[ruler.b.x * MM, 0.03, ruler.b.z * MM]}
          offset={[0, 0.18, 0]}
          label={ruler.label}
          color="#fbbf24"
        />
      )}
    </group>
  );
}
