import type { EnergyResult } from "@/lib/energy/types";

// A materially negative "other" residual — exercises the rule that the
// UI must never clamp this or force it into a positive stacked chart
// (handoff section 8).
export const investigateNegativeOtherFixture: Extract<EnergyResult, { operation: "investigate_usage" }> = {
  operation: "investigate_usage",
  metadata: {
    created_at_utc: "2026-09-18T01:39:55.726466+00:00",
    dataset: "ResStock 2022 release, AMY2018 baseline",
    data_type: "Modeled building profiles",
    weather_alignment_verified: true,
    weather_alignment_method:
      "County weather series matched to consumption using county_code and exact hour-ending timestamps",
    degree_day_base_f: 65.0,
  },
  data: {
    account_id: "DEMO-172016",
    comparison_available: true,
    comparison: {
      building_id: 172016,
      state: "AL",
      county_code: "G0100530",
      weather_city: "Anniston",
      usage_month: "2018-10-01T00:00:00.000",
      previous_month: "2018-09-01T00:00:00.000",
      electricity_kwh: 300.0,
      previous_electricity_kwh: 340.0,
      electricity_change_kwh: -40.0,
      average_daily_kwh: 9.6774193548,
      previous_average_daily_kwh: 11.3333333333,
      daily_usage_change_pct: -14.6078431373,
      cooling_change_kwh: -55.0,
      heating_change_kwh: 5.0,
      hot_water_change_kwh: 1.0,
      other_electricity_change_kwh: -9.0,
      cooling_share_of_net_change_pct: 137.5,
      average_temperature_f: 68.0,
      previous_average_temperature_f: 74.0,
      average_temperature_change_f: -6.0,
      cooling_degree_days_65: 93.0,
      previous_cooling_degree_days_65: 148.0,
      cooling_degree_days_change_65: -55.0,
      heating_degree_days_65: 4.0,
      previous_heating_degree_days_65: 0.0,
      heating_degree_days_change_65: 4.0,
    },
    explanation_scope:
      "Changes in modeled electricity end uses. Weather attribution and bill calculations are not included.",
  },
};
