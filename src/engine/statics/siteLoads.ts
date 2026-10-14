import type { LoadSettings, SnowZone } from '@/types';

/**
 * Characteristic ground snow load s_k (kN/m²) per DIN EN 1991-1-3/NA, Table NA.1 / eq. NA.1–NA.3,
 * from the snow load zone and the site altitude A (m above sea level). Zones 1a / 2a are 1.25 ×
 * zone 1 / 2. Valid up to about 1500 m – higher sites need the competent authority's values.
 */
export function groundSnowLoad(zone: SnowZone, altitude: number): number {
  const a = ((Math.max(altitude, 0) + 140) / 760) ** 2;
  switch (zone) {
    case '1':
      return Math.max(0.65, 0.19 + 0.91 * a);
    case '1a':
      return 1.25 * Math.max(0.65, 0.19 + 0.91 * a);
    case '2':
      return Math.max(0.85, 0.25 + 1.91 * a);
    case '2a':
      return 1.25 * Math.max(0.85, 0.25 + 1.91 * a);
    case '3':
      return Math.max(1.1, 0.31 + 2.91 * a);
  }
}

export const SNOW_ZONES: SnowZone[] = ['1', '1a', '2', '2a', '3'];

/** Exceptional snow in the North German Plain (DIN EN 1991-1-3/NA, NDP 4.3): s_Ad = 2.3 · s_k, accidental combination. */
export const EXCEPTIONAL_SNOW_FACTOR = 2.3;

/** Highest site altitude (m) the NA formulas cover. */
export const MAX_SNOW_ALTITUDE = 1500;

/** The s_k the statics use: from zone and altitude when a zone is chosen, otherwise the typed-in value. */
export function siteSnowLoad(loads: LoadSettings): number {
  return loads.snowZone ? groundSnowLoad(loads.snowZone, loads.altitude ?? 0) : loads.snowLoad;
}
