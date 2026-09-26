// Verbatim contract types from Claude_Energy_Frontend_Handoff.md section 6.
// This file is the single source of truth for the shape of data exchanged
// with the Databricks energy-customer-insights serving endpoint.

export type EnergyRequest =
  | { operation: "list_accounts" }
  | { operation: "account_details"; account_id: string }
  | {
      operation: "investigate_usage" | "explain_usage";
      account_id: string;
      month: string; // validated YYYY-MM
    };

export interface Metadata {
  created_at_utc: string;
  dataset: string;
  data_type: string;
  weather_alignment_verified: boolean;
  weather_alignment_method: string;
  degree_day_base_f: number;
}

export interface Account {
  building_id: number;
  account_id: string;
  state: string | null;
  county_code: string | null;
  building_type: string | null;
  floor_area_sqft: number | null;
  construction_vintage: string | null;
  heating_fuel: string | null;
  heating_system: string | null;
  cooling_system: string | null;
  days_present: number;
  annual_electricity_kwh: number;
  average_daily_kwh: number;
  peak_15min_average_kw: number;
  data_description: string;
}

export interface DailyUsage {
  building_id: number;
  usage_date: string;
  hours_present: number;
  electricity_kwh: number;
  net_electricity_kwh: number;
  cooling_system_kwh: number;
  heating_system_kwh: number;
  hot_water_kwh: number;
  peak_15min_average_kw: number;
}

export interface MonthlyUsage {
  building_id: number;
  usage_month: string;
  days_present: number;
  electricity_kwh: number;
  average_daily_kwh: number;
  net_electricity_kwh: number;
  cooling_system_kwh: number;
  heating_system_kwh: number;
  hot_water_kwh: number;
  peak_15min_average_kw: number;
}

export interface Comparison {
  building_id: number;
  usage_month: string;
  previous_month: string | null;
  electricity_kwh: number;
  previous_electricity_kwh: number | null;
  electricity_change_kwh: number | null;
  average_daily_kwh: number;
  previous_average_daily_kwh: number | null;
  daily_usage_change_pct: number | null;
  cooling_change_kwh: number | null;
  heating_change_kwh: number | null;
  hot_water_change_kwh: number | null;
  other_electricity_change_kwh: number | null;
  cooling_share_of_net_change_pct: number | null;
  // v3 weather-context fields. Nullability for previous/change fields
  // follows the pre-existing pattern above (current-period non-null,
  // previous/change nullable) — confirmed live for the no-comparison case
  // (January) after a backend regression there was fixed.
  state: string | null;
  county_code: string | null;
  weather_city: string | null;
  average_temperature_f: number;
  previous_average_temperature_f: number | null;
  average_temperature_change_f: number | null;
  cooling_degree_days_65: number;
  previous_cooling_degree_days_65: number | null;
  cooling_degree_days_change_65: number | null;
  heating_degree_days_65: number;
  previous_heating_degree_days_65: number | null;
  heating_degree_days_change_65: number | null;
}

export interface Explanation {
  text: string;
  source: "ai" | "fallback" | "no_comparison";
  model: string | null;
}

export interface InvestigationData {
  account_id: string;
  comparison_available: boolean;
  comparison: Comparison;
  explanation_scope: string;
}

type Result<O extends string, D> = {
  operation: O;
  metadata: Metadata;
  data: D;
};

export type EnergyResult =
  | Result<"list_accounts", { accounts: Account[] }>
  | Result<
      "account_details",
      {
        account: Account;
        daily_usage: DailyUsage[];
        monthly_usage: MonthlyUsage[];
      }
    >
  | Result<"investigate_usage", InvestigationData>
  | Result<
      "explain_usage",
      InvestigationData & {
        explanation: Explanation;
      }
    >;

export type EnergyResponse =
  | { ok: true; result: EnergyResult }
  | { ok: false; error: { code: string; message: string } };

export interface DatabricksEnvelope {
  predictions: Array<{ response_json: string }>;
}

export type EnergyOperation = EnergyRequest["operation"];
