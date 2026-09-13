import { create } from 'zustand';
import type { StaticsActionResult } from '@/engine';

export type ResultsTab = 'bom' | 'cutlist' | 'hardware' | 'pricing' | 'statics' | 'warnings';

interface UiState {
  resultsTab: ResultsTab;
  leftOpen: boolean;
  rightOpen: boolean;
  /** Result of the last statics auto-fix run, shown in the Statics tab */
  autoFixReport: StaticsActionResult | null;
  setAutoFixReport: (report: StaticsActionResult | null) => void;
  setResultsTab: (tab: ResultsTab) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  openResults: (tab: ResultsTab) => void;
}

export const useUiStore = create<UiState>((set) => ({
  resultsTab: 'bom',
  leftOpen: true,
  rightOpen: true,
  autoFixReport: null,
  setAutoFixReport: (autoFixReport) => set({ autoFixReport }),
  setResultsTab: (resultsTab) => set({ resultsTab }),
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  openResults: (resultsTab) => set({ resultsTab, rightOpen: true }),
}));
