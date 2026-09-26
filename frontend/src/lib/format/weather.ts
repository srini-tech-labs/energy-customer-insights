// Weather figures are displayed at 1 decimal place per the v3 handoff,
// coarser than this app's 2-decimal convention for kWh/%. Kept isolated
// here rather than changing numbers.ts's defaults so existing energy call
// sites are unaffected.
import { formatNumberOrNA, formatSignedOrNA } from "./numbers";

export const TEMPERATURE_UNIT = "°F";

export function formatFahrenheit(value: number | null | undefined, decimals = 1): string {
  const formatted = formatNumberOrNA(value, decimals);
  return formatted === "Not available" ? formatted : `${formatted} ${TEMPERATURE_UNIT}`;
}

export function formatSignedFahrenheit(value: number | null | undefined, decimals = 1): string {
  const formatted = formatSignedOrNA(value, decimals);
  return formatted === "Not available" ? formatted : `${formatted} ${TEMPERATURE_UNIT}`;
}

// Degree days are dimensionless by convention here, so no unit suffix.
export function formatDegreeDays(value: number | null | undefined, decimals = 1): string {
  return formatNumberOrNA(value, decimals);
}

export function formatSignedDegreeDays(value: number | null | undefined, decimals = 1): string {
  return formatSignedOrNA(value, decimals);
}
