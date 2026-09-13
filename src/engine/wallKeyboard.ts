import { WALL_IDS } from '../types/index.ts';

export interface KeyboardTargetInfo {
  tagName?: string;
  isContentEditable?: boolean;
}

export function canDeleteSelectedPartition(key: string, selectedWallId: string | null, target: KeyboardTargetInfo | null): boolean {
  if (!selectedWallId || WALL_IDS.includes(selectedWallId as (typeof WALL_IDS)[number])) return false;
  if (key !== 'Delete' && key !== 'Backspace') return false;
  if (target?.isContentEditable) return false;
  return target?.tagName !== 'INPUT' && target?.tagName !== 'TEXTAREA' && target?.tagName !== 'SELECT';
}
