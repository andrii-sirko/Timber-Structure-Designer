import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { Panel, RoofCovering } from '@/types';
import { getAssemblyCurrentMaterial, getAssemblyGhostMaterial, getCladdingMaterial, getFloorMaterial, getInsulationMaterial, getRoofMaterial, getSheathingMaterial, getWireframeMaterial, MM, noRaycast } from './materials';
import { basisQuaternion } from './TimberMember';
import { outlineKey, useKeyedGeometry } from './useKeyedGeometry';
import { panelGeometry, panelGeometryKey } from './panelShapes';

interface PanelMeshProps {
  panel: Panel;
  covering: RoofCovering;
  wireframe: boolean;
  onClick?: (panel: Panel, e: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (panel: Panel, e: ThreeEvent<MouseEvent>) => void;
  /** Pointer drag (partition cladding moves its wall); the panel only listens when all three are set */
  onDragStart?: (panel: Panel, e: ThreeEvent<PointerEvent>) => void;
  onDrag?: (panel: Panel, e: ThreeEvent<PointerEvent>) => void;
  onDragEnd?: (panel: Panel, e: ThreeEvent<PointerEvent>) => void;
  /** CSS cursor shown while hovering a draggable panel, or picked from the hovered point */
  dragCursor?: string | ((panel: Panel, point: THREE.Vector3) => string | undefined);
  /** Assembly guide: fitted in the current step, or still to come (faint, not clickable) */
  assembly?: 'current' | 'ghost';
}

export const PanelMesh = memo(function PanelMesh({ panel, covering, wireframe, onClick, onDoubleClick, onDragStart, onDrag, onDragEnd, dragCursor, assembly }: PanelMeshProps) {
  const dragging = useRef(false);
  const draggable = Boolean(onDragStart && onDrag && onDragEnd);
  const geometry = useKeyedGeometry<THREE.BufferGeometry>(panelGeometryKey(panel, outlineKey), () => panelGeometry(panel));

  const quaternion = useMemo(() => basisQuaternion(panel.direction, panel.up), [panel.direction, panel.up]);
  const position = useMemo<[number, number, number]>(
    () => [panel.anchor.x * MM, panel.anchor.y * MM, panel.anchor.z * MM],
    [panel.anchor],
  );
  const ghost = assembly === 'ghost';
  const material = ghost
    ? getAssemblyGhostMaterial()
    : assembly === 'current'
      ? getAssemblyCurrentMaterial()
      : wireframe
        ? getWireframeMaterial()
        : panel.kind === 'roof'
          ? getRoofMaterial(covering)
          : panel.kind === 'floor'
            ? getFloorMaterial(panel.floorFinish)
            : panel.kind === 'insulation'
              ? getInsulationMaterial(panel.insulation?.material)
              : panel.kind === 'sheathing'
                ? getSheathingMaterial()
                : getCladdingMaterial(panel.cladding, Boolean(panel.boards));

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      quaternion={quaternion}
      castShadow={!ghost}
      receiveShadow={!ghost}
      {...(ghost ? { raycast: noRaycast } : {})}
      userData={{ panelId: panel.id, wallId: panel.wallId }}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(panel, e);
        }
      }}
      onDoubleClick={onDoubleClick ? (e) => onDoubleClick(panel, e) : undefined}
      onPointerOver={typeof dragCursor === 'string' ? (e) => {
        e.stopPropagation();
        document.body.style.cursor = dragCursor;
      } : undefined}
      onPointerOut={dragCursor ? () => {
        if (!dragging.current) document.body.style.cursor = '';
      } : undefined}
      onPointerDown={draggable ? (e) => {
        dragging.current = true;
        onDragStart!(panel, e);
      } : undefined}
      onPointerMove={draggable ? (e) => {
        if (dragging.current) onDrag!(panel, e);
        else if (typeof dragCursor === 'function') document.body.style.cursor = dragCursor(panel, e.point) ?? '';
      } : undefined}
      onPointerUp={draggable ? (e) => {
        dragging.current = false;
        onDragEnd!(panel, e);
      } : undefined}
      onPointerCancel={draggable ? (e) => {
        dragging.current = false;
        onDragEnd!(panel, e);
      } : undefined}
    />
  );
});
