import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import type { Vehicle, VehicleFit } from '@/types';
import { useProjectStore } from '@/store';
import { resolveVehicleModel, vehicleCorners } from '@/engine/vehicles';
import { toRad } from '@/engine/geometry';
import { MM } from './materials';
import { useRedraw } from './renderLoop';
import { clipSilhouette, FRAME_STYLES, GLASS, MATTE_STYLES, SILHOUETTES, WHEEL_LAYOUT, WHEELS } from './vehicleShapes';
import { FurnitureBody } from './FurnitureBody';
import { useMeasureStore } from './MeasureTool';
import { openObjectSettings } from './openObjectSettings';
import { DRAG_SNAP } from '@/engine/postDrag';
import { useT } from '@/i18n';

const SNAP = DRAG_SNAP;
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

/** Simplified parametric object built from a side silhouette (or a board frame) – exact footprint, height and mirror width. */
export const VehicleMesh = memo(function VehicleMesh({ vehicle, fit, selected }: VehicleMeshProps) {
  const { tx } = useT();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only the model and size matter, not position / colour
  const model = useMemo(() => resolveVehicleModel(vehicle), [vehicle.modelId, vehicle.size?.length, vehicle.size?.width, vehicle.size?.height]);
  const isFrame = FRAME_STYLES.has(model.style);
  const measureMode = useProjectStore((s) => s.view.measureMode);
  const updateVehicle = useProjectStore((s) => s.updateVehicle);
  const selectVehicle = useProjectStore((s) => s.selectVehicle);
  const setDragging = useProjectStore((s) => s.setDragging);
  const addPoint = useMeasureStore((s) => s.addPoint);
  const drag = useRef<{ offsetX: number; offsetZ: number } | null>(null);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const bodyGeometry = useMemo(() => (isFrame ? null : extrude(SILHOUETTES[model.style], model.length, model.height, model.width)), [model, isFrame]);
  const glassGeometry = useMemo(() => {
    const g = GLASS[model.style];
    if (!g) return null;
    const pts = clipSilhouette(SILHOUETTES[model.style], 0, g.uMax, g.vMin, g.vMax);
    return pts.length >= 3 ? extrude(pts, model.length, model.height, model.width + 6) : null;
  }, [model]);
  const wheel = WHEELS[model.style];
  const wheelGeometry = useMemo(() => {
    if (!wheel) return null;
    const r = (wheel.diameter * model.height * MM) / 2;
    const w = wheel.width * model.width * MM;
    const geo = new THREE.CylinderGeometry(r, r, w, 24);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, [wheel, model]);
  useEffect(() => () => bodyGeometry?.dispose(), [bodyGeometry]);
  useEffect(() => () => glassGeometry?.dispose(), [glassGeometry]);
  useEffect(() => () => wheelGeometry?.dispose(), [wheelGeometry]);

  const matte = MATTE_STYLES.has(model.style);
  const bodyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: vehicle.color, metalness: matte ? 0.05 : 0.55, roughness: matte ? 0.75 : 0.35 }),
    [vehicle.color, matte],
  );
  useEffect(() => () => bodyMaterial.dispose(), [bodyMaterial]);
  const redraw = useRedraw();
  useEffect(() => {
    bodyMaterial.emissive.set(selected ? '#0ea5e9' : '#000000');
    bodyMaterial.emissiveIntensity = selected ? 0.12 : 0;
    redraw();
  }, [bodyMaterial, selected, redraw]);

  const wheelsToRender = useMemo((): [number, number, number][] => {
    if (!wheel) return [];
    const r = (wheel.diameter * model.height * MM) / 2;
    const inset = (model.width * MM) / 2 - (wheel.width * model.width * MM) / 2 - 0.02;
    const fx = (wheel.front - 0.5) * model.length * MM;
    const rx = (wheel.rear - 0.5) * model.length * MM;
    switch (WHEEL_LAYOUT[model.style] ?? 'quad') {
      case 'single':
        return [
          [fx, r, 0],
          [rx, r, 0],
        ];
      case 'frontSingle':
        return [[fx, r, 0]];
      case 'rearPair':
        return [
          [rx, r, inset],
          [rx, r, -inset],
        ];
      default:
        return [
          [fx, r, inset],
          [fx, r, -inset],
          [rx, r, inset],
          [rx, r, -inset],
        ];
    }
  }, [wheel, model]);

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
  const label = `${tx(model.name)} · ${model.length}×${model.width}×${model.height} mm`;

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
        onDoubleClick={(e) => openObjectSettings({ kind: 'vehicle', id: vehicle.id }, e)}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!measureMode) document.body.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        {bodyGeometry ? <mesh geometry={bodyGeometry} material={bodyMaterial} castShadow receiveShadow /> : <FurnitureBody style={model.style} model={model} material={bodyMaterial} />}
        {glassGeometry && <mesh geometry={glassGeometry} material={getGlass()} castShadow />}
        {wheelGeometry &&
          wheelsToRender.map((p, i) => (
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
              x {vehicle.x} · z {vehicle.z} · {vehicle.rotationDeg}° · {fit?.messages[0] ? tx(fit.messages[0]) : ''}
            </div>
          </div>
        </Html>
      )}
    </>
  );
});
