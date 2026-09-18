import {
  AlertTriangle,
  BadgeEuro,
  Car,
  DoorOpen,
  Download,
  FileText,
  Info,
  Package,
  ShieldAlert,
  Wand2,
  X,
} from "lucide-react";
import { resolveVehicleModel } from "@/engine/vehicles";
import { useT } from "@/i18n";
import type { DerivedModel } from "@/types";
import { useProjectStore } from "@/store";
import { useUiStore, type ResultsTab } from "@/store/uiStore";
import { exportCutListCsv, exportCutListPdf } from "@/utils/export";
import {
  Button,
  STATUS_BG,
  STATUS_LABEL,
  STATUS_TEXT,
  StatusDot,
  cx,
} from "./primitives";
import { useAutoFixStatics } from "./useAutoFixStatics";
import { useCostOptimizationStatics } from "./useCostOptimizationStatics";
import { PricingPanel } from "./PricingPanel";

const TABS: { id: ResultsTab; label: string }[] = [
  { id: "bom", label: "BOM" },
  { id: "cutlist", label: "Cut list" },
  { id: "hardware", label: "Connections" },
  { id: "pricing", label: "Pricing" },
  { id: "statics", label: "Statics" },
  { id: "warnings", label: "Checks" },
];

const th =
  "px-2 py-1.5 text-left text-[10px] font-semibold tracking-wide text-slate-400 uppercase";
const td = "px-2 py-1.5 align-top text-xs text-slate-200";
const mono = "font-mono tabular-nums";

export function ResultsPanel({ model }: { model: DerivedModel }) {
  const { t, tx, lang } = useT();
  const tab = useUiStore((s) => s.resultsTab);
  const setTab = useUiStore((s) => s.setResultsTab);
  const project = useProjectStore((s) => s.project);
  const autoFixReport = useUiStore((s) => s.autoFixReport);
  const setAutoFixReport = useUiStore((s) => s.setAutoFixReport);
  const runAutoFix = useAutoFixStatics();
  const { run: runCostOptimization, available: costOptimizationAvailable } = useCostOptimizationStatics();
  const { bom, cutList, connections, statics, framing, vehicles } = model;
  const warningCount =
    framing.warnings.filter((w) => w.level !== "info").length +
    vehicles.filter((v) => v.status !== "ok").length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-slate-800">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.id}
            type="button"
            onClick={() => setTab(tabDef.id)}
            className={cx(
              "relative flex-1 px-2 py-2.5 text-xs font-medium transition-colors",
              tab === tabDef.id
                ? "text-sky-200 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-sky-400"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            {t(tabDef.label)}
            {tabDef.id === "statics" && (
              <StatusDot
                status={statics.status}
                className="ml-1.5 align-middle"
              />
            )}
            {tabDef.id === "warnings" && warningCount > 0 && (
              <span className="ml-1 rounded bg-amber-500/20 px-1 text-[10px] text-amber-300">
                {warningCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-auto">
        {tab === "bom" && (
          <div>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-950">
                <tr>
                  <th className={th}>{t("Category")}</th>
                  <th className={th}>{t("Section")}</th>
                  <th className={cx(th, "text-right")}>{t("Pcs")}</th>
                  <th className={cx(th, "text-right")}>{t("Length")}</th>
                  <th className={cx(th, "text-right")}>{t("Volume")}</th>
                </tr>
              </thead>
              <tbody>
                {bom.lines.map((l, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-800/80 hover:bg-slate-900/60"
                  >
                    <td className={td}>
                      <div>{lang === "de" ? l.labelDe : tx(l.label)}</div>
                      {lang !== "de" && (
                        <div className="text-[10px] text-slate-500">
                          {l.labelDe}
                        </div>
                      )}
                    </td>
                    <td className={cx(td, mono)}>
                      {l.section
                        ? `${l.section.width}×${l.section.height}`
                        : l.areaM2
                          ? `${l.areaM2.toFixed(2)} m²`
                          : "–"}
                    </td>
                    <td className={cx(td, mono, "text-right")}>{l.count}</td>
                    <td className={cx(td, mono, "text-right")}>
                      {l.totalLengthM ? `${l.totalLengthM.toFixed(2)} m` : "–"}
                    </td>
                    <td className={cx(td, mono, "text-right")}>
                      {l.volumeM3.toFixed(3)} m³
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-900/70 font-semibold">
                  <td className={td} colSpan={2}>
                    {t("Total timber")}
                  </td>
                  <td className={cx(td, mono, "text-right")}>
                    {bom.lines.reduce(
                      (s, l) => s + (l.section ? l.count : 0),
                      0,
                    )}
                  </td>
                  <td className={cx(td, mono, "text-right")}>
                    {bom.totalLengthM.toFixed(1)} m
                  </td>
                  <td className={cx(td, mono, "text-right")}>
                    {bom.totalVolumeM3.toFixed(3)} m³
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="grid grid-cols-3 gap-2 p-3 text-[11px]">
              <Stat label={t("Mass")} value={`${Math.round(bom.totalMassKg)} kg`} />
              <Stat
                label={t("Roof area")}
                value={`${framing.roof.areaM2.toFixed(1)} m²`}
              />
              <Stat
                label={t("Rafters")}
                value={`${framing.roof.rafterCount} @ ${framing.roof.rafterSpacing}`}
              />
            </div>
            {bom.fixtures.length > 0 && (
              <div className="border-t border-slate-800">
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    {t("Doors & windows to buy")}
                    {lang !== "de" && " (Türen & Fenster)"}
                  </span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>{t("Product")}</th>
                      <th className={th}>{t("Wall")}</th>
                      <th className={cx(th, "text-right")}>{t("Frame")}</th>
                      <th className={cx(th, "text-right")}>{t("Rough opening")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.fixtures.map((f) => (
                      <tr
                        key={f.openingId}
                        className="border-t border-slate-800/80 hover:bg-slate-900/60"
                      >
                        <td className={td}>
                          <div>{lang === "de" ? f.productDe : tx(f.product)}</div>
                          {(lang !== "de" || (f.label && f.label !== f.product)) && (
                            <div className="text-[10px] text-slate-500">
                              {lang !== "de" ? f.productDe : ""}
                              {f.label && f.label !== f.product
                                ? `${lang !== "de" ? " · " : ""}${tx(f.label)}`
                                : ""}
                            </div>
                          )}
                        </td>
                        <td className={td}>{tx(f.wall)}</td>
                        <td className={cx(td, mono, "text-right")}>
                          {f.frameWidth}×{f.frameHeight}
                        </td>
                        <td className={cx(td, mono, "text-right")}>
                          {f.roughWidth}×{f.roughHeight}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <details className="px-3 pt-2 pb-3 text-[11px] text-slate-400">
                  <summary className="cursor-pointer select-none text-slate-300">
                    {t("Materials & hardware per opening")}
                  </summary>
                  <div className="mt-2 space-y-2">
                    {bom.fixtures.map((f) => (
                      <div key={f.openingId}>
                        <div className="font-medium text-slate-200">
                          {tx(f.label)} – {lang === "de" ? f.productDe : tx(f.product)} ({tx(f.wall)})
                        </div>
                        <ul className="ml-4 list-disc space-y-0.5">
                          {f.materials.map((m, i) => (
                            <li key={i}>{tx(m)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
            {bom.materials.length > 0 && (
              <div className="border-t border-slate-800">
                <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                  <Package className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    {t("Other materials")}
                    {lang !== "de" && " (Sonstige Materialien)"}
                  </span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>{t("Item")}</th>
                      <th className={th}>{t("Spec")}</th>
                      <th className={cx(th, "text-right")}>{t("Qty")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.materials.map((m) => (
                      <tr
                        key={m.id}
                        className="border-t border-slate-800/80 hover:bg-slate-900/60"
                      >
                        <td className={td}>
                          <div>{lang === "de" ? m.nameDe : tx(m.name)}</div>
                          {(lang !== "de" || m.note) && (
                            <div className="text-[10px] text-slate-500">
                              {lang !== "de" ? m.nameDe : ""}
                              {m.note ? `${lang !== "de" ? " · " : ""}${tx(m.note)}` : ""}
                            </div>
                          )}
                        </td>
                        <td className={td}>{tx(m.spec)}</td>
                        <td className={cx(td, mono, "text-right whitespace-nowrap")}>
                          {m.quantity.toFixed(m.unit === "pcs" ? 0 : 2)} {t(m.unit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "cutlist" && (
          <div>
            <div className="flex gap-2 border-b border-slate-800 p-2">
              <Button
                size="sm"
                icon={Download}
                onClick={() => exportCutListCsv(project, cutList)}
              >
                CSV
              </Button>
              <Button
                size="sm"
                icon={FileText}
                onClick={() =>
                  void exportCutListPdf(
                    project,
                    cutList,
                    bom,
                    statics,
                    connections,
                  )
                }
              >
                PDF
              </Button>
              <span className="ml-auto self-center text-[11px] text-slate-500">
                {t("{n} positions · {pieces} pieces", {
                  n: cutList.length,
                  pieces: cutList.reduce((s, c) => s + c.quantity, 0),
                })}
              </span>
            </div>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-950">
                <tr>
                  <th className={th}>#</th>
                  <th className={th}>{t("Piece")}</th>
                  <th className={th}>{t("Section")}</th>
                  <th className={cx(th, "text-right")}>{t("Length")}</th>
                  <th className={cx(th, "text-right")}>{t("Cuts")}</th>
                  <th className={cx(th, "text-right")}>{t("Qty")}</th>
                </tr>
              </thead>
              <tbody>
                {cutList.map((c) => (
                  <tr
                    key={c.pos}
                    className="border-t border-slate-800/80 hover:bg-slate-900/60"
                  >
                    <td className={cx(td, mono, "text-slate-500")}>{c.pos}</td>
                    <td className={td}>
                      <div>{lang === "de" ? c.nameDe : tx(c.name)}</div>
                      {(lang !== "de" || c.notes) && (
                        <div className="text-[10px] text-slate-500">
                          {lang !== "de" ? c.nameDe : ""}
                          {c.notes ? `${lang !== "de" ? " · " : ""}${tx(c.notes)}` : ""}
                        </div>
                      )}
                    </td>
                    <td className={cx(td, mono)}>
                      {c.section.width}×{c.section.height}
                    </td>
                    <td className={cx(td, mono, "text-right")}>{c.length}</td>
                    <td className={cx(td, mono, "text-right")}>
                      {c.cuts.start === 0 && c.cuts.end === 0
                        ? "90°"
                        : `${c.cuts.start}° / ${c.cuts.end}°`}
                    </td>
                    <td className={cx(td, mono, "text-right font-semibold")}>
                      {c.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "hardware" && (
          <div>
            <div className="border-b border-slate-800 p-2 text-[11px] text-slate-400">
              {t("Mode:")}{" "}
              <span className="text-slate-200">
                {connections.mode === "hardware"
                  ? t("mechanical connectors")
                  : t("traditional joinery")}
              </span>{" "}
              {t("· change under “Loads & connections”.")}
            </div>
            {connections.joinery.length > 0 && (
              <>
                <h3 className="px-2 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-timber-200 uppercase">
                  {t("Timber joints")}
                  {lang !== "de" && " (Holzverbindungen)"}
                </h3>
                <table className="w-full border-collapse">
                  <tbody>
                    {connections.joinery.map((j) => (
                      <tr key={j.id} className="border-t border-slate-800/80">
                        <td className={td}>
                          <div>{lang === "de" ? j.nameDe : tx(j.name)}</div>
                          {(lang !== "de" || j.note) && (
                            <div className="text-[10px] text-slate-500">
                              {lang !== "de" ? j.nameDe : ""}
                              {j.note ? `${lang !== "de" ? " · " : ""}${tx(j.note)}` : ""}
                            </div>
                          )}
                        </td>
                        <td
                          className={cx(td, mono, "text-right font-semibold")}
                        >
                          {j.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <h3 className="px-2 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-timber-200 uppercase">
              {t("Hardware & fixings")}
            </h3>
            <table className="w-full border-collapse">
              <tbody>
                {connections.hardware.map((h) => (
                  <tr key={h.id} className="border-t border-slate-800/80">
                    <td className={td}>
                      <div>{lang === "de" ? h.nameDe : tx(h.name)}</div>
                      <div className="text-[10px] text-slate-500">
                        {lang !== "de" ? `${h.nameDe} · ` : ""}
                        {tx(h.spec)}
                        {h.note ? ` · ${tx(h.note)}` : ""}
                      </div>
                    </td>
                    <td
                      className={cx(
                        td,
                        mono,
                        "text-right font-semibold whitespace-nowrap",
                      )}
                    >
                      {h.quantity} {h.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "pricing" && <PricingPanel model={model} />}

        {tab === "statics" && (
          <div className="space-y-2 p-2">
            <div
              className={cx(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold",
                STATUS_BG[statics.status],
                STATUS_TEXT[statics.status],
              )}
            >
              <span className="flex-1">
                {t("Overall: {status}", { status: t(STATUS_LABEL[statics.status]) })}
              </span>
              {statics.status !== "ok" && (
                <Button
                  size="sm"
                  variant="primary"
                  icon={Wand2}
                  onClick={runAutoFix}
                  title={t("Step up sections / add posts until every check passes")}
                >
                  {t("Auto-fix all")}
                </Button>
              )}
              {statics.status === "ok" && (
                <Button
                  size="sm"
                  icon={BadgeEuro}
                  onClick={runCostOptimization}
                  disabled={!costOptimizationAvailable}
                  title={t("Reduce timber sections while keeping every statics check sufficient")}
                >
                  {t("Cost optimization")}
                </Button>
              )}
            </div>
            {autoFixReport && (
              <div
                className={cx(
                  "rounded-md border p-2 text-[11px]",
                  autoFixReport.status === "ok"
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-amber-500/40 bg-amber-500/10",
                )}
              >
                <div className="flex items-center gap-2">
                  {autoFixReport.action === "cost-optimization" ? (
                    <BadgeEuro className="h-3.5 w-3.5 text-slate-300" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5 text-slate-300" />
                  )}
                  <span className="flex-1 font-medium text-slate-100">
                    {autoFixReport.action === "cost-optimization"
                      ? autoFixReport.changes.length === 0
                        ? t("Cost optimization: no smaller sections pass all checks.")
                        : t(
                            autoFixReport.changes.length === 1
                              ? "Cost optimization applied {n} change – all checks pass."
                              : "Cost optimization applied {n} changes – all checks pass.",
                            { n: autoFixReport.changes.length },
                          )
                      : autoFixReport.changes.length === 0
                        ? t("Auto-fix: nothing to change.")
                        : autoFixReport.status === "ok"
                          ? t(
                              autoFixReport.changes.length === 1
                                ? "Auto-fix applied {n} change – all checks pass."
                                : "Auto-fix applied {n} changes – all checks pass.",
                              { n: autoFixReport.changes.length },
                            )
                          : t(
                              autoFixReport.changes.length === 1
                                ? "Auto-fix applied {n} change – some checks still need attention."
                                : "Auto-fix applied {n} changes – some checks still need attention.",
                              { n: autoFixReport.changes.length },
                            )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAutoFixReport(null)}
                    className="text-slate-400 hover:text-white"
                    title={t("Dismiss")}
                    aria-label={t("Dismiss statics report")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {autoFixReport.changes.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-slate-300">
                    {autoFixReport.changes.map((c) => (
                      <li key={c.label} className="flex gap-2">
                        <span className="w-36 shrink-0 text-slate-400">
                          {tx(c.label)}
                        </span>
                        <span className="font-mono">
                          {c.before} → {c.after}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {autoFixReport.unresolved.length > 0 && (
                  <p className="mt-1 text-amber-200">
                    {t("Still not ok: {list} – reduce spans, openings or loads manually.", {
                      list: autoFixReport.unresolved.map((u) => tx(u)).join(", "),
                    })}
                  </p>
                )}
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              {t(
                "Simplified EN 1995-1-1 pre-design: bending, shear, deflection (w_inst ≤ L/300, w_fin ≤ L/200), post buckling with the actual bracing system, knee braces / boarded walls / sway posts under wind, and roof uplift. k_mod {kmodSnow} (snow) / {kmodWind} (wind), k_def {kdef}, γ_G 1.35 / γ_Q 1.5, ψ₀ snow 0.5 / wind 0.6. Wind q_p {qp} kN/m² (≈ {gust} m/s gust).",
                {
                  kmodSnow: statics.loads.kmod,
                  kmodWind: statics.loads.kmod < 0.75 ? 0.7 : 0.9,
                  kdef: statics.loads.kdef,
                  qp: statics.loads.windPressure.toFixed(2),
                  gust: Math.round(statics.loads.gustSpeed),
                },
              )}{" "}
              {statics.collapseGustSpeed !== undefined
                ? t("First failure at ≈ {speed} m/s ({kmh} km/h): {element}.", {
                    speed: Math.round(statics.collapseGustSpeed),
                    kmh: Math.round(statics.collapseGustSpeed * 3.6),
                    element: tx(statics.collapseElement ?? ""),
                  })
                : t("Gravity checks already exceed 100 % – no wind margin.")}{" "}
              {t("Connections, foundations and fire are not verified – have a structural engineer confirm the design.")}
            </p>
            {statics.checks.map((c) => (
              <div
                key={c.id}
                className={cx("rounded-md border p-2", STATUS_BG[c.status])}
              >
                <div className="flex items-center gap-2">
                  <StatusDot status={c.status} />
                  <span className="text-sm font-medium text-slate-100">
                    {lang === "de" ? c.elementDe : tx(c.element)}{" "}
                    {lang !== "de" && (
                      <span className="text-slate-400">· {c.elementDe}</span>
                    )}
                  </span>
                  <span
                    className={cx(
                      "ml-auto font-mono text-sm font-semibold",
                      STATUS_TEXT[c.status],
                    )}
                  >
                    {Math.round(c.utilisation * 100)} %
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-4 gap-1 text-[11px]">
                  <Stat
                    label={t("Section")}
                    value={`${c.section.width}×${c.section.height}`}
                  />
                  <Stat label={t("Span")} value={`${c.span} mm`} />
                  <Stat
                    label={t("Stress")}
                    value={`${Math.round(c.stressUtil * 100)} %`}
                  />
                  <Stat
                    label={t("Deflection")}
                    value={
                      c.deflectionLimit
                        ? `${c.deflection.toFixed(1)} / ${c.deflectionLimit.toFixed(0)}`
                        : "–"
                    }
                  />
                </div>
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  {tx(c.detail)}
                </p>
                {c.recommendation && (
                  <p className="mt-1 text-[11px] font-medium text-amber-200">
                    → {tx(c.recommendation)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "warnings" && (
          <div className="space-y-1.5 p-2">
            {framing.warnings.length === 0 && (
              <p className="text-xs text-emerald-300">
                {t("No geometry or framing issues detected.")}
              </p>
            )}
            {vehicles.length > 0 && (
              <h3 className="pt-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                {t("Vehicles")}
              </h3>
            )}
            {vehicles.map((f) => {
              const vehicle = project.vehicles.find(
                (v) => v.id === f.vehicleId,
              );
              const color =
                f.status === "fail"
                  ? "text-rose-300 border-rose-500/40"
                  : f.status === "warning"
                    ? "text-amber-300 border-amber-500/40"
                    : "text-emerald-300 border-emerald-500/30";
              return (
                <div
                  key={f.vehicleId}
                  className={cx(
                    "flex items-start gap-2 rounded-md border bg-slate-900/60 p-2 text-xs",
                    color,
                  )}
                >
                  <Car className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="text-slate-200">
                    <span className="font-medium">
                      {vehicle
                        ? tx(resolveVehicleModel(vehicle).name)
                        : f.vehicleId}
                    </span>
                    : {f.messages.map((m) => tx(m)).join(" ")}
                  </span>
                </div>
              );
            })}
            {framing.warnings.map((w, i) => {
              const Icon =
                w.level === "error"
                  ? ShieldAlert
                  : w.level === "warning"
                    ? AlertTriangle
                    : Info;
              const color =
                w.level === "error"
                  ? "text-rose-300 border-rose-500/40"
                  : w.level === "warning"
                    ? "text-amber-300 border-amber-500/40"
                    : "text-sky-300 border-sky-500/30";
              return (
                <div
                  key={i}
                  className={cx(
                    "flex items-start gap-2 rounded-md border bg-slate-900/60 p-2 text-xs",
                    color,
                  )}
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="text-slate-200">{tx(w.message)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/60 px-1.5 py-1">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="font-mono text-slate-200">{value}</div>
    </div>
  );
}
