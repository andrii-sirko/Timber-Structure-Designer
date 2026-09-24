import { useEffect, useMemo } from 'react';
import type * as THREE from 'three';
import type { ProfilePoint } from '@/types';

/**
 * Geometry rebuilt only when `key` changes. The engine returns fresh member / panel objects on every
 * project edit, so memoising on those references would re-upload every buffer even for unchanged parts;
 * `key` must encode everything `build` reads. Disposed when replaced or unmounted.
 */
export function useKeyedGeometry<T extends THREE.BufferGeometry>(key: string, build: () => T): T {
  const geometry = useMemo(build, [key]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

export function outlineKey(points: readonly ProfilePoint[]): string {
  return points.map((p) => `${p.u},${p.v}`).join(';');
}
