import { useEffect } from 'react';
import { useProjectStore } from '@/store';

/** Arrow keys nudge the selected paved-floor corner (or the whole floor when no corner is selected); Delete removes the corner; Escape deselects it. */
export function usePavingKeyboard(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const { selectedPavedAreaId, selectedPavedPointIndex, project, movePavedPoint, translatePavedArea, removePavedPoint, selectPavedArea } = useProjectStore.getState();
      if (!selectedPavedAreaId) return;
      const area = project.pavedAreas.find((a) => a.id === selectedPavedAreaId);
      if (!area) return;
      const step = e.shiftKey ? 10 : e.altKey ? 250 : 50;
      const nudge = (dx: number, dz: number): void => {
        if (selectedPavedPointIndex !== null && area.points[selectedPavedPointIndex]) {
          const p = area.points[selectedPavedPointIndex];
          movePavedPoint(area.id, selectedPavedPointIndex, { x: p.x + dx, z: p.z + dz });
        } else {
          translatePavedArea(area.id, dx, dz);
        }
      };
      switch (e.key) {
        case 'ArrowLeft':
          nudge(-step, 0);
          break;
        case 'ArrowRight':
          nudge(step, 0);
          break;
        case 'ArrowUp':
          nudge(0, -step);
          break;
        case 'ArrowDown':
          nudge(0, step);
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedPavedPointIndex === null) return;
          removePavedPoint(area.id, selectedPavedPointIndex);
          break;
        case 'Escape':
          selectPavedArea(selectedPavedPointIndex === null ? null : area.id, null);
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
