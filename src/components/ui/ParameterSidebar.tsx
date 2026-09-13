import { Cable, CloudSnow, Ruler, Settings2, TreePine, Triangle } from 'lucide-react';
import type { DerivedModel, RoofCovering, TimberSection } from '@/types';
import { useProjectStore } from '@/store';
import { ROOF_COVERING_LOAD, SNOW_ZONE_PRESETS, STRENGTH_CLASSES } from '@/engine/statics/materials';
import { NumberField, Section, SelectField, Toggle } from './primitives';
import { StaticsBadge } from './StaticsBadge';
import { WallEditor } from './WallEditor';
import { VehiclesPanel } from './VehiclesPanel';

function SectionPair({ label, value, onChange, hint }: { label: string; value: TimberSection; onChange: (s: TimberSection) => void; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        <span>{label}</span>
        {hint && <span className="text-[10px] font-normal normal-case text-slate-500">{hint}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="b (width)" value={value.width} min={40} max={400} step={20} compact onChange={(width) => onChange({ ...value, width })} />
        <NumberField label="h (depth)" value={value.height} min={40} max={600} step={20} compact onChange={(height) => onChange({ ...value, height })} />
      </div>
    </div>
  );
}

export function ParameterSidebar({ model }: { model: DerivedModel }) {
  const params = useProjectStore((s) => s.project.params);
  const setParam = useProjectStore((s) => s.setParam);
  const setOverhang = useProjectStore((s) => s.setOverhang);
  const setTimber = useProjectStore((s) => s.setTimber);
  const setStrengthClass = useProjectStore((s) => s.setStrengthClass);
  const setLoad = useProjectStore((s) => s.setLoad);
  const roof = model.framing.roof;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 p-3">
        <StaticsBadge statics={model.statics} />
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <Section title="Dimensions" icon={Ruler}>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Length L" value={params.length} min={1500} max={20000} step={100} onChange={(v) => setParam('length', v)} />
            <NumberField label="Width W" value={params.width} min={1500} max={12000} step={100} onChange={(v) => setParam('width', v)} />
            <NumberField label="Front height H1" value={params.frontHeight} min={1800} max={5000} step={50} onChange={(v) => setParam('frontHeight', v)} />
            <NumberField label="Rear height H2" value={params.rearHeight} min={1500} max={5000} step={50} onChange={(v) => setParam('rearHeight', v)} />
          </div>
          <dl className="grid grid-cols-3 gap-2 rounded-md border border-slate-800 bg-slate-900/60 p-2 text-[11px]">
            <div>
              <dt className="text-slate-500">Pitch</dt>
              <dd className="font-mono text-slate-200">{roof.pitchDeg.toFixed(1)}°</dd>
            </div>
            <div>
              <dt className="text-slate-500">Ridge</dt>
              <dd className="font-mono text-slate-200">{roof.ridgeHeight} mm</dd>
            </div>
            <div>
              <dt className="text-slate-500">Rear eave</dt>
              <dd className="font-mono text-slate-200">{roof.eaveHeight} mm</dd>
            </div>
          </dl>
        </Section>

        <Section title="Roof (Pultdach)" icon={Triangle}>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Overhang front" value={params.overhangs.front} min={0} max={2500} step={50} onChange={(v) => setOverhang('front', v)} />
            <NumberField label="Overhang rear" value={params.overhangs.rear} min={0} max={2500} step={50} onChange={(v) => setOverhang('rear', v)} />
            <NumberField label="Overhang left" value={params.overhangs.left} min={0} max={2000} step={50} onChange={(v) => setOverhang('left', v)} />
            <NumberField label="Overhang right" value={params.overhangs.right} min={0} max={2000} step={50} onChange={(v) => setOverhang('right', v)} />
          </div>
          <SelectField<RoofCovering>
            label="Roof covering"
            value={params.loads.roofCovering}
            onChange={(v) => setLoad('roofCovering', v)}
            options={(Object.keys(ROOF_COVERING_LOAD) as RoofCovering[]).map((k) => ({
              value: k,
              label: `${ROOF_COVERING_LOAD[k].label} (${ROOF_COVERING_LOAD[k].load.toFixed(2)} kN/m²)`,
            }))}
          />
          <NumberField label="Max rafter spacing" value={params.maxRafterSpacing} min={300} max={1250} step={25} hint={`→ ${roof.rafterCount} rafters @ ${roof.rafterSpacing} mm`} onChange={(v) => setParam('maxRafterSpacing', v)} />
          <dl className="grid grid-cols-3 gap-2 rounded-md border border-slate-800 bg-slate-900/60 p-2 text-[11px]">
            <div>
              <dt className="text-slate-500">Total roof area</dt>
              <dd className="font-mono text-slate-200">{roof.areaM2.toFixed(1)} m²</dd>
            </div>
            <div>
              <dt className="text-slate-500">Plan area</dt>
              <dd className="font-mono text-slate-200">{(((params.length + params.overhangs.left + params.overhangs.right) * roof.rafterRun) / 1e6).toFixed(1)} m²</dd>
            </div>
            <div>
              <dt className="text-slate-500">Rafter length</dt>
              <dd className="font-mono text-slate-200">{roof.rafterLength} mm</dd>
            </div>
          </dl>
        </Section>

        <Section title="Timber sections" icon={TreePine}>
          <SelectField
            label="Strength class"
            value={params.timber.strengthClass}
            onChange={setStrengthClass}
            options={STRENGTH_CLASSES.map((c) => ({ value: c, label: c }))}
          />
          <SectionPair label="Posts (Pfosten)" value={params.timber.post} onChange={(s) => setTimber('post', s)} />
          <SectionPair label="Purlins / rails (Pfetten)" value={params.timber.beam} onChange={(s) => setTimber('beam', s)} />
          <SectionPair label="Rafters (Sparren)" value={params.timber.rafter} onChange={(s) => setTimber('rafter', s)} />
          <SectionPair label="Wall studs (Ständer)" value={params.timber.stud} hint="b along wall · h = wall depth" onChange={(s) => setTimber('stud', s)} />
          <SectionPair label="Knee braces (Kopfbänder)" value={params.timber.brace} onChange={(s) => setTimber('brace', s)} />
        </Section>

        <Section title="Structural grid" icon={Settings2} defaultOpen={false}>
          <Toggle
            label="Post count per row: automatic"
            description={params.postsPerRow === null ? `From max spacing → ${model.framing.grid.xPositions.length} posts @ ${Math.round(model.framing.grid.postSpacing)} mm` : 'Off – set the number of posts manually'}
            checked={params.postsPerRow === null}
            onChange={(auto) => setParam('postsPerRow', auto ? null : model.framing.grid.xPositions.length)}
          />
          {params.postsPerRow !== null && (
            <NumberField
              label="Posts per row"
              value={params.postsPerRow}
              min={2}
              max={40}
              step={1}
              unit="pcs"
              hint={`→ spacing ${Math.round(model.framing.grid.postSpacing)} mm`}
              onChange={(v) => setParam('postsPerRow', Math.max(2, Math.round(v)))}
            />
          )}
          <NumberField label="Max post spacing" value={params.maxPostSpacing} min={1000} max={6000} step={100} hint={params.postsPerRow === null ? 'drives the post count' : 'recommended limit'} onChange={(v) => setParam('maxPostSpacing', v)} />
          <NumberField label="Max stud spacing" value={params.maxStudSpacing} min={300} max={1000} step={25} onChange={(v) => setParam('maxStudSpacing', v)} />
          <NumberField label="Max stock length" value={params.maxStockLength} min={3000} max={13000} step={500} hint="purlins spliced above" onChange={(v) => setParam('maxStockLength', v)} />
          <Toggle label="Knee braces (Kopfbänder)" description="45° braces post ↔ purlin for longitudinal stiffness" checked={params.braces} onChange={(v) => setParam('braces', v)} />
          {params.braces && <NumberField label="Brace leg" value={params.braceLeg} min={300} max={1200} step={50} onChange={(v) => setParam('braceLeg', v)} />}
        </Section>

        <Section title="Loads & connections" icon={CloudSnow} defaultOpen={false}>
          <SelectField
            label="Snow zone preset"
            value={String(SNOW_ZONE_PRESETS.find((p) => Math.abs(p.value - params.loads.snowLoad) < 0.001)?.value ?? 'custom')}
            onChange={(v) => {
              if (v !== 'custom') setLoad('snowLoad', Number(v));
            }}
            options={[...SNOW_ZONE_PRESETS.map((p) => ({ value: String(p.value), label: p.label })), { value: 'custom', label: 'Custom' }]}
          />
          <NumberField label="Ground snow load s_k" value={params.loads.snowLoad} min={0} max={5} step={0.05} unit="kN/m²" onChange={(v) => setLoad('snowLoad', v)} />
          <SelectField
            label="Service class (EC5)"
            value={String(params.loads.serviceClass)}
            onChange={(v) => setLoad('serviceClass', Number(v) as 1 | 2 | 3)}
            options={[
              { value: '1', label: '1 – heated interior' },
              { value: '2', label: '2 – covered, outdoors' },
              { value: '3', label: '3 – fully exposed' },
            ]}
          />
          <SelectField
            label="Connections"
            value={params.connectionMode}
            onChange={(v) => setParam('connectionMode', v)}
            options={[
              { value: 'hardware', label: 'Mechanical connectors (brackets, anchors, screws)' },
              { value: 'traditional', label: 'Traditional joinery (Zapfen, Kerve, Hakenblatt)' },
            ]}
          />
          <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
            <Cable className="mt-0.5 h-3 w-3 shrink-0" />
            Dead load {model.statics.loads.deadLoad.toFixed(2)} + snow {model.statics.loads.snowLoadRoof.toFixed(2)} = {model.statics.loads.totalCharacteristic.toFixed(2)} kN/m² (design {model.statics.loads.totalDesign.toFixed(2)}).
          </p>
        </Section>

        <WallEditor />
        <VehiclesPanel model={model} />
      </div>
    </div>
  );
}
