"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Comparison } from "@/lib/energy/types";
import { formatSignedOrNA, formatPercentOrNA, formatSignedTooltip } from "@/lib/format/numbers";
import { ChartWithTextAlt } from "@/components/charts/ChartWithTextAlt";

const CATEGORY_COLORS: Record<string, string> = {
  Cooling: "var(--chart-series-1)",
  Heating: "var(--chart-series-2)",
  "Hot water": "var(--chart-series-3)",
  "Other (derived)": "var(--chart-series-4)",
};

// Sign is encoded by bar direction relative to the zero baseline, not by
// color — color here only carries end-use identity (handoff section 9:
// "positive and negative values visually distinct without relying only on
// color"). Cooling's share of the NET change (not of total usage) is
// called out separately with its precise label.
export function EndUseChangeChart({ comparison }: { comparison: Comparison }) {
  const rows = [
    { category: "Cooling", value: comparison.cooling_change_kwh },
    { category: "Heating", value: comparison.heating_change_kwh },
    { category: "Hot water", value: comparison.hot_water_change_kwh },
    { category: "Other (derived)", value: comparison.other_electricity_change_kwh },
  ];
  const chartRows = rows.map((r) => ({ category: r.category, value: r.value ?? 0 }));

  return (
    <div>
      <ChartWithTextAlt
        title="Change by end use vs previous month (kWh)"
        chart={
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 24, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-gridline)" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: "var(--chart-muted)" }}
                  axisLine={{ stroke: "var(--chart-baseline)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--chart-muted)" }}
                  axisLine={{ stroke: "var(--chart-baseline)" }}
                  tickLine={false}
                  width={56}
                  label={{ value: "kWh", angle: -90, position: "insideLeft", fill: "var(--chart-muted)", fontSize: 11 }}
                />
                <ReferenceLine y={0} stroke="var(--chart-baseline)" />
                <Tooltip formatter={(value: unknown) => formatSignedTooltip(value)} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Bar dataKey="value" radius={[3, 3, 3, 3]} maxBarSize={48}>
                  {chartRows.map((row) => (
                    <Cell key={row.category} fill={CATEGORY_COLORS[row.category]} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(value: unknown) => formatSignedOrNA(typeof value === "number" ? value : Number(value), 1)}
                    style={{ fontSize: 11, fill: "var(--chart-text-secondary)" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        }
        table={
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Change by end use versus previous month, in kilowatt-hours</caption>
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th scope="col" className="py-1 pr-4 font-medium">End use</th>
                <th scope="col" className="py-1 font-medium">Change (kWh)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.category} className="border-b border-slate-100">
                  <td className="py-1 pr-4">{row.category}</td>
                  <td className="py-1">{formatSignedOrNA(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      />
      <p className="mt-3 text-sm text-slate-700">
        <span className="font-medium">Cooling share of net usage change:</span>{" "}
        {formatPercentOrNA(comparison.cooling_share_of_net_change_pct)}
      </p>
    </div>
  );
}
