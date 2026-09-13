import { useMemo } from 'react';
import type { DerivedModel } from '@/types';
import { buildModel, computeAllWallFrames } from '@/engine';
import type { WallFrames } from '@/engine/framing';
import { useProjectStore } from './projectStore';

/** Memoised full engine run for the current project. */
export function useModel(): DerivedModel {
  const project = useProjectStore((s) => s.project);
  return useMemo(() => buildModel(project), [project]);
}

export function useWallFrames(): WallFrames {
  const project = useProjectStore((s) => s.project);
  return useMemo(() => computeAllWallFrames(project), [project]);
}
