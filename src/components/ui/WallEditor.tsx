import { useState } from 'react';
import { DoorOpen, PanelsTopLeft, Plus, RectangleHorizontal, Trash2, Move3d, SplitSquareHorizontal, SplitSquareVertical } from 'lucide-react';
import type { Opening, OpeningType, WallId } from '@/types';
import { isOuterWall, WALL_IDS } from '@/types';
import { useProjectStore, useWallFrames } from '@/store';
import { MIN_PARTITION_LENGTH, OPENING_PRESETS, findPreset, frameSizeFor, openingHost, openingLimits, openingMaterials, partitionLimits, MIN_WALL_LENGTH, presetFits, presetMatches, presetsOfType } from '@/engine';
import type { OpeningPreset } from '@/engine';
import type { WallFrame } from '@/engine/framing';
import { Button, NumberField, Section, SelectField, Toggle, cx } from './primitives';

const selectCls = 'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500 pointer-coarse:py-2.5 pointer-coarse:text-base';

/** Catalogue picker: standard door / window sizes that fit the selected wall's framing. */
function PresetPicker({ frame, onAdd }: { frame: WallFrame; onAdd: (presetId: string) => void }) {
  const params = useProjectStore((s) => s.project.params);
  const [presetId, setPresetId] = useState(OPENING_PRESETS[1].id);
  const preset = findPreset(presetId) ?? OPENING_PRESETS[0];
  const fit = presetFits(frame, preset, params);
  const group = (type: OpeningType, label: string) => (
    <optgroup label={label}>
      {presetsOfType(type).map((p) => {
        const f = presetFits(frame, p, params);
        return (
          <option key={p.id} value={p.id} disabled={!f.fits}>
            {p.label}
            {f.fits ? '' : ' – does not fit'}
          </option>
        );
      })}
    </optgroup>
  );
  return (
    <div className="space-y-1.5 rounded-md border border-slate-800 bg-slate-900/50 p-2">
      <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Standard doors &amp; windows</span>
      <div className="flex gap-1.5">
        <select className={cx(selectCls, 'min-w-0 flex-1')} value={presetId} onChange={(e) => setPresetId(e.target.value)} aria-label="Catalogue preset">
          {group('door', 'Doors (Türen)')}
          {group('window', 'Windows (Fenster)')}
        </select>
        <Button size="sm" variant="primary" icon={Plus} disabled={!fit.fits} title={fit.fits ? `Add ${preset.label}` : `Does not fit: ${fit.reason}`} onClick={() => onAdd(preset.id)}>
          Add
        </Button>
      </div>
      <p className="text-[11px] text-slate-500">
        {preset.description} Frame {preset.frameWidth}×{preset.frameHeight} mm, rough opening {preset.roughWidth}×{preset.roughHeight} mm.
        {!fit.fits && <span className="text-amber-300"> Does not fit this wall: {fit.reason}.</span>}
      </p>
    </div>
  );
}

function PresetSummary({ opening, preset }: { opening: Opening; preset: OpeningPreset | undefined }) {
  const stock = preset && presetMatches(opening, preset);
  const frame = frameSizeFor(opening);
  const materials = openingMaterials(opening);
  return (
    <div className="space-y-1 text-[11px] text-slate-400">
      <div>
        {stock ? (
          <span className="text-emerald-300">{preset.labelDe}</span>
        ) : preset ? (
          <span className="text-amber-300">Resized – no longer the stock {preset.label}; order made-to-measure.</span>
        ) : opening.type === 'passage' ? (
          <span>Open passage without joinery.</span>
        ) : (
          <span>Custom size – made-to-measure {opening.type}.</span>
        )}
        {opening.type !== 'passage' && (
          <span className="font-mono text-slate-500">
            {' '}· frame {frame.width}×{frame.height} · rough {opening.width}×{opening.height}
          </span>
        )}
      </div>
      {opening.type !== 'passage' && (
        <details>
          <summary className="cursor-pointer select-none text-slate-300">Materials &amp; hardware</summary>
          <ul className="mt-1 ml-4 list-disc space-y-0.5">
            {materials.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

const WALL_LABEL: Record<WallId, string> = { front: 'Front (H1)', rear: 'Rear (H2)', left: 'Left', right: 'Right' };

export function WallEditor() {
  const walls = useProjectStore((s) => s.project.walls);
  const partitions = useProjectStore((s) => s.project.partitions);
  const project = useProjectStore((s) => s.project);
  const params = project.params;
  const selectedWallId = useProjectStore((s) => s.selectedWallId);
  const selectedOpeningId = useProjectStore((s) => s.selectedOpeningId);
  const selectWall = useProjectStore((s) => s.selectWall);
  const selectOpening = useProjectStore((s) => s.selectOpening);
  const setWallClosed = useProjectStore((s) => s.setWallClosed);
  const setWallExtent = useProjectStore((s) => s.setWallExtent);
  const addOpening = useProjectStore((s) => s.addOpening);
  const addOpeningPreset = useProjectStore((s) => s.addOpeningPreset);
  const applyOpeningPreset = useProjectStore((s) => s.applyOpeningPreset);
  const updateOpening = useProjectStore((s) => s.updateOpening);
  const removeOpening = useProjectStore((s) => s.removeOpening);
  const addPartition = useProjectStore((s) => s.addPartition);
  const updatePartition = useProjectStore((s) => s.updatePartition);
  const removePartition = useProjectStore((s) => s.removePartition);
  const setCameraPreset = useProjectStore((s) => s.setCameraPreset);
  const frames = useWallFrames();

  const wall = selectedWallId ? openingHost(project, selectedWallId) : null;
  const frame = selectedWallId ? (frames[selectedWallId] ?? null) : null;
  const outerId = selectedWallId && isOuterWall(selectedWallId) ? selectedWallId : null;
  const partition = selectedWallId && !outerId ? (partitions.find((p) => p.id === selectedWallId) ?? null) : null;
  const wallTitle = outerId ? `${WALL_LABEL[outerId]} wall` : (partition?.label ?? 'Wall');
  const openingCount = WALL_IDS.reduce((n, id) => n + walls[id].openings.length, 0) + partitions.reduce((n, p) => n + p.openings.length, 0);
  const lim = partition ? partitionLimits(params, partition.axis) : null;

  return (
    <Section
      title="Walls & openings"
      icon={PanelsTopLeft}
      focusKey="walls"
      badge={openingCount > 0 ? <span className="rounded bg-slate-800 px-1.5 text-[10px] text-slate-300">{openingCount}</span> : undefined}
    >
      <div className="grid grid-cols-2 gap-1.5">
        {WALL_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => selectWall(selectedWallId === id ? null : id)}
            className={cx(
              'flex items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
              selectedWallId === id ? 'border-sky-500 bg-sky-500/15 text-sky-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500',
            )}
          >
            <span>{WALL_LABEL[id]}</span>
            <span className={cx('rounded px-1 text-[10px]', walls[id].closed ? 'bg-timber-600/40 text-timber-200' : 'bg-slate-800 text-slate-400')}>
              {walls[id].closed ? 'closed' : 'open'}
              {walls[id].openings.length > 0 ? ` · ${walls[id].openings.length}` : ''}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="flex-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">Partition walls (Trennwände)</span>
          <Button size="sm" icon={SplitSquareVertical} title="Add a partition across the width (runs along Z)" onClick={() => addPartition('z')}>
            Across
          </Button>
          <Button size="sm" icon={SplitSquareHorizontal} title="Add a partition along the length (runs along X)" onClick={() => addPartition('x')}>
            Along
          </Button>
        </div>
        {partitions.length === 0 && <p className="text-[11px] text-slate-500">No interior walls. Add one to divide the space into sections (e.g. carport + storage).</p>}
        {partitions.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {partitions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectWall(selectedWallId === p.id ? null : p.id)}
                className={cx(
                  'flex items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                  selectedWallId === p.id ? 'border-sky-500 bg-sky-500/15 text-sky-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500',
                )}
              >
                <span className="truncate">{p.label}</span>
                <span className="rounded bg-timber-600/40 px-1 text-[10px] text-timber-200">
                  {p.axis === 'x' ? 'along' : 'across'}
                  {p.openings.length > 0 ? ` · ${p.openings.length}` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!wall && <p className="text-[11px] text-slate-500">Select a wall (here or by clicking it in 3D) to close it with studs & cladding and to add doors, windows or passages.</p>}

      {wall && selectedWallId && frame && (
        <div className="space-y-3">
          {outerId && (
            <Toggle label={`${WALL_LABEL[outerId]} wall closed`} description="Framed with studs, bottom plate and 20 mm board cladding" checked={wall.closed} onChange={(v) => setWallClosed(outerId, v)} />
          )}
          {outerId && wall.closed && (
            <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/50 p-2">
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="From" value={frame.extent.start} min={0} max={frame.length - MIN_WALL_LENGTH} step={50} compact onChange={(start) => setWallExtent(outerId, { start })} />
                <NumberField label="To" value={frame.extent.end} min={MIN_WALL_LENGTH} max={frame.length} step={50} compact onChange={(end) => setWallExtent(outerId, { end })} />
              </div>
              <p className="text-[11px] text-slate-500">
                Closed over {Math.round(frame.extent.end - frame.extent.start)} of {Math.round(frame.length)} mm. End studs are added where the wall stops between posts.
              </p>
            </div>
          )}
          {partition && lim && (
            <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/50 p-2">
              <div className="flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm text-slate-100 outline-none focus:border-slate-600"
                  value={partition.label}
                  placeholder="Partition"
                  onChange={(e) => updatePartition(partition.id, { label: e.target.value })}
                />
                <span className="text-[10px] text-slate-500">{partition.axis === 'x' ? 'along length' : 'across width'}</span>
                <button type="button" title="Remove partition" className="rounded p-1 text-rose-300 hover:bg-rose-950/60" onClick={() => removePartition(partition.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <NumberField
                  label={partition.axis === 'x' ? 'Position Z' : 'Position X'}
                  value={partition.offset}
                  min={lim.offsetMin}
                  max={lim.offsetMax}
                  step={50}
                  compact
                  hint={`${Math.round(lim.offsetMin)}–${Math.round(lim.offsetMax)}`}
                  onChange={(offset) => updatePartition(partition.id, { offset })}
                />
                <NumberField label="From" value={partition.start} min={lim.runMin} max={partition.end - MIN_PARTITION_LENGTH} step={50} compact onChange={(start) => updatePartition(partition.id, { start })} />
                <NumberField label="To" value={partition.end} min={partition.start + MIN_PARTITION_LENGTH} max={lim.runMax} step={50} compact onChange={(end) => updatePartition(partition.id, { end })} />
              </div>
              <p className="text-[11px] text-slate-500">
                Stud wall {params.timber.stud.height} mm thick, {Math.round(partition.end - partition.start)} mm long, boarded on one side, top plate under the rafters.
              </p>
              <p className="text-[11px] text-slate-500">In the viewport: drag the wall to move it, drag it near either end (or an end stud) to change its length.</p>
            </div>
          )}
          <PresetPicker frame={frame} onAdd={(id) => addOpeningPreset(selectedWallId, id)} />
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" icon={DoorOpen} title="Custom door 900×2000" onClick={() => addOpening(selectedWallId, 'door')}>
              Door
            </Button>
            <Button size="sm" icon={RectangleHorizontal} title="Custom window 1000×800" onClick={() => addOpening(selectedWallId, 'window')}>
              Window
            </Button>
            <Button size="sm" icon={PanelsTopLeft} onClick={() => addOpening(selectedWallId, 'passage')}>
              Passage
            </Button>
            <Button size="sm" variant="ghost" icon={Move3d} title="Look straight at this wall for 2D positioning" onClick={() => setCameraPreset('wall')}>
              2D view
            </Button>
          </div>
          {!wall.closed && wall.openings.length > 0 && <p className="text-[11px] text-amber-300">Wall is open – close it to frame the openings.</p>}
          {wall.openings.length === 0 && <p className="text-[11px] text-slate-500">No openings on {wallTitle} yet. Pick a standard size above or add a custom one.</p>}
          {wall.openings.length > 0 && <p className="text-[11px] text-slate-500">In the 3D view: drag an opening to move it, drag its edge bars to resize it (10 mm steps).</p>}

          {wall.openings.map((o) => {
            const olim = openingLimits(frame, o, params);
            const selected = o.id === selectedOpeningId;
            return (
              <div
                key={o.id}
                data-focus-key={`walls/${o.id}`}
                className={cx('space-y-2 rounded-md border p-2', selected ? 'border-sky-500/60 bg-sky-950/30' : 'border-slate-800 bg-slate-900/50')}
                onClick={() => selectOpening(selectedWallId, o.id)}
              >
                <div className="flex items-center gap-2">
                  <input
                    className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm text-slate-100 outline-none focus:border-slate-600"
                    value={o.label ?? ''}
                    placeholder={o.type}
                    onChange={(e) => updateOpening(selectedWallId, o.id, { label: e.target.value })}
                  />
                  <SelectField<OpeningType>
                    label=""
                    value={o.type}
                    onChange={(type) => updateOpening(selectedWallId, o.id, { type })}
                    options={[
                      { value: 'door', label: 'Door' },
                      { value: 'window', label: 'Window' },
                      { value: 'passage', label: 'Passage' },
                    ]}
                  />
                  <button type="button" title="Remove opening" className="rounded p-1 text-rose-300 hover:bg-rose-950/60" onClick={() => removeOpening(selectedWallId, o.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {o.type !== 'passage' && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Standard size</span>
                      <select className={selectCls} value={findPreset(o.preset) && presetMatches(o, findPreset(o.preset)!) ? o.preset : ''} onChange={(e) => applyOpeningPreset(selectedWallId, o.id, e.target.value)}>
                        <option value="">Custom</option>
                        {presetsOfType(o.type).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {o.type === 'door' && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <SelectField<'left' | 'right'>
                          label="Hinge"
                          value={o.hinge ?? 'left'}
                          onChange={(hinge) => updateOpening(selectedWallId, o.id, { hinge })}
                          options={[
                            { value: 'left', label: 'Left' },
                            { value: 'right', label: 'Right' },
                          ]}
                        />
                        <SelectField<'in' | 'out'>
                          label="Opens"
                          value={o.swing ?? 'out'}
                          onChange={(swing) => updateOpening(selectedWallId, o.id, { swing })}
                          options={[
                            { value: 'out', label: 'Outwards' },
                            { value: 'in', label: 'Inwards' },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="X offset" value={o.x} min={olim.minX} max={olim.maxRight - o.width} step={10} compact hint={`${Math.round(olim.minX)}–${Math.round(olim.maxRight - o.width)}`} onChange={(x) => updateOpening(selectedWallId, o.id, { x })} />
                  <NumberField label="Y (sill)" value={o.y} min={0} step={10} range={[0, 2500]} compact disabled={o.type !== 'window'} onChange={(y) => updateOpening(selectedWallId, o.id, { y })} />
                  <NumberField label="Width" value={o.width} min={300} step={10} range={[300, 5000]} compact onChange={(width) => updateOpening(selectedWallId, o.id, { width })} />
                  <NumberField label="Height" value={o.height} min={300} step={10} range={[300, 3500]} compact onChange={(height) => updateOpening(selectedWallId, o.id, { height })} />
                </div>
                <PresetSummary opening={o} preset={findPreset(o.preset)} />
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
