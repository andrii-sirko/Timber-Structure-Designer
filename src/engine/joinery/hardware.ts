import type { CurbPiece, Footing, FramingResult, HardwareLayout, HoldDownFixture, Member, PostBracket, ProjectState, RafterAnchor, RoofTrim, StaticsResult, StrapRun, StructureParams, Vec3, WallId } from '@/types';
import { WALL_IDS } from '@/types';
import { add, cross, dot, len, normalize, scale, sub, Y_AXIS } from '../geometry';
import { computeRoofLines, type RoofLines } from '../framing/roofLines';
import { computeWallFrame, wallExtent, type WallFrame } from '../framing/wallFrame';
import { roofStrapBays, STRAP, wallStraps } from '../framing/straps';
import { bracedSegments } from '../statics/shearWalls';
import { concreteTopLevel, plateBottomLevel } from '../build';
import { canonicalToWorldMap, mapPos, mapVec, type GroundMap } from '../orientation';
import { isBottomPlate } from './anchors';

/**
 * Where the steel hardware the statics and the connections list size goes, so the 3D view can draw
 * it: strap crosses on braced walls and in the roof plane, hold-downs, purlin → post angle brackets,
 * rafter anchors, roof edge trims and the concrete under the posts and walls.
 *
 * Laid out in the canonical frame (`hardwareLayout`) and rotated into world space with the framing
 * (`hardwareToWorld`). Every item names the members / panels it is fixed to (`hostIds`), so the
 * assembly guide can show it together with them.
 */

/** Clear room a bracket leg needs under the purlin beside the post (mm). */
const BRACKET_LEG = 90;
const BRACKET_WIDTH = 65;
/** Height the trim apron reaches below the covering underside (mm). */
const TRIM_APRON = 60;
const EPS = 1;

const horizontal = (v: Vec3): Vec3 => normalize({ x: v.x, y: 0, z: v.z });
const isPurlin = (m: Member): boolean => m.group.startsWith('Purlin');
const outerMembers = (members: Member[], id: WallId): Member[] => members.filter((m) => m.wallId === id && !m.partitionId);

/** Along-wall coordinate of a point (mm). */
const alongWall = (frame: WallFrame, p: Vec3): number => dot(sub(p, frame.origin), frame.u);

/** Plan geometry of a straight member: start, horizontal unit direction and plan length. */
function planLine(m: Member): { s: Vec3; d: Vec3; length: number } {
  const d = horizontal(m.direction);
  return { s: m.start, d, length: m.length * len({ x: m.direction.x, y: 0, z: m.direction.z }) };
}

/** Height of a member's axis above a plan point that lies on its plan line. */
function axisYAt(m: Member, p: Vec3): number {
  const h = len({ x: m.direction.x, y: 0, z: m.direction.z });
  const t = h > 1e-9 ? dot(sub(p, m.start), horizontal(m.direction)) / h : 0;
  return m.start.y + m.direction.y * t;
}

/** Top (+1) or underside (−1) of a member, plumb above a plan point on its axis. */
const faceYAt = (m: Member, p: Vec3, side: 1 | -1): number => axisYAt(m, p) + (side * m.section.height) / 2 / Math.max(Math.abs(m.up.y), 0.2);

/** Half the plan extent of a vertical member's section along a horizontal unit vector. */
function halfExtent(m: Member, along: Vec3): number {
  const wAxis = normalize(cross(m.direction, m.up));
  return (Math.abs(dot(m.up, along)) * m.section.height + Math.abs(dot(wAxis, along)) * m.section.width) / 2;
}

function wallStrapRuns(project: ProjectState, frames: Record<WallId, WallFrame>, members: Member[]): StrapRun[] {
  const { params } = project;
  const sd = params.timber.stud.height;
  const base = plateBottomLevel(params);
  const out: StrapRun[] = [];
  for (const id of WALL_IDS) {
    const straps = wallStraps(id, project.walls[id], params);
    if (!straps) continue;
    const frame = frames[id];
    const n = -frame.axisInset + sd / 2 + STRAP.thickness / 2;
    const hostIds = outerMembers(members, id).filter((m) => m.category === 'stud').map((m) => m.id);
    for (const c of straps.crosses) {
      const p = (u: number, v: number) => frame.toWorld(u, v, n);
      out.push({ a: p(c.start, base), b: p(c.end, frame.studTopAt(c.end)), normal: frame.normal, plane: 'wall', hostIds });
      out.push({ a: p(c.start, frame.studTopAt(c.start)), b: p(c.end, base), normal: frame.normal, plane: 'wall', hostIds });
    }
  }
  return out;
}

function roofStrapRuns(params: StructureParams, framing: FramingResult, roof: RoofLines, statics: StaticsResult | undefined): StrapRun[] {
  const out: StrapRun[] = [];
  const rafterIds = framing.members.filter((m) => m.category === 'rafter').map((m) => m.id);
  const pw = params.timber.post.width;
  const normal = { x: 0, y: roof.cos, z: roof.sin };
  const at = (x: number, z: number): Vec3 => add({ x, y: roof.topAt(z), z }, scale(normal, STRAP.thickness / 2));
  for (const f of statics?.checks.flatMap((c) => c.fittings ?? []) ?? []) {
    if (f.kind !== 'roof-straps') continue;
    // crosses between the outer post axes, in the plane of the rafter tops
    const x0 = pw / 2;
    const x1 = params.length - pw / 2;
    const z0 = roof.frontPurlinZ;
    const z1 = roof.rearPurlinZ;
    const bays = f.bays.length > 0 ? f.bays : roofStrapBays(f.axis, params, framing.grid);
    for (const bay of bays) {
      for (let k = 0; k < f.strapsPerDiagonal; k++) {
        // side-by-side straps of one diagonal sit a strap width apart
        const shift = (k - (f.strapsPerDiagonal - 1) / 2) * (STRAP.width + 10);
        if (f.axis === 'z') {
          const a = Math.max(bay.start, x0) + shift;
          const b = Math.min(bay.end, x1) + shift;
          out.push({ a: at(a, z0), b: at(b, z1), normal, plane: 'roof', hostIds: rafterIds });
          out.push({ a: at(a, z1), b: at(b, z0), normal, plane: 'roof', hostIds: rafterIds });
        } else {
          const a = Math.max(bay.start, z0) + shift;
          const b = Math.min(bay.end, z1) + shift;
          out.push({ a: at(x0, a), b: at(x1, b), normal, plane: 'roof', hostIds: rafterIds });
          out.push({ a: at(x1, a), b: at(x0, b), normal, plane: 'roof', hostIds: rafterIds });
        }
      }
    }
  }
  return out;
}

function holdDownFixtures(project: ProjectState, frames: Record<WallId, WallFrame>, members: Member[], statics: StaticsResult | undefined): HoldDownFixture[] {
  const { params } = project;
  const sw = params.timber.stud.width;
  const sd = params.timber.stud.height;
  const base = plateBottomLevel(params);
  const walls = new Set(statics?.checks.flatMap((c) => c.fittings ?? []).flatMap((f) => (f.kind === 'hold-down' ? [f.wallId] : [])) ?? []);
  const out: HoldDownFixture[] = [];
  for (const id of WALL_IDS) {
    if (!walls.has(id)) continue;
    const frame = frames[id];
    const studs = outerMembers(members, id).filter((m) => m.category === 'stud' && Math.abs(m.direction.y) > 0.9);
    const inward = scale(frame.normal, -1);
    for (const seg of bracedSegments(id, project.walls[id], params)) {
      for (const u of [seg.start + sw / 2, seg.end - sw / 2]) {
        // the full-height stud standing nearest to the end of the stretch
        const host = studs.reduce<Member | undefined>((best, s) => (!best || Math.abs(alongWall(frame, s.start) - u) < Math.abs(alongWall(frame, best.start) - u) ? s : best), undefined);
        const at = host ? alongWall(frame, host.start) : u;
        out.push({ position: frame.toWorld(at, base, -frame.axisInset - sd / 2), inward, along: frame.u, hostIds: host ? [host.id] : [] });
      }
    }
  }
  return out;
}

function postBrackets(members: Member[]): PostBracket[] {
  const purlins = members.filter(isPurlin);
  const out: PostBracket[] = [];
  for (const post of members.filter((m) => m.category === 'post')) {
    const top = post.start.y + post.length;
    // every purlin piece over the post head (two where the purlin is spliced over it)
    const over = purlins.filter((p) => {
      const { s, d, length } = planLine(p);
      const rel = sub({ ...post.start, y: s.y }, s);
      const t = dot(rel, d);
      return t > -EPS && t < length + EPS && len(sub(rel, scale(d, t))) < p.section.width / 2 && Math.abs(faceYAt(p, post.start, -1) - top) < 150;
    });
    if (over.length === 0) continue;
    const d = planLine(over[0]).d;
    const half = halfExtent(post, d);
    const across = normalize(cross(Y_AXIS, d));
    const faceWidth = 2 * halfExtent(post, across);
    /** The piece reaching at least a bracket leg past the post face on that side */
    const pieceOn = (side: 1 | -1): Member | undefined =>
      over.find((p) => {
        const l = planLine(p);
        const t = dot(sub(post.start, l.s), d) * Math.sign(dot(l.d, d));
        return (side > 0 ? l.length - t - half : t - half) >= BRACKET_LEG - EPS;
      });
    // the horizontal leg needs purlin underside beside the post; without it both go on the other side
    const sides: (1 | -1)[] = pieceOn(1) && pieceOn(-1) ? [1, -1] : pieceOn(1) ? [1, 1] : pieceOn(-1) ? [-1, -1] : [1, -1];
    const paired = sides[0] === sides[1];
    const width = paired ? Math.min(BRACKET_WIDTH, faceWidth / 2 - 4) : Math.min(BRACKET_WIDTH, faceWidth);
    sides.forEach((side, i) => {
      const purlin = pieceOn(side) ?? over[0];
      const outward = scale(d, side);
      const centre = add(post.start, scale(outward, half));
      const shift = paired ? (i === 0 ? -1 : 1) * (faceWidth / 4) : 0;
      const position = add({ ...centre, y: faceYAt(purlin, centre, -1) }, scale(across, shift));
      out.push({ position, outward, across, width, hostIds: [purlin.id] });
    });
  }
  return out;
}

function rafterAnchors(members: Member[], perBearing: number): RafterAnchor[] {
  const purlins = members.filter(isPurlin);
  const rafters = members.filter((m) => m.category === 'rafter');
  const seen = new Set<string>();
  const out: RafterAnchor[] = [];
  rafters.forEach((rafter, index) => {
    const r = planLine(rafter);
    for (const purlin of purlins) {
      const p = planLine(purlin);
      // plan intersection of the two axes: r.s + a·r.d = p.s + b·p.d
      const det = r.d.x * -p.d.z - r.d.z * -p.d.x;
      if (Math.abs(det) < 1e-6) continue;
      const w = sub(p.s, r.s);
      const a = (w.x * -p.d.z - w.z * -p.d.x) / det;
      const b = (r.d.x * w.z - r.d.z * w.x) / det;
      if (a < -EPS || a > r.length + EPS || b < -EPS || b > p.length + EPS) continue;
      const point = add(r.s, scale(r.d, a));
      const key = `${Math.round(point.x)}:${Math.round(point.z)}`;
      if (seen.has(key)) continue; // spliced rafter pieces meet over the purlin
      seen.add(key);
      const topY = faceYAt(purlin, point, 1);
      const flankAxis = normalize(cross(Y_AXIS, r.d));
      const faceAxis = normalize(cross(p.d, Y_AXIS));
      // one anchor alternating left / right from rafter to rafter, or one on each flank
      const sides: [number, number][] = perBearing >= 2 ? [[1, 1], [-1, -1]] : [[index % 2 === 0 ? 1 : -1, 1]];
      for (const [sf, sp] of sides) {
        const flank = scale(flankAxis, sf);
        const face = scale(faceAxis, sp);
        const position = add(add({ ...point, y: topY }, scale(flank, rafter.section.width / 2)), scale(face, purlin.section.width / 2));
        out.push({ position, flank, face, hostIds: [rafter.id] });
      }
    }
  });
  return out;
}

function roofTrims(project: ProjectState, framing: FramingResult): RoofTrim[] {
  const panel = framing.panels.find((p) => p.kind === 'roof');
  if (!panel?.size) return [];
  const [a, b, th] = panel.size;
  const top = add(panel.anchor, scale(panel.normal, th / 2));
  const u = panel.direction;
  const v = panel.up;
  const at = (su: number, sv: number): Vec3 => add(add(top, scale(u, (su * a) / 2)), scale(v, (sv * b) / 2));
  const drop = th + TRIM_APRON;
  const hostIds = [panel.id];
  // the edge of v = ±b/2 lying lower is the eave
  const lowSide = at(0, 1).y <= at(0, -1).y ? 1 : -1;
  const out: RoofTrim[] = [
    { kind: 'eave', start: at(-1, lowSide), end: at(1, lowSide), inward: scale(v, -lowSide), normal: panel.normal, drop, hostIds },
    { kind: 'top', start: at(-1, -lowSide), end: at(1, -lowSide), inward: scale(v, lowSide), normal: panel.normal, drop, hostIds },
    { kind: 'verge', start: at(-1, -1), end: at(-1, 1), inward: u, normal: panel.normal, drop, hostIds },
    { kind: 'verge', start: at(1, -1), end: at(1, 1), inward: scale(u, -1), normal: panel.normal, drop, hostIds },
  ];
  // bitumen shingles close the edges with their own drip strips only along the eave and verges
  return project.params.loads.roofCovering === 'bitumen-shingles' ? out.filter((t) => t.kind !== 'top') : out;
}

function foundations(project: ProjectState, frames: Record<WallId, WallFrame>, members: Member[]): { footings: Footing[]; curbs: CurbPiece[] } {
  const { params } = project;
  const { build, loads } = params;
  const size = loads.postFootingDiameter ?? 0;
  const depth = loads.postFootingDepth ?? 0;
  const concrete = concreteTopLevel(params);
  const footings: Footing[] =
    size > 0 && depth > 0
      ? members
          .filter((m) => m.category === 'post')
          .map((m) => {
            // on falling ground the post foot sits lower, and its concrete with it
            const topY = Math.min(concrete, m.start.y - build.baseGap);
            return { shape: build.footingShape, top: { x: m.start.x, y: topY, z: m.start.z }, size, height: topY + depth, hostIds: [m.id] };
          })
      : [];
  const curbs: CurbPiece[] = [];
  if (build.wallBase === 'curb') {
    for (const id of WALL_IDS) {
      const wall = project.walls[id];
      if (!wall.closed) continue;
      const frame = frames[id];
      const ext = wallExtent(wall, frame.length);
      const hostIds = outerMembers(members, id).filter(isBottomPlate).map((m) => m.id);
      curbs.push({
        top: frame.toWorld((ext.start + ext.end) / 2, build.curbTop),
        direction: frame.u,
        length: ext.end - ext.start,
        width: build.curbWidth,
        height: build.curbHeight,
        hostIds,
      });
    }
  }
  return { footings, curbs };
}

/** Hardware layout of a canonical project and its canonical framing / statics. */
export function hardwareLayout(project: ProjectState, framing: FramingResult, statics?: StaticsResult): HardwareLayout {
  const { params } = project;
  const roof = computeRoofLines(params);
  const frames = Object.fromEntries(WALL_IDS.map((id) => [id, computeWallFrame(id, params, project.walls[id], roof, framing.grid)])) as Record<WallId, WallFrame>;
  const members = framing.members;
  return {
    straps: [...wallStrapRuns(project, frames, members), ...roofStrapRuns(params, framing, roof, statics)],
    holdDowns: holdDownFixtures(project, frames, members, statics),
    brackets: params.build.purlinPostConnector === 'angle-brackets' ? postBrackets(members) : [],
    rafterAnchors: params.connectionMode === 'hardware' ? rafterAnchors(members, params.build.rafterAnchorsPerBearing) : [],
    trims: roofTrims(project, framing),
    ...foundations(project, frames, members),
  };
}

/** Rotates a canonical layout into world space (see `framingToWorld`). */
export function hardwareToWorld(layout: HardwareLayout, params: StructureParams): HardwareLayout {
  const m: GroundMap = canonicalToWorldMap(params.roofDirection, params.length, params.width);
  const p = (v: Vec3) => mapPos(m, v);
  const d = (v: Vec3) => mapVec(m, v);
  return {
    straps: layout.straps.map((s) => ({ ...s, a: p(s.a), b: p(s.b), normal: d(s.normal) })),
    holdDowns: layout.holdDowns.map((h) => ({ ...h, position: p(h.position), inward: d(h.inward), along: d(h.along) })),
    brackets: layout.brackets.map((b) => ({ ...b, position: p(b.position), outward: d(b.outward), across: d(b.across) })),
    rafterAnchors: layout.rafterAnchors.map((r) => ({ ...r, position: p(r.position), flank: d(r.flank), face: d(r.face) })),
    trims: layout.trims.map((t) => ({ ...t, start: p(t.start), end: p(t.end), inward: d(t.inward), normal: d(t.normal) })),
    footings: layout.footings.map((f) => ({ ...f, top: p(f.top) })),
    curbs: layout.curbs.map((c) => ({ ...c, top: p(c.top), direction: d(c.direction) })),
  };
}
