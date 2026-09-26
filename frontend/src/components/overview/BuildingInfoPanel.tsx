import type { Account } from "@/lib/energy/types";

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value === null || value === "" ? "Not available" : value}</dd>
    </div>
  );
}

export function BuildingInfoPanel({ account }: { account: Account }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-medium text-slate-700">Building information</h3>
      <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Building type" value={account.building_type} />
        <Field label="Floor area" value={account.floor_area_sqft ? `${account.floor_area_sqft} sq ft` : null} />
        <Field label="Construction vintage" value={account.construction_vintage} />
        <Field label="Heating fuel" value={account.heating_fuel} />
        <Field label="Heating system" value={account.heating_system} />
        <Field label="Cooling system" value={account.cooling_system} />
        <Field label="State" value={account.state} />
        {/* County code is a raw source identifier, not a county name — do not translate it. */}
        <Field label="County code" value={account.county_code} />
      </dl>
    </div>
  );
}
