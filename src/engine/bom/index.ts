import type { BomLine, BomResult, TimberOrderLine, StockBoardOption, CutListItem, FixtureLine, FramingResult, MaterialItem, Member, MemberCategory, Opening, ProjectState } from '@/types';
import { DECKING } from '../framing/floor';
import { claddingBoards } from '../framing/cladding';
import { SHEATHING_THICKNESS } from '../framing/walls';
import { INSULATION } from '../framing/insulation';
import { hasWallPosts } from '../framing/wallFrame';
import { findPreset, frameSizeFor, openingMaterials, presetMatches } from '../framing/openingCatalog';
import { summarizePavedArea } from '../paving';
import { memberVolumeM3 } from '../geometry';
import { MATERIALS, ROOF_COVERING_LOAD } from '../statics/materials';
import { footingVolumeM3 } from '../statics/upliftChain';
import { wallExtent } from '../framing/wallFrame';

const CATEGORY_META: Record<MemberCategory, { label: string; labelDe: string; order: number }> = {
  post: { label: 'Posts', labelDe: 'Pfosten', order: 0 },
  beam: { label: 'Purlins & rails', labelDe: 'Pfetten & Rähme', order: 1 },
  rafter: { label: 'Rafters', labelDe: 'Sparren', order: 2 },
  brace: { label: 'Knee braces', labelDe: 'Kopfbänder', order: 3 },
  stud: { label: 'Wall studs', labelDe: 'Ständer', order: 4 },
  plate: { label: 'Bottom plates', labelDe: 'Schwellen', order: 5 },
  header: { label: 'Headers', labelDe: 'Stürze', order: 6 },
  sill: { label: 'Window sills', labelDe: 'Brüstungsriegel', order: 7 },
  bearer: { label: 'Floor bearers', labelDe: 'Unterzüge', order: 8 },
  joist: { label: 'Floor joists / sleepers', labelDe: 'Fußbodenbalken / Lagerhölzer', order: 9 },
  batten: { label: 'Screen battens & rails', labelDe: 'Traglatten & Riegel', order: 10 },
};

const BOARD_THICKNESS_M = 0.02;
const BOARD_DENSITY = 500;
const WASTE_FACTOR = 1.1;
const INSULATION_WASTE = 1.05;
/** Standard cladding board lengths sold (mm) */
export const STOCK_BOARD_LENGTHS = [4000, 6000] as const;
/** Saw kerf + end trim allowed per cut piece (mm) */
const CUT_ALLOWANCE = 5;

export function computeBom(project: ProjectState, framing: FramingResult): { bom: BomResult; cutList: CutListItem[] } {
  const density = MATERIALS[project.params.timber.strengthClass].density;

  // ── BOM by category & section ─────────────────────────────────────────
  const byKey = new Map<string, BomLine>();
  for (const m of framing.members) {
    const roofBatten = m.group.startsWith('Roof batten');
    const key = `${roofBatten ? 'roof-batten' : m.category}|${m.section.width}x${m.section.height}`;
    const meta = roofBatten ? { label: 'Roof battens', labelDe: 'Dachlatten', order: CATEGORY_META.batten.order } : CATEGORY_META[m.category];
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
  for (const line of claddingLines(framing, project.params.build.claddingSpecies)) lines.push(line);
  const roofPanel = framing.panels.find((p) => p.kind === 'roof');
  if (roofPanel) {
    const covering = ROOF_COVERING_LOAD[project.params.loads.roofCovering];
    const needsDeck = covering.load >= 0.3;
    const vol = needsDeck ? roofPanel.areaM2 * 0.022 * WASTE_FACTOR : 0;
    const sheets = project.params.loads.roofCovering === 'trapezoidal-sheet' ? sheetList(project, framing) : undefined;
    lines.push({
      category: 'roofing',
      label: sheets ? `Roof: ${covering.label} – ${sheets.count} sheets × ${sheets.length} mm` : `Roof: ${covering.label}${needsDeck ? ' on 22 mm deck' : ''}`,
      labelDe: covering.labelDe,
      count: sheets ? sheets.count : 1,
      totalLengthM: 0,
      volumeM3: vol,
      areaM2: roofPanel.areaM2,
      massKg: vol * 600,
      ...(sheets ? { sheets } : {}),
    });
  }

  const floorPanel = framing.panels.find((p) => p.kind === 'floor');
  if (floorPanel && framing.floor) {
    const deck = DECKING[framing.floor.decking];
    const vol = floorPanel.areaM2 * (deck.thickness / 1000) * WASTE_FACTOR;
    lines.push({
      category: 'flooring',
      decking: framing.floor.decking,
      label: `Floor deck: ${deck.label}`,
      labelDe: deck.labelDe,
      count: 1,
      totalLengthM: 0,
      volumeM3: vol,
      areaM2: floorPanel.areaM2,
      massKg: vol * deck.density,
    });
  }

  const bom: BomResult = {
    lines,
    timberOrder: timberOrder(project, framing.members),
    fixtures: collectFixtures(project),
    materials: collectMaterials(project, framing),
    totalVolumeM3: lines.reduce((s, l) => s + l.volumeM3, 0),
    totalLengthM: lines.reduce((s, l) => s + (l.section ? l.totalLengthM : 0), 0),
    totalMassKg: lines.reduce((s, l) => s + l.massKg, 0),
  };

  return { bom, cutList: buildCutList(framing.members, project.params.build.cutReserve) };
}

/**
 * Wall cladding, one line per board width: the boards as fitted (pieces cut at openings and sloped tops
 * count separately) and their running metres. Closed boarding is laid out like spaced boarding without the gap.
 */
function claddingLines(framing: FramingResult, species: 'spruce' | 'larch'): BomLine[] {
  const byWidth = new Map<number, BomLine>();
  const pieces = new Map<number, number[]>();
  for (const panel of framing.panels) {
    if (panel.kind !== 'cladding' || !panel.cladding || !panel.outline) continue;
    const { boardWidth, orientation } = panel.cladding;
    const boards = panel.boards ?? claddingBoards(panel.outline.outer, panel.outline.holes, panel.cladding);
    const along = orientation === 'horizontal' ? 'u' : 'v';
    let line = byWidth.get(boardWidth);
    if (!line) {
      line = {
        category: 'sheathing',
        label: `Wall cladding boards 20 × ${boardWidth} mm, ${species}`,
        labelDe: `Wandschalung 20 × ${boardWidth} mm, ${species === 'larch' ? 'Lärche' : 'Fichte'}`,
        count: 0,
        totalLengthM: 0,
        volumeM3: 0,
        areaM2: 0,
        massKg: 0,
      };
      byWidth.set(boardWidth, line);
    }
    const lengths = boards.map((b) => Math.max(...b.map((p) => p[along])) - Math.min(...b.map((p) => p[along])));
    pieces.set(boardWidth, [...(pieces.get(boardWidth) ?? []), ...lengths]);
    line.count += boards.length;
    line.totalLengthM += lengths.reduce((s, l) => s + l, 0) / 1000;
    line.areaM2 = (line.areaM2 ?? 0) + panel.areaM2;
  }
  return [...byWidth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([width, line]) => {
      const vol = (line.areaM2 ?? 0) * BOARD_THICKNESS_M * WASTE_FACTOR;
      const stockBoards = STOCK_BOARD_LENGTHS.map((len) => stockBoardsFor(pieces.get(width) ?? [], len));
      return { ...line, volumeM3: vol, massKg: vol * BOARD_DENSITY, stockBoards };
    });
}

/**
 * Stock boards of one length needed for the pieces (first-fit decreasing, CUT_ALLOWANCE per piece).
 * A piece longer than the stock board is joined from full boards plus the rest.
 */
export function stockBoardsFor(pieceLengths: number[], stockLength: number): StockBoardOption {
  let count = 0;
  const rest: number[] = [];
  for (const len of pieceLengths) {
    const full = Math.floor(len / stockLength);
    count += full;
    const remainder = len - full * stockLength;
    if (remainder > 0.5) rest.push(Math.min(remainder + CUT_ALLOWANCE, stockLength));
  }
  const free: number[] = [];
  for (const len of rest.sort((a, b) => b - a)) {
    const i = free.findIndex((f) => f >= len);
    if (i >= 0) free[i] -= len;
    else free.push(stockLength - len);
  }
  count += free.length;
  const used = pieceLengths.reduce((s, l) => s + l, 0);
  const bought = count * stockLength;
  return { lengthMm: stockLength, count, wastePct: bought > 0 ? Math.round((1 - used / bought) * 1000) / 10 : 0 };
}

/** Bulk materials that are not framing timber: roof battens & membranes, trims, floor DPC and the paving build-up. */
export function collectMaterials(project: ProjectState, framing: FramingResult): MaterialItem[] {
  const out: MaterialItem[] = [];
  const add = (item: Omit<MaterialItem, 'quantity'> & { quantity: number }): void => {
    const quantity = item.unit === 'pcs' ? Math.ceil(item.quantity) : Math.round(item.quantity * (item.unit === 'm³' ? 1000 : 100)) / (item.unit === 'm³' ? 1000 : 100);
    if (quantity <= 0) return;
    const existing = out.find((m) => m.id === item.id);
    if (existing) existing.quantity = Math.round((existing.quantity + quantity) * 100) / 100;
    else out.push({ ...item, quantity });
  };

  // ── Roof accessories ──────────────────────────────────────────────────
  const roofPanel = framing.panels.find((p) => p.kind === 'roof');
  if (roofPanel?.size) {
    const area = roofPanel.areaM2;
    const [a, b] = roofPanel.size;
    const covering = project.params.loads.roofCovering;
    if (covering === 'trapezoidal-sheet') {
      // a across the slope (eaves), b along the fall line (verges); 2 m trims lapped 100 mm
      const pieces = (mm: number) => Math.ceil(mm / 1900);
      add({ id: 'eave-trim', priceKey: 'roof-trim', name: 'Eave trim with drip edge (Tropfkante)', nameDe: 'Traufblech mit Tropfkante', spec: `Coated steel, 2 m lengths, ${pieces(a)} pcs`, quantity: (a / 1000) * WASTE_FACTOR, unit: 'm', note: 'Low eave, under the sheet ends' });
      add({ id: 'verge-trim', priceKey: 'roof-trim', name: 'Verge trim', nameDe: 'Ortgangblech', spec: `Coated steel, 2 m lengths, ${2 * pieces(b)} pcs`, quantity: ((2 * b) / 1000) * WASTE_FACTOR, unit: 'm', note: 'Both verges, over the first and last sheet run' });
      add({ id: 'top-trim', priceKey: 'roof-trim', name: 'Top edge trim (high eave)', nameDe: 'Pultabschlussblech', spec: `Coated steel, 2 m lengths, ${pieces(a)} pcs`, quantity: (a / 1000) * WASTE_FACTOR, unit: 'm', note: 'High eave, over the sheet tops' });
    } else {
      add({ id: 'roof-trim', priceKey: 'roof-trim', name: 'Roof edge trim (eaves & verge)', nameDe: 'Traufblech & Ortgangblech', spec: 'Coated steel, 2 m lengths', quantity: ((2 * (a + b)) / 1000) * WASTE_FACTOR, unit: 'm', note: 'Roof perimeter + 10 % overlaps' });
    }
    if (covering === 'bitumen-shingles') {
      add({ id: 'underlay-bitumen', priceKey: 'underlay-bitumen', name: 'Bitumen underlay', nameDe: 'Bitumen-Unterlagsbahn V13', spec: 'V13, nailed to the deck', quantity: area * WASTE_FACTOR, unit: 'm²', note: '+10 % laps' });
    }
    if (covering === 'roof-tiles') {
      add({ id: 'underlay-breathable', priceKey: 'underlay-breathable', name: 'Breathable roof underlay', nameDe: 'Unterspannbahn diffusionsoffen', spec: 'sd ≤ 0.05 m', quantity: area * WASTE_FACTOR, unit: 'm²', note: '+10 % laps' });
      add({ id: 'counter-battens', priceKey: 'counter-battens', name: 'Counter battens', nameDe: 'Konterlatten', spec: '24×48 mm, impregnated', quantity: (area / Math.max(framing.roof.rafterSpacing / 1000, 0.3)) * WASTE_FACTOR, unit: 'm', note: 'One per rafter + 10 %' });
      add({ id: 'roof-battens', priceKey: 'roof-battens', name: 'Tiling battens', nameDe: 'Dachlatten', spec: '30×50 mm, S10, ≈ 330 mm gauge', quantity: (area / 0.33) * WASTE_FACTOR, unit: 'm', note: '≈ 3 m per m² + 10 %' });
    }
  }

  // ── Timber floor ──────────────────────────────────────────────────────
  if (framing.floor && framing.floor.bedLengthM > 0) {
    add({ id: 'floor-dpc', priceKey: 'dpc-strip', name: 'Bitumen DPC strip under floor timber', nameDe: 'Bitumen-Sperrbahn unter Lagerhölzern', spec: `${framing.floor.support === 'bearers' ? project.params.floor.bearer.width : project.params.floor.joist.width} mm wide`, quantity: framing.floor.bedLengthM * WASTE_FACTOR, unit: 'm' });
  }

  // ── Insulation ────────────────────────────────────────────────────────
  // Priced per m³ so the price holds when the thickness changes; membranes per m² incl. laps
  const insulated = framing.insulation?.elements ?? [];
  for (const e of insulated) {
    const spec = INSULATION[e.material];
    const name = e.part === 'walls' ? 'Wall insulation' : e.part === 'roof' ? 'Roof insulation' : 'Floor insulation';
    add({ id: `insulation-${e.material}-${e.part}`, priceKey: `insulation-${e.material}`, name: `${name}: ${spec.label}`, nameDe: spec.labelDe, spec: `${e.thickness} mm · ${e.areaM2.toFixed(1)} m²`, quantity: e.areaM2 * (e.thickness / 1000) * INSULATION_WASTE, unit: 'm³', note: '+5 % cutting waste' });
  }
  const insulatedArea = insulated.reduce((s, e) => s + e.areaM2, 0);
  if (insulatedArea > 0) {
    add({ id: 'vapour-barrier', priceKey: 'vapour-barrier', name: 'Vapour barrier on the warm side', nameDe: 'Dampfbremse raumseitig', spec: 'sd ≥ 2 m, joints taped', quantity: insulatedArea * WASTE_FACTOR, unit: 'm²', note: '+10 % laps' });
    add({ id: 'vapour-tape', priceKey: 'vapour-tape', name: 'Airtightness tape for the vapour barrier', nameDe: 'Klebeband für Dampfbremse', spec: '60 mm', quantity: insulatedArea * 1.5, unit: 'm', note: '≈ 1.5 m per m²' });
  }
  const windArea = insulated.reduce((s, e) => s + (e.part === 'walls' || (e.part === 'floor' && framing.floor?.support === 'bearers') ? e.areaM2 : 0), 0);
  if (windArea > 0) {
    add({ id: 'wind-membrane', priceKey: 'wind-membrane', name: 'Breathable wind membrane outside the insulation', nameDe: 'Winddichtungsbahn diffusionsoffen', spec: 'sd ≤ 0.1 m', quantity: windArea * WASTE_FACTOR, unit: 'm²', note: '+10 % laps' });
  }
  const roofInsulation = insulated.find((e) => e.part === 'roof');
  const covering = project.params.loads.roofCovering;
  if (roofInsulation && ROOF_COVERING_LOAD[covering].load < 0.3 && covering !== 'roof-tiles') {
    add({ id: 'insulation-roof-membrane', priceKey: 'underlay-breathable', name: 'Breathable roof underlay over the insulation', nameDe: 'Unterspannbahn diffusionsoffen', spec: 'sd ≤ 0.05 m', quantity: roofInsulation.areaM2 * WASTE_FACTOR, unit: 'm²', note: '+10 % laps' });
  }

  // ── Foundations: point foundations under every post, the curb under the walls ──
  const build = project.params.build;
  const loads = project.params.loads;
  const nPosts = framing.members.filter((m) => m.category === 'post').length;
  const footingSize = loads.postFootingDiameter ?? 0;
  const footingDepth = loads.postFootingDepth ?? 0;
  const footingVol = footingSize > 0 && footingDepth > 0 ? nPosts * footingVolumeM3(build, footingSize, footingDepth) : 0;
  const shape = build.footingShape === 'round' ? `Ø${footingSize}` : `${footingSize} × ${footingSize}`;
  const curbLength = build.wallBase === 'curb' ? closedWallLength(project) : 0;
  const curbVol = (curbLength / 1000) * (build.curbWidth / 1000) * (build.curbHeight / 1000);
  if (footingVol + curbVol > 0) {
    const total = footingVol + curbVol;
    add({ id: 'concrete', priceKey: 'concrete-m3', name: 'Concrete C20/25 (point foundations' + (curbVol > 0 ? ' and wall curb)' : ')'), nameDe: 'Beton C20/25', spec: [footingVol > 0 ? `${nPosts} × ${shape} × ${footingDepth} mm` : '', curbVol > 0 ? `curb ${build.curbWidth} × ${build.curbHeight} mm, ${(curbLength / 1000).toFixed(2)} m` : ''].filter(Boolean).join(' + '), quantity: total, unit: 'm³', note: `= ${Math.ceil((total * 1000) / build.concreteBagLitres)} bags of 25 kg ready-mix (${build.concreteBagLitres} l each)` });
  }

  // ── Wall base: bitumen strip under the bottom plates ──
  const plateLength = framing.members.filter((m) => m.category === 'plate' && m.nameDe === 'Schwelle').reduce((sum, m) => sum + m.length, 0);
  if (plateLength > 0 && build.wallBase !== 'hung') {
    add({ id: 'bitumen-r500', priceKey: 'dpc-strip', name: 'Bitumen strip R500 under the bottom plates', nameDe: 'Bitumenbahn R500 unter der Schwelle', spec: `${project.params.timber.stud.height + 20} mm wide`, quantity: (plateLength / 1000) * 1.05, unit: 'm', note: '+5 % laps' });
  }

  // ── OSB sheathing of the braced walls (shear walls with sheet panels) ──
  const sheathingArea = framing.panels.filter((pn) => pn.kind === 'sheathing').reduce((sum, pn) => sum + pn.areaM2, 0);
  if (sheathingArea > 0) {
    add({ id: 'osb-sheathing', priceKey: 'osb', name: 'OSB/3 sheathing of the braced walls', nameDe: 'OSB/3-Beplankung', spec: `${SHEATHING_THICKNESS} mm or thicker, nailed at ≤ 150 mm on every stud and plate`, quantity: sheathingArea * 1.1, unit: 'm²', note: '+10 % cutting' });
  }

  // ── Optional lines ──
  const claddingArea = framing.panels.filter((pn) => pn.kind === 'cladding' && pn.wallId && project.walls[pn.wallId]?.closed).reduce((sum, pn) => sum + pn.areaM2, 0);
  if (build.facadeMembrane && claddingArea > 0) {
    add({ id: 'facade-membrane', priceKey: 'wind-membrane', name: 'Facade membrane behind the cladding', nameDe: 'Fassadenbahn', spec: 'UV-resistant, sd ≤ 0.1 m', quantity: claddingArea * 1.1, unit: 'm²', note: '+10 % laps' });
  }
  if (build.vents > 0) {
    add({ id: 'vents', priceKey: 'vent-grille', name: 'Ventilation grilles', nameDe: 'Lüftungsgitter', spec: '≈ 200 × 100 mm, insect mesh', quantity: build.vents, unit: 'pcs' });
  }
  if (build.floorBuildUp) {
    const area = (project.params.length * project.params.width) / 1e6;
    const slabs = Math.max(0, area - build.existingPavingM2);
    add({ id: 'floor-gravel', priceKey: 'paving-base', name: 'Floor build-up: crushed gravel 0/32', nameDe: 'Schotter 0/32', spec: '15 cm compacted', quantity: area, unit: 'm²' });
    add({ id: 'floor-pe', priceKey: 'pe-film', name: 'Floor build-up: PE film', nameDe: 'PE-Folie', spec: '0.2 mm', quantity: area * 1.1, unit: 'm²', note: '+10 % laps' });
    add({ id: 'floor-grit', priceKey: 'paving-bedding', name: 'Floor build-up: bedding grit 0/5', nameDe: 'Splitt 0/5', spec: '3–4 cm', quantity: area, unit: 'm²' });
    const slabSpec = `600 × 400 × 45 mm, ${area.toFixed(1)} m² less ${build.existingPavingM2} m² in stock`;
    if (slabs > 0) add({ id: 'floor-slabs', priceKey: 'concrete-slab', name: 'Floor build-up: concrete slabs', nameDe: 'Betonplatten', spec: slabSpec, quantity: (slabs / 0.24) * 1.05, unit: 'pcs', note: '+5 % cutting' });
    else out.push({ id: 'floor-slabs', priceKey: 'concrete-slab', name: 'Floor build-up: concrete slabs', nameDe: 'Betonplatten', spec: slabSpec, quantity: 0, unit: 'pcs', note: 'Covered by the slabs in stock – none to buy' });
  }

  // ── Paving ────────────────────────────────────────────────────────────
  for (const area of project.pavedAreas) {
    const summary = summarizePavedArea(area);
    if (summary.areaM2 <= 0) continue;
    const spec = `${area.stoneLength}×${area.stoneWidth}×${area.stoneThickness} mm`;
    add({ id: `paving-stones-${spec}`, priceKey: 'paving-stones', name: `Paving stones ${spec}`, nameDe: 'Pflastersteine', spec, quantity: summary.areaM2 * 1.05, unit: 'm²', note: '+5 % cutting waste' });
    add({ id: 'paving-edging', priceKey: 'paving-edging', name: 'Edge restraint (lawn edging) in concrete', nameDe: 'Rasenkantensteine in Beton', spec: '1000×250×50 mm', quantity: summary.perimeterM, unit: 'm' });
    add({ id: 'paving-base', priceKey: 'paving-base', name: 'Sub-base, crushed gravel 0/32', nameDe: 'Schottertragschicht 0/32', spec: '20 cm compacted', quantity: summary.areaM2, unit: 'm²' });
    add({ id: 'paving-bedding', priceKey: 'paving-bedding', name: 'Bedding grit 2/5', nameDe: 'Pflastersplitt 2/5', spec: '4 cm', quantity: summary.areaM2, unit: 'm²' });
    add({ id: 'paving-joint-sand', priceKey: 'paving-joint-sand', name: 'Jointing sand', nameDe: 'Fugensand', spec: '0/2', quantity: summary.areaM2, unit: 'm²' });
  }
  return out;
}

const WALL_NAME: Record<string, string> = { front: 'Front', rear: 'Rear', left: 'Left', right: 'Right' };

function fixtureLine(wall: string, o: Opening, gap: number): FixtureLine {
  const preset = findPreset(o.preset);
  const stock = preset && presetMatches(o, preset, gap);
  const frame = frameSizeFor(o, gap);
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
    if (!hasWallPosts(wall)) continue;
    for (const o of wall.openings) if (o.type !== 'passage') out.push(fixtureLine(WALL_NAME[wall.id] ?? wall.id, o, project.params.build.installGap));
  }
  for (const p of project.partitions) for (const o of p.openings) if (o.type !== 'passage') out.push(fixtureLine(p.label || 'Partition', o, project.params.build.installGap));
  return out;
}

export function buildCutList(members: Member[], cutReserve = 0): CutListItem[] {
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
    // posts are ordered longer and cut to the target length on site after levelling the bases
    if (item.group.startsWith('Post') && cutReserve > 0) item.orderLength = item.length + cutReserve;
  }
  const order = (group: string): number => {
    const idx = ['Post', 'Purlin', 'Side rail', 'Rafter', 'Roof batten', 'Knee brace', 'Stud', 'End stud', 'King', 'Jack', 'Cripple', 'Bottom plate', 'Top plate', 'Header', 'Window sill', 'Floor bearer', 'Floor joist', 'Sleeper'].findIndex((p) => group.startsWith(p));
    return idx < 0 ? 99 : idx;
  };
  const items = [...groups.values()].sort((a, b) => order(a.group) - order(b.group) || b.length - a.length);
  items.forEach((item, i) => (item.pos = i + 1));
  return items;
}

/** Closed wall length (mm) along the outer walls – the length of a wall curb. */
function closedWallLength(project: ProjectState): number {
  return Object.values(project.walls)
    .filter((w) => w.closed)
    .reduce((sum, w) => {
      const ext = wallExtent(w, w.id === 'front' || w.id === 'rear' ? project.params.length : project.params.width);
      return sum + (ext.end - ext.start);
    }, 0);
}

/** Trapezoidal sheets: one piece per run along the fall line (no cross joint), runs side by side across. */
function sheetList(project: ProjectState, framing: FramingResult): { count: number; length: number; coverWidth: number } | undefined {
  const panel = framing.panels.find((p) => p.kind === 'roof');
  if (!panel?.size) return undefined;
  const [across, along] = panel.size;
  const cover = project.params.build.sheetCoverWidth;
  return { count: Math.ceil(across / cover), length: Math.ceil(along / 10) * 10, coverWidth: cover };
}

/**
 * Framing timber by section as one order: the cut pieces (posts with their cut reserve) packed
 * first-fit decreasing into the yard's stock lengths; longer pieces are ordered to length.
 */
export function timberOrder(project: ProjectState, members: Member[]): TimberOrderLine[] {
  const build = project.params.build;
  const stock = [...build.stockLengths].sort((a, b) => a - b);
  const longest = stock[stock.length - 1];
  const bySection = new Map<string, { section: { width: number; height: number }; pieces: number[] }>();
  for (const m of members) {
    const [w, h] = [m.section.width, m.section.height].sort((x, y) => x - y);
    const key = `${w}x${h}`;
    const entry = bySection.get(key) ?? { section: { width: w, height: h }, pieces: [] };
    entry.pieces.push(Math.round(m.length + (m.category === 'post' ? build.cutReserve : 0)));
    bySection.set(key, entry);
  }
  const out: TimberOrderLine[] = [];
  for (const { section, pieces } of bySection.values()) {
    const special: number[] = [];
    const bins: { length: number; free: number }[] = [];
    const sorted = [...pieces].sort((a, b) => b - a);
    sorted.forEach((len, i) => {
      const need = len + CUT_ALLOWANCE;
      if (len > longest) {
        special.push(Math.ceil(len / 500) * 500);
        return;
      }
      // the tightest open stock piece, else the stock length that cuts the most of the pieces still to come
      const open = bins.filter((b) => b.free >= need).sort((a, b) => a.free - b.free)[0];
      if (open) {
        open.free -= need;
        return;
      }
      const rest = sorted.slice(i);
      const yieldOf = (length: number) => {
        let free = length;
        let used = 0;
        for (const r of rest) if (free >= r + CUT_ALLOWANCE) {
          free -= r + CUT_ALLOWANCE;
          used += r;
        }
        return used / length;
      };
      const length = stock.filter((l) => l >= need).reduce((best, l) => (yieldOf(l) > yieldOf(best) + 1e-9 ? l : best), stock.find((l) => l >= need) ?? longest);
      bins.push({ length, free: length - need });
    });
    const counts = new Map<number, number>();
    for (const b of bins) counts.set(b.length, (counts.get(b.length) ?? 0) + 1);
    const bought = bins.reduce((sum, b) => sum + b.length, 0) + special.reduce((sum, l) => sum + l, 0);
    const used = pieces.reduce((sum, l) => sum + l, 0);
    out.push({
      section,
      glulam: Math.max(section.width, section.height) > 240,
      pieces: [...pieces].sort((a, b) => b - a),
      stock: [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([lengthMm, count]) => ({ lengthMm, count })),
      special: special.sort((a, b) => b - a),
      volumeM3: (bought / 1000) * (section.width / 1000) * (section.height / 1000),
      offcutPct: bought > 0 ? Math.round((1 - used / bought) * 1000) / 10 : 0,
    });
  }
  return out.sort((a, b) => b.section.width * b.section.height - a.section.width * a.section.height);
}
