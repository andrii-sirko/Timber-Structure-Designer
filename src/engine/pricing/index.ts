import type { BomResult, ConnectionsResult, FloorDecking, MaterialPrices, MemberCategory, PricingLine, PricingResult, RoofCovering, TimberSection } from '@/types';
import { findPreset } from '../framing/openingCatalog';

/**
 * Default unit prices (EUR, incl. VAT) for the Berlin/Potsdam region, checked against
 * Holz Possling (KVH C24 / sawn C24 timber) and BENZ24 (roofing sheet) list prices,
 * plus typical Hornbach/Bauhaus fastener pricing. All values are a starting point —
 * every price is editable in the Pricing tab and persisted per browser.
 *
 * Timber is stored as EUR/m³ per category (stays correct if a section's dimensions
 * change) but shown and edited in the UI as EUR per running metre for the project's
 * current section — e.g. 915 €/m³ × 0.12 × 0.12 m ≈ 13.18 €/lfm for a 120×120mm post,
 * matching how timber yards actually quote (Possling: 120×120mm KVH C24 @ €13.25/lfm).
 */
export const DEFAULT_TIMBER_PRICE_PER_M3: Record<MemberCategory, number> = {
  post: 915, // KVH C24, planed – e.g. 120×120mm @ €13.25/lfm
  beam: 915, // Purlins/rails, KVH C24 – e.g. 120×200mm @ €21.95/lfm
  rafter: 730, // Rough-sawn C24 (deep rafter sections are rarely stock KVH) – e.g. 80×240mm @ €13.95/lfm
  brace: 900, // KVH C24 – e.g. 80×100mm @ €7.20/lfm
  stud: 930, // Smaller KVH C24 cross-sections
  plate: 900, // Bottom plate, sawn C24
  header: 915,
  sill: 915,
  bearer: 780, // Pressure-impregnated (KDI) C24 on foundations – e.g. 100×100mm @ €7.80/lfm
  joist: 900, // KVH C24 – e.g. 60×120mm @ €6.50/lfm
};

export const DEFAULT_FLOORING_PRICE_PER_M2: Record<FloorDecking, number> = {
  'spruce-boards': 24, // Spruce T&G floorboards 28mm (Fichte Dielen)
  osb: 15, // OSB/3 T&G flooring panels 22mm
  'larch-decking': 48, // Siberian larch deck boards 27×145mm
};

/** Other materials, EUR per unit (m, m² or pcs – see MaterialItem.unit), keyed by MaterialItem.priceKey. */
export const DEFAULT_MATERIAL_PRICE_PER_UNIT: Record<string, number> = {
  'roof-trim': 9, // Coated steel eaves / verge trim per m
  'underlay-bitumen': 3.5, // V13 bitumen underlay per m²
  'underlay-breathable': 2.2, // Breathable roof underlay per m²
  'roof-battens': 1.1, // Tiling battens 30×50 per m
  'counter-battens': 0.9, // Counter battens 24×48 per m
  'dpc-strip': 0.8, // Bitumen DPC strip per m
  'paving-stones': 24, // Concrete paving stones 8cm per m²
  'paving-edging': 6.5, // Lawn edging stone incl. concrete bed per m
  'paving-base': 9, // Crushed gravel 0/32, 20cm per m²
  'paving-bedding': 2.5, // Bedding grit 2/5, 4cm per m²
  'paving-joint-sand': 0.8, // Jointing sand per m²
};

/** Doors & windows, EUR per piece by preset id; custom sizes in EUR per m² of frame outer size. */
export const DEFAULT_FIXTURE_PRICE: Record<string, number> = {
  'door-boarded-750': 180,
  'door-boarded-875': 210,
  'door-glazed-875': 480,
  'door-glazed-1000': 560,
  'door-stable-875': 320,
  'door-double-1500': 390,
  'door-double-1750': 430,
  'door-double-glazed-1750': 890,
  'window-fixed-500': 90,
  'window-tilt-800x500': 160,
  'window-turntilt-600x800': 190,
  'window-turntilt-800x800': 220,
  'window-turntilt-800x1000': 250,
  'window-turntilt-1000x1000': 290,
  'window-double-1200x1000': 420,
  'window-double-1400x1000': 470,
  'custom-door': 260,
  'custom-window': 290,
};

export const DEFAULT_CLADDING_BOARD_PER_M2 = 17; // Spruce Rauspund/facade boards, ~20mm
export const DEFAULT_ROOF_DECK_PER_M2 = 12; // OSB/3 roof decking, ≈ 22mm

export const DEFAULT_ROOFING_PRICE_PER_M2: Record<RoofCovering, number> = {
  'trapezoidal-sheet': 18.87, // Luxmetall D-20/138 steel, lightest profile
  polycarbonate: 25, // 16mm twin-wall polycarbonate, entry-level
  'bitumen-shingles': 22, // Bitumen shingles, mid-range
  'roof-tiles': 42, // Concrete roof tiles (Betondachstein)
  'green-roof': 45, // Extensive green roof build-up (substrate + membrane + plants)
};

export const DEFAULT_HARDWARE_PRICE_PER_UNIT: Record<string, number> = {
  'post-base': 18,
  anchor: 4.5,
  'post-bolt': 1.2,
  bracket: 3.5,
  'bracket-nails': 0.03,
  'rafter-anchor': 2.5,
  'rafter-anchor-nails': 0.04,
  'brace-screws': 0.9,
  'side-post-screws': 0.65,
  'stud-screws': 0.15,
  'header-screws': 0.65,
  'plate-anchor': 0.6,
  'splice-bolt': 2.2,
  'splice-plate': 4.5,
  'cladding-screws': 0.12,
  'roof-screws': 0.15,
  'roof-nails': 0.02,
  'deck-screws': 0.08,
  'rafter-screw': 1.1,
  'peg-post': 0.9, // Oak pegs Ø 20 mm (traditional joinery)
  'batten-nails': 0.03,
  'floor-footing': 22, // Concrete bags + adjustable U beam support
  'joist-screws': 0.35,
  'floor-pad': 1.2,
  'sleeper-anchor': 2.5,
  'floor-screws': 0.05,
  'decking-screws-a2': 0.12,
  'door-fitting-kit': 35,
  'window-fitting-kit': 55,
};

export function createDefaultPrices(): MaterialPrices {
  return {
    timberPerM3: { ...DEFAULT_TIMBER_PRICE_PER_M3 },
    claddingBoardPerM2: DEFAULT_CLADDING_BOARD_PER_M2,
    roofDeckPerM2: DEFAULT_ROOF_DECK_PER_M2,
    roofingPerM2: { ...DEFAULT_ROOFING_PRICE_PER_M2 },
    hardwarePerUnit: { ...DEFAULT_HARDWARE_PRICE_PER_UNIT },
    flooringPerM2: { ...DEFAULT_FLOORING_PRICE_PER_M2 },
    materialPerUnit: { ...DEFAULT_MATERIAL_PRICE_PER_UNIT },
    fixturePrice: { ...DEFAULT_FIXTURE_PRICE },
  };
}

/** Deep-merge a persisted/partial price object onto current defaults so new categories/hardware ids always have a value. */
export function normalizePrices(input: unknown): MaterialPrices {
  const base = createDefaultPrices();
  if (!input || typeof input !== 'object') return base;
  const src = input as Partial<MaterialPrices>;
  return {
    timberPerM3: { ...base.timberPerM3, ...(src.timberPerM3 ?? {}) },
    claddingBoardPerM2: typeof src.claddingBoardPerM2 === 'number' ? src.claddingBoardPerM2 : base.claddingBoardPerM2,
    roofDeckPerM2: typeof src.roofDeckPerM2 === 'number' ? src.roofDeckPerM2 : base.roofDeckPerM2,
    roofingPerM2: { ...base.roofingPerM2, ...(src.roofingPerM2 ?? {}) },
    hardwarePerUnit: { ...base.hardwarePerUnit, ...(src.hardwarePerUnit ?? {}) },
    flooringPerM2: { ...base.flooringPerM2, ...(src.flooringPerM2 ?? {}) },
    materialPerUnit: { ...base.materialPerUnit, ...(src.materialPerUnit ?? {}) },
    fixturePrice: { ...base.fixturePrice, ...(src.fixturePrice ?? {}) },
  };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

const sectionAreaM2 = (section: TimberSection): number => (section.width / 1000) * (section.height / 1000);

/** EUR per running metre for a category's current section, derived from the stored EUR/m³ rate. */
export function timberPricePerMeter(category: MemberCategory, section: TimberSection, prices: MaterialPrices): number {
  return round2((prices.timberPerM3[category] ?? 0) * sectionAreaM2(section));
}

/** Inverse of timberPricePerMeter — converts an edited EUR/lfm value back to the stored EUR/m³ rate. */
export function timberM3RateFromPerMeter(section: TimberSection, perMeterPrice: number): number {
  const area = sectionAreaM2(section);
  return area > 0 ? perMeterPrice / area : 0;
}

export function computePricing(bom: BomResult, connections: ConnectionsResult, prices: MaterialPrices, roofCovering: RoofCovering): PricingResult {
  const timberLines: PricingLine[] = [];

  for (const line of bom.lines) {
    if (line.category === 'sheathing') {
      const area = line.areaM2 ?? 0;
      const unitPrice = prices.claddingBoardPerM2;
      timberLines.push({
        id: `sheathing`,
        label: line.label,
        labelDe: line.labelDe,
        quantity: round2(area),
        unit: 'm²',
        unitPrice,
        lineTotal: round2(area * unitPrice),
        priceRef: { kind: 'claddingBoard' },
      });
      continue;
    }
    if (line.category === 'roofing') {
      const area = line.areaM2 ?? 0;
      const coveringPrice = prices.roofingPerM2[roofCovering];
      timberLines.push({
        id: `roofing-covering`,
        label: line.label,
        labelDe: line.labelDe,
        quantity: round2(area),
        unit: 'm²',
        unitPrice: coveringPrice,
        lineTotal: round2(area * coveringPrice),
        priceRef: { kind: 'roofing', covering: roofCovering },
      });
      if (line.volumeM3 > 0) {
        // The deck boards span the same roof area as the covering, so it shares that area.
        timberLines.push({
          id: `roofing-deck`,
          label: 'Roof deck (OSB, under covering)',
          labelDe: 'Dachschalung (OSB)',
          quantity: round2(area),
          unit: 'm²',
          unitPrice: prices.roofDeckPerM2,
          lineTotal: round2(area * prices.roofDeckPerM2),
          priceRef: { kind: 'roofDeck' },
        });
      }
      continue;
    }
    if (line.category === 'flooring') {
      const area = line.areaM2 ?? 0;
      const decking = line.decking ?? 'spruce-boards';
      const unitPrice = prices.flooringPerM2[decking] ?? 0;
      timberLines.push({
        id: `flooring-${decking}`,
        label: line.label,
        labelDe: line.labelDe,
        quantity: round2(area),
        unit: 'm²',
        unitPrice,
        lineTotal: round2(area * unitPrice),
        priceRef: { kind: 'flooring', decking },
      });
      continue;
    }
    // Timber member categories (post/beam/rafter/brace/stud/plate/header/sill) — priced per running metre.
    const category = line.category as MemberCategory;
    const section = line.section;
    const unitPrice = section ? timberPricePerMeter(category, section, prices) : 0;
    timberLines.push({
      id: `timber-${category}-${section?.width}x${section?.height}`,
      label: `${line.label}${section ? ` (${section.width}×${section.height} mm)` : ''}`,
      labelDe: line.labelDe,
      quantity: round2(line.totalLengthM),
      unit: 'm',
      unitPrice,
      lineTotal: round2(line.totalLengthM * unitPrice),
      priceRef: section ? { kind: 'timber', category, section } : { kind: 'timber', category, section: { width: 0, height: 0 } },
    });
  }

  const otherLines: PricingLine[] = bom.materials.map((m) => {
    const unitPrice = prices.materialPerUnit[m.priceKey] ?? 0;
    return {
      id: `material-${m.id}`,
      label: m.spec && !m.name.includes(m.spec) ? `${m.name} (${m.spec})` : m.name,
      labelDe: m.nameDe,
      quantity: m.quantity,
      unit: m.unit,
      unitPrice,
      lineTotal: round2(m.quantity * unitPrice),
      priceRef: { kind: 'material', priceKey: m.priceKey },
    };
  });

  // Doors & windows: stock presets per piece, custom sizes per m² of frame
  const fixtureLines: PricingLine[] = [];
  for (const f of bom.fixtures) {
    const custom = !f.preset;
    const key = custom ? `custom-${f.type}` : f.preset!;
    const quantity = custom ? (f.frameWidth / 1000) * (f.frameHeight / 1000) : 1;
    const unitPrice = prices.fixturePrice[key] ?? 0;
    const id = `fixture-${key}`;
    const existing = fixtureLines.find((l) => l.id === id);
    if (existing) {
      existing.quantity = round2(existing.quantity + quantity);
      existing.lineTotal = round2(existing.quantity * unitPrice);
      continue;
    }
    const preset = findPreset(f.preset);
    fixtureLines.push({
      id,
      label: custom ? (f.type === 'door' ? 'Custom door, made to measure' : 'Custom window, made to measure') : (preset?.label ?? f.product),
      labelDe: custom ? (f.type === 'door' ? 'Tür Sondermaß (je m² Rahmen)' : 'Fenster Sondermaß (je m² Rahmen)') : (preset?.labelDe ?? f.productDe),
      quantity: round2(quantity),
      unit: custom ? 'm²' : 'pcs',
      unitPrice,
      lineTotal: round2(quantity * unitPrice),
      priceRef: { kind: 'fixture', key },
    });
  }

  const pricedJoinery = connections.joinery.filter((j) => prices.hardwarePerUnit[j.id] !== undefined);
  const hardwareLines: PricingLine[] = [...connections.hardware, ...pricedJoinery.map((j) => ({ ...j, unit: 'pcs' as const }))].map((h) => {
    const unitPrice = prices.hardwarePerUnit[h.id] ?? 0;
    return {
      id: `hardware-${h.id}`,
      label: h.name,
      labelDe: h.nameDe,
      quantity: h.quantity,
      unit: h.unit,
      unitPrice,
      lineTotal: round2(h.quantity * unitPrice),
      priceRef: { kind: 'hardware', hardwareId: h.id },
    };
  });

  const sum = (lines: PricingLine[]): number => round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const materialTotal = round2(sum(timberLines) + sum(otherLines));
  const fixtureTotal = sum(fixtureLines);
  const hardwareTotal = sum(hardwareLines);

  return {
    timberLines,
    otherLines,
    fixtureLines,
    hardwareLines,
    materialTotal,
    fixtureTotal,
    hardwareTotal,
    grandTotal: round2(materialTotal + fixtureTotal + hardwareTotal),
  };
}
