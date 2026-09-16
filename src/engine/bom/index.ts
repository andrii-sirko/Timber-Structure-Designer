import type { BomLine, BomResult, CutListItem, FixtureLine, FramingResult, Member, MemberCategory, Opening, ProjectState } from '@/types';
import { findPreset, frameSizeFor, openingMaterials, presetMatches } from '../framing/openingCatalog';
import { memberVolumeM3 } from '../geometry';
import { MATERIALS, ROOF_COVERING_LOAD } from '../statics/materials';

const CATEGORY_META: Record<MemberCategory, { label: string; labelDe: string; order: number }> = {
  post: { label: 'Posts', labelDe: 'Pfosten', order: 0 },
  beam: { label: 'Purlins & rails', labelDe: 'Pfetten & Rähme', order: 1 },
  rafter: { label: 'Rafters', labelDe: 'Sparren', order: 2 },
  brace: { label: 'Knee braces', labelDe: 'Kopfbänder', order: 3 },
  stud: { label: 'Wall studs', labelDe: 'Ständer', order: 4 },
  plate: { label: 'Bottom plates', labelDe: 'Schwellen', order: 5 },
  header: { label: 'Headers', labelDe: 'Stürze', order: 6 },
  sill: { label: 'Window sills', labelDe: 'Brüstungsriegel', order: 7 },
};

const BOARD_THICKNESS_M = 0.02;
const BOARD_DENSITY = 500;
const WASTE_FACTOR = 1.1;

export function computeBom(project: ProjectState, framing: FramingResult): { bom: BomResult; cutList: CutListItem[] } {
  const density = MATERIALS[project.params.timber.strengthClass].density;

  // ── BOM by category & section ─────────────────────────────────────────
  const byKey = new Map<string, BomLine>();
  for (const m of framing.members) {
    const key = `${m.category}|${m.section.width}x${m.section.height}`;
    const meta = CATEGORY_META[m.category];
    let line = byKey.get(key);
    if (!line) {
      line = {
        category: m.category,
        label: meta.label,
        labelDe: meta.labelDe,
        section: m.section,
        count: 0,
        totalLengthM: 0,
        volumeM3: 0,
        massKg: 0,
      };
      byKey.set(key, line);
    }
    const vol = memberVolumeM3(m.section, m.length);
    line.count += 1;
    line.totalLengthM += m.length / 1000;
    line.volumeM3 += vol;
    line.massKg += vol * density;
  }
  const lines = [...byKey.values()].sort(
    (a, b) => CATEGORY_META[a.category as MemberCategory].order - CATEGORY_META[b.category as MemberCategory].order,
  );

  // ── Sheathing & roofing ───────────────────────────────────────────────
  const claddingArea = framing.panels.filter((p) => p.kind === 'cladding').reduce((s, p) => s + p.areaM2, 0);
  if (claddingArea > 0) {
    const vol = claddingArea * BOARD_THICKNESS_M * WASTE_FACTOR;
    lines.push({
      category: 'sheathing',
      label: 'Wall cladding boards 20 mm',
      labelDe: 'Wandschalung',
      count: framing.panels.filter((p) => p.kind === 'cladding').length,
      totalLengthM: 0,
      volumeM3: vol,
      areaM2: claddingArea,
      massKg: vol * BOARD_DENSITY,
    });
  }
  const roofPanel = framing.panels.find((p) => p.kind === 'roof');
  if (roofPanel) {
    const covering = ROOF_COVERING_LOAD[project.params.loads.roofCovering];
    const needsDeck = covering.load >= 0.3;
    const vol = needsDeck ? roofPanel.areaM2 * 0.022 * WASTE_FACTOR : 0;
    lines.push({
      category: 'roofing',
      label: `Roof: ${covering.label}${needsDeck ? ' on 22 mm deck' : ''}`,
      labelDe: covering.labelDe,
      count: 1,
      totalLengthM: 0,
      volumeM3: vol,
      areaM2: roofPanel.areaM2,
      massKg: vol * 600,
    });
  }

  const bom: BomResult = {
    lines,
    fixtures: collectFixtures(project),
    totalVolumeM3: lines.reduce((s, l) => s + l.volumeM3, 0),
    totalLengthM: lines.reduce((s, l) => s + l.totalLengthM, 0),
    totalMassKg: lines.reduce((s, l) => s + l.massKg, 0),
  };

  return { bom, cutList: buildCutList(framing.members) };
}

const WALL_NAME: Record<string, string> = { front: 'Front', rear: 'Rear', left: 'Left', right: 'Right' };

function fixtureLine(wall: string, o: Opening): FixtureLine {
  const preset = findPreset(o.preset);
  const stock = preset && presetMatches(o, preset);
  const frame = frameSizeFor(o);
  const custom = o.type === 'door' ? 'Custom door' : o.type === 'window' ? 'Custom window' : 'Open passage';
  const customDe = o.type === 'door' ? 'Tür Sondermaß' : o.type === 'window' ? 'Fenster Sondermaß' : 'Durchgang';
  return {
    openingId: o.id,
    wall,
    type: o.type,
    label: o.label ?? o.type,
    preset: stock ? preset.id : undefined,
    product: stock ? preset.label : `${custom} ${frame.width}×${frame.height}`,
    productDe: stock ? preset.labelDe : `${customDe} ${frame.width}×${frame.height}`,
    roughWidth: o.width,
    roughHeight: o.height,
    frameWidth: frame.width,
    frameHeight: frame.height,
    materials: openingMaterials(o),
  };
}

/** Doors and windows to buy: one line per opening on a closed wall or partition. */
export function collectFixtures(project: ProjectState): FixtureLine[] {
  const out: FixtureLine[] = [];
  for (const wall of Object.values(project.walls)) {
    if (!wall.closed) continue;
    for (const o of wall.openings) if (o.type !== 'passage') out.push(fixtureLine(WALL_NAME[wall.id] ?? wall.id, o));
  }
  for (const p of project.partitions) for (const o of p.openings) if (o.type !== 'passage') out.push(fixtureLine(p.label || 'Partition', o));
  return out;
}

export function buildCutList(members: Member[]): CutListItem[] {
  const groups = new Map<string, CutListItem>();
  for (const m of members) {
    const key = [m.group, m.section.width, m.section.height, Math.round(m.length), m.cuts.start, m.cuts.end, m.notes ?? ''].join('|');
    let item = groups.get(key);
    if (!item) {
      item = {
        pos: 0,
        group: m.group,
        name: m.group.split(' (')[0],
        nameDe: m.nameDe.replace(/\s(vorne|hinten|links|rechts)$/, ''),
        section: m.section,
        length: Math.round(m.length),
        cuts: m.cuts,
        quantity: 0,
        notes: m.notes,
        memberIds: [],
      };
      groups.set(key, item);
    }
    item.quantity += 1;
    item.memberIds.push(m.id);
    const wallRef = m.wallId ?? (m.partitionId ? 'partition' : undefined);
    if (wallRef) {
      const walls = item.walls ?? (item.walls = []);
      if (!walls.includes(wallRef)) walls.push(wallRef);
    }
  }
  for (const item of groups.values()) {
    if (item.walls && item.walls.length > 0) item.name = `${item.name} – ${item.walls.join('/')}`;
  }
  const order = (group: string): number => {
    const idx = ['Post', 'Purlin', 'Side rail', 'Rafter', 'Knee brace', 'Stud', 'End stud', 'King', 'Jack', 'Cripple', 'Bottom plate', 'Top plate', 'Header', 'Window sill'].findIndex((p) => group.startsWith(p));
    return idx < 0 ? 99 : idx;
  };
  const items = [...groups.values()].sort((a, b) => order(a.group) - order(b.group) || b.length - a.length);
  items.forEach((item, i) => (item.pos = i + 1));
  return items;
}
