import type { BuildSettings, StructureParams, TimberSection } from '@/types';
import { POST_BASE_TYPES, PURLIN_POST_CONNECTORS, WALL_BASES } from '@/types';

/**
 * Typical stock of a German timber yard: roof battens (Dachlatten, S10), planks (Bohlen) and
 * sawn / KVH squared timber. 40×40 and smaller are not sold as structural timber. Editable per project.
 */
export const DEFAULT_STOCK_SECTIONS: TimberSection[] = [
  { width: 30, height: 50 },
  { width: 40, height: 60 },
  // Bohlen
  { width: 40, height: 100 },
  { width: 40, height: 120 },
  { width: 40, height: 140 },
  { width: 40, height: 160 },
  { width: 40, height: 200 },
  { width: 40, height: 240 },
  { width: 60, height: 60 },
  { width: 60, height: 80 },
  { width: 60, height: 100 },
  { width: 60, height: 120 },
  { width: 60, height: 140 },
  { width: 60, height: 160 },
  { width: 60, height: 180 },
  { width: 60, height: 200 },
  { width: 60, height: 240 },
  { width: 80, height: 80 },
  { width: 80, height: 100 },
  { width: 80, height: 120 },
  { width: 80, height: 140 },
  { width: 80, height: 160 },
  { width: 80, height: 180 },
  { width: 80, height: 200 },
  { width: 80, height: 240 },
  { width: 100, height: 100 },
  { width: 100, height: 120 },
  { width: 100, height: 140 },
  { width: 100, height: 160 },
  { width: 100, height: 200 },
  { width: 100, height: 240 },
  { width: 120, height: 120 },
  { width: 120, height: 140 },
  { width: 120, height: 160 },
  { width: 120, height: 180 },
  { width: 120, height: 200 },
  { width: 120, height: 240 },
  { width: 140, height: 140 },
  { width: 140, height: 160 },
  { width: 140, height: 200 },
  { width: 140, height: 240 },
  { width: 160, height: 160 },
  { width: 160, height: 200 },
  { width: 160, height: 240 },
];

/** Defaults for the site in Borkheide, Brandenburg (wind zone 2 inland, terrain II–III). */
export const BUILD_DEFAULTS: BuildSettings = {
  site: 'Borkheide, Brandenburg',
  windZone: '2 (inland)',
  terrainCategory: 'II–III',
  baseGap: 50,
  cutReserve: 80,
  postBottomLevel: null,
  footingShape: 'square',
  rafterAnchorsPerBearing: 1,
  rafterAnchorRk: 2.5,
  purlinPostConnector: 'angle-brackets',
  angleBracketRk: 3.5,
  concreteBagLitres: 12.5,
  braceConnector: 'screws',
  screenBatten: { width: 40, height: 60 },
  screenBattenSpacing: 800,
  screenCp: 1.0,
  roofStraps: false,
  wallCp: 1.3,
  studDeflectionLimit: 150,
  sheetCoverWidth: 1035,
  sheetProfileHeight: 20,
  maxSheetLength: 8000,
  sheetMaxSpan: 800,
  battenSection: { width: 40, height: 60 },
  roofScrewDiameter: 6.5,
  roofScrewLength: 65,
  roofScrewsField: 8,
  roofScrewsEdge: 12,
  minSlope: 3.0,
  slopeTolerance: 0.3,
  wallBase: 'slab',
  curbWidth: 100,
  curbHeight: 250,
  curbTop: 150,
  plateSpacer: 20,
  installGap: 12,
  claddingSpecies: 'spruce',
  bgfLimit: 50,
  stockLengths: [3000, 4000, 5000, 6000],
  stockSections: DEFAULT_STOCK_SECTIONS,
  facadeMembrane: false,
  vents: 0,
  floorBuildUp: false,
  existingPavingM2: 0,
};

const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};
const section = (v: unknown, fallback: TimberSection): TimberSection => {
  const s = v as Partial<TimberSection> | undefined;
  const width = num(s?.width, NaN, 10, 400);
  const height = num(s?.height, NaN, 10, 600);
  return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : fallback;
};

/** Build settings merged onto the defaults, every field range-checked (older files have none). */
export function sanitizeBuild(input: unknown): BuildSettings {
  const b = (input && typeof input === 'object' ? input : {}) as Partial<BuildSettings>;
  const d = BUILD_DEFAULTS;
  const text = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
  const lengths = Array.isArray(b.stockLengths) ? b.stockLengths.map((v) => num(v, NaN, 500, 20000)).filter(Number.isFinite) : [];
  const sections = Array.isArray(b.stockSections) ? b.stockSections.map((s) => section(s, { width: NaN, height: NaN })).filter((s) => Number.isFinite(s.width)) : [];
  return {
    site: text(b.site, d.site),
    windZone: text(b.windZone, d.windZone),
    terrainCategory: text(b.terrainCategory, d.terrainCategory),
    baseGap: num(b.baseGap, d.baseGap, 0, 500),
    cutReserve: num(b.cutReserve, d.cutReserve, 0, 1000),
    postBottomLevel: b.postBottomLevel === null || b.postBottomLevel === undefined ? null : num(b.postBottomLevel, 0, -1000, 2000),
    footingShape: b.footingShape === 'round' ? 'round' : 'square',
    rafterAnchorsPerBearing: Number(b.rafterAnchorsPerBearing) === 2 ? 2 : 1,
    rafterAnchorRk: num(b.rafterAnchorRk, d.rafterAnchorRk, 0.1, 50),
    purlinPostConnector: PURLIN_POST_CONNECTORS.includes(b.purlinPostConnector as never) ? b.purlinPostConnector! : d.purlinPostConnector,
    angleBracketRk: num(b.angleBracketRk, d.angleBracketRk, 0.1, 50),
    concreteBagLitres: num(b.concreteBagLitres, d.concreteBagLitres, 1, 100),
    braceConnector: b.braceConnector === 'bolt' ? 'bolt' : 'screws',
    screenBatten: section(b.screenBatten, d.screenBatten),
    screenBattenSpacing: num(b.screenBattenSpacing, d.screenBattenSpacing, 200, 3000),
    screenCp: num(b.screenCp, d.screenCp, 0.1, 3),
    roofStraps: b.roofStraps === true,
    wallCp: num(b.wallCp, d.wallCp, 0.1, 3),
    studDeflectionLimit: num(b.studDeflectionLimit, d.studDeflectionLimit, 50, 1000),
    sheetCoverWidth: num(b.sheetCoverWidth, d.sheetCoverWidth, 300, 2000),
    sheetProfileHeight: num(b.sheetProfileHeight, d.sheetProfileHeight, 5, 200),
    maxSheetLength: num(b.maxSheetLength, d.maxSheetLength, 1000, 30000),
    sheetMaxSpan: num(b.sheetMaxSpan, d.sheetMaxSpan, 200, 6000),
    battenSection: section(b.battenSection, d.battenSection),
    roofScrewDiameter: num(b.roofScrewDiameter, d.roofScrewDiameter, 4, 10),
    roofScrewLength: num(b.roofScrewLength, d.roofScrewLength, 20, 300),
    roofScrewsField: num(b.roofScrewsField, d.roofScrewsField, 1, 30),
    roofScrewsEdge: num(b.roofScrewsEdge, d.roofScrewsEdge, 1, 40),
    minSlope: num(b.minSlope, d.minSlope, 0, 45),
    slopeTolerance: num(b.slopeTolerance, d.slopeTolerance, 0, 5),
    wallBase: WALL_BASES.includes(b.wallBase as never) ? b.wallBase! : d.wallBase,
    curbWidth: num(b.curbWidth, d.curbWidth, 50, 1000),
    curbHeight: num(b.curbHeight, d.curbHeight, 50, 1500),
    curbTop: num(b.curbTop, d.curbTop, 0, 1000),
    plateSpacer: num(b.plateSpacer, d.plateSpacer, 0, 200),
    installGap: num(b.installGap, d.installGap, 0, 50),
    claddingSpecies: b.claddingSpecies === 'larch' ? 'larch' : 'spruce',
    bgfLimit: num(b.bgfLimit, d.bgfLimit, 1, 10000),
    stockLengths: lengths.length > 0 ? [...new Set(lengths)].sort((x, y) => x - y) : d.stockLengths,
    stockSections: sections.length > 0 ? sections : d.stockSections,
    facadeMembrane: b.facadeMembrane === true,
    vents: Math.round(num(b.vents, d.vents, 0, 50)),
    floorBuildUp: b.floorBuildUp === true,
    existingPavingM2: num(b.existingPavingM2, d.existingPavingM2, 0, 10000),
  };
}

export const isPostBaseType = (v: unknown): boolean => POST_BASE_TYPES.includes(v as never);

/** true when the timber yard sells the section (either orientation). */
export function isStockSection(s: TimberSection, stock: TimberSection[]): boolean {
  return stock.some((t) => (t.width === s.width && t.height === s.height) || (t.width === s.height && t.height === s.width));
}

/** Bottom of the posts above ±0 (mm). */
export function postBottomLevel(params: StructureParams): number {
  const b = params.build;
  if (b.postBottomLevel !== null) return b.postBottomLevel;
  return b.wallBase === 'curb' ? b.curbTop : b.baseGap;
}

/** Top of the concrete the post base is cast into (mm above ±0). */
export function concreteTopLevel(params: StructureParams): number {
  return postBottomLevel(params) - params.build.baseGap;
}

/** Underside of the bottom plates above ±0 (mm). */
export function plateBottomLevel(params: StructureParams): number {
  const b = params.build;
  return b.wallBase === 'curb' ? b.curbTop : b.wallBase === 'spacers' || b.wallBase === 'hung' ? b.plateSpacer : 0;
}
