import type { Account } from "@/lib/energy/types";
import { formatKwh, formatKw } from "@/lib/format/units";

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function SummaryCards({ account }: { account: Account }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card label="Annual electricity" value={formatKwh(account.annual_electricity_kwh)} />
      <Card label="Average daily usage" value={formatKwh(account.average_daily_kwh)} />
      <Card label="Peak 15-min demand" value={formatKw(account.peak_15min_average_kw)} />
      <Card label="Days of coverage" value={`${account.days_present}`} />
    </div>
  );
}
