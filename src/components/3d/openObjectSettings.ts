import type { ThreeEvent } from '@react-three/fiber';
import { useProjectStore } from '@/store';
import { useUiStore } from '@/store/uiStore';
import { settingsTargetFor, type PickedObject } from '@/components/ui/sidebarNavigation';

/** Selection keys ('vehicle:<id>', 'member:<id>', 'wall:<key>', 'opening:<id>', 'paved:<id>') active right now. */
function currentSelection(): Set<string> {
  const s = useProjectStore.getState();
  const keys = new Set<string>();
  if (s.selectedVehicleId) keys.add(`vehicle:${s.selectedVehicleId}`);
  if (s.selectedMemberId) keys.add(`member:${s.selectedMemberId}`);
  if (s.selectedWallId) keys.add(`wall:${s.selectedWallId}`);
  if (s.selectedOpeningId) keys.add(`opening:${s.selectedOpeningId}`);
  if (s.selectedPavedAreaId) keys.add(`paved:${s.selectedPavedAreaId}`);
  return keys;
}

// The first click of a double-click already selects the object, so remember what was selected
// before each of the last two presses: the older entry is the state before the double-click began.
const beforePress: Set<string>[] = [];
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    () => {
      beforePress.push(currentSelection());
      if (beforePress.length > 2) beforePress.shift();
    },
    { capture: true },
  );
}

/**
 * Double-click on a 3D object: when it was already selected, unselect it; otherwise jump the
 * parameters panel to that object's settings. `selectionKey` identifies the object's selection.
 */
export function openObjectSettings(picked: PickedObject, e: ThreeEvent<MouseEvent>, selectionKey?: string | null): void {
  if (useProjectStore.getState().view.measureMode || useUiStore.getState().placingPost) return;
  e.stopPropagation();
  if (selectionKey && beforePress.length === 2 && beforePress[0].has(selectionKey)) {
    const s = useProjectStore.getState();
    s.selectOpening(null, null);
    s.selectWall(null);
    s.selectMember(null);
    s.selectVehicle(null);
    s.selectPavedArea(null);
    return;
  }
  useUiStore.getState().openSettings(settingsTargetFor(picked));
}
