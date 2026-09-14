import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { Grid, Html, OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import type { DerivedModel, Member, Panel } from '@/types';
import { useProjectStore } from '@/store';
import { useNeighbours } from '@/store/useNeighbours';
import { canDeleteSelectedPartition } from '@/engine/wallKeyboard';
import { CameraRig, modelBounds } from './CameraRig';
import { DimensionLines, MidPurlinDragDistances, PartitionDragDistances } from './DimensionLines';
import { midPurlinIndex, partitionDragAxis } from '@/engine/postDrag';
import { worldPointToCanonical } from '@/engine/orientation';
import { postKeyAxis } from '@/engine/postOverrides';
import { MM } from './materials';
import { MeasureTool, useMeasureStore } from './MeasureTool';
import { NeighbourDistances } from './NeighbourDistances';
import { OpeningsEditor } from './OpeningsEditor';
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
  const neighbourMode = useProjectStore((s) => s.view.neighbourMode);
  const focusedNeighbourId = useProjectStore((s) => s.focusedNeighbourId);
  const addPoint = useMeasureStore((s) => s.addPoint);
  const [draggingPartitionId, setDraggingPartitionId] = useState<string | null>(null);
  const [draggingMidPurlin, setDraggingMidPurlin] = useState<number | null>(null);

  const { subject, links } = useNeighbours(model.framing.members);
  const neighbourIds = useMemo(() => new Set(links.map((l) => l.memberId)), [links]);

  const bounds = useMemo(() => modelBounds(model, project), [model, project]);
  const draggingPartition = useMemo(
    () => (draggingPartitionId ? project.partitions.find((p) => p.id === draggingPartitionId) ?? null : null),
    [draggingPartitionId, project.partitions],
  );
  const wireframe = highlight === 'wireframe';

  const onMemberClick = useCallback(
    (member: Member, e: ThreeEvent<MouseEvent>) => {
      if (measureMode) {
        addPoint(e.point);
        return;
      }
      if (neighbourMode) selectMember(member.id);
      if (member.category === 'post') selectMember(member.id);
      const key = member.wallId ?? member.partitionId;
      if (key) selectWall(key);
    },
    [measureMode, addPoint, selectWall, selectMember, neighbourMode],
  );
  const onPostDragStart = useCallback((member: Member, e: ThreeEvent<PointerEvent>) => {
    if (measureMode) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingPartitionId(member.partitionId ?? null);
    setDraggingMidPurlin(midPurlinIndex(member));
    // Select on pointer-down, not only on click: a drag that ends over another
    // timber never fires click, so the neighbour distances would stay hidden.
    if (member.category === 'post') selectMember(member.id);
    useProjectStore.getState().setDragging(true);
  }, [measureMode, selectMember]);
  const onPostDrag = useCallback((member: Member, e: ThreeEvent<PointerEvent>) => {
    if (measureMode) return;
    e.stopPropagation();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    if (!e.ray.intersectPlane(ground, point)) return;
    if (member.partitionId) {
      const partition = project.partitions.find((p) => p.id === member.partitionId);
      if (!partition) return;
      const offset = partitionDragAxis(partition.axis, { x: point.x / MM, z: point.z / MM });
      updatePartition(member.partitionId, { offset: Math.round(offset / 50) * 50 });
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
      moveMidPurlin(midIndex, Math.round(across / 50) * 50);
      return;
    }
    if (member.category !== 'post') return;
    const axisPosition = postKeyAxis(params.roofScheme, member.id) === 'x' ? canonicalPoint.x : canonicalPoint.z;
    movePost(member.id, Math.round(axisPosition / 50) * 50);
  }, [measureMode, movePost, moveMidPurlin, project.params, project.partitions, updatePartition]);
  const onPostDragEnd = useCallback((_member: Member, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    setDraggingPartitionId(null);
    setDraggingMidPurlin(null);
    useProjectStore.getState().setDragging(false);
  }, []);
  const onPanelClick = useCallback(
    (panel: Panel, e: ThreeEvent<MouseEvent>) => {
      if (measureMode) {
        addPoint(e.point);
        return;
      }
      selectMember(null);
      const key = panel.wallId ?? panel.partitionId;
      if (key) selectWall(key);
    },
    [measureMode, addPoint, selectWall, selectMember],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') selectMember(null);
      if (canDeleteSelectedPartition(e.key, selectedWallId, e.target as { tagName?: string; isContentEditable?: boolean } | null)) {
        e.preventDefault();
        removePartition(selectedWallId as string);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removePartition, selectMember, selectedWallId]);

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
        if (!measureMode && !isDragging) {
          selectWall(null);
          selectMember(null);
          selectVehicle(null);
          selectPavedArea(null);
        }
      }}
      className={measureMode ? 'cursor-crosshair' : undefined}
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
              onPostDragStart={onPostDragStart}
              onPostDrag={onPostDrag}
              onPostDragEnd={onPostDragEnd}
              onRemovePost={removePost}
            />
          ))}
        {model.framing.panels.map((p) =>
          (p.kind === 'roof' && layers.roof) || (p.kind === 'cladding' && layers.cladding) ? (
            <PanelMesh key={p.id} panel={p} covering={project.params.loads.roofCovering} wireframe={wireframe} onClick={onPanelClick} />
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
        {draggingPartition && <PartitionDragDistances partition={draggingPartition} params={project.params} />}
        {draggingMidPurlin !== null && <MidPurlinDragDistances index={draggingMidPurlin} model={model} params={project.params} />}
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
