import type { Comparison } from "@/lib/energy/types";
import { formatKwh } from "@/lib/format/units";
import { formatSignedOrNA, formatPercentOrNA } from "@/lib/format/numbers";

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export function MonthComparisonCards({ comparison }: { comparison: Comparison }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card
        label="Monthly electricity"
        value={formatKwh(comparison.electricity_kwh)}
        sub={
          comparison.previous_electricity_kwh !== null
            ? `Previous: ${formatKwh(comparison.previous_electricity_kwh)}`
            : "Previous: Not available"
        }
      />
      <Card label="Change vs previous month" value={`${formatSignedOrNA(comparison.electricity_change_kwh)} kWh`} />
      <Card
        label="Average daily usage"
        value={formatKwh(comparison.average_daily_kwh)}
        sub={
          comparison.previous_average_daily_kwh !== null
            ? `Previous: ${formatKwh(comparison.previous_average_daily_kwh)}`
            : "Previous: Not available"
        }
      />
      <Card label="Daily average change" value={formatPercentOrNA(comparison.daily_usage_change_pct)} />
    </div>
  );
}
