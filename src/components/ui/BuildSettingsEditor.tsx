import { useEffect, useId, useState } from 'react';
import { ClipboardList, Hammer, Home, MapPin, Package, Warehouse } from 'lucide-react';
import type { BraceConnector, BuildSettings, CladdingSpecies, FootingShape, PurlinPostConnector, StructureParams, TimberSection, WallBase } from '@/types';
import { useProjectStore } from '@/store';
import { useT } from '@/i18n';
import { NumberField, Section, SelectField, Toggle } from './primitives';

/** Free text that commits on blur (site description, lists). */
function TextField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const id = useId();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <label htmlFor={id} className="block space-y-1">
      <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}</span>
      <input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== value && onChange(text)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-500"
      />
      {hint && <span className="block text-[10px] text-slate-500">{hint}</span>}
    </label>
  );
}

function SectionInputs({ label, value, onChange }: { label: string; value: TimberSection; onChange: (s: TimberSection) => void }) {
  const { t } = useT();
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label={t('b (width)')} value={value.width} min={20} max={300} step={10} compact onChange={(width) => onChange({ ...value, width })} />
        <NumberField label={t('h (depth)')} value={value.height} min={20} max={300} step={10} compact onChange={(height) => onChange({ ...value, height })} />
      </div>
    </div>
  );
}

const parseLengths = (text: string): number[] =>
  text
    .split(/[,;\s]+/)
    .map((v) => Number(v.replace(',', '.')))
    .filter((v) => Number.isFinite(v) && v > 0)
    .map((v) => Math.round(v < 100 ? v * 1000 : v));
const parseSections = (text: string): TimberSection[] =>
  text
    .split(/[,;]+/)
    .map((v) => /(\d+)\s*[×x*]\s*(\d+)/.exec(v))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ width: Number(m[1]), height: Number(m[2]) }));

/**
 * Every build and site assumption behind the checks and quantities, editable and printed in the
 * statics report: site, post bases and foundations, the uplift chain, bracing and walls, roof
 * sheeting, ordering and optional material lines.
 */
export function BuildSettingsEditor({ params }: { params: StructureParams }) {
  const { t } = useT();
  const setBuild = useProjectStore((s) => s.setBuild);
  const b = params.build;
  const set = <K extends keyof BuildSettings>(key: K, value: BuildSettings[K]) => setBuild({ [key]: value } as Partial<BuildSettings>);

  return (
    <>
      <Section title={t('Site & reference levels')} icon={MapPin} defaultOpen={false} focusKey="site-build">
        <TextField label={t('Site')} value={b.site} onChange={(v) => set('site', v)} />
        <div className="grid grid-cols-2 gap-2">
          <TextField label={t('Wind zone')} value={b.windZone} onChange={(v) => set('windZone', v)} />
          <TextField label={t('Terrain category')} value={b.terrainCategory} onChange={(v) => set('terrainCategory', v)} />
        </div>
        <NumberField label={t('Base gap: concrete top → post bottom')} value={b.baseGap} min={0} max={500} step={10} onChange={(v) => set('baseGap', v)} />
        <Toggle
          label={t('Post bottom at an explicit level')}
          description={t('Off: concrete top at ±0, posts start at the base gap (curb top with a wall curb)')}
          checked={b.postBottomLevel !== null}
          onChange={(on) => set('postBottomLevel', on ? b.baseGap : null)}
        />
        {b.postBottomLevel !== null && <NumberField label={t('Post bottom level above ±0')} value={b.postBottomLevel} min={-1000} max={2000} step={10} onChange={(v) => set('postBottomLevel', v)} />}
        <NumberField label={t('Cut reserve on posts (order length)')} value={b.cutReserve} min={0} max={1000} step={10} onChange={(v) => set('cutReserve', v)} />
        <SelectField<FootingShape>
          label={t('Point foundation shape')}
          value={b.footingShape}
          onChange={(v) => set('footingShape', v)}
          options={[
            { value: 'square', label: t('Square pad (size = side)') },
            { value: 'round', label: t('Round (size = Ø)') },
          ]}
        />
        <NumberField label={t('Concrete per 25 kg bag')} value={b.concreteBagLitres} min={1} max={100} step={0.5} unit="l" onChange={(v) => set('concreteBagLitres', v)} />
      </Section>

      <Section title={t('Uplift chain')} icon={Hammer} defaultOpen={false} focusKey="uplift-chain">
        <SelectField<'1' | '2'>
          label={t('Rafter–purlin anchors per bearing')}
          value={String(b.rafterAnchorsPerBearing) as '1' | '2'}
          onChange={(v) => set('rafterAnchorsPerBearing', v === '2' ? 2 : 1)}
          options={[
            { value: '1', label: '1' },
            { value: '2', label: t('2 (one each side)') },
          ]}
        />
        <NumberField label={t('Rafter anchor R_k (ETA)')} value={b.rafterAnchorRk} min={0.1} max={50} step={0.1} unit="kN" onChange={(v) => set('rafterAnchorRk', v)} />
        <SelectField<PurlinPostConnector>
          label={t('Purlin → post connector')}
          value={b.purlinPostConnector}
          onChange={(v) => set('purlinPostConnector', v)}
          options={[
            { value: 'angle-brackets', label: t('2 angle brackets 90×90×65') },
            { value: 'screws', label: t('2 fully threaded screws 8 × 300') },
            { value: 'strap', label: t('Perforated strap (Lochband) over the purlin') },
          ]}
        />
        <NumberField label={t('Angle bracket R_k (ETA)')} value={b.angleBracketRk} min={0.1} max={50} step={0.1} unit="kN" onChange={(v) => set('angleBracketRk', v)} />
      </Section>

      <Section title={t('Bracing & walls')} icon={Home} defaultOpen={false} focusKey="walls-build">
        <Toggle
          label={t('Strap crosses in the roof plane')}
          description={t('Crossed Windrispenband under the roof covering from the braced wall line to the free end, so the roof carries the wind to the walls')}
          checked={b.roofStraps}
          onChange={(v) => set('roofStraps', v)}
        />
        <SelectField<BraceConnector>
          label={t('Knee brace connector per end')}
          value={b.braceConnector}
          onChange={(v) => set('braceConnector', v)}
          options={[
            { value: 'screws', label: t('2 structural screws 8 × 200') },
            { value: 'bolt', label: t('1 bolt M12') },
          ]}
        />
        <SelectField<WallBase>
          label={t('Wall base')}
          value={b.wallBase}
          onChange={(v) => set('wallBase', v)}
          options={[
            { value: 'slab', label: t('On the slab (±0)') },
            { value: 'curb', label: t('On a concrete curb') },
            { value: 'spacers', label: t('Bottom plate on spacers') },
            { value: 'hung', label: t('Studs hung from the rail, feet held sideways') },
          ]}
        />
        {b.wallBase === 'curb' && (
          <div className="grid grid-cols-3 gap-2">
            <NumberField label={t('Curb width')} value={b.curbWidth} min={50} max={1000} step={10} compact onChange={(v) => set('curbWidth', v)} />
            <NumberField label={t('Curb height')} value={b.curbHeight} min={50} max={1500} step={10} compact onChange={(v) => set('curbHeight', v)} />
            <NumberField label={t('Curb top')} value={b.curbTop} min={0} max={1000} step={10} compact onChange={(v) => set('curbTop', v)} />
          </div>
        )}
        {(b.wallBase === 'spacers' || b.wallBase === 'hung') && <NumberField label={t('Gap under the wall (spacers)')} value={b.plateSpacer} min={0} max={200} step={5} onChange={(v) => set('plateSpacer', v)} />}
        <NumberField label={t('Installation gap per side (doors / windows)')} value={b.installGap} min={0} max={50} step={1} onChange={(v) => set('installGap', v)} />
        <SelectField<CladdingSpecies>
          label={t('Facade boards')}
          value={b.claddingSpecies}
          onChange={(v) => set('claddingSpecies', v)}
          options={[
            { value: 'spruce', label: t('Spruce') },
            { value: 'larch', label: t('Larch') },
          ]}
        />
        <SectionInputs label={t('Screen battens (along the wall × in the wind)')} value={b.screenBatten} onChange={(v) => set('screenBatten', v)} />
        <NumberField label={t('Screen batten spacing')} value={b.screenBattenSpacing} min={200} max={3000} step={50} onChange={(v) => set('screenBattenSpacing', v)} />
        <div className="grid grid-cols-3 gap-2">
          <NumberField label={t('c_p screen')} value={b.screenCp} min={0.1} max={3} step={0.1} unit="" compact onChange={(v) => set('screenCp', v)} />
          <NumberField label={t('c_p closed wall')} value={b.wallCp} min={0.1} max={3} step={0.1} unit="" compact onChange={(v) => set('wallCp', v)} />
          <NumberField label={t('Stud deflection L/')} value={b.studDeflectionLimit} min={50} max={1000} step={10} unit="" compact onChange={(v) => set('studDeflectionLimit', v)} />
        </div>
      </Section>

      <Section title={t('Roof sheeting')} icon={Warehouse} defaultOpen={false} focusKey="roof-sheet">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label={t('Sheet cover width')} value={b.sheetCoverWidth} min={300} max={2000} step={5} compact onChange={(v) => set('sheetCoverWidth', v)} />
          <NumberField label={t('Profile height')} value={b.sheetProfileHeight} min={5} max={200} step={1} compact onChange={(v) => set('sheetProfileHeight', v)} />
          <NumberField label={t('Longest sheet')} value={b.maxSheetLength} min={1000} max={30000} step={100} compact onChange={(v) => set('maxSheetLength', v)} />
          <NumberField label={t('Max. profile span')} value={b.sheetMaxSpan} min={200} max={6000} step={50} compact onChange={(v) => set('sheetMaxSpan', v)} />
        </div>
        <SectionInputs label={t('Roof battens')} value={b.battenSection} onChange={(v) => set('battenSection', v)} />
        <div className="grid grid-cols-2 gap-2">
          <NumberField label={t('Roofing screw Ø')} value={b.roofScrewDiameter} min={4} max={10} step={0.5} compact onChange={(v) => set('roofScrewDiameter', v)} />
          <NumberField label={t('Roofing screw length')} value={b.roofScrewLength} min={20} max={300} step={5} compact onChange={(v) => set('roofScrewLength', v)} />
          <NumberField label={t('Screws per m², field')} value={b.roofScrewsField} min={1} max={30} step={1} unit="" compact onChange={(v) => set('roofScrewsField', v)} />
          <NumberField label={t('Screws per m², edges')} value={b.roofScrewsEdge} min={1} max={40} step={1} unit="" compact onChange={(v) => set('roofScrewsEdge', v)} />
          <NumberField label={t('Minimum slope')} value={b.minSlope} min={0} max={45} step={0.1} unit="°" compact onChange={(v) => set('minSlope', v)} />
          <NumberField label={t('Slope tolerance')} value={b.slopeTolerance} min={0} max={5} step={0.1} unit="°" compact onChange={(v) => set('slopeTolerance', v)} />
        </div>
      </Section>

      <Section title={t('Ordering & planning')} icon={ClipboardList} defaultOpen={false} focusKey="ordering">
        <NumberField label={t('BGF threshold (procedure-free)')} value={b.bgfLimit} min={1} max={10000} step={1} unit="m²" onChange={(v) => set('bgfLimit', v)} />
        <TextField
          label={t('Stock lengths (m)')}
          value={b.stockLengths.map((l) => l / 1000).join(', ')}
          onChange={(v) => {
            const lengths = parseLengths(v);
            if (lengths.length > 0) set('stockLengths', lengths);
          }}
        />
        <TextField
          label={t('Stock sections (b × h)')}
          value={b.stockSections.map((s) => `${s.width}×${s.height}`).join(', ')}
          hint={t('Sections the timber yard sells – any other section in the structure raises a warning.')}
          onChange={(v) => {
            const sections = parseSections(v);
            if (sections.length > 0) set('stockSections', sections);
          }}
        />
      </Section>

      <Section title={t('Optional materials')} icon={Package} defaultOpen={false} focusKey="optional-materials">
        <Toggle label={t('Facade membrane behind the cladding')} checked={b.facadeMembrane} onChange={(v) => set('facadeMembrane', v)} />
        <NumberField label={t('Ventilation grilles')} value={b.vents} min={0} max={50} step={1} unit={t('pcs')} onChange={(v) => set('vents', v)} />
        <Toggle label={t('Floor build-up')} description={t('Crushed gravel, PE film, grit and concrete slabs 60×40')} checked={b.floorBuildUp} onChange={(v) => set('floorBuildUp', v)} />
        {b.floorBuildUp && <NumberField label={t('Slabs already in stock')} value={b.existingPavingM2} min={0} max={10000} step={1} unit="m²" onChange={(v) => set('existingPavingM2', v)} />}
      </Section>
    </>
  );
}
