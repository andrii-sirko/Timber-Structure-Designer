import { useEffect, useRef, useState } from 'react';
import { History, Redo2, Undo2 } from 'lucide-react';
import { useProjectStore } from '@/store';
import { cx, IconButton } from './primitives';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent);
const MOD = IS_MAC ? '⌘' : 'Ctrl+';
const UNDO_KEYS = `${MOD}Z`;
const REDO_KEYS = IS_MAC ? '⇧⌘Z' : 'Ctrl+Y';

function timeAgo(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

/** Undo / redo ("rewire") buttons plus a timeline of the last actions to jump back or forward in one click. */
export function HistoryControls() {
  const past = useProjectStore((s) => s.past);
  const future = useProjectStore((s) => s.future);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const undoTimes = useProjectStore((s) => s.undoTimes);
  const redoTimes = useProjectStore((s) => s.redoTimes);
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const nextUndo = past[past.length - 1];
  const nextRedo = future[future.length - 1];
  const row = 'flex w-full items-baseline gap-2 rounded px-2 py-1 text-left text-xs';

  return (
    <div ref={wrapper} className="relative flex items-center gap-1">
      <IconButton
        icon={Undo2}
        title={nextUndo ? `Undo ${nextUndo.label} (${UNDO_KEYS})` : `Nothing to undo (${UNDO_KEYS})`}
        disabled={!nextUndo}
        onClick={undo}
      />
      <IconButton
        icon={Redo2}
        title={nextRedo ? `Redo ${nextRedo.label} (${REDO_KEYS})` : `Nothing to redo (${REDO_KEYS})`}
        disabled={!nextRedo}
        onClick={redo}
      />
      <IconButton
        icon={History}
        title="History — jump to any recent state"
        active={open}
        disabled={past.length === 0 && future.length === 0}
        onClick={() => setOpen((o) => !o)}
      />

      {open && (
        <div className="absolute top-full left-0 z-30 mt-1 max-h-96 w-72 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-1.5 shadow-2xl">
          <p className="px-2 py-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">History</p>

          {/* Undone actions, newest first — click to replay forward */}
          {future
            .map((entry, i) => ({ entry, steps: future.length - i }))
            .reverse()
            .map(({ entry, steps }) => (
              <button
                key={`${entry.at}-${steps}`}
                type="button"
                onClick={() => {
                  redoTimes(steps);
                  setOpen(false);
                }}
                className={cx(row, 'text-slate-500 hover:bg-slate-900 hover:text-slate-300')}
              >
                <Redo2 className="h-3 w-3 shrink-0 translate-y-0.5" />
                <span className="flex-1 truncate">{entry.label}</span>
                <span className="shrink-0 text-[10px] text-slate-600">undone</span>
              </button>
            ))}

          <div className={cx(row, 'bg-sky-500/10 text-sky-200')}>
            <span className="h-1.5 w-1.5 shrink-0 translate-y-1 rounded-full bg-sky-400" />
            <span className="flex-1 truncate font-medium">Current state</span>
          </div>

          {/* Applied actions, newest first — click to rewind to just before that action */}
          {past
            .map((entry, i) => ({ entry, steps: past.length - i }))
            .reverse()
            .map(({ entry, steps }) => (
              <button
                key={`${entry.at}-${steps}`}
                type="button"
                onClick={() => {
                  undoTimes(steps);
                  setOpen(false);
                }}
                title={`Undo back to before "${entry.label}" (${steps} step${steps === 1 ? '' : 's'})`}
                className={cx(row, 'text-slate-300 hover:bg-slate-900 hover:text-white')}
              >
                <Undo2 className="h-3 w-3 shrink-0 translate-y-0.5 text-slate-600" />
                <span className="flex-1 truncate">{entry.label}</span>
                <span className="shrink-0 text-[10px] text-slate-600">{timeAgo(entry.at)}</span>
              </button>
            ))}

          {past.length === 0 && <p className="px-2 py-1 text-xs text-slate-600">No earlier steps.</p>}
        </div>
      )}
    </div>
  );
}

/** ⌘Z / Ctrl+Z to undo, ⇧⌘Z / Ctrl+Y to redo — inactive while typing so text fields keep native undo. */
export function useHistoryKeyboard(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const key = e.key.toLowerCase();
      const { undo, redo } = useProjectStore.getState();
      if (key === 'z' && !e.shiftKey) undo();
      else if ((key === 'z' && e.shiftKey) || key === 'y') redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
