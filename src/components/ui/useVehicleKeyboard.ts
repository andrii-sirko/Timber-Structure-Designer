import { useEffect } from 'react';
import { useProjectStore } from '@/store';

/** Arrow keys nudge the selected vehicle (50 mm, Shift = 10 mm, Alt = 250 mm); R rotates 90°; Delete removes it. */
export function useVehicleKeyboard(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const { selectedVehicleId, nudgeVehicle, rotateVehicle, removeVehicle } = useProjectStore.getState();
      if (!selectedVehicleId) return;
      const step = e.shiftKey ? 10 : e.altKey ? 250 : 50;
      switch (e.key) {
        case 'ArrowLeft':
          nudgeVehicle(selectedVehicleId, -step, 0);
          break;
        case 'ArrowRight':
          nudgeVehicle(selectedVehicleId, step, 0);
          break;
        case 'ArrowUp':
          nudgeVehicle(selectedVehicleId, 0, -step);
          break;
        case 'ArrowDown':
          nudgeVehicle(selectedVehicleId, 0, step);
          break;
        case 'r':
        case 'R':
          rotateVehicle(selectedVehicleId, e.shiftKey ? -90 : 90);
          break;
        case 'Delete':
        case 'Backspace':
          removeVehicle(selectedVehicleId);
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
