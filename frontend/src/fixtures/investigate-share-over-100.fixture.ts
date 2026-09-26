import type { EnergyResult } from "@/lib/energy/types";

type InvestigateResult = Extract<EnergyResult, { operation: "investigate_usage" }>;

const BASE_METADATA = {
  created_at_utc: "2026-09-18T01:39:55.726466+00:00",
  dataset: "ResStock 2022 release, AMY2018 baseline",
  data_type: "Modeled building profiles",
  weather_alignment_verified: true,
  weather_alignment_method:
    "County weather series matched to consumption using county_code and exact hour-ending timestamps",
  degree_day_base_f: 65.0,
};

// cooling_share_of_net_change_pct is cooling's share of the NET change, not
// of total usage — it can legitimately exceed 100% when other end uses
// partially offset cooling's swing. The UI must never clamp this or plot
// it as a pie chart (handoff section 8).
export const investigateShareOver100Fixture: InvestigateResult = {
  operation: "investigate_usage",
  metadata: BASE_METADATA,
  data: {
    account_id: "DEMO-100066",
    comparison_available: true,
    comparison: {
      building_id: 100066,
      state: "AL",
      county_code: "G0101270",
      weather_city: "Fort Benning",
      usage_month: "2018-07-01T00:00:00.000",
      previous_month: "2018-06-01T00:00:00.000",
      electricity_kwh: 610.0,
      previous_electricity_kwh: 600.0,
      electricity_change_kwh: 10.0,
      average_daily_kwh: 19.6774193548,
      previous_average_daily_kwh: 20.0,
      daily_usage_change_pct: -1.6129032258,
      cooling_change_kwh: 14.5,
      heating_change_kwh: 0.0,
      hot_water_change_kwh: -1.2,
      other_electricity_change_kwh: -3.3,
      cooling_share_of_net_change_pct: 145.0,
      average_temperature_f: 82.0,
      previous_average_temperature_f: 80.5,
      average_temperature_change_f: 1.5,
      cooling_degree_days_65: 527.0,
      previous_cooling_degree_days_65: 480.0,
      cooling_degree_days_change_65: 47.0,
      heating_degree_days_65: 0.0,
      previous_heating_degree_days_65: 0.0,
      heating_degree_days_change_65: 0.0,
    },
    explanation_scope:
      "Changes in modeled electricity end uses. Weather attribution and bill calculations are not included.",
  },
};

// Cooling's change can also go the opposite direction from the net change,
// producing a negative share — also never clamped.
export const investigateShareNegativeFixture: InvestigateResult = {
  operation: "investigate_usage",
  metadata: BASE_METADATA,
  data: {
    account_id: "DEMO-100066",
    comparison_available: true,
    comparison: {
      building_id: 100066,
      state: "AL",
      county_code: "G0101270",
      weather_city: "Fort Benning",
      usage_month: "2018-11-01T00:00:00.000",
      previous_month: "2018-10-01T00:00:00.000",
      electricity_kwh: 420.0,
      previous_electricity_kwh: 380.0,
      electricity_change_kwh: 40.0,
      average_daily_kwh: 14.0,
      previous_average_daily_kwh: 12.6666666667,
      daily_usage_change_pct: 10.5263157895,
      cooling_change_kwh: -8.0,
      heating_change_kwh: 42.0,
      hot_water_change_kwh: 2.0,
      other_electricity_change_kwh: 4.0,
      cooling_share_of_net_change_pct: -20.0,
      average_temperature_f: 58.0,
      previous_average_temperature_f: 66.0,
      average_temperature_change_f: -8.0,
      cooling_degree_days_65: 12.0,
      previous_cooling_degree_days_65: 58.0,
      cooling_degree_days_change_65: -46.0,
      heating_degree_days_65: 215.0,
      previous_heating_degree_days_65: 93.0,
      heating_degree_days_change_65: 122.0,
    },
    explanation_scope:
      "Changes in modeled electricity end uses. Weather attribution and bill calculations are not included.",
  },
};
