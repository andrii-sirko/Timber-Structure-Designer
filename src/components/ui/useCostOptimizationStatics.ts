import { useCallback, useMemo } from 'react';
import { costOptimizeStatics } from '@/engine';
import { useProjectStore } from '@/store';
import { useUiStore } from '@/store/uiStore';

/** Previews and applies the smallest standard sections that still pass statics. */
export function useCostOptimizationStatics(): { run: () => void; available: boolean } {
  const project = useProjectStore((s) => s.project);
  const setParams = useProjectStore((s) => s.setParams);
  const setAutoFixReport = useUiStore((s) => s.setAutoFixReport);
  const openResults = useUiStore((s) => s.openResults);
  const preview = useMemo(() => costOptimizeStatics(project), [project]);

  const run = useCallback(() => {
    const report = costOptimizeStatics(useProjectStore.getState().project);
    if (report.changes.length > 0) setParams(report.params);
    setAutoFixReport(report);
    openResults('statics');
  }, [setParams, setAutoFixReport, openResults]);

  return { run, available: preview.changes.length > 0 };
}
