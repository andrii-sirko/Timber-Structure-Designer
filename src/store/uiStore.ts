import { create } from 'zustand';
import type { StaticsActionResult } from '@/engine';
import type { SettingsTarget, SidebarTabId } from '@/components/ui/sidebarNavigation';

export type ResultsTab = 'bom' | 'cutlist' | 'hardware' | 'pricing' | 'statics' | 'warnings';
export type FloatingPanels = 'auto' | 'on' | 'off';
export type SheetSize = 'half' | 'full';

interface UiState {
  resultsTab: ResultsTab;
  sidebarTab: SidebarTabId;
  /** Focus path requested by double-clicking a 3D object; `nonce` re-triggers the scroll for the same object */
  settingsFocus: { path: string; nonce: number } | null;
  leftOpen: boolean;
  rightOpen: boolean;
  /** Float the panels over the 3D view (tablet layout) instead of docking them beside it; `auto` follows the device */
  floatingPanels: FloatingPanels;
  /** Height of the results bottom sheet in the floating layout */
  sheetSize: SheetSize;
  /** Result of the last statics auto-fix run, shown in the Statics tab */
  autoFixReport: StaticsActionResult | null;
  /** The next click in the 3D view places a free post there */
  placingPost: boolean;
  setPlacingPost: (placing: boolean) => void;
  setAutoFixReport: (report: StaticsActionResult | null) => void;
  setResultsTab: (tab: ResultsTab) => void;
  setSidebarTab: (tab: SidebarTabId) => void;
  /** Open the parameters panel on the tab and section holding an object's settings */
  openSettings: (target: SettingsTarget) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  openResults: (tab: ResultsTab) => void;
  setFloatingPanels: (mode: FloatingPanels) => void;
  toggleSheetSize: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  resultsTab: 'bom',
  sidebarTab: 'dimensions',
  settingsFocus: null,
  leftOpen: true,
  rightOpen: true,
  floatingPanels: 'auto',
  sheetSize: 'half',
  autoFixReport: null,
  placingPost: false,
  setPlacingPost: (placingPost) => set({ placingPost }),
  setAutoFixReport: (autoFixReport) => set({ autoFixReport }),
  setResultsTab: (resultsTab) => set({ resultsTab }),
  setSidebarTab: (sidebarTab) => set({ sidebarTab, settingsFocus: null }),
  openSettings: ({ tab, focus }) =>
    set((s) => ({ sidebarTab: tab, leftOpen: true, settingsFocus: { path: focus, nonce: (s.settingsFocus?.nonce ?? 0) + 1 } })),
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  openResults: (resultsTab) => set({ resultsTab, rightOpen: true }),
  setFloatingPanels: (floatingPanels) => set({ floatingPanels }),
  toggleSheetSize: () => set((s) => ({ sheetSize: s.sheetSize === 'half' ? 'full' : 'half' })),
}));
