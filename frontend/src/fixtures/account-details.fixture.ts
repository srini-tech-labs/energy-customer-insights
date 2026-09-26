import type { EnergyResult, MonthlyUsage, DailyUsage } from "@/lib/energy/types";

const monthlyUsage: MonthlyUsage[] = [
  { building_id: 102517, usage_month: "2018-01-01T00:00:00.000", days_present: 31, electricity_kwh: 421.3, average_daily_kwh: 13.5903225806, net_electricity_kwh: 421.3, cooling_system_kwh: 0, heating_system_kwh: 180.2, hot_water_kwh: 40.1, peak_15min_average_kw: 3.9 },
  { building_id: 102517, usage_month: "2018-04-01T00:00:00.000", days_present: 30, electricity_kwh: 258.51, average_daily_kwh: 8.617, net_electricity_kwh: 258.51, cooling_system_kwh: 10.0, heating_system_kwh: 20.0, hot_water_kwh: 38.0, peak_15min_average_kw: 3.5 },
  { building_id: 102517, usage_month: "2018-05-01T00:00:00.000", days_present: 31, electricity_kwh: 584.687, average_daily_kwh: 18.8608709677, net_electricity_kwh: 584.687, cooling_system_kwh: 332.692, heating_system_kwh: 0, hot_water_kwh: 37.215, peak_15min_average_kw: 4.12 },
];

const dailyUsage: DailyUsage[] = [
  { building_id: 102517, usage_date: "2018-05-01T00:00:00.000", hours_present: 24, electricity_kwh: 18.5, net_electricity_kwh: 18.5, cooling_system_kwh: 10.2, heating_system_kwh: 0, hot_water_kwh: 1.2, peak_15min_average_kw: 4.0 },
  { building_id: 102517, usage_date: "2018-05-02T00:00:00.000", hours_present: 24, electricity_kwh: 19.1, net_electricity_kwh: 19.1, cooling_system_kwh: 10.9, heating_system_kwh: 0, hot_water_kwh: 1.1, peak_15min_average_kw: 4.1 },
];

export const accountDetailsFixture: Extract<EnergyResult, { operation: "account_details" }> = {
  operation: "account_details",
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
    account: {
      building_id: 102517,
      account_id: "DEMO-102517",
      state: "AL",
      county_code: "01073",
      building_type: "Single-Family Detached",
      floor_area_sqft: 885,
      construction_vintage: "1990s",
      heating_fuel: "Natural Gas",
      heating_system: "Furnace",
      cooling_system: "Central AC",
      days_present: 365,
      annual_electricity_kwh: 5376.995,
      average_daily_kwh: 14.73,
      peak_15min_average_kw: 4.12,
      data_description: "Modeled hourly building energy simulation output.",
    },
    daily_usage: dailyUsage,
    monthly_usage: monthlyUsage,
  },
};
