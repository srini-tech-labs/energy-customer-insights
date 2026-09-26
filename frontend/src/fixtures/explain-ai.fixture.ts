import type { EnergyResult } from "@/lib/energy/types";

// The verified live decoded v3 response for DEMO-102517 / 2018-05, captured
// directly against the real Databricks endpoint. Used both as a
// fixture-driven component test and as the assertion data in
// scripts/smoke-test.mjs when checking the real endpoint.
export const explainAiFixture: Extract<EnergyResult, { operation: "explain_usage" }> = {
  operation: "explain_usage",
  metadata: {
    created_at_utc: "2026-09-20T22:09:18.986049+00:00",
    dataset: "ResStock 2022 release, AMY2018 baseline",
    data_type: "Modeled building profiles",
    weather_alignment_verified: true,
    weather_alignment_method:
      "County weather series matched to consumption using county_code and exact hour-ending timestamps",
    degree_day_base_f: 65.0,
  },
  data: {
    account_id: "DEMO-102517",
    comparison_available: true,
    comparison: {
      building_id: 102517,
      state: "AL",
      county_code: "G0101130",
      weather_city: "Fort Benning",
      usage_month: "2018-05-01T00:00:00.000Z",
      previous_month: "2018-04-01T00:00:00.000Z",
      electricity_kwh: 584.687,
      previous_electricity_kwh: 258.51000000000005,
      electricity_change_kwh: 326.17699999999996,
      average_daily_kwh: 18.860870967741935,
      previous_average_daily_kwh: 8.617,
      daily_usage_change_pct: 118.87978377326138,
      cooling_change_kwh: 322.6919999999999,
      heating_change_kwh: 0.0,
      hot_water_change_kwh: -0.7850000000000019,
      other_electricity_change_kwh: 4.270000000000072,
      cooling_share_of_net_change_pct: 98.93156169809642,
      average_temperature_f: 74.12014516129032,
      previous_average_temperature_f: 61.95714999999999,
      average_temperature_change_f: 12.162995161290333,
      cooling_degree_days_65: 282.7245,
      previous_cooling_degree_days_65: 31.355250000000026,
      cooling_degree_days_change_65: 251.36924999999997,
      heating_degree_days_65: 0.0,
      previous_heating_degree_days_65: 122.64075,
      heating_degree_days_change_65: -122.64075,
    },
    explanation_scope:
      "Changes in modeled electricity end uses and aligned historical weather. Weather provides contextual evidence and does not establish causation. Bill calculations are not included.",
    explanation: {
      text: "The modeled electricity usage for May is 584.69 kWh, which is 326.18 kWh more than the previous month, April, which had 258.51 kWh. The average daily usage increased by 118.88% to 18.86 kWh from 8.62 kWh in April. The main contributor to this increase is cooling, accounting for 98.93% of the net change. The average temperature in May was 74.12°F, a 12.16°F increase from April, with weather conditions consistent with increased cooling demand, as evidenced by a significant rise in cooling degree days to 282.72 from 31.36 in April.",
      source: "ai",
      model: "system.ai.meta-llama-3-3-70b-instruct",
    },
  },
};
