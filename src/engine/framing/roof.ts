import type { FramingWarning, Member, Panel, ProfilePoint, RoofGeometry, StructureParams } from '@/types';
import { nextId, rectProfile, X_AXIS, Y_AXIS } from '../geometry';
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
  if (roof.scheme === 'sloped-purlins') return generateLevelRoof(params, roof, warnings);
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

  // Split points: the rafters are cut plumb over each intermediate purlin axis
  const splits = [z0, ...roof.midPurlinZ, z1];
  const pieces = splits.slice(0, -1).map((za, k) => ({ za, zb: splits[k + 1] }));
  const rafterPieceLength = Math.max(...pieces.map((p) => (p.zb - p.za) / roof.cos));
  if (rafterPieceLength > params.maxRafterLength + 1) {
    warnings.push({
      level: 'warning',
      message: `Rafter piece ${Math.round(rafterPieceLength)} mm exceeds the max rafter length ${params.maxRafterLength} mm – the split is kept clear of the eave purlins; reduce the overhang or the width.`,
    });
  }
  const profiles = pieces.map((p) => buildRafterProfile(params, roof, p.za, p.zb, warnings));
  const notes =
    roof.birdsmouth > 0
      ? `${roof.purlins.length}× birdsmouth (Kerve) ${roof.birdsmouth} mm deep, seat ${bw} mm`
      : 'Flat – no birdsmouth';
  const spliceNote = pieces.length > 1 ? ' – spliced plumb over the mid purlin' : '';

  const rafters: Member[] = [];
  for (let i = 0; i < rafterCount; i++) {
    const x = xStart + i * rafterSpacing;
    pieces.forEach((piece, k) => {
      const length = (piece.zb - piece.za) / roof.cos;
      rafters.push({
        id: nextId('rafter'),
        category: 'rafter',
        name: pieces.length > 1 ? `Rafter ${i + 1} (part ${k + 1})` : `Rafter ${i + 1}`,
        nameDe: 'Sparren',
        group: 'Rafter (Sparren)',
        section: { width: rw, height: rh },
        length: Math.round(length),
        start: { x, y: yAxisAt(piece.za), z: piece.za },
        direction,
        up,
        cuts: { start: round1(roof.pitchDeg), end: round1(roof.pitchDeg) },
        profile: profiles[k],
        notes: notes + spliceNote,
      });
    });
  }

  const battens = roofBattens(params, roof, z0, rafterLength, rafters.map((r) => r.start.x));
  rafters.push(...battens.members);

  const covering = ROOF_COVERING_LOAD[params.loads.roofCovering];
  const zMid = (z0 + z1) / 2;
  // the sheet lies on the battens where there are any
  const topMid = roof.topAt(zMid) + battens.thickness / roof.cos;
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
    midPurlinCount: roof.midPurlinZ.length,
    rafterPieces: pieces.length,
    rafterPieceLength: Math.round(rafterPieceLength),
    ridgeHeight: Math.round(roof.topAt(z0) + (th + battens.thickness) / roof.cos),
    eaveHeight: Math.round(roof.bottomAt(z1)),
    areaM2: panel.areaM2,
  };

  return { rafters, panel, geometry };
}

/**
 * Sloped-purlins scheme: level rafters (Sparren) along X lying on top of the sloped purlins,
 * cut square over each intermediate purlin row, plus the roof deck panel.
 */
function generateLevelRoof(params: StructureParams, roof: RoofLines, warnings: FramingWarning[]): RoofBuild {
  const { timber, overhangs } = params;
  const rw = timber.rafter.width;
  const rh = timber.rafter.height;

  const x0 = -overhangs.left;
  const x1 = params.length + overhangs.right;
  const roofWidth = x1 - x0;
  const z0 = -overhangs.front;
  const z1 = params.width + overhangs.rear;
  const run = z1 - z0;
  const depthSloped = run / roof.cos;

  const zStart = z0 + rw / 2;
  const zEnd = z1 - rw / 2;
  const rafterCount = Math.max(2, Math.ceil((zEnd - zStart) / Math.max(params.maxRafterSpacing, 200)) + 1);
  const rafterSpacing = rafterCount > 1 ? (zEnd - zStart) / (rafterCount - 1) : 0;

  const splits = [x0, ...roof.midPurlinX, x1];
  const pieces = splits.slice(0, -1).map((xa, k) => ({ xa, xb: splits[k + 1] }));
  const rafterPieceLength = Math.max(...pieces.map((p) => p.xb - p.xa));
  if (rafterPieceLength > params.maxRafterLength + 1) {
    warnings.push({
      level: 'warning',
      message: `Rafter piece ${Math.round(rafterPieceLength)} mm exceeds the max rafter length ${params.maxRafterLength} mm – the split is kept clear of the eave purlins; reduce the overhang or the length.`,
    });
  }
  const notes = `Level on sloped purlins – seat bevelled ${roof.pitchDeg.toFixed(1)}°` + (pieces.length > 1 ? ', spliced square over the mid purlin' : '');

  const rafters: Member[] = [];
  for (let i = 0; i < rafterCount; i++) {
    const z = zStart + i * rafterSpacing;
    const y = roof.bottomAt(z) + rh / 2;
    pieces.forEach((piece, k) => {
      const length = piece.xb - piece.xa;
      rafters.push({
        id: nextId('rafter'),
        category: 'rafter',
        name: pieces.length > 1 ? `Rafter ${i + 1} (part ${k + 1})` : `Rafter ${i + 1}`,
        nameDe: 'Sparren',
        group: 'Rafter (Sparren)',
        section: { width: rw, height: rh },
        length: Math.round(length),
        start: { x: piece.xa, y, z },
        direction: X_AXIS,
        up: Y_AXIS,
        cuts: { start: 0, end: 0 },
        profile: rectProfile(length, rh),
        notes,
      });
    });
  }

  const covering = ROOF_COVERING_LOAD[params.loads.roofCovering];
  const zMid = (z0 + z1) / 2;
  const topMid = roof.topAt(zMid);
  const th = covering.thickness;
  const normal = { x: 0, y: roof.cos, z: roof.sin };
  const panel: Panel = {
    id: 'roof-deck',
    kind: 'roof',
    anchor: { x: (x0 + x1) / 2, y: topMid + (normal.y * th) / 2, z: zMid + (normal.z * th) / 2 },
    direction: X_AXIS,
    up: { x: 0, y: -roof.sin, z: roof.cos },
    normal,
    size: [roofWidth, depthSloped, th],
    areaM2: (roofWidth / 1000) * (depthSloped / 1000),
  };

  const geometry: RoofGeometry = {
    pitchDeg: roof.pitchDeg,
    pitchRad: roof.alpha,
    birdsmouthDepth: 0,
    rafterCount,
    rafterSpacing: Math.round(rafterSpacing),
    rafterRun: run,
    rafterLength: Math.round(roofWidth),
    midPurlinCount: roof.midPurlinX.length,
    rafterPieces: pieces.length,
    rafterPieceLength: Math.round(rafterPieceLength),
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

  let lastZ = z0;
  if (roof.birdsmouth > 0 && roof.sin > 1e-4) {
    // The notch is the purlin rectangle cut out of the rafter: a plumb face on the purlin's
    // downhill side, a level seat on the purlin top and – if the rafter underside is still below
    // the purlin top at the uphill face – a second plumb face there (never beyond the purlin).
    // A piece that starts or ends on a mid purlin axis carries half of that notch.
    const seatRun = roof.birdsmouth / roof.sin;
    for (const p of roof.purlins) {
      const zDownRaw = p.z + bw / 2;
      const zUpRaw = p.z - bw / 2;
      if (zDownRaw <= z0 + 5 || zUpRaw >= z1 - 5) continue; // purlin outside this piece
      const zDown = Math.min(zDownRaw, z1);
      const zUp = Math.max(zUpRaw, lastZ + 5);
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
      if (zDown < z1 - 1e-6) bottom.push(toLocal(zDown, roof.bottomAt(zDown)));
      lastZ = zDown;
    }
  }

  if (lastZ < z1 - 1e-6) bottom.push(toLocal(z1, roof.bottomAt(z1)));
  const top: ProfilePoint[] = [toLocal(z1, roof.topAt(z1)), toLocal(z0, roof.topAt(z0))];
  return [...bottom, ...top];
}

function round1(value: number): number {
  return Math.round(Math.abs(value) * 10) / 10;
}

/**
 * Roof battens (Dachlatten) across the fall line on top of rafters that run down the slope – the
 * supports of a trapezoidal sheet. Spacing along the slope ≤ the profile's max span, one row
 * 50 mm in from each edge; battens longer than stock are joined over a rafter.
 */
function roofBattens(params: StructureParams, roof: RoofLines, z0: number, slopeLength: number, rafterX: number[]): { members: Member[]; thickness: number } {
  if (params.loads.roofCovering !== 'trapezoidal-sheet') return { members: [], thickness: 0 };
  const sec = params.build.battenSection;
  const bh = Math.min(sec.width, sec.height); // laid flat
  const bw = Math.max(sec.width, sec.height);
  const { overhangs } = params;
  const xa = -overhangs.left;
  const xb = params.length + overhangs.right;
  const first = 50 + bw / 2;
  const last = slopeLength - 50 - bw / 2;
  const rows = Math.max(2, Math.ceil((last - first) / Math.max(params.build.sheetMaxSpan, 100)) + 1);
  const up = { x: 0, y: roof.cos, z: roof.sin };
  const members: Member[] = [];
  const xs = [...new Set(rafterX.map((x) => Math.round(x)))].sort((a, b) => a - b);
  for (let i = 0; i < rows; i++) {
    const sAlong = first + ((last - first) * i) / (rows - 1);
    const z = z0 + sAlong * roof.cos;
    const yTop = roof.topAt(z);
    // joints over a rafter when a batten is longer than stock
    const cuts: number[] = [xa];
    let cursor = xa;
    while (xb - cursor > params.maxStockLength) {
      const over = xs.filter((x) => x > cursor + 300 && x - cursor <= params.maxStockLength);
      cursor = over.length > 0 ? over[over.length - 1] : cursor + params.maxStockLength;
      cuts.push(cursor);
    }
    cuts.push(xb);
    for (let k = 0; k < cuts.length - 1; k++) {
      const length = cuts[k + 1] - cuts[k];
      members.push({
        id: nextId('batten'),
        category: 'batten',
        name: `Roof batten ${i + 1}${cuts.length > 2 ? ` (part ${k + 1})` : ''}`,
        nameDe: 'Dachlatte',
        group: 'Roof batten (Dachlatte)',
        section: { width: bw, height: bh },
        length: Math.round(length),
        start: { x: cuts[k], y: yTop + (up.y * bh) / 2, z: z + (up.z * bh) / 2 },
        direction: X_AXIS,
        up,
        cuts: { start: 0, end: 0 },
        profile: rectProfile(length, bh),
        notes: cuts.length > 2 ? 'Across the fall line, joined over a rafter' : 'Across the fall line',
      });
    }
  }
  return { members, thickness: bh };
}
