import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Hammer, Pause, Play, RotateCcw, X } from 'lucide-react';
import type { DerivedModel, Member } from '@/types';
import type { AssemblyStep } from '@/engine/assembly';
import { moveStepKey, stepHardwareShares } from '@/engine/assembly';
import { roundMm, sectionLabel } from '@/engine/geometry';
import { useProjectStore } from '@/store';
import { useUiStore } from '@/store/uiStore';
import { useAssembly } from '@/store/useAssembly';
import { useT } from '@/i18n';
import { cx } from './primitives';

const PLAY_INTERVAL_MS = 1600;

interface PartRow {
  key: string;
  name: string;
  nameDe: string;
  size: string;
  count: number;
}

/** Identical pieces of a step folded into one row, as in a cut list. */
function partRows(ids: string[], byId: Map<string, Member>): PartRow[] {
  const rows = new Map<string, PartRow>();
  for (const id of ids) {
    const m = byId.get(id);
    if (!m) continue;
    const [name, nameDe] = /^(.*) \((.*)\)$/.exec(m.group)?.slice(1) ?? [m.group, m.nameDe];
    const size = `${sectionLabel(m.section)} × ${roundMm(m.length)} mm`;
    const key = `${m.group}|${size}`;
    const row = rows.get(key);
    if (row) row.count += 1;
    else rows.set(key, { key, name, nameDe, size, count: 1 });
  }
  return [...rows.values()];
}

export function useStepTitle(): (step: AssemblyStep) => string {
  const { t, tx } = useT();
  return (step) => t(step.title, step.where ? { where: tx(step.where) } : undefined);
}

/** Step player of the assembly guide: what goes in now, with which fasteners, and the editable step list. */
export function AssemblyPanel({ model }: { model: DerivedModel }) {
  const { t, tx, lang } = useT();
  const stepTitle = useStepTitle();
  const assembly = useAssembly(model);
  const pieceMode = useUiStore((s) => s.assemblyPieceMode);
  const ghost = useUiStore((s) => s.assemblyGhost);
  const setActive = useUiStore((s) => s.setAssemblyActive);
  const setIndex = useUiStore((s) => s.setAssemblyIndex);
  const setPieceMode = useUiStore((s) => s.setAssemblyPieceMode);
  const setGhost = useUiStore((s) => s.setAssemblyGhost);
  const customOrder = useProjectStore((s) => s.project.assemblyOrder !== undefined);
  const setAssemblyOrder = useProjectStore((s) => s.setAssemblyOrder);
  const [playing, setPlaying] = useState(false);
  const activeRow = useRef<HTMLLIElement>(null);

  const byId = useMemo(() => new Map(model.framing.members.map((m) => [m.id, m])), [model.framing.members]);
  const shares = useMemo(() => stepHardwareShares(assembly?.steps ?? [], model.connections.hardware), [assembly?.steps, model.connections.hardware]);
  const frameCount = assembly?.frames.length ?? 0;
  const index = assembly?.index ?? 0;
  const last = frameCount - 1;
  const stepIndex = assembly?.frames[index]?.stepIndex ?? 0;

  useEffect(() => {
    if (!playing) return;
    if (index >= last) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setIndex(index + 1), PLAY_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [playing, index, last, setIndex]);

  useEffect(() => {
    if (!assembly) return;
    // Capture phase: the arrow keys drive the guide instead of nudging a selected object
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const go = (to: number): void => {
        e.preventDefault();
        e.stopPropagation();
        setPlaying(false);
        setIndex(Math.min(Math.max(to, 0), last));
      };
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(last);
      else if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [assembly, index, last, setIndex]);

  useEffect(() => {
    activeRow.current?.scrollIntoView({ block: 'nearest' });
  }, [stepIndex]);

  if (!assembly) return null;
  const { steps, frames } = assembly;
  const frame = frames[index];
  const step = steps[stepIndex];
  if (!frame || !step) return null;

  const goTo = (to: number): void => {
    setPlaying(false);
    setIndex(Math.min(Math.max(to, 0), last));
  };
  const firstFrameOf = (i: number): number => Math.max(frames.findIndex((f) => f.stepIndex === i), 0);
  const moveStep = (from: number, to: number): void => {
    const keys = moveStepKey(steps.map((s) => s.key), from, to);
    setAssemblyOrder(keys);
    // Follow the moved step when it is the one on screen
    if (from === stepIndex && !pieceMode) setIndex(Math.min(Math.max(to, 0), steps.length - 1));
  };
  const parts = partRows(frame.memberIds, byId);
  const panelCount = frame.panelIds.length;
  const hardware = shares.get(step.key) ?? [];
  const iconButton = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-900/90 text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:opacity-40 pointer-coarse:h-11 pointer-coarse:w-11';
  const chip = (on: boolean): string =>
    cx('rounded-md border px-2 py-1 text-[11px] transition-colors pointer-coarse:py-2', on ? 'border-lime-500/70 bg-lime-500/15 text-lime-100' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white');

  return (
    <div
      className="pointer-events-auto absolute z-10 flex w-80 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-lg border border-lime-500/40 bg-slate-950/92 shadow-xl backdrop-blur"
      style={{ right: '0.75rem', bottom: 'calc(var(--sheet-h, 0px) + 0.75rem)', maxHeight: 'calc(100% - var(--sheet-h, 0px) - 8.5rem)' }}
      aria-label={t('Assembly guide')}
    >
      <div className="flex shrink-0 items-start gap-2 border-b border-slate-800 px-3 py-2">
        <Hammer className="mt-0.5 h-4 w-4 shrink-0 text-lime-400" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold tracking-wide text-lime-300/80 uppercase">
            {t('Step {n} of {total}', { n: stepIndex + 1, total: steps.length })}
            {frame.piece > 0 && <span className="text-slate-400"> · {t('Piece {n} of {total}', { n: frame.piece, total: frame.pieces })}</span>}
          </div>
          <div className="text-sm font-semibold text-lime-50">{stepTitle(step)}</div>
        </div>
        <button type="button" onClick={() => setActive(false)} className="rounded p-0.5 text-slate-400 hover:text-white" title={t('Close assembly guide')} aria-label={t('Close assembly guide')}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1 px-3 pt-2">
        <button type="button" className={iconButton} title={t('First step (Home)')} aria-label={t('First step (Home)')} disabled={index === 0} onClick={() => goTo(0)}>
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button type="button" className={iconButton} title={t('Previous (←)')} aria-label={t('Previous (←)')} disabled={index === 0} onClick={() => goTo(index - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={cx(iconButton, 'flex-1', playing && 'border-lime-500 text-lime-200')}
          title={playing ? t('Pause (Space)') : t('Play (Space)')}
          aria-label={playing ? t('Pause (Space)') : t('Play (Space)')}
          onClick={() => {
            if (!playing && index >= last) setIndex(0);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button type="button" className={iconButton} title={t('Next (→)')} aria-label={t('Next (→)')} disabled={index >= last} onClick={() => goTo(index + 1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className={iconButton} title={t('Finished structure (End)')} aria-label={t('Finished structure (End)')} disabled={index >= last} onClick={() => goTo(last)}>
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
      <div className="shrink-0 px-3 pt-2">
        <input
          type="range"
          min={0}
          max={Math.max(last, 0)}
          value={index}
          onChange={(e) => goTo(Number(e.target.value))}
          className="w-full accent-lime-400"
          aria-label={t('Step {n} of {total}', { n: stepIndex + 1, total: steps.length })}
        />
      </div>
      <div className="flex shrink-0 items-center gap-1.5 px-3 pb-2">
        <button type="button" className={chip(pieceMode)} aria-pressed={pieceMode} title={t('Advance one piece at a time instead of a whole step')} onClick={() => {
          setPlaying(false);
          // Stay on the same step when the stops change
          setPieceMode(!pieceMode, pieceMode ? stepIndex : pieceIndexOfStep(steps, stepIndex));
        }}>
          {t('Piece by piece')}
        </button>
        <button type="button" className={chip(ghost)} aria-pressed={ghost} title={t('Show parts still to come as a faint outline')} onClick={() => setGhost(!ghost)}>
          {t('Ghost')}
        </button>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto border-t border-slate-800">
        <p className="px-3 pt-2 text-[12px] leading-snug text-slate-200">{tx(step.instruction)}</p>

        {(parts.length > 0 || panelCount > 0) && (
          <div className="px-3 pt-2">
            <div className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">{t('Parts in this step')}</div>
            <ul className="mt-1 space-y-0.5">
              {parts.map((p) => (
                <li key={p.key} className="flex items-baseline gap-2 text-[12px]">
                  <span className="w-8 shrink-0 text-right font-mono font-semibold text-lime-200">{p.count}×</span>
                  <span className="min-w-0 flex-1 truncate text-slate-200">
                    {lang === 'de' ? p.nameDe : tx(p.name)}
                    {lang !== 'de' && <span className="ml-1 text-[10px] text-slate-500">{p.nameDe}</span>}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-slate-400">{p.size}</span>
                </li>
              ))}
              {panelCount > 0 && parts.length === 0 && (
                <li className="flex items-baseline gap-2 text-[12px]">
                  <span className="w-8 shrink-0 text-right font-mono font-semibold text-lime-200">{panelCount}×</span>
                  <span className="text-slate-200">{stepTitle(step)}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {hardware.length > 0 && (
          <div className="px-3 pt-2">
            <div className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">{t('Fasteners (approx. for this step)')}</div>
            <ul className="mt-1 space-y-0.5">
              {hardware.map(({ item, quantity }) => (
                <li key={item.id} className="flex items-baseline gap-2 text-[11px]">
                  <span className="w-12 shrink-0 text-right font-mono text-slate-300">
                    {quantity} {t(item.unit)}
                  </span>
                  <span className="min-w-0 flex-1 text-slate-300">
                    {lang === 'de' ? item.nameDe : tx(item.name)} <span className="text-slate-500">{tx(item.spec)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-slate-800 px-3 pt-2">
          <span className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            {t('All steps')}
            {customOrder && <span className="ml-1.5 rounded bg-amber-500/15 px-1 py-0.5 text-amber-200 normal-case">{t('Custom order')}</span>}
          </span>
          <button
            type="button"
            className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-slate-400 hover:text-white disabled:opacity-40"
            disabled={!customOrder}
            onClick={() => setAssemblyOrder(null)}
            title={t('Reset to the recommended order')}
          >
            <RotateCcw className="h-3 w-3" /> {t('Reset to the recommended order')}
          </button>
        </div>
        <ol className="px-1.5 pt-1 pb-2">
          {steps.map((s, i) => (
            <li
              key={s.key}
              ref={i === stepIndex ? activeRow : undefined}
              className={cx('group flex items-center gap-1 rounded-md pr-1', i === stepIndex ? 'bg-lime-500/15' : 'hover:bg-slate-900')}
            >
              <button type="button" onClick={() => goTo(firstFrameOf(i))} title={t('Go to this step')} className="flex min-w-0 flex-1 items-baseline gap-2 px-1.5 py-1 text-left pointer-coarse:py-2">
                <span className={cx('w-5 shrink-0 text-right font-mono text-[11px]', i < stepIndex ? 'text-lime-400/70' : i === stepIndex ? 'text-lime-200' : 'text-slate-500')}>{i + 1}</span>
                <span className={cx('min-w-0 flex-1 truncate text-[12px]', i === stepIndex ? 'font-semibold text-lime-50' : i < stepIndex ? 'text-slate-400' : 'text-slate-200')}>{stepTitle(s)}</span>
                <span className="shrink-0 font-mono text-[10px] text-slate-500">{s.memberIds.length + s.panelIds.length || ''}</span>
              </button>
              <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-white disabled:opacity-30" disabled={i === 0} onClick={() => moveStep(i, i - 1)} title={t('Move step earlier')} aria-label={t('Move step earlier')}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-white disabled:opacity-30" disabled={i === steps.length - 1} onClick={() => moveStep(i, i + 1)} title={t('Move step later')} aria-label={t('Move step later')}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Index of the first piece frame of step `stepIndex` once piece-by-piece mode splits the steps. */
function pieceIndexOfStep(steps: AssemblyStep[], stepIndex: number): number {
  return steps.slice(0, stepIndex).reduce((sum, s) => sum + Math.max(s.memberIds.length + s.panelIds.length, 1), 0);
}
