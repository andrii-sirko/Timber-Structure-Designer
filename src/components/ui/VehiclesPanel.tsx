import { Car, RotateCw, Trash2 } from 'lucide-react';
import type { DerivedModel } from '@/types';
import { useProjectStore } from '@/store';
import { OBJECT_SIZE_LIMITS, resolveVehicleModel, VEHICLE_COLORS } from '@/engine/vehicles';
import { useT } from '@/i18n';
import { ObjectIcon } from './objectIcons';
import { ObjectPicker } from './ObjectPicker';
import { NumberField, Section, StatusDot, cx } from './primitives';

export function VehiclesPanel({ model }: { model: DerivedModel }) {
  const { t, tx } = useT();
  const vehicles = useProjectStore((s) => s.project.vehicles);
  const selectedVehicleId = useProjectStore((s) => s.selectedVehicleId);
  const addVehicle = useProjectStore((s) => s.addVehicle);
  const updateVehicle = useProjectStore((s) => s.updateVehicle);
  const removeVehicle = useProjectStore((s) => s.removeVehicle);
  const selectVehicle = useProjectStore((s) => s.selectVehicle);
  const rotateVehicle = useProjectStore((s) => s.rotateVehicle);

  return (
    <Section
      title={t('Objects (Fahrzeuge, Mülltonnen, Gartengeräte)')}
      icon={Car}
      focusKey="vehicles"
      badge={vehicles.length > 0 ? <span className="rounded bg-slate-800 px-1.5 text-[10px] text-slate-300">{vehicles.length}</span> : undefined}
    >
      <ObjectPicker onPick={addVehicle} />
      <p className="text-[11px] text-slate-500">{t('Drag objects in 3D; arrow keys nudge 50 mm (Shift 10 mm), R rotates 90°, Delete removes. Free-size objects get length/width/height fields.')}
      </p>

      {vehicles.map((v) => {
        const m = resolveVehicleModel(v);
        const fit = model.vehicles.find((f) => f.vehicleId === v.id);
        const size = v.size ?? { length: m.length, width: m.width, height: m.height };
        const setSize = (patch: Partial<typeof size>): void => updateVehicle(v.id, { size: { ...size, ...patch } });
        const selected = v.id === selectedVehicleId;
        return (
          <div
            key={v.id}
            data-focus-key={`vehicles/${v.id}`}
            className={cx('space-y-2 rounded-md border p-2', selected ? 'border-sky-500/60 bg-sky-950/30' : 'border-slate-800 bg-slate-900/50')}
            onClick={() => selectVehicle(v.id)}
          >
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full border border-white/20" style={{ background: v.color }} />
              <ObjectIcon style={m.style} className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{tx(m.name)}</span>
              <button type="button" title={t('Rotate 90°')} className="rounded p-1 text-slate-300 hover:bg-slate-800" onClick={(e) => { e.stopPropagation(); rotateVehicle(v.id, 90); }}>
                <RotateCw className="h-4 w-4" />
              </button>
              <button type="button" title={t('Remove object')} className="rounded p-1 text-rose-300 hover:bg-rose-950/60" onClick={(e) => { e.stopPropagation(); removeVehicle(v.id); }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {fit && (
              <div className="flex items-start gap-1.5 text-[11px] text-slate-300">
                <StatusDot status={fit.status} className="mt-1" />
                <span>{fit.messages.map((msg) => tx(msg)).join(' ')}</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <NumberField label={t('X')} value={v.x} step={50} compact onChange={(x) => updateVehicle(v.id, { x })} />
              <NumberField label={t('Z')} value={v.z} step={50} compact onChange={(z) => updateVehicle(v.id, { z })} />
              <NumberField label={t('Rotation')} value={v.rotationDeg} min={0} max={359} step={5} unit="°" compact onChange={(rotationDeg) => updateVehicle(v.id, { rotationDeg })} />
            </div>
            {m.customSize && (
              <div className="grid grid-cols-3 gap-2">
                <NumberField label={t('Length')} value={size.length} min={OBJECT_SIZE_LIMITS.min} max={OBJECT_SIZE_LIMITS.max} step={50} compact onChange={(length) => setSize({ length })} />
                <NumberField label={t('Width')} value={size.width} min={OBJECT_SIZE_LIMITS.min} max={OBJECT_SIZE_LIMITS.max} step={50} compact onChange={(width) => setSize({ width })} />
                <NumberField label={t('Height')} value={size.height} min={OBJECT_SIZE_LIMITS.min} max={OBJECT_SIZE_LIMITS.max} step={50} compact onChange={(height) => setSize({ height })} />
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {VEHICLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  className={cx('h-4 w-4 rounded-full border', v.color === c ? 'border-white' : 'border-white/20')}
                  style={{ background: c }}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateVehicle(v.id, { color: c });
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </Section>
  );
}
