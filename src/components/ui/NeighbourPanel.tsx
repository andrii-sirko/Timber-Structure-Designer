import { Ruler, X } from 'lucide-react';
import type { DerivedModel } from '@/types';
import { useProjectStore } from '@/store';
import { useNeighbours } from '@/store/useNeighbours';
import { sectionLabel } from '@/engine/geometry';
import { useT } from '@/i18n';
import { cx, NumberField } from './primitives';

/** Floating readout of the inspected member and its distances to the surrounding timbers. */
export function NeighbourPanel({ model }: { model: DerivedModel }) {
  const { t, tx, lang } = useT();
  const neighbourMode = useProjectStore((s) => s.view.neighbourMode);
  const radius = useProjectStore((s) => s.view.neighbourRadius);
  const limit = useProjectStore((s) => s.view.neighbourLimit);
  const focusedId = useProjectStore((s) => s.focusedNeighbourId);
  const selectMember = useProjectStore((s) => s.selectMember);
  const setFocused = useProjectStore((s) => s.setFocusedNeighbour);
  const setRadius = useProjectStore((s) => s.setNeighbourRadius);
  const setLimit = useProjectStore((s) => s.setNeighbourLimit);
  const { subject, links } = useNeighbours(model.framing.members);

  if (!neighbourMode || !subject) return null;

  return (
    <div className="pointer-events-auto absolute w-72 rounded-lg border border-cyan-500/40 bg-slate-950/90 shadow-xl backdrop-blur" style={{ left: 'calc(var(--panel-l, 0px) + 0.75rem)', bottom: 'calc(var(--sheet-h, 0px) + 0.75rem)' }}>
      <div className="flex items-start gap-2 border-b border-slate-800 px-3 py-2">
        <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-cyan-50">
            {lang === 'de' ? subject.nameDe : tx(subject.name)}
            {lang !== 'de' && <span className="text-cyan-200/60"> · {subject.nameDe}</span>}
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            {sectionLabel(subject.section)} · {subject.length} mm
          </div>
        </div>
        <button type="button" onClick={() => selectMember(null)} className="rounded p-0.5 text-slate-400 hover:text-white" title={t('Clear selection (Esc)')}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {links.length === 0 ? (
          <p className="px-3 py-3 text-[11px] text-slate-400">{t('No members within {radius} mm — increase the search radius below.', { radius })}</p>
        ) : (
          <ul className="divide-y divide-slate-800/70">
            {links.map((link) => {
              const touching = link.gap <= 1;
              return (
                <li key={link.memberId}>
                  <button
                    type="button"
                    onPointerOver={() => setFocused(link.memberId)}
                    onPointerOut={() => setFocused(null)}
                    onClick={() => selectMember(link.memberId)}
                    title={t('Measure from this member instead')}
                    className={cx(
                      'flex w-full items-baseline gap-2 px-3 py-1.5 text-left transition-colors',
                      focusedId === link.memberId ? 'bg-amber-500/15' : 'hover:bg-slate-900',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-[12px] text-slate-200">
                      {lang === 'de' ? link.nameDe : tx(link.name)}
                      {lang !== 'de' && <span className="ml-1 text-[10px] text-slate-500">{link.nameDe}</span>}
                    </span>
                    <span className={cx('shrink-0 font-mono text-[12px]', touching ? 'text-emerald-300' : 'text-cyan-200')}>
                      {touching ? t('contact') : `${link.gap} mm`}
                    </span>
                    <span className="w-20 shrink-0 text-right font-mono text-[10px] text-slate-500">
                      {link.parallel ? `c/c ${link.axisDistance}` : `ax ${link.axisDistance}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-slate-800 px-3 py-2">
        <NumberField label={t('Radius')} value={radius} onChange={setRadius} min={50} max={20000} step={100} compact />
        <NumberField label={t('Max count')} value={limit} onChange={setLimit} min={1} max={40} step={1} unit="" compact />
      </div>
      <p className="px-3 pb-2 text-[10px] text-slate-500">
        {t('Clear gap face to face; c/c is the axis spacing of parallel members. Click another timber to re-measure.')}
      </p>
    </div>
  );
}
