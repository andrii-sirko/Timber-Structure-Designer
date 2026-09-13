import type { BomResult, ConnectionsResult, MaterialPrices, MemberCategory, PricingLine, PricingResult, RoofCovering, TimberSection } from '@/types';

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
};

export function createDefaultPrices(): MaterialPrices {
  return {
    timberPerM3: { ...DEFAULT_TIMBER_PRICE_PER_M3 },
    claddingBoardPerM2: DEFAULT_CLADDING_BOARD_PER_M2,
    roofDeckPerM2: DEFAULT_ROOF_DECK_PER_M2,
    roofingPerM2: { ...DEFAULT_ROOFING_PRICE_PER_M2 },
    hardwarePerUnit: { ...DEFAULT_HARDWARE_PRICE_PER_UNIT },
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

  const hardwareLines: PricingLine[] = connections.hardware.map((h) => {
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

  const materialTotal = round2(timberLines.reduce((s, l) => s + l.lineTotal, 0));
  const hardwareTotal = round2(hardwareLines.reduce((s, l) => s + l.lineTotal, 0));

  return {
    timberLines,
    hardwareLines,
    materialTotal,
    hardwareTotal,
    grandTotal: round2(materialTotal + hardwareTotal),
  };
}
