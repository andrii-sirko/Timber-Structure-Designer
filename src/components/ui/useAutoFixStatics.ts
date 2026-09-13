import { useCallback } from 'react';
import { autoFixStatics } from '@/engine';
import { useProjectStore } from '@/store';
import { useUiStore } from '@/store/uiStore';

/** Runs the statics auto-fix on the current project, applies the parameters and opens the Statics tab with a report. */
export function useAutoFixStatics(): () => void {
  const setParams = useProjectStore((s) => s.setParams);
  const setAutoFixReport = useUiStore((s) => s.setAutoFixReport);
  const openResults = useUiStore((s) => s.openResults);
  return useCallback(() => {
    const report = autoFixStatics(useProjectStore.getState().project);
    if (report.changes.length > 0) setParams(report.params);
    setAutoFixReport(report);
    openResults('statics');
  }, [setParams, setAutoFixReport, openResults]);
}
