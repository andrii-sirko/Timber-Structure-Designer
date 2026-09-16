import type { ThreeEvent } from '@react-three/fiber';
import { useProjectStore } from '@/store';
import { useUiStore } from '@/store/uiStore';
import { settingsTargetFor, type PickedObject } from '@/components/ui/sidebarNavigation';

/** Double-click on a 3D object: jump the parameters panel to that object's settings. */
export function openObjectSettings(picked: PickedObject, e: ThreeEvent<MouseEvent>): void {
  if (useProjectStore.getState().view.measureMode || useUiStore.getState().placingPost) return;
  e.stopPropagation();
  useUiStore.getState().openSettings(settingsTargetFor(picked));
}
