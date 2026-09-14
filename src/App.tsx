import { useEffect, useRef, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, TreePine } from 'lucide-react';
import { Scene } from '@/components/3d/Scene';
import { NeighbourPanel } from '@/components/ui/NeighbourPanel';
import { ParameterSidebar } from '@/components/ui/ParameterSidebar';
import { HistoryControls, useHistoryKeyboard } from '@/components/ui/HistoryControls';
import { ProjectMenu } from '@/components/ui/ProjectMenu';
import { ResultsPanel } from '@/components/ui/ResultsPanel';
import { ViewportControls } from '@/components/ui/ViewportControls';
import { useVehicleKeyboard } from '@/components/ui/useVehicleKeyboard';
import { usePavingKeyboard } from '@/components/ui/usePavingKeyboard';
import { useModel, useProjectStore } from '@/store';
import { useUiStore } from '@/store/uiStore';

export default function App() {
  const hydrated = useProjectStore((s) => s.hydrated);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), 2000);
    return () => window.clearTimeout(t);
  }, []);
  if (!hydrated && !timedOut) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        <TreePine className="mr-2 h-5 w-5 animate-pulse text-timber-400" /> Restoring your project…
      </div>
    );
  }
  return <Designer />;
}

function Designer() {
  const model = useModel();
  const projectName = useProjectStore((s) => s.project.name);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const leftOpen = useUiStore((s) => s.leftOpen);
  const rightOpen = useUiStore((s) => s.rightOpen);
  const toggleLeft = useUiStore((s) => s.toggleLeft);
  const toggleRight = useUiStore((s) => s.toggleRight);
  const canvasRef = useRef<HTMLDivElement>(null);
  useVehicleKeyboard();
  usePavingKeyboard();
  useHistoryKeyboard();

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-800 px-3">
        <div className="flex items-center gap-2">
          <TreePine className="h-5 w-5 text-timber-400" />
          <span className="text-sm font-semibold tracking-tight">Timber Structure Designer</span>
        </div>
        <input
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-200 outline-none hover:border-slate-800 focus:border-sky-500"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          aria-label="Project name"
        />
        <HistoryControls />
        <span className="mx-1 h-5 w-px bg-slate-800" />
        <ProjectMenu model={model} />
        <span className="mx-1 h-5 w-px bg-slate-800" />
        <button type="button" onClick={toggleLeft} className="rounded p-1 text-slate-400 hover:text-white" title="Toggle parameters">
          {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
        <button type="button" onClick={toggleRight} className="rounded p-1 text-slate-400 hover:text-white" title="Toggle results">
          {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {leftOpen && (
          <aside className="w-80 shrink-0 border-r border-slate-800 bg-slate-950">
            <ParameterSidebar model={model} />
          </aside>
        )}
        <main ref={canvasRef} className="no-select relative min-w-0 flex-1">
          <Scene model={model} />
          <ViewportControls canvasContainer={canvasRef} />
          <NeighbourPanel model={model} />
        </main>
        {rightOpen && (
          <aside className="w-[26rem] shrink-0 border-l border-slate-800 bg-slate-950">
            <ResultsPanel model={model} />
          </aside>
        )}
      </div>
    </div>
  );
}
