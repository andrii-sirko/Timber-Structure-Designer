import { DoorOpen, PanelsTopLeft, RectangleHorizontal, Trash2, Move3d, SplitSquareHorizontal, SplitSquareVertical } from 'lucide-react';
import type { OpeningType, WallId } from '@/types';
import { isOuterWall, WALL_IDS } from '@/types';
import { useProjectStore, useWallFrames } from '@/store';
import { MIN_PARTITION_LENGTH, openingHost, openingLimits, partitionLimits } from '@/engine';
import { Button, NumberField, Section, SelectField, Toggle, cx } from './primitives';

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
  const addOpening = useProjectStore((s) => s.addOpening);
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
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" icon={DoorOpen} onClick={() => addOpening(selectedWallId, 'door')}>
              Door
            </Button>
            <Button size="sm" icon={RectangleHorizontal} onClick={() => addOpening(selectedWallId, 'window')}>
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
          {wall.openings.length === 0 && <p className="text-[11px] text-slate-500">No openings on {wallTitle} yet. Drag openings directly in the 3D view after adding them.</p>}

          {wall.openings.map((o) => {
            const olim = openingLimits(frame, o, params);
            const selected = o.id === selectedOpeningId;
            return (
              <div
                key={o.id}
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
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="X offset" value={o.x} min={olim.minX} max={olim.maxRight - o.width} step={10} compact hint={`${Math.round(olim.minX)}–${Math.round(olim.maxRight - o.width)}`} onChange={(x) => updateOpening(selectedWallId, o.id, { x })} />
                  <NumberField label="Y (sill)" value={o.y} min={0} step={10} compact disabled={o.type !== 'window'} onChange={(y) => updateOpening(selectedWallId, o.id, { y })} />
                  <NumberField label="Width" value={o.width} min={300} step={10} compact onChange={(width) => updateOpening(selectedWallId, o.id, { width })} />
                  <NumberField label="Height" value={o.height} min={300} step={10} compact onChange={(height) => updateOpening(selectedWallId, o.id, { height })} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
