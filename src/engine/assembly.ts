import type { DerivedModel, HardwareItem, Member, ProjectState, Vec3 } from '@/types';
import { WALL_IDS } from '@/types';
import { freePostIdOf } from './freePosts';

/**
 * Assembly sequence: the generated members and panels grouped into build steps, in the order a
 * post-and-purlin structure goes up (posts → purlins → braces → rafters → roof → infill walls →
 * floor → cladding → doors / windows).
 *
 * Step keys are built from stable names (wall ids, purlin row keys, partition ids), never from member
 * ids: those are counters that renumber whenever a parameter changes, so a saved custom order must
 * not depend on them.
 */
export type AssemblyStage =
  | 'posts'
  | 'purlin'
  | 'braces'
  | 'rafters'
  | 'roof'
  | 'wall-base'
  | 'wall-studs'
  | 'wall-top'
  | 'wall-openings'
  | 'floor-bearers'
  | 'floor-joists'
  | 'floor-deck'
  | 'cladding'
  | 'fixtures'
  | 'other';

export interface AssemblyStep {
  key: string;
  stage: AssemblyStage;
  /** English title template with a `{where}` placeholder when `where` is set */
  title: string;
  /** English location ("front row", "left wall") or a partition label */
  where?: string;
  /** English instruction for the step */
  instruction: string;
  memberIds: string[];
  panelIds: string[];
  /** Doors and windows are fitted in this step */
  fixtures: boolean;
  /** Ids of the connection hardware used in this step (see `computeConnections`) */
  hardwareIds: string[];
}

/** One stop of the step player: a whole step, or a single piece of it in piece-by-piece mode. */
export interface AssemblyFrame {
  stepIndex: number;
  memberIds: string[];
  panelIds: string[];
  fixtures: boolean;
  /** 1-based position of the piece inside its step; 0 for whole-step frames */
  piece: number;
  pieces: number;
}

interface StageInfo {
  title: string;
  instruction: string;
  hardwareIds: string[];
}

const STAGES: Record<AssemblyStage, StageInfo> = {
  posts: {
    title: 'Posts – {where}',
    instruction: 'Set out the post positions, fix the post bases, then stand the posts plumb and hold each one with two temporary diagonal props.',
    hardwareIds: ['post-base', 'anchor', 'post-bolt'],
  },
  purlin: {
    title: 'Purlin – {where}',
    instruction: 'Lift the purlin onto the post heads, check it is level along the row and fix it to every post. Join purlin pieces over a post.',
    hardwareIds: ['bracket', 'bracket-nails', 'splice-bolt', 'splice-plate'],
  },
  braces: {
    title: 'Knee braces – {where}',
    instruction: 'Fit the knee braces between post and purlin while the posts are still propped plumb. The temporary props of this row can come off afterwards.',
    hardwareIds: ['brace-screws'],
  },
  rafters: {
    title: 'Rafters',
    instruction: 'Mark the rafter spacing on the purlins, seat every rafter with its birdsmouth on the purlins and fix it at each bearing. Start with the two outer rafters and stretch a string line between them.',
    hardwareIds: ['rafter-anchor', 'rafter-anchor-nails', 'rafter-screw'],
  },
  roof: {
    title: 'Roof covering',
    instruction: 'Lay the roof deck and covering from the eave upwards. Close the roof before building the walls so the timber stays dry.',
    hardwareIds: ['roof-screws', 'roof-nails', 'deck-screws', 'batten-nails'],
  },
  'wall-base': {
    title: 'Bottom plate – {where}',
    instruction: 'Lay the bottom plate on a damp-proof strip between the posts, check it is straight and anchor it to the base.',
    hardwareIds: ['plate-anchor'],
  },
  'wall-studs': {
    title: 'Studs – {where}',
    instruction: 'Stand the end studs against the posts first, then the studs at their marked spacing and the full-height studs beside each opening. Check every stud for plumb before fixing.',
    hardwareIds: ['stud-screws', 'end-stud-bracket'],
  },
  'wall-top': {
    title: 'Top rail – {where}',
    instruction: 'Fix the top rail over the stud heads and tie it to the posts.',
    hardwareIds: ['side-post-screws', 'stud-screws'],
  },
  'wall-openings': {
    title: 'Opening framing – {where}',
    instruction: 'Frame the openings from the bottom up: short supporting studs, window sill, header, then the short studs above and below.',
    hardwareIds: ['header-screws'],
  },
  'floor-bearers': {
    title: 'Floor bearers',
    instruction: 'Set the floor supports, lay the bearers on them and level the whole layer before fixing.',
    hardwareIds: ['floor-footing', 'floor-pad', 'sleeper-anchor'],
  },
  'floor-joists': {
    title: 'Floor joists',
    instruction: 'Lay the joists at their marked spacing, check the tops are in one plane and fix them at every support.',
    hardwareIds: ['joist-screws'],
  },
  'floor-deck': {
    title: 'Floor deck',
    instruction: 'Lay the floor deck across the joists, leaving an expansion gap at posts and walls.',
    hardwareIds: ['floor-screws'],
  },
  cladding: {
    title: 'Cladding – {where}',
    instruction: 'Clad the wall from the bottom up and cut the boards around the openings. Keep the cladding clear of the ground.',
    hardwareIds: ['cladding-screws'],
  },
  fixtures: {
    title: 'Doors and windows',
    instruction: 'Set the door and window frames plumb and square in their openings, fix them, then hang the leaves and sashes.',
    hardwareIds: ['door-fitting-kit', 'window-fitting-kit'],
  },
  other: {
    title: 'Remaining parts',
    instruction: 'Fit the remaining parts.',
    hardwareIds: [],
  },
};

const BASE_GROUPS = ['Bottom plate', 'Door threshold'];
const TOP_GROUPS = ['Top plate', 'Side rail'];
const OPENING_GROUPS = ['Jack stud', 'Header', 'Cripple stud', 'Window sill'];
const inGroups = (member: Member, groups: string[]): boolean => groups.some((g) => member.group.startsWith(g));

const WALL_STAGES = ['wall-base', 'wall-studs', 'wall-top', 'wall-openings'] as const;

function wallStage(member: Member): (typeof WALL_STAGES)[number] {
  if (inGroups(member, BASE_GROUPS)) return 'wall-base';
  if (inGroups(member, TOP_GROUPS)) return 'wall-top';
  if (inGroups(member, OPENING_GROUPS)) return 'wall-openings';
  return 'wall-studs';
}

const midpoint = (m: Member): Vec3 => ({
  x: m.start.x + m.direction.x * m.length * 0.5,
  y: m.start.y + m.direction.y * m.length * 0.5,
  z: m.start.z + m.direction.z * m.length * 0.5,
});

/** Plan (XZ) distance from a point to a member's axis segment. */
function planDistance(point: Vec3, member: Member): number {
  const dx = member.direction.x * member.length;
  const dz = member.direction.z * member.length;
  const lenSq = dx * dx + dz * dz;
  const along = lenSq > 0 ? Math.min(1, Math.max(0, ((point.x - member.start.x) * dx + (point.z - member.start.z) * dz) / lenSq)) : 0;
  return Math.hypot(point.x - (member.start.x + dx * along), point.z - (member.start.z + dz * along));
}

/** Purlin-row part of a grid post id (`front:1` → `front`). */
const postRowKey = (id: string): string => id.split(':')[0];

/** "front row" for eave rows, "middle row 2" for intermediate ones. */
function rowWhere(rowKey: string, wallId: string | undefined): string {
  if (wallId) return `${wallId} row`;
  const mid = /^mid(\d+)$/.exec(rowKey);
  return mid ? `middle row ${Number(mid[1]) + 1}` : `${rowKey} row`;
}

/** Build the default assembly sequence for a model. Every member and panel lands in exactly one step. */
export function buildAssemblySteps(model: DerivedModel, project: ProjectState): AssemblyStep[] {
  const { members, panels } = model.framing;
  const steps: AssemblyStep[] = [];
  const taken = new Set<string>();
  const push = (key: string, stage: AssemblyStage, where: string | undefined, picked: Member[], panelIds: string[] = [], fixtures = false): void => {
    if (picked.length === 0 && panelIds.length === 0 && !fixtures) return;
    for (const m of picked) taken.add(m.id);
    const info = STAGES[stage];
    steps.push({ key, stage, title: info.title, where, instruction: info.instruction, memberIds: picked.map((m) => m.id), panelIds, fixtures, hardwareIds: info.hardwareIds });
  };

  const structural = members.filter((m) => !m.partitionId);
  const purlins = structural.filter((m) => m.purlinRow !== undefined);
  const gridPosts = structural.filter((m) => m.category === 'post' && !freePostIdOf(m.id));
  const braces = structural.filter((m) => m.category === 'brace');
  const rowKeys = [...new Set(purlins.map((m) => m.purlinRow as string))];
  const braceRow = new Map<string, string>();
  for (const brace of braces) {
    const at = midpoint(brace);
    let best: Member | undefined;
    let bestDistance = Infinity;
    for (const purlin of purlins) {
      const d = planDistance(at, purlin);
      if (d < bestDistance) {
        bestDistance = d;
        best = purlin;
      }
    }
    if (best) braceRow.set(brace.id, best.purlinRow as string);
  }

  // One post-and-purlin row at a time, so each row is braced before the next one goes up
  for (const row of rowKeys) {
    const rowPurlins = purlins.filter((m) => m.purlinRow === row);
    const where = rowWhere(row, rowPurlins[0]?.wallId);
    push(`posts:${row}`, 'posts', where, gridPosts.filter((m) => postRowKey(m.id) === row));
    push(`purlin:${row}`, 'purlin', where, rowPurlins);
    push(`braces:${row}`, 'braces', where, braces.filter((m) => braceRow.get(m.id) === row));
  }
  // Posts that carry no purlin: intermediate posts of closed walls, then the freely placed ones
  for (const key of [...new Set(gridPosts.filter((m) => !taken.has(m.id)).map((m) => postRowKey(m.id)))]) {
    const rowPosts = gridPosts.filter((m) => !taken.has(m.id) && postRowKey(m.id) === key);
    push(`posts:${key}`, 'posts', rowPosts[0].wallId ? `${rowPosts[0].wallId} wall` : `${key} row`, rowPosts);
  }
  push('posts:free', 'posts', 'free-standing', structural.filter((m) => m.category === 'post' && !taken.has(m.id)));
  push('braces:other', 'braces', 'remaining', braces.filter((m) => !taken.has(m.id)));

  push('rafters', 'rafters', undefined, structural.filter((m) => m.category === 'rafter'));
  push('roof', 'roof', undefined, [], panels.filter((p) => p.kind === 'roof').map((p) => p.id));

  for (const wallId of WALL_IDS) {
    const wallMembers = structural.filter((m) => m.wallId === wallId && !taken.has(m.id) && m.category !== 'rafter' && m.category !== 'joist' && m.category !== 'bearer');
    for (const stage of WALL_STAGES) push(`wall:${wallId}:${stage}`, stage, `${wallId} wall`, wallMembers.filter((m) => wallStage(m) === stage));
  }
  for (const partition of project.partitions) {
    const own = members.filter((m) => m.partitionId === partition.id);
    for (const stage of WALL_STAGES) push(`partition:${partition.id}:${stage}`, stage, partition.label, own.filter((m) => wallStage(m) === stage));
  }

  push('floor:bearers', 'floor-bearers', undefined, members.filter((m) => m.category === 'bearer' && !taken.has(m.id)));
  push('floor:joists', 'floor-joists', undefined, members.filter((m) => m.category === 'joist' && !taken.has(m.id)));
  push('floor:deck', 'floor-deck', undefined, [], panels.filter((p) => p.kind === 'floor').map((p) => p.id));

  for (const panel of panels) {
    if (panel.kind !== 'cladding') continue;
    const partition = panel.partitionId ? project.partitions.find((p) => p.id === panel.partitionId) : undefined;
    const hostKey = panel.wallId ?? panel.partitionId ?? panel.id;
    push(`cladding:${hostKey}`, 'cladding', partition ? partition.label : panel.wallId ? `${panel.wallId} wall` : undefined, [], [panel.id]);
  }

  const hosts = [...WALL_IDS.filter((id) => project.walls[id].closed).map((id) => project.walls[id]), ...project.partitions];
  push('fixtures', 'fixtures', undefined, [], [], hosts.some((h) => h.openings.some((o) => o.type !== 'passage')));

  push('other', 'other', undefined, members.filter((m) => !taken.has(m.id)));
  return steps;
}

/**
 * Arrange the default steps in a saved custom order. Saved keys that no longer exist are dropped;
 * steps the saved order does not know (added since) slot in right after their default predecessor.
 */
export function applyStepOrder(steps: AssemblyStep[], order: readonly string[] | undefined): AssemblyStep[] {
  if (!order || order.length === 0) return steps;
  const byKey = new Map(steps.map((s) => [s.key, s]));
  const result = [...new Set(order)].flatMap((key) => byKey.get(key) ?? []);
  const placed = new Set(result.map((s) => s.key));
  steps.forEach((step, i) => {
    if (placed.has(step.key)) return;
    const previous = i > 0 ? result.findIndex((s) => s.key === steps[i - 1].key) : -1;
    result.splice(previous + 1, 0, step);
    placed.add(step.key);
  });
  return result;
}

/** New key order with the step at `from` moved to `to` (both clamped). */
export function moveStepKey(keys: readonly string[], from: number, to: number): string[] {
  const next = [...keys];
  if (from < 0 || from >= next.length) return next;
  const [key] = next.splice(from, 1);
  next.splice(Math.min(Math.max(to, 0), next.length), 0, key);
  return next;
}

/** Pieces of a step in a buildable order: bottom-up, then along the step's longest plan direction. */
function orderPieces(ids: string[], byId: Map<string, Member>): string[] {
  const entries = ids.flatMap((id) => {
    const member = byId.get(id);
    return member ? [{ id, at: midpoint(member), base: Math.round(Math.min(member.start.y, member.start.y + member.direction.y * member.length) / 50) }] : [];
  });
  const span = (axis: 'x' | 'z'): number => Math.max(...entries.map((e) => e.at[axis])) - Math.min(...entries.map((e) => e.at[axis]));
  const [main, cross] = entries.length && span('z') > span('x') ? (['z', 'x'] as const) : (['x', 'z'] as const);
  return entries.sort((a, b) => a.base - b.base || a.at[main] - b.at[main] || a.at[cross] - b.at[cross]).map((e) => e.id);
}

/** Player stops for a step sequence: one per step, or one per piece when `pieceMode` is on. */
export function buildAssemblyFrames(steps: AssemblyStep[], members: Member[], pieceMode: boolean): AssemblyFrame[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  return steps.flatMap((step, stepIndex): AssemblyFrame[] => {
    const whole: AssemblyFrame = { stepIndex, memberIds: step.memberIds, panelIds: step.panelIds, fixtures: step.fixtures, piece: 0, pieces: 0 };
    const pieces = step.memberIds.length + step.panelIds.length;
    if (!pieceMode || pieces <= 1) return [whole];
    const frames: AssemblyFrame[] = [
      ...orderPieces(step.memberIds, byId).map((id) => ({ ...whole, memberIds: [id], panelIds: [] })),
      ...step.panelIds.map((id) => ({ ...whole, memberIds: [], panelIds: [id] })),
    ];
    return frames.map((frame, i) => ({ ...frame, fixtures: step.fixtures && i === frames.length - 1, piece: i + 1, pieces: frames.length }));
  });
}

export interface AssemblyProgress {
  /** Fitted in an earlier stop */
  installed: Set<string>;
  /** Being fitted at this stop */
  current: Set<string>;
  /** Doors and windows are in (or going in at this stop) */
  fixtures: boolean;
}

/** Which member / panel ids are already built and which go in at frame `index`. */
export function assemblyProgress(frames: AssemblyFrame[], index: number): AssemblyProgress {
  const installed = new Set<string>();
  let fixtures = false;
  frames.slice(0, Math.max(index, 0)).forEach((frame) => {
    for (const id of frame.memberIds) installed.add(id);
    for (const id of frame.panelIds) installed.add(id);
    fixtures ||= frame.fixtures;
  });
  const at = frames[index];
  return { installed, current: new Set(at ? [...at.memberIds, ...at.panelIds] : []), fixtures: fixtures || Boolean(at?.fixtures) };
}

/**
 * Split the project's hardware quantities over the steps that use them, by the number of pieces
 * each step fits. Exact for per-piece hardware (post bases, rafter anchors); an estimate where
 * several kinds of step share one item, so the shares are rounded up.
 */
export function stepHardwareShares(steps: AssemblyStep[], hardware: HardwareItem[]): Map<string, { item: HardwareItem; quantity: number }[]> {
  const weight = (step: AssemblyStep): number => Math.max(step.memberIds.length + step.panelIds.length, 1);
  const shares = new Map<string, { item: HardwareItem; quantity: number }[]>(steps.map((s) => [s.key, []]));
  for (const item of hardware) {
    const users = steps.filter((s) => s.hardwareIds.includes(item.id));
    const total = users.reduce((sum, s) => sum + weight(s), 0);
    for (const step of users) shares.get(step.key)!.push({ item, quantity: Math.ceil((item.quantity * weight(step)) / total) });
  }
  return shares;
}
