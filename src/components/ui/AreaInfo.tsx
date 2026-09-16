import { Square } from 'lucide-react';
import type { DerivedModel } from '@/types';
import { useProjectStore, usePriceStore } from '@/store';
import { computePricing } from '@/engine/pricing';

const fmt = (m2: number) => `${m2.toLocaleString('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²`;
const fmtM = (mm: number) => `${(mm / 1000).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
const fmtEur = (eur: number) => `${eur.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;

/** Small floating readout of the total areas (footprint, roof, paving), overall structure height, and estimated total cost. */
export function AreaInfo({ model }: { model: DerivedModel }) {
  const { length, width } = useProjectStore((s) => s.project.params);
  const roofCovering = useProjectStore((s) => s.project.params.loads.roofCovering);
  const prices = usePriceStore((s) => s.prices);
  const footprintM2 = (length / 1000) * (width / 1000);
  const roofM2 = model.framing.roof.areaM2;
  const pavedM2 = model.paving.totalAreaM2;
  const maxHeightMm = model.framing.roof.ridgeHeight;
  const pricing = computePricing(model.bom, model.connections, prices, roofCovering);

  return (
    <div className="pointer-events-auto absolute right-3 w-44 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur" style={{ bottom: 'calc(var(--sheet-h, 0px) + 0.75rem)' }} title="Total areas">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        <Square className="h-3.5 w-3.5 text-timber-400" /> Total area
      </div>
      <dl className="space-y-0.5 text-xs">
        <Row label="Footprint" value={fmt(footprintM2)} strong />
        <Row label="Roof" value={fmt(roofM2)} />
        {pavedM2 > 0 && <Row label="Paved" value={fmt(pavedM2)} />}
        <Row label="Max height" value={fmtM(maxHeightMm)} />
        <Row label="Est. total cost" value={fmtEur(pricing.grandTotal)} strong />
      </dl>
      <div className="mt-1.5 border-t border-slate-800 pt-1 text-right font-mono text-[10px] text-slate-500">v{__APP_VERSION__}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className={strong ? 'font-mono text-sm font-semibold text-slate-100' : 'font-mono text-slate-300'}>{value}</dd>
    </div>
  );
}
