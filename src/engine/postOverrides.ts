import type { PostOverride } from '@/types';

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
