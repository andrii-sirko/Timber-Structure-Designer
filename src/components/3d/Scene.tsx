import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { Grid, Html, OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import type { DerivedModel, Member, Panel, WallId } from '@/types';
import { useProjectStore, useWallFrames } from '@/store';
import { useNeighbours } from '@/store/useNeighbours';
import { canDeleteSelectedPartition } from '@/engine/wallKeyboard';
import { CameraRig, modelBounds } from './CameraRig';
import { DimensionLines, MidPurlinDragDistances, PartitionDragDistances, PartitionResizeRuler, PostDragDistances, WallExtentRuler } from './DimensionLines';
import { midPurlinIndex, snapDrag } from '@/engine/postDrag';
import { partitionDragCursor, partitionDragMode, partitionDragModeAt, partitionDragPatch, partitionGrabOffset, type PartitionDrag } from '@/engine/partitionDrag';
import { wallExtentCursor, wallExtentDragModeAt, wallExtentDragPatch, wallExtentGrabOffset, wallExtentMemberMode, type WallExtentDrag, type WallExtentDragMode } from '@/engine/wallExtentDrag';
import { worldPointToCanonical } from '@/engine/orientation';
import { postKeyAxis } from '@/engine/postOverrides';
import { freePostIdOf } from '@/engine/freePosts';
import { openObjectSettings } from './openObjectSettings';
import { useUiStore } from '@/store/uiStore';
import { MM } from './materials';
import { MeasureTool, useMeasureStore } from './MeasureTool';
import { NeighbourDistances } from './NeighbourDistances';
import { OpeningsEditor } from './OpeningsEditor';
import { OpeningFixtures } from './OpeningFixtures';
import { AnchorFixtures } from './AnchorFixtures';
import { PanelMesh } from './PanelMesh';
import { TimberMember } from './TimberMember';
import { VehicleMesh } from './VehicleMesh';
import { PavedAreaMesh } from './PavedAreaMesh';

function HoverTooltip({ members }: { members: Member[] }) {
  const hoveredId = useProjectStore((s) => s.hoveredMemberId);
  const isDragging = useProjectStore((s) => s.isDragging);
  const member = hoveredId ? members.find((m) => m.id === hoveredId) : undefined;
  if (!member || isDragging) return null;
  const mid = {
    x: (member.start.x + member.direction.x * member.length * 0.5) * MM,
    y: (member.start.y + member.direction.y * member.length * 0.5) * MM + 0.05,
    z: (member.start.z + member.direction.z * member.length * 0.5) * MM,
  };
  return (
    <Html position={[mid.x, mid.y, mid.z]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
      <div className="rounded-md border border-amber-400/40 bg-slate-900/95 px-2 py-1 text-[11px] whitespace-nowrap text-amber-50 shadow-lg">
        <div className="font-semibold">
          {member.name} <span className="text-amber-200/70">· {member.nameDe}</span>
        </div>
        <div className="font-mono text-amber-100/80">
          {member.section.width}×{member.section.height} mm · {member.length} mm
          {member.cuts.start || member.cuts.end ? ` · cuts ${member.cuts.start}° / ${member.cuts.end}°` : ''}
        </div>
      </div>
    </Html>
  );
}

export function Scene({ model }: { model: DerivedModel }) {
  const project = useProjectStore((s) => s.project);
  const layers = useProjectStore((s) => s.view.layers);
  const highlight = useProjectStore((s) => s.view.highlight);
  const orthographic = useProjectStore((s) => s.view.orthographic);
  const measureMode = useProjectStore((s) => s.view.measureMode);
  const hoveredId = useProjectStore((s) => s.hoveredMemberId);
  const selectedWallId = useProjectStore((s) => s.selectedWallId);
  const isDragging = useProjectStore((s) => s.isDragging);
  const setHovered = useProjectStore((s) => s.setHoveredMember);
  const selectWall = useProjectStore((s) => s.selectWall);
  const selectVehicle = useProjectStore((s) => s.selectVehicle);
  const selectedVehicleId = useProjectStore((s) => s.selectedVehicleId);
  const selectedPavedAreaId = useProjectStore((s) => s.selectedPavedAreaId);
  const selectedPavedPointIndex = useProjectStore((s) => s.selectedPavedPointIndex);
  const selectPavedArea = useProjectStore((s) => s.selectPavedArea);
  const selectedMemberId = useProjectStore((s) => s.selectedMemberId);
  const selectMember = useProjectStore((s) => s.selectMember);
  const movePost = useProjectStore((s) => s.movePost);
  const moveMidPurlin = useProjectStore((s) => s.moveMidPurlin);
  const updatePartition = useProjectStore((s) => s.updatePartition);
  const removePartition = useProjectStore((s) => s.removePartition);
  const removePost = useProjectStore((s) => s.removePost);
  const addFreePost = useProjectStore((s) => s.addFreePost);
  const updateFreePost = useProjectStore((s) => s.updateFreePost);
  const removeFreePost = useProjectStore((s) => s.removeFreePost);
  const placingPost = useUiStore((s) => s.placingPost);
  const setPlacingPost = useUiStore((s) => s.setPlacingPost);
  const neighbourMode = useProjectStore((s) => s.view.neighbourMode);
  const focusedNeighbourId = useProjectStore((s) => s.focusedNeighbourId);
  const addPoint = useMeasureStore((s) => s.addPoint);
  const [partitionDrag, setPartitionDrag] = useState<PartitionDrag | null>(null);
  // Mirror of the state for the pointer handlers, which must not re-subscribe on every move.
  const partitionDragRef = useRef<PartitionDrag | null>(null);
  const [draggingMidPurlin, setDraggingMidPurlin] = useState<number | null>(null);
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const draggingPartitionId = partitionDrag?.id ?? null;
  const wallFrames = useWallFrames();
  const setWallExtent = useProjectStore((s) => s.setWallExtent);
  const [wallExtentDrag, setWallExtentDrag] = useState<WallExtentDrag | null>(null);

  const { subject, links } = useNeighbours(model.framing.members);
  const neighbourIds = useMemo(() => new Set(links.map((l) => l.memberId)), [links]);

  const bounds = useMemo(() => modelBounds(model, project), [model, project]);
  const draggingPost = useMemo(
    () => (draggingPostId ? model.framing.members.find((m) => m.id === draggingPostId) ?? null : null),
    [draggingPostId, model.framing.members],
  );
  const draggingPartition = useMemo(
    () => (draggingPartitionId ? project.partitions.find((p) => p.id === draggingPartitionId) ?? null : null),
    [draggingPartitionId, project.partitions],
  );
  const wireframe = highlight === 'wireframe';

  /** Place a free post where the pointer ray meets the ground (placement mode). */
  const placePostAt = useCallback(
    (e: ThreeEvent<MouseEvent>): boolean => {
      if (!placingPost) return false;
      e.stopPropagation();
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const point = new THREE.Vector3();
      if (!e.ray.intersectPlane(ground, point)) return true;
      addFreePost(snapDrag(point.x / MM), snapDrag(point.z / MM));
      setPlacingPost(false);
      return true;
    },
    [placingPost, addFreePost, setPlacingPost],
  );
  const onRemovePost = useCallback(
    (id: string) => {
      const freeId = freePostIdOf(id);
      if (freeId) removeFreePost(freeId);
      else removePost(id);
    },
    [removeFreePost, removePost],
  );

  const onMemberClick = useCallback(
    (member: Member, e: ThreeEvent<MouseEvent>) => {
      if (placePostAt(e)) return;
      if (measureMode) {
        addPoint(e.point);
        return;
      }
      if (neighbourMode) selectMember(member.id);
      if (member.category === 'post') selectMember(member.id);
      const key = member.wallId ?? member.partitionId;
      if (key) selectWall(key);
    },
    [measureMode, addPoint, selectWall, selectMember, neighbourMode, placePostAt],
  );
  const onMemberDoubleClick = useCallback((member: Member, e: ThreeEvent<MouseEvent>) => {
    openObjectSettings({ kind: 'member', category: member.category, wallKey: member.wallId ?? member.partitionId, freePostId: freePostIdOf(member.id) }, e);
  }, []);
  const onPanelDoubleClick = useCallback((panel: Panel, e: ThreeEvent<MouseEvent>) => {
    openObjectSettings({ kind: 'panel', panelKind: panel.kind, wallKey: panel.wallId ?? panel.partitionId }, e);
  }, []);
  /** Start moving / resizing a partition from the ground point under the pointer. */
  const beginPartitionDrag = useCallback((partitionId: string, mode: 'move' | 'start' | 'end' | null, e: ThreeEvent<PointerEvent>) => {
    const partition = useProjectStore.getState().project.partitions.find((p) => p.id === partitionId);
    if (!partition || !mode) return;
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    if (!e.ray.intersectPlane(ground, point)) return;
    const drag: PartitionDrag = { id: partitionId, mode, grab: partitionGrabOffset(partition, mode, { x: point.x / MM, z: point.z / MM }) };
    partitionDragRef.current = drag;
    setPartitionDrag(drag);
    document.body.style.cursor = partitionDragCursor(mode, partition.axis);
  }, []);
  /**
   * Pull one end of an outer wall's closed stretch. The drag follows window pointer events, not the
   * grabbed mesh: shortening the wall rebuilds (and can remove) the stud or cladding under the pointer.
   */
  const beginWallExtentDrag = useCallback((wallId: WallId, mode: WallExtentDragMode, e: ThreeEvent<PointerEvent>) => {
    const frame = wallFrames[wallId];
    if (!frame) return;
    e.stopPropagation();
    // The pointer is projected onto the line along the wall through the grabbed point, so the drag
    // works from any view (plan, elevation, perspective) where a ground-plane hit would degenerate.
    const along = new THREE.Vector3(frame.u.x, 0, frame.u.z);
    const reach = Math.max(frame.length * MM, 1) * 4;
    const lineStart = e.point.clone().addScaledVector(along, -reach);
    const lineEnd = e.point.clone().addScaledVector(along, reach);
    const onLine = new THREE.Vector3();
    const run = { origin: frame.origin, u: frame.u, extent: frame.extent };
    const drag: WallExtentDrag = { wallId, mode, grab: wallExtentGrabOffset(run, mode, { x: e.point.x / MM, z: e.point.z / MM }) };
    const canvas = e.nativeEvent.target as HTMLElement;
    const camera = e.camera;
    const raycaster = new THREE.Raycaster();
    const onMove = (ev: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1), camera);
      raycaster.ray.distanceSqToSegment(lineStart, lineEnd, undefined, onLine);
      setWallExtent(wallId, wallExtentDragPatch(run, mode, { x: onLine.x / MM, z: onLine.z / MM }, drag.grab));
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setWallExtentDrag(null);
      document.body.style.cursor = '';
      useProjectStore.getState().setDragging(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    setWallExtentDrag(drag);
    document.body.style.cursor = wallExtentCursor(frame.u);
    selectMember(null);
    selectWall(wallId);
    useProjectStore.getState().setDragging(true);
  }, [wallFrames, setWallExtent, selectMember, selectWall]);
  const onPostDragStart = useCallback((member: Member, e: ThreeEvent<PointerEvent>) => {
    if (measureMode || placingPost) return;
    if (member.wallId && member.category !== 'post') {
      const frame = wallFrames[member.wallId];
      const mode = frame ? wallExtentMemberMode(member, frame) : null;
      if (mode) beginWallExtentDrag(member.wallId, mode, e);
      return;
    }
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    if (member.partitionId) {
      const partition = useProjectStore.getState().project.partitions.find((p) => p.id === member.partitionId);
      if (partition) {
        beginPartitionDrag(partition.id, partitionDragMode(member, partition, { x: e.point.x / MM, z: e.point.z / MM }), e);
        selectWall(partition.id);
      }
    }
    setDraggingMidPurlin(midPurlinIndex(member));
    setDraggingPostId(member.category === 'post' && !member.partitionId ? member.id : null);
    // Select on pointer-down, not only on click: a drag that ends over another
    // timber never fires click, so the neighbour distances would stay hidden.
    if (member.category === 'post') selectMember(member.id);
    useProjectStore.getState().setDragging(true);
  }, [measureMode, placingPost, selectMember, selectWall, beginPartitionDrag, wallFrames, beginWallExtentDrag]);
  /** Move / resize the partition being dragged so it follows the ground point (world m). */
  const applyPartitionDrag = useCallback((point: THREE.Vector3) => {
    const drag = partitionDragRef.current;
    if (!drag) return;
    const partition = useProjectStore.getState().project.partitions.find((p) => p.id === drag.id);
    if (!partition) return;
    updatePartition(drag.id, partitionDragPatch(partition, drag.mode, { x: point.x / MM, z: point.z / MM }, drag.grab));
  }, [updatePartition]);
  const endPartitionDrag = useCallback(() => {
    if (!partitionDragRef.current) return;
    partitionDragRef.current = null;
    setPartitionDrag(null);
    document.body.style.cursor = '';
  }, []);
  const onPostDrag = useCallback((member: Member, e: ThreeEvent<PointerEvent>) => {
    if (measureMode || placingPost || (member.wallId && member.category !== 'post')) return;
    e.stopPropagation();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    if (!e.ray.intersectPlane(ground, point)) return;
    // Free posts move anywhere in plan; they are stored in world coordinates.
    const freeId = freePostIdOf(member.id);
    if (freeId) {
      updateFreePost(freeId, { x: snapDrag(point.x / MM), z: snapDrag(point.z / MM) });
      return;
    }
    if (member.partitionId) {
      applyPartitionDrag(point);
      return;
    }
    // Post rows live in the canonical frame (see PostGrid): rotate the pointer into it and move
    // the post along its row / wall axis (the post id is its override key).
    const params = project.params;
    const canonicalPoint = worldPointToCanonical(params, { x: point.x / MM, z: point.z / MM });
    // Intermediate purlins move across the slope, i.e. perpendicular to their row
    // (classic rows run along X → move along Z; sloped-purlins rows run along Z → move along X).
    const midIndex = midPurlinIndex(member);
    if (midIndex !== null) {
      const across = params.roofScheme === 'sloped-purlins' ? canonicalPoint.x : canonicalPoint.z;
      moveMidPurlin(midIndex, snapDrag(across));
      return;
    }
    if (member.category !== 'post') return;
    const axisPosition = postKeyAxis(params.roofScheme, member.id) === 'x' ? canonicalPoint.x : canonicalPoint.z;
    movePost(member.id, snapDrag(axisPosition));
  }, [measureMode, placingPost, movePost, moveMidPurlin, project.params, applyPartitionDrag, updateFreePost]);
  const onPostDragEnd = useCallback((member: Member, e: ThreeEvent<PointerEvent>) => {
    if (member.wallId && member.category !== 'post') return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    endPartitionDrag();
    setDraggingMidPurlin(null);
    setDraggingPostId(null);
    useProjectStore.getState().setDragging(false);
  }, [endPartitionDrag]);
  // Partition cladding drags its wall like the framing does: near an end it resizes, elsewhere it moves.
  const onPanelDragStart = useCallback((panel: Panel, e: ThreeEvent<PointerEvent>) => {
    if (measureMode || placingPost) return;
    if (panel.wallId) {
      // Outer wall cladding resizes its closed stretch when grabbed near an end; elsewhere the view orbits
      const frame = wallFrames[panel.wallId];
      const mode = frame ? wallExtentDragModeAt(frame, { x: e.point.x / MM, z: e.point.z / MM }) : null;
      if (mode) beginWallExtentDrag(panel.wallId, mode, e);
      return;
    }
    if (!panel.partitionId) return;
    const partition = useProjectStore.getState().project.partitions.find((p) => p.id === panel.partitionId);
    if (!partition) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    beginPartitionDrag(partition.id, partitionDragModeAt(partition, { x: e.point.x / MM, z: e.point.z / MM }), e);
    selectMember(null);
    selectWall(panel.partitionId);
    useProjectStore.getState().setDragging(true);
  }, [measureMode, placingPost, beginPartitionDrag, selectMember, selectWall, wallFrames, beginWallExtentDrag]);
  const onPanelDrag = useCallback((_panel: Panel, e: ThreeEvent<PointerEvent>) => {
    if (!partitionDragRef.current) return;
    e.stopPropagation();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    if (!e.ray.intersectPlane(ground, point)) return;
    applyPartitionDrag(point);
  }, [applyPartitionDrag]);
  const onPanelDragEnd = useCallback((_panel: Panel, e: ThreeEvent<PointerEvent>) => {
    if (!partitionDragRef.current) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    endPartitionDrag();
    useProjectStore.getState().setDragging(false);
  }, [endPartitionDrag]);
  const partitionsById = useMemo(() => new Map(project.partitions.map((p) => [p.id, p])), [project.partitions]);
  const memberDragCursor = useCallback((member: Member): string | undefined => {
    if (member.wallId && member.category !== 'post') {
      const frame = wallFrames[member.wallId];
      return frame && wallExtentMemberMode(member, frame) ? wallExtentCursor(frame.u) : undefined;
    }
    const partition = member.partitionId ? partitionsById.get(member.partitionId) : undefined;
    if (!partition) return undefined;
    const mode = partitionDragMode(member, partition);
    return mode ? partitionDragCursor(mode, partition.axis) : undefined;
  }, [partitionsById, wallFrames]);
  /** Resize cursor while hovering outer wall cladding near an end of its closed stretch */
  const panelDragCursorAt = useCallback((panel: Panel, point: THREE.Vector3): string | undefined => {
    const frame = panel.wallId ? wallFrames[panel.wallId] : undefined;
    return frame && wallExtentDragModeAt(frame, { x: point.x / MM, z: point.z / MM }) ? wallExtentCursor(frame.u) : undefined;
  }, [wallFrames]);
  const onPanelClick = useCallback(
    (panel: Panel, e: ThreeEvent<MouseEvent>) => {
      if (placePostAt(e)) return;
      if (measureMode) {
        addPoint(e.point);
        return;
      }
      selectMember(null);
      const key = panel.wallId ?? panel.partitionId;
      if (key) selectWall(key);
    },
    [measureMode, addPoint, selectWall, selectMember, placePostAt],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        selectMember(null);
        setPlacingPost(false);
      }
      if (canDeleteSelectedPartition(e.key, selectedWallId, e.target as { tagName?: string; isContentEditable?: boolean } | null)) {
        e.preventDefault();
        removePartition(selectedWallId as string);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removePartition, selectMember, selectedWallId, setPlacingPost]);

  const centre: [number, number, number] = [(bounds.min.x + bounds.max.x) / 2, 0, (bounds.min.z + bounds.max.z) / 2];
  // Scene dressing scales with the structure so very large footprints are neither fogged out nor
  // cut off by the shadow frustum / ground plane (sizes in metres, sized for the default 6×3 m).
  const extent = Math.max(12, bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z, bounds.max.y - bounds.min.y);
  const fogNear = extent * 3;
  const fogFar = extent * 9;
  const shadowHalf = extent * 1.2;
  const groundSize = extent * 7;

  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => {
        if (!measureMode && !isDragging && !placingPost) {
          selectWall(null);
          selectMember(null);
          selectVehicle(null);
          selectPavedArea(null);
        }
      }}
      className={measureMode || placingPost ? 'cursor-crosshair' : undefined}
    >
      <color attach="background" args={['#0b1220']} />
      <fog attach="fog" args={['#0b1220', fogNear, fogFar]} />
      {orthographic ? (
        <OrthographicCamera makeDefault position={[8, 8, -8]} near={0.01} far={Math.max(500, extent * 40)} zoom={60} />
      ) : (
        <PerspectiveCamera makeDefault position={[8, 6, -9]} fov={42} near={0.05} far={Math.max(500, extent * 40)} />
      )}
      <hemisphereLight args={['#dbeafe', '#3b2a17', 0.55]} />
      <directionalLight
        position={[centre[0] + extent * 0.75, extent * 1.2, centre[2] - extent * 0.6]}
        intensity={1.7}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-shadowHalf}
        shadow-camera-right={shadowHalf}
        shadow-camera-top={shadowHalf}
        shadow-camera-bottom={-shadowHalf}
        shadow-camera-near={0.5}
        shadow-camera-far={extent * 5}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-8, 6, 9]} intensity={0.45} />

      {layers.grid && (
        <Grid
          position={[centre[0], -0.002, centre[2]]}
          args={[60, 60]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#1e293b"
          sectionSize={2}
          sectionThickness={1.1}
          sectionColor="#334155"
          fadeDistance={extent * 4}
          fadeStrength={1.5}
          infiniteGrid
        />
      )}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centre[0], -0.003, centre[2]]}
        receiveShadow
        onClick={(e) => {
          if (placePostAt(e)) return;
          if (measureMode) {
            e.stopPropagation();
            addPoint(e.point);
          }
        }}
      >
        <planeGeometry args={[groundSize, groundSize]} />
        <shadowMaterial transparent opacity={0.3} />
      </mesh>

      <Suspense fallback={null}>
        {layers.frame &&
          model.framing.members.map((m) => (
            <TimberMember
              key={m.id}
              member={m}
              highlight={highlight}
              hovered={m.id === hoveredId}
              inspected={m.id === subject?.id}
              neighbour={neighbourIds.has(m.id)}
              focused={m.id === focusedNeighbourId}
              selected={selectedMemberId === m.id || (selectedWallId !== null && (m.wallId ?? m.partitionId) === selectedWallId && (m.category === 'stud' || m.category === 'header' || m.category === 'sill' || m.category === 'plate'))}
              onHover={setHovered}
              onClick={onMemberClick}
              onDoubleClick={onMemberDoubleClick}
              onPostDragStart={onPostDragStart}
              onPostDrag={onPostDrag}
              onPostDragEnd={onPostDragEnd}
              onRemovePost={onRemovePost}
              dragCursor={measureMode || placingPost ? undefined : memberDragCursor(m)}
            />
          ))}
        {layers.frame && !wireframe && <AnchorFixtures members={model.framing.members} />}
        {model.framing.panels.map((p) =>
          (p.kind === 'roof' && layers.roof) || (p.kind === 'cladding' && layers.cladding) || (p.kind === 'floor' && layers.floor) ? (
            <PanelMesh
              key={p.id}
              panel={p}
              covering={project.params.loads.roofCovering}
              wireframe={wireframe}
              onClick={onPanelClick}
              onDoubleClick={onPanelDoubleClick}
              onDragStart={p.partitionId || p.wallId ? onPanelDragStart : undefined}
              onDrag={p.partitionId || p.wallId ? onPanelDrag : undefined}
              onDragEnd={p.partitionId || p.wallId ? onPanelDragEnd : undefined}
              dragCursor={
                measureMode || placingPost
                  ? undefined
                  : p.partitionId
                    ? partitionDragCursor('move', partitionsById.get(p.partitionId)?.axis ?? 'x')
                    : p.wallId
                      ? panelDragCursorAt
                      : undefined
              }
            />
          ) : null,
        )}
        {layers.paving &&
          project.pavedAreas.map((a) => (
            <PavedAreaMesh
              key={a.id}
              area={a}
              summary={model.paving.areas.find((s) => s.id === a.id)}
              selected={a.id === selectedPavedAreaId}
              selectedPointIndex={a.id === selectedPavedAreaId ? selectedPavedPointIndex : null}
            />
          ))}
        {layers.vehicles &&
          project.vehicles.map((v) => (
            <VehicleMesh key={v.id} vehicle={v} fit={model.vehicles.find((f) => f.vehicleId === v.id)} selected={v.id === selectedVehicleId} />
          ))}
        {layers.dimensions && <DimensionLines model={model} />}
        {draggingPartition && partitionDrag?.mode === 'move' && <PartitionDragDistances partition={draggingPartition} params={project.params} />}
        {draggingPartition && partitionDrag?.mode !== 'move' && <PartitionResizeRuler partition={draggingPartition} />}
        {wallExtentDrag && wallFrames[wallExtentDrag.wallId] && <WallExtentRuler frame={wallFrames[wallExtentDrag.wallId]} />}
        {draggingPost && <PostDragDistances post={draggingPost} params={project.params} />}
        {draggingMidPurlin !== null && <MidPurlinDragDistances index={draggingMidPurlin} model={model} params={project.params} />}
        {layers.cladding && !wireframe && <OpeningFixtures />}
        <OpeningsEditor />
        <MeasureTool />
        <NeighbourDistances subject={subject} links={links} members={model.framing.members} />
        {layers.frame && <HoverTooltip members={model.framing.members} />}
      </Suspense>

      <CameraRig bounds={bounds} />
      <OrbitControls
        makeDefault
        enabled={!isDragging}
        enableDamping
        dampingFactor={0.1}
        maxPolarAngle={Math.PI / 2 - 0.01}
        minDistance={1}
        maxDistance={Math.max(120, extent * 12)}
        mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
      />
    </Canvas>
  );
}
