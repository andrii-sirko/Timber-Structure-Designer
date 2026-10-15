/**
 * Core domain types for the Parametric Timber Structure Designer.
 *
 * Units: all lengths are millimetres (mm) unless stated otherwise.
 * World coordinate system (right-handed, Y up):
 *   X → structure length (right wall at x = 0, left wall at x = L – as seen standing in front)
 *   Z → structure width (front wall at z = 0, rear wall at z = W)
 *   Y → up
 * Length (L) and width (W) are OUTER dimensions of the post frame.
 *
 * The framing engine always works in a CANONICAL frame in which the monopitch roof slopes
 * down from the front purlin (H1, high eave) to the rear purlin (H2, low eave) along +Z.
 * `StructureParams.roofDirection` names the world wall the roof slopes down towards; the
 * engine rotates the project into the canonical frame and rotates the geometry back
 * (see engine/orientation.ts). The canonical frame keeps its left wall at x = 0, so every
 * world ↔ canonical map includes a mirror in X; the side cases also swap L/W.
 */

export type Millimeters = number;

export type WallId = 'front' | 'rear' | 'left' | 'right';
export const WALL_IDS: readonly WallId[] = ['front', 'rear', 'left', 'right'] as const;

/** Outer wall the roof slopes DOWN towards (the low eave H2). The opposite wall carries the high eave H1. */
export type RoofDirection = WallId;
export const ROOF_DIRECTIONS: readonly RoofDirection[] = WALL_IDS;

/**
 * How the monopitch roof is framed (canonical frame, slope down towards +Z):
 *  - 'classic'        level purlins along X on the front / rear post rows, rafters run DOWN the
 *                     slope along Z (Pfettendach). Knee braces stand across the slope.
 *  - 'sloped-purlins' post rows run along Z (down the slope) with stepped posts and SLOPED
 *                     purlins; level rafters span across along X. Knee braces stand along the
 *                     slope, so a car can drive in through the low or high eave without hitting
 *                     a brace (gable-entry carport).
 */
export type RoofScheme = 'classic' | 'sloped-purlins';
export const ROOF_SCHEMES: readonly RoofScheme[] = ['classic', 'sloped-purlins'] as const;

/**
 * Knee brace direction along a purlin row: 'both' = a pair per post (V shape),
 * 'left' / 'right' = one brace per post leaning towards the left/right wall,
 * 'alternating' = one brace per post, flipping side from post to post.
 */
export type BraceDirection = 'both' | 'left' | 'right' | 'alternating';
export const BRACE_DIRECTIONS: readonly BraceDirection[] = ['both', 'left', 'right', 'alternating'] as const;

/** Rectangular timber cross-section. `width` is the thickness, `height` the depth in bending. */
export interface TimberSection {
  width: Millimeters;
  height: Millimeters;
}

export type StrengthClass = 'C16' | 'C24' | 'C30' | 'GL24h' | 'GL28c';

export interface TimberSpecs {
  /** Pfosten – square posts, e.g. 120×120 */
  post: TimberSection;
  /** Pfette / Rähm – purlins and top rails, e.g. 120×200 */
  beam: TimberSection;
  /** Sparren – rafters, e.g. 80×160 */
  rafter: TimberSection;
  /** Wandständer – wall studs, width along the wall, height = wall depth, e.g. 60×120 */
  stud: TimberSection;
  /** Kopfband – knee braces, e.g. 80×100 */
  brace: TimberSection;
  strengthClass: StrengthClass;
}

export type TimberKey = keyof Omit<TimberSpecs, 'strengthClass'>;
export const TIMBER_KEYS: readonly TimberKey[] = ['post', 'beam', 'rafter', 'stud', 'brace'] as const;

export interface Overhangs {
  front: Millimeters;
  rear: Millimeters;
  left: Millimeters;
  right: Millimeters;
}

export type RoofCovering =
  | 'trapezoidal-sheet'
  | 'polycarbonate'
  | 'bitumen-shingles'
  | 'roof-tiles'
  | 'green-roof';

export interface LoadSettings {
  /** Characteristic ground snow load s_k in kN/m² (DE Zone 1 ≈ 0.65, Zone 2 ≈ 0.85, Zone 3 ≈ 1.10) */
  snowLoad: number;
  roofCovering: RoofCovering;
  /** EC5 service class (1 = heated interior, 2 = covered exterior, 3 = fully exposed) */
  serviceClass: 1 | 2 | 3;
  /** Peak velocity pressure q_p in kN/m² (DE zone 1 ≈ 0.50, zone 2 ≈ 0.65, zone 3 ≈ 0.80, zone 4 ≈ 0.95 for h ≤ 10 m) */
  windLoad: number;
  /** Concrete footing the posts are set into: depth below ground (mm), 0 or missing = posts on a bare anchor */
  postFootingDepth?: Millimeters;
  /** Diameter of the cylindrical post footing (mm) */
  postFootingDiameter?: Millimeters;
  /** Post base hardware, missing = 'adjustable' */
  postBase?: PostBaseType;
  /** Snow load zone (DIN EN 1991-1-3/NA); with `altitude` it derives snowLoad, missing = s_k typed in directly */
  snowZone?: SnowZone;
  /** Site altitude above sea level (m) */
  altitude?: number;
  /** Site in the North German Plain: exceptional snow s_Ad = 2.3 · s_k as an accidental combination */
  exceptionalSnow?: boolean;
  /** Soil under the post footings, missing = 'non-cohesive' */
  soil?: SoilType;
}

export type SnowZone = '1' | '1a' | '2' | '2a' | '3';

/**
 * non-cohesive = sand / gravel, at least medium dense; cohesive-stiff / cohesive-semi-firm = clayey
 * silt / clay of stiff or semi-firm consistency (DIN 1054 Annex A bearing tables).
 */
export type SoilType = 'non-cohesive' | 'cohesive-stiff' | 'cohesive-semi-firm';

/**
 * Post base hardware. Every type is treated as PINNED in the statics (no Einspannung):
 * adjustable = height-adjustable post base on a heavy-duty anchor;
 * h-anchor = H post base cast into the footing, clear width = post width + 1 mm (121 / 141 mm);
 * h-anchor-reinforced = the heavy version of the same anchor (thicker flat steel).
 */
export type PostBaseType = 'adjustable' | 'h-anchor' | 'h-anchor-reinforced';
export const POST_BASE_TYPES: readonly PostBaseType[] = ['h-anchor', 'h-anchor-reinforced', 'adjustable'] as const;

/** Shape of the post point foundations: square pad (side = size) or cylinder (Ø = size). */
export type FootingShape = 'square' | 'round';

/** How a purlin is tied down to its post against uplift. */
export type PurlinPostConnector = 'angle-brackets' | 'screws' | 'strap';
export const PURLIN_POST_CONNECTORS: readonly PurlinPostConnector[] = ['angle-brackets', 'screws', 'strap'] as const;

/** Fastener at each end of a knee brace. */
export type BraceConnector = 'screws' | 'bolt';

/** What makes a closed wall a shear wall: nothing (board cladding alone does not), crossed steel straps, or sheet panels. */
export type WallBracing = 'none' | 'strap' | 'panels';
export const WALL_BRACINGS: readonly WallBracing[] = ['none', 'strap', 'panels'] as const;

/** Timber species of the façade boards. */
export type CladdingSpecies = 'spruce' | 'larch';

/** What the bottom plates of the walls stand on. */
export type WallBase = 'slab' | 'curb' | 'spacers' | 'hung';
export const WALL_BASES: readonly WallBase[] = ['slab', 'curb', 'spacers', 'hung'] as const;

/**
 * Every build and site assumption the checks, quantities and report rely on – all editable and
 * printed in the statics report. Levels are mm above ±0 (finished floor / paving).
 */
export interface BuildSettings {
  /** Site description printed in the report */
  site: string;
  /** Wind zone and terrain category as text for the report (q_p itself is loads.windLoad) */
  windZone: string;
  terrainCategory: string;
  // ── Post bases & footings ──
  /** Concrete top → post bottom (mm) */
  baseGap: Millimeters;
  /** Extra length ordered on every post, cut on site after levelling (mm) */
  cutReserve: Millimeters;
  /** Post bottom level above ±0; null = concrete top at ±0, post bottom at baseGap */
  postBottomLevel: Millimeters | null;
  /** Point foundation shape; its size is loads.postFootingDiameter (side or Ø), depth loads.postFootingDepth */
  footingShape: FootingShape;
  // ── Uplift chain ──
  /** Sparrenpfettenanker per rafter bearing */
  rafterAnchorsPerBearing: 1 | 2;
  /** Characteristic uplift resistance of one Sparrenpfettenanker per its ETA (kN) */
  rafterAnchorRk: number;
  purlinPostConnector: PurlinPostConnector;
  /** Characteristic uplift resistance of one angle bracket 90×90×65 per its ETA (kN) */
  angleBracketRk: number;
  /** Concrete yield of one 25 kg bag of ready-mix concrete (litres) */
  concreteBagLitres: number;
  // ── Bracing ──
  braceConnector: BraceConnector;
  // ── Wall studs & screen battens in wind ──
  /** Screen battens of slat screens: width along the wall × depth in the wind direction */
  screenBatten: TimberSection;
  /** Largest batten spacing of a slat screen with horizontal slats (mm) */
  screenBattenSpacing: Millimeters;
  /** Pressure coefficient of a porous screen / boards with gaps for the stud bending check */
  screenCp: number;
  /** Crossed Windrispenband in the roof plane, from the braced wall line to the free end (roof diaphragm) */
  roofStraps: boolean;
  /** Net pressure coefficient of closed boarding for the stud bending check */
  wallCp: number;
  /** Deflection limit L/x of studs and battens under wind */
  studDeflectionLimit: number;
  // ── Roof sheeting ──
  /** Cover width of one trapezoidal sheet (mm) */
  sheetCoverWidth: Millimeters;
  /** Profile height of the sheet (mm) */
  sheetProfileHeight: Millimeters;
  /** Longest sheet the supplier delivers (mm) */
  maxSheetLength: Millimeters;
  /** Largest support spacing the profile may span (mm) */
  sheetMaxSpan: Millimeters;
  /** Roof battens across the fall line where the rafters run down the slope */
  battenSection: TimberSection;
  /** Roofing screw diameter × length (mm), timber thread with EPDM washer */
  roofScrewDiameter: number;
  roofScrewLength: Millimeters;
  /** Roofing screws per m² in the field and in the edge / corner zones */
  roofScrewsField: number;
  roofScrewsEdge: number;
  /** Smallest pitch the sheet is laid at, and the tolerance kept above it (°) */
  minSlope: number;
  slopeTolerance: number;
  // ── Walls ──
  wallBase: WallBase;
  /** Concrete curb under the walls (wallBase 'curb'): width × height, top above ±0 */
  curbWidth: Millimeters;
  curbHeight: Millimeters;
  curbTop: Millimeters;
  /** Gap under the bottom plate on spacers (wallBase 'spacers') */
  plateSpacer: Millimeters;
  /** Installation gap per side between a door / window frame and the rough opening */
  installGap: Millimeters;
  claddingSpecies: CladdingSpecies;
  // ── Planning & ordering ──
  /** BGF threshold for procedure-free carports / outbuildings (m²) */
  bgfLimit: number;
  /** Stock lengths the timber yard sells (mm) */
  stockLengths: Millimeters[];
  /** Sections the timber yard sells – auto-fix only picks these, others raise a warning */
  stockSections: TimberSection[];
  // ── Optional material lines ──
  facadeMembrane: boolean;
  vents: number;
  floorBuildUp: boolean;
  /** Paving slabs already in stock, subtracted from the floor build-up (m²) */
  existingPavingM2: number;
}

export type OpeningType = 'door' | 'window' | 'passage';

export interface Opening {
  id: string;
  type: OpeningType;
  /** Offset of the rough opening's left edge along the wall, measured from the wall start corner */
  x: Millimeters;
  /** Sill height of the rough opening above the base (0 for doors and passages) */
  y: Millimeters;
  width: Millimeters;
  height: Millimeters;
  label?: string;
  /** Catalogue preset (see OPENING_PRESETS) the opening was created from; cleared when it is resized by hand */
  preset?: string;
  /** Doors: hinge side as seen from outside the wall */
  hinge?: 'left' | 'right';
  /** Doors: opens into the building or outwards */
  swing?: 'in' | 'out';
}

/** Direction the outer cladding boards run in. */
export type CladdingOrientation = 'vertical' | 'horizontal';
export const CLADDING_ORIENTATIONS: readonly CladdingOrientation[] = ['vertical', 'horizontal'] as const;

/** Outer board cladding of a closed wall; a gap > 0 gives open slatted boarding (the frame shows through). */
export interface WallCladding {
  orientation: CladdingOrientation;
  /** Visible board width (mm) */
  boardWidth: Millimeters;
  /** Clear gap between neighbouring boards (mm), 0 = closed boarding */
  gap: Millimeters;
}

export interface Wall {
  id: WallId;
  /** true → wall is framed with studs and clad; false → open bay (carport style) */
  closed: boolean;
  openings: Opening[];
  /** Closed part along the wall (mm from the wall's start corner, same axis as opening x); omitted → full length */
  start?: Millimeters;
  end?: Millimeters;
  /** Outer board layout; omitted → closed vertical boarding (slat screen: horizontal slats with gaps) */
  cladding?: WallCladding;
  /** Open wall only: slat screen fixed to the posts (wall posts, rail and battens, no studs) */
  screen?: boolean;
  /** Bracing that makes the wall a shear wall; omitted → none (boards alone never count) */
  bracing?: WallBracing;
  /** Sheet-panel bracing: nail spacing along the OSB panel edges (mm); omitted → 75 */
  panelNailSpacing?: Millimeters;
  /** Braced wall: hold-down anchors (Zuganker) tie the ends of its braced stretches into the foundation */
  holdDowns?: boolean;
  /** Open wall only: a rail (Rähm) between the purlin rows without studs or cladding – carries knee braces across */
  rail?: boolean;
  /** Closed wall only: a slat screen continuing the wall beside its closed stretch (same u axis as start / end) */
  screenPart?: WallScreenPart;
}

/** Slat screen over the open rest of a partly closed wall, with its own slat layout. */
export interface WallScreenPart {
  start: Millimeters;
  end: Millimeters;
  /** Slat layout; omitted → horizontal slats with open gaps */
  cladding?: WallCladding;
}

export type PartitionAxis = 'x' | 'z';

/** Interior stud wall (Trennwand) under the roof that divides the footprint into sections. */
export interface Partition {
  id: string;
  label: string;
  /** 'x' – runs along the length (parallel to front/rear) at Z = offset; 'z' – runs across the width at X = offset */
  axis: PartitionAxis;
  /** World position of the wall's centre plane along the perpendicular axis */
  offset: Millimeters;
  /** Extent along the running axis in world coordinates (start < end) */
  start: Millimeters;
  end: Millimeters;
  openings: Opening[];
}

/** Anything that can carry openings: an outer wall or a partition. */
export interface OpeningHost {
  closed: boolean;
  openings: Opening[];
  cladding?: WallCladding;
  screen?: boolean;
  rail?: boolean;
}

/** Selects either an outer wall (one of WALL_IDS) or a partition wall (its id). */
export type WallKey = string;
export const isOuterWall = (key: string): key is WallId => (WALL_IDS as readonly string[]).includes(key);

export type VehicleBodyStyle =
  | 'city'
  | 'compact'
  | 'sedan'
  | 'estate'
  | 'suv'
  | 'van'
  | 'pickup'
  | 'camper'
  | 'motorcycle'
  | 'bicycle'
  | 'bin'
  | 'container'
  // garden-house equipment
  | 'mower'
  | 'ridingMower'
  | 'wheelbarrow'
  | 'shelf'
  | 'table'
  | 'workbench'
  | 'bench'
  | 'firewood'
  | 'box'
  | 'barrel'
  | 'ladder'
  | 'gasGrill'
  | 'kettleGrill';

/** Purpose group shown in the object picker. */
export type ObjectCategory = 'cars' | 'vans' | 'two-wheelers' | 'waste' | 'garden' | 'furniture' | 'storage' | 'water' | 'leisure';

/** Catalogue entry with real-world exterior dimensions (approximate manufacturer data). */
export interface VehicleModel {
  id: string;
  name: string;
  style: VehicleBodyStyle;
  category: ObjectCategory;
  length: Millimeters;
  /** Body width without mirrors */
  width: Millimeters;
  /** Width including folded-out mirrors */
  mirrorWidth: Millimeters;
  height: Millimeters;
  /** Dimensions are only defaults – every placed instance may carry its own `size` */
  customSize?: boolean;
}

/** Per-instance dimensions for catalogue entries with `customSize` (mm). */
export interface ObjectSize {
  length: Millimeters;
  width: Millimeters;
  height: Millimeters;
}

/** A vehicle placed on the ground plane. */
export interface Vehicle {
  id: string;
  modelId: string;
  /** World X/Z of the vehicle centre (mm) */
  x: Millimeters;
  z: Millimeters;
  /** Rotation about the vertical axis in degrees; 0 = length axis along X, front pointing +X */
  rotationDeg: number;
  color: string;
  /** Overrides the catalogue dimensions (only honoured when the model has `customSize`) */
  size?: ObjectSize;
}

export interface VehicleFit {
  vehicleId: string;
  /** Footprint incl. mirrors lies fully under the roof outline */
  covered: boolean;
  /** How far the footprint sticks out of the roof outline (0 when covered) */
  uncoveredMm: Millimeters;
  /** Headroom between the vehicle roof and the lowest roof member above it (negative = collision); Infinity when not under the roof */
  clearance: Millimeters;
  postCollision: boolean;
  /** Labels of closed outer walls / partitions the footprint crosses */
  wallCollisions: string[];
  status: 'ok' | 'warning' | 'fail';
  messages: string[];
}

/**
 * Fall of the ground / paving (Gefälle). The plane falls `percent` % (1 % = 10 mm per m) towards
 * the plan azimuth `direction` in degrees: 0 = towards the front, 90 = right, 180 = rear, 270 = left
 * (world sides). ±0 is the highest corner of the footprint, so posts further down the fall get longer.
 */
export interface GroundSlope {
  percent: number;
  direction: number;
}

export type PavingPattern = 'stretcher' | 'stack' | 'herringbone';

/** A 2D point on the ground plane in world X/Z (mm). */
export interface GroundPoint {
  x: Millimeters;
  z: Millimeters;
}

/** A paved floor (Pflaster) – an arbitrary simple polygon on the ground plane laid with paving stones. */
export interface PavedArea {
  id: string;
  label: string;
  /** Polygon outline (≥ 3 vertices, world X/Z in mm, any winding) */
  points: GroundPoint[];
  /** Paving stone plan dimensions */
  stoneLength: Millimeters;
  stoneWidth: Millimeters;
  /** Joint (gap) width between stones */
  jointWidth: Millimeters;
  /** Stone thickness – used for the volume / bedding estimate */
  stoneThickness: Millimeters;
  pattern: PavingPattern;
  color: string;
}

export interface PavedAreaSummary {
  id: string;
  label: string;
  areaM2: number;
  perimeterM: number;
  /** Estimated stone count incl. joints, without waste */
  stoneCount: number;
  /** Polygon edges cross each other – area figure is unreliable */
  selfIntersecting: boolean;
  /** Bounding box (mm) */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export interface PavingSummary {
  areas: PavedAreaSummary[];
  /** Sum of all paved floors (m²) */
  totalAreaM2: number;
  totalStoneCount: number;
}

export type ConnectionMode = 'hardware' | 'traditional';

/**
 * How the timber floor is carried:
 *  - 'slab'    sleepers (Lagerhölzer) laid on levelling pads on a concrete slab – low build-up
 *  - 'bearers' joists on bearers (Unterzüge) standing on point foundations / pedestals – ventilated
 */
export type FloorSupport = 'slab' | 'bearers';
export const FLOOR_SUPPORTS: readonly FloorSupport[] = ['slab', 'bearers'] as const;

export type FloorDecking = 'spruce-boards' | 'osb' | 'larch-decking';
export const FLOOR_DECKINGS: readonly FloorDecking[] = ['spruce-boards', 'osb', 'larch-decking'] as const;

/** Timber floor (Holzfußboden) inside the post frame. */
export interface FloorSettings {
  enabled: boolean;
  support: FloorSupport;
  /** Floor joists / sleepers (Fußbodenbalken / Lagerhölzer), b × h */
  joist: TimberSection;
  /** Bearers under the joists (Unterzüge) – 'bearers' support only */
  bearer: TimberSection;
  /** Maximum joist centre spacing (board span) */
  maxJoistSpacing: Millimeters;
  /** Maximum bearer centre spacing (joist span) – 'bearers' support only */
  maxBearerSpacing: Millimeters;
  /** Maximum spacing of pads / foundations along a sleeper or bearer */
  maxSupportSpacing: Millimeters;
  decking: FloorDecking;
  /** Characteristic imposed floor load q_k in kN/m² */
  liveLoad: number;
}

export type InsulationMaterial = 'mineral-wool' | 'wood-fibre' | 'cellulose' | 'eps' | 'xps' | 'pir';
export const INSULATION_MATERIALS: readonly InsulationMaterial[] = ['mineral-wool', 'wood-fibre', 'cellulose', 'eps', 'xps', 'pir'] as const;

export type InsulatedElement = 'walls' | 'roof' | 'floor';
export const INSULATED_ELEMENTS: readonly InsulatedElement[] = ['walls', 'roof', 'floor'] as const;

/** One insulated element: material and thickness; thickness 0 leaves the element uninsulated. */
export interface InsulationLayer {
  material: InsulationMaterial;
  thickness: Millimeters;
}

/** Thermal insulation (Wärmedämmung) of the closed outer walls, the roof over the footprint and the timber floor. */
export interface InsulationSettings {
  enabled: boolean;
  walls: InsulationLayer;
  roof: InsulationLayer;
  floor: InsulationLayer;
}

export interface StructureParams {
  length: Millimeters;
  width: Millimeters;
  /** H1 – top of the high-eave purlin (canonical front; the wall opposite `roofDirection`) */
  frontHeight: Millimeters;
  /** H2 – top of the low-eave purlin (canonical rear; the `roofDirection` wall) */
  rearHeight: Millimeters;
  /** World wall the roof slopes down towards. 'rear' is the classic layout (rafters span the width). */
  roofDirection: RoofDirection;
  /** Framing scheme – see `RoofScheme` */
  roofScheme: RoofScheme;
  overhangs: Overhangs;
  /** Maximum clear post spacing along purlin rows (default 3000) – used when postsPerRow is null */
  maxPostSpacing: Millimeters;
  /** Explicit number of posts per purlin row (≥ 2); null = automatic from maxPostSpacing */
  postsPerRow: number | null;
  /** Maximum rafter centre spacing (default 800) */
  maxRafterSpacing: Millimeters;
  /** Maximum sloped rafter length (default 8000) – longer rafters are split over intermediate purlins */
  maxRafterLength: Millimeters;
  /**
   * Manual axis position of intermediate purlin row `i` in the CANONICAL frame (classic: z from
   * the high-eave wall, sloped-purlins: x from the left wall); null / missing = automatic equal split.
   */
  midPurlinPositions: (Millimeters | null)[];
  /** Maximum stud centre spacing in closed walls (default 625) */
  maxStudSpacing: Millimeters;
  /** Maximum purchasable stock length – longer purlins are spliced over a post */
  maxStockLength: Millimeters;
  /** Generate 45° knee braces (Kopfbänder) between posts and purlins */
  braces: boolean;
  /** Knee brace leg length (horizontal = vertical projection) */
  braceLeg: Millimeters;
  /** Which way the knee braces lean along the purlin rows */
  braceDirection: BraceDirection;
  connectionMode: ConnectionMode;
  timber: TimberSpecs;
  /** Sections the user pinned – statics auto-fix and cost optimization leave them untouched */
  lockedSections: TimberKey[];
  loads: LoadSettings;
  /** Fall of the ground under the structure */
  groundSlope: GroundSlope;
  floor: FloorSettings;
  insulation: InsulationSettings;
  build: BuildSettings;
}

export interface ProjectState {
  id: string;
  name: string;
  params: StructureParams;
  walls: Record<WallId, Wall>;
  partitions: Partition[];
  vehicles: Vehicle[];
  pavedAreas: PavedArea[];
  postOverrides: Record<string, PostOverride>;
  /** Extra posts placed freely in plan, independent of the purlin rows */
  freePosts: FreePost[];
  /** Custom order of the assembly guide's step keys; absent = the recommended order */
  assemblyOrder?: string[];
}

/** A single post placed anywhere under the roof (footprint + overhangs); it carries no purlin of its own. */
export interface FreePost {
  id: string;
  /** World X/Z of the post axis (mm) */
  x: Millimeters;
  z: Millimeters;
}

export interface PostOverride {
  position?: Millimeters;
  removed?: boolean;
}

export interface SavedProject {
  id: string;
  name: string;
  savedAt: string; // ISO date
  project: ProjectState;
}

// ─────────────────────────────────────────────────────────────────────────────
// Framing output
// ─────────────────────────────────────────────────────────────────────────────

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type MemberCategory =
  | 'post'
  | 'beam'
  | 'rafter'
  | 'stud'
  | 'plate'
  | 'header'
  | 'sill'
  | 'brace'
  | 'joist'
  | 'bearer'
  | 'batten';

/** Angle of each end cut in degrees measured from a square (90°) cut. 0 = square. */
export interface EndCuts {
  start: number;
  end: number;
}

/** A 2D point in a member's local profile plane: u along the length axis, v along the `up` axis. */
export interface ProfilePoint {
  u: number;
  v: number;
}

/**
 * A single solid timber member. Geometry is described by a local frame:
 *  - `start`      world position (mm) of the member axis at its start end
 *  - `direction`  unit vector along the member length (local +u)
 *  - `up`         unit vector along the section height (local +v)
 *  - the section width is extruded symmetrically along direction × up
 * `profile` is the exact outline in the (u, v) plane, including end cuts and notches.
 */
export interface Member {
  id: string;
  category: MemberCategory;
  /** English display name, e.g. "Rafter" */
  name: string;
  /** German trade term, e.g. "Sparren" */
  nameDe: string;
  /** Grouping label for the cut list, e.g. "Rafter (Sparren)" */
  group: string;
  section: TimberSection;
  /** Overall cut length: the longest edge of the piece (mm) */
  length: Millimeters;
  start: Vec3;
  direction: Vec3;
  up: Vec3;
  cuts: EndCuts;
  profile: ProfilePoint[];
  wallId?: WallId;
  /** Set for members of an interior partition wall */
  partitionId?: string;
  /** Purlins: key of the post row they sit on ('front', 'mid0', …) */
  purlinRow?: string;
  notes?: string;
}

/** Flat sheet-like element (cladding panel, roof deck) — rendered as an oriented slab. */
export interface Panel {
  id: string;
  kind: 'cladding' | 'roof' | 'floor' | 'insulation' | 'sheathing';
  wallId?: WallId;
  partitionId?: string;
  /** Box centre when `size` is used; outline origin when `outline` is used (mm) */
  anchor: Vec3;
  /** Local +u axis */
  direction: Vec3;
  /** Local +v axis */
  up: Vec3;
  /** Extrusion / thickness axis */
  normal: Vec3;
  /** Box dimensions [along direction, along up, thickness along normal] in mm */
  size?: [number, number, number];
  /** Outline with holes in (u, v) relative to anchor, extruded along normal by thickness */
  outline?: { outer: ProfilePoint[]; holes: ProfilePoint[][]; thickness: number };
  /** Spaced cladding: the separate boards (u, v outlines) drawn instead of `outline.outer` / `holes` */
  boards?: ProfilePoint[][];
  /** Cladding panels: the board layout */
  cladding?: WallCladding;
  /** Cladding of a slat screen (open slats on battens, no studs) */
  screen?: boolean;
  /** Net area in m² (openings subtracted) */
  areaM2: number;
  /** Floor decks: deck material and the local axis the boards run along */
  floorFinish?: { decking: FloorDecking; boardsAlong: 'u' | 'v' };
  /** Insulation panels: the insulated element and its material */
  insulation?: { part: InsulatedElement; material: InsulationMaterial };
}

export interface RoofGeometry {
  /** Roof pitch angle in degrees (positive, sloping down towards the rear) */
  pitchDeg: number;
  pitchRad: number;
  /** Birdsmouth (Kerve) depth perpendicular to the rafter */
  birdsmouthDepth: Millimeters;
  /** Number of rafters and their centre spacing */
  rafterCount: number;
  rafterSpacing: Millimeters;
  /** Horizontal run of the rafters (W + overhangs) */
  rafterRun: Millimeters;
  /** Sloped length of the rafters (front tail to rear tail) */
  rafterLength: Millimeters;
  /** Number of intermediate purlin rows the rafters are split over */
  midPurlinCount: number;
  /** Pieces per rafter (= midPurlinCount + 1) */
  rafterPieces: number;
  /** Longest single rafter piece (sloped) */
  rafterPieceLength: Millimeters;
  /** Highest point of the roof (top of roof deck at the front) */
  ridgeHeight: Millimeters;
  /** Lowest eave height at the rear (underside of rafter tail) */
  eaveHeight: Millimeters;
  /** Gross roof area in m² (sloped) */
  areaM2: number;
}

/**
 * Post grid in the CANONICAL frame. Post override keys (`<row>:<index>`) refer to these rows,
 * so the grid is not rotated into world space.
 *  - 'classic':        purlin rows run along X at z = front / mid… / rear; closed side walls get
 *                      extra posts along Z.
 *  - 'sloped-purlins': purlin rows run along Z at x = left / mid… / right; closed front / rear
 *                      walls get extra posts along X.
 */
export interface PostGrid {
  scheme: RoofScheme;
  /** Purlin rows in order: classic front → rear, sloped-purlins left → right */
  rows: PostRow[];
  /** Intermediate posts of the closed walls that carry no purlin (classic: left / right, sloped-purlins: front / rear) */
  wallPosts: Partial<Record<WallId, WallPosts>>;
  /** Nominal post spacing along a purlin row */
  postSpacing: Millimeters;
}

/** One purlin row with its posts (canonical frame). */
export interface PostRow {
  /** Override key prefix: 'front' | 'rear' | 'left' | 'right' | 'mid0', 'mid1', … */
  key: string;
  /** Eave rows sit on an outer wall; intermediate rows have none */
  wallId?: WallId;
  /** 0-based index of an intermediate row */
  index?: number;
  /** Axis the row runs along */
  axis: 'x' | 'z';
  /** Fixed coordinate of the row: z for rows along X, x for rows along Z */
  offset: Millimeters;
  /** Post axis positions along the row */
  positions: Millimeters[];
  keys: string[];
  name: string;
  nameDe: string;
}

export interface WallPosts {
  /** Post axis positions along the wall (u from the canonical start corner) */
  positions: Millimeters[];
  keys: string[];
}

export interface FramingWarning {
  level: 'info' | 'warning' | 'error';
  message: string;
  wallId?: WallId;
  partitionId?: string;
  openingId?: string;
}

/** Summary of the generated timber floor (orientation-free). */
export interface FloorGeometry {
  support: FloorSupport;
  decking: FloorDecking;
  /** Net deck area in m² (posts and partitions cut out) */
  areaM2: number;
  /** Top of the deck above the base (mm) */
  topHeight: Millimeters;
  deckThickness: Millimeters;
  joistCount: number;
  joistSpacing: Millimeters;
  /** Joist span between supports (bearer spacing, or pad spacing on a slab) */
  joistSpan: Millimeters;
  bearerCount: number;
  bearerSpacing: Millimeters;
  /** Bearer span between foundations */
  bearerSpan: Millimeters;
  /** Pads (slab) or point foundations (bearers) */
  supportCount: number;
  /** Joist-on-bearer crossings (bearers support) */
  crossings: number;
  /** Total length of timber lying on pads / foundations (sleepers or bearers), m */
  bedLengthM: number;
}

/** Thermal result of one insulated element. */
export interface InsulationElementResult {
  part: InsulatedElement;
  material: InsulationMaterial;
  thickness: Millimeters;
  /** Insulated area in m² (openings and cut-outs subtracted) */
  areaM2: number;
  /** Depth of the timber the insulation sits between (studs, rafters, joists) */
  cavityDepth: Millimeters;
  /** Share of the area bridged by that timber (width / centre spacing) */
  timberFraction: number;
  /** Thermal resistance of the insulation layer alone, d / λ (m²K/W) */
  rInsulation: number;
  /** Total resistance incl. surface resistances and the timber bridging (m²K/W) */
  rTotal: number;
  /** Thermal transmittance U = 1 / R_total (W/m²K) */
  uValue: number;
}

export interface InsulationResult {
  elements: InsulationElementResult[];
}

export interface FramingResult {
  members: Member[];
  panels: Panel[];
  roof: RoofGeometry;
  grid: PostGrid;
  warnings: FramingWarning[];
  /** Present when the timber floor is enabled */
  floor?: FloorGeometry;
  /** Present when insulation is enabled and at least one element is insulated */
  insulation?: InsulationResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Statics
// ─────────────────────────────────────────────────────────────────────────────

export type StaticsStatus = 'ok' | 'warning' | 'fail';

export type StaticsCheckKind = 'vertical' | 'lateral' | 'uplift' | 'connection' | 'foundation';

export interface StaticsCheck {
  id: string;
  /**
   * vertical = gravity member check, lateral = wind / sway bracing, uplift = anchoring against suction,
   * connection = fasteners of a joint, foundation = post footing in the soil
   */
  kind: StaticsCheckKind;
  element: string;
  elementDe: string;
  section: TimberSection;
  /** Effective span in mm */
  span: Millimeters;
  /** Design line load in kN/m (ULS) */
  loadUls: number;
  /** Characteristic line load in kN/m (SLS) */
  loadSls: number;
  /** Bending utilisation σ_m,d / f_m,d (or compression for posts) */
  stressUtil: number;
  /** Deflection utilisation w_fin / w_limit */
  deflectionUtil: number;
  /** Final deflection in mm */
  deflection: Millimeters;
  deflectionLimit: Millimeters;
  utilisation: number;
  status: StaticsStatus;
  recommendation?: string;
  detail: string;
  /** Hardware this check sizes and the model fits (listed in the connections) */
  fittings?: StaticsFitting[];
}

/** Hardware sized by a check: roof strap crosses, or hold-downs at the ends of a braced wall. */
export type StaticsFitting =
  | { kind: 'roof-straps'; diagonals: number; strapsPerDiagonal: number; length: Millimeters; nailsPerEnd: number }
  | { kind: 'hold-down'; wallId: WallId; count: number; tension: number };

export interface StaticsResult {
  status: StaticsStatus;
  checks: StaticsCheck[];
  loads: {
    deadLoad: number; // kN/m² on plan (covering + deck + rafters)
    snowLoadRoof: number; // kN/m² on plan (μ·s_k)
    totalCharacteristic: number;
    totalDesign: number;
    kmod: number;
    kdef: number;
    /** Peak velocity pressure q_p in kN/m² */
    windPressure: number;
    /** Gust speed equivalent to q_p in m/s */
    gustSpeed: number;
    /** Characteristic horizontal wind force per direction in kN (x = along the length, z = across) */
    windForce: { x: number; z: number };
    /** Characteristic roof uplift (suction) in kN/m² of plan */
    upliftPressure: number;
    /** Characteristic ground snow load s_k (kN/m²) */
    groundSnowLoad: number;
    /** Snow load shape coefficient μ1 */
    snowShape: number;
    /** Exceptional ground snow s_Ad (kN/m²), only for sites in the North German Plain */
    exceptionalSnow?: number;
    /** Overall canopy force coefficients c_f (pressure / suction) */
    canopyForce: { down: number; up: number };
    /** Local net pressure coefficients c_p,net: interior zone A and the worst edge zone B / C */
    canopyLocal: { interior: { down: number; up: number }; edge: { down: number; up: number } };
  };
  /** Gust speed (m/s) at which the first lateral / roof check reaches 100 % – undefined when the structure already fails without wind */
  collapseGustSpeed?: number;
  /** Element that gives way first as the wind increases */
  collapseElement?: string;
  /** What this pre-design does not check – listed explicitly instead of an overall "OK" */
  notChecked: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Bill of materials / cut list / hardware
// ─────────────────────────────────────────────────────────────────────────────

export interface BomLine {
  category: MemberCategory | 'sheathing' | 'roofing' | 'flooring';
  /** Flooring lines: the deck material */
  decking?: FloorDecking;
  label: string;
  labelDe: string;
  section?: TimberSection;
  count: number;
  totalLengthM: number;
  volumeM3: number;
  areaM2?: number;
  /** Estimated timber mass in kg (density from strength class) */
  massKg: number;
  /** Cladding lines: stock boards to buy for the pieces, one option per stock length */
  stockBoards?: StockBoardOption[];
  /** Trapezoidal sheet roofing: the sheet list – one piece per run along the fall line */
  sheets?: { count: number; length: Millimeters; coverWidth: Millimeters };
}

/** Timber of one section as one supplier order: the pieces packed into stock lengths. */
export interface TimberOrderLine {
  section: TimberSection;
  /** Made-to-order glulam (deeper than stock KVH) */
  glulam: boolean;
  /** Cut pieces incl. the cut reserve on posts (mm) */
  pieces: Millimeters[];
  /** Stock lengths to buy */
  stock: { lengthMm: Millimeters; count: number }[];
  /** Pieces longer than the longest stock length, ordered to length (rounded up to 0.5 m) */
  special: Millimeters[];
  volumeM3: number;
  /** Offcut, % of the bought length */
  offcutPct: number;
}

/** Stock boards of one length that the cladding pieces are cut from. */
export interface StockBoardOption {
  lengthMm: Millimeters;
  count: number;
  /** Offcut left over, % of the bought length */
  wastePct: number;
}

/** A door or window product (Tür / Fenster) to be bought and fitted into a rough opening. */
export interface FixtureLine {
  openingId: string;
  /** Wall label the opening sits in */
  wall: string;
  type: OpeningType;
  label: string;
  preset?: string;
  /** Product name, e.g. "Boarded door 875×2000" or "Custom window" */
  product: string;
  productDe: string;
  /** Rough opening in the framing (Rohbaumaß) */
  roughWidth: Millimeters;
  roughHeight: Millimeters;
  /** Outer size of the door frame / window frame that fits the rough opening */
  frameWidth: Millimeters;
  frameHeight: Millimeters;
  /** Materials and hardware needed to fit this opening */
  materials: string[];
}

/** Non-timber material bought by quantity: roof battens & membranes, paving, … */
export interface MaterialItem {
  /** Unique line id */
  id: string;
  /** Price key in MaterialPrices.materialPerUnit */
  priceKey: string;
  name: string;
  nameDe: string;
  spec: string;
  quantity: number;
  unit: 'm' | 'm²' | 'm³' | 'pcs';
  note?: string;
}

export interface BomResult {
  lines: BomLine[];
  /** All framing timber by section, packed into the yard's stock lengths */
  timberOrder: TimberOrderLine[];
  /** Doors and windows to buy (not part of the timber lines) */
  fixtures: FixtureLine[];
  /** Other materials (roof battens, membranes, flashing, paving build-up) */
  materials: MaterialItem[];
  totalVolumeM3: number;
  totalLengthM: number;
  totalMassKg: number;
}

export interface CutListItem {
  pos: number;
  group: string;
  name: string;
  nameDe: string;
  section: TimberSection;
  length: Millimeters;
  cuts: EndCuts;
  quantity: number;
  notes?: string;
  memberIds: string[];
  /** Walls the grouped pieces belong to (for display) */
  walls?: string[];
  /** Posts: length to order (Bestelllänge) = target length (Sollmaß) + cut reserve, cut on site after levelling */
  orderLength?: Millimeters;
}

export interface HardwareItem {
  id: string;
  name: string;
  nameDe: string;
  spec: string;
  quantity: number;
  unit: 'pcs' | 'm';
  note?: string;
}

export interface JoineryItem {
  id: string;
  name: string;
  nameDe: string;
  quantity: number;
  note?: string;
}

export interface ConnectionsResult {
  mode: ConnectionMode;
  hardware: HardwareItem[];
  joinery: JoineryItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User-editable unit prices (EUR) used to cost out the BOM and hardware list.
 * Stored per member category so the price stays valid when a section's dimensions change;
 * the UI shows and edits the equivalent EUR-per-running-metre price for the project's
 * current section (matching how timber yards actually quote — EUR/lfm, not EUR/m³).
 */
export interface MaterialPrices {
  /** Solid/KVH timber, EUR per m³, keyed by member category (post, beam, rafter, …) */
  timberPerM3: Record<MemberCategory, number>;
  /** Glulam (BSH), EUR per m³ — used for any section larger than stock KVH, whatever the member category */
  glulamPerM3: number;
  /** Timber-yard delivery incl. logistics fee, EUR per order */
  deliveryFlat: number;
  /** Timber-yard energy surcharge, % on the yard's timber & boards plus delivery */
  energySurchargePct: number;
  /** Wall cladding boards, EUR per m² of coverage */
  claddingBoardPerM2: number;
  /** Roof deck boarding (OSB) under heavy coverings, EUR per m² of coverage */
  roofDeckPerM2: number;
  /** Roof covering material, EUR per m², keyed by covering type */
  roofingPerM2: Record<RoofCovering, number>;
  /** Hardware & fixings, EUR per piece (or per metre for 'm'-unit items), keyed by HardwareItem.id */
  hardwarePerUnit: Record<string, number>;
  /** Floor deck material, EUR per m² */
  flooringPerM2: Record<FloorDecking, number>;
  /** Other materials, EUR per unit, keyed by MaterialItem.priceKey */
  materialPerUnit: Record<string, number>;
  /** Doors & windows: EUR per piece keyed by preset id; 'custom-door' / 'custom-window' are EUR per m² of frame */
  fixturePrice: Record<string, number>;
}

export interface PricingLine {
  /** Stable key identifying which price field this line edits (see PriceFieldRef) */
  id: string;
  label: string;
  labelDe?: string;
  quantity: number;
  /** '%' lines: quantity is the EUR base amount and unitPrice the percentage */
  unit: 'm' | 'm²' | 'm³' | 'pcs' | '%';
  unitPrice: number;
  lineTotal: number;
  /** How to look up / write back the editable price for this line */
  priceRef: PriceFieldRef;
}

/** Points at one field inside MaterialPrices so the UI can read/write it generically. */
export type PriceFieldRef =
  | { kind: 'timber'; category: MemberCategory; section: TimberSection }
  | { kind: 'glulam'; section: TimberSection }
  | { kind: 'delivery' }
  | { kind: 'energySurcharge' }
  | { kind: 'claddingBoard' }
  | { kind: 'roofDeck' }
  | { kind: 'roofing'; covering: RoofCovering }
  | { kind: 'hardware'; hardwareId: string }
  | { kind: 'flooring'; decking: FloorDecking }
  | { kind: 'material'; priceKey: string }
  | { kind: 'fixture'; key: string };

export interface PricingResult {
  /** Timber, boards, roof covering and floor deck */
  timberLines: PricingLine[];
  /** Roof accessories, paving build-up and other bulk materials */
  otherLines: PricingLine[];
  /** Doors and windows */
  fixtureLines: PricingLine[];
  hardwareLines: PricingLine[];
  /** Timber-yard delivery and energy surcharge */
  deliveryLines: PricingLine[];
  /** Timber + other materials */
  materialTotal: number;
  fixtureTotal: number;
  hardwareTotal: number;
  deliveryTotal: number;
  grandTotal: number;
}

export interface DerivedModel {
  framing: FramingResult;
  statics: StaticsResult;
  bom: BomResult;
  cutList: CutListItem[];
  connections: ConnectionsResult;
  vehicles: VehicleFit[];
  paving: PavingSummary;
}

// ─────────────────────────────────────────────────────────────────────────────
// View state
// ─────────────────────────────────────────────────────────────────────────────

export type CameraPreset = 'iso' | 'top' | 'front' | 'rear' | 'left' | 'right' | 'wall';
export type HighlightMode = 'solid' | 'edges' | 'wireframe';

export interface LayerVisibility {
  frame: boolean;
  cladding: boolean;
  roof: boolean;
  dimensions: boolean;
  grid: boolean;
  vehicles: boolean;
  paving: boolean;
  floor: boolean;
  insulation: boolean;
}

export interface ViewSettings {
  layers: LayerVisibility;
  highlight: HighlightMode;
  cameraPreset: CameraPreset;
  orthographic: boolean;
  measureMode: boolean;
  /** Show distances from the clicked member to its surrounding members */
  neighbourMode: boolean;
  /** Largest clear gap (mm) still reported as a neighbour */
  neighbourRadius: Millimeters;
  /** Maximum number of neighbours shown at once */
  neighbourLimit: number;
}

/** One measured relation between the inspected member and a nearby member. */
export interface NeighbourLink {
  memberId: string;
  name: string;
  nameDe: string;
  category: MemberCategory;
  /** Clear gap between the two timbers, face to face (mm); 0 when they touch */
  gap: Millimeters;
  /** Axis-to-axis spacing (mm) — centre distance, perpendicular for parallel members */
  axisDistance: Millimeters;
  /** true when both members run in the same direction (stud / rafter spacing applies) */
  parallel: boolean;
  /** Closest point on the inspected member (mm, world) */
  a: Vec3;
  /** Closest point on the neighbour (mm, world) */
  b: Vec3;
}

export interface Measurement {
  id: string;
  a: Vec3;
  b: Vec3;
}
