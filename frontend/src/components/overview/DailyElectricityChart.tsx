"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyUsage } from "@/lib/energy/types";
import { dateKey, monthKey, formatMonthLabel } from "@/lib/energy/dates";
import { formatKwh, formatKwhTooltip } from "@/lib/format/units";
import { ChartWithTextAlt } from "@/components/charts/ChartWithTextAlt";

export function DailyElectricityChart({ dailyUsage }: { dailyUsage: DailyUsage[] }) {
  const months = useMemo(() => {
    const keys = new Set(dailyUsage.map((d) => monthKey(d.usage_date)));
    return [...keys].sort();
  }, [dailyUsage]);

  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const rows = useMemo(() => {
    const filtered =
      selectedMonth === "all" ? dailyUsage : dailyUsage.filter((d) => monthKey(d.usage_date) === selectedMonth);
    return [...filtered]
      .sort((a, b) => dateKey(a.usage_date).localeCompare(dateKey(b.usage_date)))
      .map((d) => ({ date: dateKey(d.usage_date), electricity_kwh: d.electricity_kwh }));
  }, [dailyUsage, selectedMonth]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium text-slate-700">Daily electricity usage (kWh)</h3>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <span>Filter</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ChartWithTextAlt
        title=""
        chart={
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-gridline)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--chart-muted)" }}
                  axisLine={{ stroke: "var(--chart-baseline)" }}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--chart-muted)" }}
                  axisLine={{ stroke: "var(--chart-baseline)" }}
                  tickLine={false}
                  width={56}
                  label={{ value: "kWh", angle: -90, position: "insideLeft", fill: "var(--chart-muted)", fontSize: 11 }}
                />
                <Tooltip formatter={formatKwhTooltip} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                <Line
                  type="monotone"
                  dataKey="electricity_kwh"
                  stroke="var(--chart-series-1)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        }
        table={
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Daily electricity usage in kilowatt-hours</caption>
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th scope="col" className="py-1 pr-4 font-medium">Date</th>
                <th scope="col" className="py-1 font-medium">Electricity (kWh)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date} className="border-b border-slate-100">
                  <td className="py-1 pr-4">{row.date}</td>
                  <td className="py-1">{formatKwh(row.electricity_kwh)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      />
    </div>
  );
}
