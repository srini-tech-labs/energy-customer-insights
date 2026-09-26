"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyUsage } from "@/lib/energy/types";
import { monthKey, formatMonthLabel } from "@/lib/energy/dates";
import { formatKwh, formatKwhTooltip } from "@/lib/format/units";
import { ChartWithTextAlt } from "@/components/charts/ChartWithTextAlt";

export function MonthlyElectricityChart({ monthlyUsage }: { monthlyUsage: MonthlyUsage[] }) {
  const rows = [...monthlyUsage]
    .sort((a, b) => monthKey(a.usage_month).localeCompare(monthKey(b.usage_month)))
    .map((m) => ({
      month: formatMonthLabel(monthKey(m.usage_month)),
      electricity_kwh: m.electricity_kwh,
    }));

  return (
    <ChartWithTextAlt
      title="Monthly electricity usage (kWh)"
      chart={
        <div className="h-64 w-full">
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
                height={56}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--chart-muted)" }}
                axisLine={{ stroke: "var(--chart-baseline)" }}
                tickLine={false}
                width={56}
                label={{ value: "kWh", angle: -90, position: "insideLeft", fill: "var(--chart-muted)", fontSize: 11 }}
              />
              <Tooltip formatter={formatKwhTooltip} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
              <Bar dataKey="electricity_kwh" fill="var(--chart-series-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      }
      table={
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Monthly electricity usage in kilowatt-hours</caption>
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th scope="col" className="py-1 pr-4 font-medium">Month</th>
              <th scope="col" className="py-1 font-medium">Electricity (kWh)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="border-b border-slate-100">
                <td className="py-1 pr-4">{row.month}</td>
                <td className="py-1">{formatKwh(row.electricity_kwh)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  );
}
