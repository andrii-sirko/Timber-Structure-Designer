import { useMemo } from 'react';
import type * as THREE from 'three';
import type { VehicleBodyStyle, VehicleModel } from '@/types';
import { MM } from './materials';

type Vec3 = [number, number, number];

/** One primitive of a procedural object; everything in metres, local frame (x along the length, y up, z across the width). */
export type Part =
  | { kind: 'box'; position: Vec3; size: Vec3; rotation?: Vec3 }
  | { kind: 'cylinder'; position: Vec3; radius: number; height: number; rotation?: Vec3 }
  | { kind: 'sphere'; position: Vec3; radius: number };

const box = (x: number, y: number, z: number, l: number, h: number, w: number, rotation?: Vec3): Part => ({
  kind: 'box',
  position: [x * MM, y * MM, z * MM],
  size: [l * MM, h * MM, w * MM],
  ...(rotation ? { rotation } : {}),
});
const cylinder = (x: number, y: number, z: number, radius: number, height: number, rotation?: Vec3): Part => ({
  kind: 'cylinder',
  position: [x * MM, y * MM, z * MM],
  radius: radius * MM,
  height: height * MM,
  ...(rotation ? { rotation } : {}),
});
const sphere = (x: number, y: number, z: number, radius: number): Part => ({ kind: 'sphere', position: [x * MM, y * MM, z * MM], radius: radius * MM });

/** Legs at the four corners, `inset` mm from the edges, from the ground up to `top` mm. */
function legs(length: number, width: number, top: number, leg: number, inset: number): Part[] {
  const hx = length / 2 - inset - leg / 2;
  const hz = width / 2 - inset - leg / 2;
  return [
    box(-hx, top / 2, -hz, leg, top, leg),
    box(hx, top / 2, -hz, leg, top, leg),
    box(-hx, top / 2, hz, leg, top, leg),
    box(hx, top / 2, hz, leg, top, leg),
  ];
}

/** Parts that make up a piece of equipment with the model's exact bounding box. */
export function furnitureParts(style: VehicleBodyStyle, model: VehicleModel): Part[] {
  const { length: L, width: W, height: H } = model;
  switch (style) {
    case 'shelf': {
      const post = 40;
      const board = 25;
      const count = Math.max(2, Math.round(H / 450) + 1);
      const boards = Array.from({ length: count }, (_, i) => {
        const y = 50 + ((H - 50 - board) * i) / (count - 1) + board / 2;
        return box(0, y, 0, L, board, W);
      });
      // thin back panel keeps the rack readable from every side
      const back = box(0, H / 2, -W / 2 + 5, L, H, 10);
      return [...legs(L, W, H, post, 0), ...boards, back];
    }
    case 'table': {
      const top = 40;
      return [box(0, H - top / 2, 0, L, top, W), ...legs(L, W, H - top, 60, 40)];
    }
    case 'workbench': {
      const top = 60;
      const shelfY = Math.min(H * 0.25, 300);
      return [box(0, H - top / 2, 0, L, top, W), box(0, shelfY, 0, L - 160, 25, W - 160), ...legs(L, W, H - top, 80, 40)];
    }
    case 'bench': {
      const seatH = Math.min(H * 0.55, 480);
      const seatD = W * 0.8;
      const zShift = (W - seatD) / 2;
      const seat = box(0, seatH - 20, zShift, L, 40, seatD);
      const back = box(0, seatH + (H - seatH) / 2, -W / 2 + 20, L, H - seatH, 40);
      const benchLegs = legs(L, seatD, seatH - 40, 50, 20).map((b) => ({ ...b, position: [b.position[0], b.position[1], b.position[2] + zShift * MM] as Vec3 }));
      return [seat, back, ...benchLegs];
    }
    case 'barrel': {
      // round barrel: diameter = the smaller plan dimension, with a slightly wider lid rim and a tap
      const r = Math.min(L, W) / 2;
      return [cylinder(0, H / 2, 0, r, H), cylinder(0, H - 15, 0, r + 10, 30), cylinder(-r - 20, 120, 0, 12, 60, [0, 0, Math.PI / 2])];
    }
    case 'ladder': {
      // rails lean from the ground at +z (foot) to the top at -z (wall side); W = horizontal reach, H = vertical rise
      const rail = 35;
      const run = Math.max(W - rail, 1);
      const rise = Math.max(H - rail, 1);
      const railLength = Math.hypot(run, rise);
      const tilt = Math.atan2(run, rise); // rotate about X: +z foot towards -z top
      const rotation: Vec3 = [-tilt, 0, 0];
      const yMid = H / 2;
      const rails = [box(-L / 2 + rail / 2, yMid, 0, rail, railLength, rail, rotation), box(L / 2 - rail / 2, yMid, 0, rail, railLength, rail, rotation)];
      const count = Math.max(2, Math.round(railLength / 280));
      const rungs = Array.from({ length: count }, (_, i) => {
        const t = (i + 0.5) / count;
        return box(0, rail + (rise - rail) * t + rail / 2, run / 2 - run * t, L - 2 * rail, 25, 25, rotation);
      });
      return [...rails, ...rungs];
    }
    case 'gasGrill': {
      // cart with legs, a lid box on top and side tables; L covers the side tables, body is the middle 60 %
      const bodyL = L * 0.6;
      const cartTop = H * 0.62;
      const cabinet = box(0, cartTop * 0.55, 0, bodyL, cartTop * 0.9, W * 0.85);
      const lid = box(0, cartTop + (H - cartTop) / 2, 0, bodyL, H - cartTop, W);
      const tableY = cartTop + 10;
      const sideL = (L - bodyL) / 2;
      const tables = [box(-bodyL / 2 - sideL / 2, tableY, 0, sideL, 20, W * 0.9), box(bodyL / 2 + sideL / 2, tableY, 0, sideL, 20, W * 0.9)];
      return [cabinet, lid, ...tables, ...legs(bodyL, W * 0.85, cartTop * 0.1, 40, 0)];
    }
    case 'kettleGrill': {
      const r = Math.min(L, W) / 2 - 20;
      const bowlY = H * 0.62;
      const legLen = bowlY - r * 0.4;
      const tripod = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((a) => cylinder(Math.cos(a) * r * 0.7, legLen / 2, Math.sin(a) * r * 0.7, 12, legLen, [0, 0, 0]));
      return [sphere(0, bowlY, 0, r), cylinder(0, H - 25, 0, 25, 50), ...tripod];
    }
    default:
      return [box(0, H / 2, 0, L, H, W)];
  }
}

interface FurnitureBodyProps {
  style: VehicleBodyStyle;
  model: VehicleModel;
  material: THREE.Material;
}

export function FurnitureBody({ style, model, material }: FurnitureBodyProps) {
  const parts = useMemo(() => furnitureParts(style, model), [style, model]);
  return (
    <>
      {parts.map((p, i) => (
        <mesh key={i} position={p.position} rotation={p.kind === 'sphere' ? undefined : p.rotation} material={material} castShadow receiveShadow>
          {p.kind === 'box' && <boxGeometry args={p.size} />}
          {p.kind === 'cylinder' && <cylinderGeometry args={[p.radius, p.radius, p.height, 32]} />}
          {p.kind === 'sphere' && <sphereGeometry args={[p.radius, 32, 24]} />}
        </mesh>
      ))}
    </>
  );
}
