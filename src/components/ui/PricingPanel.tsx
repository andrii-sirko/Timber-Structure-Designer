import { useEffect, useId, useState } from "react";
import { RotateCcw } from "lucide-react";
import { computePricing, createDefaultPrices, timberM3RateFromPerMeter, timberPricePerMeter } from "@/engine/pricing";
import { usePriceStore, useProjectStore } from "@/store";
import type { DerivedModel, PriceFieldRef } from "@/types";
import { Button, cx } from "./primitives";

const defaultPrices = createDefaultPrices();

const th =
  "px-2 py-1.5 text-left text-[10px] font-semibold tracking-wide text-slate-400 uppercase";
const td = "px-2 py-1.5 align-top text-xs text-slate-200";
const mono = "font-mono tabular-nums";

/** Compact inline price input: commits on blur / Enter, like the sidebar's NumberField but sized for a table cell. */
function PriceInput({
  value,
  onChange,
  onReset,
  isDefault,
}: {
  value: number;
  onChange: (v: number) => void;
  onReset: () => void;
  isDefault: boolean;
}) {
  const id = useId();
  const [text, setText] = useState(value.toFixed(2));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value.toFixed(2));
  }, [value, focused]);

  const commit = (raw: string): void => {
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) {
      setText(value.toFixed(2));
      return;
    }
    if (n !== value) onChange(n);
    setText(n.toFixed(2));
  };

  return (
    <span className="flex items-center justify-end gap-1">
      <span className="flex items-center overflow-hidden rounded border border-slate-700 bg-slate-900 focus-within:border-sky-500">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          className="w-16 bg-transparent px-1.5 py-1 text-right font-mono text-xs text-slate-100 outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            commit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <span className="shrink-0 border-l border-slate-800 px-1 text-[10px] text-slate-500">
          €
        </span>
      </span>
      <button
        type="button"
        title={isDefault ? "Matches default price" : "Reset to default price"}
        aria-label="Reset to default price"
        disabled={isDefault}
        onClick={onReset}
        className="text-slate-500 hover:text-slate-200 disabled:opacity-25"
      >
        <RotateCcw className="h-3 w-3" />
      </button>
    </span>
  );
}

export function PricingPanel({ model }: { model: DerivedModel }) {
  const roofCovering = useProjectStore((s) => s.project.params.loads.roofCovering);
  const prices = usePriceStore((s) => s.prices);
  const setTimberPrice = usePriceStore((s) => s.setTimberPrice);
  const setCladdingBoardPrice = usePriceStore((s) => s.setCladdingBoardPrice);
  const setRoofDeckPrice = usePriceStore((s) => s.setRoofDeckPrice);
  const setRoofingPrice = usePriceStore((s) => s.setRoofingPrice);
  const setHardwarePrice = usePriceStore((s) => s.setHardwarePrice);
  const resetPrices = usePriceStore((s) => s.resetPrices);

  const pricing = computePricing(model.bom, model.connections, prices, roofCovering);

  const applyChange = (ref: PriceFieldRef, value: number): void => {
    // `value` is always what's shown in the input — EUR/lfm for timber — so timber
    // converts back to the stored EUR/m³ rate before writing it to the price store.
    if (ref.kind === "timber") setTimberPrice(ref.category, timberM3RateFromPerMeter(ref.section, value));
    else if (ref.kind === "claddingBoard") setCladdingBoardPrice(value);
    else if (ref.kind === "roofDeck") setRoofDeckPrice(value);
    else if (ref.kind === "roofing") setRoofingPrice(ref.covering, value);
    else setHardwarePrice(ref.hardwareId, value);
  };

  const defaultFor = (ref: PriceFieldRef): number => {
    const d = defaultPrices;
    if (ref.kind === "timber") return timberPricePerMeter(ref.category, ref.section, d);
    if (ref.kind === "claddingBoard") return d.claddingBoardPerM2;
    if (ref.kind === "roofDeck") return d.roofDeckPerM2;
    if (ref.kind === "roofing") return d.roofingPerM2[ref.covering];
    return d.hardwarePerUnit[ref.hardwareId] ?? 0;
  };

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-slate-800 p-2">
        <p className="flex-1 text-[11px] text-slate-500">
          Default unit prices are EUR, Berlin/Potsdam-area estimates — timber
          is priced per running metre (lfm), boards and roofing per m², like a
          supplier quote. Edit any price to match your own.
        </p>
        <Button size="sm" icon={RotateCcw} onClick={() => resetPrices()}>
          Reset all
        </Button>
      </div>

      <h3 className="px-2 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-timber-200 uppercase">
        Material
      </h3>
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-slate-950">
          <tr>
            <th className={th}>Item</th>
            <th className={cx(th, "text-right")}>Qty</th>
            <th className={cx(th, "text-right")}>Unit price</th>
            <th className={cx(th, "text-right")}>Total</th>
          </tr>
        </thead>
        <tbody>
          {pricing.timberLines.map((l) => (
            <tr
              key={l.id}
              className="border-t border-slate-800/80 hover:bg-slate-900/60"
            >
              <td className={td}>
                <div>{l.label}</div>
                {l.labelDe && (
                  <div className="text-[10px] text-slate-500">{l.labelDe}</div>
                )}
              </td>
              <td className={cx(td, mono, "text-right whitespace-nowrap")}>
                {l.quantity.toFixed(l.unit === "pcs" ? 0 : 2)} {l.unit}
              </td>
              <td className={cx(td, "text-right")}>
                <PriceInput
                  value={l.unitPrice}
                  onChange={(v) => applyChange(l.priceRef, v)}
                  onReset={() => applyChange(l.priceRef, defaultFor(l.priceRef))}
                  isDefault={l.unitPrice === defaultFor(l.priceRef)}
                />
              </td>
              <td className={cx(td, mono, "text-right font-semibold")}>
                €{l.lineTotal.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-700 bg-slate-900/70 font-semibold">
            <td className={td} colSpan={3}>
              Material subtotal
            </td>
            <td className={cx(td, mono, "text-right")}>
              €{pricing.materialTotal.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      <h3 className="px-2 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-timber-200 uppercase">
        Hardware & fixings
      </h3>
      {pricing.hardwareLines.length === 0 ? (
        <p className="px-2 pb-3 text-[11px] text-slate-500">
          No hardware quantities yet — add posts, rafters or braces to see
          connector costs here.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-slate-950">
            <tr>
              <th className={th}>Item</th>
              <th className={cx(th, "text-right")}>Qty</th>
              <th className={cx(th, "text-right")}>Unit price</th>
              <th className={cx(th, "text-right")}>Total</th>
            </tr>
          </thead>
          <tbody>
            {pricing.hardwareLines.map((l) => (
              <tr
                key={l.id}
                className="border-t border-slate-800/80 hover:bg-slate-900/60"
              >
                <td className={td}>
                  <div>{l.label}</div>
                  {l.labelDe && (
                    <div className="text-[10px] text-slate-500">
                      {l.labelDe}
                    </div>
                  )}
                </td>
                <td className={cx(td, mono, "text-right whitespace-nowrap")}>
                  {l.quantity.toFixed(0)} {l.unit}
                </td>
                <td className={cx(td, "text-right")}>
                  <PriceInput
                    value={l.unitPrice}
                    onChange={(v) => applyChange(l.priceRef, v)}
                    onReset={() =>
                      applyChange(l.priceRef, defaultFor(l.priceRef))
                    }
                    isDefault={l.unitPrice === defaultFor(l.priceRef)}
                  />
                </td>
                <td className={cx(td, mono, "text-right font-semibold")}>
                  €{l.lineTotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-700 bg-slate-900/70 font-semibold">
              <td className={td} colSpan={3}>
                Hardware subtotal
              </td>
              <td className={cx(td, mono, "text-right")}>
                €{pricing.hardwareTotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      <div className="m-2 flex items-center justify-between rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2">
        <span className="text-sm font-medium text-slate-100">
          Grand total
        </span>
        <span className="font-mono text-lg font-semibold text-sky-200">
          €{pricing.grandTotal.toFixed(2)}
        </span>
      </div>
      <p className="px-2 pb-3 text-[11px] leading-snug text-slate-500">
        Material and hardware only — excludes delivery, cutting waste beyond
        what the BOM already allows for, and labour. Traditional joinery
        (mortise & tenon, pegs, etc.) is not priced since it's technique, not
        purchased material — switch "Loads & connections" to traditional mode
        to see joint counts without hardware cost.
      </p>
    </div>
  );
}
