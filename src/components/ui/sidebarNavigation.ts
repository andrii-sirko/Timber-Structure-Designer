export const SIDEBAR_TABS = [
  { id: 'dimensions', label: 'Shape' },
  { id: 'roof', label: 'Roof' },
  { id: 'walls', label: 'Walls' },
  { id: 'structure', label: 'Frame' },
  { id: 'site', label: 'Site' },
] as const;

export type SidebarTabId = (typeof SIDEBAR_TABS)[number]['id'];
