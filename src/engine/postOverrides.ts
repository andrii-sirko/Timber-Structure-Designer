import type { PostOverride, RoofScheme } from '@/types';

export interface ResolvedPostPosition {
  key: string;
  position: number;
}

export function resolvePostPositions(
  positions: number[],
  overrides: Record<string, PostOverride>,
  bounds?: { min: number; max: number },
  prefix = 'front',
): ResolvedPostPosition[] {
  return positions.flatMap((defaultPosition, index) => {
    const key = `${prefix}:${index}`;
    const override = overrides[key];
    if (override?.removed) return [];
    const raw = override?.position ?? defaultPosition;
    const position = bounds ? Math.min(Math.max(raw, bounds.min), bounds.max) : raw;
    return [{ key, position }];
  }).sort((a, b) => a.position - b.position);
}

/** Row / wall prefix of a post override key (`front:2` → `front`). */
export const postKeyPrefix = (key: string): string => key.split(':')[0];

/**
 * Canonical axis a post with override key `key` moves along: the axis of its purlin row or wall.
 * classic: front / rear / mid rows along X, side-wall posts along Z.
 * sloped-purlins: left / right / mid rows along Z, front / rear wall posts along X.
 */
export function postKeyAxis(scheme: RoofScheme, key: string): 'x' | 'z' {
  const prefix = postKeyPrefix(key);
  if (prefix === 'front' || prefix === 'rear') return 'x';
  if (prefix === 'left' || prefix === 'right') return 'z';
  return scheme === 'sloped-purlins' ? 'z' : 'x';
}
