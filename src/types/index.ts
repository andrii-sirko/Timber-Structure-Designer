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

export interface Wall {
  id: WallId;
  /** true → wall is framed with studs and clad; false → open bay (carport style) */
  closed: boolean;
  openings: Opening[];
  /** Closed part along the wall (mm from the wall's start corner, same axis as opening x); omitted → full length */
  start?: Millimeters;
  end?: Millimeters;
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
  floor: FloorSettings;
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
  | 'bearer';

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
  kind: 'cladding' | 'roof' | 'floor';
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
  /** Net area in m² (openings subtracted) */
  areaM2: number;
  /** Floor decks: deck material and the local axis the boards run along */
  floorFinish?: { decking: FloorDecking; boardsAlong: 'u' | 'v' };
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

export interface FramingResult {
  members: Member[];
  panels: Panel[];
  roof: RoofGeometry;
  grid: PostGrid;
  warnings: FramingWarning[];
  /** Present when the timber floor is enabled */
  floor?: FloorGeometry;
}

// ─────────────────────────────────────────────────────────────────────────────
// Statics
// ─────────────────────────────────────────────────────────────────────────────

export type StaticsStatus = 'ok' | 'warning' | 'fail';

export type StaticsCheckKind = 'vertical' | 'lateral' | 'uplift';

export interface StaticsCheck {
  id: string;
  /** vertical = gravity member check, lateral = wind / sway bracing, uplift = anchoring against suction */
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
}

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
  };
  /** Gust speed (m/s) at which the first lateral / roof check reaches 100 % – undefined when the structure already fails without wind */
  collapseGustSpeed?: number;
  /** Element that gives way first as the wind increases */
  collapseElement?: string;
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
  unit: 'm' | 'm²' | 'pcs';
  note?: string;
}

export interface BomResult {
  lines: BomLine[];
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
  /** Sawn/glulam timber, EUR per m³, keyed by member category (post, beam, rafter, …) */
  timberPerM3: Record<MemberCategory, number>;
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
  unit: 'm' | 'm²' | 'pcs';
  unitPrice: number;
  lineTotal: number;
  /** How to look up / write back the editable price for this line */
  priceRef: PriceFieldRef;
}

/** Points at one field inside MaterialPrices so the UI can read/write it generically. */
export type PriceFieldRef =
  | { kind: 'timber'; category: MemberCategory; section: TimberSection }
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
  /** Timber + other materials */
  materialTotal: number;
  fixtureTotal: number;
  hardwareTotal: number;
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
