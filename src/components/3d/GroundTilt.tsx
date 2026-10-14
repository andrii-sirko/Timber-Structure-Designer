import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import type { GroundPlane } from '@/engine/groundSlope';
import { MM } from './materials';

/**
 * Lays its children (modelled on a level y = 0 ground) onto the falling ground plane: a vertical
 * shear y' = y + gx·x + gz·z + g0, so plan positions stay exact and only heights follow the fall.
 */
export function GroundTilt({ plane, children }: { plane: GroundPlane; children: ReactNode }) {
  const matrix = useMemo(
    () => new THREE.Matrix4().set(1, 0, 0, 0, plane.gx, 1, plane.gz, plane.g0 * MM, 0, 0, 1, 0, 0, 0, 0, 1),
    [plane.gx, plane.gz, plane.g0],
  );
  if (plane.drop === 0) return <>{children}</>;
  return (
    <group matrixAutoUpdate={false} matrix={matrix}>
      {children}
    </group>
  );
}
