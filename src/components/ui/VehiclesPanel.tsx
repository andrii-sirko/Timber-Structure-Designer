import { useState } from 'react';
import { Car, Plus, RotateCw, Trash2 } from 'lucide-react';
import type { DerivedModel } from '@/types';
import { useProjectStore } from '@/store';
import { getVehicleModel, VEHICLE_CATALOG, VEHICLE_COLORS } from '@/engine/vehicles';
import { Button, NumberField, Section, SelectField, StatusDot, cx } from './primitives';

export function VehiclesPanel({ model }: { model: DerivedModel }) {
  const vehicles = useProjectStore((s) => s.project.vehicles);
  const selectedVehicleId = useProjectStore((s) => s.selectedVehicleId);
  const addVehicle = useProjectStore((s) => s.addVehicle);
  const updateVehicle = useProjectStore((s) => s.updateVehicle);
  const removeVehicle = useProjectStore((s) => s.removeVehicle);
  const selectVehicle = useProjectStore((s) => s.selectVehicle);
  const rotateVehicle = useProjectStore((s) => s.rotateVehicle);
  const [catalogId, setCatalogId] = useState(VEHICLE_CATALOG[1].id);
  const catalog = getVehicleModel(catalogId);

  return (
    <Section
      title="Vehicles (Fahrzeuge)"
      icon={Car}
      badge={vehicles.length > 0 ? <span className="rounded bg-slate-800 px-1.5 text-[10px] text-slate-300">{vehicles.length}</span> : undefined}
    >
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <SelectField label="Add vehicle" value={catalogId} onChange={setCatalogId} options={VEHICLE_CATALOG.map((m) => ({ value: m.id, label: m.name }))} />
        </div>
        <Button variant="primary" icon={Plus} onClick={() => addVehicle(catalogId)} title="Place under the roof">
          Add
        </Button>
      </div>
      <p className="text-[11px] text-slate-500">
        {catalog.length} × {catalog.width} × {catalog.height} mm · {catalog.mirrorWidth} mm incl. mirrors. Drag vehicles in 3D; arrow keys nudge 50 mm (Shift 10 mm), R rotates 90°, Delete removes.
      </p>

      {vehicles.map((v) => {
        const m = getVehicleModel(v.modelId);
        const fit = model.vehicles.find((f) => f.vehicleId === v.id);
        const selected = v.id === selectedVehicleId;
        return (
          <div
            key={v.id}
            className={cx('space-y-2 rounded-md border p-2', selected ? 'border-sky-500/60 bg-sky-950/30' : 'border-slate-800 bg-slate-900/50')}
            onClick={() => selectVehicle(v.id)}
          >
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full border border-white/20" style={{ background: v.color }} />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{m.name}</span>
              <button type="button" title="Rotate 90°" className="rounded p-1 text-slate-300 hover:bg-slate-800" onClick={(e) => { e.stopPropagation(); rotateVehicle(v.id, 90); }}>
                <RotateCw className="h-4 w-4" />
              </button>
              <button type="button" title="Remove vehicle" className="rounded p-1 text-rose-300 hover:bg-rose-950/60" onClick={(e) => { e.stopPropagation(); removeVehicle(v.id); }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {fit && (
              <div className="flex items-start gap-1.5 text-[11px] text-slate-300">
                <StatusDot status={fit.status} className="mt-1" />
                <span>{fit.messages.join(' ')}</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <NumberField label="X" value={v.x} step={50} compact onChange={(x) => updateVehicle(v.id, { x })} />
              <NumberField label="Z" value={v.z} step={50} compact onChange={(z) => updateVehicle(v.id, { z })} />
              <NumberField label="Rotation" value={v.rotationDeg} min={0} max={359} step={5} unit="°" compact onChange={(rotationDeg) => updateVehicle(v.id, { rotationDeg })} />
            </div>
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
