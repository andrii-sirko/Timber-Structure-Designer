import { BrickWall, CornerDownRight, Plus, Trash2, X } from 'lucide-react';
import type { DerivedModel, PavingPattern } from '@/types';
import { useProjectStore } from '@/store';
import { PAVING_COLORS, PAVING_PATTERNS } from '@/engine/paving';
import { Button, NumberField, Section, SelectField, cx } from './primitives';

export function PavingPanel({ model }: { model: DerivedModel }) {
  const areas = useProjectStore((s) => s.project.pavedAreas);
  const selectedId = useProjectStore((s) => s.selectedPavedAreaId);
  const selectedPointIndex = useProjectStore((s) => s.selectedPavedPointIndex);
  const addPavedArea = useProjectStore((s) => s.addPavedArea);
  const updatePavedArea = useProjectStore((s) => s.updatePavedArea);
  const removePavedArea = useProjectStore((s) => s.removePavedArea);
  const selectPavedArea = useProjectStore((s) => s.selectPavedArea);
  const movePavedPoint = useProjectStore((s) => s.movePavedPoint);
  const insertPavedPoint = useProjectStore((s) => s.insertPavedPoint);
  const removePavedPoint = useProjectStore((s) => s.removePavedPoint);
  const translatePavedArea = useProjectStore((s) => s.translatePavedArea);
  const resizePavedArea = useProjectStore((s) => s.resizePavedArea);
  const paving = model.paving;

  return (
    <Section
      title="Paved floor (Pflaster)"
      icon={BrickWall}
      badge={areas.length > 0 ? <span className="rounded bg-slate-800 px-1.5 font-mono text-[10px] text-slate-300">{paving.totalAreaM2.toFixed(1)} m²</span> : undefined}
    >
      <div className="flex items-center gap-2">
        <Button variant="primary" icon={Plus} onClick={() => addPavedArea()} title="Add a paved floor under the roof plan">
          Add floor
        </Button>
        <p className="text-[11px] text-slate-500">Drag the slab to move it, blue corners to reshape, green edge handles move a whole side (Alt-drag adds a corner).</p>
      </div>

      {areas.length > 0 && (
        <dl className="grid grid-cols-3 gap-2 rounded-md border border-slate-800 bg-slate-900/60 p-2 text-[11px]">
          <div>
            <dt className="text-slate-500">Total base area</dt>
            <dd className="font-mono text-slate-200">{paving.totalAreaM2.toFixed(2)} m²</dd>
          </div>
          <div>
            <dt className="text-slate-500">Floors</dt>
            <dd className="font-mono text-slate-200">{areas.length}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Stones ≈</dt>
            <dd className="font-mono text-slate-200">{paving.totalStoneCount}</dd>
          </div>
        </dl>
      )}

      {areas.map((a) => {
        const summary = paving.areas.find((s) => s.id === a.id);
        const selected = a.id === selectedId;
        const width = summary ? summary.bounds.maxX - summary.bounds.minX : 0;
        const depth = summary ? summary.bounds.maxZ - summary.bounds.minZ : 0;
        return (
          <div
            key={a.id}
            className={cx('space-y-2 rounded-md border p-2', selected ? 'border-sky-500/60 bg-sky-950/30' : 'border-slate-800 bg-slate-900/50')}
            onClick={() => {
              if (!selected) selectPavedArea(a.id);
            }}
          >
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-sm border border-white/20" style={{ background: a.color }} />
              <input
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm text-slate-100 outline-none hover:border-slate-700 focus:border-sky-500"
                value={a.label}
                onChange={(e) => updatePavedArea(a.id, { label: e.target.value })}
                aria-label="Floor name"
              />
              <span className="font-mono text-[11px] text-slate-300">{summary?.areaM2.toFixed(2)} m²</span>
              <button type="button" title="Remove floor" className="rounded p-1 text-rose-300 hover:bg-rose-950/60" onClick={(e) => { e.stopPropagation(); removePavedArea(a.id); }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {summary?.selfIntersecting && <p className="text-[11px] text-rose-300">Edges cross each other – untangle the corners, the area figure is not reliable.</p>}

            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Extent X" value={width} min={100} step={100} compact onChange={(v) => resizePavedArea(a.id, v, depth)} />
              <NumberField label="Extent Z" value={depth} min={100} step={100} compact onChange={(v) => resizePavedArea(a.id, width, v)} />
              <NumberField label="Origin X" value={summary?.bounds.minX ?? 0} step={50} compact onChange={(v) => translatePavedArea(a.id, v - (summary?.bounds.minX ?? 0), 0)} />
              <NumberField label="Origin Z" value={summary?.bounds.minZ ?? 0} step={50} compact onChange={(v) => translatePavedArea(a.id, 0, v - (summary?.bounds.minZ ?? 0))} />
            </div>

            {selected && (
              <>
                <SelectField<PavingPattern> label="Pattern" value={a.pattern} onChange={(pattern) => updatePavedArea(a.id, { pattern })} options={PAVING_PATTERNS.map((p) => ({ value: p.id, label: p.label }))} />
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="Stone length" value={a.stoneLength} min={40} max={1000} step={10} compact onChange={(stoneLength) => updatePavedArea(a.id, { stoneLength })} />
                  <NumberField label="Stone width" value={a.stoneWidth} min={40} max={1000} step={10} compact onChange={(stoneWidth) => updatePavedArea(a.id, { stoneWidth })} />
                  <NumberField label="Joint" value={a.jointWidth} min={0} max={30} step={1} compact onChange={(jointWidth) => updatePavedArea(a.id, { jointWidth })} />
                  <NumberField label="Thickness" value={a.stoneThickness} min={20} max={200} step={10} compact onChange={(stoneThickness) => updatePavedArea(a.id, { stoneThickness })} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {PAVING_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      className={cx('h-4 w-4 rounded-sm border', a.color === c ? 'border-white' : 'border-white/20')}
                      style={{ background: c }}
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePavedArea(a.id, { color: c });
                      }}
                    />
                  ))}
                </div>
                {summary && (
                  <p className="text-[11px] text-slate-500">
                    Perimeter {summary.perimeterM.toFixed(2)} m · ≈ {summary.stoneCount} stones ({a.stoneLength}×{a.stoneWidth} mm, joint {a.jointWidth} mm) · {(summary.areaM2 * a.stoneThickness / 1000).toFixed(2)} m³ stone.
                  </p>
                )}

                <div className="space-y-1">
                  <div className="flex items-baseline justify-between text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                    <span>Corners ({a.points.length})</span>
                    <span className="text-[10px] font-normal normal-case text-slate-500">arrow keys nudge · Delete removes</span>
                  </div>
                  {a.points.map((p, i) => (
                    <div
                      key={i}
                      className={cx('flex items-center gap-1 rounded px-1 py-0.5', selectedPointIndex === i ? 'bg-amber-500/15' : 'hover:bg-slate-800/60')}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectPavedArea(a.id, i);
                      }}
                    >
                      <span className="w-5 shrink-0 font-mono text-[11px] text-slate-500">{i + 1}</span>
                      <div className="grid min-w-0 flex-1 grid-cols-2 gap-1">
                        <NumberField label="X" value={p.x} step={50} compact onChange={(x) => movePavedPoint(a.id, i, { x, z: p.z })} />
                        <NumberField label="Z" value={p.z} step={50} compact onChange={(z) => movePavedPoint(a.id, i, { x: p.x, z })} />
                      </div>
                      <button type="button" title="Add a corner after this one" className="rounded p-1 text-lime-300 hover:bg-slate-800" onClick={(e) => { e.stopPropagation(); insertPavedPoint(a.id, i); }}>
                        <CornerDownRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title={a.points.length > 3 ? 'Remove corner' : 'A floor needs at least 3 corners'}
                        disabled={a.points.length <= 3}
                        className="rounded p-1 text-rose-300 hover:bg-rose-950/60 disabled:opacity-30"
                        onClick={(e) => { e.stopPropagation(); removePavedPoint(a.id, i); }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </Section>
  );
}
