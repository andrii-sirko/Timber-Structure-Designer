import { useEffect, useId, useState } from "react";
import { RotateCcw } from "lucide-react";
import { computePricing, createDefaultPrices, timberM3RateFromPerMeter, timberPricePerMeter } from "@/engine/pricing";
import { useT } from "@/i18n";
import { usePriceStore, useProjectStore } from "@/store";
import type { DerivedModel, PriceFieldRef, PricingLine } from "@/types";
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
  const { t } = useT();
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
        title={isDefault ? t("Matches default price") : t("Reset to default price")}
        aria-label={t("Reset to default price")}
        disabled={isDefault}
        onClick={onReset}
        className="text-slate-500 hover:text-slate-200 disabled:opacity-25"
      >
        <RotateCcw className="h-3 w-3" />
      </button>
    </span>
  );
}

function PriceTable({
  title,
  lines,
  subtotalLabel,
  subtotal,
  empty,
  onChange,
  defaultFor,
}: {
  title: string;
  lines: PricingLine[];
  subtotalLabel: string;
  subtotal: number;
  empty?: string;
  onChange: (ref: PriceFieldRef, value: number) => void;
  defaultFor: (ref: PriceFieldRef) => number;
}) {
  const { t, tx, lang } = useT();
  if (lines.length === 0 && !empty) return null;
  return (
    <>
      <h3 className="px-2 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-timber-200 uppercase">
        {title}
      </h3>
      {lines.length === 0 ? (
        <p className="px-2 pb-3 text-[11px] text-slate-500">{empty}</p>
      ) : (
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-slate-950">
            <tr>
              <th className={th}>{t("Item")}</th>
              <th className={cx(th, "text-right")}>{t("Qty")}</th>
              <th className={cx(th, "text-right")}>{t("Unit price")}</th>
              <th className={cx(th, "text-right")}>{t("Total")}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr
                key={l.id}
                className="border-t border-slate-800/80 hover:bg-slate-900/60"
              >
                <td className={td}>
                  <div>{lang === "de" && l.labelDe ? l.labelDe : tx(l.label)}</div>
                  {l.labelDe && lang !== "de" && (
                    <div className="text-[10px] text-slate-500">
                      {l.labelDe}
                    </div>
                  )}
                </td>
                <td className={cx(td, mono, "text-right whitespace-nowrap")}>
                  {l.quantity.toFixed(l.unit === "pcs" ? 0 : 2)} {t(l.unit)}
                </td>
                <td className={cx(td, "text-right")}>
                  <PriceInput
                    value={l.unitPrice}
                    onChange={(v) => onChange(l.priceRef, v)}
                    onReset={() => onChange(l.priceRef, defaultFor(l.priceRef))}
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
                {subtotalLabel}
              </td>
              <td className={cx(td, mono, "text-right")}>
                €{subtotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </>
  );
}

export function PricingPanel({ model }: { model: DerivedModel }) {
  const { t } = useT();
  const roofCovering = useProjectStore((s) => s.project.params.loads.roofCovering);
  const prices = usePriceStore((s) => s.prices);
  const setTimberPrice = usePriceStore((s) => s.setTimberPrice);
  const setCladdingBoardPrice = usePriceStore((s) => s.setCladdingBoardPrice);
  const setRoofDeckPrice = usePriceStore((s) => s.setRoofDeckPrice);
  const setRoofingPrice = usePriceStore((s) => s.setRoofingPrice);
  const setHardwarePrice = usePriceStore((s) => s.setHardwarePrice);
  const setFlooringPrice = usePriceStore((s) => s.setFlooringPrice);
  const setMaterialPrice = usePriceStore((s) => s.setMaterialPrice);
  const setFixturePrice = usePriceStore((s) => s.setFixturePrice);
  const resetPrices = usePriceStore((s) => s.resetPrices);

  const pricing = computePricing(model.bom, model.connections, prices, roofCovering);
  const timberSubtotal = pricing.timberLines.reduce((s, l) => s + l.lineTotal, 0);
  const otherSubtotal = pricing.otherLines.reduce((s, l) => s + l.lineTotal, 0);

  const applyChange = (ref: PriceFieldRef, value: number): void => {
    // `value` is always what's shown in the input — EUR/lfm for timber — so timber
    // converts back to the stored EUR/m³ rate before writing it to the price store.
    if (ref.kind === "timber") setTimberPrice(ref.category, timberM3RateFromPerMeter(ref.section, value));
    else if (ref.kind === "claddingBoard") setCladdingBoardPrice(value);
    else if (ref.kind === "roofDeck") setRoofDeckPrice(value);
    else if (ref.kind === "roofing") setRoofingPrice(ref.covering, value);
    else if (ref.kind === "flooring") setFlooringPrice(ref.decking, value);
    else if (ref.kind === "material") setMaterialPrice(ref.priceKey, value);
    else if (ref.kind === "fixture") setFixturePrice(ref.key, value);
    else setHardwarePrice(ref.hardwareId, value);
  };

  const defaultFor = (ref: PriceFieldRef): number => {
    const d = defaultPrices;
    if (ref.kind === "timber") return timberPricePerMeter(ref.category, ref.section, d);
    if (ref.kind === "claddingBoard") return d.claddingBoardPerM2;
    if (ref.kind === "roofDeck") return d.roofDeckPerM2;
    if (ref.kind === "roofing") return d.roofingPerM2[ref.covering];
    if (ref.kind === "flooring") return d.flooringPerM2[ref.decking];
    if (ref.kind === "material") return d.materialPerUnit[ref.priceKey] ?? 0;
    if (ref.kind === "fixture") return d.fixturePrice[ref.key] ?? 0;
    return d.hardwarePerUnit[ref.hardwareId] ?? 0;
  };

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-slate-800 p-2">
        <p className="flex-1 text-[11px] text-slate-500">
          {t(
            "Default unit prices are EUR, Berlin/Potsdam-area estimates — timber is priced per running metre (lfm), boards, roofing and floor decks per m², doors and windows per piece. Edit any price to match your own.",
          )}
        </p>
        <Button size="sm" icon={RotateCcw} onClick={() => resetPrices()}>
          {t("Reset all")}
        </Button>
      </div>

      <PriceTable
        title={t("Timber, boards & roofing")}
        lines={pricing.timberLines}
        subtotalLabel={t("Timber subtotal")}
        subtotal={timberSubtotal}
        empty={t("No timber yet.")}
        onChange={applyChange}
        defaultFor={defaultFor}
      />
      <PriceTable
        title={t("Other materials")}
        lines={pricing.otherLines}
        subtotalLabel={t("Other materials subtotal")}
        subtotal={otherSubtotal}
        onChange={applyChange}
        defaultFor={defaultFor}
      />
      <PriceTable
        title={t("Doors & windows")}
        lines={pricing.fixtureLines}
        subtotalLabel={t("Doors & windows subtotal")}
        subtotal={pricing.fixtureTotal}
        onChange={applyChange}
        defaultFor={defaultFor}
      />
      <PriceTable
        title={t("Hardware & fixings")}
        lines={pricing.hardwareLines}
        subtotalLabel={t("Hardware subtotal")}
        subtotal={pricing.hardwareTotal}
        empty={t(
          "No hardware quantities yet — add posts, rafters or braces to see connector costs here.",
        )}
        onChange={applyChange}
        defaultFor={defaultFor}
      />

      <div className="m-2 flex items-center justify-between rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2">
        <span className="text-sm font-medium text-slate-100">
          {t("Grand total")}
        </span>
        <span className="font-mono text-lg font-semibold text-sky-200">
          €{pricing.grandTotal.toFixed(2)}
        </span>
      </div>
      <p className="px-2 pb-3 text-[11px] leading-snug text-slate-500">
        {t(
          "Materials, doors & windows and hardware only — excludes delivery, cutting waste beyond what the BOM already allows for, concrete for the post foundations, and labour. Traditional joints themselves are technique, not purchased material; only their oak pegs are priced.",
        )}
      </p>
    </div>
  );
}
