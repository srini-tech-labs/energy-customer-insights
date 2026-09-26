import type { Comparison } from "@/lib/energy/types";
import { formatFahrenheit, formatSignedFahrenheit, formatDegreeDays, formatSignedDegreeDays } from "@/lib/format/weather";

function Card({
  label,
  labelTitle,
  value,
  previous,
  change,
}: {
  label: string;
  labelTitle?: string;
  value: string;
  previous: string;
  change: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500" title={labelTitle}>
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">Previous: {previous}</p>
      <p className="text-xs text-slate-500">Change: {change}</p>
    </div>
  );
}

// Purely factual weather context — current/previous/change tiles only. Any
// language connecting weather to usage ("consistent with increased cooling
// demand") comes from the backend-generated AI explanation in
// ExplanationPanel, never generated here (handoff: weather is contextual/
// correlational evidence, not a frontend-asserted cause).
export function WeatherContext({
  comparison,
  degreeDayBaseF,
}: {
  comparison: Comparison;
  degreeDayBaseF: number;
}) {
  const locationParts = [comparison.weather_city, comparison.state].filter(
    (part): part is string => Boolean(part)
  );

  return (
    <div>
      <h3 className="text-sm font-medium text-slate-700">Weather Context</h3>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card
          label="Average temperature"
          value={formatFahrenheit(comparison.average_temperature_f)}
          previous={formatFahrenheit(comparison.previous_average_temperature_f)}
          change={formatSignedFahrenheit(comparison.average_temperature_change_f)}
        />
        <Card
          label={`Cooling degree days (base ${degreeDayBaseF}°F)`}
          labelTitle="Cooling degree days measure how much daily temperatures were above the base and indicate potential cooling demand."
          value={formatDegreeDays(comparison.cooling_degree_days_65)}
          previous={formatDegreeDays(comparison.previous_cooling_degree_days_65)}
          change={formatSignedDegreeDays(comparison.cooling_degree_days_change_65)}
        />
        <Card
          label={`Heating degree days (base ${degreeDayBaseF}°F)`}
          labelTitle="Heating degree days measure how much daily temperatures were below the base and indicate potential heating demand."
          value={formatDegreeDays(comparison.heating_degree_days_65)}
          previous={formatDegreeDays(comparison.previous_heating_degree_days_65)}
          change={formatSignedDegreeDays(comparison.heating_degree_days_change_65)}
        />
      </div>
      {locationParts.length > 0 ? (
        <p className="mt-2 text-xs text-slate-500">Weather station: {locationParts.join(", ")}</p>
      ) : null}
    </div>
  );
}
