import type { Opening, OpeningType, StructureParams } from '@/types';
import { headerHeight } from './openings';
import { wallBays, type WallFrame } from './wallFrame';

/** How a door leaf / window sash is drawn and what it is made of. */
export type DoorStyle = 'boarded' | 'glazed' | 'stable';
export type WindowStyle = 'fixed' | 'tilt' | 'turn-tilt' | 'double';

interface PresetBase {
  id: string;
  label: string;
  labelDe: string;
  /** Outer size of the door frame (Zargenaußenmaß) or window frame (Blendrahmenaußenmaß) */
  frameWidth: number;
  frameHeight: number;
  /** Rough opening in the stud framing (Rohbaumaß / Wandöffnung) */
  roughWidth: number;
  roughHeight: number;
  description: string;
  /** Materials and hardware to buy for this opening (besides the framing timber) */
  materials: string[];
}

export interface DoorPreset extends PresetBase {
  type: 'door';
  style: DoorStyle;
  leaves: 1 | 2;
}

export interface WindowPreset extends PresetBase {
  type: 'window';
  style: WindowStyle;
  /** Default sill height (Brüstungshöhe) of the rough opening above the base */
  sill: number;
}

export type OpeningPreset = DoorPreset | WindowPreset;

/** Installation gap per side between frame and rough opening (foam / compression tape). */
export const FRAME_GAP = 10;

/**
 * Rough door opening per DIN 18100: nominal width + 10, nominal height + 5, rounded up to the
 * 10 mm framing grid. Frame outer size per DIN 18111: nominal − 15 / − 8 (leaf 860×1985 for 875×2000).
 */
function doorSizes(nominalW: number, nominalH: number): Pick<PresetBase, 'frameWidth' | 'frameHeight' | 'roughWidth' | 'roughHeight'> {
  return {
    frameWidth: nominalW - 15,
    frameHeight: nominalH - 8,
    roughWidth: Math.ceil((nominalW + 10) / 10) * 10,
    roughHeight: Math.ceil((nominalH + 5) / 10) * 10,
  };
}

/** Rough window opening = frame outer size + 10 mm gap on every side. */
function windowSizes(frameW: number, frameH: number): Pick<PresetBase, 'frameWidth' | 'frameHeight' | 'roughWidth' | 'roughHeight'> {
  return { frameWidth: frameW, frameHeight: frameH, roughWidth: frameW + 2 * FRAME_GAP, roughHeight: frameH + 2 * FRAME_GAP };
}

const BOARDED_MATERIALS = (leaves: 1 | 2, nominal: string): string[] => [
  `Door leaf${leaves === 2 ? ' ×2' : ''}: 21–24 mm tongue-and-groove boards (Profilbretter) on a Z-frame of 24×100 mm ledges and brace, ${nominal} nominal`,
  'Frame (Zarge): 3 × planed 40×120 mm boards, rebated 15 mm for the leaf, or a ready-made timber frame',
  `T-hinges (Ladenbänder) 300–400 mm, ${leaves === 2 ? '4' : '2'} pcs, galvanised`,
  leaves === 2 ? 'Rim lock with cylinder + shoot bolts (Kantenriegel) top and bottom on the passive leaf' : 'Rim lock or mortise lock with cylinder, handle set',
  'Threshold: 40×60 mm hardwood or aluminium sill with drip edge',
  'Sealing: compression tape (Kompriband) 10 mm around the frame, 6 × 120 mm frame screws',
  'Weather protection: drip cap (Tropfkante) over the header, exterior wood stain',
];

const GLAZED_MATERIALS = (nominal: string): string[] => [
  `Framed door leaf (Rahmentür) ${nominal} nominal, 40–68 mm thick, upper half insulated glazing, lower boarded panel – or a ready-made garden-house door`,
  'Timber frame (Holzzarge) 68 mm, rebated, with EPDM seal',
  '3 × adjustable hinges (Einbohrbänder), mortise lock with profile cylinder, handle set',
  'Threshold: aluminium sill with thermal break and drip edge',
  'Sealing: compression tape 10 mm around the frame, PU foam, 6 × 120 mm frame screws',
  'Drip cap over the header, exterior stain or paint',
];

const STABLE_MATERIALS: string[] = [
  'Two boarded leaves (split at ~1100 mm): 21–24 mm tongue-and-groove boards on 24×100 mm Z-frames, 875×2000 nominal',
  'Frame (Zarge): 3 × planed 40×120 mm boards, rebated 15 mm',
  '4 × T-hinges (Ladenbänder) 300 mm, galvanised',
  'Rim lock on the lower leaf, sliding bolt (Riegel) joining upper and lower leaf, hook to hold the upper leaf open',
  'Threshold: 40×60 mm hardwood sill with drip edge',
  'Compression tape 10 mm, 6 × 120 mm frame screws, drip cap over the header',
];

const windowMaterials = (style: WindowStyle, size: string): string[] => {
  const sash =
    style === 'fixed'
      ? `Fixed glazing (Festverglasung) ${size}, timber or uPVC frame 68–70 mm, double glazing 4/16/4`
      : style === 'tilt'
        ? `Tilt window (Kippfenster) ${size}, timber or uPVC frame 68–70 mm, double glazing, tilt fitting with stay`
        : style === 'turn-tilt'
          ? `Turn-tilt window (Dreh-Kipp) ${size}, timber or uPVC frame 68–70 mm, double glazing 4/16/4, turn-tilt hardware`
          : `Two-sash window (2-flügelig) ${size} with mullion or stulp, timber or uPVC frame 68–70 mm, double glazing`;
  return [
    sash,
    'Exterior window sill (Fensterbank): aluminium or larch board with 40 mm overhang and drip edge',
    'Interior sill board 20 mm',
    'Sealing: compression tape 10 mm all round, PU foam, 4–6 frame screws 7.5 × 112 mm',
    'Drip cap / flashing over the header, exterior cover strips (Deckleisten) 20×60 mm on the cladding',
  ];
};

/**
 * Ready-made door and window sizes that fit into a stud wall without special framing.
 * All rough openings stay ≤ 1800 mm wide so the simplified header (Sturz) stays ≤ 160 mm.
 */
export const OPENING_PRESETS: readonly OpeningPreset[] = [
  {
    id: 'door-boarded-750',
    type: 'door',
    style: 'boarded',
    leaves: 1,
    label: 'Boarded door 750×2000',
    labelDe: 'Brettertür 750×2000',
    ...doorSizes(750, 2000),
    description: 'Narrow tool-shed door (DIN 750×2000). Cheapest option; clear passage ≈ 700 mm.',
    materials: BOARDED_MATERIALS(1, '750×2000'),
  },
  {
    id: 'door-boarded-875',
    type: 'door',
    style: 'boarded',
    leaves: 1,
    label: 'Boarded door 875×2000',
    labelDe: 'Brettertür 875×2000',
    ...doorSizes(875, 2000),
    description: 'Standard single garden-house door (DIN 875×2000): boards on a Z-frame. Clear passage ≈ 800 mm.',
    materials: BOARDED_MATERIALS(1, '875×2000'),
  },
  {
    id: 'door-glazed-875',
    type: 'door',
    style: 'glazed',
    leaves: 1,
    label: 'Glazed door 875×2000',
    labelDe: 'Gartenhaustür verglast 875×2000',
    ...doorSizes(875, 2000),
    description: 'Framed door with a glazed upper half – brings daylight into a summer house. Clear passage ≈ 800 mm.',
    materials: GLAZED_MATERIALS('875×2000'),
  },
  {
    id: 'door-glazed-1000',
    type: 'door',
    style: 'glazed',
    leaves: 1,
    label: 'Glazed door 1000×2000',
    labelDe: 'Gartenhaustür verglast 1000×2000',
    ...doorSizes(1000, 2000),
    description: 'Wide framed door with glazing (DIN 1000×2000). Clear passage ≈ 925 mm – comfortable for wheelbarrows.',
    materials: GLAZED_MATERIALS('1000×2000'),
  },
  {
    id: 'door-stable-875',
    type: 'door',
    style: 'stable',
    leaves: 1,
    label: 'Stable door 875×2000',
    labelDe: 'Stalltür 875×2000',
    ...doorSizes(875, 2000),
    description: 'Split (Dutch) door: the upper half opens for ventilation while the lower half stays closed.',
    materials: STABLE_MATERIALS,
  },
  {
    id: 'door-double-1500',
    type: 'door',
    style: 'boarded',
    leaves: 2,
    label: 'Double door 1500×2000',
    labelDe: 'Doppeltür 1500×2000',
    ...doorSizes(1500, 2000),
    description: 'Two boarded leaves (DIN 1500×2000) – fits a lawn mower or bicycles. Clear passage ≈ 1420 mm.',
    materials: BOARDED_MATERIALS(2, '1500×2000'),
  },
  {
    id: 'door-double-1750',
    type: 'door',
    style: 'boarded',
    leaves: 2,
    label: 'Double door 1750×2000',
    labelDe: 'Doppeltür 1750×2000',
    ...doorSizes(1750, 2000),
    description: 'Wide double door (DIN 1750×2000) for ride-on mowers and garden machinery. Clear passage ≈ 1670 mm.',
    materials: BOARDED_MATERIALS(2, '1750×2000'),
  },
  {
    id: 'door-double-glazed-1750',
    type: 'door',
    style: 'glazed',
    leaves: 2,
    label: 'Double glazed door 1750×2000',
    labelDe: 'Doppeltür verglast 1750×2000',
    ...doorSizes(1750, 2000),
    description: 'Two framed leaves with glazed upper halves – summer-house entrance opening onto a terrace.',
    materials: [
      'Two framed door leaves (Rahmentür) 1750×2000 nominal, 40–68 mm thick, glazed upper halves, or a ready-made double garden-house door',
      'Timber frame (Holzzarge) 68 mm, rebated, with EPDM seal',
      '6 × adjustable hinges, mortise lock with profile cylinder on the active leaf, shoot bolts on the passive leaf',
      'Threshold: aluminium sill with thermal break and drip edge',
      'Compression tape 10 mm, PU foam, 6 × 120 mm frame screws, drip cap over the header',
    ],
  },
  {
    id: 'window-fixed-500',
    type: 'window',
    style: 'fixed',
    sill: 1400,
    label: 'Fixed window 500×500',
    labelDe: 'Festverglasung 500×500',
    ...windowSizes(500, 500),
    description: 'Small fixed light for a tool shed – fits between two studs at 625 mm centres without extra framing.',
    materials: windowMaterials('fixed', '500×500'),
  },
  {
    id: 'window-tilt-800x500',
    type: 'window',
    style: 'tilt',
    sill: 1400,
    label: 'Tilt window 800×500',
    labelDe: 'Kippfenster 800×500',
    ...windowSizes(800, 500),
    description: 'High-level tilt window for ventilation above shelving.',
    materials: windowMaterials('tilt', '800×500'),
  },
  {
    id: 'window-turntilt-600x800',
    type: 'window',
    style: 'turn-tilt',
    sill: 1000,
    label: 'Turn-tilt window 600×800',
    labelDe: 'Dreh-Kipp-Fenster 600×800',
    ...windowSizes(600, 800),
    description: 'Compact opening window (standard stock size).',
    materials: windowMaterials('turn-tilt', '600×800'),
  },
  {
    id: 'window-turntilt-800x800',
    type: 'window',
    style: 'turn-tilt',
    sill: 1000,
    label: 'Turn-tilt window 800×800',
    labelDe: 'Dreh-Kipp-Fenster 800×800',
    ...windowSizes(800, 800),
    description: 'Most common garden-house window size; stocked by every supplier.',
    materials: windowMaterials('turn-tilt', '800×800'),
  },
  {
    id: 'window-turntilt-800x1000',
    type: 'window',
    style: 'turn-tilt',
    sill: 900,
    label: 'Turn-tilt window 800×1000',
    labelDe: 'Dreh-Kipp-Fenster 800×1000',
    ...windowSizes(800, 1000),
    description: 'Tall single-sash window for a summer house.',
    materials: windowMaterials('turn-tilt', '800×1000'),
  },
  {
    id: 'window-turntilt-1000x1000',
    type: 'window',
    style: 'turn-tilt',
    sill: 900,
    label: 'Turn-tilt window 1000×1000',
    labelDe: 'Dreh-Kipp-Fenster 1000×1000',
    ...windowSizes(1000, 1000),
    description: 'Square single-sash window (stock size); header stays at 160 mm.',
    materials: windowMaterials('turn-tilt', '1000×1000'),
  },
  {
    id: 'window-double-1200x1000',
    type: 'window',
    style: 'double',
    sill: 900,
    label: 'Two-sash window 1200×1000',
    labelDe: 'Zweiflügeliges Fenster 1200×1000',
    ...windowSizes(1200, 1000),
    description: 'Two sashes with a central mullion – the classic garden-house front window.',
    materials: windowMaterials('double', '1200×1000'),
  },
  {
    id: 'window-double-1400x1000',
    type: 'window',
    style: 'double',
    sill: 900,
    label: 'Two-sash window 1400×1000',
    labelDe: 'Zweiflügeliges Fenster 1400×1000',
    ...windowSizes(1400, 1000),
    description: 'Wide two-sash window; needs a bay of at least ~1700 mm between posts.',
    materials: windowMaterials('double', '1400×1000'),
  },
];

export function findPreset(id: string | undefined): OpeningPreset | undefined {
  return id ? OPENING_PRESETS.find((p) => p.id === id) : undefined;
}

export function presetsOfType(type: OpeningType): OpeningPreset[] {
  return OPENING_PRESETS.filter((p) => p.type === type);
}

/** true when the opening still has the preset's rough size (it was not resized by hand). */
export function presetMatches(opening: Opening, preset: OpeningPreset): boolean {
  return opening.width === preset.roughWidth && opening.height === preset.roughHeight;
}

/** Opening fields (without id / x) for a preset. */
export function openingFromPreset(preset: OpeningPreset): Omit<Opening, 'id' | 'x'> {
  return {
    type: preset.type,
    y: preset.type === 'window' ? preset.sill : 0,
    width: preset.roughWidth,
    height: preset.roughHeight,
    preset: preset.id,
    label: preset.label,
    hinge: preset.type === 'door' ? 'left' : undefined,
    swing: preset.type === 'door' ? 'out' : undefined,
  };
}

export interface PresetFit {
  fits: boolean;
  reason?: string;
}

/**
 * Whether the preset fits into at least one bay of the wall with full king/jack stud framing
 * and room for the header – i.e. it can be built without touching the posts or purlins.
 */
export function presetFits(frame: WallFrame, preset: OpeningPreset, params: StructureParams): PresetFit {
  const sw = params.timber.stud.width;
  const minSill = preset.type === 'window' ? sw + 100 : 0;
  let widest = 0;
  let tallest = 0;
  for (const bay of wallBays(frame)) {
    const usable = bay.end - bay.start - 4 * sw;
    widest = Math.max(widest, usable);
    if (usable < preset.roughWidth) continue;
    // the stud top is linear along the wall, so the best spot is at one end of the allowed x range
    const xMin = bay.start + 2 * sw;
    const xMax = bay.end - 2 * sw - preset.roughWidth;
    const hh = headerHeight(preset.roughWidth) + 20;
    const topAt = (x: number): number => Math.min(frame.studTopAt(x), frame.studTopAt(x + preset.roughWidth)) - hh;
    const top = Math.max(topAt(xMin), topAt(xMax));
    tallest = Math.max(tallest, top - minSill);
    if (top - minSill >= preset.roughHeight) return { fits: true };
  }
  if (widest < preset.roughWidth) return { fits: false, reason: `too wide – widest bay between posts allows ${Math.floor(widest / 10) * 10} mm` };
  return { fits: false, reason: `too tall – wall allows ${Math.floor(tallest / 10) * 10} mm under the header` };
}

/** Material list for any opening: the preset's list, or a generic one for custom sizes. */
export function openingMaterials(opening: Opening): string[] {
  const preset = findPreset(opening.preset);
  if (preset && presetMatches(opening, preset)) return preset.materials;
  const fw = opening.width - 2 * FRAME_GAP;
  const fh = opening.type === 'window' ? opening.height - 2 * FRAME_GAP : opening.height - FRAME_GAP;
  if (opening.type === 'door') {
    return [
      `Custom door leaf and frame for a ${fw}×${fh} mm frame outer size (rough opening ${opening.width}×${opening.height})`,
      'Rebated timber frame from 40×120 mm boards, T-hinges or adjustable hinges, lock with cylinder',
      'Threshold with drip edge, compression tape 10 mm, 6 × 120 mm frame screws, drip cap over the header',
    ];
  }
  if (opening.type === 'window') {
    return [
      `Made-to-measure window, frame outer size ${fw}×${fh} mm (rough opening ${opening.width}×${opening.height})`,
      'Exterior sill with 40 mm overhang, interior sill board, compression tape 10 mm, frame screws, drip cap over the header',
    ];
  }
  return ['Open passage – no joinery; finish the reveal with 20 mm boards'];
}

/** Frame outer size that fits a rough opening (preset size, or rough minus the installation gap). */
export function frameSizeFor(opening: Opening): { width: number; height: number } {
  const preset = findPreset(opening.preset);
  if (preset && presetMatches(opening, preset)) return { width: preset.frameWidth, height: preset.frameHeight };
  return {
    width: opening.width - 2 * FRAME_GAP,
    height: opening.type === 'window' ? opening.height - 2 * FRAME_GAP : opening.height - FRAME_GAP,
  };
}
