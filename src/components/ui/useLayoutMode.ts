import { useSyncExternalStore } from 'react';
import { useUiStore } from '@/store/uiStore';

/** Tablets / touch laptops, and any window too narrow to fit two docked side panels next to the 3D view. */
const TABLET_QUERY = '(pointer: coarse) and (max-width: 1500px), (max-width: 1180px)';
const COARSE_QUERY = '(pointer: coarse)';

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', notify);
      return () => mql.removeEventListener('change', notify);
    },
    () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
    () => false,
  );
}

/** True on touch-first devices (used to enlarge hit targets independently of the panel layout). */
export function useCoarsePointer(): boolean {
  return useMediaQuery(COARSE_QUERY);
}

/**
 * Whether side panels float over the viewport (tablet) or dock beside it (desktop).
 * `auto` follows the device; the header lets the user force either mode.
 */
export function useFloatingLayout(): boolean {
  const pref = useUiStore((s) => s.floatingPanels);
  const tablet = useMediaQuery(TABLET_QUERY);
  return pref === 'auto' ? tablet : pref === 'on';
}
