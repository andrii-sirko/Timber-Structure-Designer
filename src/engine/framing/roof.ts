import type { FramingWarning, Member, Panel, ProfilePoint, RoofGeometry, StructureParams } from '@/types';
import { nextId, X_AXIS } from '../geometry';
import { ROOF_COVERING_LOAD } from '../statics/materials';
import type { RoofLines } from './roofLines';

export interface RoofBuild {
  rafters: Member[];
  panel: Panel;
  geometry: RoofGeometry;
}

/**
 * Generates the rafters (Sparren) of the monopitch roof, including plumb end cuts and
 * birdsmouth notches (Kerven) over both purlins, plus the roof deck panel.
 */
export function generateRoof(params: StructureParams, roof: RoofLines, warnings: FramingWarning[]): RoofBuild {
  const { timber, overhangs } = params;
  const rw = timber.rafter.width;
  const rh = timber.rafter.height;
  const bw = timber.beam.width;

  const z0 = -overhangs.front;
  const z1 = params.width + overhangs.rear;
  const run = z1 - z0;
  const rafterLength = run / roof.cos;

  const xStart = -overhangs.left + rw / 2;
  const xEnd = params.length + overhangs.right - rw / 2;
  const roofWidth = params.length + overhangs.left + overhangs.right;
  const rafterCount = Math.max(2, Math.ceil((xEnd - xStart) / Math.max(params.maxRafterSpacing, 200)) + 1);
  const rafterSpacing = rafterCount > 1 ? (xEnd - xStart) / (rafterCount - 1) : 0;

  // Local frame of a rafter: direction down the slope, up perpendicular to the roof plane
  const direction = { x: 0, y: -roof.sin, z: roof.cos };
  const up = { x: 0, y: roof.cos, z: roof.sin };
  const plumbHalf = rh / 2 / roof.cos;
  const yAxisAt = (z: number): number => roof.bottomAt(z) + plumbHalf;

  const profile = buildRafterProfile(params, roof, z0, z1, warnings);
  const notes =
    roof.birdsmouth > 0
      ? `2× birdsmouth (Kerve) ${roof.birdsmouth} mm deep, seat ${bw} mm`
      : 'Flat – no birdsmouth';

  const rafters: Member[] = [];
  for (let i = 0; i < rafterCount; i++) {
    const x = xStart + i * rafterSpacing;
    rafters.push({
      id: nextId('rafter'),
      category: 'rafter',
      name: `Rafter ${i + 1}`,
      nameDe: 'Sparren',
      group: 'Rafter (Sparren)',
      section: { width: rw, height: rh },
      length: Math.round(rafterLength),
      start: { x, y: yAxisAt(z0), z: z0 },
      direction,
      up,
      cuts: { start: round1(roof.pitchDeg), end: round1(roof.pitchDeg) },
      profile,
      notes,
    });
  }

  const covering = ROOF_COVERING_LOAD[params.loads.roofCovering];
  const zMid = (z0 + z1) / 2;
  const topMid = roof.topAt(zMid);
  const th = covering.thickness;
  const panel: Panel = {
    id: 'roof-deck',
    kind: 'roof',
    anchor: {
      x: (-overhangs.left + params.length + overhangs.right) / 2,
      y: topMid + (up.y * th) / 2,
      z: zMid + (up.z * th) / 2,
    },
    direction: X_AXIS,
    up: { x: 0, y: -roof.sin, z: roof.cos },
    normal: up,
    size: [roofWidth, rafterLength, th],
    areaM2: (roofWidth / 1000) * (rafterLength / 1000),
  };

  const geometry: RoofGeometry = {
    pitchDeg: roof.pitchDeg,
    pitchRad: roof.alpha,
    birdsmouthDepth: roof.birdsmouth,
    rafterCount,
    rafterSpacing: Math.round(rafterSpacing),
    rafterRun: run,
    rafterLength: Math.round(rafterLength),
    ridgeHeight: Math.round(roof.topAt(z0) + th / roof.cos),
    eaveHeight: Math.round(roof.bottomAt(z1)),
    areaM2: panel.areaM2,
  };

  return { rafters, panel, geometry };
}

/**
 * Rafter outline in local (u, v) coordinates. Walks the bottom edge from the front plumb cut
 * to the rear plumb cut, inserting the birdsmouth triangles, then returns along the top edge.
 */
function buildRafterProfile(
  params: StructureParams,
  roof: RoofLines,
  z0: number,
  z1: number,
  warnings: FramingWarning[],
): ProfilePoint[] {
  const rh = params.timber.rafter.height;
  const bw = params.timber.beam.width;
  const plumbHalf = rh / 2 / roof.cos;
  const yAxis0 = roof.bottomAt(z0) + plumbHalf;
  const d = { y: -roof.sin, z: roof.cos };
  const n = { y: roof.cos, z: roof.sin };
  const toLocal = (z: number, y: number): ProfilePoint => {
    const dy = y - yAxis0;
    const dz = z - z0;
    return { u: dy * d.y + dz * d.z, v: dy * n.y + dz * n.z };
  };

  const bottom: ProfilePoint[] = [];
  bottom.push(toLocal(z0, roof.bottomAt(z0)));

  if (roof.birdsmouth > 0 && roof.sin > 1e-4) {
    // The notch is the purlin rectangle cut out of the rafter: a plumb face on the purlin's
    // downhill side, a level seat on the purlin top and – if the rafter underside is still below
    // the purlin top at the uphill face – a second plumb face there (never beyond the purlin).
    const seatRun = roof.birdsmouth / roof.sin;
    const purlins = [
      { z: roof.frontPurlinZ, top: params.frontHeight },
      { z: roof.rearPurlinZ, top: params.rearHeight },
    ];
    let lastZ = z0;
    for (const p of purlins) {
      const zDown = p.z + bw / 2;
      const zUp = Math.max(p.z - bw / 2, lastZ + 5);
      if (zUp >= zDown - 5) {
        warnings.push({ level: 'warning', message: 'Birdsmouth could not be placed – purlin overlaps the previous notch or the rafter end.' });
        continue;
      }
      const yUp = roof.bottomAt(zUp);
      if (yUp < p.top) {
        // rafter underside is below the purlin top over the whole purlin width → two plumb faces
        if (zUp <= z0 + 5) {
          bottom.length = 0;
          bottom.push(toLocal(z0, p.top));
        } else {
          bottom.push(toLocal(zUp, yUp));
          bottom.push(toLocal(zUp, p.top));
        }
      } else {
        // seat starts where the underside crosses the purlin top (inside the purlin width)
        const zSeat = Math.max(zDown - seatRun, zUp);
        bottom.push(toLocal(zSeat, p.top));
      }
      bottom.push(toLocal(zDown, p.top));
      bottom.push(toLocal(zDown, roof.bottomAt(zDown)));
      lastZ = zDown;
    }
  }

  bottom.push(toLocal(z1, roof.bottomAt(z1)));
  const top: ProfilePoint[] = [toLocal(z1, roof.topAt(z1)), toLocal(z0, roof.topAt(z0))];
  return [...bottom, ...top];
}

function round1(value: number): number {
  return Math.round(Math.abs(value) * 10) / 10;
}
