import type { EnergyResult } from "@/lib/energy/types";

// January has no predecessor in this dataset. This is a normal, expected
// empty-comparison state, not an error (handoff section 8/9). A v3 backend
// regression briefly caused this case to crash server-side
// (KeyError: 'previous_month') instead of returning this shape; confirmed
// fixed live — this fixture's shape (weather previous/change fields null,
// matching the pre-existing electricity fields) now matches the real
// response.
export const investigateJanuaryFixture: Extract<EnergyResult, { operation: "investigate_usage" }> = {
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
    account_id: "DEMO-102517",
    comparison_available: false,
    comparison: {
      building_id: 102517,
      state: "AL",
      county_code: "G0101130",
      weather_city: "Fort Benning",
      usage_month: "2018-01-01T00:00:00.000",
      previous_month: null,
      electricity_kwh: 421.3,
      previous_electricity_kwh: null,
      electricity_change_kwh: null,
      average_daily_kwh: 13.5903225806,
      previous_average_daily_kwh: null,
      daily_usage_change_pct: null,
      cooling_change_kwh: null,
      heating_change_kwh: null,
      hot_water_change_kwh: null,
      other_electricity_change_kwh: null,
      cooling_share_of_net_change_pct: null,
      average_temperature_f: 51.2,
      previous_average_temperature_f: null,
      average_temperature_change_f: null,
      cooling_degree_days_65: 0.0,
      previous_cooling_degree_days_65: null,
      cooling_degree_days_change_65: null,
      heating_degree_days_65: 428.6,
      previous_heating_degree_days_65: null,
      heating_degree_days_change_65: null,
    },
    explanation_scope:
      "Changes in modeled electricity end uses and aligned historical weather. Weather provides contextual evidence and does not establish causation. Bill calculations are not included.",
  },
};
