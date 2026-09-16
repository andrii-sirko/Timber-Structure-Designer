import type { MemberCategory, Panel } from '@/types';

export const SIDEBAR_TABS = [
  { id: 'dimensions', label: 'Shape' },
  { id: 'roof', label: 'Roof' },
  { id: 'walls', label: 'Walls' },
  { id: 'structure', label: 'Frame' },
  { id: 'site', label: 'Site' },
] as const;

export type SidebarTabId = (typeof SIDEBAR_TABS)[number]['id'];

/**
 * Where a double-clicked 3D object's settings live: the sidebar tab plus a focus key.
 * A focus key is a `/`-separated path — `vehicles/<id>` opens the `vehicles` section and
 * scrolls to that object's card; a bare `roof` scrolls to the section itself.
 */
export interface SettingsTarget {
  tab: SidebarTabId;
  focus: string;
}

export type PickedObject =
  | { kind: 'member'; category: MemberCategory; wallKey?: string; freePostId?: string | null }
  | { kind: 'panel'; panelKind: Panel['kind']; wallKey?: string }
  | { kind: 'opening'; id: string }
  | { kind: 'vehicle'; id: string }
  | { kind: 'pavedArea'; id: string };

export function settingsTargetFor(picked: PickedObject): SettingsTarget {
  switch (picked.kind) {
    case 'vehicle':
      return { tab: 'site', focus: `vehicles/${picked.id}` };
    case 'pavedArea':
      return { tab: 'site', focus: `paving/${picked.id}` };
    case 'opening':
      return { tab: 'walls', focus: `walls/${picked.id}` };
    case 'panel':
      if (picked.panelKind === 'roof') return { tab: 'roof', focus: 'roof' };
      return picked.panelKind === 'cladding' ? { tab: 'walls', focus: 'walls' } : { tab: 'structure', focus: 'floor' };
    case 'member':
      switch (picked.category) {
        case 'post':
          return { tab: 'dimensions', focus: picked.freePostId ? `posts/${picked.freePostId}` : 'posts' };
        case 'rafter':
        case 'beam':
          return { tab: 'roof', focus: 'roof' };
        case 'brace':
          return { tab: 'structure', focus: 'framing' };
        case 'stud':
        case 'plate':
        case 'header':
        case 'sill':
          return picked.wallKey ? { tab: 'walls', focus: 'walls' } : { tab: 'structure', focus: 'timber' };
        case 'joist':
        case 'bearer':
          return { tab: 'structure', focus: 'floor' };
      }
  }
}

/** Whether a section / card with `key` should open for `focus` (itself or anything inside it). */
export function focusContains(key: string, focus: string): boolean {
  return focus === key || focus.startsWith(`${key}/`);
}

/** The focus path itself, then each enclosing path: `walls/o1` → `walls/o1`, `walls`. */
export function focusFallbacks(focus: string): string[] {
  const parts = focus.split('/');
  return parts.map((_, i) => parts.slice(0, parts.length - i).join('/'));
}
