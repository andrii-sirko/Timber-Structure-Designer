import { useEffect, useRef } from 'react';
import { Cable, CloudSnow, MapPin, MapPinned, Plus, Rows3, Ruler, Settings2, Trash2, TreePine, Triangle } from 'lucide-react';
import type { BraceDirection, DerivedModel, FloorDecking, FloorSupport, RoofCovering, RoofDirection, RoofScheme, StructureParams, TimberSection, WallId } from '@/types';
import { DECKING, FLOOR_LOAD_PRESETS, gridPostCount, MIN_PLAN_DIM, minWallHeight } from '@/engine/framing';
import { midPurlinBounds } from '@/engine/framing/roofLines';
import { freePostBounds, freePostMemberId } from '@/engine/freePosts';
import { worldWall } from '@/engine/orientation';
import { useProjectStore } from '@/store';
import { useUiStore } from '@/store/uiStore';
import { gustSpeedToPressure, pressureToGustSpeed, ROOF_COVERING_LOAD, SNOW_ZONE_PRESETS, STRENGTH_CLASSES, WIND_ZONE_PRESETS } from '@/engine/statics/materials';
import { Button, NumberField, Section, SelectField, Toggle } from './primitives';
import { StaticsBadge } from './StaticsBadge';
import { WallEditor } from './WallEditor';
import { VehiclesPanel } from './VehiclesPanel';
import { PavingPanel } from './PavingPanel';
import { focusFallbacks, SIDEBAR_TABS } from './sidebarNavigation';

const ROOF_DIRECTION_OPTIONS: { value: RoofDirection; label: string }[] = [
  { value: 'rear', label: 'Rear – high eave at the front' },
  { value: 'front', label: 'Front – high eave at the rear' },
  { value: 'left', label: 'Left – high eave on the right' },
  { value: 'right', label: 'Right – high eave on the left' },
];

const ROOF_SCHEME_OPTIONS: { value: RoofScheme; label: string }[] = [
  { value: 'classic', label: 'Classic – level purlins across the slope, rafters down the slope' },
  { value: 'sloped-purlins', label: 'Sloped purlins – post rows & braces down the slope, level rafters across (gable entry)' },
];

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

/** Timber floor inside the post frame: support system, deck, sections, spacings and imposed load. */
function FloorEditor({ model, params }: { model: DerivedModel; params: StructureParams }) {
  const setFloor = useProjectStore((s) => s.setFloor);
  const floor = params.floor;
  const geo = model.framing.floor;
  const bearers = floor.support === 'bearers';
  return (
    <Section title="Timber floor (Holzfußboden)" icon={Rows3} defaultOpen={floor.enabled} focusKey="floor">
      <Toggle label="Timber floor" description="Joists and floor deck inside the post frame" checked={floor.enabled} onChange={(enabled) => setFloor({ enabled })} />
      {floor.enabled && (
        <>
          <SelectField<FloorSupport>
            label="Support"
            value={floor.support}
            onChange={(support) => setFloor({ support })}
            options={[
              { value: 'bearers', label: 'Joists on bearers & point foundations (ventilated)' },
              { value: 'slab', label: 'Sleepers on pads on a concrete slab (low build-up)' },
            ]}
          />
          <SelectField<FloorDecking>
            label="Deck"
            value={floor.decking}
            onChange={(decking) => setFloor({ decking })}
            options={(Object.keys(DECKING) as FloorDecking[]).map((k) => ({ value: k, label: `${DECKING[k].label} (joists ≤ ${DECKING[k].maxSpan} mm)` }))}
          />
          <SectionPair label={bearers ? 'Floor joists (Balken)' : 'Sleepers (Lagerhölzer)'} value={floor.joist} onChange={(joist) => setFloor({ joist })} />
          {bearers && <SectionPair label="Bearers (Unterzüge)" value={floor.bearer} onChange={(bearer) => setFloor({ bearer })} />}
          <NumberField label="Max joist spacing" value={floor.maxJoistSpacing} min={250} max={1000} step={25} hint={geo ? `→ ${geo.joistCount} pcs @ ${geo.joistSpacing} mm` : undefined} onChange={(maxJoistSpacing) => setFloor({ maxJoistSpacing })} />
          {bearers && (
            <NumberField label="Max bearer spacing" value={floor.maxBearerSpacing} min={500} max={3000} step={50} hint={geo ? `→ ${geo.bearerCount} pcs @ ${geo.bearerSpacing} mm` : undefined} onChange={(maxBearerSpacing) => setFloor({ maxBearerSpacing })} />
          )}
          <NumberField
            label={bearers ? 'Max foundation spacing' : 'Max pad spacing'}
            value={floor.maxSupportSpacing}
            min={400}
            max={3000}
            step={50}
            hint={geo ? `→ ${geo.supportCount} ${bearers ? 'foundations' : 'pads'}` : undefined}
            onChange={(maxSupportSpacing) => setFloor({ maxSupportSpacing })}
          />
          <SelectField
            label="Floor use"
            value={String(FLOOR_LOAD_PRESETS.find((p) => Math.abs(p.value - floor.liveLoad) < 0.001)?.value ?? 'custom')}
            onChange={(v) => {
              if (v !== 'custom') setFloor({ liveLoad: Number(v) });
            }}
            options={[...FLOOR_LOAD_PRESETS.map((p) => ({ value: String(p.value), label: p.label })), { value: 'custom', label: 'Custom' }]}
          />
          <NumberField label="Imposed floor load q_k" value={floor.liveLoad} min={0} max={10} step={0.25} unit="kN/m²" onChange={(liveLoad) => setFloor({ liveLoad })} />
          {geo ? (
            <dl className="grid grid-cols-3 gap-2 rounded-md border border-slate-800 bg-slate-900/60 p-2 text-[11px]">
              <div>
                <dt className="text-slate-500">Deck area</dt>
                <dd className="font-mono text-slate-200">{geo.areaM2.toFixed(1)} m²</dd>
              </div>
              <div>
                <dt className="text-slate-500">Floor top</dt>
                <dd className="font-mono text-slate-200">+{geo.topHeight} mm</dd>
              </div>
              <div>
                <dt className="text-slate-500">Joist span</dt>
                <dd className="font-mono text-slate-200">{geo.joistSpan} mm</dd>
              </div>
            </dl>
          ) : (
            <p className="text-[11px] text-amber-300">The post frame is too small for a floor.</p>
          )}
        </>
      )}
    </Section>
  );
}

/**
 * Posts placed freely in plan, outside the purlin-row grid: click-to-place in the 3D view,
 * or type the world X / Z of each post axis here.
 */
function FreePostsEditor({ params }: { params: StructureParams }) {
  const freePosts = useProjectStore((s) => s.project.freePosts);
  const selectedMemberId = useProjectStore((s) => s.selectedMemberId);
  const selectMember = useProjectStore((s) => s.selectMember);
  const addFreePost = useProjectStore((s) => s.addFreePost);
  const updateFreePost = useProjectStore((s) => s.updateFreePost);
  const removeFreePost = useProjectStore((s) => s.removeFreePost);
  const placingPost = useUiStore((s) => s.placingPost);
  const setPlacingPost = useUiStore((s) => s.setPlacingPost);
  const half = params.timber.post.width / 2;
  const bounds = freePostBounds(params);
  return (
    <div className="space-y-2 border-t border-slate-800 pt-2">
      <div className="flex items-baseline justify-between text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        <span>Free posts</span>
        <span className="text-[10px] font-normal normal-case text-slate-500">Without purlin, anywhere under the roof</span>
      </div>
      <div className="flex gap-2">
        <Button
          variant={placingPost ? 'primary' : 'subtle'}
          size="sm"
          icon={MapPin}
          className="flex-1"
          aria-pressed={placingPost}
          onClick={() => setPlacingPost(!placingPost)}
        >
          {placingPost ? 'Click in the 3D view… (Esc cancels)' : 'Place post in 3D view'}
        </Button>
        <Button variant="subtle" size="sm" icon={Plus} title="Add a post at the centre of the footprint" onClick={() => addFreePost(params.length / 2, params.width / 2)}>
          Centre
        </Button>
      </div>
      {freePosts.length > 0 && (
        <ul className="space-y-2">
          {freePosts.map((post, i) => {
            const memberId = freePostMemberId(post.id);
            const selected = selectedMemberId === memberId;
            return (
              <li
                key={post.id}
                data-focus-key={`posts/${post.id}`}
                className={`rounded-md border p-2 ${selected ? 'border-sky-500/60 bg-sky-500/10' : 'border-slate-800 bg-slate-900/60'}`}
                onClick={() => selectMember(memberId)}
              >
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-200">Free post {i + 1}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-rose-300 hover:bg-rose-950/60"
                    title="Remove post"
                    aria-label={`Remove free post ${i + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFreePost(post.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="X" value={post.x} min={bounds.minX + half} max={bounds.maxX - half} step={10} compact onChange={(x) => updateFreePost(post.id, { x })} />
                  <NumberField label="Z" value={post.z} min={bounds.minZ + half} max={bounds.maxZ - half} step={10} compact onChange={(z) => updateFreePost(post.id, { z })} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ParameterSidebar({ model }: { model: DerivedModel }) {
  const activeTab = useUiStore((s) => s.sidebarTab);
  const setActiveTab = useUiStore((s) => s.setSidebarTab);
  const settingsFocus = useUiStore((s) => s.settingsFocus);
  const scrollRef = useRef<HTMLDivElement>(null);
  const params = useProjectStore((s) => s.project.params);
  const setParam = useProjectStore((s) => s.setParam);
  const moveMidPurlin = useProjectStore((s) => s.moveMidPurlin);
  const setOverhang = useProjectStore((s) => s.setOverhang);
  const setTimber = useProjectStore((s) => s.setTimber);
  const setStrengthClass = useProjectStore((s) => s.setStrengthClass);
  const setLoad = useProjectStore((s) => s.setLoad);
  const roof = model.framing.roof;
  const lowWall: WallId = params.roofDirection;
  const highWall = worldWall(params.roofDirection, 'front');
  const midRows = model.framing.grid.rows.filter((r): r is typeof r & { index: number } => r.index !== undefined);
  const midBounds = midPurlinBounds(params);

  // Double-clicking an object in 3D: sections expand themselves (Section focusKey); once they have
  // rendered, scroll to the object's card, or to its section when the card is not shown.
  useEffect(() => {
    if (!settingsFocus) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const root = scrollRef.current;
        const target = root && focusFallbacks(settingsFocus.path).map((key) => root.querySelector(`[data-focus-key="${CSS.escape(key)}"]`)).find(Boolean);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        useUiStore.setState({ settingsFocus: null });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [settingsFocus]);
  const midAxisFrom = params.roofScheme === 'sloped-purlins' ? `${worldWall(params.roofDirection, 'left')} wall post axis` : `high-eave (${highWall}) post axis`;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 bg-slate-950">
        <div className="grid grid-cols-5 gap-1 px-2 py-2" role="tablist" aria-label="Designer sections">
          {SIDEBAR_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-1 py-1.5 text-[11px] font-medium transition-colors ${activeTab === tab.id ? 'bg-timber-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="px-3 pb-3">
          <StaticsBadge statics={model.statics} />
        </div>
      </div>
      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {activeTab === 'dimensions' && <>
        <Section title="Structure shape" icon={Ruler}>
          <div className="grid grid-cols-1 gap-2">
            <NumberField label="Length L" value={params.length} min={MIN_PLAN_DIM} step={100} range={[MIN_PLAN_DIM, 20000]} onChange={(v) => setParam('length', v)} />
            <NumberField label="Width W" value={params.width} min={MIN_PLAN_DIM} step={100} range={[MIN_PLAN_DIM, 15000]} onChange={(v) => setParam('width', v)} />
            <NumberField label={`High eave H1 (${highWall})`} value={params.frontHeight} min={minWallHeight(params)} step={50} range={[minWallHeight(params), 6000]} onChange={(v) => setParam('frontHeight', v)} />
            <NumberField label={`Low eave H2 (${lowWall})`} value={params.rearHeight} min={minWallHeight(params)} max={params.frontHeight} step={50} range={[minWallHeight(params), 6000]} onChange={(v) => setParam('rearHeight', v)} />
          </div>
          <SelectField<RoofDirection>
            label="Roof slopes down towards"
            value={params.roofDirection}
            onChange={(v) => setParam('roofDirection', v)}
            options={ROOF_DIRECTION_OPTIONS}
          />
          <SelectField<RoofScheme>
            label="Framing scheme"
            value={params.roofScheme}
            onChange={(v) => setParam('roofScheme', v)}
            options={ROOF_SCHEME_OPTIONS}
          />
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
              <dt className="text-slate-500">Low eave</dt>
              <dd className="font-mono text-slate-200">{roof.eaveHeight} mm</dd>
            </div>
          </dl>
        </Section>
        <Section title="Post layout" icon={Settings2} defaultOpen={false} focusKey="posts">
          <Toggle
            label="Automatic post count"
            description={params.postsPerRow === null ? `${gridPostCount(model.framing.grid)} posts at ${Math.round(model.framing.grid.postSpacing)} mm centres` : 'Set the number of posts manually'}
            checked={params.postsPerRow === null}
            onChange={(auto) => setParam('postsPerRow', auto ? null : gridPostCount(model.framing.grid))}
          />
          {params.postsPerRow !== null && <NumberField label="Posts per row" value={params.postsPerRow} min={2} max={40} step={1} unit="pcs" hint={`${Math.round(model.framing.grid.postSpacing)} mm centres`} onChange={(v) => setParam('postsPerRow', Math.max(2, Math.round(v)))} />}
          <NumberField label="Maximum post spacing" value={params.maxPostSpacing} min={1000} max={6000} step={100} onChange={(v) => setParam('maxPostSpacing', v)} />
          <FreePostsEditor params={params} />
        </Section>
        </>}

        {activeTab === 'roof' && <Section title="Mono-pitch roof" icon={Triangle} focusKey="roof">
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
          <NumberField
            label="Max rafter length"
            value={params.maxRafterLength}
            min={2000}
            max={13000}
            step={250}
            hint={roof.midPurlinCount > 0 ? `→ ${roof.midPurlinCount} mid purlin${roof.midPurlinCount > 1 ? 's' : ''}, ${roof.rafterPieces} pieces ≤ ${roof.rafterPieceLength} mm` : 'longer rafters get a mid purlin'}
            onChange={(v) => setParam('maxRafterLength', v)}
          />
          {midRows.map((row) => {
            const manual = params.midPurlinPositions[row.index] != null;
            return (
              <div key={row.key} className="flex items-end gap-2">
                <div className="flex-1">
                  <NumberField
                    label={`${row.name} position`}
                    value={row.offset}
                    min={midBounds.lo}
                    max={midBounds.hi}
                    step={50}
                    hint={`${manual ? 'manual' : 'auto'} – axis distance from the ${midAxisFrom}; drag the purlin in the 3D view too`}
                    onChange={(v) => moveMidPurlin(row.index, v)}
                  />
                </div>
                {manual && (
                  <button type="button" className="mb-4 rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800" onClick={() => moveMidPurlin(row.index, null)}>
                    Auto
                  </button>
                )}
              </div>
            );
          })}
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
              <dd className="font-mono text-slate-200">{roof.rafterLength} mm{roof.rafterPieces > 1 ? ` (${roof.rafterPieces}× ≤ ${roof.rafterPieceLength})` : ''}</dd>
            </div>
          </dl>
        </Section>}

        {activeTab === 'structure' && <>
        <Section title="Timber sections" icon={TreePine} focusKey="timber">
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

        <FloorEditor model={model} params={params} />

        <Section title="Framing rules" icon={Settings2} defaultOpen={false} focusKey="framing">
          <NumberField label="Max stud spacing" value={params.maxStudSpacing} min={300} max={1000} step={25} onChange={(v) => setParam('maxStudSpacing', v)} />
          <NumberField label="Max stock length" value={params.maxStockLength} min={3000} max={13000} step={500} hint="purlins spliced above" onChange={(v) => setParam('maxStockLength', v)} />
          <Toggle label="Knee braces (Kopfbänder)" description="45° braces post ↔ purlin for longitudinal stiffness" checked={params.braces} onChange={(v) => setParam('braces', v)} />
          {params.braces && <NumberField label="Brace leg" value={params.braceLeg} min={300} max={1200} step={50} onChange={(v) => setParam('braceLeg', v)} />}
          {params.braces && (
            <SelectField<BraceDirection>
              label="Brace direction"
              value={params.braceDirection}
              onChange={(v) => setParam('braceDirection', v)}
              options={[
                { value: 'both', label: 'Both sides (pair per post)' },
                { value: 'left', label: 'Towards left wall' },
                { value: 'right', label: 'Towards right wall' },
                { value: 'alternating', label: 'Alternating' },
              ]}
            />
          )}
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
            label="Wind zone preset"
            value={String(WIND_ZONE_PRESETS.find((p) => Math.abs(p.value - params.loads.windLoad) < 0.001)?.value ?? 'custom')}
            onChange={(v) => {
              if (v !== 'custom') setLoad('windLoad', Number(v));
            }}
            options={[...WIND_ZONE_PRESETS.map((p) => ({ value: String(p.value), label: p.label })), { value: 'custom', label: 'Custom' }]}
          />
          <NumberField label="Peak velocity pressure q_p" value={params.loads.windLoad} min={0} max={50} step={0.05} unit="kN/m²" onChange={(v) => setLoad('windLoad', v)} />
          <NumberField
            label="Equivalent gust speed"
            value={Math.round(pressureToGustSpeed(params.loads.windLoad) * 10) / 10}
            min={0}
            max={300}
            step={1}
            unit="m/s"
            onChange={(v) => setLoad('windLoad', Math.round(gustSpeedToPressure(v) * 1000) / 1000)}
          />
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
            Wind q_p {model.statics.loads.windPressure.toFixed(2)} kN/m² ≈ {Math.round(model.statics.loads.gustSpeed * 3.6)} km/h gust: W_k {model.statics.loads.windForce.x.toFixed(1)} kN along X / {model.statics.loads.windForce.z.toFixed(1)} kN across, uplift {model.statics.loads.upliftPressure.toFixed(2)} kN/m².
          </p>
          <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
            <CloudSnow className="mt-0.5 h-3 w-3 shrink-0" />
            {model.statics.collapseGustSpeed !== undefined
              ? `First element gives way at ≈ ${Math.round(model.statics.collapseGustSpeed)} m/s (${Math.round(model.statics.collapseGustSpeed * 3.6)} km/h) gust: ${model.statics.collapseElement}.`
              : 'The structure already exceeds 100 % without wind – fix the gravity checks first.'}
          </p>
        </Section>
        </>}

        {activeTab === 'walls' && <>
          <div className="border-b border-slate-800 px-3 py-2.5 text-xs text-slate-500">Close walls, add partitions, then position doors and windows.</div>
          <WallEditor />
        </>}
        {activeTab === 'site' && <>
          <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2.5 text-xs text-slate-500"><MapPinned className="h-3.5 w-3.5 text-timber-400" /> Add objects and ground finishes to check clearances in context.</div>
          <VehiclesPanel model={model} />
          <PavingPanel model={model} />
        </>}
      </div>
    </div>
  );
}
