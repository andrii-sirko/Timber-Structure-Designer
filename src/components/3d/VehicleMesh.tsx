import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import type { Vehicle, VehicleFit } from '@/types';
import { useProjectStore } from '@/store';
import { getVehicleModel, vehicleCorners } from '@/engine/vehicles';
import { toRad } from '@/engine/geometry';
import { MM } from './materials';
import { clipSilhouette, GLASS, SILHOUETTES, WHEELS } from './vehicleShapes';
import { useMeasureStore } from './MeasureTool';

const SNAP = 50;
const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

let glassMaterial: THREE.MeshStandardMaterial | null = null;
let tyreMaterial: THREE.MeshStandardMaterial | null = null;
function getGlass(): THREE.MeshStandardMaterial {
  return (glassMaterial ??= new THREE.MeshStandardMaterial({ color: '#111827', metalness: 0.2, roughness: 0.35 }));
}
function getTyre(): THREE.MeshStandardMaterial {
  return (tyreMaterial ??= new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.9 }));
}

function extrude(points: [number, number][], length: number, height: number, width: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape(points.map(([u, v]) => new THREE.Vector2((u - 0.5) * length * MM, v * height * MM)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width * MM, bevelEnabled: false, steps: 1 });
  geo.translate(0, 0, (-width * MM) / 2);
  return geo;
}

const STATUS_COLOR = { ok: '#34d399', warning: '#fbbf24', fail: '#f87171' } as const;

interface VehicleMeshProps {
  vehicle: Vehicle;
  fit?: VehicleFit;
  selected: boolean;
}

/** Simplified parametric car built from a side silhouette – exact footprint, height and mirror width. */
export const VehicleMesh = memo(function VehicleMesh({ vehicle, fit, selected }: VehicleMeshProps) {
  const model = getVehicleModel(vehicle.modelId);
  const measureMode = useProjectStore((s) => s.view.measureMode);
  const updateVehicle = useProjectStore((s) => s.updateVehicle);
  const selectVehicle = useProjectStore((s) => s.selectVehicle);
  const setDragging = useProjectStore((s) => s.setDragging);
  const addPoint = useMeasureStore((s) => s.addPoint);
  const drag = useRef<{ offsetX: number; offsetZ: number } | null>(null);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const bodyGeometry = useMemo(() => extrude(SILHOUETTES[model.style], model.length, model.height, model.width), [model]);
  const glassGeometry = useMemo(() => {
    const g = GLASS[model.style];
    if (!g) return null;
    const pts = clipSilhouette(SILHOUETTES[model.style], 0, g.uMax, g.vMin, g.vMax);
    return pts.length >= 3 ? extrude(pts, model.length, model.height, model.width + 6) : null;
  }, [model]);
  const wheel = WHEELS[model.style];
  const wheelGeometry = useMemo(() => {
    const r = (wheel.diameter * model.height * MM) / 2;
    const w = wheel.width * model.width * MM;
    const geo = new THREE.CylinderGeometry(r, r, w, 24);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, [wheel, model]);
  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry]);
  useEffect(() => () => glassGeometry?.dispose(), [glassGeometry]);
  useEffect(() => () => wheelGeometry.dispose(), [wheelGeometry]);

  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: vehicle.color, metalness: 0.55, roughness: 0.35 }), [vehicle.color]);
  useEffect(() => () => bodyMaterial.dispose(), [bodyMaterial]);
  useEffect(() => {
    bodyMaterial.emissive.set(selected ? '#0ea5e9' : '#000000');
    bodyMaterial.emissiveIntensity = selected ? 0.12 : 0;
  }, [bodyMaterial, selected]);

  const wheelRadius = (wheel.diameter * model.height * MM) / 2;
  const wheelInset = (model.width * MM) / 2 - (wheel.width * model.width * MM) / 2 - 0.02;
  const wheelPositions: [number, number, number][] = [
    [(wheel.front - 0.5) * model.length * MM, wheelRadius, wheelInset],
    [(wheel.front - 0.5) * model.length * MM, wheelRadius, -wheelInset],
    [(wheel.rear - 0.5) * model.length * MM, wheelRadius, wheelInset],
    [(wheel.rear - 0.5) * model.length * MM, wheelRadius, -wheelInset],
  ];
  const wheelsToRender = model.style === 'motorcycle' ? [wheelPositions[0], wheelPositions[2]].map(([x, y]) => [x, y, 0] as [number, number, number]) : wheelPositions;

  const footprint = useMemo(() => {
    const c = vehicleCorners(vehicle, model, true).map((p) => [p.x * MM, 0.004, p.z * MM] as [number, number, number]);
    return [...c, c[0]];
  }, [vehicle, model]);

  const groundPoint = (ray: THREE.Ray): THREE.Vector3 | null => (ray.intersectPlane(GROUND, hit) ? hit : null);

  const onDown = (e: ThreeEvent<PointerEvent>): void => {
    if (measureMode) return;
    e.stopPropagation();
    const p = groundPoint(e.ray);
    if (!p) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { offsetX: p.x / MM - vehicle.x, offsetZ: p.z / MM - vehicle.z };
    selectVehicle(vehicle.id);
    setDragging(true);
  };
  const onMove = (e: ThreeEvent<PointerEvent>): void => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const p = groundPoint(e.ray);
    if (!p) return;
    updateVehicle(vehicle.id, {
      x: Math.round((p.x / MM - d.offsetX) / SNAP) * SNAP,
      z: Math.round((p.z / MM - d.offsetZ) / SNAP) * SNAP,
    });
  };
  const onUp = (e: ThreeEvent<PointerEvent>): void => {
    if (!drag.current) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    drag.current = null;
    setDragging(false);
  };

  const status = fit?.status ?? 'ok';
  const label = `${model.name} · ${model.length}×${model.width}×${model.height} mm`;

  return (
    <>
      <group
        position={[vehicle.x * MM, 0, vehicle.z * MM]}
        rotation={[0, toRad(vehicle.rotationDeg), 0]}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
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
      >
        <mesh geometry={bodyGeometry} material={bodyMaterial} castShadow receiveShadow />
        {glassGeometry && <mesh geometry={glassGeometry} material={getGlass()} castShadow />}
        {wheelsToRender.map((p, i) => (
          <mesh key={i} geometry={wheelGeometry} material={getTyre()} position={p} castShadow />
        ))}
      </group>
      {/* mirror-width footprint on the ground (world space), coloured by fit status */}
      <Line points={footprint} color={STATUS_COLOR[status]} lineWidth={selected ? 2 : 1} dashed dashSize={0.12} gapSize={0.06} transparent opacity={selected ? 0.95 : 0.6} />
      {selected && (
        <Html position={[vehicle.x * MM, model.height * MM + 0.25, vehicle.z * MM]} center zIndexRange={[7, 0]} style={{ pointerEvents: 'none' }}>
          <div className="rounded border bg-slate-900/90 px-2 py-1 text-[11px] whitespace-nowrap shadow" style={{ borderColor: STATUS_COLOR[status], color: '#e2e8f0' }}>
            <div className="font-semibold">{label}</div>
            <div className="font-mono text-slate-300">
              x {vehicle.x} · z {vehicle.z} · {vehicle.rotationDeg}° · {fit?.messages[0] ?? ''}
            </div>
          </div>
        </Html>
      )}
    </>
  );
});
