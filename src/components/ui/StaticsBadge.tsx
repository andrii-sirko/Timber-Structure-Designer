import { AlertTriangle, BadgeEuro, CheckCircle2, ShieldAlert, Wand2 } from "lucide-react";
import type { StaticsResult } from "@/types";
import { useUiStore } from "@/store/uiStore";
import {
  IconButton,
  STATUS_BG,
  STATUS_LABEL,
  STATUS_TEXT,
  cx,
} from "./primitives";
import { useAutoFixStatics } from "./useAutoFixStatics";
import { useCostOptimizationStatics } from "./useCostOptimizationStatics";

export function StaticsBadge({ statics }: { statics: StaticsResult }) {
  const openResults = useUiStore((s) => s.openResults);
  const runAutoFix = useAutoFixStatics();
  const { run: runCostOptimization, available: costOptimizationAvailable } = useCostOptimizationStatics();
  const worst = statics.checks.reduce(
    (m, c) => (c.utilisation > m.utilisation ? c : m),
    statics.checks[0],
  );
  const Icon =
    statics.status === "ok"
      ? CheckCircle2
      : statics.status === "warning"
        ? AlertTriangle
        : ShieldAlert;
  return (
    <div className="flex items-stretch gap-1.5">
      <button
        type="button"
        onClick={() => openResults("statics")}
        className={cx(
          "flex min-w-0 flex-1 items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:brightness-110",
          STATUS_BG[statics.status],
        )}
        title="Open statics details"
      >
        <Icon className={cx("h-5 w-5 shrink-0", STATUS_TEXT[statics.status])} />
        <span className="min-w-0 flex-1">
          <span
            className={cx(
              "block text-sm font-semibold",
              STATUS_TEXT[statics.status],
            )}
          >
            Statics: {STATUS_LABEL[statics.status]}
          </span>
          {worst && (
            <span className="block truncate text-[11px] text-slate-300">
              {worst.element} {Math.round(worst.utilisation * 100)} % ·{" "}
              {worst.section.width}×{worst.section.height} mm
            </span>
          )}
        </span>
      </button>
      {statics.status !== "ok" && (
        <IconButton
          icon={Wand2}
          title="Auto-fix all statics issues"
          onClick={runAutoFix}
          className="h-auto w-9 shrink-0 border-sky-500/60 text-sky-200 hover:bg-sky-500/20"
        />
      )}
      {statics.status === "ok" && (
        <IconButton
          icon={BadgeEuro}
          title={costOptimizationAvailable ? "Cost optimization" : "No smaller standard section passes statics"}
          onClick={runCostOptimization}
          disabled={!costOptimizationAvailable}
          className="h-auto w-9 shrink-0 border-emerald-500/60 text-emerald-200 hover:bg-emerald-500/20"
        />
      )}
    </div>
  );
}
