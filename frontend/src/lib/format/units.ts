// kWh is energy; kW is demand. Keep these visually and axis-separated —
// never plot both on the same chart/axis, and never call peak_15min_average_kw
// a "billable demand charge."

export const ENERGY_UNIT = "kWh";
export const DEMAND_UNIT = "kW";

export function formatKwh(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return "Not available";
  }
  return `${value.toFixed(decimals)} ${ENERGY_UNIT}`;
}

export function formatKw(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return "Not available";
  }
  return `${value.toFixed(decimals)} ${DEMAND_UNIT}`;
}

// Chart-library tooltip/label callbacks (Recharts) pass loosely-typed
// values (string | number | array | undefined) rather than `number`.
export function formatKwhTooltip(value: unknown): string {
  return formatKwh(typeof value === "number" ? value : Number(value));
}
