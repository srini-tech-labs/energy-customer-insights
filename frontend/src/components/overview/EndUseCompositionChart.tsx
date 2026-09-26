"use client";

import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyUsage } from "@/lib/energy/types";
import { monthKey, formatMonthLabel } from "@/lib/energy/dates";
import { formatKwh, formatKwhTooltip } from "@/lib/format/units";
import { normalizeNegativeZero } from "@/lib/format/numbers";
import { ChartWithTextAlt } from "@/components/charts/ChartWithTextAlt";

// "Other" is a derived residual (total - cooling - heating - hot water),
// not an anomaly signal. Using a grouped (not stacked) bar chart lets a
// materially negative residual extend naturally below the zero baseline
// instead of breaking a stacked total (handoff section 8).
const RESIDUAL_EPSILON = 0.01;

export function EndUseCompositionChart({ monthlyUsage }: { monthlyUsage: MonthlyUsage[] }) {
  const rows = [...monthlyUsage]
    .sort((a, b) => monthKey(a.usage_month).localeCompare(monthKey(b.usage_month)))
    .map((m) => {
      const other = m.electricity_kwh - m.cooling_system_kwh - m.heating_system_kwh - m.hot_water_kwh;
      return {
        month: formatMonthLabel(monthKey(m.usage_month)),
        cooling: normalizeNegativeZero(m.cooling_system_kwh),
        heating: normalizeNegativeZero(m.heating_system_kwh),
        hot_water: normalizeNegativeZero(m.hot_water_kwh),
        other: normalizeNegativeZero(Math.abs(other) < RESIDUAL_EPSILON ? 0 : other),
      };
    });

  return (
    <ChartWithTextAlt
      title="Monthly end-use composition (kWh)"
      chart={
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-gridline)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--chart-muted)" }}
                axisLine={{ stroke: "var(--chart-baseline)" }}
                tickLine={false}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={64}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--chart-muted)" }}
                axisLine={{ stroke: "var(--chart-baseline)" }}
                tickLine={false}
                width={56}
                label={{ value: "kWh", angle: -90, position: "insideLeft", fill: "var(--chart-muted)", fontSize: 11 }}
              />
              <ReferenceLine y={0} stroke="var(--chart-baseline)" />
              <Tooltip formatter={formatKwhTooltip} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} height={32} />
              <Bar dataKey="cooling" name="Cooling" fill="var(--chart-series-1)" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="heating" name="Heating" fill="var(--chart-series-2)" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="hot_water" name="Hot water" fill="var(--chart-series-3)" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="other" name="Other (derived)" fill="var(--chart-series-4)" radius={[3, 3, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      }
      table={
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Monthly end-use composition in kilowatt-hours</caption>
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th scope="col" className="py-1 pr-4 font-medium">Month</th>
              <th scope="col" className="py-1 pr-4 font-medium">Cooling</th>
              <th scope="col" className="py-1 pr-4 font-medium">Heating</th>
              <th scope="col" className="py-1 pr-4 font-medium">Hot water</th>
              <th scope="col" className="py-1 font-medium">Other (derived)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="border-b border-slate-100">
                <td className="py-1 pr-4">{row.month}</td>
                <td className="py-1 pr-4">{formatKwh(row.cooling)}</td>
                <td className="py-1 pr-4">{formatKwh(row.heating)}</td>
                <td className="py-1 pr-4">{formatKwh(row.hot_water)}</td>
                <td className="py-1">{formatKwh(row.other)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  );
}
