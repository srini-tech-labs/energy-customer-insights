// Null means "Not available" and must never be rendered as zero. A real
// zero renders as "0.00". Negative zero (e.g. from a change computation
// that rounds to -0) is normalized to positive zero for display.

export function normalizeNegativeZero(value: number): number {
  return value === 0 ? 0 : value;
}

export function formatNumberOrNA(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return "Not available";
  }
  return normalizeNegativeZero(value).toFixed(decimals);
}

// Formats a signed change with an explicit +/- sign, since color alone
// must not be the only way positive/negative is distinguished.
export function formatSignedOrNA(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return "Not available";
  }
  const normalized = normalizeNegativeZero(value);
  const sign = normalized > 0 ? "+" : normalized < 0 ? "−" : "";
  return `${sign}${Math.abs(normalized).toFixed(decimals)}`;
}

export function formatPercentOrNA(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    return "Not available";
  }
  const normalized = normalizeNegativeZero(value);
  const sign = normalized > 0 ? "+" : normalized < 0 ? "−" : "";
  return `${sign}${Math.abs(normalized).toFixed(decimals)}%`;
}

// Chart-library tooltip/label callbacks (Recharts) pass loosely-typed
// values (string | number | array | undefined) rather than `number`.
export function formatSignedTooltip(value: unknown, decimals = 2): string {
  return `${formatSignedOrNA(typeof value === "number" ? value : Number(value), decimals)} kWh`;
}
