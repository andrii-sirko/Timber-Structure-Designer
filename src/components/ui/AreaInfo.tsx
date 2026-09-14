import { Square } from 'lucide-react';
import type { DerivedModel } from '@/types';
import { useProjectStore } from '@/store';

const fmt = (m2: number) => `${m2.toLocaleString('en', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²`;

/** Small floating readout of the total areas (footprint, roof, paving). */
export function AreaInfo({ model }: { model: DerivedModel }) {
  const { length, width } = useProjectStore((s) => s.project.params);
  const footprintM2 = (length / 1000) * (width / 1000);
  const roofM2 = model.framing.roof.areaM2;
  const pavedM2 = model.paving.totalAreaM2;

  return (
    <div className="pointer-events-auto absolute right-3 bottom-3 w-44 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur" title="Total areas">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        <Square className="h-3.5 w-3.5 text-timber-400" /> Total area
      </div>
      <dl className="space-y-0.5 text-xs">
        <Row label="Footprint" value={fmt(footprintM2)} strong />
        <Row label="Roof" value={fmt(roofM2)} />
        {pavedM2 > 0 && <Row label="Paved" value={fmt(pavedM2)} />}
      </dl>
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
