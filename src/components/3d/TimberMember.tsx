import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Edges, Html } from '@react-three/drei';
import { Trash2 } from 'lucide-react';
import type { ThreeEvent } from '@react-three/fiber';
import type { HighlightMode, Member, Vec3 } from '@/types';
import { canDragMember, canMovePost } from '@/engine/postDrag';
import { useT } from '@/i18n';
import { useProjectStore } from '@/store';
import {
  getAssemblyCurrentMaterial,
  getAssemblyGhostMaterial,
  getHoverMaterial,
  getInspectedMaterial,
  getNeighbourMaterial,
  getSelectedMaterial,
  getWireframeMaterial,
  getWoodMaterial,
  MM,
  noRaycast,
} from './materials';

/** Quaternion that maps local X→direction, Y→up, Z→direction×up. */
export function basisQuaternion(direction: Vec3, up: Vec3): THREE.Quaternion {
  const d = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
  const u = new THREE.Vector3(up.x, up.y, up.z).normalize();
  const n = new THREE.Vector3().crossVectors(d, u).normalize();
  const m = new THREE.Matrix4().makeBasis(d, u, n);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

export function useMemberGeometry(member: Member): THREE.ExtrudeGeometry {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(member.profile.map((p) => new THREE.Vector2(p.u * MM, p.v * MM)));
    const depth = member.section.width * MM;
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
    geo.translate(0, 0, -depth / 2);
    return geo;
  }, [member.profile, member.section.width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

interface TimberMemberProps {
  member: Member;
  highlight: HighlightMode;
  selected: boolean;
  /** This member's distances to its neighbours are on screen */
  inspected?: boolean;
  /** Measured against the inspected member */
  neighbour?: boolean;
  /** Neighbour row currently focused in the list */
  focused?: boolean;
  onHover: (id: string | null) => void;
  onClick?: (member: Member, e: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (member: Member, e: ThreeEvent<MouseEvent>) => void;
  onPostDragStart?: (member: Member, e: ThreeEvent<PointerEvent>) => void;
  onPostDrag?: (member: Member, e: ThreeEvent<PointerEvent>) => void;
  onPostDragEnd?: (member: Member, e: ThreeEvent<PointerEvent>) => void;
  onRemovePost?: (id: string) => void;
  /** CSS cursor shown while hovering a draggable member (partition move / resize) */
  dragCursor?: string;
  /** Assembly guide: fitted in the current step, or still to come (faint, not clickable) */
  assembly?: 'current' | 'ghost';
}

export const TimberMember = memo(function TimberMember({
  member,
  highlight,
  selected,
  inspected = false,
  neighbour = false,
  focused = false,
  onHover,
  onClick,
  onDoubleClick,
  onPostDragStart,
  onPostDrag,
  onPostDragEnd,
  onRemovePost,
  dragCursor,
  assembly,
}: TimberMemberProps) {
  // Subscribed here rather than passed in, so a hover re-renders the two members involved, not the whole scene.
  const hovered = useProjectStore((s) => s.hoveredMemberId === member.id);
  const postDragging = useRef(false);
  const { t } = useT();
  const geometry = useMemberGeometry(member);
  const quaternion = useMemo(() => basisQuaternion(member.direction, member.up), [member.direction, member.up]);
  const position = useMemo<[number, number, number]>(
    () => [member.start.x * MM, member.start.y * MM, member.start.z * MM],
    [member.start],
  );

  const ghost = assembly === 'ghost';
  const stateMaterial = ghost
    ? getAssemblyGhostMaterial()
    : inspected
      ? getInspectedMaterial()
      : hovered
        ? getHoverMaterial()
        : neighbour
          ? getNeighbourMaterial()
          : selected
            ? getSelectedMaterial()
            : assembly === 'current'
              ? getAssemblyCurrentMaterial()
              : null;
  const material = stateMaterial ?? (highlight === 'wireframe' ? getWireframeMaterial() : getWoodMaterial(member.category));
  const isPost = member.category === 'post';
  const canDrag = canDragMember(member);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={position}
      quaternion={quaternion}
      castShadow={!ghost}
      receiveShadow={!ghost}
      {...(ghost ? { raycast: noRaycast } : {})}
      userData={{ memberId: member.id }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(member.id);
        if (dragCursor) document.body.style.cursor = dragCursor;
      }}
      onPointerOut={() => {
        onHover(null);
        if (dragCursor && !postDragging.current) document.body.style.cursor = '';
      }}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(member, e);
        }
      }}
      onDoubleClick={onDoubleClick ? (e) => onDoubleClick(member, e) : undefined}
      onPointerDown={canDrag && onPostDragStart ? (e) => {
        postDragging.current = true;
        onPostDragStart(member, e);
      } : undefined}
      onPointerMove={canDrag && onPostDrag ? (e) => {
        if (canMovePost(postDragging.current)) onPostDrag(member, e);
      } : undefined}
      onPointerUp={canDrag && onPostDragEnd ? (e) => {
        postDragging.current = false;
        onPostDragEnd(member, e);
      } : undefined}
      onPointerCancel={canDrag && onPostDragEnd ? (e) => {
        postDragging.current = false;
        onPostDragEnd(member, e);
      } : undefined}
    >
      {ghost && <Edges color="#64748b" threshold={20} lineWidth={1} />}
      {assembly === 'current' && !inspected && !focused && !hovered && !selected && <Edges color="#1a2e05" threshold={20} lineWidth={1.5} />}
      {highlight === 'edges' && !assembly && !inspected && !focused && <Edges color="#3b2a17" threshold={20} lineWidth={1} />}
      {inspected && <Edges color="#cffafe" threshold={20} lineWidth={2} />}
      {focused && !inspected && <Edges color="#fde68a" threshold={20} lineWidth={2} />}
      {(hovered || selected) && !ghost && !inspected && !focused && (highlight !== 'edges' || assembly === 'current') && (
        <Edges color={selected ? '#e0f2fe' : '#fff7ed'} threshold={20} />
      )}
      {isPost && selected && onRemovePost && (
        <Html
          position={[member.length * MM + 0.16, 0, 0]}
          center
          zIndexRange={[9, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <button
            type="button"
            className="rounded border border-rose-400/60 bg-rose-950/95 p-1 text-rose-100 shadow-lg hover:bg-rose-900"
            title={t('Remove post')}
            aria-label={t('Remove post')}
            onClick={(e) => {
              e.stopPropagation();
              onRemovePost(member.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </Html>
      )}
    </mesh>
  );
});
