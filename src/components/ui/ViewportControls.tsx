import {
  Axis3d,
  Box,
  Camera,
  Eraser,
  Eye,
  Grid3x3,
  Home,
  Layers,
  LayoutPanelTop,
  Ruler,
  Square,
  SquareDashed,
  Warehouse,
  Frame,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Scan,
  Waypoints,
  Car,
  BrickWall,
  Rows3,
} from 'lucide-react';
import type { CameraPreset, HighlightMode, LayerVisibility } from '@/types';
import { useProjectStore } from '@/store';
import { useMeasureStore } from '@/components/3d/MeasureTool';
import { useT } from '@/i18n';
import { IconButton, cx } from './primitives';

const PRESETS: { id: CameraPreset; label: string; icon: typeof Home }[] = [
  { id: 'iso', label: 'Isometric', icon: Axis3d },
  { id: 'top', label: 'Top / plan', icon: ArrowDownToLine },
  { id: 'front', label: 'Front elevation', icon: ArrowUpToLine },
  { id: 'rear', label: 'Rear elevation', icon: ArrowDownToLine },
  { id: 'left', label: 'Left elevation', icon: ArrowLeftToLine },
  { id: 'right', label: 'Right elevation', icon: ArrowRightToLine },
];

const LAYERS: { id: keyof LayerVisibility; label: string; icon: typeof Home }[] = [
  { id: 'frame', label: 'Structural timber frame', icon: Frame },
  { id: 'cladding', label: 'Cladding / wall panels', icon: Warehouse },
  { id: 'roof', label: 'Roof covering', icon: LayoutPanelTop },
  { id: 'dimensions', label: 'Dimension lines', icon: Ruler },
  { id: 'grid', label: 'Ground grid', icon: Grid3x3 },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'paving', label: 'Paved floors', icon: BrickWall },
  { id: 'floor', label: 'Timber floor deck', icon: Rows3 },
];

const HIGHLIGHTS: { id: HighlightMode; label: string; icon: typeof Home }[] = [
  { id: 'solid', label: 'Solid textured', icon: Box },
  { id: 'edges', label: 'Solid with outlines', icon: Square },
  { id: 'wireframe', label: 'Wireframe', icon: SquareDashed },
];

export function ViewportControls({ canvasContainer }: { canvasContainer: React.RefObject<HTMLDivElement | null> }) {
  const { t } = useT();
  const view = useProjectStore((s) => s.view);
  const selectedWallId = useProjectStore((s) => s.selectedWallId);
  const measurements = useProjectStore((s) => s.measurements);
  const setCameraPreset = useProjectStore((s) => s.setCameraPreset);
  const setOrthographic = useProjectStore((s) => s.setOrthographic);
  const setLayer = useProjectStore((s) => s.setLayer);
  const setHighlight = useProjectStore((s) => s.setHighlight);
  const setMeasureMode = useProjectStore((s) => s.setMeasureMode);
  const setNeighbourMode = useProjectStore((s) => s.setNeighbourMode);
  const clearMeasurements = useProjectStore((s) => s.clearMeasurements);
  const resetPending = useMeasureStore((s) => s.reset);

  const screenshot = (): void => {
    const canvas = canvasContainer.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'timber-structure.png';
    a.click();
  };

  const group = 'flex flex-col flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-950/80 p-1 backdrop-blur';

  return (
    <div className="pointer-events-none absolute inset-0 flex justify-between p-3" style={{ paddingLeft: 'calc(var(--panel-l, 0px) + 0.75rem)', paddingBottom: 'calc(var(--sheet-h, 0px) + 0.75rem)' }}>
      <div className="pointer-events-auto flex max-h-full flex-col gap-2 self-start overflow-y-auto scroll-thin">
        <div className={group} title={t('Camera presets')}>
          {PRESETS.map((p) => (
            <IconButton key={p.id} icon={p.icon} title={t(p.label)} active={view.cameraPreset === p.id} onClick={() => setCameraPreset(p.id)} />
          ))}
          <IconButton
            icon={Scan}
            title={selectedWallId ? t('Elevation of {wall} wall (2D positioning)', { wall: selectedWallId }) : t('Select a wall to view its elevation')}
            active={view.cameraPreset === 'wall'}
            disabled={!selectedWallId}
            onClick={() => setCameraPreset('wall')}
          />
        </div>
        <div className={group}>
          <IconButton icon={Eye} title={view.orthographic ? t('Orthographic (click for perspective)') : t('Perspective (click for orthographic)')} active={view.orthographic} onClick={() => setOrthographic(!view.orthographic)} />
          <IconButton icon={Home} title={t('Fit / reset view')} onClick={() => setCameraPreset('iso')} />
          <IconButton icon={Camera} title={t('Save screenshot (PNG)')} onClick={screenshot} />
        </div>
      </div>

      <div className="pointer-events-auto flex max-h-full max-w-[60%] flex-col items-end gap-2 self-start overflow-y-auto scroll-thin">
        <div className={cx(group, 'flex-row')} title={t('Render mode')}>
          {HIGHLIGHTS.map((h) => (
            <IconButton key={h.id} icon={h.icon} title={t(h.label)} active={view.highlight === h.id} onClick={() => setHighlight(h.id)} />
          ))}
        </div>
        <div className={cx(group, 'flex-row')} title={t('Layers')}>
          <span className="flex items-center px-1 text-slate-500">
            <Layers className="h-4 w-4" />
          </span>
          {LAYERS.map((l) => (
            <IconButton key={l.id} icon={l.icon} title={t(l.label)} active={view.layers[l.id]} onClick={() => setLayer(l.id, !view.layers[l.id])} />
          ))}
        </div>
        <div className={cx(group, 'flex-row')} title={t('Measure')}>
          <IconButton
            icon={Ruler}
            title={view.measureMode ? t('Measuring: click two points (click to exit)') : t('Measure distance between two points')}
            active={view.measureMode}
            onClick={() => {
              resetPending();
              setMeasureMode(!view.measureMode);
            }}
          />
          <IconButton icon={Eraser} title={t('Clear measurements')} disabled={measurements.length === 0} onClick={clearMeasurements} />
          <IconButton
            icon={Waypoints}
            title={
              view.neighbourMode
                ? t('Neighbour distances on: click a timber to measure its gaps (click to turn off)')
                : t('Show distances to neighbouring members when a timber is clicked')
            }
            active={view.neighbourMode}
            onClick={() => setNeighbourMode(!view.neighbourMode)}
          />
        </div>
        {view.neighbourMode && !view.measureMode && (
          <div className="rounded-md border border-cyan-500/40 bg-slate-950/85 px-2 py-1 text-[11px] text-cyan-100">
            {t('Click a timber to measure its distance to every neighbour.')}
          </div>
        )}
        {view.measureMode && (
          <div className="rounded-md border border-pink-500/40 bg-slate-950/85 px-2 py-1 text-[11px] text-pink-100">
            {t('Click two points on the model (or the ground) to measure.')}
          </div>
        )}
      </div>
    </div>
  );
}
