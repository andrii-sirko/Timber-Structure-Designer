import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PictureInPicture2, SlidersHorizontal, Table2, TreePine, X } from 'lucide-react';
import { Scene } from '@/components/3d/Scene';
import { AreaInfo } from '@/components/ui/AreaInfo';
import { AssemblyPanel } from '@/components/ui/AssemblyPanel';
import { NeighbourPanel } from '@/components/ui/NeighbourPanel';
import { ParameterSidebar } from '@/components/ui/ParameterSidebar';
import { HistoryControls, useHistoryKeyboard } from '@/components/ui/HistoryControls';
import { ProjectMenu } from '@/components/ui/ProjectMenu';
import { LanguageSelect } from '@/components/ui/LanguageSelect';
import { ResultsPanel } from '@/components/ui/ResultsPanel';
import { ViewportControls } from '@/components/ui/ViewportControls';
import { useVehicleKeyboard } from '@/components/ui/useVehicleKeyboard';
import { usePavingKeyboard } from '@/components/ui/usePavingKeyboard';
import { useModel, useProjectStore } from '@/store';
import { useUiStore } from '@/store/uiStore';
import { useFloatingLayout } from '@/components/ui/useLayoutMode';
import { cx } from '@/components/ui/primitives';
import { useT } from '@/i18n';

/** Height of the results bottom sheet in the floating layout, as a fraction of the viewport. */
const SHEET_HEIGHT = { half: '46%', full: '88%' } as const;

export default function App() {
  const hydrated = useProjectStore((s) => s.hydrated);
  const [timedOut, setTimedOut] = useState(false);
  const { t } = useT();
  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), 2000);
    return () => window.clearTimeout(t);
  }, []);
  if (!hydrated && !timedOut) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        <TreePine className="mr-2 h-5 w-5 animate-pulse text-timber-400" /> {t('Restoring your project…')}
      </div>
    );
  }
  return <Designer />;
}

function Designer() {
  const { t } = useT();
  const model = useModel();
  const projectName = useProjectStore((s) => s.project.name);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const leftOpen = useUiStore((s) => s.leftOpen);
  const rightOpen = useUiStore((s) => s.rightOpen);
  const toggleLeft = useUiStore((s) => s.toggleLeft);
  const toggleRight = useUiStore((s) => s.toggleRight);
  const floatingPref = useUiStore((s) => s.floatingPanels);
  const setFloatingPanels = useUiStore((s) => s.setFloatingPanels);
  const sheetSize = useUiStore((s) => s.sheetSize);
  const toggleSheetSize = useUiStore((s) => s.toggleSheetSize);
  const floating = useFloatingLayout();
  const assemblyActive = useUiStore((s) => s.assemblyActive);
  const canvasRef = useRef<HTMLDivElement>(null);
  useVehicleKeyboard();
  usePavingKeyboard();
  useHistoryKeyboard();

  const sheetHeight = floating && rightOpen ? SHEET_HEIGHT[sheetSize] : '0px';
  const panelInsetLeft = floating && leftOpen ? '21.5rem' : '0px';

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <header className="scroll-thin flex h-12 shrink-0 items-center gap-3 overflow-x-auto border-b border-slate-800 px-3 pointer-coarse:h-14 [&>*]:shrink-0">
        <div className="flex items-center gap-2">
          <TreePine className="h-5 w-5 text-timber-400" />
          <span className="hidden text-sm font-semibold tracking-tight whitespace-nowrap lg:inline">{t('Timber Structure Designer')}</span>
        </div>
        <input
          className="min-w-28 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-200 outline-none hover:border-slate-800 focus:border-sky-500 pointer-coarse:text-base"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          aria-label={t('Project name')}
        />
        <HistoryControls />
        <span className="mx-1 h-5 w-px bg-slate-800" />
        <ProjectMenu model={model} />
        <span className="mx-1 h-5 w-px bg-slate-800" />
        <LanguageSelect />
        <span className="mx-1 h-5 w-px bg-slate-800" />
        <HeaderToggle
          title={floating ? t('Floating panels on – click to dock panels beside the view') : t('Docked panels – click to float them over the view')}
          active={floating}
          onClick={() => setFloatingPanels(floating ? 'off' : floatingPref === 'off' ? 'auto' : 'on')}
        >
          <PictureInPicture2 className="h-4 w-4" />
        </HeaderToggle>
        <HeaderToggle title={t('Toggle parameters')} active={leftOpen} onClick={toggleLeft}>
          {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </HeaderToggle>
        <HeaderToggle title={t('Toggle results')} active={rightOpen} onClick={toggleRight}>
          {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </HeaderToggle>
      </header>

      <div className="flex min-h-0 flex-1">
        {!floating && leftOpen && (
          <aside className="w-80 shrink-0 border-r border-slate-800 bg-slate-950">
            <ParameterSidebar model={model} />
          </aside>
        )}
        <main
          ref={canvasRef}
          className="no-select relative min-w-0 flex-1"
          style={{ '--sheet-h': sheetHeight, '--panel-l': panelInsetLeft } as React.CSSProperties}
        >
          <Scene model={model} />
          <ViewportControls canvasContainer={canvasRef} />
          <NeighbourPanel model={model} />
          {/* The assembly guide takes the area readout's corner while it is open */}
          {!assemblyActive && <AreaInfo model={model} />}
          <AssemblyPanel model={model} />

          {floating && (
            <>
              {/* Parameters: floating card on the left, shortened while the results sheet is up */}
              {leftOpen ? (
                <aside
                  className="panel-float absolute top-3 left-3 z-20 flex w-80 flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/90 shadow-2xl backdrop-blur-md"
                  style={{ bottom: `calc(var(--sheet-h) + 0.75rem)` }}
                  aria-label={t('Parameters')}
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-slate-800 py-1 pr-1 pl-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-timber-400" /> {t('Parameters')}
                    </span>
                    <button
                      type="button"
                      onClick={toggleLeft}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white pointer-coarse:h-10 pointer-coarse:w-10"
                      title={t('Hide parameters')}
                      aria-label={t('Hide parameters')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1">
                    <ParameterSidebar model={model} />
                  </div>
                </aside>
              ) : (
                <FloatingPill className="top-3 left-3" icon={SlidersHorizontal} onClick={toggleLeft}>
                  {t('Parameters')}
                </FloatingPill>
              )}

              {/* Results: bottom sheet, half or nearly full height */}
              {rightOpen ? (
                <section
                  className="sheet-float absolute inset-x-3 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-xl border border-b-0 border-slate-700/80 bg-slate-950/95 shadow-2xl backdrop-blur-md"
                  style={{ height: `var(--sheet-h)` }}
                  aria-label={t('Results')}
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-2">
                    <button
                      type="button"
                      onClick={toggleSheetSize}
                      className="flex flex-1 items-center justify-center gap-2 py-1.5 text-[11px] text-slate-400 hover:text-white pointer-coarse:py-2.5"
                      title={sheetSize === 'half' ? t('Expand results') : t('Shrink results')}
                    >
                      <span className="h-1 w-10 rounded-full bg-slate-600" />
                      {sheetSize === 'half' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleRight}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white pointer-coarse:h-10 pointer-coarse:w-10"
                      title={t('Hide results')}
                      aria-label={t('Hide results')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1">
                    <ResultsPanel model={model} />
                  </div>
                </section>
              ) : (
                <FloatingPill className="bottom-3 left-1/2 -translate-x-1/2" icon={Table2} onClick={toggleRight}>
                  {t('Results')}
                </FloatingPill>
              )}
            </>
          )}
        </main>
        {!floating && rightOpen && (
          <aside className="w-[26rem] shrink-0 border-l border-slate-800 bg-slate-950">
            <ResultsPanel model={model} />
          </aside>
        )}
      </div>
    </div>
  );
}

function HeaderToggle({ title, active, onClick, children }: { title: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors pointer-coarse:h-11 pointer-coarse:w-11',
        active ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800 hover:text-white',
      )}
      title={title}
      aria-label={title}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

/** Re-open button shown in place of a hidden floating panel. */
function FloatingPill({ className, icon: Icon, onClick, children }: { className: string; icon: typeof TreePine; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'absolute z-20 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/90 px-4 py-2 text-sm font-medium text-slate-200 shadow-xl backdrop-blur hover:border-slate-500 hover:text-white pointer-coarse:py-3',
        className,
      )}
    >
      <Icon className="h-4 w-4 text-timber-400" />
      {children}
    </button>
  );
}
