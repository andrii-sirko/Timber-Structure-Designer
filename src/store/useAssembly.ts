import { useMemo } from 'react';
import type { DerivedModel } from '@/types';
import { applyStepOrder, assemblyProgress, buildAssemblyFrames, buildAssemblySteps, type AssemblyFrame, type AssemblyProgress, type AssemblyStep } from '@/engine/assembly';
import { useProjectStore } from './projectStore';
import { useUiStore } from './uiStore';

export interface AssemblyView {
  steps: AssemblyStep[];
  frames: AssemblyFrame[];
  /** Player position clamped to the current frames (the model may have changed under it) */
  index: number;
  progress: AssemblyProgress;
}

/** Assembly steps of the current project in the user's order (recommended order when none is saved). */
export function useAssemblySteps(model: DerivedModel): AssemblyStep[] {
  const project = useProjectStore((s) => s.project);
  return useMemo(() => applyStepOrder(buildAssemblySteps(model, project), project.assemblyOrder), [model, project]);
}

/** State of the assembly guide while it is open; null otherwise. */
export function useAssembly(model: DerivedModel): AssemblyView | null {
  const active = useUiStore((s) => s.assemblyActive);
  const rawIndex = useUiStore((s) => s.assemblyIndex);
  const pieceMode = useUiStore((s) => s.assemblyPieceMode);
  const steps = useAssemblySteps(model);
  const frames = useMemo(() => buildAssemblyFrames(steps, model.framing.members, pieceMode), [steps, model.framing.members, pieceMode]);
  const index = Math.min(rawIndex, Math.max(frames.length - 1, 0));
  const progress = useMemo(() => assemblyProgress(frames, index), [frames, index]);
  return active ? { steps, frames, index, progress } : null;
}
