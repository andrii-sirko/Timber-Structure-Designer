import type { FramingWarning, InsulatedElement, InsulationElementResult, InsulationLayer, InsulationMaterial, InsulationResult, InsulationSettings, Panel, ProfilePoint, StructureParams, Wall } from '@/types';
import { add, profileArea, scale, X_AXIS, Y_AXIS, Z_AXIS } from '../geometry';
import type { FloorLayout } from './floor';
import type { RoofLines } from './roofLines';
import type { WallFrame } from './wallFrame';

export interface InsulationSpec {
  label: string;
  labelDe: string;
  /** Design thermal conductivity λ (W/mK) */
  lambda: number;
  /** Rigid boards leave gaps between timbers that shrink; fibre insulation fills the cavity */
  rigid: boolean;
}

export const INSULATION: Record<InsulationMaterial, InsulationSpec> = {
  'mineral-wool': { label: 'Mineral wool batts WLS 035', labelDe: 'Mineralwolle-Klemmfilz WLS 035', lambda: 0.035, rigid: false },
  'wood-fibre': { label: 'Wood fibre batts WLS 038', labelDe: 'Holzfaser-Dämmmatte WLS 038', lambda: 0.038, rigid: false },
  cellulose: { label: 'Cellulose, blown in WLS 039', labelDe: 'Zellulose eingeblasen WLS 039', lambda: 0.039, rigid: false },
  eps: { label: 'EPS boards WLS 035', labelDe: 'EPS-Dämmplatten WLS 035', lambda: 0.035, rigid: true },
  xps: { label: 'XPS boards WLS 034', labelDe: 'XPS-Dämmplatten WLS 034', lambda: 0.034, rigid: true },
  pir: { label: 'PIR boards WLS 023, foil-faced', labelDe: 'PIR-Dämmplatten WLS 023', lambda: 0.023, rigid: true },
};

/** Defaults fill the default stud, rafter and joist depths. */
export const INSULATION_DEFAULTS: InsulationSettings = {
  enabled: false,
  walls: { material: 'mineral-wool', thickness: 120 },
  roof: { material: 'mineral-wool', thickness: 160 },
  floor: { material: 'mineral-wool', thickness: 120 },
};

export const MAX_INSULATION_THICKNESS = 400;

/** Softwood λ for the timber that bridges the insulation (W/mK). */
const LAMBDA_TIMBER = 0.13;

/**
 * Surface resistances R_si (m²K/W) per heat-flow direction (EN ISO 6946). Every build-up has a
 * ventilated layer outside the insulation (rainscreen gap, roof underlay, crawl space), so the
 * layers beyond it are ignored and R_se is taken equal to R_si.
 */
const R_SURFACE: Record<InsulatedElement, number> = { walls: 0.13, roof: 0.1, floor: 0.17 };

function sanitizeLayer(input: Partial<InsulationLayer> | undefined, fallback: InsulationLayer): InsulationLayer {
  const thickness = Number(input?.thickness);
  return {
    material: input?.material && input.material in INSULATION ? input.material : fallback.material,
    thickness: Number.isFinite(thickness) ? Math.min(Math.max(Math.round(thickness), 0), MAX_INSULATION_THICKNESS) : fallback.thickness,
  };
}

export function sanitizeInsulation(input: Partial<InsulationSettings> | undefined): InsulationSettings {
  return {
    enabled: Boolean(input?.enabled),
    walls: sanitizeLayer(input?.walls, INSULATION_DEFAULTS.walls),
    roof: sanitizeLayer(input?.roof, INSULATION_DEFAULTS.roof),
    floor: sanitizeLayer(input?.floor, INSULATION_DEFAULTS.floor),
  };
}

/**
 * R and U of an insulated timber build-up by the upper-bound (parallel path) method of EN ISO 6946:
 * one path through the insulation, one through the timber; insulation thicker than the timber
 * continues as a layer over both paths. `extraR` is any continuous layer on the warm side.
 */
export function insulationThermal(
  element: InsulatedElement,
  layer: InsulationLayer,
  cavityDepth: number,
  timberFraction: number,
  areaM2: number,
  extraR = 0,
): InsulationElementResult {
  const lambda = INSULATION[layer.material].lambda;
  const d = layer.thickness / 1000;
  const bridged = Math.min(layer.thickness, cavityDepth) / 1000;
  const surfaces = 2 * R_SURFACE[element] + extraR;
  const rInsulationPath = surfaces + d / lambda;
  const rTimberPath = surfaces + bridged / LAMBDA_TIMBER + (d - bridged) / lambda;
  const f = Math.min(Math.max(timberFraction, 0), 1);
  const uValue = f / rTimberPath + (1 - f) / rInsulationPath;
  return {
    part: element,
    material: layer.material,
    thickness: layer.thickness,
    areaM2,
    cavityDepth,
    timberFraction: Math.round(f * 1000) / 1000,
    rInsulation: Math.round((d / lambda) * 100) / 100,
    rTotal: Math.round((1 / uValue) * 100) / 100,
    uValue: Math.round(uValue * 1000) / 1000,
  };
}

/** Insulation between the studs of a closed outer wall, behind the cladding (n ∈ [−d, 0]), openings cut out. */
export function wallInsulationPanel(frame: WallFrame, wall: Wall, thickness: number, material: InsulationMaterial): Panel {
  const { start, end } = frame.extent;
  const outer: ProfilePoint[] = [
    { u: start, v: 0 },
    { u: end, v: 0 },
    { u: end, v: frame.claddingTopAt(end) - 5 },
    { u: start, v: frame.claddingTopAt(start) - 5 },
  ];
  const holes: ProfilePoint[][] = wall.openings.map((o) => [
    { u: o.x, v: o.y },
    { u: o.x + o.width, v: o.y },
    { u: o.x + o.width, v: o.y + o.height },
    { u: o.x, v: o.y + o.height },
  ]);
  const areaM2 = Math.max(profileArea(outer) - holes.reduce((s, h) => s + profileArea(h), 0), 0) / 1e6;
  return {
    id: `insulation-${frame.id}`,
    kind: 'insulation',
    wallId: frame.wallId,
    anchor: add(frame.origin, scale(frame.normal, -thickness)),
    direction: frame.u,
    up: frame.v,
    normal: frame.normal,
    outline: { outer, holes, thickness },
    areaM2,
    insulation: { part: 'walls', material },
  };
}

export interface InsulationBuild {
  panels: Panel[];
  result?: InsulationResult;
  warnings: FramingWarning[];
}

/** Advice when the insulation is deeper than the timber it sits between. */
const TOO_DEEP: Record<InsulatedElement, (d: number, depth: number) => string> = {
  walls: (d, depth) => `Wall insulation ${d} mm is deeper than the ${depth} mm studs – add an inner batten layer for the rest.`,
  roof: (d, depth) => `Roof insulation ${d} mm is deeper than the ${depth} mm rafters – add a batten layer under the rafters for the rest.`,
  floor: (d, depth) => `Floor insulation ${d} mm is deeper than the ${depth} mm floor joists – use deeper joists or a second layer.`,
};

/**
 * Insulation of the closed outer walls (between the studs), the roof over the footprint (between
 * the rafters, under the deck) and the timber floor (between the joists, under the deck), with
 * R / U per element. Canonical frame; `wallFrames` are the closed outer walls with their walls.
 */
export function generateInsulation(
  params: StructureParams,
  roof: RoofLines,
  rafterSpacing: number,
  wallFrames: { frame: WallFrame; wall: Wall }[],
  floor: { layout: FloorLayout; panel: Panel } | null,
): InsulationBuild {
  const settings = sanitizeInsulation(params.insulation);
  if (!settings.enabled) return { panels: [], warnings: [] };
  const panels: Panel[] = [];
  const elements: InsulationElementResult[] = [];
  const warnings: FramingWarning[] = [];
  const check = (element: InsulatedElement, layer: InsulationLayer, depth: number): void => {
    if (layer.thickness > depth) warnings.push({ level: 'info', message: TOO_DEEP[element](layer.thickness, depth) });
  };

  const { walls, roof: roofLayer, floor: floorLayer } = settings;
  if (walls.thickness > 0 && wallFrames.length > 0) {
    const wallPanels = wallFrames.map(({ frame, wall }) => wallInsulationPanel(frame, wall, walls.thickness, walls.material));
    panels.push(...wallPanels);
    const stud = params.timber.stud;
    const area = wallPanels.reduce((s, p) => s + p.areaM2, 0);
    elements.push(insulationThermal('walls', walls, stud.height, stud.width / Math.max(params.maxStudSpacing, stud.width), area));
    check('walls', walls, stud.height);
  }

  if (roofLayer.thickness > 0) {
    // Between the rafters over the footprint, hanging from the rafter tops (deck underside)
    const d = roofLayer.thickness;
    const normal = { x: 0, y: roof.cos, z: roof.sin };
    const zMid = params.width / 2;
    const depth = params.width / roof.cos;
    const centre = add({ x: params.length / 2, y: roof.topAt(zMid), z: zMid }, scale(normal, -d / 2));
    const rafter = params.timber.rafter;
    const areaM2 = (params.length / 1000) * (depth / 1000);
    panels.push({
      id: 'insulation-roof',
      kind: 'insulation',
      anchor: centre,
      direction: X_AXIS,
      up: { x: 0, y: -roof.sin, z: roof.cos },
      normal,
      size: [params.length, depth, d],
      areaM2,
      insulation: { part: 'roof', material: roofLayer.material },
    });
    elements.push(insulationThermal('roof', roofLayer, rafter.height, rafter.width / Math.max(rafterSpacing, rafter.width), areaM2));
    check('roof', roofLayer, rafter.height);
  }

  const floorOutline = floor?.panel.outline;
  if (floorLayer.thickness > 0 && floor && floorOutline) {
    // Between the joists, up against the deck underside; the deck itself adds to R on the warm side
    const { layout, panel } = floor;
    const d = floorLayer.thickness;
    panels.push({
      id: 'insulation-floor',
      kind: 'insulation',
      anchor: { x: 0, y: layout.deckBottom - d, z: 0 },
      direction: X_AXIS,
      up: Z_AXIS,
      normal: Y_AXIS,
      outline: { ...floorOutline, thickness: d },
      areaM2: panel.areaM2,
      insulation: { part: 'floor', material: floorLayer.material },
    });
    const joist = layout.settings.joist;
    const deckR = layout.deck.thickness / 1000 / LAMBDA_TIMBER;
    elements.push(insulationThermal('floor', floorLayer, joist.height, joist.width / Math.max(layout.joistSpacing, joist.width), panel.areaM2, deckR));
    check('floor', floorLayer, joist.height);
  }

  if (elements.some((e) => INSULATION[e.material].rigid && e.part !== 'floor')) {
    warnings.push({ level: 'info', message: 'Rigid insulation boards between timbers leave gaps as the wood shrinks – foam the joints, or use fibre insulation that fills the cavity.' });
  }
  return { panels, warnings, ...(elements.length ? { result: { elements } } : {}) };
}
